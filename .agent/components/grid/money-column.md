# Money Column

## Description
The `MoneyColumnBuilder` formats numeric data as currency.

## Builder Methods
In addition to [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods) methods:

- `withCurrency(currency: string): this`: Sets the ISO currency code (default: `'USD'`).

## Implementation Details
- **Field**: Expects a number or a string that can be parsed as a number.
- **Rendering**: Uses `Intl.NumberFormat` with `style: 'currency'` for formatting.

## Styling
- **Alignment**: Right-aligned is recommended.
