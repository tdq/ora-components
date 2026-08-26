# SideBar

## Description

SideBar is a collapsible application rail: a fixed-width icon strip that expands to a full-width navigation panel with labels, router-aware nav rows, hover tooltips while collapsed, and popover menus that open beside the rail. It owns its own expanded state (persisted to `localStorage`) unless the application hands it a `Subject`, and it is the left-hand element of the application shell.

Composition with the main content area and the chat panel is covered in [app-shell.md](../app-shell.md).

- `withRouter(router: RouterBuilder): this` - binds the sidebar to a `RouterBuilder` so items that declare `withHref` render as `<a>` links, navigate through the router on a plain left click, and track the active route.
- `withCaption(caption: Observable<string>): this` - sets the brand text shown when expanded. Its first character, upper-cased, is the default monogram shown when collapsed.
- `withLogo(logo: ComponentBuilder): this` - replaces the monogram with a caller-supplied brand mark. Built once.
- `withExpanded(expanded: Subject<boolean>): this` - takes over the expanded state as a two-way `Subject`. The sidebar reads and writes it and never completes it; supplying it disables `localStorage` persistence entirely and makes the narrow-viewport auto-collapse the caller's business.
- `withStorageKey(key: string): this` - overrides the `localStorage` key used for the persisted expanded flag. Defaults to `ora-sidebar-expanded`. Ignored when `withExpanded` is supplied.
- `asExpandedByDefault(): this` - starts the sidebar expanded on a first visit. Only applies when `withExpanded` is not supplied and `localStorage` holds no value for the storage key — a stored preference (including `'false'`) always wins — and the narrow-viewport auto-collapse still applies.
- `addItem(): SidebarItemBuilder` - appends a navigation row and returns its builder. Rows render in call order.
- `addDivider(): this` - appends a horizontal separator (`role="separator"`) at the current position in the item list.
- `withFooter(): SidebarFooterBuilder` - creates the footer row (account/organisation block) and returns its builder. Memoised: repeated calls return the same builder.
- `asGlass(): this` - renders the panel with the shared `glass-effect` (translucent, blurred) surface instead of the solid `ora-sidebar-panel--solid` surface. Menus opened from the sidebar inherit the glass treatment.
- `build(): HTMLElement` - builds the sidebar element. Teardown is bound to a single lifecycle boundary on the wrapper.

## Inline builders

Four nested builders are reached only through the parent; none of them is constructed directly.

### SidebarItemBuilder — `sideBar.addItem()`

- `withIcon(icon: string | Observable<string>): this` - sets the row icon as inline SVG markup, typically an `Icons.*` constant. Accepts a static string or an `Observable`.
- `withCaption(caption: Observable<string>): this` - sets the row label. The label is visually hidden while collapsed, so the same value is mirrored onto the row's `aria-label` and is the default tooltip text.
- `withHref(href: string): this` - turns the row into a router link. Requires `withRouter` on the sidebar; without a router the row stays a `<button>`.
- `withExact(exact?: boolean): this` - matches the whole path instead of the path prefix when deciding the active state. Defaults to `true` when called with no argument.
- `withClick(cb: () => void): this` - runs a callback on click. Ignored when the row also declares `withMenu()`; the menu always wins.
- `withEnabled(enabled: Observable<boolean>): this` - toggles the row's enabled state. A disabled row stays visible but reports `aria-disabled`, leaves the tab order via `tabindex="-1"`, refuses clicks in the capture phase, and (for router rows) drops its `href` so middle click, "Open in new tab" and the context menu cannot navigate either. Re-enabling restores the `href`.
- `withVisible(visible: Observable<boolean>): this` - shows or hides the row with the same semantics as `SlotBuilder.withVisible`, toggling `display` on the existing node without rebuilding it. Subscriptions stay live while hidden.
- `withTooltip(text: Observable<string>): this` - overrides the tooltip shown while the sidebar is collapsed. Defaults to the caption.
- `withMenu(): SidebarMenuBuilder` - turns the row into a menu button: clicking it opens a popover menu beside the rail instead of navigating or running `withClick`. The row is always a `<button>` even when `withHref` was also set. Memoised.

### SidebarFooterBuilder — `sideBar.withFooter()`

