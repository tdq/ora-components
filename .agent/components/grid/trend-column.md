# Trend Column

## Description
The `TrendColumnBuilder` renders trend data as an inline chip inside grid cells, delegating rendering to the existing `TrendBuilder` component. Each cell displays a directional arrow (▲/▼), a formatted percentage value, and an optional period label — all colour-coded green for positive, red for negative, and neutral for flat trends.

## Builder Methods
In addition to [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods) methods:

- `withTrendProvider(provider: (item: ITEM) => Trend): this` — supplies a custom extraction function that returns a `Trend` object `{ value: number; period: string }` from the item. When not called, the column reads the field directly, expecting it to be a `Trend` object.
- `withPeriod(period: string): this` — overrides the period label for all rows with a static string. Useful when every row shares the same comparison window (e.g. `"vs last month"`). When not called, the period is taken from the `Trend` object on each item.

## Data Model

### Trend Interface
Uses the existing `Trend` type from `@tdq/ora-components`:

```typescript
interface Trend {
    value: number;   // e.g. 14.2 for +14.2%, -3.1 for -3.1%
    period: string;  // e.g. "vs last month"
}
```

### Item Field
The field bound to the column must be (or resolve to) a `Trend` object. Any of the following patterns are valid:

```typescript
// Pattern 1: item has a Trend field directly
interface MyItem {
    name: string;
    revenueTrend: Trend;  // { value: 14.2, period: 'vs last month' }
}
columns.addTrendColumn('revenueTrend').withHeader('Trend');

// Pattern 2: static period, field is just the value
interface MyItem {
    name: string;
    revenueChange: Trend;  // { value: 14.2, period: '' } — period ignored
}
columns.addTrendColumn('revenueChange')
    .withHeader('Trend')
    .withPeriod('vs last month');

// Pattern 3: custom extraction from arbitrary item shape
interface MyItem {
    name: string;
    change: number;
}
columns.addTrendColumn('change')
    .withTrendProvider((item) => ({ value: item.change, period: 'vs last qtr' }));
```

## Implementation Details

### Rendering
- Delegates to `TrendBuilder` (from `src/components/trend/trend-builder.ts`), passing a synchronous `Observable<Trend>` via `of(trend)`.
- Each cell creates a fresh `TrendBuilder` instance, which returns a `<span>` chip styled with:
  - Arrow: `▲` for positive, `▼` for negative, hidden for flat.
  - Sign: `+` for positive/zero, `-` for negative.
  - Value: formatted to 1 decimal place with `%` suffix (e.g. `+14.2%`).
  - Period: appended as plain text.
- When the trend value is `null`, `undefined`, or `NaN`, the cell renders an empty span (no visible content).
- `TrendBuilder` uses `registerDestroy` for automatic subscription cleanup when the DOM element is removed (handled by grid row recycling).

### Sorting
- Default sort value is `trend.value`. Positive trends sort higher than negative ones.
- Can be overridden via `withSortValue()` for custom sort logic.

### Editing
The trend column does **not** support inline editing. Calls to `asEditable()` on this column have no effect. Trends are typically derived or computed values, not user-editable data.

## Styling
- **Alignment**: Right-aligned by default (can be overridden via `withAlign()`).
- **Chip colours**: Uses the same CSS variables and classes as `TrendBuilder`:
  - `--mkp-trend-up` (`#10B981`) — green background and text for positive values.
  - `--mkp-trend-down` (`#EF4444`) — red background and text for negative values.
  - `--md-sys-color-on-surface-variant` — neutral for flat values.
  - CSS classes: `.trend-up`, `.trend-down`, `.trend-flat` (defined in `trend.css`).
- **Chip sizing**: `inline-flex`, `rounded-full` pill shape, `px-px-8 py-px-4` padding, `text-label-small` font with `tabular-nums` for consistent number width.

## Registration
To add the column to the column set, register it in:

1. **`types.ts`** — add `TREND = 'TREND'` to `ColumnType` enum.
2. **`columns-builder.ts`** — add `addTrendColumn(dtoField: string): TrendColumnBuilder<ITEM>` method.
3. **`columns/index.ts`** — add `export * from './trend-column'`.

## Dependencies
- `BaseColumnBuilder` — abstract base class (shared fluent methods, `createBaseColumn()`).
- `TrendBuilder` — existing standalone component for rendering trend chips.
- `Trend` type — `{ value: number; period: string }` from `src/types/trend.ts`.
- RxJS `of` — for wrapping the statically-resolved `Trend` into an Observable for `TrendBuilder.withTrend()`.

## Edge Cases

| Condition | Behaviour |
|-----------|-----------|
| `null` or `undefined` value | Empty span |
| `NaN` value | Empty span |
| Missing field on item | Empty span |
| Value is exactly `0` | Flat display: `0.0%` with period (no arrow, neutral colour) |
| Period is missing or empty string | Only value and percentage shown (e.g. `+14.2%`) |
| `withPeriod()` called alongside `withTrendProvider()` | `withTrendProvider` takes precedence for value; `withPeriod` overrides the period in the returned `Trend` |
| Very large values | `toFixed(1)` applied so values like `1024.567` → `+1024.6%` |
| Multiple columns on same grid | Each cell independently creates its own `TrendBuilder` instance — no state is shared |
