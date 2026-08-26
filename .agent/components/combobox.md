# ComboBox

## Description
ComboBox component is a custom element that is used to display a dropdown.
It has the following methods:
- `withCaption(caption: Observable<string>): this` - sets caption of the dropdown.
- `withPlaceholder(placeholder: string): this` - sets the placeholder text for the input element.
- `withEnabled(enabled: Observable<boolean>): this` - sets enabled state of the dropdown.
- `withClass(className: Observable<string>): this` - sets class css name of the dropdown.
- `withItems(items: Observable<ITEM[]>): this` - sets items which are displayed in dropdown.
- `withListWidth(width: Observable<string>): this` - sets the width of the dropdown list. Accepted values: `'match-input'` (matches input width), `'auto'` (content-sized with min-width of input), or any CSS width string.
- `withItemIdProvider(provider: (item: ITEM) => string | number): this` - sets item ID provider used for generating unique IDs for accessibility and for item comparison. Default is `String(item)`.
- `withItemCaptionProvider(provider: (item: ITEM) => string): this` - sets caption provider for converting items to display text. Default is `String(item)`.
- `withVisible(visible: Observable<boolean>): this` - controls visibility of the combobox container.
- `withValue(value: Observable<ITEM | null> | Subject<ITEM | null>): this` - sets value for dropdown (which item is selected). When a `Subject` is passed the ComboBox also writes the user's selection back into it; a plain `Observable` is read-only (see [Value binding](#value-binding)).
- `withError(error: Observable<string>): this` - sets error of the dropdown.
- `withStyle(style: Observable<ComboBoxStyle>): this` - sets style of the dropdown.
- `asGlass(isGlass: boolean = true): this` - sets special styling option for combobox and its popup with items as transparent with blur background (glass effect).
- `withAriaLabel(label: string | Observable<string>): this` - sets the input's accessible name explicitly.
- `withMaxHeight(maxHeight: number | Observable<number>): this` - preferred dropdown height in px (default 256), clamped to the space available in the viewport.
- `withFilterDebounce(ms: number): this` - overrides the adaptive filter debounce (see [Filtering](#filtering)). Use e.g. 300 when `withItems` is fed by a server-side search.
- `asInlineError(): this` - *(not yet implemented)* sets error state displaying as field style change.

`build()` returns a `ComboBoxElement<ITEM>` — the container element plus a small imperative API, mirroring DatePicker's `showPopover`/`hidePopover`/`toggle`:
- `select(item: ITEM | null): void` - selects an item programmatically (updates the input text, the highlight, and writes back through `withValue` when it is a `Subject`).
- `open(): void` / `close(): void` - open or close the dropdown.

ComboBox style is an enum with the following values:
- tonal
- outlined

## Requirements
ComboBox component should accept generic type ITEM. Internally ComboBox uses `itemIdProvider` to generate unique IDs for each item and use it for selecting/comparing items.
```typescript
export class ComboBoxBuilder<ITEM> implements ComponentBuilder {
    ...
}
```
ComboBox should allow to type text and find item by its caption (caption provided by caption provider).
ComboBox should filter items only on typing also it should open dropdown in this case. 
When dropdown opens initially it is showing all items, and only when user started to change text value it is filtering items.
When dropdown opens it highlights selected item (scrolls into it if it is not visible).

### Dropdown
The dropdown is powered by `PopoverBuilder` (from `component-parts`) with a `ListBoxBuilder` (BORDERLESS style) as its content. `PopoverBuilder` handles popover element creation, anchor-relative positioning, click-outside / scroll / resize close, and width management. `isExpanded$` controls open/close by calling `popover.show()` / `popover.close()`.

`ListBoxBuilder` handles item rendering, selection highlighting, and focused-item highlighting. ComboBox drives the focused index externally via `withFocusedIndex(focusedIndex$)` — the input's `keydown` handler remains the sole writer of `focusedIndex$`. When the user clicks an item, ListBox emits via its `withValue` subject and ComboBox handles the selection (closes popup, updates input value).

When the dropdown opens with an existing selected value, that item is shown with the selection highlight (bold, `bg-on-secondary-container/20`). A "No results" message is shown when the filter produces no matches; the `<ul role="listbox">` remains in the DOM at all times for accessibility.

### Virtualization
The dropdown is virtualized: the inner `ListBoxBuilder` uses `VirtualRowsViewport`, so only a window of `<li role="option">` rows around the visible/focused area is in the DOM at any time — large option lists no longer materialize every row. This applies even in ComboBox mode (external focus index); there is no separate "render everything" path.

Because rows are sparse, ComboBox must **not** index into `ulEl.children`. Instead it gives the ListBox `withOptionIdProvider((item) => `${listboxId}-option-${itemIdProvider(item)}`)`, so every rendered option carries a stable, item-derived id. ComboBox computes the focused option's id from `currentItems[idx]` with the same formula (never reading the DOM) to set `aria-activedescendant`. Scrolling the focused row into view is handled by the ListBox (`vp.scrollToIndex`), not by ComboBox.

Ordering is safe: the ListBox subscribes to `focusedIndex$` inside its `build()` (before ComboBox's own `focusedIndex$` subscription), so when `focusedIndex$` emits, the ListBox renders and scrolls the focused row into view first — the referenced element is present in the DOM by the time ComboBox sets `aria-activedescendant`.

### Viewport-gating of items
The raw `items$` is viewport-gated **once**, at the always-visible ComboBox container, via `createOptimizedPipeline`. The gated stream is wrapped in `shareReplay({ bufferSize: 1, refCount: true })` because it has two consumers — the ComboBox's own bookkeeping subscription (currentItems / "No results" toggle) and the inner ListBox — which must share a single `IntersectionObserver`/source subscription. (Option ids are no longer assigned by ComboBox; the virtualized ListBox stamps them per-row via `withOptionIdProvider`.) The filtered list handed to the ListBox is branded as `new GatedObserver(filteredItems$)` so the ListBox does **not** re-gate it: gating on the ListBox's own container would never resolve, since the dropdown lives in a `display:none`-when-closed popover that never intersects the viewport. Net effect: `items$` is active only while the ComboBox is on-screen, and the dropdown list renders instantly on open. See [reactive.md](../reactive.md#gatedobserver-and-idempotency).

### Value binding
`withValue` accepts either a `Subject` (two-way: the ComboBox writes the user's selection back) or a plain `Observable` (read-only: the source is authoritative, the ComboBox never pushes into it). Emissions from the source are split in two:

- **Selection state** (`currentValue$`, the ListBox highlight, `aria-activedescendant` bookkeeping) always follows the source, including a `null`.
- **The input's displayed text** follows the source only when the user is *not* mid-search (`isFiltering$` false). While the user is typing, the input is theirs — an external emission updates the highlight but never overwrites the typed term. `isFiltering$` resets when the dropdown closes, so the two halves re-converge on the next emission.

### Filtering
`filteredItems$` is `shareReplay({ bufferSize: 1, refCount: true })`-ed — it has more than one subscriber, and without sharing the O(n) filter ran once per subscriber per keystroke. Item captions are lower-cased once per `items` emission and cached, rather than per keystroke per item.

The search term is debounced **adaptively**: no debounce below 100 items (small lists stay instant), 150 ms above — long enough to collapse a fast typist's burst into one filter pass, short enough to stay under the ~200 ms perceived-lag threshold. `withFilterDebounce(ms)` overrides it. The debounce is bypassed when the term is cleared, and flushed synchronously on the navigation keys (`Enter`, `ArrowDown`, `ArrowUp`, `Home`, `End`, `PageUp`, `PageDown`) so a fast "type + Enter" can never act on a stale list. The input itself is uncontrolled and echoes keystrokes immediately — only the filter is debounced.

On every filter emission the focused index is clamped to the new list length and `aria-activedescendant` is re-applied, so it cannot point at an option that the filter just removed.

### Dropdown height
The dropdown no longer uses a static `max-h-px-256`. `withMaxHeight` is plumbed into the `PopoverBuilder`'s `withMaxHeight`, which clamps the preferred height to the space available above/below the anchor and publishes `data-placement`. The resolved height is mirrored onto the ListBox's scroll element by the popover itself (`PopoverBuilder.withScrollElement(ul)` — it writes the clamped `max-height` and nudges the viewport with a `scroll` event), because the virtual viewport needs a bounded `clientHeight` to window against; the popover keeps `overflow-hidden` so only the `<ul>` scrolls.

### Keyboard Navigation (input-driven)
The input element captures all keyboard events:
- `ArrowDown` — opens dropdown if closed; moves focus to the next item (wraps)
- `ArrowUp` — opens dropdown if closed; moves focus to the previous item (wraps)
- `Home` / `End` — jumps to the first / last item
- `PageUp` / `PageDown` — moves focus by a page of items
- `Enter` — selects the focused item and closes the dropdown
- `Escape` — closes the dropdown
- **Space does NOT select** — falls through to allow typing multi-word search terms (e.g., "Ice Cream")

## Accessibility
ComboBox implements ARIA patterns for combobox:
- `role="combobox"` on the input element.
- `aria-autocomplete="list"`, `aria-expanded`, `aria-haspopup="listbox"`.
- `aria-controls` links the input to the listbox `<ul>` id.
- **Accessible name**, in priority order: `withCaption` (via `aria-labelledby` on the caption element) → `withAriaLabel` → `withPlaceholder` (via `aria-label`). When none of the three is set the builder emits a `console.warn` at configuration time — an unlabelled combobox is an axe violation, and the warning fires where the developer can act on it rather than at first render.
- `aria-activedescendant` on the input points to the ID of the currently focused item in the listbox. The id is computed from the focused item (matching the ListBox's `withOptionIdProvider` formula) when `focusedIndex$` changes, so it stays correct even though the listbox is virtualized and only a window of rows is rendered; the ListBox renders and scrolls the focused row into view first, so the referenced element is present in the DOM.
- Listbox items have `role="option"` and `aria-selected`.

## Styling
Style according to Material Design 3
When `asGlass()` is used, `glass-effect` is applied to both the `PopoverBuilder` wrapper and the `ListBoxBuilder` (which uses BORDERLESS style — see ListBox glass+BORDERLESS behavior to avoid double-glass).
Popup items have no top/bottom padding gap at the container level; the popover is `overflow-hidden` and the `<ul>` inside handles scrolling, with its max-height driven by `withMaxHeight` (see [Dropdown height](#dropdown-height)).
Popup with items has a max-width of 300px.
Hovered item in popup is highlighted with `hover:bg-on-surface/8`.
Focused item (keyboard navigation) is highlighted with `bg-on-surface/12` (not applied when item is also selected).
Currently selected item is highlighted with bold text and `bg-on-secondary-container/20` (BORDERLESS/TONAL style).
Clicking the dropdown icon (uses `Icons.CHEVRON_DOWN`) should focus the input.
Height is 48px.
Reserve space for error text only if it is not "as inline error".
Use standardized 1px borders for error states instead of thicker borders to maintain a refined, high-density look.

### Inline error state *(not yet implemented)*
On error set red outline for text field. 
Add error icon on the right inside of text field. 
Clicking this icon shows tooltip with error text.