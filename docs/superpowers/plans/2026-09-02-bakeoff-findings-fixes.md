# Bake-off Findings Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the developer-experience gaps found in the 2026-09-02 ora-components vs React+MUI+Zustand bake-off, so that a first-time consumer (human or LLM) can build an accounting-style app with ora at the same cost as with MUI, without post-`build()` DOM manipulation, and with correct charts, money formatting, theming hooks and grid accessibility.

**Background:** The same "Ledger Lite" app was built twice from one spec. With the model knowing MUI and not ora, the ora build cost 239k tokens vs 99k. With a one-page ora cheat sheet the ora build cost 97k — the gap is knowledge plus missing escape hatches, not the builder API. Report: https://claude.ai/code/artifact/b05d7329-c2e8-425f-a635-6349ffdecd98. The confirmed defects and the measured cost each one caused are listed per task below.

**Architecture:** All changes are additive to the existing builder grammar (`with*` / `add*` / `as*`, configure-then-`build()`). A shared `applyTestId` helper in `core/` gives every main builder a `withTestId()` method. Chart bar placement moves from a single shared `barWidth` to a per-series slot computed in `chart-logic.ts`. All theming goes through CSS custom properties: component styling hooks become `--ora-*` tokens with the current hard-coded values as defaults, and there is no JavaScript theme API; per-instance theming uses the builders' existing `withClass` with scoped token overrides. Documentation gets a shipped `QUICKSTART.md`, consumer-facing dialog/toolbar docs, and a CI cross-check between `.agent/components/*.md` and `component-manifest.json`.

**Tech Stack:** TypeScript, RxJS 7, Tailwind 3 (`clsx` + `tailwind-merge` via `cn()`), jsdom + ts-jest (Jest), jest-axe (already a devDependency, currently unused), Vite, Storybook (`packages/stories`), MCP server (`packages/ora-mcp-server`).

## Global Constraints

- Package under test: `packages/ora-components`. Run tests from there: `cd packages/ora-components && npx jest <file>`. Full run must go from **5 failing** (`theme-manager` ×4, `text-field` ×1 on `release/0.1.8`) to 0 failing.
- Test environment is **jsdom**: `clientHeight`/`scrollTop` are `0`, `ResizeObserver`/`requestAnimationFrame`/`IntersectionObserver` are not native. Follow the mocking pattern in `src/components/grid/grid-viewport.test.ts`.
- No post-build DOM manipulation in library code paths that consumers are told to avoid (`.agent/builder-pattern.md` anti-patterns). Every new capability is a builder method applied inside `build()`.
- Builder naming rules from `.agent/builder-pattern.md`: only `with*`, `add*`, `as*`, `build`. New methods return `this`.
- **Repo commit convention:** do NOT run `git commit` without explicit user approval. The "Commit" steps below mean: `git add` the listed files and prepare the commit message, then pause for the user to approve the actual commit.
- After every task that changes a public builder: `npm run build` in `packages/ora-components` must succeed (it regenerates `dist/component-manifest.json`), and the matching `.agent/components/<name>.md` and `packages/stories/src/<name>.docs.mdx` must be updated in the same task.
- Consumer verification: `packages/examples` aliases the **source**, so it cannot catch packaging bugs. Task 2 adds a tarball-based smoke app; use it for the CSS, test-id and theming tasks (1, 5, 8).

---

## Phase 0 — Hygiene (≈1 day)

### Task 1: Remove the dev-page `body` rule from the shipped CSS

**Measured cost:** every consumer app in the bake-off (both ora builds and the landing page) had to override `body{display:flex;place-items:center;min-width:320px;min-height:100vh}`; it caused one of the three layout bugs per new app.

**Files:**
- Modify: `packages/ora-components/src/index-layered.css` (rule at ~line 163)
- Create: `packages/ora-components/scripts/check-css-globals.mjs` (build-time guard, wired into `package.json` `build`)
- Modify: `packages/ora-components/package.json`, `CHANGELOG.md`

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

