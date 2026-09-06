import {
    extractMethodTokens,
    attributeFencedCallTokens,
    buildManifestIndex,
    checkDoc,
    listDocFiles,
    findNewestDtsMtime,
    DOC_TO_BUILDERS,
} from './check-docs-vs-manifest.mjs';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const AGENT_COMPONENTS_DIR = join(__dirname, '../../../.agent/components');

function fakeManifest(components: Array<{ name: string; methods: string[] }>) {
    return {
        version: '0.0.0',
        generatedAt: new Date().toISOString(),
        components: components.map((c) => ({
            name: c.name,
            componentName: c.name.toLowerCase(),
            description: '',
            import: '',
            methods: c.methods.map((m) => ({ name: m, signature: '', params: [], returnType: '' })),
            example: '',
        })),
    };
}

describe('extractMethodTokens', () => {
    it('extracts a with*/add*/as*/build method name from an inline code span', () => {
        expect(extractMethodTokens('- `withFormat(format)` - sets the format.')).toEqual(['withFormat']);
        expect(extractMethodTokens('- `addAction(icon)` - adds an action.')).toEqual(['addAction']);
        expect(extractMethodTokens('- `asGlass()` - glass effect.')).toEqual(['asGlass']);
        expect(extractMethodTokens('- `build(): HTMLElement` - builds it.')).toEqual(['build']);
    });

    it('extracts a method name from inside a fenced code block — consumers copy those too', () => {
        const md = '```ts\nconst x = new ComboBoxBuilder().asInlineError();\n```';
        expect(extractMethodTokens(md)).toEqual(['asInlineError']);
    });

    it('extracts from a fenced block regardless of info string or CRLF line ending', () => {
        expect(extractMethodTokens('```\nwithFoo()\n```')).toEqual(['withFoo']);
        expect(extractMethodTokens('```typescript\nwithBar()\n```')).toEqual(['withBar']);
        expect(extractMethodTokens('```ts\r\nwithBaz()\r\n```')).toEqual(['withBaz']);
    });

    it('deduplicates repeated tokens', () => {
        const md = '`withCaption(caption)` ... later `withCaption(caption)` again';
        expect(extractMethodTokens(md)).toEqual(['withCaption']);
    });

    it('ignores every token that is not with*/add*/as*/build per builder-pattern.md — no allow-list needed', () => {
        // Native DOM/CSS/RxJS/Math calls cited in prose or examples.
        expect(extractMethodTokens('`preventDefault()`')).toEqual([]);
        expect(extractMethodTokens('`stopPropagation()`')).toEqual([]);
        expect(extractMethodTokens('`forEach(fn)`')).toEqual([]);
        expect(extractMethodTokens('`showModal()`')).toEqual([]);
        expect(extractMethodTokens('`clamp(x)`')).toEqual([]);
        expect(extractMethodTokens('`console.log(x)`')).toEqual([]);
        expect(extractMethodTokens('`var(--x)`')).toEqual([]);
        // Instance methods on the built element that don't follow the with*/add*/as*/build convention.
        expect(extractMethodTokens('`select(item)`')).toEqual([]);
        expect(extractMethodTokens('`open()`')).toEqual([]);
        expect(extractMethodTokens('`close()`')).toEqual([]);
        expect(extractMethodTokens('`show()`')).toEqual([]);
        expect(extractMethodTokens('`remove()`')).toEqual([]);
        expect(extractMethodTokens('`edit()`')).toEqual([]);
        expect(extractMethodTokens('`clear()`')).toEqual([]);
        expect(extractMethodTokens('`url()`')).toEqual([]);
        expect(extractMethodTokens('`gradient()`')).toEqual([]);
    });

    it('ignores a leading-underscore internal helper name, matching generate-manifest.mjs\'s own exclusion of "_"-prefixed members', () => {
        expect(extractMethodTokens('`_position()`')).toEqual([]);
        expect(extractMethodTokens('called from `_cleanup()` on anchor destroy')).toEqual([]);
    });

    it('ignores a build-prefixed internal factory function — only the exact literal "build" counts, not "buildTextField"', () => {
        expect(extractMethodTokens('`buildTextField(config, elements)`')).toEqual([]);
        expect(extractMethodTokens('`buildSidebarViewport()`')).toEqual([]);
    });

    it('ignores identifiers not immediately followed by "(" inside backticks', () => {
        expect(extractMethodTokens('`SlotSize.FULL`')).toEqual([]);
    });

    it('ignores "with"/"add"/"as" with no camelCase suffix, or lowercase after the prefix', () => {
        expect(extractMethodTokens('`with(x)`')).toEqual([]);
        expect(extractMethodTokens('`without(x)`')).toEqual([]);
        expect(extractMethodTokens('`ask(x)`')).toEqual([]);
    });

    it('skips a constructor call (capitalized identifier before "(") but keeps a chained with*/add*/as*/build method after it', () => {
        expect(extractMethodTokens('`new ComboBoxBuilder().asInlineError()`')).toEqual(['asInlineError']);
    });

    it('drops the "object." / "this." prefix on a chained call — a local variable name is not a namespace', () => {
        expect(extractMethodTokens('`sideBar.addItem()`')).toEqual(['addItem']);
    });
});

describe('buildManifestIndex', () => {
    it('maps builder name to a Set of its method names', () => {
        const manifest = fakeManifest([{ name: 'ButtonBuilder', methods: ['withCaption', 'withClick'] }]);
        const index = buildManifestIndex(manifest);
        expect(index.get('ButtonBuilder')).toEqual(new Set(['withCaption', 'withClick']));
        expect(index.get('MissingBuilder')).toBeUndefined();
    });
});

describe('findNewestDtsMtime', () => {
    it('returns -Infinity for a directory that does not exist', () => {
        expect(findNewestDtsMtime(join(__dirname, 'this-directory-does-not-exist'))).toBe(-Infinity);
    });

    it('returns -Infinity for a real directory containing no .d.ts files', () => {
        // scripts/ itself has only .mjs/.ts files, no .d.ts.
        expect(findNewestDtsMtime(__dirname)).toBe(-Infinity);
    });
});

