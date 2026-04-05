# Date Column

## Description
The `DateColumnBuilder` is used to display dates in a grid cell.

## Builder Methods
In addition to [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods) methods:

- `withFormat(format: string): this`: Sets the date display format. (Note: Currently uses default `toLocaleDateString()`).

## Implementation Details
- **Field**: Expects a `Date` object or a string/number that can be parsed as a date.
- **Rendering**: Converts the value to a localized date string.

## Styling
- **Alignment**: Center or Left aligned.

## Editing
Built-in editor is **DatePickerBuilder** with `asInlineError()` modifier. It is not displaying any label.
In case if grid has `asGlass()` modifier, the date picker should be initialized with `asGlass()` modifier.