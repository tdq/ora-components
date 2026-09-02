# Bake-off Findings Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the developer-experience gaps found in the 2026-09-02 ora-components vs React+MUI+Zustand bake-off, so that a first-time consumer (human or LLM) can build an accounting-style app with ora at the same cost as with MUI, without post-`build()` DOM manipulation, and with correct charts, money formatting, theming hooks and grid accessibility.

**Background:** The same "Ledger Lite" app was built twice from one spec. With the model knowing MUI and not ora, the ora build cost 239k tokens vs 99k. With a one-page ora cheat sheet the ora build cost 97k — the gap is knowledge plus missing escape hatches, not the builder API. Report: https://claude.ai/code/artifact/b05d7329-c2e8-425f-a635-6349ffdecd98. The confirmed defects and the measured cost each one caused are listed per task below.

**Architecture:** All changes are additive to the existing builder grammar (`with*` / `add*` / `as*`, configure-then-`build()`). A shared `applyAttributes` helper in `core/` gives every main builder an attribute API. Chart bar placement moves from a single shared `barWidth` to a per-series slot computed in `chart-logic.ts`. Component styling hooks become CSS custom properties with the current hard-coded values as defaults. Documentation gets a shipped `QUICKSTART.md`, consumer-facing dialog/toolbar docs, and a CI cross-check between `.agent/components/*.md` and `component-manifest.json`.

**Tech Stack:** TypeScript, RxJS 7, Tailwind 3 (`clsx` + `tailwind-merge` via `cn()`), jsdom + ts-jest (Jest), jest-axe (already a devDependency, currently unused), Vite, Storybook (`packages/stories`), MCP server (`packages/ora-mcp-server`).

## Global Constraints

- Package under test: `packages/ora-components`. Run tests from there: `cd packages/ora-components && npx jest <file>`. Full run must go from **5 failing / 1660 passing** (current state of `release/0.1.8`) to 0 failing.
- Test environment is **jsdom**: `clientHeight`/`scrollTop` are `0`, `ResizeObserver`/`requestAnimationFrame`/`IntersectionObserver` are not native. Follow the mocking pattern in `src/components/grid/grid-viewport.test.ts`.
- No post-build DOM manipulation in library code paths that consumers are told to avoid (`.agent/builder-pattern.md` anti-patterns). Every new capability is a builder method applied inside `build()`.
- Builder naming rules from `.agent/builder-pattern.md`: only `with*`, `add*`, `as*`, `build`. New methods return `this`.
- **Repo commit convention:** do NOT run `git commit` without explicit user approval. The "Commit" steps below mean: `git add` the listed files and prepare the commit message, then pause for the user to approve the actual commit.
- After every task that changes a public builder: `npm run build` in `packages/ora-components` must succeed (it regenerates `dist/component-manifest.json`), and the matching `.agent/components/<name>.md` and `packages/stories/src/<name>.docs.mdx` must be updated in the same task.
- Consumer verification: `packages/examples` aliases the **source**, so it cannot catch packaging bugs. Task 2 adds a tarball-based smoke app; use it for the CSS and attribute tasks.

---

## Phase 0 — Hygiene (≈1 day)

### Task 1: Remove the dev-page `body` rule from the shipped CSS

**Measured cost:** every consumer app in the bake-off (both ora builds and the landing page) had to override `body{display:flex;place-items:center;min-width:320px;min-height:100vh}`; it caused one of the three layout bugs per new app.

**Files:**
- Modify: `packages/ora-components/src/index-layered.css` (rule at ~line 163)
- Modify: `packages/ora-components/scripts/wrap-css-layer.mjs` (add a guard)
- Test: `packages/ora-components/scripts/check-css-globals.test.mjs` (new; or a jest test that reads `dist/ora-components.css` if the build runs before tests in CI)

- [ ] **Step 1: Write the failing check**