**Measured cost:** three traps hit during the bake-off: `app-shell.md` uses `SlotSize.FULL` where `GROW` fills; `combobox.md` documented `asInlineError()` while it was absent from the 0.1.8 types (implemented on this branch on 2026-09-02, uncommitted, with tests, stories and the doc line updated — the cross-check below must see a rebuilt `dist/component-manifest.json` or it will flag it); grid `asEditable` mutates items in place while `.agent/components/grid/custom-column.md` says items must be replaced. Plus `dialog.md` describes the toolbar in one line, which led both bake-off agents to build their own button row.

**Files:**
- Modify: `.agent/app-shell.md`, `.agent/components/grid/custom-column.md`, `.agent/components/grid/grid.md`, `.agent/components/dialog.md`, `.agent/components/toolbar.md`
- Create: `packages/ora-components/scripts/check-docs-vs-manifest.mjs`
- Modify: `packages/ora-components/package.json` (run the check after `generate-manifest.mjs`)

- [ ] **Step 1: Write the cross-check script**

Parse every `` `methodName(` `` backtick token in `.agent/components/**/*.md`, map each doc file to its builder(s) by an explicit table at the top of the script (e.g. `combobox.md → ComboBoxBuilder`), and fail if a documented method is missing from that builder's `methods[]` in `dist/component-manifest.json`. Print the misses. Run `npm run build` first so the manifest reflects the current source (e.g. the new `ComboBoxBuilder.asInlineError`).

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

## Phase 1 — Escape hatches and value formatting (≈4 days)

### Task 5: `withTestId` on every main builder

**Measured cost:** 62-line `TestIdBuilder` shim + post-build `querySelectorAll('.ora-sidebar-item')` stamping in both ora apps; toolbar buttons and the `<dialog>` element unreachable; the reason both agents bypassed `dialog.withToolbar()`.

**Files:**
- Create: `packages/ora-components/src/core/test-id.ts`
- Test: `packages/ora-components/src/core/test-id.test.ts`
- Modify (add `withTestId` + call `applyTestId` in `build()`): `components/button/button.ts`, `label/label.ts`, `panel/panel.ts`, `layout/layout.ts` (host and per-slot via `SlotBuilder`), `text-field/text-field.ts`, `number-field/number-field.ts`, `money-field/money-field.ts`, `checkbox/checkbox.ts`, `combobox/combobox-builder.ts`, `date-picker/datepicker-builder.ts`, `listbox/listbox.ts`, `multi-select-list/multi-select-list.ts`, `tabs/tabs.ts`, `steps/steps.ts`, `dialog/dialog.ts`, `toolbar/toolbar-builder.ts`, `grid/grid-builder.ts`, `chart/chart-builder.ts`, `money-kpi-card/money-kpi-card-builder.ts`, `trend/trend-builder.ts`, `fx-ticker/fx-ticker-builder.ts`, `sidebar/sidebar-builder.ts` (+ item inline builder in `sidebar-builder.ts` / `sidebar-item-viewport.ts`), `chat/chat-panel-builder.ts`, `chat/chat-trigger-builder.ts`, `form/form-builder.ts`, `router/router-builder.ts`, `router/link.ts`
- Modify: `.agent/builder-pattern.md` (new "Test ids" section), every `.agent/components/*.md` (one line each), `packages/stories/src/*.docs.mdx` (Builder API tables)

**Interfaces:**
```ts
// core/test-id.ts
/** Sets `data-testid` on `el`; a null/empty id is a no-op. Static string only — test ids never change at runtime. */
export function applyTestId(el: HTMLElement, testId: string | undefined): void;
```
Builder surface (identical on every builder):
```ts
withTestId(id: string): this;   // rendered as data-testid on the builder's primary element
```
Target rules (document in `builder-pattern.md`): field builders (`TextField`, `NumberField`, `MoneyField`, `DatePicker`, `ComboBox`, `Checkbox`) put the id on the focusable `<input>`; `Button` → `<button>`; `Dialog` → `<dialog>`; `Grid`, `Chart`, `Panel`, `Layout`, `Label`, `MoneyKPICard`, `Trend`, `FxTicker`, `Tabs`, `Steps`, `ChatPanel`, `ChatTrigger`, `Form` → host element; `SideBar` → host element (a `<nav>` after Task 9), `SideBar` item → the `<a>`/`<button>` row; `Router` → outlet; `Link` → `<a>`. One id per builder; sub-parts that need their own id are reached through the inline builder that owns them (e.g. toolbar buttons through the `ButtonBuilder` returned by `withPrimaryButton()`).

