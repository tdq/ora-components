# MoneyKPICard

## Description

`MoneyKPICardBuilder` is a reactive KPI card component for displaying live monetary values with currency-aware formatting, trend indicators, and animations. It accepts an `Observable<Money>` for the primary value, formats it via `CurrencyRegistry`, and renders a card with label, formatted amount (with rolling-digit animation on cents), an optional trend chip, and an optional description line. Value changes automatically trigger flash and rolling-digit animations.

It is a **Type 2** component (display): it shows data, has no user interaction, and makes no data mutations. It implements `ComponentBuilder` and follows the builder pattern (see `.agent/builder-pattern.md`). It delegates to `LabelBuilder` and `TrendBuilder` where possible, but uses direct DOM construction for the animated value row (necessary for per-element animation targeting at `data-money-whole` and `data-money-cents`). The card handles its own surface styling — it does NOT wrap itself in `PanelBuilder`.

## Architecture

Following the same 3-tier pattern as `FxTickerBuilder`:

- **`MoneyKPICardBuilder`** — public API, configuration orchestrator. Implements `ComponentBuilder`.
- **`MoneyKPICardViewport`** — DOM orchestrator; owns the root element, builds the card layout, manages subscriptions, and runs flash/roll animations on value changes.
- **`MoneyKPICardLogic`** — wraps the input `Observable<Money>` into a `state$` stream carrying `MoneyKPIData`: the current and previous `Money`, the formatted whole/cents/symbol parts, and the direction of change (up/down/flat).

## Data Model

```typescript
import { Money } from '../../types/money';
import { Trend } from '../../types/trend';

export interface MoneyKPIData {
    money: Money;
    previousMoney: Money | null;
    direction: 'up' | 'down' | 'flat';
    formatted: {
        symbol: string;      // "€", "$", "£", etc. from CurrencyRegistry
        whole: string;       // "2,481,902"
        cents: string;       // "14"
        full: string;        // "€2,481,902.14"
    };
}
```

The logic layer uses **math-based splitting** (not string parsing of `Intl` output) to separate whole and cents: `Math.floor(amount)` and `Math.round((amount - integer) * 100)`. This avoids locale-dependent decimal-separator ambiguities. The `symbol` comes from `CurrencyRegistry.getSymbol(currencyId)`. `CurrencyRegistry.format()` is used for the `full` string only (for aria-label and copy purposes).

## MoneyKPICardBuilder Methods

| Method | Signature | Default | Required | Purpose |
|---|---|---|---|---|
| `withValue` | `(value$: Observable<Money>): this` | — | yes | Sets the monetary value source. Drives display formatting and triggers animations on change. |
| `withLabel` | `(label$: Observable<string>): this` | — | no | KPI card title displayed above the value (e.g. "Cash on Hand"). |
| `withTrend` | `(trend$: Observable<Trend>): this` | — | no | Trend indicator chip displayed next to the label. Delegates to `TrendBuilder` internally. |
| `withDescription` | `(description$: Observable<string>): this` | — | no | Text line displayed below the value (e.g. "live · reconciled to the cent"). Rendered with class `mkp-description` for CSS icon injection. |
| `withPrecision` | `(precision: number \| Observable<number>): this` | `2` | no | Number of decimal places for the cents display. Passed to `CurrencyRegistry.format()`. |
| `withClass` | `(className$: Observable<string>): this` | — | no | Merges extra Tailwind classes onto the root element via `cn()`. |
| `asGlass` | `(): this` | off | no | Wraps the card in a glass surface via `PanelBuilder().asGlass()`. |
| `build` | `(): HTMLElement` | — | yes | Constructs and returns the final element. Must be called last. |

All `with*` / `as*` methods return `this` for chaining and can be called in any order.

## DOM Structure

```
<div class="mkp-root [glass?] ...">
  ┌──────────────────────────────────────────┐
  │ <LabelBuilder> label </LabelBuilder>     │  ← withLabel
  │ [ <TrendBuilder> trend chip </> ]        │  ← withTrend (conditional)
  ├──────────────────────────────────────────┤
  │ <span class="mkp-symbol"> € </span>      │  ← from CurrencyRegistry
  │ <span class="mkp-whole"> 2,481,902 </span>│  ← flash animation target
  │ <span class="mkp-sep"> . </span>         │
  │ <span class="mkp-cents"> 14 </span>      │  ← rolling-digit target
  ├──────────────────────────────────────────┤
  │ <span class="mkp-description"> ... </span>│  ← withDescription (conditional)
  └──────────────────────────────────────────┘
</div>
```