Add a node script `scripts/check-css-globals.mjs` that reads `dist/ora-components.css`, strips the Tailwind preflight reset (`@layer ora-components{ … }` up to the first component class), and fails with exit code 1 if any rule targets `body`, `html` or `#app` with `display`, `place-items`, `min-width`, `min-height` or `margin` declarations. Wire it into `package.json` `build` after `build:css`. Run it: it must fail on the current output.

- [ ] **Step 2: Move the rule**

Delete the `body { … place-items: center … }` block from `src/index-layered.css`. If Storybook or `packages/ora-components/index.html` (dev page) relied on it, add the same rule to that dev entry only (e.g. `packages/ora-components/dev.css` imported by the dev `index.html`).

- [ ] **Step 3: Verify**

`npm run build` → check script passes. Open `packages/ora-landing-page` dev server: layout unchanged (it already overrides `body`). Remove the now-redundant override comment in `packages/ora-landing-page/src/styles.css` if present.

- [ ] **Step 4: Changelog + commit**

Add to `CHANGELOG.md` under Unreleased → Fixed. Stage `src/index-layered.css`, `scripts/check-css-globals.mjs`, `package.json`, `CHANGELOG.md`. Pause for approval.

### Task 2: Tarball-based consumer smoke app in CI

**Measured cost:** the CSS leak above and the outlet-height issue only show up when consuming the **published** package, which nothing in the repo does today.

**Files:**
- Create: `packages/smoke-consumer/{package.json,index.html,vite.config.ts,tsconfig.json,src/main.ts,src/smoke.spec.ts}`
- Modify: `turbo.json` (add `smoke` task depending on `@tdq/ora-components#pack:local`)
- Modify: root `package.json` scripts (`"smoke": "turbo run smoke"`)

- [ ] **Step 1: Scaffold**

`package.json` depends on `"@tdq/ora-components": "file:../ora-components/tdq-ora-components-0.1.8.tgz"` (version read from the library `package.json` by a tiny prepare script) plus `rxjs`, `vite`, `typescript`, `playwright` (already in root `node_modules`). `src/main.ts` imports `@tdq/ora-components/style.css`, builds a `SideBarBuilder` + `RouterBuilder` shell with one `GridBuilder` route of 1 000 rows and one `DialogBuilder` with `withToolbar()`.

- [ ] **Step 2: Assertions (Playwright, headless Chromium)**

`smoke.spec.ts`: page has no console errors; `document.body` computed `display` is `block`; grid renders < 100 row nodes for 1 000 items; the router outlet has non-zero height; dialog toolbar buttons are visible below the content.

- [ ] **Step 3: Wire into Turbo and document in `.agent/architecture.md`** (new "Consumer smoke test" subsection).

- [ ] **Step 4: Commit** (pause for approval).

### Task 3: Make the release branch green

**Files:**
- Modify: `packages/ora-components/src/theme/theme-manager.ts`
- Modify or fix: `packages/ora-components/src/theme/theme-manager.test.ts` (4 failures: expects `.dark` class on `<html>`)
- Modify or fix: `packages/ora-components/src/components/text-field/text-field.ts` / `text-field.test.ts` (1 failure: `outline-2` class in inline-error mode)

- [ ] **Step 1: Decide the theme contract**

Recommended: `applyTheme()` sets **both** `data-theme="<theme>"` and toggles the `dark` class on `documentElement` (keeps Tailwind `darkMode: 'class'` consumers working and matches `index-base.css` which already targets `.dark,[data-theme=dark]`). Update `.agent/theme.md` to state both are set.

- [ ] **Step 2: Fix code, run `npx jest src/theme`** → 0 failures.

- [ ] **Step 3: Text-field inline error**

Read `text-field.test.ts:160-175` and `text-field.ts` inline-error class list. Either add `outline-2` next to `outline-error` in the wrapper class (visual intent: 2px red outline, consistent with `money-field`/`number-field`) or, if those fields do not use it either, remove the assertion. Prefer the code fix for consistency across the three fields; run `npx jest src/components/text-field src/components/money-field src/components/number-field`.

- [ ] **Step 4: Full run `npx jest`** → 0 failures. Commit (pause for approval).

