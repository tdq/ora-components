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
Built-in editor is **DatePickerBuilder**. It is not displaying any label. `DatePickerBuilder` has no inline-error modifier (unlike the text/number/money/percentage column editors), so a validation error on a date column falls back to the standard support-text error display.
In case if grid has `GridBuilder.asGlass()` modifier, the date picker should be initialized with `DatePickerBuilder.asGlass()` modifier.