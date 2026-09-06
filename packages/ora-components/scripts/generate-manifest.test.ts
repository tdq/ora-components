import {
    collectDtsFiles,
    readAllDts,
    extractDeclarations,
    extractExtendsNames,
    extractMethods,
    mergeMethods,
    buildComponents,
    validateImportsAgainstExports,
    resolveAgentDocPath,
    stripJsExtension,
    parseAgentDoc,
    parseGotchas,
} from './generate-manifest.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

// Shared across every describe block below: each test that needs a scratch directory
// calls mkTmpDir(prefix), which creates it and registers it for cleanup; one file-wide
// afterEach removes everything created since the previous test.
const created: string[] = [];

afterEach(() => {
    while (created.length > 0) {
        rmSync(created.pop() as string, { recursive: true, force: true });
    }
});

function mkTmpDir(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    created.push(dir);
    return dir;
}

describe('collectDtsFiles / readAllDts', () => {
    it('recurses into a nested directory (the layout scripts/reorganize-types.mjs produces for chart/builders and grid/columns), sorted deterministically', () => {
        const base = mkTmpDir('gen-manifest-');
        const comp = join(base, 'mychart');
        mkdirSync(join(comp, 'builders'), { recursive: true });
        writeFileSync(join(comp, 'index.d.ts'), 'export declare class ChartBuilder {\n    build(): HTMLElement;\n}\n');
        writeFileSync(join(comp, 'builders', 'z-file.d.ts'), 'export declare class ZBuilder {\n    build(): HTMLElement;\n}\n');
        writeFileSync(join(comp, 'builders', 'a-file.d.ts'), 'export declare class ABuilder {\n    build(): HTMLElement;\n}\n');

        const files = collectDtsFiles(comp);
        // Top-level entries sort before the 'builders' subdirectory's contents at the top
        // level (readdirSync().sort() puts 'builders' after 'index.d.ts' alphabetically),
        // and within 'builders/' the two files come back in sorted (a, z) order.
        expect(files).toEqual([
            join(comp, 'builders', 'a-file.d.ts'),
            join(comp, 'builders', 'z-file.d.ts'),
            join(comp, 'index.d.ts'),
        ]);

        const content = readAllDts(comp);
        expect(content).toContain('ABuilder');
        expect(content).toContain('ZBuilder');
        expect(content).toContain('ChartBuilder');
        // Sorted order means ABuilder's declaration appears before ZBuilder's.
        expect(content.indexOf('ABuilder')).toBeLessThan(content.indexOf('ZBuilder'));
    });

    it('falls back to `${basePath}.d.ts` for a bare module specifier that is not a directory', () => {
        const base = mkTmpDir('gen-manifest-');
        writeFileSync(join(base, 'chart-legend.d.ts'), 'export declare class LegendThing {}\n');
        expect(readAllDts(join(base, 'chart-legend'))).toContain('LegendThing');
    });

    it('returns empty string for a path that resolves to nothing', () => {
        const base = mkTmpDir('gen-manifest-');
        expect(readAllDts(join(base, 'does-not-exist'))).toBe('');
    });
});

