# Dialog

## Description
Dialog component is a custom popup that is used to display dialog.
It has the following methods:
- `withCaption(caption: Observable<string>): this` - sets caption of the dialog.
- `withDescription(description: Observable<string>): this` - sets description of the dialog.
- `withClass(className: Observable<string>): this` - sets class css name of the dialog.
- `withContent(content: ComponentBuilder): this` - sets content of the dialog.
- `withSize(size: DialogSize): this` - sets size of the dialog.
- `asScrollable(): this` - sets content of the dialog scrollable.
- `withHeight(height: Observable<number>): this` - if defined then limits height of the dialog (max-height). Otherwise height is defined by the content.
- `withFixedHeight(height: Observable<number>): this` - sets an exact height in px (clamped by `max-h-[90vh]`, body gets `min-h-0` so only the content scrolls). Use for wizards and other dialogs whose height must not jump between steps.
- `withMaxWidth(maxWidth: Observable<string>): this` - overrides the size's default max-width with any CSS width string.
- `withBeforeClose(fn: () => boolean | Promise<boolean>): this` - guard consulted before the dialog closes. Returning `false` (or a promise resolving to `false`) cancels the close. It is **fail-closed**: a throwing or rejecting guard cancels the close rather than losing the user's work.
- `withDraggable(draggable: boolean | Observable<boolean>): this` - enables/disables header dragging (default: enabled).
- `withToolbar(): ToolbarBuilder` - defines bottom toolbar in the dialog.
- `asGlass(): this` - sets special styling option for dialog and its content as transparent with blur background (glass effect).
- `show(): void` - opens the dialog modally (appends to `document.body`, calls `showModal()`). Must be called after builder configuration is complete.
- `close(): Promise<void>` - consults `withBeforeClose` (hence async) and, if allowed, closes the dialog and removes it from `document.body`. Clears inline positioning styles so the dialog re-centers on next `show()`.
- `forceClose(): void` - closes immediately, bypassing the `withBeforeClose` guard. Use for "the operation succeeded, tear it down" paths.

DialogSize is an enum with values (each is a viewport-relative width **capped by a max-width**, so a dialog does not become an unreadable full-bleed sheet on an ultra-wide monitor):

| Size | Width | Max width |
|------|-------|-----------|
| `SMALL` | 30vw | 480px |
| `MEDIUM` | 50vw | 720px |
| `LARGE` | 75vw | 1040px |
| `EXTRA_LARGE` | 90vw | 1400px |

`withMaxWidth(...)` overrides the cap per dialog.

## Lifecycle — a dialog element is single-use
`close()` / `forceClose()` / a native close all detach the `<dialog>` from the DOM, which fires its one-shot `registerDestroy` teardown: listeners are removed and the builder's cached element is dropped. A subsequent `show()` therefore **builds a fresh element** with the `beforeClose` guard re-armed. Consumers must not re-parent or re-attach a built dialog element — the builder tracks this with a `destroyed` flag, and `forceClose()` on a dead element is a safe no-op.

## Requirements
Dialogs are draggable by pressing mouse button on header, unless `withDraggable(false)` is set (which also removes the `cursor-move` affordance from the header).
It uses existing components: layout, label
Use HTML <dialog> tag for implementation.
Always display dialog as modal.
On opening dialog must be displayed in center.
**Focus Trapping:** Keyboard navigation (Tab/Shift+Tab) must be restricted to the dialog while it is visible. Tabbing from the last focusable element must wrap focus back to the first element (circular navigation). Implemented via `setupFocusTrap(dialog)` (see `core/focus-trap.ts`). This implementation must correctly handle:
1. Dynamically added elements like **Popovers** (DatePicker, ComboBox).
2. Elements with `tabindex="-1"` that might have focus (e.g. calendar grid cells).
3. The circular navigation must include all visible children of the dialog.
4. A **closed popover that remains in the dialog's DOM** as `display:none` (e.g. the DatePicker calendar after it closes). Its focusable elements must be excluded from the trap — they live in a hidden subtree, so the trap skips elements with a hidden ancestor. Otherwise the trap could try to focus a hidden element and drop focus to `<body>`, breaking the trap.
5. Recovery when focus escapes the dialog by means other than Tab (e.g. a native popover hiding itself): a `focusin` fallback pulls focus back inside.
6. **Safari keyboard navigation.** The trap drives all Tab movement itself (explicitly focusing the next/previous element on every Tab) rather than relying on the browser's native Tab. Safari's default keyboard navigation skips `<button>` / `<a>` elements, so native delegation would make toolbar buttons unreachable and let focus escape after the last form field.

## Styling
Style according to Material Design 3 
Description are small text.
Caption is a big text.
Toolbar should be on the bottom of the dialog.
Only content is scrollable.
Dialog drops large shadow.
Dialog border radius is rounded-large.

### Glass effect
Glass effect applied also for toolbar.
Backdrop is totaly transparent.

Light theme:
1. Caption color is `text-gray-700`
2. Description color is `text-gray-600`

Dark theme:
1. Caption color is `text-white/80`
2. Description color is `text-white/60`