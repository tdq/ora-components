# Percentage Column

## Description
The `PercentageColumnBuilder` formats numeric data as a percentage.

## Builder Methods
Inherits all methods from [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods).

## Implementation Details
- **Field**: Expects a decimal number (e.g., `0.75` for `75%`).
- **Rendering**: Multiplies the value by 100 and adds the `%` suffix. Decimal percentages are supported (e.g., `0.285` → `28.5%`). Trailing zeros are stripped, so `0.75` renders as `75%` not `75.00%`.

## Styling
- **Alignment**: Right-aligned by default (can be overridden via `withAlign()`).

## Editing
Built-in editor is **NumberFieldBuilder** with `NumberFieldBuilder.asInlineError()` modifier. It is not displaying any label.
In case if grid has `GridBuilder.asGlass()` modifier, the number field should be initialized with `NumberFieldBuilder.asGlass()` modifier.
It also should have `NumberFieldBuilder.withSuffix(of('%'))` and enforces a precision of 2 decimal places.