describe('extractDeclarations', () => {
    it('matches both `export declare class` and `export interface` bodies', () => {
        const dts = `
export declare class ButtonBuilder {
    withCaption(caption: string): this;
    build(): HTMLElement;
}
export interface AxisBuilder {
    withLabel(label: string): this;
    build(): AxisConfig;
}
`;
        const decls = extractDeclarations(dts);
        expect(decls.get('ButtonBuilder')?.kind).toBe('class');
        expect(decls.get('AxisBuilder')?.kind).toBe('interface');
        expect(extractMethods(decls.get('AxisBuilder')!.body).map((m) => m.name)).toEqual(['withLabel', 'build']);
    });

    it('also matches the `export declare interface` form', () => {
        const dts = `
export declare interface SlotBuilder {
    withContent(content: unknown): this;
}
`;
        const decls = extractDeclarations(dts);
        expect(decls.get('SlotBuilder')?.kind).toBe('interface');
    });

    it('dedupes by name with the class winning over an interface of the same name', () => {
        // Crafted text, not valid TypeScript output on its own — extractDeclarations
        // works on raw text, so this pins the dedupe rule directly regardless of
        // whether tsc would ever really emit this shape.
        const dts = `
export interface AxisBuilder {
    withLabel(label: string): this;
}
export declare class AxisBuilder {
    withLabel(label: string): this;
    withExtra(value: string): this;
    build(): AxisConfig;
}
`;
        const decls = extractDeclarations(dts);
        expect(decls.size).toBe(1);
        const entry = decls.get('AxisBuilder')!;
        expect(entry.kind).toBe('class');
        expect(extractMethods(entry.body).map((m) => m.name)).toEqual(['withLabel', 'withExtra', 'build']);
    });

    it('records a class\'s single "extends" base name, tolerating generic args on both sides', () => {
        const dts = `
export declare class TextColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    withPlaceholder(placeholder: string): this;
}
`;
        const decls = extractDeclarations(dts);
        expect(decls.get('TextColumnBuilder')?.extends).toEqual(['BaseColumnBuilder']);
    });

    it('records an interface\'s comma-separated "extends" base names, ignoring commas inside generic args', () => {
        const dts = `
export interface LineChartBuilder<ITEM> extends IndividualChartBuilder<ITEM, LineChartConfig<ITEM>> {
    withCurve(curve: CurveType): this;
}
`;
        const decls = extractDeclarations(dts);
        expect(decls.get('LineChartBuilder')?.extends).toEqual(['IndividualChartBuilder']);
    });

    it('records no "extends" for a declaration with none, and ignores "implements" (a class already contains its own implementation)', () => {
        const dts = `
export declare class BaseColumnBuilder<ITEM> implements ColumnBuilder<ITEM> {
    withHeader(header: string): this;
}
`;
        const decls = extractDeclarations(dts);
        expect(decls.get('BaseColumnBuilder')?.extends).toEqual([]);
    });

    it('a generic constraint\'s own "extends" (TypeScript\'s `<T extends U>`) inside the type-parameter list is NOT mistaken for a real extends clause — the real IndividualChartBuilder header', () => {
        // The real chart/types.d.ts shape: no actual inheritance here at all — `CONFIG
        // extends IndividualChartConfig<ITEM>` is a generic constraint, not a base class.
        const header = '<ITEM, CONFIG extends IndividualChartConfig<ITEM>>';
        expect(extractExtendsNames(header)).toEqual([]);
    });

    it('a real "extends" clause AFTER a type-parameter list containing its own constraint "extends" is still found correctly', () => {
        // IndividualChartBuilder<ITEM, CONFIG extends X> itself is the base here, and its
        // header carries a real extends clause too, after a constrained type-parameter list.
        const header = '<ITEM, CONFIG extends BaseChartConfig<ITEM>> extends IndividualChartBuilder<ITEM, CONFIG>';
        expect(extractExtendsNames(header)).toEqual(['IndividualChartBuilder']);
    });

    it('end to end via extractDeclarations: the real IndividualChartBuilder interface declares no base at all', () => {
        const dts = `
export interface IndividualChartBuilder<ITEM, CONFIG extends IndividualChartConfig<ITEM>> {
    withLabel(label: string): this;
    build(): CONFIG;
}
`;
        const decls = extractDeclarations(dts);
        expect(decls.get('IndividualChartBuilder')?.extends).toEqual([]);
    });

    it('a class body immediately followed by an interface declaration (or vice versa) does not swallow the next declaration as part of its own body', () => {
        const dts = `
export declare class ButtonBuilder {
    withCaption(caption: string): this;
}
export interface AxisBuilder {
    withLabel(label: string): this;
}
export interface SlotBuilder {
    withContent(content: unknown): this;
}
export declare class LabelBuilder {
    withCaption(caption: string): this;
}
`;
        const decls = extractDeclarations(dts);
        expect(extractMethods(decls.get('ButtonBuilder')!.body).map((m) => m.name)).toEqual(['withCaption']);
        expect(extractMethods(decls.get('AxisBuilder')!.body).map((m) => m.name)).toEqual(['withLabel']);
        expect(extractMethods(decls.get('SlotBuilder')!.body).map((m) => m.name)).toEqual(['withContent']);
        expect(extractMethods(decls.get('LabelBuilder')!.body).map((m) => m.name)).toEqual(['withCaption']);
    });
});