### Task 4: Reconcile documentation drift and add a doc/manifest cross-check

**Measured cost:** three traps hit during the bake-off: `app-shell.md` uses `SlotSize.FULL` where `GROW` fills; `combobox.md` documents `asInlineError()` which is absent from 0.1.8 types; grid `asEditable` mutates items in place while `.agent/components/grid/custom-column.md` says items must be replaced. Plus `dialog.md` describes the toolbar in one line, which led both bake-off agents to build their own button row.

**Files:**
- Modify: `.agent/app-shell.md`, `.agent/components/combobox.md`, `.agent/components/grid/custom-column.md`, `.agent/components/grid/grid.md`, `.agent/components/dialog.md`, `.agent/components/toolbar.md`
- Create: `packages/ora-components/scripts/check-docs-vs-manifest.mjs`
- Modify: `packages/ora-components/package.json` (run the check after `generate-manifest.mjs`)

- [ ] **Step 1: Write the cross-check script**

Parse every `` `methodName(` `` backtick token in `.agent/components/**/*.md`, map each doc file to its builder(s) by an explicit table at the top of the script (e.g. `combobox.md → ComboBoxBuilder`), and fail if a documented method is missing from that builder's `methods[]` in `dist/component-manifest.json`. Print the misses.

- [ ] **Step 2: Fix the drift**

- `app-shell.md`: content slot `SlotSize.GROW`; add one sentence defining `FULL` (basis-full) vs `GROW` (flex-1 + min-h-0).
- `grid.md` + `custom-column.md`: one editing contract. State that `asEditable(onCommit)` mutates the item in place and that consumers who keep immutable stores must rebuild the array in `onCommit` (with the 5-line example from the bake-off).
- `dialog.md`: replace the one-liner with a "Actions" section and the canonical snippet:
  ```ts
  const dialog = new DialogBuilder().withCaption(of('New entry')).withContent(form);
  dialog.withToolbar().addSecondaryButton().withCaption(of('Cancel')).withClick(() => dialog.close());
  dialog.withToolbar().withPrimaryButton().withCaption(of('Save')).withClick(save);
  dialog.show();
  ```
  State explicitly: "Dialog actions belong in the toolbar; do not add a button row to the content. The toolbar stays pinned under scrolling content and follows MD3 alignment."
- `toolbar.md`: rewrite as consumer docs (what each of `withPrimaryButton`/`addSecondaryButton`/`addTextButton` returns and where it renders), keep the implementation notes under a separate "Implementation" heading.

- [ ] **Step 3: Run the check → passes. Regenerate Storybook MDX for dialog (`packages/stories/src/dialog.docs.mdx`) with the same snippet.** Commit (pause for approval).

---

## Phase 1 — Escape hatches (≈3 days)

### Task 5: `withAttribute` / `withId` / `withTestId` on every main builder

**Measured cost:** 62-line `TestIdBuilder` shim + post-build `querySelectorAll('.ora-sidebar-item')` stamping in both ora apps; toolbar buttons and the `<dialog>` element unreachable; the reason both agents bypassed `dialog.withToolbar()`.

**Files:**
- Create: `packages/ora-components/src/core/attributes.ts`
- Test: `packages/ora-components/src/core/attributes.test.ts`
- Modify (add the three methods + call `applyAttributes` in `build()`): `components/button/button.ts`, `label/label.ts`, `panel/panel.ts`, `layout/layout.ts` (host and per-slot via `SlotBuilder`), `text-field/text-field.ts`, `number-field/number-field.ts`, `money-field/money-field.ts`, `checkbox/checkbox.ts`, `combobox/combobox-builder.ts`, `date-picker/datepicker-builder.ts`, `listbox/listbox.ts`, `multi-select-list/multi-select-list.ts`, `tabs/tabs.ts`, `steps/steps.ts`, `dialog/dialog.ts`, `toolbar/toolbar-builder.ts`, `grid/grid-builder.ts`, `chart/chart-builder.ts`, `money-kpi-card/money-kpi-card-builder.ts`, `trend/trend-builder.ts`, `fx-ticker/fx-ticker-builder.ts`, `sidebar/sidebar-builder.ts` (+ item inline builder in `sidebar-builder.ts` / `sidebar-item-viewport.ts`), `chat/chat-panel-builder.ts`, `chat/chat-trigger-builder.ts`, `form/form-builder.ts`, `router/router-builder.ts`, `router/link.ts`
- Modify: `.agent/builder-pattern.md` (new "Attributes" section), every `.agent/components/*.md` (one line each), `packages/stories/src/*.docs.mdx` (Builder API tables)

