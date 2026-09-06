# Dashboard Demo Documentation (`src/demo/dashboard.ts`)

The "Ora Dashboard" is a comprehensive application demo designed to show the `@tdq/ora-components` library in a realistic, high-density environment.

## 1. Application Layout
The dashboard uses the `LayoutBuilder` with an `asHorizontal()` orientation to create:
- **Sidebar:** The library's `SideBarBuilder` — a collapsible icon rail that expands to 220px and shows labels. `src/demo/dashboard/sidebar.ts` exports `createSidebar(): SideBarBuilder` and the shell passes that builder straight into `.withContent(...)`.
- **Main View:** A column that owns the shell spacing — `gap-px-16 pt-px-16 pr-px-16 pb-px-16`, no left padding, because the rail's symmetric `--ora-sidebar-gutter` (16px each side) already provides the gap to the content. Pages therefore render with **no root padding of their own** (`p-px-24` was removed from every page root); the column's 16px rhythm is the only spacing between rail, top bar, page and viewport edges.
- **Top bar (`src/demo/dashboard/header.ts`):** a `PanelBuilder` (`PanelGap.SMALL`, `withClass` → `rounded-extra-large bg-surface-container-low shadow-level-2 border-outline-alpha-20 h-[52px]`) wrapping a horizontal `LayoutBuilder` — a GROW slot for the title cluster and a right-aligned FIT slot for search + avatar — so it shares the rail panel's surface and 52px matches the brand row. Left: page title + "Live data" pill; right: a 36px search pill and a 36px avatar. Header and page content share one left edge.

### 1.1 Sidebar (`src/demo/dashboard/sidebar.ts`)

| Concern | How it is wired |
|---------|-----------------|
| Brand | `withLogo(...)` receives only the gradient glyph extracted from `createLogo()` (`.logo-icon`); the sidebar's 36px brand slot has no room for the wordmark, which `withCaption(of('Ora Dashboard'))` renders instead. |
| Nav rows | `addItem().withIcon(svg).withCaption(of(label)).withHref(path)`. Overview adds `.withExact()` so `/dashboard` does not prefix-match every sub-page. |
| Grouping | `addDivider()` between Main Menu, Accounting and Trading. `SideBarBuilder` has no group-label API, so the old uppercase "MAIN MENU / ACCOUNTING / TRADING" captions are gone — the dividers carry the grouping on their own. |
| Active route | `withRouter(router)`. Rows render as real `<a href>` links, get `.ora-sidebar-item--active` plus `aria-current="page"`, and intercept only plain left-clicks. |
| Back to Landing | A final nav row after a divider, `withClick(() => router.navigate('/'))` — one click, and a tooltip while collapsed. The alternative (`withFooter().withMenu()`) would have buried a single action behind a popover. |
| Footer | Non-interactive (no `withMenu()`): icon + `v<version>` + "Ora Components demo", carrying the build identity the old logo showed as a subtitle. |
| Expanded state | Persisted by the library under `ora-dashboard-sidebar-expanded` via `withStorageKey`. The demo calls `asExpandedByDefault()` so a first-time visitor meets a labelled rail rather than a bare icon strip; a stored preference and the narrow-viewport auto-collapse still win. |

No manual `subscribe()` remains in the sidebar: every stream (captions, icons, active route, tooltips) is owned by the builder and torn down with the element.

## 2. Core Widgets
- **Stats Grid:** An 8-card grid of summary KPIs (Total Revenue, Active Users, Orders, Conversion, etc.) built with `KPICardBuilder` — a demo-local builder that wraps `PanelBuilder`, `LayoutBuilder`, and `LabelBuilder`.
- **Sales Chart:** A dynamic line chart created using `ChartBuilder`. It uses an RxJS `timer(0, 5000)` to simulate real-time data updates every 5 seconds.
- **Transactions Grid:** A data table built with `GridBuilder`, showing recent transaction history with custom column definitions. The overview transactions grid sits inside a flex container, so it uses `flex-1 min-h-0` on the built element (via `classList.add(...)`) rather than `.withHeight()`. Other pages — such as orders — use explicit `.withHeight(of(400))`.

## 3. Implementation Highlights
- **`LayoutBuilder`:** Used to handle the high-level application shell.
- **RxJS Integration:** 
  - `timer(0, 5000).pipe(map(...))` for live chart updates.
  - `of([...])` for static grid data.
- **Responsive Design:** 
  - Uses Tailwind's grid system (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`) to ensure the dashboard looks good on all screen sizes.
  - The sidebar collapses to an icon rail on demand, and `SidebarLogic` force-collapses it below 960px without overwriting the stored preference.

## 4. Key Builders Used
- `LayoutBuilder`: For the main horizontal/vertical structure.
- `PanelBuilder`: For stats cards and content containers.
- `ChartBuilder`: For the sales trend visualization.
- `GridBuilder`: For tabular data representation.
- `ButtonBuilder`: For navigation and call-to-action buttons.
- `SideBarBuilder`: For the collapsible, router-aware navigation rail.

## 5. Usage in Marketing
The Dashboard serves as the "Wow Factor" for the library. It proves that Ora is not just for simple UI pieces but can power a full-featured, reactive application shell.
