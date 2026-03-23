# Checkbox

## Description
Checkbox component is a custom element that is used to display a checkbox.
It has the following methods:
- `withCaption(caption: Observable<string>): this` - sets caption of the checkbox.
- `withEnabled(enabled: Observable<boolean>): this` - sets enabled state of the checkbox.
- `withClass(className: Observable<string>): this` - sets class css name of the checkbox.
- `withValue(value: Subject<boolean>): this` - sets value for checkbox.
- `asGlass(): this` - sets special styling option for checkbox and its popup with items as transparent with blur background (glass effect). 

## Styling
Style according to Material Design 3
Glass effect applied only for checkbox clickable part which contains check mark. 
Uses `Icons.CHECKMARK` for the selection indicator.