- [ ] **Step 1: Write failing tests for `applyTestId`** (sets the attribute; `undefined`/`''` leaves the element untouched; calling `withTestId` twice keeps the last value).

- [ ] **Step 2: Implement `core/test-id.ts`; export from `src/index.ts`.**

- [ ] **Step 3: Add to builders in this order, each with a 2-line test in the existing `*.test.ts`** (`build()` then `expect(el.getAttribute('data-testid')).toBe('x')` / for fields `expect(el.querySelector('input')?.dataset.testid).toBe('x')`): Button, Label, Panel, Layout + slot, TextField, MoneyField, NumberField, Checkbox, ComboBox, DatePicker, Dialog, Toolbar (only via the returned `ButtonBuilder`s — no toolbar-level id needed), Grid, Chart, SideBar + item, Router outlet, then the rest.

- [ ] **Step 4: Dialog toolbar reachability test** (`dialog.test.ts`): `dialog.withToolbar().withPrimaryButton().withTestId('save')`; `show()`; `document.querySelector('dialog [data-testid=save]')` exists and is a `<button>` inside the toolbar container, below the content container.

- [ ] **Step 5: `RouterBuilder.withClass(Observable<string>)`** (merged with `cn('w-full','h-full')` in `build()`), test in `router-builder.test.ts`.

- [ ] **Step 6: Docs + manifest.** `builder-pattern.md` "Test ids" section replaces the "no attribute API" workaround. Delete the `TestIdBuilder`-style example if any doc suggests it. `npm run build` → manifest lists the new method on every builder. Run the Task 4 doc cross-check.

- [ ] **Step 7: Rebuild the smoke app (Task 2) with `withTestId` on nav items, dialog buttons and grid → assertions pass.** Commit (pause for approval).

### Task 6: Money and chart value formatting gaps

**Measured cost (chart):** `AxisBuilder.withFormat(format)` accepts `string | ((value) => string)` and the axis guide documents string presets (`'currency'`, `'percentage'`), but `axis-renderer.ts:142` applies only the function form and falls back to `val.toFixed(0)` for everything else, so a string format is silently ignored and ticks render as `611944`. `chart-tooltip.ts` never formats values at all, so a money chart shows raw floats on hover. Both bake-off dashboards rendered unformatted axes for this reason.

**Measured cost (money):** `MoneyFieldBuilder` never inserts thousands separators (`utils/number.ts formatNumber` defaults `useGrouping:false` and `money-field-logic.ts syncInputValue` does not pass it); the spec item "1,234.56 on blur" needed a hand-written blur formatter. `MoneyKPICardBuilder` value node is not addressable (solved by Task 5).

**Files:**
- Modify: `packages/ora-components/src/components/money-field/money-field.ts`, `money-field-logic.ts`, `money-field.test.ts`
- Modify: `packages/ora-components/src/utils/number.ts` (document `useGrouping`; add `resolveValueFormat`) + `number.test.ts`
- Modify: `packages/ora-components/src/components/chart/types.ts` (`ValueFormat` type), `builders/axis-builder.ts`, `builders/chart-type-builders.ts` (series-level `withFormat`), `axis-renderer.ts`, `chart-tooltip.ts`, `chart-logic.ts` (format resolution lives in the scales/state, not in renderers) + `chart.test.ts`
- Modify: `.agent/components/money-field.md`, `.agent/components/money-kpi-card.md`, `.agent/components/chart/axis-builder.md`, `.agent/components/chart/chart.md`, `packages/stories/src/chart.stories.ts` (a `FormattedAxes` story: money left axis, percentage right axis, tooltip)