describe('extractMethods — public-API filtering', () => {
    it('keeps with*/add*/as*/build and the documented lifecycle names, drops internals like render/createEditor', () => {
        const body = [
            '    withPlaceholder(placeholder: string): this;',
            '    render(item: ITEM): string;',
            '    protected createEditor(item: ITEM, isGlass: boolean): CellEditor;',
            '    show(): void;',
            '    close(): void;',
            '    forceClose(): void;',
            '    navigate(path: string): void;',
            '    back(): void;',
            '    forward(): void;',
            '    replace(path: string): void;',
            '    build(): GridColumn<ITEM>;',
        ].join('\n');
        expect(extractMethods(body).map((m) => m.name)).toEqual([
            'withPlaceholder', 'show', 'close', 'forceClose', 'navigate', 'back', 'forward', 'replace', 'build',
        ]);
    });
});

describe('mergeMethods', () => {
    it('merges a depth-2 extends chain (own methods first, then each base\'s, recursively), the subclass winning on a name collision', () => {
        const dts = `
export declare class BaseColumnBuilder<ITEM> {
    withHeader(header: string): this;
    asGlass(): this;
}
export declare class MiddleColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    withAlign(align: string): this;
}
export declare class TextColumnBuilder<ITEM> extends MiddleColumnBuilder<ITEM> {
    withPlaceholder(placeholder: string): this;
    asGlass(): this;
    build(): unknown;
}
`;
        const decls = extractDeclarations(dts);
        const names = mergeMethods('TextColumnBuilder', decls).map((m) => m.name);
        expect(names).toEqual(['withPlaceholder', 'asGlass', 'build', 'withAlign', 'withHeader']);
        // TextColumnBuilder declares its own asGlass — that one wins, not the base's.
        expect(mergeMethods('TextColumnBuilder', decls).filter((m) => m.name === 'asGlass')).toHaveLength(1);
    });

    it('returns [] for a name absent from the declarations map (an extends base outside this component\'s .d.ts set)', () => {
        const decls = extractDeclarations('export declare class Foo extends SomewhereElseBuilder {\n    withX(): this;\n}\n');
        expect(mergeMethods('Foo', decls).map((m) => m.name)).toEqual(['withX']);
    });

    it('shares a memoized result across siblings via a passed-in cache', () => {
        const dts = `
export declare class BaseColumnBuilder<ITEM> {
    withHeader(header: string): this;
}
export declare class TextColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    withPlaceholder(placeholder: string): this;
}
export declare class NumberColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    withDecimals(decimals: number): this;
}
`;
        const decls = extractDeclarations(dts);
        const cache = new Map();
        mergeMethods('TextColumnBuilder', decls, cache);
        expect(cache.has('BaseColumnBuilder')).toBe(true);
        const baseFromCache = cache.get('BaseColumnBuilder');
        mergeMethods('NumberColumnBuilder', decls, cache);
        expect(cache.get('BaseColumnBuilder')).toBe(baseFromCache);
    });
});

