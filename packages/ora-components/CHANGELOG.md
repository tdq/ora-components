# Changelog

All notable changes to `@tdq/ora-components` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.8] - 2026-08-24

_(Unreleased as of this writing — bumping `package.json`'s version is a release-time action, not part of this change.)_

### Added

- **ComboBox `asInlineError()`**: errors render as a red outline plus an error-icon popover inside the input (same contract as `TextFieldBuilder.asInlineError()`), instead of support text below the field; the input carries `aria-invalid` in both modes. Storybook gains `InlineErrorStates` / `InlineErrorGlass` stories for both TextField and ComboBox covering no-error, static, live-validation, toggled, disabled and glass states.
- **ListBox & MultiSelectList virtual scrolling**: Both components now virtualize their rows — only the visible window plus a 5-row buffer is rendered to the DOM (`requestAnimationFrame`-driven scroll updates, `transform: translateY` positioning), so lists with thousands of items stay fast. Row heights are **measured per-row** (variable row heights supported; the configured height is only an estimate for not-yet-measured rows), so items of differing heights position correctly without overlap. Rendered rows carry `aria-setsize` / `aria-posinset` for assistive technologies. Shared via a new internal `VirtualRowsViewport` utility.
- **ComboBox long-list hardening** (aura-accounting findings #9, #11, #12 + filter perf): `withAriaLabel(string | Observable<string>)` sets an explicit accessible name; the builder now `console.warn`s at configuration time when no caption, aria-label, or placeholder is set. `build()` returns a `ComboBoxElement<ITEM>` exposing `select(item)` / `open()` / `close()` for driving the ComboBox imperatively. `withValue` accepts a plain `Observable<ITEM | null>` (read-only) in addition to a `Subject` (two-way). Filtering is debounced adaptively — synchronous below 100 items, 150 ms at 100 items and above (`withFilterDebounce(ms)` overrides it); an emptied search term always runs synchronously regardless of item count. The debounce is flushed on `Enter`/`ArrowDown`/`ArrowUp`/`Home`/`End`/`PageUp`/`PageDown`, and `filteredItems$` is shared so it no longer runs twice per keystroke. `withMaxHeight(number | Observable<number>)` replaces the static `max-h-px-256`, clamping the popup to the space actually available above/below the anchor (`data-placement` reflects the chosen side). Home/End/PageUp/PageDown navigation added to the input's keyboard handling.
- **Dialog** (#13–#16): `withMaxWidth(Observable<string>)` overrides each `DialogSize`'s max-width cap; every size now carries a max-width so a `LARGE`/`EXTRA_LARGE` dialog stays readable on an ultra-wide monitor. `withBeforeClose(() => boolean | Promise<boolean>)` guards `close()`, the native Escape/`cancel` event, and the backdrop click — fail-closed, so a throwing/rejecting guard also cancels the close. `withDraggable(boolean | Observable<boolean>)` toggles header dragging (default enabled). `withFixedHeight(Observable<number>)` pins an exact height (clamped to `max-h-[90vh]`) with the body scrolling internally, for wizards whose height must not jump between steps.
- **Layout** (#19, #31): `SlotSize.GROW` absorbs remaining space along the layout's main axis (`flex-1` plus direction-aware `min-h-0`/`min-w-0`) so a scrollable child fills the rest of the height instead of overflowing the page; the container gets `h-full min-h-0` when vertical with a GROW slot present. Every slot wrapper now carries a `data-slot` attribute (`withName(...)` value, or the slot's index when unnamed) for stable test/CSS selectors.
- **Grid**: `withRowHeight(px)` overrides the row height in one place (previously hard-coded `52` independently in three files — the defect #36 flagged); the row/header/toolbar-allowance constants (`GRID_ROW_HEIGHT`, `GRID_HEADER_HEIGHT`, `GRID_TOOLBAR_HEIGHT_ALLOWANCE`) are now exported public so consumers can size around the grid without guessing pixel values. `withAutoHeight(maxRows)` sizes the grid to its content instead of filling its parent — for short grids in a form or dialog (follow-up to #36). `addEnumColumn().withOptions(options)` (#20) now drives a working inline select editor (a `ComboBox` seeded with the same options) when the column is `.asEditable()` — previously an "editable" enum column silently had no editor. `CustomColumnBuilder.asEditable(focusTarget?: (cellEl) => HTMLElement | null)` (#35) joins focus-only editable cells into the same Tab/Enter/Arrow keyboard chain as value-editable cells, without opening a `CellEditor` or writing a field — placing focus inside the rendered cell content is the whole contract, so no `onCommit` fires. Custom editors that need to signal a commit from inside their own widget dispatch the exported `CELL_COMMIT_EVENT` (`'ora-cell-commit'`) from their root; the row listens for it instead of guessing from focus/change events (the enum column's inline `ComboBox` editor uses this). Rendering falls back to synchronous when `IntersectionObserver` is unavailable (#34).
- **FieldsBuilder** (#17): `addCustom(builder: ComponentBuilder)` inserts an arbitrary component into the same field-row container used by the typed field helpers.
- **SideBar**: `SideBarBuilder` builds a collapsible navigation rail — `withRouter`, `withCaption(Observable<string>)`, `withLogo(ComponentBuilder)`, `withExpanded(Subject<boolean>)` for two-way collapsed/expanded control, `withStorageKey(string)` to persist the expanded state, `asExpandedByDefault()` to start expanded on a first visit (only while `localStorage` holds no value and `withExpanded` is not used), `asGlass()`, `addItem()` (returns a `SidebarItemBuilder`: `withIcon`, `withCaption`, `withHref`, `withExact`, `withClick`, `withEnabled`, `withVisible`, `withTooltip`, `withMenu()`), `addDivider()`, and `withFooter()` (returns a `SidebarFooterBuilder`: `withIcon`, `withAvatar(ComponentBuilder)`, `withCaption`, `withDescription`, `withMenu()`). Item and footer menus (`SidebarMenuBuilder`/`SidebarMenuItemBuilder`) reuse the popover-driven menu pattern already used elsewhere in the library, so a collapsed rail's overflow actions stay reachable without a second navigation surface.
- **ChatPanel / ChatTrigger**: `ChatPanelBuilder`/`ChatTriggerBuilder` add a view-only chat surface for embedding an AI assistant in the app shell. `ChatPanelBuilder` takes `withMessages(Observable<ChatMessage[]>)` and `withOnSend(cb)` (both required), `withOpen(Subject<boolean>)`, `asClosable()`, `withCaption`, `withStatus`, `withPlaceholder`, `withEmptyState(ComponentBuilder)`, `withSuggestions(Observable<ChatSuggestion[]>)`, `withWidth(Observable<number>)`, and `asGlass()`; `ChatTriggerBuilder` takes `withOpen(Subject<boolean>)` (required) and `withCaption`. The component renders whatever `ChatMessage[]` the app hands it — including a growing `content` string for a streaming assistant reply, or an empty-string `content` to show the typing indicator — so the app owns the message list and transport entirely and the library never parses markdown or opens a connection itself. `withSuggestions()` adds app-driven quick-reply chips (`ChatSuggestion { caption, text }`) between the message log and the composer — available in the empty state and mid-conversation alike, sending the item's `text` on click without touching the composer; the panel never clears them itself, so the app emits `[]` to hide the row. Accessibility: the scrollable message log is a keyboard-reachable `role="log"` region (`tabindex="0"`) and the typing indicator is a `role="status"` live region, so its "Assistant is typing" label reaches a screen reader.

### Changed

- **`dist/ora-components.css` is now wrapped in `@layer ora-components`** (#27): design tokens remain unlayered, but component styles are layered so that any unlayered rule in a consuming app outranks the library's styles by normal CSS cascade rules — no more `!important` or import-order gymnastics needed to override a component class.
- **MoneyKPICard** (#5–#6): grouping/decimal separators follow `withLocale(string | Observable<string>)` (default `'en-US'`) via `Intl.NumberFormat` instead of being hard-coded; the separator is omitted at zero precision; `withCurrencyDisplay('symbol' | 'code')` (#7) controls the rendered form.
- **Popover**: `withPlacement(PopoverPlacement)` picks which side of the anchor the popover opens on (e.g. `PopoverPlacement.RIGHT`), instead of the previous fixed below-anchor placement — needed by SideBar's collapsed-rail tooltips and menus, which open beside the rail rather than under it.

### Fixed

- **ComboBox disabled state**: the dropdown chevron and the programmatic `open()` API no longer open the list while the field is disabled (previously only the text input was disabled, so a click on the chevron still opened a selectable list), and a list that is open when the field becomes disabled is closed.
- **Popover no longer scrolls itself** — the wrapper is `overflow-hidden` and `withMaxHeight` is now opt-in (no 256px default). The **DatePicker calendar** therefore renders at natural height with no scrollbar (regression from the fit-to-viewport work). Scrollable content lives *inside* the popover: the new `PopoverBuilder.withScrollElement(el)` writes the clamped max-height onto the consumer's scroll element (ComboBox and the money-field currency dropdown use it for their `<ul>`), replacing the ComboBox's MutationObserver workaround.

- **MoneyKPICard** (#4): the negative sign is now rendered — previously `Math.abs`-ed away, so a negative value and its positive counterpart looked identical.
- **MoneyKPICard** (#7): the initial value now renders synchronously (gating only applies to subsequent updates), so a card below the fold is not left blank until its first viewport-gated emission.
- **Chart** (#1): `<animate>` elements now set `begin="indefinite"` and call `beginElement()` explicitly once the SVG is connected, instead of leaving charts mounted after the initial paint blank; when animation is disabled the final values are written directly as the static attributes.
- **Chart** (#2): series data treats `null`/`undefined`/`NaN` values as gaps — line/area paths split into sub-paths around them instead of interpolating through a dropped point, and gaps are excluded from axis domain calculation.
- **DatePicker** (#25): calendar render subscriptions are returned and registered for teardown, closing a subscription leak on repeated mount/unmount.
- **Popover** (#26): document/window/scroll listeners are removed on close and re-added on show, instead of accumulating across open/close cycles.
- **Grid custom columns** (#32): custom column cell content is now torn down (`registerDestroy` callbacks fire) on row eviction/replacement, not just on grid teardown.
- **Grid custom columns** (#33): custom column cells now compare by item reference instead of by rendered content identity, so a renderer that returns a new element for the *same, unchanged* item is no longer re-mounted on every populate pass (which previously dropped focus/selection inside the cell).

## [0.1.7] - 2026-06-17

### Fixed

- **Dialog focus trap in Safari**: Tab navigation is now driven explicitly by the trap instead of relying on the browser's native Tab. Safari's default keyboard navigation skips `<button>` / `<a>` elements, which previously made toolbar buttons unreachable and let focus escape the dialog after the last form field.

## [0.1.6] - 2026-05-31

### Added

- **MoneyKpiCard**: KPI card component for financial dashboards.
- **TrendChip**: Chip component for displaying trend indicators.

### Changed

- Updated Stories and agent documentation.
- Separated components into independent modules.
- Restyled KPICardBuilder to match MoneyKPICard visual style (container, typography, trend chip).
- Replaced money-related KPI cards with MoneyKPICardBuilder in dashboard overview and stories.

### Fixed

- DatePicker glass effect styling.

## [0.1.5] - 2026-05-28

### Added

- README files for packages and components.

### Changed

- Updated package version and description.

## [0.1.4] - 2026-05-24

### Added

- **FxTicker**: Foreign exchange ticker component.
- Ledger demo with 10k row support.
- Animation frame–based example data generation.
- Design tokens.
- Backend ledger stream preparation.

### Changed

- Tailwind CSS styling integration.
- Accessibility improvements across components.
- Responsive layout improvements.
- Grid render performance improvements.
- Improved animations.
- Enhanced FX converter demo.
- Playground improvements.
- Ledger demo updates and polish.

### Fixed

- Demo button interaction.

## [0.1.3] - 2026-05-21

### Added

- Landing page SEO improvements.
- Code examples and samples for landing page.
- Links section on landing page.
- MCP server.

### Changed

- Improved routing with lazy-loaded routes.
- Improved landing page layout and theming.
- Improved hero demo section.
- Improved code examples on MCP landing page.
- Improved Storybook stories.
- DatePicker: implemented TONAL and OUTLINED styles, updated docs.

### Fixed

- Site URL configuration.
- Landing page prerendering on Azure.
- Glass effect rendering.
- Deployment configuration.
- Changes detection.
- Version detection.
- Monitoring configuration.
- MCP deployment.
- Build process.
- Badge alignment. Added Turbo scripts.

## [0.1.2] - 2026-05-18

### Changed

- Grid: improved multi-select behavior.
- Grid: improved keyboard navigation.
- Improved grid component and stories.
- Improved table stories.

### Fixed

- Grid rows bottom border styling.

## [0.1.1] - 2026-05-01

First published version. Renamed from Aura Components to Ora Components.

### Added

- **Button**: Reactive button with builder pattern API.
- **Chart**: SVG-based chart component with multiple series types, axes, legends, tooltips, and viewport.
- **Checkbox**: Accessible checkbox component.
- **ComboBox**: Dropdown with search and selection.
- **DatePicker**: Calendar date picker with material design styling.
- **Dialog**: Modal dialog component.
- **Form**: Form builder with validation.
- **Grid**: High-performance data grid with row virtualization, column grouping, pivoting, editable rows, glass effects, and dark theme support.
- **Label**: Form label component.
- **Layout**: Responsive layout primitives.
- **ListBox**: Selectable list component.
- **MultiSelectList**: Multi-selection list component.
- **MoneyField**: Currency input field with formatting, integrates with forms.
- **NumberField**: Numeric input with formatting.
- **Panel**: Container panel with glass effects.
- **Popover**: Popover positioning system, including dialog support.
- **Steps**: Step progress indicator component.
- **Tabs**: Tabbed interface component.
- **TextField**: Text input with validation.
- **Toolbar**: Action toolbar component.
- **Router**: Client-side routing with lazy loading.
- Landing page with hero section, playground, and code samples.
- Storybook deployment with interactive examples.
- Tailwind CSS design system with glass effects and theme support.
- Reactive RxJS-based architecture.
- Builder pattern API for all components.
- Jest test suite with DOM testing.
- GridHeader component unit tests.
- Storybook setup with Azure deployment.
- MCP configuration for agent tools.

[0.1.6]: https://github.com/tdq/ora-components/releases/tag/v0.1.6
[0.1.5]: https://github.com/tdq/ora-components/releases/tag/v0.1.5
[0.1.4]: https://github.com/tdq/ora-components/releases/tag/v0.1.4
[0.1.3]: https://github.com/tdq/ora-components/releases/tag/v0.1.3
[0.1.2]: https://github.com/tdq/ora-components/releases/tag/v0.1.2
[0.1.1]: https://github.com/tdq/ora-components/releases/tag/v0.1.1
