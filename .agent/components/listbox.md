# ListBox

## Description
ListBox component is a custom element that is used to display a scrollable list of items.
It has the following methods:
- `withCaption(caption: Observable<string>): this` - sets caption of the ListBox.
- `withEnabled(enabled: Observable<boolean>): this` - sets enabled state of the ListBox.
- `withStyle(style: Observable<ListBoxStyle>): this` - sets style of the ListBox. Accepts TONAL, OUTLINED, or BORDERLESS.
- `withClass(className: Observable<string>): this` - sets class css name of the ListBox.
- `withItems(items: Observable<ITEM[]>): this` - sets items which are displayed in ListBox. The items source is **viewport-gated**: it is passed through `createOptimizedPipeline`, so items are not subscribed/rendered until the ListBox is visible, and the source is torn down when it scrolls off-screen. A source already branded as a `GatedObserver` (e.g. a filtered list handed down by a parent ComboBox/currency-dropdown) is used as-is — `createOptimizedPipeline` is idempotent and will not re-gate it. See [reactive.md](../reactive.md#gatedobserver-and-idempotency).
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
ListBox supports full keyboard navigation when the `<ul>` element has focus (`tabindex="-1"`, focusable programmatically):
- `ArrowDown` — move focus to the next item (wraps from last to first)
- `ArrowUp` — move focus to the previous item (wraps from first to last)
- `Home` — move focus to the first item
- `End` — move focus to the last item
- `Enter` — select the currently focused item (emits via `withValue` subject)

All navigation keys call `preventDefault()`. The focused item is highlighted with `bg-on-surface/12` (distinct from the selection highlight). When the `<ul>` loses focus (`focusout` with `relatedTarget` outside the list), the focus highlight is cleared.

The focused item is automatically scrolled into view (`scrollIntoView({ block: 'nearest' })`).

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