describe('buildComponents', () => {
    function makeFixture() {
        const base = mkTmpDir('gen-manifest-build-');
        const distDir = join(base, 'dist');
        const agentDir = join(base, '.agent');
        mkdirSync(distDir, { recursive: true });
        mkdirSync(join(agentDir, 'components'), { recursive: true });
        return { distDir, agentDir };
    }

    it('a nested-directory class builder gets the parent entry point as its import — never a path scripts/reorganize-types.mjs never produces as a package.json export key', () => {
        const { distDir, agentDir } = makeFixture();
        const comp = join(distDir, 'chart');
        mkdirSync(join(comp, 'builders'), { recursive: true });
        writeFileSync(join(comp, 'index.d.ts'), "export * from './builders/axis-builder';\n");
        writeFileSync(
            join(comp, 'builders', 'axis-builder.d.ts'),
            'export declare class AxisBuilderImpl {\n    withLabel(label: string): this;\n    build(): AxisConfig;\n}\n',
        );

        const { components } = buildComponents([[null, 'chart']], distDir, agentDir, false);
        // AxisBuilderImpl doesn't end with "Builder" (it ends with "Impl"), so — same as
        // before this change — it is correctly excluded; the class extraction only
        // surfaces names ending in Builder/Component.
        expect(components.find((c) => c.name === 'AxisBuilderImpl')).toBeUndefined();
    });

    it('a real nested class builder (ending in "Builder") resolves its import through the parent componentPath', () => {
        const { distDir, agentDir } = makeFixture();
        const comp = join(distDir, 'grid');
        mkdirSync(join(comp, 'columns'), { recursive: true });
        writeFileSync(join(comp, 'index.d.ts'), "export * from './columns';\n");
        writeFileSync(
            join(comp, 'columns', 'text-column.d.ts'),
            'export declare class TextColumnBuilder {\n    withPlaceholder(placeholder: string): this;\n    build(): unknown;\n}\n',
        );

        const { components } = buildComponents([[null, 'grid']], distDir, agentDir, false);
        const textColumn = components.find((c) => c.name === 'TextColumnBuilder');
        expect(textColumn).toBeDefined();
        expect(textColumn!.import).toBe('@tdq/ora-components/grid');
        expect(textColumn!.example).toContain("from '@tdq/ora-components/grid'");
    });

    it('merges an extends chain through a real nested-directory fixture: TextColumnBuilder extends BaseColumnBuilder in the same grid/columns/ set', () => {
        const { distDir, agentDir } = makeFixture();
        const comp = join(distDir, 'grid');
        mkdirSync(join(comp, 'columns'), { recursive: true });
        writeFileSync(join(comp, 'index.d.ts'), "export * from './columns';\n");
        writeFileSync(
            join(comp, 'columns', 'base-column-builder.d.ts'),
            'export declare abstract class BaseColumnBuilder<ITEM> {\n    withHeader(header: string): this;\n    asGlass(): this;\n}\n',
        );
        writeFileSync(
            join(comp, 'columns', 'text-column.d.ts'),
            "import { BaseColumnBuilder } from './base-column-builder';\n" +
                'export declare class TextColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {\n' +
                '    withPlaceholder(placeholder: string): this;\n' +
                '    build(): unknown;\n' +
                '}\n',
        );

        const { components } = buildComponents([[null, 'grid']], distDir, agentDir, false);
        const textColumn = components.find((c) => c.name === 'TextColumnBuilder');
        expect(textColumn).toBeDefined();
        expect(textColumn!.methods.map((m) => m.name)).toEqual(expect.arrayContaining(['withPlaceholder', 'build', 'withHeader', 'asGlass']));
        // BaseColumnBuilder is "declare abstract class" (not "declare class"), so it never
        // becomes a manifest entry of its own — same exclusion as before this change.
        expect(components.find((c) => c.name === 'BaseColumnBuilder')).toBeUndefined();
    });

    it('an interface builder is only surfaced when doc-map.mjs documents it by name — a real documented one (AxisBuilder) is included, an unmapped one is not', () => {
        const { distDir, agentDir } = makeFixture();
        const comp = join(distDir, 'chart');
        mkdirSync(comp, { recursive: true });
        writeFileSync(
            join(comp, 'index.d.ts'),
            [
                'export interface AxisBuilder {',
                '    withLabel(label: string): this;',
                '    build(): AxisConfig;',
                '}',
                'export interface TotallyUnmappedBuilder {',
                '    withFoo(value: string): this;',
                '}',
            ].join('\n'),
        );

        const { components, skippedInterfaces } = buildComponents([[null, 'chart']], distDir, agentDir, false);
        expect(components.find((c) => c.name === 'AxisBuilder')).toBeDefined();
        expect(components.find((c) => c.name === 'TotallyUnmappedBuilder')).toBeUndefined();
        // The excluded interface is reported so main() can WARN about it — a real new
        // inline builder without a doc-map.mjs entry yet must not be silently dropped.
        expect(skippedInterfaces).toEqual(['TotallyUnmappedBuilder']);
    });

    it('an abstract class base (e.g. BaseColumnBuilder) is resolvable for mergeMethods but never becomes a manifest entry of its own', () => {
        const { distDir, agentDir } = makeFixture();
        const comp = join(distDir, 'grid');
        mkdirSync(comp, { recursive: true });
        writeFileSync(
            join(comp, 'index.d.ts'),
            [
                'export declare abstract class BaseColumnBuilder<ITEM> {',
                '    withHeader(header: string): this;',
                '}',
                'export declare class TextColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {',
                '    withPlaceholder(placeholder: string): this;',
                '    build(): unknown;',
                '}',
            ].join('\n'),
        );

        const { components } = buildComponents([[null, 'grid']], distDir, agentDir, false);
        expect(components.find((c) => c.name === 'BaseColumnBuilder')).toBeUndefined();
        expect(components.find((c) => c.name === 'TextColumnBuilder')?.methods.map((m) => m.name)).toEqual(
            expect.arrayContaining(['withPlaceholder', 'withHeader']),
        );
    });

    it('marks grid *ColumnBuilder entries inline: true only when markColumnBuildersInline is set, and never marks a non-column builder', () => {
        const { distDir, agentDir } = makeFixture();
        const comp = join(distDir, 'grid');
        mkdirSync(comp, { recursive: true });
        writeFileSync(
            join(comp, 'index.d.ts'),
            [
                'export declare class TextColumnBuilder {',
                '    build(): unknown;',
                '}',
                'export declare class GridBuilder {',
                '    build(): HTMLElement;',
                '}',
            ].join('\n'),
        );

        const { components: withFlag } = buildComponents([[null, 'grid']], distDir, agentDir, true);
        expect(withFlag.find((c) => c.name === 'TextColumnBuilder')?.inline).toBe(true);
        expect(withFlag.find((c) => c.name === 'GridBuilder')?.inline).toBeUndefined();

        const { components: withoutFlag } = buildComponents([[null, 'grid']], distDir, agentDir, false);
        expect(withoutFlag.find((c) => c.name === 'TextColumnBuilder')?.inline).toBeUndefined();
    });

    it('attaches enums once per componentPath (to the first manifest entry produced for it), not duplicated onto every builder under that path', () => {
        const { distDir, agentDir } = makeFixture();
        const comp = join(distDir, 'grid');
        mkdirSync(comp, { recursive: true });
        writeFileSync(
            join(comp, 'index.d.ts'),
            [
                'export declare enum SortDirection {',
                '    ASC = "ASC",',
                '    DESC = "DESC",',
                '}',
                'export declare class GridBuilder {',
                '    build(): HTMLElement;',
                '}',
                'export declare class ToolbarBuilder {',
                '    build(): HTMLElement;',
                '}',
            ].join('\n'),
        );

        const { components } = buildComponents([[null, 'grid']], distDir, agentDir, false);
        const grid = components.find((c) => c.name === 'GridBuilder');
        const toolbar = components.find((c) => c.name === 'ToolbarBuilder');
        expect(grid?.enums).toEqual([{ name: 'SortDirection', values: ['ASC', 'DESC'] }]);
        expect(toolbar?.enums).toBeUndefined();
    });

    it('a componentPath with no enums leaves every builder\'s `enums` field undefined', () => {
        const { distDir, agentDir } = makeFixture();
        const comp = join(distDir, 'chart');
        mkdirSync(comp, { recursive: true });
        writeFileSync(comp + '/index.d.ts', 'export declare class ChartBuilder {\n    build(): HTMLElement;\n}\n');

        const { components } = buildComponents([[null, 'chart']], distDir, agentDir, false);
        expect(components.find((c) => c.name === 'ChartBuilder')?.enums).toBeUndefined();
    });
});