**Interfaces:**
```ts
// MoneyFieldBuilder: no new API — the display value is always grouped (Intl useGrouping: true), matching MoneyColumn and MoneyKPICard.

// chart/types.ts — one format vocabulary shared by axis ticks and tooltip values
export type ValueFormatPreset =
    | 'number'                     // grouped, decimals as in the value (no rounding; the default when withFormat is not called)
    | 'money'                      // grouped, exactly 2 decimals
    | 'integer'                    // grouped, 0 decimals
    | 'compact'                    // 1.2K / 3.4M (Intl notation: 'compact')
    | 'percentage'                 // value is a fraction: 0.153 → 15.3%
    | 'currency'                   // Intl currency; currency id from ChartBuilder.withCurrency() (default 'EUR')
    | `currency:${string}`;        // 'currency:USD'
export type ValueFormat = ValueFormatPreset | ((value: number) => string);

// utils/number.ts
export function resolveValueFormat(format: ValueFormat | undefined, locale?: string): (value: number) => string;
// - function → returned as-is
// - preset → Intl.NumberFormat with useGrouping:true; unknown string → console.warn once, fall back to 'number'

// AxisBuilder (signature unchanged, behaviour fixed): withFormat(format: ValueFormat): this — applies to tick labels AND to
// tooltip values of every series bound to this axis (primary or secondary).
// Series builders (Line/Bar/Area): withFormat(format: ValueFormat): this — per-series tooltip override; wins over the axis format.
// ChartBuilder: withLocale(locale: string | Observable<string>): this — locale for all presets (default: navigator.language).
// ChartBuilder: withCurrency(currencyId: string): this — currency used by the bare 'currency' preset (default 'EUR').
```

- [ ] **Step 1: Failing test** in `money-field.test.ts`: value `1234567.891`, precision 2, blur → input value `1,234,567.89`; locale `de-DE` → `1.234.567,89`; typing `1,250` then blur → `value$` emits `{amount:1250}`; typing `1250` then blur → input shows `1,250.00`.

- [ ] **Step 2: Implement**: pass `useGrouping: true` to `formatNumber` in `money-field-logic.ts syncInputValue` (no builder option; grouping is always on); `normalizeNumberString` already strips the locale grouping char, so parsing stays symmetric. Check the existing money-field tests for assertions that expected ungrouped output and update them.

- [ ] **Step 3: KPI card docs**: align `MoneyKPICardBuilder` docs with `withPrecision`/`withLocale`/`withCurrencyDisplay` (already exist) and add a `withTestId` example.

- [ ] **Step 4: Failing tests for `resolveValueFormat`** in `utils/number.test.ts`: `'number'` → `611,944.4` for `611944.4` and `1,234.567` for `1234.567` (grouping only, no rounding); `'money'` → `611,944.40` and `1,234.57`; `'integer'` → `611,944`; `'compact'` → `612K`; `'percentage'` → `15.3%` for `0.153`; `'currency:EUR'` → `€611,944.40`; function passthrough; unknown string warns once and formats as `'number'`; `locale: 'de-DE'` → `611.944,4` for `'number'`, `611.944,40` for `'money'` and currency.

- [ ] **Step 5: Failing chart tests** in `chart.test.ts` (jsdom builds the SVG):
  - no `withFormat` → y tick text contains a grouping separator (`600,000`, not `600000`), the current `toFixed(0)` path is gone;
  - `chart.withYAxis().withFormat('currency:EUR')` → every y tick text starts with `€` and is grouped;
  - `chart.withSecondaryYAxis().withFormat('percentage')` → secondary ticks end with `%` while primary ticks do not;
  - `withFormat(v => v + ' units')` → ticks use the function;
  - tooltip: hover (dispatch `mousemove` at a data x) on a chart with a currency y axis → the tooltip value cell reads `€1,234.50`, and a series with its own `withFormat('integer')` overrides the axis format in the tooltip only (ticks unchanged);
  - category (x) axis is untouched by `withFormat` (dates/labels pass through).

- [ ] **Step 6: Implement chart formatting**: `chart-logic.ts` resolves `primaryFormat`/`secondaryFormat`/per-series `format` once per state change with `resolveValueFormat(…, locale)` and exposes them on `ChartScales` (so renderers never parse format strings); `axis-renderer.ts` replaces `typeof config.format === 'function' ? … : val.toFixed(0)` with `scales.formatPrimary(val)` / `scales.formatSecondary(val)`; `chart-tooltip.ts` formats each series value with `series.format ?? (series.useSecondaryAxis ? formatSecondary : formatPrimary)`; `ChartBuilder.withLocale` feeds the resolver. Keep `withFormat`'s existing string-typed signature so no consumer breaks; `'currency'` without an id uses the chart's `withCurrency(id)` if set, else `'EUR'`, and warns once.

