# PopoverBuilder

## Description
`PopoverBuilder` is a reusable floating-popover utility that abstracts the common dropdown/popover pattern. It handles popover element creation, anchor-relative positioning, click-outside / scroll / resize close logic, and cleanup. Used internally by ComboBox, MoneyField (CurrencyDropdown), and DatePicker.

Methods:
- `withAnchor(anchor: HTMLElement): this` — **required**. Sets the element the popover positions relative to. Cleanup is also tied to this element's lifetime.
- `withContent(content: ComponentBuilder): this` — **required**. A `ComponentBuilder` whose `build()` result is placed inside the popover container.
- `withWidth(width: Observable<PopoverWidth> | PopoverWidth): this` — sets the popover width. Accepts a static value or an `Observable` for reactive updates (repositioning is applied while the popover is open). See width modes below.
- `withOffset(offset: number): this` — vertical gap in px between the anchor bottom and the popover top. Default: `4`.
- `withPlacement(placement: PopoverPlacement): this` — side of the anchor the popover opens on. `PopoverPlacement.BOTTOM` (default) opens below and flips above when there is more room there; `PopoverPlacement.RIGHT` opens beside the anchor, is always capped to the viewport height, and flips to the anchor's left when it would overflow to the right. See [Placement](#placement).
- `withAlignment(alignment: 'start' | 'end'): this` — cross-axis alignment against the anchor. Under `RIGHT`, `'end'` (the default) aligns the popover's bottom edge with the anchor's bottom edge and `'start'` aligns their top edges.
- `withMaxWidth(maxWidth: string): this` — CSS `max-width` applied to the popover container, e.g. `'32rem'`. Independent of `withWidth`.
- `withPositionReference(el: HTMLElement): this` — element measured for positioning instead of the anchor. The anchor still owns activation and cleanup; this is for cases where the visual box to align against is not the element that opens the popover.
- `withClass(className: string): this` — extra CSS/Tailwind classes applied to the popover container (space-separated).
- `withOnClose(callback: () => void): this` — callback fired when the popover closes for any reason: click outside, scroll outside, eviction by another popover taking the single active slot, or a native dismissal outside our own close paths (defended against; should not occur in `manual` mode). Window resize does **not** close the popover; it repositions it. Note: `PopoverBuilder` uses `popover="manual"` — the browser will not dismiss it natively on Escape. Handle Escape in your own keydown handler and call `close()` explicitly if needed.
- `withMaxHeight(maxHeight: Observable<number> | number): this` — preferred maximum height in px, always clamped down to the space actually available. **Under `BOTTOM` it is opt-in**: when unset the popover takes its content's natural height with no clamp and no scrollbar (the DatePicker calendar relies on this); when set it is clamped to the space on the chosen side. **Under `RIGHT` a viewport cap applies whether or not it is set** — see [Fitting the viewport](#fitting-the-viewport).
- `withScrollElement(el: HTMLElement): this` — element inside the content that owns scrolling (e.g. a ListBox `<ul>`). On every reposition the popover writes its clamped max-height to this element's `style.maxHeight` and dispatches a `scroll` event on it so virtualized viewports re-measure. The popover wrapper itself is `overflow-hidden` and never scrolls.
- `asGlass(): this` — applies the `glass-effect` class (backdrop-blur, semi-transparent background).
- `build(): this` — eagerly builds the popover wrapper element and appends it to `document.body` without showing it. Call this after setting `withAnchor` and `withContent` to ensure the popover's content is queryable in the DOM before the first `show()`. Returns `this` for chaining. Throws the same guard errors as `show()` if anchor or content are missing.
- `show(): void` — lazily builds the popover on first call (if `build()` was not called), positions it, and calls `showPopover()`. Subsequent calls when already open only reposition.
- `close(): void` — sets the open flag to `false` (before calling `hidePopover()`, so any `toggle` event fires after the flag is already cleared), hides the element, and fires the `onClose` callback. No-op if already closed. **Focus restoration:** if focus is currently inside the popover when it closes, focus is restored to the anchor. `popover="manual"` gets no automatic browser focus restoration, so without this, hiding the popover while it holds focus would drop `document.activeElement` onto `<body>` — which, inside a modal dialog, breaks the dialog's focus trap. Callers therefore do not need to restore focus to the anchor themselves.

### Width modes (`PopoverWidth`)
- `'match-anchor'` (default) — popover width equals the anchor element's width.
- `'auto'` — popover width is `auto` with `minWidth` set to the anchor width (content-sized, at least as wide as the anchor).
- Any other CSS string — used verbatim as the CSS `width` property.

### Placement (`PopoverPlacement`)
- `BOTTOM` (default) — dropdown under the anchor, flipping above when the space below is short and the space above is larger. Width follows `withWidth` (`'match-anchor'` by default).
- `RIGHT` — side menu beside the anchor, its bottom edge aligned with the anchor's bottom edge (`withAlignment('start')` top-aligns it instead). It keeps a 4px viewport inset on every side and flips to the anchor's left edge when it would overflow to the right. A RIGHT popover takes its **content's natural width** unless `withWidth` explicitly asked for something — a narrow rail button is no guide to how wide its menu should be.

