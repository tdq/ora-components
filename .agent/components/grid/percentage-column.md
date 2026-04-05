# Percentage Column

## Description
The `PercentageColumnBuilder` formats numeric data as a percentage.

## Builder Methods
Inherits all methods from [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods).

## Implementation Details
- **Field**: Expects a decimal number (e.g., `0.75` for `75%`).
- **Rendering**: Multiplies the value by 100 and adds the `%` suffix. Decimal percentages are supported (e.g., `0.285` → `28.5%`). Trailing zeros are stripped, so `0.75` renders as `75%` not `75.00%`.

## Styling
- **Alignment**: Right or Center-aligned.

## Editing
Built-in editor is **NumberFieldBuilder** with `asInlineError()` modifier. It is not displaying any label.
In case if grid has `asGlass()` modifier, the number field should be initialized with `asGlass()` modifier.
It also should have `withSuffix(of('%'))`.