- [ ] **Step 7: Money ↔ chart consistency check**: one test that formats the same amount through the grid `MoneyColumn`, `MoneyFieldBuilder` and a chart y axis (`'currency:EUR'`) and asserts identical digit/separator output for the same locale — the three paths must share `formatNumber` / `Intl.NumberFormat` options, not three hand-rolled formatters.

- [ ] **Step 8: Docs, story, changelog, commit** (pause for approval). `axis-builder.md` lists the presets and states that `withFormat` also drives the tooltip; `chart.md` documents `withLocale`, `withCurrency`, and series `withFormat`; `money-field.md` states that the display value is always grouped. Changelog: Fixed — "AxisBuilder.withFormat string presets were ignored (ticks always `toFixed(0)`); tooltip values are now formatted".

---

## Phase 2 — Chart correctness (≈2 days)

### Task 7: Grouped and stacked bars, sparkline mode

**Measured cost:** R1 maintenance task was blocked: `series-renderer.ts renderBars` draws every bar series at `xScale(i) - barWidth/2` with the single `scales.barWidth`; `BarChartBuilder.asStacked()` and `withBarWidth()` are stored in config but never read for placement (only `chart-logic.ts` y-domain uses `isStacked`). Workaround was a 72-line `MutationObserver` re-positioning rects.

**Files:**
- Modify: `packages/ora-components/src/components/chart/types.ts` (`ChartScales`), `chart-logic.ts`, `series-renderer.ts`, `chart-tooltip.ts` (hit-testing uses `barWidth`), `chart-builder.ts` (`asSparkline`)
- Test: `packages/ora-components/src/components/chart/chart.test.ts` (extend), new `series-renderer.test.ts`
- Modify: `.agent/components/chart/chart.md`, `individual-charts.md`; `packages/stories/src/chart.stories.ts` (grouped + stacked + sparkline stories)

**Depends on:** Task 6 (tick and tooltip formatting, including the grouped default) — rebase on it so the grouped/stacked stories render formatted axes.

**Interfaces:**
```ts
// types.ts
export interface ChartScales {
    …existing…
    barWidth?: number;              // group width for one category (kept for tooltip compatibility)
    barSlot?: number;               // width of one series' bar inside the group
    barSeriesIndex?: Map<number, number>; // chart index → position inside the group (non-stacked bar series only)
}
// ChartBuilder
asSparkline(): this; // hides axes, legend, tooltip, padding; height default 32
```

- [ ] **Step 1: Failing renderer test** (jsdom can build the SVG): two non-stacked bar series over 3 categories → 6 `<rect>`; for each category, the two rects have disjoint `[x, x+width]` intervals; with `withBarWidth(0.5)` each rect is 50% of its slot. Two stacked bar series → the second series' `y + height` equals the first series' `y` for positive values.

- [ ] **Step 2: `chart-logic.ts`**: count bar series per axis; `groupedCount = nonStackedBars.length || 1`; `barSlot = barWidth / groupedCount`; fill `barSeriesIndex`. Keep `barWidth` semantics as group width so `chart-tooltip.ts` hit testing still works.

- [ ] **Step 3: `series-renderer.ts renderBars`**: `x = xScale(i) - barWidth/2 + slotIndex*barSlot + barSlot*(1-ratio)/2`, `width = barSlot*ratio` where `ratio = config.barWidth ?? 0.8`. For `config.isStacked`, keep a per-category running baseline (positive and negative stacks separately) across stacked series; render from that baseline. Preserve the animation branch and `filter="url(#shadow-i)"`.

- [ ] **Step 4: `asSparkline()`**: sets axes invisible, legend/tooltip off, padding 0, default height 32; test that no `<text>` nodes are rendered. Story `Chart/Sparkline`.

- [ ] **Step 5: Docs (`individual-charts.md` must now describe grouped/stacked behaviour accurately), changelog, commit** (pause for approval).

---

## Phase 3 — Theming and styling hooks (≈3 days)

### Task 8: Theming through CSS variables only

