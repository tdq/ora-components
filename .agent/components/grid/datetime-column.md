# DateTime Column

## Description
The `DateTimeColumnBuilder` is used to display both date and time in a grid cell.

## Builder Methods
Inherits all methods from [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods).

## Implementation Details
- **Field**: Expects a `Date` object or a string/number that can be parsed as a date.
- **Rendering**: Converts the value to a localized date and time string using `toLocaleString()`.

## Styling
- **Alignment**: Left-aligned.