describe('checkDoc', () => {
    it('reports no failure and no warning when the documented method is present in the manifest', () => {
        const manifest = fakeManifest([{ name: 'ButtonBuilder', methods: ['withCaption'] }]);
        const index = buildManifestIndex(manifest);
        const { failures, warnings, checked } = checkDoc('button.md', '- `withCaption(caption)` - sets caption.', ['ButtonBuilder'], index);
        expect(failures).toEqual([]);
        expect(warnings).toEqual([]);
        expect(checked).toBe(1);
    });

    it('FAILs (not warns) in the exact "<doc file>: <Builder>.<method> not in manifest" format when the builder IS in the manifest but lacks the method', () => {
        const manifest = fakeManifest([{ name: 'ComboBoxBuilder', methods: ['withCaption'] }]);
        const index = buildManifestIndex(manifest);
        const { failures, warnings } = checkDoc('combobox.md', '- `asInlineError(): this` - inline error.', ['ComboBoxBuilder'], index);
        expect(failures).toEqual(['combobox.md: ComboBoxBuilder.asInlineError not in manifest']);
        expect(warnings).toEqual([]);
    });

    it('WARNs (not fails) when the builder is entirely absent from the manifest — a structural gap, not doc drift', () => {
        const manifest = fakeManifest([{ name: 'SomeOtherBuilder', methods: [] }]);
        const index = buildManifestIndex(manifest);
        const { failures, warnings } = checkDoc('chart/axis-builder.md', '- `withFormat(format)` - sets format.', ['AxisBuilder'], index);
        expect(failures).toEqual([]);
        expect(warnings).toEqual(['chart/axis-builder.md: AxisBuilder.withFormat not in manifest']);
    });

    it('a multi-builder doc treats a method as present if ANY listed builder has it', () => {
        const manifest = fakeManifest([
            { name: 'ActionBuilder', methods: ['withEnable'] },
            { name: 'ActionsBuilder', methods: ['addAction'] },
        ]);
        const index = buildManifestIndex(manifest);
        const md = '- `addAction(icon, label, onClick)` ...\n- `withEnable(enable)` ...';
        const { failures, warnings } = checkDoc('grid/actions-builder.md', md, ['ActionBuilder', 'ActionsBuilder'], index);
        expect(failures).toEqual([]);
        expect(warnings).toEqual([]);
    });

    it('a multi-builder doc FAILs against the full "Builder1|Builder2" label when at least one builder is present but none has the method', () => {
        const manifest = fakeManifest([
            { name: 'LineChartBuilder', methods: [] },
            { name: 'BarChartBuilder', methods: [] },
        ]);
        const index = buildManifestIndex(manifest);
        const { failures, warnings } = checkDoc(
            'chart/individual-charts.md',
            '- `withBarWidth(ratio)` - sets bar width.',
            ['LineChartBuilder', 'BarChartBuilder', 'AreaChartBuilder'],
            index,
        );
        expect(failures).toEqual(['chart/individual-charts.md: LineChartBuilder|BarChartBuilder|AreaChartBuilder.withBarWidth not in manifest']);
        expect(warnings).toEqual([]);
    });

    it('a multi-builder doc WARNs when NONE of its builders appear in the manifest, even though some other unrelated builder does', () => {
        const manifest = fakeManifest([{ name: 'UnrelatedBuilder', methods: [] }]);
        const index = buildManifestIndex(manifest);
        const { failures, warnings } = checkDoc(
            'sidebar.md',
            '- `withMenu(): SidebarMenuBuilder` - attaches a menu.',
            ['SidebarItemBuilder', 'SidebarFooterBuilder'],
            index,
        );
        expect(failures).toEqual([]);
        expect(warnings).toEqual(['sidebar.md: SidebarItemBuilder|SidebarFooterBuilder.withMenu not in manifest']);
    });

    it('a null-mapped (concept guide) doc is simply never passed builders by the caller — nothing to assert here beyond the map shape, covered below', () => {
        expect(DOC_TO_BUILDERS['grid/grid-row.md']).toBeNull();
    });

    it('a qualified inline span (`` `XBuilder.method(` ``) is checked against XBuilder directly, not the doc\'s own builders — the correct-prose case (text-field.md citing TextFieldBuilder.asInlineError())', () => {
        const manifest = fakeManifest([
            { name: 'ListBoxBuilder', methods: [] },
            { name: 'TextFieldBuilder', methods: ['asInlineError'] },
        ]);
        const index = buildManifestIndex(manifest);
        const md = 'See also `TextFieldBuilder.asInlineError()` for the equivalent text-field behaviour.';
        const { failures, warnings, checked } = checkDoc('listbox.md', md, ['ListBoxBuilder'], index);
        expect(failures).toEqual([]);
        expect(warnings).toEqual([]);
        expect(checked).toBe(1);
    });

    it('a qualified inline span FAILs against the NAMED builder, not the doc\'s own, when the named builder is present but lacks the method', () => {
        const manifest = fakeManifest([
            { name: 'ListBoxBuilder', methods: ['withFocusedIndex'] },
            { name: 'ComboBoxBuilder', methods: [] },
        ]);
        const index = buildManifestIndex(manifest);
        const md = '`ComboBoxBuilder.withFocusedIndex()` is analogous to ListBox\'s own.';
        const { failures, warnings } = checkDoc('combobox.md', md, ['ComboBoxBuilder'], index);
        expect(failures).toEqual(['combobox.md: ComboBoxBuilder.withFocusedIndex not in manifest']);
        expect(warnings).toEqual([]);
    });

    it('a qualified inline span naming a builder absent from the manifest entirely is skipped, not warned or failed', () => {
        const manifest = fakeManifest([{ name: 'ComboBoxBuilder', methods: [] }]);
        const index = buildManifestIndex(manifest);
        const md = '`GhostBuilder.withFoo()` does not exist anywhere.';
        const { failures, warnings, checked } = checkDoc('combobox.md', md, ['ComboBoxBuilder'], index);
        expect(failures).toEqual([]);
        expect(warnings).toEqual([]);
        expect(checked).toBe(0);
    });

    it('an UNqualified inline span keeps the original whole-doc attribution to the doc\'s own builders', () => {
        const manifest = fakeManifest([{ name: 'ButtonBuilder', methods: [] }]);
        const index = buildManifestIndex(manifest);
        const { failures } = checkDoc('button.md', '`withCaption(caption)` sets the caption.', ['ButtonBuilder'], index);
        expect(failures).toEqual(['button.md: ButtonBuilder.withCaption not in manifest']);
    });

    it('the panel.md shape: a fenced example composes a `new LabelBuilder()` inside `.withContent(...)` — its withCaption call is checked against LabelBuilder, not bogusly FAILed against PanelBuilder', () => {
        const manifest = fakeManifest([
            { name: 'PanelBuilder', methods: ['withGap', 'withContent', 'asGlass', 'build'] },
            { name: 'LabelBuilder', methods: ['withCaption', 'withClass'] },
        ]);
        const index = buildManifestIndex(manifest);
        const md = [
            '```typescript',
            'const panel = new PanelBuilder()',
            '    .withGap(PanelGap.LARGE)',
            "    .withContent(new LabelBuilder().withCaption(of('Hello')))",
            '    .build();',
            '```',
        ].join('\n');
        const { failures, warnings, checked } = checkDoc('panel.md', md, ['PanelBuilder'], index);
        expect(failures).toEqual([]);
        expect(warnings).toEqual([]);
        // 4 distinct receiver.token pairs: PanelBuilder.withGap, PanelBuilder.withContent,
        // LabelBuilder.withCaption, PanelBuilder.build.
        expect(checked).toBe(4);
    });

    it('the panel.md shape, but the inner builder is missing the method: FAILs against the inner builder\'s own name, not the outer doc\'s builder', () => {
        const manifest = fakeManifest([
            { name: 'PanelBuilder', methods: ['withGap', 'withContent'] },
            { name: 'LabelBuilder', methods: ['withClass'] }, // no withCaption
        ]);
        const index = buildManifestIndex(manifest);
        const md = [
            '```typescript',
            'const panel = new PanelBuilder()',
            "    .withContent(new LabelBuilder().withCaption(of('Hello')));",
            '```',
        ].join('\n');
        const { failures, warnings } = checkDoc('panel.md', md, ['PanelBuilder'], index);
        expect(failures).toEqual(['panel.md: LabelBuilder.withCaption not in manifest']);
        expect(warnings).toEqual([]);
    });

    it('a call on a bare, untracked variable with no return-type-mapped method before it is skipped entirely, not attributed to the doc\'s own builder', () => {
        const manifest = fakeManifest([{ name: 'TrendColumnBuilder', methods: ['withPeriod'] }]);
        const index = buildManifestIndex(manifest);
        const md = [
            '```typescript',
            "columns.someRandomMethod('x');",
            '```',
        ].join('\n');
        const { failures, warnings, checked } = checkDoc('grid/trend-column.md', md, ['TrendColumnBuilder'], index);
        expect(failures).toEqual([]);
        expect(warnings).toEqual([]);
        expect(checked).toBe(0);
    });

    it('the real trend-column.md shape: `columns.addTrendColumn(...)` itself is skipped (bare `columns` receiver), but addTrendColumn\'s known return type (TrendColumnBuilder) switches the chain for `.withHeader(...)` right after it', () => {
        const manifest = fakeManifest([{ name: 'TrendColumnBuilder', methods: ['withPeriod', 'withHeader'] }]);
        const index = buildManifestIndex(manifest);
        const md = [
            '```typescript',
            "columns.addTrendColumn('revenueTrend').withHeader('Trend');",
            '```',
        ].join('\n');
        const { failures, warnings, checked } = checkDoc('grid/trend-column.md', md, ['TrendColumnBuilder'], index);
        expect(failures).toEqual([]);
        expect(warnings).toEqual([]);
        // addTrendColumn itself is skipped (its own receiver, `columns`, is untracked), but
        // withHeader IS checked — against TrendColumnBuilder, addTrendColumn's return type.
        expect(checked).toBe(1);
    });

    it('the layout.md shape: a variable assigned from `new LayoutBuilder()` in one statement resolves correctly in a LATER, separate statement — `layout.addSlot()` after `const layout = new LayoutBuilder()...;`', () => {
        const manifest = fakeManifest([
            { name: 'LayoutBuilder', methods: ['asVertical', 'withGap', 'build', 'addSlot'] },
            { name: 'SlotBuilder', methods: ['withContent'] },
        ]);
        const index = buildManifestIndex(manifest);
        const md = [
            '```typescript',
            'const layout = new LayoutBuilder()',
            '    .asVertical()',
            '    .withGap(LayoutGap.MEDIUM);',
            '',
            "layout.addSlot().withContent(new LabelBuilder().withCaption(of('Header')));",
            '',
            'const element = layout.build();',
            '```',
        ].join('\n');
        const { failures, warnings } = checkDoc('layout.md', md, ['LayoutBuilder', 'SlotBuilder'], index);
        // No false FAIL on LayoutBuilder.withContent — withContent is correctly attributed
        // to SlotBuilder (addSlot's return type), and LabelBuilder isn't in this fake
        // manifest at all, so withCaption is skipped rather than checked against nothing.
        expect(failures).toEqual([]);
        expect(warnings).toEqual([]);
    });

    it('a bare-variable call with no `;` between statements (no trailing semicolon) does not leak the previous statement\'s `new` receiver onto it', () => {
        const manifest = fakeManifest([{ name: 'GridBuilder', methods: ['build'] }]);
        const index = buildManifestIndex(manifest);
        const md = [
            '```typescript',
            'const grid = new GridBuilder().build()',
            "columns.addTextColumn('n')",
            '```',
        ].join('\n');
        const { failures, warnings, checked } = checkDoc('grid/grid.md', md, ['GridBuilder'], index);
        // build() (GridBuilder, present) is checked; addTextColumn (bare `columns`, no
        // tracked variable, no `;` before it) is skipped, NOT bogusly checked against
        // GridBuilder.
        expect(failures).toEqual([]);
        expect(warnings).toEqual([]);
        expect(checked).toBe(1);
    });

    it('the chattrigger.md shape: two independent `new X()` chains in one fenced block are each checked against their own builder', () => {
        const manifest = fakeManifest([
            { name: 'ChatPanelBuilder', methods: ['withMessages', 'withOpen', 'asClosable', 'asGlass'] },
            { name: 'ChatTriggerBuilder', methods: ['withOpen', 'withCaption'] },
        ]);
        const index = buildManifestIndex(manifest);
        const md = [
            '```typescript',
            'const panel = new ChatPanelBuilder()',
            '    .withMessages(messages$)',
            '    .withOpen(chatOpen$)',
            '    .asClosable()',
            '    .asGlass();',
            '',
            'const trigger = new ChatTriggerBuilder()',
            '    .withOpen(chatOpen$)',
            "    .withCaption(of('Ask about this ledger'));",
            '```',
        ].join('\n');
        const { failures, warnings } = checkDoc('chattrigger.md', md, ['ChatTriggerBuilder'], index);
        expect(failures).toEqual([]);
        expect(warnings).toEqual([]);
    });
});

