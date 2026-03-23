# ListBox

## Description
ListBox component is a custom element that is used to display a scrollable list of items.
It has the following methods:
- `withCaption(caption: Observable<string>): this` - sets caption of the ListBox.
- `withEnabled(enabled: Observable<boolean>): this` - sets enabled state of the ListBox.
- `withStyle(style: ListBoxStyle): this` - sets style of the ListBox.
- `withClass(className: Observable<string>): this` - sets class css name of the ListBox.
- `withItems(items: Observable<ITEM[]>): this` - sets items which are displayed in ListBox.
- `withItemCaptionProvider(provider: (item: ITEM) => string): this` - sets item caption provider which is used for converting item into a string which will be displayed in the ListBox. Default caption provider just returns string presentation of item.
- `withItemIdProvider(provider: (item: ITEM) => string | number): this` - sets item ID provider used for generating unique IDs for accessibility and for item comparison. Default is `String(item)`.
- `withValue(value: Subject<ITEM | null>): this` - sets value for ListBox (which item is selected). It is also updated by ListBox itself on item selecting.
- `withHeight(height: Observable<number>): this` - sets height for ListBox.
- `withError(error: Observable<string>): this` - sets error of the ListBox.
- `asGlass(): this` - sets special styling option for ListBox as transparent with blur background (glass effect). 

ListBox style is an enum with the following values:
- tonal
- outlined

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