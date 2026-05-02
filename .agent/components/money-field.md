# MoneyField

## Description
`MoneyField` is a specialized input component for handling monetary values. It consists of a numeric input for the amount and a currency selector (dropdown or suffix). It handles localized formatting, input validation, and follows Material Design 3 guidelines with optional glass effects.

The component uses the `Money` interface for its value:
```typescript
interface Money {
    amount: number;
    currencyId: string;
}
```
This interface is located in `src/types/money.ts`.

## Methods
- `withValue(value: Subject<Money | null>): this` — sets the reactive value stream.
- `withLabel(label: Observable<string>): this` — sets the floating label text.
- `withPlaceholder(placeholder: Observable<string>): this` — sets the placeholder text.
- `withCurrencies(currencies: string[]): this` — sets the list of available currency IDs. If multiple, shows a dropdown; if one, shows a static suffix.
- `withEnabled(enabled: Observable<boolean>): this` — reactive control for disabled state.
- `withStyle(style: Observable<FieldStyle>): this` — sets the field variant (`TONAL` or `OUTLINED`).
- `withError(error: Observable<string>): this` — sets the validation error message.
- `withFormat(format: Observable<string>): this` — sets number format (e.g., "integer").
- `withPrecision(precision: Observable<number>): this` — sets decimal precision for display.
- `withMinValue(min: Observable<number>): this` — sets the minimum allowed amount.
- `withMaxValue(max: Observable<number>): this` — sets the maximum allowed amount.
- `withStep(step: Observable<number>): this` — sets the increment/decrement step for keyboard navigation.
- `withLocale(locale: Observable<string>): this` — sets the locale for number formatting.
- `withClass(className: Observable<string>): this` — adds custom CSS classes to the container.
- `asGlass(): this` — enables glass-effect styling.
- `asInlineError(): this` — enables inline error display (icon with popover) instead of support text.

## Example
```typescript
import { MoneyFieldBuilder, MoneyFieldStyle } from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';

const value$ = new BehaviorSubject({ amount: 1250.50, currencyId: 'USD' });
const currencies = ['USD', 'EUR', 'GBP'];

const moneyField = new MoneyFieldBuilder()
    .withLabel(of('Transaction Amount'))
    .withValue(value$)
    .withCurrencies(currencies)
    .withStyle(of(MoneyFieldStyle.OUTLINED))
    .build();

document.body.appendChild(moneyField);
```

## Implementation Details
- **Formatting**: Uses `Intl.NumberFormat` via `formatNumber` utility and `CurrencyRegistry` for symbols.
- **Validation**: Numbers are right-aligned. Input is filtered to allow only valid numeric characters based on locale and format.
- **Constraints**: Values are clamped to `min`/`max` and rounded to the configured `precision` (or the precision of the `step` if precision is not explicitly set) on blur.
- **Keyboard Navigation**:
    - `ArrowUp`/`ArrowDown`: Increment/decrement by step (rounds to the nearest step).
    - `PageUp`/`PageDown`: Increment/decrement by step × 10 (rounds to the nearest step).
    - `Home`/`End`: Jump to min/max values if defined.

## Styling
- Height is fixed at `48px`.
- Supports Material 3 `TONAL` and `OUTLINED` variants.
- **Glass Effect**: When `asGlass()` is called, it applies backdrop-blur and semi-transparent backgrounds.
- **Inline Errors**: When `asInlineError()` is called, validation errors appear as an icon in the suffix that shows a popover on click.
- **High-density Layout**: 0 gap between input and currency selector for a unified, compact appearance.
- **Standardized Error Styling**: 1px error borders to maintain a refined, high-density look.
- **Currencies dropdown**: Inline part is placed on the right side of the field as inline dropdown element and has fixed width of 1rem (to display only currency symbol). It is completely borderless. The inline selector displays only the currency symbol, while the dropdown list displays both the symbol and the currency name (via `Intl.DisplayNames`). The dropdown part width adjusts to fit the content (max 300px, end-aligned).

  The dropdown list is rendered using `ListBoxBuilder` (BORDERLESS style) inside a `PopoverBuilder`. When the dropdown opens, the current currency is pre-selected in the ListBox and the `<ul>` is focused for immediate keyboard navigation. Keyboard navigation is fully delegated to ListBox (ArrowDown/Up/Home/End/Enter — wraps around). The trigger button handles: ArrowDown/ArrowUp/Space to open, Escape to close.
