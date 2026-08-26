# ListBox

## Description
ListBox component is a custom element that is used to display a scrollable list of items.
It has the following methods:
- `withCaption(caption: Observable<string>): this` - sets caption of the ListBox.
- `withEnabled(enabled: Observable<boolean>): this` - sets enabled state of the ListBox.
- `withStyle(style: Observable<ListBoxStyle>): this` - sets style of the ListBox. Accepts TONAL, OUTLINED, or BORDERLESS.
- `withClass(className: Observable<string>): this` - sets class css name of the ListBox.
- `withItems(items: Observable<ITEM[]>): this` - sets items which are displayed in ListBox. The items source is **viewport-gated**: it is passed through `createOptimizedPipeline`, so items are not subscribed/rendered until the ListBox is visible, and the source is torn down when it scrolls off-screen. A source already branded as a `GatedObserver` (e.g. a filtered list handed down by a parent ComboBox/currency-dropdown) is used as-is — `createOptimizedPipeline` is idempotent and will not re-gate it. See [reactive.md](../reactive.md#gatedobserver-and-idempotency). Rendering is **always virtualized** — only the visible window of items is in the DOM (see [Virtual Scrolling](#virtual-scrolling)).
- `withItemCaptionProvider(provider: (item: ITEM) => string): this` - sets item caption provider which is used for converting item into a string which will be displayed in the ListBox. Default caption provider just returns string presentation of item.
- `withItemIdProvider(provider: (item: ITEM) => string | number): this` - sets item ID provider used for generating unique IDs for accessibility and for item comparison. Default is `String(item)`.
- `withValue(value: Subject<ITEM | null>): this` - sets value for ListBox (which item is selected). It is also updated by ListBox itself on item selecting.
- `withFocusedIndex(index$: Observable<number>): this` - sets an external observable that drives the keyboard-focused item index. When provided, the external observable and the ListBox's internal keyboard navigation share the same focused-index state. The external observable should only emit intentional resets (e.g., reset to 0 on items change), not continuous streams. Used by ComboBox to drive focus from the input's keydown handler.
- `withHeight(height: Observable<number>): this` - sets height for ListBox.
- `withError(error: Observable<string>): this` - sets error of the ListBox.
- `asGlass(): this` - sets special styling option for ListBox as transparent with blur background (glass effect).

ListBox style is an enum with the following values:
- `tonal` — panel with border; selected item uses secondary-container background
- `outlined` — panel with border; selected item uses primary-container background
- `borderless` — no panel border or rounding; selected item uses secondary-container background (same as tonal). Error state re-introduces a border.

## Keyboard Navigation
A standalone ListBox is tabbable: its `<ul>` carries `tabindex="0"`, so it can receive focus via `Tab`. When the ListBox is driven externally through `withFocusedIndex` (e.g. by a ComboBox whose input owns Tab focus and points at options via `aria-activedescendant`), the `<ul>` is set to `tabindex="-1"` instead so it stays out of the tab order. With focus on the `<ul>`, the following keys apply:
- `ArrowDown` — move focus to the next item (wraps from last to first)
- `ArrowUp` — move focus to the previous item (wraps from first to last)
- `Home` — move focus to the first item
- `End` — move focus to the last item
- `Enter` — select the currently focused item (emits via `withValue` subject)

All navigation keys call `preventDefault()`. 

### Focus Highlight Design
The focused item (driven by keyboard or `withFocusedIndex`) is visually distinguished to provide clear feedback:
- **Vertical Accent Bar**: A 4px wide bar on the left edge using `bg-primary`.
- **Background Layer**: 
    - Standard: `bg-on-surface/12`.
    - Glass: `bg-black/10` (light) or `bg-white/20` (dark).
- **States**: The focus highlight is distinct from selection (`bg-secondary-container`). If an item is both selected and focused, it shows the selection background and the focus accent bar.

When the `<ul>` loses focus (`focusout` with `relatedTarget` outside the list), the focus highlight is cleared.

The focused item is automatically scrolled into view via the virtual viewport's `scrollToIndex`, which adjusts the `<ul>` `scrollTop` and renders the target row. This is the same path in standalone and external-focus/ComboBox mode — both are virtualized.

## Virtual Scrolling
All list boxes are virtualized via the shared `VirtualRowsViewport` utility, so large lists stay fast — only the visible rows are ever in the DOM.

- **Windowing**: only the visible range plus a buffer of 5 rows above and below the viewport is rendered. A spacer element sized to `itemCount × rowHeight` drives the native scrollbar; each rendered `<li>` is absolutely positioned with `top: 0` and `transform: translateY(index × rowHeight)`.
- **Scroll handling**: scroll updates are throttled with `requestAnimationFrame`; a `ResizeObserver` re-renders the window when the viewport size changes.
- **Variable row heights**: each row's height is measured individually (`offsetHeight`) as it renders and cached; the spacer total and each row's `translateY` come from a cumulative prefix-sum of measured heights, so rows of differing heights never overlap. The configured `withHeight`-independent row height passed to the viewport is only an **estimate** for not-yet-measured rows (and a fallback where layout is unavailable, e.g. jsdom where `offsetHeight` is 0). When measurement corrects an estimate, the window is re-derived and rows repositioned in the same pass.
- **Bounded height required**: windowing needs a bounded scroll container — set `withHeight(...)` or place the ListBox in a height-constrained parent.
- **Accessibility**: because only a window of options is present, each rendered `<li role="option">` carries `aria-setsize` (total item count) and `aria-posinset` (index + 1) so assistive technologies announce correct totals.
- **External-focus / ComboBox mode is virtualized too**: there is no "render everything" fallback. A parent must therefore never index into `ul.children` — it addresses options by their stable, item-derived id (`withOptionIdProvider`), which is what ComboBox does for `aria-activedescendant`.
- **In-place refresh**: `refresh()` patches the already-rendered rows (`updateRows(indices)` → `patchRowContent`) instead of tearing the window down and rebuilding it, so selection/style/focus changes do not churn the DOM — this is what keeps arrow-key navigation through a 10k-item list cheap. Consequently `renderRow` must be **pure** with respect to the item: same item ⇒ same content.
- **Measurement preservation**: `setItems` keeps the measured height of any index whose item is unchanged by reference, so filtering a list does not throw away every measurement. When something other than the items changes a row's height (e.g. a style switch), call `invalidateMeasurements()` — ListBox and MultiSelectList already do this on style changes.

## Requirements
ListBox component should accept generic type ITEM. Internally ListBox uses `itemIdProvider` to generate unique IDs for each item and use it for selecting/comparing items.
```typescript
export class ListBoxBuilder<ITEM> implements ComponentBuilder {
    ...
}
```

## Styling
Style according to Material Design 3
ListBox border and border-radius has same style as Panel but with 0 padding.
ListBox items list has same styling as ComboBox dropdown items.

**Glass mode with BORDERLESS style**: When `asGlass()` is used with `BORDERLESS` style, the `glass-effect` class is NOT applied to the ListBox container (to avoid double-glass when the surrounding Popover already provides it). Items still use glass colors (`bg-white/40` for selected, `hover:bg-black/5` for hover). `glass-effect` on the container is only applied for TONAL or OUTLINED + glass.