**Measured cost:** R3 rebrand had no documented path: the palette is baked into `index-base.css` as `--md-sys-color-*` blocks; overriding them from app CSS works only because the library is wrapped in `@layer ora-components`, and nothing says so. Grid header background is a hard-coded Tailwind class (`GridStyles.headerWrapper` `bg-[color-mix(…)]`), so tinting it required substring-matching a generated class name. Every consumer copies ~40 lines of Tailwind config from the landing page.

**Principle:** all theming goes through CSS custom properties, at two levels:
- **Global** — a consumer rebrands by redeclaring `--md-sys-color-*` and `--ora-*` variables in their own stylesheet (unlayered app CSS always wins over `@layer ora-components`), on `:root` / `[data-theme="dark"]`.
- **Per component instance** — every main builder exposes `withClass(Observable<string>)`; the consumer passes a class of their own and scopes token overrides to it (`.ledger-grid { --ora-grid-header-bg: … }` + `grid.withClass(of('ledger-grid'))`), or uses Tailwind utilities from the preset. Because internal parts (grid header, sidebar rail, dialog surface) read their colours from `--ora-*` tokens, a token set on the host element themes the parts without any part-level class hook.

There is no JavaScript theme API and no new per-part class hooks; `withClass` + tokens is the whole surface. `ThemeManager` keeps its single job of stamping `data-theme`.

**Files:**
- Modify: `packages/ora-components/src/index-base.css` (component tokens with the current values as defaults, for light and dark)
- Modify: every component style file that hard-codes a colour, radius, font or shadow instead of a token — start with `components/grid/grid-styles.ts`, then `sidebar/*`, `dialog/*`, `chart/styles.ts`, `chart/constants.ts` (series palette), `toolbar/styles.ts`, `component-parts/popover.ts`, `combobox/styles.ts`; use `grep -rn "#[0-9a-fA-F]\{3,6\}\|rgba\?(\|color-mix\|font-family" src/components src/index-*.css` to find the rest
- Modify (add `withClass` where missing, applied on the host element via `cn()` like `ButtonBuilder`): `components/grid/grid-builder.ts`, `components/chart/chart-builder.ts`, `components/sidebar/sidebar-builder.ts`, `components/chat/chat-panel-builder.ts`, `components/chat/chat-trigger-builder.ts`, `router/router-builder.ts` (already planned in Task 5 Step 5 — do it there, reference here), `router/link.ts`
- Create: `packages/ora-components/tailwind-preset.cjs` (published; add to `package.json` `exports` and `files`)
- Create: `packages/ora-components/scripts/check-theme-tokens.mjs` (build-time guard, see Step 5)
- Modify: `.agent/theme.md` (rewrite as the token reference: every variable, its default in light and dark, what it affects, and the override recipe), `packages/stories/src/theme.docs.mdx` + a `Theme/Rebrand` story, `packages/ora-landing-page/tailwind.config.mjs` and `packages/stories` Tailwind config (consume the preset)

**Depends on:** Task 2 (smoke app, used by Step 7) and Task 5 Step 5 (`RouterBuilder.withClass`).

**Interfaces (CSS, not TypeScript):**
```css
/* index-base.css — palette (existing) */
:root, [data-theme="light"] { --md-sys-color-primary: …; /* every md-sys-color token, unchanged names */ }
.dark, [data-theme="dark"]  { --md-sys-color-primary: …; }

/* index-base.css — component tokens (new), defaults = today's hard-coded values */
:root {
  --ora-font-family: Inter, system-ui, -apple-system, sans-serif;
  --ora-radius-small: …; --ora-radius-medium: …; --ora-radius-large: …; --ora-radius-extra-large: …;
  --ora-grid-header-bg: color-mix(in srgb, var(--md-sys-color-surface-container-low) 30%, transparent);
  --ora-grid-header-fg: var(--md-sys-color-on-surface-variant);
  --ora-grid-row-hover-bg: …; --ora-grid-row-selected-bg: …; --ora-grid-border: …;
  --ora-sidebar-bg: …; --ora-sidebar-item-active-bg: …; --ora-sidebar-width: …;   /* --ora-sidebar-width / --ora-chat-width already exist */
  --ora-dialog-bg: …; --ora-popover-bg: …; --ora-popover-shadow: …;
  --ora-chart-series-1: …; … --ora-chart-series-8: …;   /* default series palette; per-series withColor() still overrides */
  --ora-chart-grid-line: …; --ora-chart-axis-fg: …;
}
[data-theme="dark"] { /* dark values for the same component tokens where they differ */ }
```
Consumer recipe (the whole theming API):
```css
/* app.css — unlayered, so it outranks @layer ora-components */
:root { --md-sys-color-primary: #0F766E; --ora-font-family: "IBM Plex Sans", system-ui, sans-serif; --ora-grid-header-bg: color-mix(in srgb, var(--md-sys-color-primary) 8%, transparent); }
[data-theme="dark"] { --md-sys-color-primary: #5EEAD4; }
```
```ts
// per-instance override — the only per-component hook is withClass()
const grid = new GridBuilder<Row>().withItems(rows$).withClass(of('ledger-grid'));
```
```css
.ledger-grid { --ora-grid-header-bg: color-mix(in srgb, var(--md-sys-color-tertiary) 12%, transparent); --ora-grid-row-hover-bg: …; }
```
```js
// tailwind.config.mjs (consumer)
export default { presets: [require('@tdq/ora-components/tailwind-preset')], content: ['./src/**/*.ts'] };
```

