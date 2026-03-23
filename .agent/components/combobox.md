# ComboBox

## Description
ComboBox component is a custom element that is used to display a dropdown.
It has the following methods:
- `withCaption(caption: Observable<string>): this` - sets caption of the dropdown.
- `withPlaceholder(placeholder: string): this` - sets the placeholder text for the input element.
- `withEnabled(enabled: Observable<boolean>): this` - sets enabled state of the dropdown.
- `withClass(className: Observable<string>): this` - sets class css name of the dropdown.
- `withItems(items: Observable<ITEM[]>): this` - sets items which are displayed in dropdown.
- `withItemCaptionProvider(provider: (item: ITEM) => string): this` - sets item caption provider which is used for converting item into a string which will be displayed in the dropdown. Default caption provider just returns string presentation of item.
- `withItemIdProvider(provider: (item: ITEM) => string | number): this` - sets item ID provider used for generating unique IDs for accessibility and for item comparison. Default is `String(item)`.
- `withValue(value: Subject<ITEM | null>): this` - sets value for dropdown (which item is selected). It is also updated by dropdown itself on item selecting.
- `withError(error: Observable<string>): this` - sets error of the dropdown.
- `withStyle(style: Observable<ComboBoxStyle>): this` - sets style of the dropdown.
- `asGlass(): this` - sets special styling option for combobox and its popup with items as transparent with blur background (glass effect).
- `asInlineError(): this` - sets error state displaying as field style change.

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
It should open by calling `showPopover()` method.
It should close on any event outside of the dropdown.

## Accessibility
ComboBox implements ARIA patterns for combobox:
- `role="combobox"` on the input element.
- `aria-autocomplete="list"`, `aria-expanded`, `aria-haspopup="listbox"`.
- `aria-controls` links the input to the listbox ID.
- `aria-activedescendant` on the input points to the ID of the currently focused item in the listbox.
- Listbox items have `role="option"` and `aria-selected`.

## Styling
Style according to Material Design 3 
Popup with items should have background according to combobox style (tonal or outline).
Popup with items should have limited height.
Hovered item in popup should be highlighted with darker background.
Currently selected item also should be highlighted in popup by using bold text style.
Clicking the dropdown icon (uses `Icons.CHEVRON_DOWN`) should focus the input.
Height is 48px.
Reserve space for error text only if it is not "as inline error".

### Inline error state
On error set red outline for text field. 
Add error icon on the right inside of text field. 
Clicking this icon shows tooltip with error text.