## Animations

Animations are always enabled. The component CSS defines namespaced keyframes and respects `prefers-reduced-motion`.

### Rolling-digit (cents change)

When the cents portion changes between `state$` emissions, the `.mkp-cents` span receives the `.mkp-roll-digit` class. The class is removed, a forced reflow triggers (`void el.offsetWidth`), then the class is reapplied. This re-triggers the CSS animation each time.

```css
@keyframes mkp-roll-digit {
    from { opacity: 0; transform: translateY(-40%); }
    to   { opacity: 1; transform: translateY(0); }
}
.mkp-roll-digit {
    animation: mkp-roll-digit 250ms cubic-bezier(0.22, 1, 0.36, 1) both;
    display: inline-block;
}
```

### Flash (value change)

When the value changes, only the whole-number span (`.mkp-whole` equivalent) receives a flash class — the currency symbol and decimal separator are unaffected:

- `money.direction === 'up'` → `.mkp-flash-up` (green background flash)
- `money.direction === 'down'` → `.mkp-flash-down` (red background flash)
- `money.direction === 'flat'` → no flash

The class is added, then removed after the animation duration via `animationend` listener.

```css
@keyframes mkp-flash-up   { 0% { background: rgba(16, 185, 129, 0.35); } 100% { background: transparent; } }
@keyframes mkp-flash-down { 0% { background: rgba(239, 68, 68, 0.35); }  100% { background: transparent; } }
.mkp-flash-up   { animation: mkp-flash-up   600ms ease-out 1; border-radius: 4px; }
.mkp-flash-down { animation: mkp-flash-down 600ms ease-out 1; border-radius: 4px; }
```

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
    .mkp-roll-digit { animation: none; }
    .mkp-flash-up, .mkp-flash-down { animation: none; }
}
```

## Styling

Value color uses theme design tokens — `var(--md-sys-color-on-surface)` by default, adapting automatically to light / dark / pink themes. No consumer-supplied color classes. The card surface uses M3 tokens (`bg-surface-variant-alpha-30`, `border-outline-alpha-20`, `shadow-level-2`) when not in glass mode.

### Glass mode

When `asGlass()` is called, the card body adds `backdrop-blur-md bg-surface-variant-alpha-20` instead of the default solid `bg-surface-variant-alpha-30`. No `PanelBuilder` wrapping — the card manages its own surface styling directly.

### Description icon injection

Consumers add icons to the description line via CSS using the `.mkp-description` class:

```css
.mkp-description::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--kpi-green);
    margin-right: 4px;
}
```

The component does not ship a built-in icon — styling is consumer responsibility via `withClass` or external CSS.

## Implementation Requirements

- **Orchestration**: `MoneyKPICardBuilder.build()` instantiates `MoneyKPICardViewport` and passes the `MoneyKPICardLogic` instance. No DOM work happens inside the builder itself.
- **Viewport lifecycle**: `MoneyKPICardViewport` subscribes to `logic.state$` and updates the value row on each emission. It uses `registerDestroy()` to unsubscribe when the root element is removed from the DOM.
- **Delegation**: The header row (label + trend) uses `LabelBuilder` and `TrendBuilder`. The value row uses direct DOM construction — necessary for `data-money-whole` / `data-money-cents` targeting for animations. The panel wrapper uses `PanelBuilder` (with glass support).
- **Math-based formatting split**: `MoneyKPICardLogic` uses `Math.floor()` and math-based rounding for whole/cents separation, never string parsing of `Intl.NumberFormat` output. This is locale-safe.
- **CurrencyRegistry integration**: The logic layer calls `CurrencyRegistry.getSymbol(currencyId)` for the symbol and `CurrencyRegistry.format(money, precision)` for the aria-label `full` string.
- **No post-build manipulation**: Per `.agent/builder-pattern.md`, no `classList.add`, `style.xxx`, or `appendChild` on the built element from user code. All configuration flows through builder methods. Animation class toggles inside the viewport are internal.
- **Animations always on**: Unlike the prototype's toggle API, `MoneyKPICardBuilder` always enables both rolling-digit and flash animations. Callers do not need to configure animation behavior.

## Files Structure

```
src/components/money-kpi-card/
├── index.ts                     # barrel: MoneyKPICardBuilder
├── money-kpi-card-builder.ts    # MoneyKPICardBuilder
├── money-kpi-card-viewport.ts   # MoneyKPICardViewport (internal)
├── money-kpi-card-logic.ts      # MoneyKPICardLogic + MoneyKPIData (internal)
├── money-kpi-card.css           # mkp-roll-digit, mkp-flash-up/down, reduced-motion
└── money-kpi-card-builder.test.ts
```

Only `MoneyKPICardBuilder` is exported from `index.ts`. `MoneyKPICardViewport`, `MoneyKPICardLogic`, and `MoneyKPIData` are internal — consistent with the FxTicker pattern.

## Usage

### Basic

```typescript
import { MoneyKPICardBuilder } from '@tdq/ora-components';
import { BehaviorSubject } from 'rxjs';