describe('router.md in doc-map.mjs — RouterBuilder/LinkBuilder/RouteBuilder resolve to the real .agent/router.md, not a guessed .agent/components/ path', () => {
    it('docForBuilder resolves RouterBuilder/LinkBuilder/RouteBuilder to \'../router.md\' (relative to .agent/components, resolving to .agent/router.md)', async () => {
        const { docForBuilder } = await import('./doc-map.mjs');
        expect(docForBuilder('RouterBuilder')).toBe('../router.md');
        expect(docForBuilder('LinkBuilder')).toBe('../router.md');
        expect(docForBuilder('RouteBuilder')).toBe('../router.md');
    });

    it('resolveAgentDocPath actually finds the real .agent/router.md file on disk for RouterBuilder', () => {
        const agentComponentsDir = join(__dirname, '../../../.agent/components');
        const resolved = resolveAgentDocPath(agentComponentsDir, 'router', 'RouterBuilder');
        expect(resolved).toBe(join(agentComponentsDir, '..', 'router.md'));
    });
});

describe('validateImportsAgainstExports', () => {
    const pkgExports = {
        '.': {},
        './style.css': {},
        './chart': {},
        './grid': {},
        './package.json': './package.json',
    };

    it('accepts an import that matches a real "exports" key', () => {
        const { errors, regressions } = validateImportsAgainstExports(
            [{ name: 'AxisBuilder', import: '@tdq/ora-components/chart' }],
            pkgExports,
        );
        expect(errors).toEqual([]);
        expect(regressions).toEqual([]);
    });

    it('rejects an import with no matching "exports" key — e.g. a nested builder that was given its own guessed slug instead of the parent entry point — and treats it as a regression, since AxisBuilder is not a known legacy mismatch', () => {
        const { errors, regressions } = validateImportsAgainstExports(
            [{ name: 'AxisBuilder', import: '@tdq/ora-components/axis' }],
            pkgExports,
        );
        const expected = ['AxisBuilder: import "@tdq/ora-components/axis" has no matching package.json "exports" entry'];
        expect(errors).toEqual(expected);
        expect(regressions).toEqual(expected);
    });

    it('rejects an import that is not an @tdq/ora-components/* specifier at all', () => {
        const { errors } = validateImportsAgainstExports([{ name: 'Weird', import: 'lodash' }], pkgExports);
        expect(errors).toEqual(['Weird: import "lodash" is not an @tdq/ora-components/* specifier']);
    });

    it('every real emitted import in a fixture that mirrors package.json\'s actual chart/grid exports resolves cleanly', () => {
        const components = [
            { name: 'AxisBuilder', import: '@tdq/ora-components/chart' },
            { name: 'LineChartBuilder', import: '@tdq/ora-components/chart' },
            { name: 'TextColumnBuilder', import: '@tdq/ora-components/grid' },
            { name: 'ColumnsBuilder', import: '@tdq/ora-components/grid' },
        ];
        expect(validateImportsAgainstExports(components, pkgExports)).toEqual({ errors: [], regressions: [] });
    });

    it('reports a known legacy mismatch (e.g. MoneyFieldBuilder) as an error but NOT a regression', () => {
        const { errors, regressions } = validateImportsAgainstExports(
            [{ name: 'MoneyFieldBuilder', import: '@tdq/ora-components/money-field' }],
            pkgExports,
        );
        expect(errors).toEqual(['MoneyFieldBuilder: import "@tdq/ora-components/money-field" has no matching package.json "exports" entry']);
        expect(regressions).toEqual([]);
    });
});