- `withIcon(icon: string | Observable<string>): this` - sets inline SVG markup for the footer avatar slot. Ignored when `withAvatar` is supplied.
- `withAvatar(avatar: ComponentBuilder): this` - places a caller-built element (image, initials badge) in the avatar slot. Takes precedence over `withIcon`.
- `withCaption(caption: Observable<string>): this` - sets the footer's primary line, for example the organisation name. Also names the footer button and feeds its collapsed tooltip.
- `withDescription(desc: Observable<string>): this` - sets the footer's secondary line, for example the signed-in role. Used as the accessible name when there is no caption.
- `withMenu(): SidebarMenuBuilder` - attaches an account menu to the footer. Only a footer with a menu renders as a `<button>` with a chevron; without one it renders as an inert `<div>` so there is no dead tab stop and no promised interaction. Memoised.

### SidebarMenuBuilder — `item.withMenu()` / `footer.withMenu()`

- `addItem(): SidebarMenuItemBuilder` - appends a `role="menuitem"` button to the menu and returns its builder.
- `addDivider(): this` - appends a `role="separator"` rule between menu groups.

### SidebarMenuItemBuilder — `menu.addItem()`

- `withIcon(icon: string | Observable<string>): this` - sets inline SVG markup for the menu item's leading icon.
- `withCaption(caption: Observable<string>): this` - sets the menu item's label.
- `withClick(cb: () => void): this` - runs a callback on activation and then closes the menu. Not called while the item is disabled.
- `withEnabled(enabled: Observable<boolean>): this` - toggles the item's `disabled` and `aria-disabled` state. Disabled items are skipped by arrow-key roving focus.

## Architecture

| Module | Responsibility |
| --- | --- |
| `sidebar-builder.ts` | `SideBarBuilder` plus the module-private `SidebarItemBuilderImpl` / `SidebarFooterBuilderImpl`. Collects configuration, resolves who owns the expanded flag (`ExpandedController`), and converts each entry into a viewport config. |
| `sidebar-logic.ts` | `SidebarLogic` — the default owner of `expanded$`. Seeds from `localStorage`, persists deliberate toggles, force-collapses on narrow viewports, completes its own subject on `destroy()`. |
| `sidebar-viewport.ts` | `buildSidebarViewport()` — assembles `wrapper > panel > inner > (header / nav / footer)`, syncs `ora-sidebar--expanded`, manages the `ora-sidebar--animating` window, owns the single lifecycle boundary. Builds the brand button, the header toggle and the footer row. |
| `sidebar-item-viewport.ts` | `buildSidebarItem()` — one nav row as `<a>` or `<button>`, with icon, label, active-route class, enabled/visible handling, menu wiring and tooltip attachment. Returns `{ element, subscription }`. |
| `sidebar-menu.ts` | `SidebarMenuBuilder` / `SidebarMenuItemBuilder` interfaces, the module-private `SidebarMenuImpl` and the `createSidebarMenu()` factory. Wraps `PopoverBuilder` and implements the WAI-ARIA menu keyboard contract. |
| `sidebar-tooltip.ts` | The singleton tooltip portalled onto `document.body`, its show/hide grace period, scroll dismissal and reference counting. |
| `sidebar.css` | Every `ora-sidebar-*` class, the `--ora-sidebar-*` geometry properties, the Material 3 token mapping and the reduced-motion block. |

DOM contract:

```
div.ora-sidebar[.ora-sidebar--expanded][.ora-sidebar--animating][data-sidebar-initialized]
└─ div.ora-sidebar-panel(.glass-effect | .ora-sidebar-panel--solid)
   └─ div.ora-sidebar-inner
      ├─ div.ora-sidebar-header[data-slot=header]
      │  ├─ button.ora-sidebar-brand > span.ora-sidebar-brand-mark-wrap > (mark | arrow) + span.ora-sidebar-brand-text
      │  └─ button.ora-sidebar-header-toggle
      ├─ nav.ora-sidebar-nav[data-slot=nav] > (a|button).ora-sidebar-item[--active|--disabled] | div.ora-sidebar-divider
      └─ div.ora-sidebar-footer[data-slot=footer] > (button.ora-sidebar-footer-button | div.ora-sidebar-footer-content)
└─ ora-lifecycle-boundary
```

`LinkBuilder` is deliberately not reused for nav rows: it owns the anchor's `textContent` and would wipe the icon and label spans on every emission. The row reimplements `link.ts`'s left-click guard (`button === 0`, no modifier key, not `defaultPrevented`, no `target`) and its prefix/exact active-route rules on an anchor the sidebar owns outright.

## State management

`expanded$` has exactly one owner, decided at `build()`:

- **Default (no `withExpanded`)** — `SidebarLogic` creates a `BehaviorSubject<boolean>` seeded from `localStorage.getItem(storageKey)` (guarded with `try/catch` for private-browsing mode). An absent key — and a storage read that throws — falls back to the default, which is collapsed unless `asExpandedByDefault()` was called; a stored value always wins over that default. Deliberate toggles go through `setExpanded()`, which writes both the subject and storage. The subject is completed in `destroy()`, which the lifecycle boundary calls.
- **`withExpanded(subject)`** — the caller's `Subject` is read and written directly. **Persistence is disabled**: nothing is read from or written to `localStorage`, `withStorageKey` is ignored, and the narrow-viewport auto-collapse becomes the application's responsibility. The subject is never completed, because the sidebar does not own it.

**Narrow viewports.** `SidebarLogic` watches `matchMedia('(max-width: 959px)')`, applies the current match at construction and subscribes to `change`. When it matches, an expanded sidebar collapses through the private `_collapseForViewport()`, which pushes to `expanded$` **but never writes storage**. The narrow window is a transient condition; persisting it would silently erase a preference set on a wide screen. The operator's stored preference comes back untouched on a wide viewport.

**Seeding.** The brand and the header toggle apply the collapsed state to the DOM *before* subscribing to `expanded$`, because a plain `Subject` has no current value and its first emission may be arbitrarily late or never arrive. From the first paint the sidebar is a coherent collapsed rail.

**The brand is a real `<button>`.** While collapsed it is the only control that can expand the sidebar (the header chevron is `display: none`), so it must be keyboard reachable; native button semantics give Enter and Space for free. Its accessible name is `"Expand sidebar"` while collapsed and the caption while expanded, where it is also `disabled` because it has nothing left to do. Hovering it while collapsed swaps the monogram for `Icons.PANEL_EXPAND`.

## Menus

A menu is a `PopoverBuilder` configured with `PopoverPlacement.RIGHT`, an 8px offset, the `ora-sidebar-menu` class and, when the sidebar is glass, `asGlass()`. `PopoverBuilder` already owns outside-click dismissal, dismissal on any scroll outside the popover, the single-active-popover rule, dialog re-parenting, and repositioning on window resize; the sidebar adds placement, the anchor's `aria-expanded`, and teardown.

**Bounded height.** A RIGHT-placed popover never flips vertically, so `PopoverBuilder` caps it to the viewport height (`window.innerHeight - 8`) whether or not a max-height was asked for. The menu asks for one anyway — `withMaxHeight(320)` — to keep a long account menu from filling a tall screen, so its effective height is `min(320, window.innerHeight - 8)`. `withScrollElement(menuList)` hands that clamped height to the list, which owns the scrollbar; the popover wrapper itself stays `overflow: hidden` and never scrolls.

**Keyboard contract (WAI-ARIA menu button).** `role="menu"` is a promise, and the menu keeps it:

| Key | Behaviour |
| --- | --- |
| open | Focus moves to the first enabled item; roving `tabindex` promotes exactly one item to `0`, all others `-1`. |
| `ArrowDown` / `ArrowUp` | Move to the next/previous **enabled** item, wrapping at both ends. |
| `Home` / `End` | Jump to the first/last enabled item. |
| `Escape` | Closes the menu and returns focus to the anchor. |
| `Tab` | Closes the menu without `preventDefault`, so focus moves on naturally. |

Disabled items are excluded from the roving list, since a disabled `<button>` cannot hold focus anyway.

**Close is single-owner.** `PopoverBuilder` closes itself on outside click, on eviction by another popover and on native dismissal, and `withOnClose` is the only hook it calls on those paths. Every close therefore funnels through one `onClosed()` that clears `aria-expanded` and detaches the `keydown` listener; otherwise a close the sidebar never initiated would leave the listener roving focus inside a hidden menu.

**Menu wins.** A row with `withMenu()` opens the menu instead of navigating or running `withClick`, and it is always rendered as a `<button>`. Opening a menu also hides the shared tooltip, since the two describe the same row.

## Tooltip system

One tooltip element (`.ora-sidebar-tooltip`, `role="tooltip"`) is shared by every row in every sidebar on the page and lives on `document.body`, not inside the row, so the scrolling nav's `overflow` cannot clip it. `attachSidebarTooltip(anchor, text$, disabled$)` returns the `Subscription` that owns both the stream and the DOM listeners; the sidebar passes `expanded$` as `disabled$`, so tooltips exist only while collapsed, which is exactly when labels are hidden.