describe('attributeFencedCallTokens', () => {
    it('attributes a bare call with no preceding "new" to a null receiver', () => {
        expect(attributeFencedCallTokens("columns.addTrendColumn('x');")).toEqual([
            { token: 'addTrendColumn', receiver: null },
        ]);
    });

    it('attributes every call chained directly off `new XBuilder()` to X, including across multiple statements in one block', () => {
        const code = "new PanelBuilder().asGlass().withGap(PanelGap.SMALL);\nnew PanelBuilder().build();";
        expect(attributeFencedCallTokens(code)).toEqual([
            { token: 'asGlass', receiver: 'PanelBuilder' },
            { token: 'withGap', receiver: 'PanelBuilder' },
            { token: 'build', receiver: 'PanelBuilder' },
        ]);
    });

    it('attributes a call nested inside another call\'s arguments to the INNER `new` receiver, and reverts to the outer one once that argument list closes', () => {
        const code = "new PanelBuilder().withContent(new LabelBuilder().withCaption(x)).build();";
        expect(attributeFencedCallTokens(code)).toEqual([
            { token: 'withContent', receiver: 'PanelBuilder' },
            { token: 'withCaption', receiver: 'LabelBuilder' },
            { token: 'build', receiver: 'PanelBuilder' },
        ]);
    });

    it('ignores a `new` call whose class name does not end in "Builder" (e.g. `new BehaviorSubject(...)`) without disturbing the active receiver', () => {
        const code = "new PanelBuilder().withGap(new BehaviorSubject(false)).build();";
        const results = attributeFencedCallTokens(code);
        expect(results.every((r) => r.receiver === 'PanelBuilder' || r.receiver === null)).toBe(true);
        // withGap and build are both PanelBuilder's; BehaviorSubject contributes no tokens
        // (its constructor call matches none of with*/add*/as*/build).
        expect(results.map((r) => r.token)).toEqual(['withGap', 'build']);
    });

    it('tolerates a generic type argument between the class name and the constructor\'s "("', () => {
        expect(attributeFencedCallTokens('new ComboBoxBuilder<string>().build();')).toEqual([
            { token: 'build', receiver: 'ComboBoxBuilder' },
        ]);
    });

    it('tolerates NESTED generic type arguments (`new GridBuilder<Row<T>>()`), where a naive `<[^>]*>` would stop at the wrong ">"', () => {
        expect(attributeFencedCallTokens('new GridBuilder<Row<T>>().build();')).toEqual([
            { token: 'build', receiver: 'GridBuilder' },
        ]);
    });

    it('the CALL_TOKEN_STICKY_RE word-boundary fix: `node.hasAttribute(\'x\')` does not yield a phantom "asAttribute" call', () => {
        expect(attributeFencedCallTokens("node.hasAttribute('x');")).toEqual([]);
    });

    it('the CALL_TOKEN_STICKY_RE word-boundary fix: `foo.rebuild()` does not yield a phantom "build" call', () => {
        expect(attributeFencedCallTokens('foo.rebuild();')).toEqual([]);
    });

    it('a top-level ";" resets the receiver stack — a `new XBuilder` from an earlier statement does not leak onto a later, unrelated one', () => {
        const code = "const grid = new GridBuilder().build();\ncolumns.addTextColumn('n');";
        expect(attributeFencedCallTokens(code)).toEqual([
            { token: 'build', receiver: 'GridBuilder' },
            { token: 'addTextColumn', receiver: null },
        ]);
    });

    it('a newline at depth 0 whose next non-whitespace character is NOT "." also resets the stack (the semicolon-less doc-example style)', () => {
        const code = "new GridBuilder().build()\ncolumns.addTextColumn('n')";
        expect(attributeFencedCallTokens(code)).toEqual([
            { token: 'build', receiver: 'GridBuilder' },
            { token: 'addTextColumn', receiver: null },
        ]);
    });

    it('a newline at depth 0 whose next non-whitespace character IS "." does NOT reset the stack — the normal multi-line chain style throughout .agent/components/**', () => {
        const code = "new PanelBuilder()\n    .asGlass()\n    .withGap(x)\n    .build();";
        expect(attributeFencedCallTokens(code)).toEqual([
            { token: 'asGlass', receiver: 'PanelBuilder' },
            { token: 'withGap', receiver: 'PanelBuilder' },
            { token: 'build', receiver: 'PanelBuilder' },
        ]);
    });

    it('a `const NAME = new XBuilder()` assignment lets a LATER, separate statement reference NAME and resolve back to X (the layout.md shape)', () => {
        const code = "const layout = new LayoutBuilder().asVertical();\n\nlayout.addSlot().withContent(x);";
        const results = attributeFencedCallTokens(code);
        expect(results).toEqual([
            { token: 'asVertical', receiver: 'LayoutBuilder' },
            { token: 'addSlot', receiver: 'LayoutBuilder' },
            // withContent is attributed to SlotBuilder, not LayoutBuilder — addSlot's
            // known return type takes over the chain (see the next describe block).
            { token: 'withContent', receiver: 'SlotBuilder' },
        ]);
    });

    it('`let NAME = new XBuilder()` is tracked the same way `const` is', () => {
        const code = "let router = new RouterBuilder();\nrouter.addRoute('/x');";
        const results = attributeFencedCallTokens(code);
        expect(results[0]).toEqual({ token: 'addRoute', receiver: 'RouterBuilder' });
    });

    it('an untracked bare variable (never assigned from `new ...Builder()` anywhere in the block) resolves to a null receiver', () => {
        const code = "columns.addTextColumn('n');";
        expect(attributeFencedCallTokens(code)).toEqual([{ token: 'addTextColumn', receiver: null }]);
    });
});

