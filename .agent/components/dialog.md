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
- `withHeight(height: Observable<number>): this` - if defined then limits height of the dialog. Otherwise height is defined by the content.
- `withToolbar(): ToolbarBuilder` - defines toolbar in the dialog.
- `asGlass(): this` - sets special styling option for dialog and its content as transparent with blur background (glass effect).
- `show(): void` - opens the dialog modally (appends to `document.body`, calls `showModal()`). Must be called after builder configuration is complete.
- `close(): void` - closes the dialog and removes it from `document.body`. Clears inline positioning styles so the dialog re-centers on next `show()`. 

DialogSize is an enum with values:
- `SMALL`. 30vw
- `MEDIUM`. 50vw
- `LARGE`. 75vw
- `EXTRA_LARGE`. 90vw

## Requirements
Dialogs are draggable by pressing mouse button on header.
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