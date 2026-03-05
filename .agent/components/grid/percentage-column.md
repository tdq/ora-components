# Percentage Column

## Description
The `PercentageColumnBuilder` formats numeric data as a percentage.

## Builder Methods
Inherits all methods from [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods).

## Implementation Details
- **Field**: Expects a decimal number (e.g., `0.75` for `75%`).
- **Rendering**: Multiplies the value by 100 and adds the `%` suffix.

## Styling
- **Alignment**: Right or Center-aligned.