describe('attributeFencedCallTokens — chain type changes via the sub-builder return-type table', () => {
    it('addSlot() switches the chain to SlotBuilder for whatever\'s chained directly after it', () => {
        const code = 'layoutVar.addSlot().withContent(x);';
        // layoutVar is untracked, so addSlot itself has a null receiver — but its return
        // type (SlotBuilder) still takes over for withContent.
        expect(attributeFencedCallTokens(code)).toEqual([
            { token: 'addSlot', receiver: null },
            { token: 'withContent', receiver: 'SlotBuilder' },
        ]);
    });

    it('addTextColumn (matched via the generic add*Column -> *ColumnBuilder rule) switches the chain to TextColumnBuilder', () => {
        const code = "columns.addTextColumn('name').withHeader('Name');";
        expect(attributeFencedCallTokens(code)).toEqual([
            { token: 'addTextColumn', receiver: null },
            { token: 'withHeader', receiver: 'TextColumnBuilder' },
        ]);
    });

    it('addMoneyColumn switches the chain to MoneyColumnBuilder (the generic rule applied to a different column type)', () => {
        const code = "columns.addMoneyColumn('amount').asGlass();";
        expect(attributeFencedCallTokens(code)).toEqual([
            { token: 'addMoneyColumn', receiver: null },
            { token: 'asGlass', receiver: 'MoneyColumnBuilder' },
        ]);
    });

    it('withYAxis() switches the chain to AxisBuilder', () => {
        const code = 'new ChartBuilder().withYAxis().withLabel("Revenue");';
        expect(attributeFencedCallTokens(code)).toEqual([
            { token: 'withYAxis', receiver: 'ChartBuilder' },
            { token: 'withLabel', receiver: 'AxisBuilder' },
        ]);
    });

    it('a method with no known return-type mapping does not change the active receiver', () => {
        const code = 'new PanelBuilder().withGap(x).asGlass();';
        expect(attributeFencedCallTokens(code)).toEqual([
            { token: 'withGap', receiver: 'PanelBuilder' },
            { token: 'asGlass', receiver: 'PanelBuilder' },
        ]);
    });

    // Regression pin for a reviewer-found leak: a RETURN_TYPE_TABLE chain-type-change
    // used to be pushed onto the receiver stack immediately, at the SAME depth as
    // whatever call triggered it (before that call's own "(" was even consumed) —
    // indistinguishable, once its own argument list closed back to that depth, from an
    // outer receiver meant to persist (e.g. GridBuilder). It's fixed now by deferring the
    // push to a `pendingSwitches` entry that's only applied once its triggering call's own
    // parens have fully closed, AND only if nothing was pushed onto the stack (a `new` or
    // tracked-variable receiver) anywhere inside those parens — see
    // attributeFencedCallTokens's doc comment for the full "contaminated" rule.
    it('does NOT leak a chain-type-change receiver past its own call\'s closing paren — trailing withCaption/build after .withToolbar(new ToolbarBuilder()...) must attribute to the OUTER receiver (GridBuilder), not the leaked inner one (ToolbarBuilder)', () => {
        const code = "new GridBuilder().withToolbar(new ToolbarBuilder().withPrimaryButton(new ButtonBuilder().withCaption('x'))).withCaption('Grid').build();";
        expect(attributeFencedCallTokens(code)).toEqual([
            { token: 'withToolbar', receiver: 'GridBuilder' },
            { token: 'withPrimaryButton', receiver: 'ToolbarBuilder' },
            { token: 'withCaption', receiver: 'ButtonBuilder' },
            { token: 'withCaption', receiver: 'GridBuilder' },
            { token: 'build', receiver: 'GridBuilder' },
        ]);
    });

    it('a two-level variant of the same shape: .withToolbar(new ToolbarBuilder()).withCaption(\'Grid\') — a SINGLE nested "new" inside the argument list, no third level', () => {
        const code = "new GridBuilder().withToolbar(new ToolbarBuilder()).withCaption('Grid').build();";
        expect(attributeFencedCallTokens(code)).toEqual([
            { token: 'withToolbar', receiver: 'GridBuilder' },
            { token: 'withCaption', receiver: 'GridBuilder' },
            { token: 'build', receiver: 'GridBuilder' },
        ]);
    });

    it('the minimal .withToolbar(...).withCaption(\'Grid\') shape on its own, with nothing chained after withCaption', () => {
        const code = "new GridBuilder().withToolbar(new ToolbarBuilder().withPrimaryButton(new ButtonBuilder())).withCaption('Grid');";
        expect(attributeFencedCallTokens(code)).toEqual([
            { token: 'withToolbar', receiver: 'GridBuilder' },
            { token: 'withPrimaryButton', receiver: 'ToolbarBuilder' },
            { token: 'withCaption', receiver: 'GridBuilder' },
        ]);
    });

    it('an UNcontaminated chain-type change still applies normally alongside a contaminated one in the same statement — addTextColumn(\'name\') (plain string arg) still switches to TextColumnBuilder even after a contaminated withToolbar(new ToolbarBuilder()) earlier in the same chain', () => {
        const code = "new GridBuilder().withToolbar(new ToolbarBuilder()).addTextColumn('name').withHeader('Name');";
        expect(attributeFencedCallTokens(code)).toEqual([
            { token: 'withToolbar', receiver: 'GridBuilder' },
            { token: 'addTextColumn', receiver: 'GridBuilder' },
            { token: 'withHeader', receiver: 'TextColumnBuilder' },
        ]);
    });
});