- Positioned on `mouseenter` at the anchor's vertical centre, 12px to the right of its right edge.
- Hidden after an 80ms grace period on `mouseleave`, so travelling between adjacent rows does not flicker.
- Hidden immediately on any page scroll: a capture-phase `scroll` listener on `document` catches scrolls on the nav, which do not bubble.
- Reference counted. Per-anchor teardown only hides the tooltip if that anchor is the one currently showing, and the singleton node is removed from the body when the last attachment goes away.

## Requirements

- `withRouter` is required for `withHref` to do anything; without it a row with an `href` is still a `<button>` and never gets an active state.
- Every subscription in the tree (header, brand, rows, footer, menus, tooltips) is aggregated into one `Subscription` released by a single `createLifecycleBoundary()` on the wrapper. Helpers return `{ element, subscription }` per [reactive.md](../reactive.md) rule 5; `registerDestroy` is not used in this component.
- A `Subject` passed to `withExpanded` is owned by the caller and is never completed by the sidebar. A `BehaviorSubject` is the natural choice, because a valueless `Subject` leaves the sidebar collapsed until it emits.
- Icons are inline SVG strings, normally `Icons.*` constants. See [icons.md](../icons.md).
- The sidebar renders items in `addItem()` / `addDivider()` call order; there is no reordering and no reactive item list.

## Styling

Geometry is exposed as custom properties on `.ora-sidebar`, so a consuming application retheme is a CSS override rather than an API change:

| Property | Default | Purpose |
| --- | --- | --- |
| `--ora-sidebar-width` | `52px` | Collapsed rail width. |
| `--ora-sidebar-width-expanded` | `220px` | Expanded panel width. |
| `--ora-sidebar-gutter` | `var(--md-sys-spacing-4)` | Gutter on both sides of the panel (viewport edge and content); the wrapper's width is `width + 2 × gutter`. |

Material 3 token mapping: icons use `--md-sys-color-on-surface-variant`, promoted to `--md-sys-color-on-surface` on hover and when active; text is `--md-sys-color-on-surface` with `--md-sys-color-on-surface-variant` for secondary lines; focus rings are `2px solid var(--md-sys-color-primary)` with a 2px offset; the brand mark uses a `linear-gradient(135deg, primary, tertiary)`. **Row states follow Aura's `.sidebar-link`:** hover is a 14% primary wash with a 1px lift; the active row is a diagonal `primary→tertiary` gradient wash (14%/8% light, 22%/14% dark) with a 1px inner highlight and a soft primary glow (`0 4px 14px`). **Tooltip follows Aura's `.sidebar-tooltip`:** a translucent card on the app's own surface — `surface` at 95% with an outline hairline (light) or `surface-container-low` at 88% with a faint primary hairline (dark) — `on-surface` text, 8px radius, 6px/12px padding, not an inverted pill.

**Surface.** The default `.ora-sidebar-panel--solid` is Aura's `.sidebar-panel`: a translucent card — white 60% with a `rgba(30,10,60,.08)` hairline, `0 8px 32px` drop shadow and a 1px inner highlight (light); white 5% / white 10% hairline / `0 8px 32px rgba(0,0,0,.2)` (dark) — 20px radius, 4px inner padding. `asGlass()` replaces it with PanelBuilder's `.glass-effect` unchanged (no sidebar overrides beyond the width-transition blur suspension). See [glass-effects.md](../glass-effects.md).

**No `backdrop-filter` during the width transition.** A backdrop-filtered surface is re-composited every frame, and re-blurring a panel whose width is animating drops the animation to single-digit frame rates on mid-range hardware, with visible tearing on the labels. The viewport therefore adds `.ora-sidebar--animating` to the wrapper for the duration of the width transition, and `.ora-sidebar--animating .ora-sidebar-panel.glass-effect { backdrop-filter: none }` suspends the blur for exactly that window. The class is removed on the wrapper's own `width` `transitionend`, with a 400ms timeout as a safety net. It is **not** applied on the first emission (the initial state paints at its final width and does not animate), nor on a re-emission of the same value, nor under `prefers-reduced-motion: reduce` — with `transition: none` there is no `transitionend`, so the class would linger for the whole fallback timeout and turn the mitigation into a visible blur flash on every toggle. No `!important` is needed: the rule is specificity `(0,3,0)` against `.glass-effect`'s `(0,1,0)` in the same `@layer ora-components`, and an `!important` inside the layer would break the contract that a consuming app's unlayered CSS outranks ours (see [theme.md](../theme.md) 10b).

The width transition is additionally gated on `[data-sidebar-initialized]`, stamped one `requestAnimationFrame` after mount so the sidebar does not animate from zero width on its first paint.
