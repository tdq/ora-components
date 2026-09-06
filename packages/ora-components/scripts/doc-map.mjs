/**
 * Shared doc <-> builder map, used by both `check-docs-vs-manifest.mjs` (doc-to-manifest
 * drift check) and `generate-manifest.mjs` (`loadAgentDoc`, to resolve a builder's
 * description/method-description doc without guessing a path from the builder's
 * lowercased name — that guess fails for every inline/nested builder documented under a
 * subdirectory, e.g. `AxisBuilder` -> `chart/axis-builder.md`, `TextColumnBuilder` ->
 * `grid/text-column.md`).
 *
 * `DOC_TO_BUILDERS` is the explicit map required by the plan (Task 4 Step 1): every file
 * under `.agent/components/**` must have an entry. A doc file with `null` documents no
 * builder (a concept/internals guide — e.g. how the grid's internal `GridRow` class works,
 * not a public builder) and is skipped entirely by the doc-drift check. An entry must never
 * be `[]` — that's the ambiguous middle ground between "documents a builder" and "documents
 * none"; `check-docs-vs-manifest.mjs`'s `main()` rejects it at runtime (see its module doc
 * comment).
 *
 * Every builder listed here — including `AxisBuilder`, `LineChartBuilder`/
 * `BarChartBuilder`/`AreaChartBuilder`, every grid `*ColumnBuilder`, `ColumnsBuilder`, and
 * the sidebar/layout inline-builder interfaces (`SlotBuilder`, `SidebarItemBuilder`,
 * `SidebarFooterBuilder`, `SidebarMenuBuilder`, `SidebarMenuItemBuilder`) — is now visible
 * to `generate-manifest.mjs`: it recurses into nested `dist/<component>/**` directories
 * (`chart/builders/`, `grid/columns/`) and matches `export interface`/`export declare
 * interface` bodies in addition to `export declare class` ones, per
 * `.agent/builder-pattern.md`'s "inline builders are exported as interfaces" design.
 */
export const DOC_TO_BUILDERS = {
    '../router.md': ['RouterBuilder', 'LinkBuilder', 'RouteBuilder'],
    'button.md': ['ButtonBuilder'],
    'chart/axis-builder.md': ['AxisBuilder'],
    'chart/chart.md': ['ChartBuilder'],
    'chart/individual-charts.md': ['LineChartBuilder', 'BarChartBuilder', 'AreaChartBuilder'],
    'chatpanel.md': ['ChatPanelBuilder'],
    'chattrigger.md': ['ChatTriggerBuilder'],
    'checkbox.md': ['CheckboxBuilder'],
    'combobox.md': ['ComboBoxBuilder'],
    'component-parts.md': ['ErrorPopoverBuilder', 'FieldLabelBuilder', 'FieldSupportTextBuilder', 'FieldAffixBuilder'],
    'datepicker.md': ['DatePickerBuilder'],
    'dialog.md': ['DialogBuilder'],
    'form.md': ['FormBuilder', 'FieldsBuilder'],
    'fx-ticker.md': ['FxTickerBuilder'],
    'grid/actions-builder.md': ['ActionBuilder', 'ActionsBuilder'],
    'grid/boolean-column.md': ['BooleanColumnBuilder'],
    'grid/button-column.md': ['ButtonColumnBuilder'],
    'grid/custom-column.md': ['CustomColumnBuilder'],
    'grid/date-column.md': ['DateColumnBuilder'],
    'grid/datetime-column.md': ['DateTimeColumnBuilder'],
    'grid/enum-column.md': ['EnumColumnBuilder'],
    'grid/grid-group-row.md': null,
    'grid/grid-header.md': null,
    'grid/grid-logic.md': null,
    'grid/grid-row.md': null,
    'grid/grid-styles.md': null,
    'grid/grid-viewport.md': null,
    'grid/grid.md': ['GridBuilder', 'ColumnsBuilder'],
    'grid/icon-column.md': ['IconColumnBuilder'],
    'grid/money-column.md': ['MoneyColumnBuilder'],
    'grid/number-column.md': ['NumberColumnBuilder'],
    'grid/percentage-column.md': ['PercentageColumnBuilder'],
    'grid/pivot.md': ['GridBuilder'],
    'grid/text-column.md': ['TextColumnBuilder'],
    'grid/toolbar.md': ['ToolbarBuilder', 'GridBuilder'],
    'grid/trend-column.md': ['TrendColumnBuilder'],
    'label.md': ['LabelBuilder'],
    'layout.md': ['LayoutBuilder', 'SlotBuilder'],
    'listbox.md': ['ListBoxBuilder'],
    'money-field.md': ['MoneyFieldBuilder'],
    'money-kpi-card.md': ['MoneyKPICardBuilder'],
    'multi-select-list.md': ['MultiSelectListBuilder'],
    'number-field.md': ['NumberFieldBuilder'],
    'panel.md': ['PanelBuilder'],
    'popover.md': ['PopoverBuilder'],
    'sidebar.md': ['SideBarBuilder', 'SidebarItemBuilder', 'SidebarFooterBuilder', 'SidebarMenuBuilder', 'SidebarMenuItemBuilder'],
    'step-builder.md': ['StepBuilder', 'StepsBuilder'],
    'tabs.md': ['TabsBuilder', 'TabBuilder'],
    'text-field.md': ['TextFieldBuilder'],
    'toolbar.md': ['ToolbarBuilder'],
    'trend.md': ['TrendBuilder'],
};