describe('listDocFiles', () => {
    it('lists every real .agent/components/**/*.md file with forward-slash relative paths, including nested chart/ and grid/', () => {
        const files = listDocFiles(AGENT_COMPONENTS_DIR);
        expect(files).toContain('button.md');
        expect(files).toContain('chart/axis-builder.md');
        expect(files).toContain('grid/grid.md');
        expect(files).toContain('grid/custom-column.md');
        expect(files.every((f) => !f.includes('\\'))).toBe(true);
    });

    it('includes "../router.md" — the one doc that lives directly under .agent/, a sibling of components/ rather than a descendant, explicit-lookup-only (not found by the recursive walk)', () => {
        const files = listDocFiles(AGENT_COMPONENTS_DIR);
        expect(files).toContain('../router.md');
    });

    it('omits "../router.md" when .agent/router.md does not exist on disk, rather than including a dangling entry', () => {
        const base = mkdtempSync(join(tmpdir(), 'list-doc-files-'));
        try {
            const componentsDir = join(base, '.agent', 'components');
            mkdirSync(componentsDir, { recursive: true });
            writeFileSync(join(componentsDir, 'button.md'), '# placeholder\n');
            const files = listDocFiles(componentsDir);
            expect(files).toContain('button.md');
            expect(files).not.toContain('../router.md');
        } finally {
            rmSync(base, { recursive: true, force: true });
        }
    });
});

