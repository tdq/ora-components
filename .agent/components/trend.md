# Trend

## Description

`TrendBuilder` is a small display component that renders a trend indicator chip — a directional arrow, formatted percentage value, and period label. It accepts a `Trend` object via an Observable and automatically derives direction styling (up/green, down/red, flat/neutral) from the sign of the value. It is a **Type 2** component (display): no user interaction, no data mutation.

The `Trend` type is located in `src/types/trend.ts`:

```typescript
export interface Trend {
    value: number;    // percentage value (e.g. 0.4 → "+0.4%", -1.2 → "-1.2%")
    period: string;   // time period label (e.g. "today", "MoM", "this week")
}
```

Direction is derived automatically from the sign of `value`:
- `value > 0` → up arrow, positive theme color
- `value < 0` → down arrow, negative theme color
- `value === 0` → no arrow, neutral theme color

## TrendBuilder Methods

| Method | Signature | Default | Required | Purpose |
|---|---|---|---|---|
| `withTrend` | `(trend$: Observable<Trend>): this` | — | yes | Sets the trend data source. |
| `withClass` | `(className$: Observable<string>): this` | — | no | Merges extra Tailwind classes onto the root element via `cn()`. |
| `withTestId` | `(id: string): this` | — | no | Sets `data-testid` on the rendered host element. See [Test ids](../builder-pattern.md#test-ids). |
| `build` | `(): HTMLElement` | — | yes | Constructs and returns the final element. Must be called last. |

- `withTestId(id: string): this` — sets `data-testid` on the rendered host element. See [Test ids](../builder-pattern.md#test-ids).

All `with*` methods return `this` for chaining. Methods can be called in any order; the element is only constructed inside `build()`.

## Rendered Output

```
┌─────────────────────┐
│ ▲ +0.4% today       │   value > 0  → green (theme token positive)
│ ▼ -1.2% MoM         │   value < 0  → red (theme token negative)
│  0.0% this week     │   value = 0  → neutral (on-surface-variant)
└─────────────────────┘
```

The chip uses:
- `tabular-nums` for stable digit widths
- `text-label-small font-semibold` for typography
- Arrow glyphs: `▲` (U+25B2) / `▼` (U+25BC) — text characters that inherit color
- CSS custom properties `--mkp-trend-up` (default `#10B981` green) and `--mkp-trend-down` (default `#EF4444` red) for theming

## Styling

TrendBuilder uses CSS custom properties for colors:

- `.trend-up` — `color: var(--mkp-trend-up)`, `background: color-mix(in srgb, var(--mkp-trend-up) 12%, transparent)`. Defaults to `#10B981` (green).
- `.trend-down` — `color: var(--mkp-trend-down)`, `background: color-mix(in srgb, var(--mkp-trend-down) 12%, transparent)`. Defaults to `#EF4444` (red).
- `.trend-flat` — `color: var(--md-sys-color-on-surface-variant)`, `background: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 8%, transparent)`.

All theme tokens adapt automatically to light / dark / pink themes via `themeManager`.

## Files Structure

```
src/components/trend/
├── index.ts            # barrel: TrendBuilder
├── trend-builder.ts    # TrendBuilder
└── trend.css           # trend-up, trend-down, trend-flat
```

Only `TrendBuilder` is exported from `index.ts`. The `Trend` type is exported from `src/types/trend.ts` and re-exported at the package root.

## Usage

### Basic

```typescript
import { TrendBuilder } from '@tdq/ora-components';
import { of } from 'rxjs';

const trend$ = of({ value: 0.4, period: 'today' });

const chip = new TrendBuilder()
    .withTrend(trend$)
    .build();
// Renders: ▲ +0.4% today (green)
```

### Reactive with custom class

```typescript
import { TrendBuilder } from '@tdq/ora-components';
import { BehaviorSubject } from 'rxjs';

const trend$ = new BehaviorSubject<Trend>({ value: -1.2, period: 'MoM' });

const chip = new TrendBuilder()
    .withTrend(trend$)
    .withClass(of('ml-auto'))
    .build();
// Renders: ▼ -1.2% MoM (red), pushed to the right via ml-auto

// Later:
trend$.next({ value: 2.8, period: 'QoQ' });
// Re-renders: ▲ +2.8% QoQ (green)
```

### Inside a MoneyKPICard

```typescript
new MoneyKPICardBuilder()
    .withValue(money$)
    .withLabel(of('Cash on Hand'))
    .withTrend(of({ value: 0.4, period: 'today' }))
    .build();
```

`MoneyKPICardBuilder` composes `TrendBuilder` internally — callers do not need to instantiate `TrendBuilder` directly when using `withTrend()` on the card.