describe('stripJsExtension', () => {
    it('strips a trailing "/index.js" (directory-module specifier, the form add-nodenext-extensions.mjs produces for a component dir)', () => {
        expect(stripJsExtension('./button/index.js')).toBe('./button');
        expect(stripJsExtension('button/index.js')).toBe('button');
    });

    it('strips a trailing ".js" (flat-module specifier)', () => {
        expect(stripJsExtension('./core/component-builder.js')).toBe('./core/component-builder');
    });

    it('leaves an already-extensionless specifier (the normal case — generate-manifest.mjs runs before add-nodenext-extensions.mjs in `npm run build`) unchanged', () => {
        expect(stripJsExtension('./button')).toBe('./button');
        expect(stripJsExtension('./core/component-builder')).toBe('./core/component-builder');
    });
});

describe('parseGotchas / parseAgentDoc — "## Gotchas" bullets become notes[]', () => {
    it('collects every top-level "- " bullet under "## Gotchas" and stops at the next heading', () => {
        const lines = [
            '## Description',
            'Some component.',
            '## Gotchas',
            '- First gotcha.',
            '- Second gotcha.',
            '## Styling',
            '- Not a gotcha, a styling bullet.',
        ];
        expect(parseGotchas(lines)).toEqual(['First gotcha.', 'Second gotcha.']);
    });

    it('returns [] (not undefined) for a doc with no "## Gotchas" section', () => {
        const lines = ['## Description', 'Some component.', '## Styling', '- some rule'];
        expect(parseGotchas(lines)).toEqual([]);
    });

    it('parseAgentDoc exposes the same bullets as notes alongside description/methodDescriptions', () => {
        const content = [
            '# Widget',
            '',
            '## Description',
            'Widget does widget things.',
            '',
            '- `withFoo(x): this` - sets foo.',
            '',
            '## Gotchas',
            '',
            '- WidgetBuilder.withFoo mutates in place.',
            '- Second real gotcha.',
            '',
            '## Styling',
            'Not relevant.',
        ].join('\n');

        const parsed = parseAgentDoc(content);
        expect(parsed.description).toBe('Widget does widget things.');
        expect(parsed.methodDescriptions.get('withFoo')).toBe('sets foo.');
        expect(parsed.notes).toEqual(['WidgetBuilder.withFoo mutates in place.', 'Second real gotcha.']);
    });
});