describe('DOC_TO_BUILDERS registers every real doc file, and only real doc files', () => {
    it('has no doc file missing from the table and no stale table entry for a doc file that no longer exists — the same check main() enforces at runtime (either direction is itself a build error)', () => {
        const files = new Set(listDocFiles(AGENT_COMPONENTS_DIR));
        const registered = new Set(Object.keys(DOC_TO_BUILDERS));
        const unregistered = [...files].filter((f) => !registered.has(f));
        const stale = [...registered].filter((f) => !files.has(f));
        expect({ unregistered, stale }).toEqual({ unregistered: [], stale: [] });
    });
});

describe('the real .agent/components tree against the real (built) manifest', () => {
    // This is the deliverable the plan asks for: run the check against the
    // current source tree and print the real failures/warnings. It is
    // intentionally not an assertion of "0 failures" — the plan expects real
    // drift to exist today (Task 4 Step 2 fixes the docs in a separate, later
    // change) — this test exists so `npx jest scripts` always shows the
    // current, real report in its output. A missing manifest is a hard test
    // failure, not a silent skip: `npm run build` is a documented
    // prerequisite (see the module doc comment in check-docs-vs-manifest.mjs
    // and package.json's `verify`), so a missing manifest here means the
    // environment isn't set up to run this suite meaningfully, not that the
    // check has nothing to report.
    it('runs the full check and prints the failures/warnings (informational — not asserted to be zero)', () => {
        const manifestPath = join(__dirname, '../dist/component-manifest.json');
        let manifestRaw: string;
        try {
            manifestRaw = readFileSync(manifestPath, 'utf8');
        } catch (err) {
            throw new Error(
                'check-docs-vs-manifest.test: dist/component-manifest.json not found. Run `npm run build` before ' +
                `running this suite. Original error: ${(err as Error).message}`,
            );
        }
        const manifest = JSON.parse(manifestRaw);
        const index = buildManifestIndex(manifest);
        const docFiles = listDocFiles(AGENT_COMPONENTS_DIR).sort();
        const allFailures: string[] = [];
        const allWarnings: string[] = [];
        let checked = 0;
        for (const docFile of docFiles) {
            const builders = DOC_TO_BUILDERS[docFile];
            if (builders === null || builders === undefined) continue;
            const markdown = readFileSync(join(AGENT_COMPONENTS_DIR, docFile), 'utf8');
            const result = checkDoc(docFile, markdown, builders, index);
            checked += result.checked;
            allFailures.push(...result.failures);
            allWarnings.push(...result.warnings);
        }
        // eslint-disable-next-line no-console
        console.log(`check-docs-vs-manifest (end-to-end): ${checked} methods checked, ${allFailures.length} failure(s), ${allWarnings.length} warning(s).`);
        for (const f of allFailures) {
            // eslint-disable-next-line no-console
            console.log(`  FAIL - ${f}`);
        }
        for (const w of allWarnings) {
            // eslint-disable-next-line no-console
            console.log(`  WARN - ${w}`);
        }
        expect(checked).toBeGreaterThan(0);
    });
});

describe('extractCodeRegions / extractMethodTokens — malformed markdown', () => {
    // The fenced-block regex requires a closing ```; an unterminated fence at
    // EOF therefore matches nothing and its text is left in the
    // "withoutFences" remainder that the inline-span regex scans. The inline
    // regex forbids newlines and needs a non-backtick run between two
    // backticks, so the ``` marker itself can never open a phantom span: the
    // failure mode is a *silent drop* of the unclosed block's tokens, never an
    // invented one. These tests pin that down — a phantom token would name a
    // method nobody documented and fail CI against a perfectly good manifest,
    // which is far worse than under-reporting.
    it('an unterminated fence at EOF yields no phantom tokens (its own tokens are silently dropped)', () => {
        expect(extractMethodTokens('# Doc\n\n```ts\nnew B().withFoo();\n')).toEqual([]);
        expect(extractMethodTokens('```\nwithFoo()\n')).toEqual([]);
        expect(extractMethodTokens('```ts\r\nwithFoo()\r\n')).toEqual([]);
    });

    it('an odd number of fences keeps every closed block and the surrounding prose, and drops only the trailing unclosed one', () => {
        const md = '```ts\nwithA()\n```\nprose `withB()`\n```ts\nwithC()\n';
        expect(extractMethodTokens(md)).toEqual(['withA', 'withB']);
    });

    it('an inline span before an unterminated fence is still read normally — the fence marker does not swallow it', () => {
        const md = '```ts\nx\n```\ntext `withOk()` and ```\nwithTail()\n';
        expect(extractMethodTokens(md)).toEqual(['withOk']);
    });

    it('a bare ``` marker with no newline after it, and a lone backtick, produce nothing', () => {
        expect(extractMethodTokens('```')).toEqual([]);
        expect(extractMethodTokens('a ` b withFoo() c')).toEqual([]);
    });

    it('handles empty and whitespace-only markdown', () => {
        expect(extractMethodTokens('')).toEqual([]);
        expect(extractMethodTokens('\n\n   \r\n')).toEqual([]);
    });
});

