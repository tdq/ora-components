import {
    extractTsBlocks,
    stripImportLines,
    collectImports,
    buildModuleSource,
    typecheckQuickstart,
} from './check-quickstart.mjs';
import { join } from 'path';

describe('extractTsBlocks', () => {
    it('extracts only ```ts fenced blocks, in order, and ignores ```js/```bash/```css blocks', () => {
        const markdown = [
            '```bash',
            'npm install foo',
            '```',
            '```ts',
            'const a = 1;',
            '```',
            '```js',
            'const b = 2;',
            '```',
            '```ts',
            'const c = 3;',
            '```',
        ].join('\n');
        expect(extractTsBlocks(markdown).map((b) => b.trim())).toEqual(['const a = 1;', 'const c = 3;']);
    });

    it('returns [] when there are no ```ts blocks', () => {
        expect(extractTsBlocks('```js\nconst a = 1;\n```')).toEqual([]);
    });
});

describe('stripImportLines', () => {
    it('removes every top-level import line, keeping the rest in order', () => {
        const block = "import { of } from 'rxjs';\nconst a$ = of(1);\nimport { X } from 'y';\nconsole.log(a$);";
        expect(stripImportLines(block).join('\n')).toBe('const a$ = of(1);\nconsole.log(a$);');
    });
});

describe('collectImports', () => {
    it('merges overlapping named imports from the same module into one statement, deduped', () => {
        const blocks = [
            "import { A, B } from 'mod';\nconst x = 1;",
            "import { B, C } from 'mod';\nconst y = 2;",
        ];
        const lines = collectImports(blocks);
        expect(lines).toHaveLength(1);
        // Order within the set is insertion order: A, B (from block 1), then C (from block 2).
        expect(lines[0]).toBe("import { A, B, C } from 'mod';");
    });

    it('keeps side-effect imports separate from named ones and dedupes them', () => {
        const blocks = ["import 'style.css';\nconst a = 1;", "import 'style.css';\nconst b = 2;"];
        expect(collectImports(blocks)).toEqual(["import 'style.css';"]);
    });

    it('does not collide when two blocks import the same name from DIFFERENT modules', () => {
        const blocks = ["import { X } from 'mod-a';", "import { X } from 'mod-b';"];
        const lines = collectImports(blocks);
        expect(lines).toContain("import { X } from 'mod-a';");
        expect(lines).toContain("import { X } from 'mod-b';");
    });
});

describe('buildModuleSource', () => {
    it('wraps each block\'s body in its own function so two blocks can redeclare the same local name', () => {
        const blocks = ["import { of } from 'rxjs';\nconst grid = of(1);", "import { of } from 'rxjs';\nconst grid = of(2);"];
        const source = buildModuleSource(blocks);
        // Exactly one hoisted import line, not two.
        expect(source.match(/^import /gm)).toHaveLength(1);
        expect(source).toContain('async function quickstartBlock0');
        expect(source).toContain('async function quickstartBlock1');
    });
});

describe('typecheckQuickstart — end to end against the real built dist/', () => {
    const distDir = join(__dirname, '../dist');
    const packageDir = join(__dirname, '..');

    it('passes for a valid ```ts snippet using a real builder method', () => {
        const markdown = [
            '## Example',
            '```ts',
            "import { ButtonBuilder } from '@tdq/ora-components';",
            "import { of } from 'rxjs';",
            "new ButtonBuilder().withCaption(of('Save')).build();",
            '```',
        ].join('\n');

        const { ok, output } = typecheckQuickstart(markdown, distDir, packageDir);
        expect(output).toBe('');
        expect(ok).toBe(true);
    });

    it('fails for a snippet calling a method that does not exist (the real bake-off error: TextFieldBuilder.asOutlined())', () => {
        const markdown = [
            '## Example',
            '```ts',
            "import { TextFieldBuilder } from '@tdq/ora-components';",
            "import { of } from 'rxjs';",
            "new TextFieldBuilder().withLabel(of('Name')).asOutlined().build();",
            '```',
        ].join('\n');

        const { ok, output } = typecheckQuickstart(markdown, distDir, packageDir);
        expect(ok).toBe(false);
        expect(output).toContain('asOutlined');
    });

    it('fails loudly (not silently) when QUICKSTART.md has no ```ts blocks at all', () => {
        const { ok, output } = typecheckQuickstart('# Nothing but prose.\n', distDir, packageDir);
        expect(ok).toBe(false);
        expect(output).toContain('no ```ts fenced blocks');
    });
});
