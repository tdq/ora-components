# Boolean Column

## Description
The `BooleanColumnBuilder` is used to display boolean values in a grid cell. By default, it renders 'Yes' for `true` and 'No' for `false`.

## Builder Methods
In addition to [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods) methods:

- `withTrueText(text: string): this`: Sets the display text for `true` values.
- `withFalseText(text: string): this`: Sets the display text for `false` values.
- `asCheckbox(): this`: Renders the boolean value as a readonly checkbox.

## Implementation Details
- **Field**: Expects a boolean value from the data item.
- **Rendering**: Returns a string based on the value and configured labels.

## Styling
- **Alignment**: Typically centered or left-aligned.
- **Color**: Inherits from row styling.
