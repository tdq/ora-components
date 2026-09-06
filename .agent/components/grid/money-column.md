# Money Column

## Description
The `MoneyColumnBuilder` formats monetary data using the `Money` object and `CurrencyRegistry`.

## Builder Methods
In addition to [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods) methods:

- `withCurrencies(currencies: string[]): this` — sets the available currencies for the inline editor's currency selector.
- `withPrecision(precision: number): this` — sets the decimal precision for formatting and inline editing.

## Implementation Details
- **Field**: Expects a `Money` object: `{ amount: number; currencyId: string; }`.
- **Rendering**: Uses `CurrencyRegistry` which utilizes `Intl.NumberFormat` for localized formatting based on the `currencyId`.

## Styling
- **Alignment**: Right-aligned by default (can be overridden via `withAlign()`).

## Editing
Built-in editor is **MoneyFieldBuilder** with `MoneyFieldBuilder.asInlineError()` modifier. It is not displaying any label.
In case if grid has `GridBuilder.asGlass()` modifier, the money field should be initialized with `MoneyFieldBuilder.asGlass()` modifier.