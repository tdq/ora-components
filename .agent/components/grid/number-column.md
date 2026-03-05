# Number Column

## Description
The `NumberColumnBuilder` is used for displaying numeric data with configurable precision.

## Builder Methods
In addition to [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods) methods:

- `withDecimals(decimals: number): this`: Sets the number of decimal places to display (default: 2).

## Implementation Details
- **Field**: Expects a number or a string that can be parsed as a number.
- **Rendering**: Uses `Number().toFixed()` for formatting. Handles `null` or `undefined` by returning an empty string.

## Styling
- **Alignment**: Right-aligned is recommended for numeric data (though currently inherits default alignment).