- [ ] **Step 1: Failing token tests** in `grid-styles.test.ts`, `sidebar` tests, `chart.test.ts`: the rendered class/attribute strings reference `var(--ora-grid-header-bg)`, `var(--ora-sidebar-bg)`, `var(--ora-chart-series-1)` etc. and contain no literal hex/rgba colour; plus one jsdom test that sets `document.documentElement.style.setProperty('--ora-grid-header-bg', 'rgb(1, 2, 3)')` before `build()` and asserts `getComputedStyle(header).backgroundColor` (jsdom resolves `var()` on inline styles only — so for this assertion the header must set the background via an inline `style` referencing the var, or the test reads the class string; pick one and note it in the test).

- [ ] **Step 2: `withClass` on every main builder**: add to Grid, Chart, SideBar, ChatPanel, ChatTrigger, Link (Router is in Task 5); merged into the host element's class list via `cn()` exactly like `ButtonBuilder.withClass`; 2-line test per builder; `.agent/components/*.md` + Storybook API tables updated. Add a test on Grid that a token set through a `withClass` class themes the header: build the grid with `withClass(of('t'))`, inject `<style>.t{--ora-grid-header-bg:rgb(1,2,3)}</style>`, and assert the header reads the var (see Step 1 note on jsdom and `var()`).

- [ ] **Step 3: Tokens in `index-base.css`**: add every `--ora-*` token above with the current value as default, light and dark. Names follow `--ora-<component>-<part>-<property>`.

- [ ] **Step 4: Replace hard-coded values in component styles** with `var(--ora-…)` (Tailwind arbitrary values `bg-[var(--ora-grid-header-bg)]`, `font-[family-name:var(--ora-font-family)]`, `rounded-[var(--ora-radius-large)]`; where a value is set from TypeScript, e.g. chart series fills in `series-renderer.ts`, use the var string directly in the attribute). Chart series default palette resolves to `var(--ora-chart-series-n)` so SVG picks up the theme; `withColor()` on a series still wins.