**Interfaces:**
```ts
// core/attributes.ts
export type AttributeValue = string | number | boolean | null | Observable<string | number | boolean | null>;
export interface AttributeConfig { name: string; value: AttributeValue }
export function applyAttributes(el: HTMLElement, attrs: AttributeConfig[]): Subscription; // null/false removes, true → ""
// Mixin-style helper for builders (avoid inheritance; builders are plain classes):
export class AttributeBag {
    add(name: string, value: AttributeValue): void;
    apply(el: HTMLElement): Subscription;
    readonly isEmpty: boolean;
}
```
Builder surface (identical on every builder):
```ts
withAttribute(name: string, value: AttributeValue): this;
withId(id: string): this;              // sugar for withAttribute('id', id)
withTestId(id: string): this;          // sugar for withAttribute('data-testid', id)
```
Target rules (document in `builder-pattern.md`): field builders (`TextField`, `NumberField`, `MoneyField`, `DatePicker`, `ComboBox`, `Checkbox`) apply attributes to the focusable `<input>`, except `id`/`class` handling already in `field-id.ts`; `Button` → `<button>`; `Dialog` → `<dialog>`; `Grid`, `Chart`, `Panel`, `Layout`, `Label` → host element; `SideBar` item → the `<a>`/`<button>` row; `Router` → outlet.

- [ ] **Step 1: Write failing tests for `applyAttributes`** (static value set, observable updates, `null` removes, `true` → empty string, subscription unsubscribes on `registerDestroy`).

- [ ] **Step 2: Implement `core/attributes.ts`; export from `src/index.ts`.**

- [ ] **Step 3: Add to builders in this order, each with a 2-line test in the existing `*.test.ts`** (`build()` then `expect(el.getAttribute('data-testid')).toBe('x')` / for fields `expect(el.querySelector('input')?.dataset.testid)`): Button, Label, Panel, Layout + slot, TextField, MoneyField, NumberField, Checkbox, ComboBox, DatePicker, Dialog, Toolbar (only via the returned `ButtonBuilder`s — no toolbar-level attr needed), Grid, Chart, SideBar item, Router outlet, then the rest.

- [ ] **Step 4: Dialog toolbar reachability test** (`dialog.test.ts`): `dialog.withToolbar().withPrimaryButton().withTestId('save')`; `show()`; `document.querySelector('dialog [data-testid=save]')` exists and is a `<button>` inside the toolbar container, below the content container.

- [ ] **Step 5: `RouterBuilder.withClass(Observable<string>)`** (merged with `cn('w-full','h-full')` in `build()`), test in `router-builder.test.ts`.

- [ ] **Step 6: Docs + manifest.** `builder-pattern.md` "Attributes" section replaces the "no attribute API" anti-pattern workaround; delete the `TestIdBuilder`-style example if any doc suggests it. `npm run build` → manifest lists the new methods. Run the Task 4 doc cross-check.

- [ ] **Step 7: Rebuild the smoke app (Task 2) with `withTestId` on nav items, dialog buttons and grid → assertions pass.** Commit (pause for approval).

### Task 6: Money formatting gaps

**Measured cost:** `MoneyFieldBuilder` never inserts thousands separators (`utils/number.ts formatNumber` defaults `useGrouping:false` and `money-field-logic.ts syncInputValue` does not pass it); the spec item "1,234.56 on blur" needed a hand-written blur formatter. Grid money column always prints the currency symbol; `MoneyKPICardBuilder` value node is not addressable (solved by Task 5) and grouping/precision defaults differ from the field.