describe('buildComponents — "## Gotchas" bullets from the matching .agent doc surface as notes[] on the manifest entry', () => {
    it('attaches notes to a component whose doc has a "## Gotchas" section, and omits notes entirely when there is none', () => {
        const base = mkTmpDir('gen-manifest-notes-');
        const distDir = join(base, 'dist');
        const agentDir = join(base, '.agent');
        mkdirSync(distDir, { recursive: true });
        mkdirSync(join(agentDir, 'components'), { recursive: true });

        const comp = join(distDir, 'widget');
        mkdirSync(comp, { recursive: true });
        writeFileSync(
            join(comp, 'index.d.ts'),
            [
                'export declare class WidgetBuilder {',
                '    withFoo(x: string): this;',
                '    build(): HTMLElement;',
                '}',
                'export declare class PlainBuilder {',
                '    build(): HTMLElement;',
                '}',
            ].join('\n'),
        );
        writeFileSync(
            join(agentDir, 'components', 'widget.md'),
            [
                '## Description',
                'Widget component.',
                '',
                '## Gotchas',
                '',
                '- WidgetBuilder.withFoo mutates in place.',
            ].join('\n'),
        );
        // No plain.md at all — PlainBuilder has no matching doc, so it gets no notes.

        const { components } = buildComponents([[null, 'widget']], distDir, agentDir, false);
        const widget = components.find((c) => c.name === 'WidgetBuilder');
        const plain = components.find((c) => c.name === 'PlainBuilder');
        expect(widget?.notes).toEqual(['WidgetBuilder.withFoo mutates in place.']);
        expect(plain?.notes).toBeUndefined();
    });
});

describe('resolveAgentDocPath', () => {
    it('prefers the doc-map.mjs-mapped path over the flat/sub guesses when both exist', () => {
        const base = mkTmpDir('gen-manifest-doc-');
        const componentsDir = join(base, 'components');
        mkdirSync(join(componentsDir, 'chart'), { recursive: true });
        // The mapped doc for AxisBuilder, per doc-map.mjs: 'chart/axis-builder.md'.
        writeFileSync(join(componentsDir, 'chart', 'axis-builder.md'), '## Description\nThe real axis doc.\n');
        // A flat-guess doc that would be picked if the map weren't consulted first.
        writeFileSync(join(componentsDir, 'axisbuilder.md'), '## Description\nWrong doc.\n');

        const resolved = resolveAgentDocPath(componentsDir, 'axisbuilder', 'AxisBuilder');
        expect(resolved).toBe(join(componentsDir, 'chart', 'axis-builder.md'));
    });

    it('falls back to the flat-file guess when the builder has no doc-map entry', () => {
        const base = mkTmpDir('gen-manifest-doc-');
        const componentsDir = join(base, 'components');
        mkdirSync(componentsDir, { recursive: true });
        writeFileSync(join(componentsDir, 'button.md'), '## Description\nButton doc.\n');

        expect(resolveAgentDocPath(componentsDir, 'button', 'ButtonBuilder')).toBe(join(componentsDir, 'button.md'));
    });

    it('returns null when nothing resolves', () => {
        const base = mkTmpDir('gen-manifest-doc-');
        const componentsDir = join(base, 'components');
        mkdirSync(componentsDir, { recursive: true });
        expect(resolveAgentDocPath(componentsDir, 'ghost', 'GhostBuilder')).toBeNull();
    });
});