A RIGHT popover **never flips vertically** — it slides into view instead — so it is **always capped to the viewport height**, `window.innerHeight - 8` (the 4px inset on each side), whether or not `withMaxHeight` was called. Without that cap a menu taller than the viewport would be pushed to a negative top with its first items permanently out of reach. A configured `withMaxHeight` is clamped down to the same cap, so the effective height is `min(withMaxHeight value, window.innerHeight - 8)`. The wrapper is `overflow-hidden` and never scrolls itself, so pair RIGHT with `withScrollElement(...)` to give the clamped height to something that does — as `SideBarBuilder`'s menus do, with `withMaxHeight(320)` and the `role="menu"` list as the scroll element. See [Fitting the viewport](#fitting-the-viewport).

### Fitting the viewport
`_position()` branches on the configured placement; the two placements fit themselves to the viewport in different ways.

**`BOTTOM`.** Measures `spaceBelow` / `spaceAbove` around the anchor and picks a side — below by default, above only when the content does not fit below **and** there is more room above. When a `withMaxHeight` is configured it sets `maxHeight = min(withMaxHeight value, available space on the chosen side)` on the popover element **and** on the `withScrollElement` target. Without a configured max-height nothing is clamped: the content renders at its natural height and only the flip logic keeps it on the roomier side. The chosen side is published as `data-placement="bottom" | "top"`.

**`RIGHT`.** Does not flip vertically, so there is no "space on the chosen side" to measure: the height is clamped straight to the viewport, `min(withMaxHeight value ?? ∞, window.innerHeight - 8)`, and that value is written to the popover element **and** the `withScrollElement` target on every reposition. Horizontally it opens at `anchor.right + offset` and flips to `anchor.left - offset - width` when it would overflow the right edge, keeping a 4px inset; vertically it aligns bottom edges (`withAlignment('start')` aligns top edges instead) and is then slid back inside the inset. The chosen horizontal side is published as `data-placement="right" | "left"`.

In both cases the popover wrapper is `overflow-hidden`, so the inner scroll element is the one that scrolls and a virtualized child list gets a genuinely bounded `clientHeight` to window against.

Repositioning runs on `show()` (twice — the first pass is unmeasured because the element is still `display:none`), on window **resize** while open, and on every emission of an `Observable` passed to `withWidth` or `withMaxHeight` while open. Outside **scroll** does **not** reposition: it closes the popover, which is the deliberate dropdown contract ComboBox and DatePicker rely on. A scroll whose target is inside the popover is ignored.

### Environments without the Popover API
`showPopover()` / `hidePopover()` are called through a `typeof === 'function'` guard, with a `display` toggle as the fallback. Positioning is `position: fixed` in either path, so the popover still lands correctly in jsdom and in browsers without the Popover API.

## Lifecycle & Cleanup
**Global listeners follow the open state, not the element's lifetime.** The document `click`, document `scroll` (capture) and window `resize` listeners are attached in `show()` and detached in `close()` / on the `toggle` event, so a popover that is merely closed holds no global listeners. `_cleanup()` (anchor destroy) detaches them too, clears the width/max-height subscriptions, removes the popover element, and nulls the module-level `_activePopover` if it pointed at this instance.

Cleanup (event listener removal, DOM detachment, Observable unsubscription) is automatically tied to the anchor element's lifetime via `registerDestroy`. When the anchor is removed from the DOM, the popover wrapper is also removed and all listeners are cleaned up. This registration happens at build time (either `build()` or the first `show()` call), so no manual teardown is needed by callers.

### Integration with Dialog
`PopoverBuilder` automatically detects if its anchor is inside a `<dialog>` element. If so, it appends the popover to that dialog instead of `document.body`. This ensures that:
1. The popover is not made `inert` when the dialog is shown as a modal.
2. The dialog's **Focus Trap** correctly includes the popover's focusable elements in its tab order.

## Usage Examples

### ComboBox-style dropdown
```typescript
const listboxContent: ComponentBuilder = { build: () => listboxElement };

const popover = new PopoverBuilder()
    .withAnchor(inputContainer)
    .withContent(listboxContent)
    .withWidth(of('match-anchor'))
    .withOnClose(() => isExpanded$.next(false));

// Eagerly append to DOM so the listbox is queryable before first open.
popover.build();

// On expand:
popover.show();

// On collapse:
popover.close();
```

### Glass effect, fixed-width (e.g. DatePicker calendar)
```typescript
const popover = new PopoverBuilder()
    .withAnchor(inputWrapper)
    .withContent(calendarBuilder)
    .withWidth('320px')
    .withOnClose(() => isExpanded$.next(false))
    .asGlass();
```