const money$ = new BehaviorSubject<Money>({ amount: 2481902.14, currencyId: 'EUR' });

const card = new MoneyKPICardBuilder()
    .withValue(money$)
    .withLabel(of('Cash on Hand'))
    .build();
```

### With trend and description

```typescript
import { MoneyKPICardBuilder } from '@tdq/ora-components';
import { of } from 'rxjs';

const money$ = new BehaviorSubject<Money>({ amount: 2481902.14, currencyId: 'EUR' });

const card = new MoneyKPICardBuilder()
    .withValue(money$)
    .withLabel(of('Cash on Hand'))
    .withTrend(of({ value: 0.4, period: 'today' }))
    .withDescription(of('live · reconciled to the cent'))
    .asGlass()
    .build();
```

### Reactive streams

```typescript
import { interval, map, scan } from 'rxjs';

const cash$ = interval(2000).pipe(
    scan((acc) => acc + (Math.random() - 0.5) * 380, 2481902.14),
    map(amount => ({ amount, currencyId: 'EUR' }))
);

const card = new MoneyKPICardBuilder()
    .withValue(cash$)
    .withLabel(of('Cash on Hand'))
    .withDescription(of('live · reconciled to the cent'))
    .asGlass()
    .build();
```

### Multi-currency

```typescript
const usdValue$ = of({ amount: 525000.00, currencyId: 'USD' });

const card = new MoneyKPICardBuilder()
    .withValue(usdValue$)
    .withLabel(of('US Revenue'))
    .build();
// Renders: $525,000.00 with US locale formatting
```

## Migration from `cash-on-hand-tile.ts`

The current `packages/landing-page/src/components/dashboard/cash-on-hand-tile.ts` is a raw DOM prototype. Replacing it with `MoneyKPICardBuilder`:

1. Delete `cash-on-hand-tile.ts` — fully replaced.
2. In `dashboard-demo.ts`, wrap the `BehaviorSubject<number>` in `Observable<Money>`:
   ```typescript
   // Old: cash$ = BehaviorSubject<number>
   // New:
   const cashMoney$ = cash$.pipe(map(amount => ({ amount, currencyId: 'EUR' })));
   ```
3. Replace `buildCashOnHandTile(cash$, sub)` with:
   ```typescript
   new MoneyKPICardBuilder()
       .withValue(cashMoney$)
       .withLabel(of('Cash on Hand'))
       .withTrend(of({ value: 0.4, period: 'today' }))
       .withDescription(of('live · reconciled to the cent'))
       .asGlass()
       .build()
   ```
4. The `sub` parameter is no longer needed — `MoneyKPICardBuilder` manages its own subscriptions via `registerDestroy`.
5. After migration, remove `.flash-green`, `.flash-red`, and `.roll-digit` from the landing-page `styles.css` — these are now namespaced under `mkp-` in the component's own CSS and no longer referenced in the landing page.