**Files:**
- Modify: `packages/ora-components/src/components/money-field/money-field.ts`, `money-field-logic.ts`, `money-field.test.ts`
- Modify: `packages/ora-components/src/components/grid/columns/money-column.ts` (+ test)
- Modify: `packages/ora-components/src/utils/number.ts` (no behaviour change; document `useGrouping`)
- Modify: `.agent/components/money-field.md`, `.agent/components/grid/money-column.md`, `.agent/components/money-kpi-card.md`

**Interfaces:**
```ts
MoneyFieldBuilder.withGrouping(grouping: boolean | Observable<boolean>): this; // default true
MoneyColumn.withCurrencyDisplay(display: 'symbol' | 'code' | 'none'): this;   // default 'symbol' (unchanged)
```

- [ ] **Step 1: Failing test** in `money-field.test.ts`: value `1234567.891`, precision 2, blur → input value `1,234,567.89`; with `withGrouping(false)` → `1234567.89`; locale `de-DE` → `1.234.567,89`; typing `1,250` then blur → `value$` emits `{amount:1250}`.

- [ ] **Step 2: Implement**: thread `grouping$` into `MoneyFieldLogic` state; pass `useGrouping` to `formatNumber` in `syncInputValue`; ensure `normalizeNumberString` already strips the locale grouping char (it does) so parse stays symmetric.

- [ ] **Step 3: Money column** `withCurrencyDisplay('none')` renders `1,234.56` right-aligned; test in `columns/money-column.test.ts`. Align `MoneyKPICardBuilder` docs with `withPrecision`/`withLocale`/`withCurrencyDisplay` (already exist) and add `withTestId` example.

- [ ] **Step 4: Docs, changelog, commit** (pause for approval).

---

## Phase 2 — Chart correctness (≈2 days)

### Task 7: Grouped and stacked bars, formatted ticks, sparkline mode

**Measured cost:** R1 maintenance task was blocked: `series-renderer.ts renderBars` draws every bar series at `xScale(i) - barWidth/2` with the single `scales.barWidth`; `BarChartBuilder.asStacked()` and `withBarWidth()` are stored in config but never read for placement (only `chart-logic.ts` y-domain uses `isStacked`). Workaround was a 72-line `MutationObserver` re-positioning rects. Y-axis ticks rendered `611944` because `withFormat` exists on `AxisBuilder` but has no grouping default.

**Files:**
- Modify: `packages/ora-components/src/components/chart/types.ts` (`ChartScales`), `chart-logic.ts`, `series-renderer.ts`, `chart-tooltip.ts` (hit-testing uses `barWidth`), `axis-renderer.ts`, `builders/axis-builder.ts`, `chart-builder.ts`
- Test: `packages/ora-components/src/components/chart/chart.test.ts` (extend), new `series-renderer.test.ts`
- Modify: `.agent/components/chart/chart.md`, `individual-charts.md`, `axis-builder.md`; `packages/stories/src/chart.stories.ts` (grouped + stacked stories)

**Interfaces:**
```ts
// types.ts
export interface ChartScales {
    …existing…
    barWidth?: number;              // group width for one category (kept for tooltip compatibility)
    barSlot?: number;               // width of one series' bar inside the group
    barSeriesIndex?: Map<number, number>; // chart index → position inside the group (non-stacked bar series only)
}
// AxisBuilder (existing withFormat(string | fn) kept) — new default: Intl.NumberFormat(locale).format for numeric ticks
// ChartBuilder
asSparkline(): this; // hides axes, legend, tooltip, padding; height default 32
```

- [ ] **Step 1: Failing renderer test** (jsdom can build the SVG): two non-stacked bar series over 3 categories → 6 `<rect>`; for each category, the two rects have disjoint `[x, x+width]` intervals; with `withBarWidth(0.5)` each rect is 50% of its slot. Two stacked bar series → the second series' `y + height` equals the first series' `y` for positive values.