/**
 * Score how well `docFile` matches `componentName` (a builder name with its `Builder`
 * suffix stripped and lowercased, e.g. `ToolbarBuilder` -> `toolbar`): 2 when the doc's
 * own basename equals it AND the doc is flat (top-level, e.g. `toolbar.md`), 1 when the
 * basename matches but the doc lives in a subdirectory (e.g. `grid/toolbar.md` — that one
 * documents GridBuilder's toolbar integration, not ToolbarBuilder's own API, and merely
 * lists ToolbarBuilder because an example composes it), 0 when the basename doesn't match
 * at all (e.g. `grid/actions-builder.md` for `ActionBuilder`, componentName `action`).
 */
export function docMatchScore(docFile, componentName) {
    const base = docFile.slice(docFile.lastIndexOf('/') + 1).replace(/\.md$/, '').toLowerCase();
    if (base !== componentName) return 0;
    return docFile.includes('/') ? 1 : 2;
}

/**
 * Reverse index: builder class name -> the doc file (relative to `.agent/components`,
 * forward-slash separated) that documents it. More than one doc file DOES list the same
 * builder name today — e.g. `ToolbarBuilder` appears in both `grid/toolbar.md` (grid's
 * toolbar integration, alphabetically first) and `toolbar.md` (ToolbarBuilder's own doc)
 * — so naive first-wins previously picked the wrong one. The doc whose own basename
 * matches the builder's name wins (see docMatchScore), preferring a flat match
 * (`toolbar.md`) over a same-named nested one (`grid/toolbar.md`); when no candidate
 * matches by name at all (e.g. `ActionBuilder` only appears in `grid/actions-builder.md`),
 * insertion order in `DOC_TO_BUILDERS` — deterministic, since object key order is
 * preserved — decides, i.e. first-wins is the fallback, not the primary rule.
 */
function buildBuilderToDocIndex() {
    const index = new Map();
    const scores = new Map();
    for (const [docFile, builders] of Object.entries(DOC_TO_BUILDERS)) {
        if (!builders) continue;
        for (const name of builders) {
            const componentName = name.replace(/Builder$/, '').toLowerCase();
            const score = docMatchScore(docFile, componentName);
            if (!index.has(name) || score > scores.get(name)) {
                index.set(name, docFile);
                scores.set(name, score);
            }
        }
    }
    return index;
}

const BUILDER_TO_DOC = buildBuilderToDocIndex();

/** The `.agent/components`-relative doc file for a builder class name, or `null`. */
export function docForBuilder(name) {
    return BUILDER_TO_DOC.get(name) ?? null;
}
