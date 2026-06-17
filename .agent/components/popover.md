# PopoverBuilder

## Description
`PopoverBuilder` is a reusable floating-popover utility that abstracts the common dropdown/popover pattern. It handles popover element creation, anchor-relative positioning, click-outside / scroll / resize close logic, and cleanup. Used internally by ComboBox, MoneyField (CurrencyDropdown), and DatePicker.

Methods:
- `withAnchor(anchor: HTMLElement): this` — **required**. Sets the element the popover positions relative to. Cleanup is also tied to this element's lifetime.
- `withContent(content: ComponentBuilder): this` — **required**. A `ComponentBuilder` whose `build()` result is placed inside the popover container.
- `withWidth(width: Observable<PopoverWidth> | PopoverWidth): this` — sets the popover width. Accepts a static value or an `Observable` for reactive updates (repositioning is applied while the popover is open). See width modes below.
- `withOffset(offset: number): this` — vertical gap in px between the anchor bottom and the popover top. Default: `4`.
- `withClass(className: string): this` — extra CSS/Tailwind classes applied to the popover container (space-separated).
- `withOnClose(callback: () => void): this` — callback fired when the popover closes for any reason: click outside, scroll outside, or window resize. Note: `PopoverBuilder` uses `popover="manual"` — the browser will not dismiss it natively on Escape. Handle Escape in your own keydown handler and call `close()` explicitly if needed.
- `asGlass(): this` — applies the `glass-effect` class (backdrop-blur, semi-transparent background).
- `build(): this` — eagerly builds the popover wrapper element and appends it to `document.body` without showing it. Call this after setting `withAnchor` and `withContent` to ensure the popover's content is queryable in the DOM before the first `show()`. Returns `this` for chaining. Throws the same guard errors as `show()` if anchor or content are missing.
- `show(): void` — lazily builds the popover on first call (if `build()` was not called), positions it, and calls `showPopover()`. Subsequent calls when already open only reposition.
- `close(): void` — sets the open flag to `false` (before calling `hidePopover()`, so any `toggle` event fires after the flag is already cleared), hides the element, and fires the `onClose` callback. No-op if already closed. **Focus restoration:** if focus is currently inside the popover when it closes, focus is restored to the anchor. `popover="manual"` gets no automatic browser focus restoration, so without this, hiding the popover while it holds focus would drop `document.activeElement` onto `<body>` — which, inside a modal dialog, breaks the dialog's focus trap. Callers therefore do not need to restore focus to the anchor themselves.

### Width modes (`PopoverWidth`)
- `'match-anchor'` (default) — popover width equals the anchor element's width.
- `'auto'` — popover width is `auto` with `minWidth` set to the anchor width (content-sized, at least as wide as the anchor).
- Any other CSS string — used verbatim as the CSS `width` property.

## Lifecycle & Cleanup
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