- [ ] **Step 2: `chart-logic.ts`**: count bar series per axis; `groupedCount = nonStackedBars.length || 1`; `barSlot = barWidth / groupedCount`; fill `barSeriesIndex`. Keep `barWidth` semantics as group width so `chart-tooltip.ts` hit testing still works.

- [ ] **Step 3: `series-renderer.ts renderBars`**: `x = xScale(i) - barWidth/2 + slotIndex*barSlot + barSlot*(1-ratio)/2`, `width = barSlot*ratio` where `ratio = config.barWidth ?? 0.8`. For `config.isStacked`, keep a per-category running baseline (positive and negative stacks separately) across stacked series; render from that baseline. Preserve the animation branch and `filter="url(#shadow-i)"`.

- [ ] **Step 4: Ticks**: in `axis-renderer.ts`, when no `withFormat` is set and the value is numeric, format with `Intl.NumberFormat(undefined, {maximumFractionDigits: 2})`. Test: domain `[0, 611944]` renders a tick containing `,`.

- [ ] **Step 5: `asSparkline()`**: sets axes invisible, legend/tooltip off, padding 0, default height 32; test that no `<text>` nodes are rendered. Story `Chart/Sparkline`.

- [ ] **Step 6: Docs (`individual-charts.md` must now describe grouped/stacked behaviour accurately), changelog, commit** (pause for approval).

---

## Phase 3 — Theming and styling hooks (≈3 days)

### Task 8: Theme override API and component tokens

**Measured cost:** R3 rebrand had no API: palette is baked into `index-base.css` as `--md-sys-color-*` blocks; overriding works only because of `@layer`, and is undocumented. Grid header background is a hard-coded Tailwind class (`GridStyles.headerWrapper` `bg-[color-mix(…)]`), so tinting it required substring-matching a generated class name. Every consumer copies ~40 lines of Tailwind config from the landing page.

**Files:**
- Create: `packages/ora-components/src/theme/define-theme.ts` (+ test), `packages/ora-components/tailwind-preset.cjs` (published; add to `package.json` `exports` and `files`)
- Modify: `packages/ora-components/src/theme/types.ts`, `theme/index.ts`, `src/index.ts`
- Modify: `packages/ora-components/src/components/grid/grid-styles.ts`, `src/index-base.css` (component tokens with defaults), `grid/grid-builder.ts` (`withHeaderClass`, `withRowClass`)
- Modify: `.agent/theme.md` (new "Overriding the palette" + "Component tokens" + "Tailwind preset" sections), `packages/ora-landing-page/tailwind.config.mjs` (consume the preset), `packages/stories` config likewise

**Interfaces:**
```ts
export interface ThemePalette { primary?: string; onPrimary?: string; primaryContainer?: string; …every --md-sys-color-* key in camelCase… }
export interface ThemeDefinition { light?: ThemePalette; dark?: ThemePalette; fontFamily?: string }
export function defineTheme(def: ThemeDefinition, scope: HTMLElement | Document = document): () => void; // writes CSS vars, returns disposer
// GridBuilder
withHeaderClass(className: Observable<string>): this;
withRowClass(className: Observable<string> | ((item: ITEM, index: number) => string)): this;
```
Component tokens (defaults = current values), all declared in `index-base.css` `:root`:
`--ora-grid-header-bg`, `--ora-grid-row-hover-bg`, `--ora-grid-border`, `--ora-sidebar-bg`, `--ora-dialog-bg`, `--ora-font-family`.

- [ ] **Step 1: Failing tests** for `defineTheme`: writes `--md-sys-color-primary` on `:root` for light and on `[data-theme=dark]` scope for dark (implement dark by injecting a `<style>` element with `[data-theme="dark"]{…}`), disposer removes it, `fontFamily` sets `--ora-font-family`.

- [ ] **Step 2: Implement `defineTheme`; export.**