describe('DOC_TO_BUILDERS entry shape', () => {
    // An entry of `[]` is the dangerous middle ground between "documents a
    // builder" and `null` ("documents no builder"): checkDoc's
    // `builders.some(...)` is false for every token, `anyBuilderPresent` is
    // false, and `builders[0]` is undefined — so every documented method is
    // reported as a warning labelled `undefined.<method>`. That is a silent,
    // useless report rather than a rejection, so the table is guarded here:
    // a value must be either null or a non-empty array of unique builder names.
    it('rejects an empty [] value — every entry is null or a non-empty array of unique, non-empty builder names', () => {
        const bad: string[] = [];
        for (const [doc, builders] of Object.entries(DOC_TO_BUILDERS)) {
            if (builders === null) continue;
            if (!Array.isArray(builders)) {
                bad.push(`${doc}: not an array and not null`);
                continue;
            }
            if (builders.length === 0) {
                bad.push(`${doc}: empty [] — use null for a concept guide, or list the builder(s)`);
                continue;
            }
            if (builders.some((b: unknown) => typeof b !== 'string' || b.length === 0)) {
                bad.push(`${doc}: contains a non-string or empty builder name`);
            }
            if (new Set(builders as string[]).size !== (builders as string[]).length) {
                bad.push(`${doc}: duplicate builder name`);
            }
        }
        expect(bad).toEqual([]);
    });

    // checkDoc() itself has no opinion on `[]` vs `null` — it just treats an empty
    // builders array as "no builder is ever present", so the label comes out as the
    // tell-tale `undefined.<method>`. main()'s runtime guard (see the CLI e2e suite
    // below, "exits 1 with a friendly message when DOC_TO_BUILDERS has an empty []
    // entry") is what actually keeps this shape out of the real table; this test just
    // pins checkDoc()'s own behaviour on the shape in isolation.
    it('documents what checkDoc does with an empty [] on its own — no builder is ever "present", so nothing can FAIL', () => {
        const index = buildManifestIndex(fakeManifest([{ name: 'ButtonBuilder', methods: ['withCaption'] }]));
        const { failures, warnings, checked } = checkDoc('hypothetical.md', '`withCaption()`', [], index);
        expect(checked).toBe(1);
        expect(failures).toEqual([]);
        // The label is the tell-tale: `undefined.withCaption`. The guard above
        // is what keeps this shape out of the real table.
        expect(warnings).toEqual(['hypothetical.md: undefined.withCaption not in manifest']);
    });
});