- [ ] **Step 5: Build-time guard** `scripts/check-theme-tokens.mjs`: fails the build if any file under `src/components` or the built `dist/ora-components.css` (outside `index-base.css`'s token blocks) contains a literal hex/rgb/hsl colour or a `font-family:` with a literal face. Wire into `package.json` `build` after `build:css`. Allow-list only via an explicit comment `/* ora-token-exempt: reason */`.

- [ ] **Step 6: Tailwind preset** `tailwind-preset.cjs`: `darkMode: ['selector','[data-theme="dark"]']`, `corePlugins:{preflight:false}`, the colour map (`primary: 'var(--md-sys-color-primary)'`, …), `fontFamily.sans: 'var(--ora-font-family)'`, `borderRadius` mapped to `--ora-radius-*` — i.e. the block currently duplicated in `packages/ora-landing-page/tailwind.config.mjs`. Landing page and stories switch to `presets: [require('@tdq/ora-components/tailwind-preset')]` and delete the duplicated block.

- [ ] **Step 7: Landing-page and smoke-app rebrand check**: apply the consumer recipe above to the smoke app (Task 2) — global override on `:root`/`[data-theme=dark]` plus one grid themed differently through `withClass` — and assert in Playwright that the computed primary colour, body font and both grid header backgrounds are as expected in light and dark, with no library file touched.

- [ ] **Step 8: Docs, story, changelog, commit** (pause for approval). `.agent/theme.md` becomes the token reference and states the rule: no JS theme API; global theming is CSS variables, per-instance theming is `withClass` + scoped variables. `Theme/Rebrand` story injects the consumer recipe as a `<style>` element. Changelog: Added — component tokens + Tailwind preset; Changed — hard-coded component colours replaced by tokens (visual output identical by default).

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

- [ ] **Step 1: Write `QUICKSTART.md`** (target ≤ 2 500 tokens): install + CSS import + Tailwind preset (Task 8); builder grammar; Layout `GROW` vs `FULL`; app shell (Router + SideBar) snippet; Grid with typed columns and sizing rule; Form fields incl. MoneyField grouping; **Dialog with `withToolbar()` actions**; Chart incl. grouped bars and `asSparkline()`; `withTestId`; theming via CSS variables (the consumer recipe from Task 8); teardown rules. Every snippet must compile against `dist/*.d.ts` — add `scripts/check-quickstart.mjs` that extracts ` ```ts ` blocks into a temp file and runs `tsc --noEmit` against the built types.

- [ ] **Step 2: MCP tool `get_quickstart`** returns the file; add to `list_components` response a hint `"Start with get_quickstart"`.

- [ ] **Step 3: Behaviour notes in the manifest**: `generate-manifest.mjs` reads the `## Gotchas` section of the matching `.agent/components/<name>.md` and emits it as `notes: string[]` on each component; `get_component_api` returns it. Seed gotchas from the bake-off: grid sizes to parent height; `asEditable` mutates in place; dialog `show()` builds and appends itself; toolbar is the action bar; MoneyField always groups thousands; popover placement.

- [ ] **Step 4: Measure**: re-run the bake-off build prompt (spec in the report appendix) with only `QUICKSTART.md` + `.d.ts` available; target ≤ 110k tokens and zero post-build DOM manipulation in the produced app. Record the number in `CHANGELOG.md`.

- [ ] **Step 5: Commit** (pause for approval).

---

## Task order and dependencies

```
Task 1 (CSS)  ──┐
Task 2 (smoke) ─┼─► Task 5 (test ids) ─► Task 6 (money + value formats) ─► Task 7 (grouped bars) ─► Task 10 (quickstart)
Task 3 (tests) ─┘
Task 4 (docs + cross-check) ─────────────► Task 8 (theme, also needs Task 2 + Task 5) ─┘
                                           Task 9 (a11y)
```

Tasks 1–4 are independent of each other. Task 8 needs the smoke app from Task 2 and `RouterBuilder.withClass` from Task 5. Task 5 must land before Task 10 so the quickstart can teach `withTestId` and toolbar actions without workarounds. Task 7 builds on Task 6 (its grouped/stacked stories must render formatted axes). Tasks 6, 8 and 9 are independent of each other.

| Phase | Effort | Removes |
|---|---|---|
| 0 hygiene | 1 d | 1 of 3 layout bugs per new app, 5 failing tests, 3 doc traps, dialog-toolbar bypass (docs half) |
| 1 escape hatches + formatting | 4 d | ≈130 lines of shims per app, all post-build stamping, MoneyField grouping, ignored chart `withFormat` + raw tooltip values, dialog-toolbar bypass (API half) |
| 2 chart | 2 d | R1 blocked-by-library (72-line MutationObserver workaround) |
| 3 theming | 3 d | R3 brittle selector, undocumented palette override, 40 lines of Tailwind config per consumer |
| 4 accessibility | 3 d | grid/combobox semantics gap vs MUI DataGrid |
| 5 knowledge | 2 d + ongoing | ≈140k tokens per first-time build |

Total ≈ 15 working days. Success criterion: the bake-off spec built by a fresh agent from `QUICKSTART.md` + types alone costs about what the MUI build costs (≈100k tokens), contains no post-`build()` DOM manipulation, and the resulting app passes the same functional and axe checks.