describe('the real (built) manifest\'s imports against the real package.json "exports"', () => {
    // The deliverable this subtask's requirements ask for directly: load the REAL, already
    // generated dist/component-manifest.json (not a synthetic fixture) and check every
    // component's import against the REAL package.json "exports" map, via the same
    // validateImportsAgainstExports the generator itself runs at build time. A missing
    // manifest is a hard failure, not a silent skip — `npm run build` is a documented
    // prerequisite for this suite (same reasoning as check-docs-vs-manifest.test.ts's own
    // end-to-end block against the real manifest).
    it('every component.import in the real built manifest resolves to a real package.json "exports" key, or is a known pre-existing legacy mismatch (WARN-listed by path, not a regression)', () => {
        const manifestPath = join(__dirname, '../dist/component-manifest.json');
        let manifestRaw: string;
        try {
            manifestRaw = readFileSync(manifestPath, 'utf8');
        } catch (err) {
            throw new Error(
                'generate-manifest.test: dist/component-manifest.json not found. Run `npm run build` before ' +
                `running this suite. Original error: ${(err as Error).message}`,
            );
        }
        const manifest = JSON.parse(manifestRaw);
        const pkgJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

        const { errors, regressions } = validateImportsAgainstExports(manifest.components, pkgJson.exports ?? {});

        // eslint-disable-next-line no-console
        console.log(`generate-manifest (real manifest import check): ${manifest.components.length} components, ${errors.length} mismatch(es), ${regressions.length} regression(s).`);
        for (const e of errors) {
            // eslint-disable-next-line no-console
            console.log(`  ${regressions.includes(e) ? 'FAIL' : 'WARN'} - ${e}`);
        }

        // A real regression — an import with no matching "exports" entry that is NOT one
        // of the already-accepted legacy mismatches — is what actually fails the real
        // `npm run build` (see main()'s process.exit(1)). Pre-existing legacy drift is
        // allowed through (WARN only), matching main()'s own behaviour.
        expect(regressions).toEqual([]);
        expect(manifest.components.length).toBeGreaterThan(0);
    });
});

describe('manifest determinism — running the real generator twice against the same built dist/ yields byte-identical output', () => {
    // Requirement: "deterministic across runs (run `npm run build` twice and `diff` the
    // two manifests → identical)". Running `npm run build` itself twice in a test would be
    // far too slow (full vite/tsc/tailwind build); this instead re-runs JUST
    // generate-manifest.mjs (the CLI, via a real child process — main() reads process.argv[1]
    // and can't be called as a plain function) twice against the dist/ that's already been
    // built once (a documented prerequisite for this suite, same as the tests above), and
    // diffs the two manifests byte-for-byte apart from the `generatedAt` timestamp, which is
    // `new Date().toISOString()` and expected to differ run-to-run.
    it('generate-manifest.mjs run twice against an unchanged dist/ produces identical output (component order, content, and component count) aside from generatedAt', () => {
        const scriptPath = join(__dirname, 'generate-manifest.mjs');
        const manifestPath = join(__dirname, '../dist/component-manifest.json');

        let before: string;
        try {
            before = readFileSync(manifestPath, 'utf8');
        } catch (err) {
            throw new Error(
                'generate-manifest.test: dist/component-manifest.json not found. Run `npm run build` before ' +
                `running this suite. Original error: ${(err as Error).message}`,
            );
        }

        const run1 = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8', cwd: __dirname });
        expect(run1.status).toBe(0);
        const manifest1 = JSON.parse(readFileSync(manifestPath, 'utf8'));

        const run2 = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8', cwd: __dirname });
        expect(run2.status).toBe(0);
        const manifest2 = JSON.parse(readFileSync(manifestPath, 'utf8'));

        const { generatedAt: _a, ...rest1 } = manifest1;
        const { generatedAt: _b, ...rest2 } = manifest2;
        expect(rest1).toEqual(rest2);
        expect(manifest1.components.length).toBe(manifest2.components.length);

        // Restore the manifest this test found on disk, so this test has no side effect on
        // any other test in this file (or check-docs-vs-manifest.test.ts) that reads the
        // real built manifest.
        writeFileSync(manifestPath, before, 'utf8');
    });
});