// ---------------------------------------------------------------------------
// End-to-end: main() via the CLI, against a throwaway fixture tree.
//
// main() is module-private and derives every path from process.argv[1], so the
// only way to exercise its exit codes and messages is to run a *copy* of the
// real script (same filename, so its `invokedDirectly` guard fires) inside a
// fixture whose layout matches what main() expects:
//
//   <base>/.agent/components/**.md          (join(script/.., '../../..', '.agent/components'))
//   <base>/pkgs/pkg/scripts/check-docs-vs-manifest.mjs
//   <base>/pkgs/pkg/dist/component-manifest.json
//
// Every DOC_TO_BUILDERS key gets a file (empty unless the case under test
// gives it content), so the unregistered/stale guard is satisfied and each
// case isolates exactly one behaviour.
// ---------------------------------------------------------------------------
describe('the CLI (main) end-to-end against a fixture tree', () => {
    const { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync, utimesSync } = require('fs') as typeof import('fs');
    const { spawnSync } = require('child_process') as typeof import('child_process');
    const { tmpdir } = require('os') as typeof import('os');
    const { dirname: dir } = require('path') as typeof import('path');

    const REAL_SCRIPT = join(__dirname, 'check-docs-vs-manifest.mjs');
    const REAL_DOC_MAP = join(__dirname, 'doc-map.mjs');
    const created: string[] = [];

    afterEach(() => {
        while (created.length > 0) {
            rmSync(created.pop() as string, { recursive: true, force: true });
        }
    });

    type Fixture = {
        docs?: Record<string, string>;   // extra/overriding doc content
        omitDocs?: string[];             // registered docs to NOT create (→ stale entry)
        manifest?: unknown | null;       // null → do not write a manifest at all
        staleDts?: boolean;              // write a dist/*.d.ts newer than the manifest
        docMapContent?: string;          // override doc-map.mjs's own content (e.g. inject an empty [] entry)
    };

    function makeFixture(fx: Fixture) {
        const base = mkdtempSync(join(tmpdir(), 'docs-manifest-'));
        created.push(base);
        const pkg = join(base, 'pkgs', 'pkg');
        const scriptsDir = join(pkg, 'scripts');
        const distDir = join(pkg, 'dist');
        const componentsDir = join(base, '.agent', 'components');
        mkdirSync(scriptsDir, { recursive: true });
        mkdirSync(distDir, { recursive: true });
        mkdirSync(componentsDir, { recursive: true });

        const omit = new Set(fx.omitDocs ?? []);
        const docs: Record<string, string> = { ...fx.docs };
        for (const key of Object.keys(DOC_TO_BUILDERS)) {
            if (omit.has(key)) continue;
            if (!(key in docs)) docs[key] = '# placeholder\n';
        }
        for (const [rel, content] of Object.entries(docs)) {
            const full = join(componentsDir, rel);
            mkdirSync(dir(full), { recursive: true });
            writeFileSync(full, content, 'utf8');
        }

        const scriptCopy = join(scriptsDir, 'check-docs-vs-manifest.mjs');
        copyFileSync(REAL_SCRIPT, scriptCopy);
        // check-docs-vs-manifest.mjs imports DOC_TO_BUILDERS from './doc-map.mjs' — the
        // fixture's scripts/ dir needs its own copy alongside the script copy so that
        // relative import resolves. docMapContent lets a test swap in a table with a
        // deliberately-invalid entry (e.g. `[]`) to exercise main()'s runtime guard.
        writeFileSync(join(scriptsDir, 'doc-map.mjs'), fx.docMapContent ?? readFileSync(REAL_DOC_MAP, 'utf8'), 'utf8');

        if (fx.manifest !== null) {
            writeFileSync(
                join(distDir, 'component-manifest.json'),
                typeof fx.manifest === 'string' ? fx.manifest : JSON.stringify(fx.manifest ?? fakeManifest([])),
                'utf8',
            );
        }
        if (fx.staleDts) {
            const dts = join(distDir, 'index.d.ts');
            writeFileSync(dts, 'export {};\n', 'utf8');
            const future = new Date(Date.now() + 60_000);
            utimesSync(dts, future, future);
        }
        return scriptCopy;
    }

    function run(fx: Fixture) {
        const script = makeFixture(fx);
        const res = spawnSync(process.execPath, [script], { encoding: 'utf8' });
        return { code: res.status, stdout: res.stdout, stderr: res.stderr };
    }

    it('exits 0 with a summary line when every documented method is in the manifest', () => {
        const { code, stdout, stderr } = run({
            docs: { 'button.md': '- `withCaption(caption)` - sets caption.\n' },
            manifest: fakeManifest([{ name: 'ButtonBuilder', methods: ['withCaption'] }]),
        });
        expect(stderr).toBe('');
        expect(stdout).toContain('1 methods checked — 0 failure(s), 0 warning(s).');
        expect(code).toBe(0);
    });

    it('exits 0 when there are WARNINGS ONLY — a builder entirely absent from the manifest is not fatal', () => {
        const { code, stdout, stderr } = run({
            docs: { 'chart/axis-builder.md': '- `withFormat(format)` - sets format.\n' },
            manifest: fakeManifest([{ name: 'ButtonBuilder', methods: ['withCaption'] }]),
        });
        expect(stderr).toContain('WARN');
        expect(stderr).toContain('chart/axis-builder.md: AxisBuilder.withFormat not in manifest');
        expect(stderr).not.toContain('FAIL');
        expect(stdout).toContain('1 methods checked — 0 failure(s), 1 warning(s).');
        expect(code).toBe(0);
    });

    it('exits 1 when a builder that IS in the manifest lacks a documented method, and still prints the summary', () => {
        const { code, stdout, stderr } = run({
            docs: { 'combobox.md': '- `asInlineError(): this`\n' },
            manifest: fakeManifest([{ name: 'ComboBoxBuilder', methods: ['withCaption'] }]),
        });
        expect(stderr).toContain('FAIL');
        expect(stderr).toContain('combobox.md: ComboBoxBuilder.asInlineError not in manifest');
        expect(stdout).toContain('1 methods checked — 1 failure(s), 0 warning(s).');
        expect(code).toBe(1);
    });

    it('prints the multi-builder miss as "A|B.method" and exits 1', () => {
        const { code, stderr } = run({
            docs: { 'grid/actions-builder.md': '- `withActions(list)`\n' },
            manifest: fakeManifest([{ name: 'ActionBuilder', methods: [] }]),
        });
        expect(stderr).toContain('grid/actions-builder.md: ActionBuilder|ActionsBuilder.withActions not in manifest');
        expect(code).toBe(1);
    });

    it('exits 1 with a friendly "run npm run build first" message — not a raw ENOENT — when the manifest is missing', () => {
        const { code, stderr } = run({ manifest: null });
        expect(stderr).toContain('dist/component-manifest.json not found — run `npm run build` first.');
        expect(stderr).not.toMatch(/ENOENT|at Object|Error:/);
        expect(code).toBe(1);
    });

    it('exits 1 with the same friendly message when the manifest is older than a built .d.ts', () => {
        const { code, stderr } = run({ manifest: fakeManifest([]), staleDts: true });
        expect(stderr).toContain('older than the built .d.ts files — run `npm run build` first.');
        expect(code).toBe(1);
    });

    it('exits 1 with a friendly message when the manifest is not valid JSON', () => {
        const { code, stderr } = run({ manifest: '{ not json' });
        expect(stderr).toContain('could not be parsed — run `npm run build` again.');
        expect(code).toBe(1);
    });

    it('exits 1 with a friendly message when DOC_TO_BUILDERS has an empty [] entry — checked before the unregistered/stale scan', () => {
        const docMapContent = readFileSync(REAL_DOC_MAP, 'utf8').replace(
            "'button.md': ['ButtonBuilder'],",
            "'button.md': [],",
        );
        expect(docMapContent).toContain("'button.md': [],");
        const { code, stderr } = run({ manifest: fakeManifest([]), docMapContent });
        expect(stderr).toContain('empty [] value');
        expect(stderr).toContain('use null');
        expect(stderr).toContain('- button.md');
        expect(code).toBe(1);
    });

    it('exits 1 listing a doc file that is missing from DOC_TO_BUILDERS', () => {
        const { code, stderr } = run({
            docs: { 'brand-new-component.md': '# new\n' },
            manifest: fakeManifest([]),
        });
        expect(stderr).toContain('missing from DOC_TO_BUILDERS');
        expect(stderr).toContain('- brand-new-component.md');
        expect(code).toBe(1);
    });

    it('exits 1 listing a stale DOC_TO_BUILDERS entry whose doc file no longer exists', () => {
        const { code, stderr } = run({ omitDocs: ['trend.md'], manifest: fakeManifest([]) });
        expect(stderr).toContain('with no matching doc file');
        expect(stderr).toContain('- trend.md');
        expect(code).toBe(1);
    });

    it('skips a null-mapped concept doc entirely — its builder-looking tokens are never checked', () => {
        const { code, stdout } = run({
            docs: { 'grid/grid-row.md': '- `withNeverExists(x)` - internals only.\n' },
            manifest: fakeManifest([{ name: 'GridBuilder', methods: [] }]),
        });
        expect(stdout).toContain('0 methods checked — 0 failure(s), 0 warning(s).');
        expect(code).toBe(0);
    });
});

describe('package.json wiring', () => {
    it('runs check-css-globals then check-theme-tokens then check-docs-vs-manifest then check-quickstart in `verify`, and never regenerates the manifest there', () => {
        const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
        expect(pkg.scripts.verify).toBe('node scripts/check-css-globals.mjs && node scripts/check-theme-tokens.mjs && node scripts/check-docs-vs-manifest.mjs && node scripts/check-quickstart.mjs');
        expect(pkg.scripts.verify).not.toContain('generate-manifest');
    });

    it('keeps manifest generation in `build`, where dist/ is complete', () => {
        const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
        expect(pkg.scripts.build).toContain('node scripts/generate-manifest.mjs');
    });
});
