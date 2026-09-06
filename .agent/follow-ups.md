# Follow-ups

Known gaps recorded during the 2026-09-02 bake-off findings work (see
`docs/superpowers/plans/2026-09-02-bakeoff-findings-fixes.md`). Each was deliberately left out
of that plan's scope. None is a regression from it.

## Library correctness

- **`registerDestroy` boundary eviction.** `src/core/destroyable-element.ts` re-inserts its
  `<ora-lifecycle-boundary>` only when the host `isConnected`; a host cleared before it is
  appended to the document loses the boundary permanently and leaks its subscriptions.
  `TrendBuilder` is the known instance. Fix in the core helper rather than per builder — the
  same clear-inside-a-subscription shape appears elsewhere (`grep -rn "innerHTML = ''" src/components`).
  The placement contract documented in that file (boundary is never the last child;
  `firstElementChild` is not preserved on an empty host) must survive the fix. Rule documented
  in [reactive.md](reactive.md#legacy-teardown-registerdestroy-from-srccoredestroyable-elementts).
- **Lazy `themeManager` singleton.** `src/theme/theme-manager.ts` exports an eagerly constructed
  singleton, so importing the theme API stamps `data-theme` *and* the `dark` class on `<html>` at
  module evaluation. Accepted deliberately (see [theme.md](theme.md#thememanager-contract)), but a
  lazy singleton would stop ora from flipping a host-managed `dark` class on import. Changing it
  is a public-behaviour change to the exported const, not just a moved write.
- **`custom-column.ts` focusable selector vs `core/focus-trap.ts`.** Two independent definitions
  of "focusable"; the trap's version does the hidden-ancestor walk, the column's does not.
- **Landing header scroll listener leak** (`packages/ora-landing-page`) — listener is added but
  never removed.

## Duplication to consolidate

- **Local `cn()` copies** in `listbox`, `multi-select-list`, `layout`, `chart-viewport`, `tabs`,
  `trend-builder`, `label`, `checkbox`, `combobox/styles` — each builds its own `twMerge`, so none
  of them knows the library's custom Tailwind scales. Migrate to `src/utils/cn.ts`; this is a
  project-wide rule already ([rules.md](rules.md#project-wide-conventions)).
- **Class-diff helper** duplicated across `sidebar`, `chat-trigger`, `fx-ticker`, `chat-panel`.
- **`prefersReducedMotion`** implemented more than once.
- **Sidebar re-implements Link's active-route check** instead of reusing the router's.

## API coverage

- **`withTestId` on the remaining inline builders**: `SidebarMenuItemBuilder`
  (`sidebar-menu.ts`) and the grid column / action builders. The plan covered main builders and
  the sidebar *item* builder only; the "sub-parts are reached through the inline builder that
  owns them" rule in [builder-pattern.md](builder-pattern.md) points at these next. Menu items
  render inside a `PopoverBuilder`, so the id target needs its own decision.

## Storybook coverage

- **Router, Link and Trend have no `.stories.ts` and no `.docs.mdx`.** Pre-existing, not caused by
  the test-id work; their Builder API tables (including `withTestId`, and `withClass` on Router)
  therefore exist only in `.agent/router.md` and `.agent/components/trend.md`. Needs the story
  files first — a Router story must be isolated from Storybook's own routing.

## Consumers

- **MCP `list_components` response shape changed** to `{ hint, components }` (the hint points at
  `get_quickstart`). Any consumer that treated the response as a bare array needs updating.