- [ ] **Step 3: Tokens**: replace `GridStyles.headerWrapper` background with `bg-[var(--ora-grid-header-bg)]`, add the token to `index-base.css` with the existing `color-mix(...)` value; same for the other five tokens. `grid-styles.test.ts` asserts the class string contains the var. Ensure Tailwind safelist/JIT picks up `bg-[var(--ora-grid-header-bg)]` (it appears literally in source, so JIT does).

- [ ] **Step 4: `withHeaderClass` / `withRowClass`** in `grid-builder.ts` → `grid-header.ts` / `grid-row.ts` via `cn()`; tests.

- [ ] **Step 5: Tailwind preset** `tailwind-preset.cjs`: `darkMode: ['selector','[data-theme="dark"]']`, `corePlugins:{preflight:false}`, the `--md-sys-color-*` colour map and `rounded-*` tokens currently duplicated in `packages/ora-landing-page/tailwind.config.mjs`. Landing page and stories switch to `presets: [require('@tdq/ora-components/tailwind-preset')]` and delete the duplicated block.

- [ ] **Step 6: Docs, story `Theme/Rebrand` showing `defineTheme({light:{primary:'#0F766E'},dark:{primary:'#5EEAD4'}})`, changelog, commit** (pause for approval).

---

## Phase 4 — Accessibility (≈3 days)

### Task 9: ARIA grid semantics and axe in CI

**Measured cost:** axe/inspection on the bake-off app: ora grid exposes only `role="button"` on sortable headers (3 ARIA references in the whole grid source), no `grid/row/columnheader/gridcell`, no `aria-sort`, no `aria-rowcount`. MUI DataGrid exposes the full pattern. Combobox dropdown options were reported as unlabelled `div`s — verify first: `listbox.ts` already sets `role="listbox"`/`option`, so the gap may be in the virtualized row wrapper (`utils/virtual-rows-viewport.ts`) or in the grid enum editor.

**Files:**
- Modify: `packages/ora-components/src/components/grid/grid-viewport.ts`, `grid-row.ts`, `grid-header.ts`, `grid-builder.ts`, `grid-styles.ts`
- Test: extend `grid-viewport.test.ts`, `grid-header.test.ts`; new `grid-a11y.test.ts` using `jest-axe`
- Verify/modify: `components/listbox/listbox.ts`, `utils/virtual-rows-viewport.ts`, `components/combobox/combobox-builder.ts`, `components/grid/columns/enum-column.ts`
- Modify: `components/sidebar/sidebar-viewport.ts` (`<nav aria-label>`), `.agent/app-shell.md` (skip-link guidance)
- Modify: `packages/stories/.storybook/` (enable `@storybook/addon-a11y` if not already), `.agent/components/grid/grid.md`

- [ ] **Step 1: Failing jest-axe test**: build a grid with 3 columns / 50 items, mount, `await axe(container)` → `toHaveNoViolations()`; plus explicit assertions: host `role="grid"`, `aria-rowcount="50"`, header container `role="row"` with `role="columnheader"` cells, sortable header `aria-sort` toggles `ascending`/`descending`/`none` on click, each rendered row `role="row"` + `aria-rowindex`, cells `role="gridcell"`.

- [ ] **Step 2: Implement** in viewport/header/row. Keep the `role="button"` on sortable header *content* only if needed for keyboard activation; otherwise make the `columnheader` itself focusable (`tabindex="0"`, Enter/Space sorts) — the note at `grid-header.ts:127` explains the earlier constraint; resolve it by making the header a real `row`.

- [ ] **Step 3: Combobox/enum editor**: reproduce with a test that opens the dropdown and asserts every visible option has `role="option"` and `aria-selected`; fix wherever the role is lost.

- [ ] **Step 4: Sidebar** renders `<nav aria-label={caption}>`; docs.

- [ ] **Step 5: Storybook a11y addon on; CI runs `npx jest` including the axe tests.** Commit (pause for approval).

---

## Phase 5 — Developer knowledge (≈2 days + ongoing)

### Task 10: Ship `QUICKSTART.md` and expose it through the MCP server

