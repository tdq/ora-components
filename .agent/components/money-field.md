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
- `withTestId(id: string): this` — sets `data-testid` on the rendered `<input>`. See [Test ids](../builder-pattern.md#test-ids).

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
- **Formatting**: Uses `Intl.NumberFormat` via `formatNumber` utility and `CurrencyRegistry` for symbols. The displayed value is **always grouped** (`formatNumber(..., { useGrouping: true })`) — this is not configurable per instance; it matches `MoneyColumn` and `MoneyKPICard` so the same amount reads identically across the grid, KPI cards and this field. Grouping is applied on sync (initial render, external `value$` pushes, and on blur) and preserved while the user is actively typing, so digits don't jump as separators are inserted/removed mid-edit.
- **Locale-derived separators**: The grouping character, decimal character and minus-sign glyph are all derived from `Intl.NumberFormat(locale).formatToParts()` via `getLocaleSeparators` (`utils/number.ts`), not a hand-rolled `'.'`/`','`/`'-'` heuristic. This covers locales that group with a (narrow) no-break space (`fr-FR`, `pt-PT`) or a right single quotation mark (`de-CH`), and locales whose minus sign is U+2212 rather than ASCII `-` (`sv-SE`, `nb-NO`, `fi-FI`). `MoneyKPICard` reads the same separators through the same `getLocaleSeparators` cache.
- **Symmetric parsing**: `normalizeLocaleNumberString` strips the locale's grouping separator (including its whitespace variants) and normalizes the decimal and minus characters back to `.`/`-` before `parseFloat`, so a value formatted for display can always be typed back in and parsed to the same number, for every supported locale.
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

  Because the ListBox is viewport-gated by default and lives inside a `display:none`-when-closed popover (which never intersects the viewport), the static currency list is branded as `new GatedObserver(of(currencyItems))` before being passed to `withItems`. This makes the ListBox render eagerly instead of waiting for a visibility signal that would never arrive. See [reactive.md](../reactive.md#gatedobserver-and-idempotency).

## Gotchas

- MoneyField always groups thousands and derives grouping/decimal separators from `Intl.NumberFormat` per locale (not configurable per instance; matching MoneyColumn and MoneyKPICard).

## Keyboard
- When popover is expanded focus on ListBox. Up and Down keys are used to select next or previous elements.
- When popover is closed (by selecting an item or pressing Escape), focus returns to the currency button.