**Measured cost:** a first-time build cost 239k tokens; with a one-page cheat sheet (≈1.9k tokens) it cost 97k, equal to MUI. The cheat sheet used in the experiment is in the session scratchpad (`ORA-CHEATSHEET.md`); it contained two errors that must not ship: `TextFieldBuilder.asOutlined()` does not exist, and it told the reader to bypass the dialog toolbar.

**Files:**
- Create: `packages/ora-components/QUICKSTART.md` (add to `files` in `package.json`; link from `README.md`)
- Modify: `packages/ora-mcp-server/src/index.ts`, create `packages/ora-mcp-server/src/tools/get-quickstart.ts`, update `packages/ora-mcp-server/README.md` and `.agent/mcp-server/tools.md`
- Modify: `packages/ora-components/scripts/generate-manifest.mjs` (behaviour notes)
- Modify: `.agent/components/*.md` (add a `## Gotchas` section where relevant)

- [ ] **Step 1: Write `QUICKSTART.md`** (target ≤ 2 500 tokens): install + CSS import + Tailwind preset (Task 8); builder grammar; Layout `GROW` vs `FULL`; app shell (Router + SideBar) snippet; Grid with typed columns and sizing rule; Form fields incl. MoneyField grouping; **Dialog with `withToolbar()` actions**; Chart incl. grouped bars and `asSparkline()`; `withTestId`; theme override; teardown rules. Every snippet must compile against `dist/*.d.ts` — add `scripts/check-quickstart.mjs` that extracts ` ```ts ` blocks into a temp file and runs `tsc --noEmit` against the built types.

- [ ] **Step 2: MCP tool `get_quickstart`** returns the file; add to `list_components` response a hint `"Start with get_quickstart"`.

- [ ] **Step 3: Behaviour notes in the manifest**: `generate-manifest.mjs` reads the `## Gotchas` section of the matching `.agent/components/<name>.md` and emits it as `notes: string[]` on each component; `get_component_api` returns it. Seed gotchas from the bake-off: grid sizes to parent height; `asEditable` mutates in place; dialog `show()` builds and appends itself; toolbar is the action bar; MoneyField grouping default; popover placement.

- [ ] **Step 4: Measure**: re-run the bake-off build prompt (spec in the report appendix) with only `QUICKSTART.md` + `.d.ts` available; target ≤ 110k tokens and zero post-build DOM manipulation in the produced app. Record the number in `CHANGELOG.md`.

- [ ] **Step 5: Commit** (pause for approval).

---

## Task order and dependencies

```
Task 1 (CSS)  ──┐
Task 2 (smoke) ─┼─► Task 5 (attributes) ─► Task 6 (money) ─► Task 10 (quickstart)
Task 3 (tests) ─┘                          Task 7 (chart)  ─┘
Task 4 (docs + cross-check) ─────────────► Task 8 (theme) ─┘
                                           Task 9 (a11y)
```

Tasks 1–4 are independent of each other. Task 5 must land before Task 10 so the quickstart can teach `withTestId` and toolbar actions without workarounds. Tasks 6–9 are independent of each other.

| Phase | Effort | Removes |
|---|---|---|
| 0 hygiene | 1 d | 1 of 3 layout bugs per new app, 5 failing tests, 3 doc traps, dialog-toolbar bypass (docs half) |
| 1 escape hatches | 3 d | ≈130 lines of shims per app, all post-build stamping, MoneyField gap, dialog-toolbar bypass (API half) |
| 2 chart | 2 d | R1 blocked-by-library (72-line MutationObserver workaround), unformatted ticks |
| 3 theming | 3 d | R3 brittle selector, 40 lines of Tailwind config per consumer |
| 4 accessibility | 3 d | grid/combobox semantics gap vs MUI DataGrid |
| 5 knowledge | 2 d + ongoing | ≈140k tokens per first-time build |

Total ≈ 14 working days. Success criterion: the bake-off spec built by a fresh agent from `QUICKSTART.md` + types alone costs about what the MUI build costs (≈100k tokens), contains no post-`build()` DOM manipulation, and the resulting app passes the same functional and axe checks.
