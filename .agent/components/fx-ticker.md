# FxTicker

## Description

`FxTickerBuilder` is a reactive marquee component for streaming labelled numeric values that change over time — foreign-exchange pairs, asset prices, market quotes, or any other pair/value/delta data. Each row's value can be either a plain `number` (e.g. an FX rate `1.0843`) or a `Money` (e.g. a stock price `{ amount: 184.32, currencyId: 'USD' }`). It renders a single-line horizontal ticker that scrolls continuously, flashing per-item when an individual value changes between emissions. It is decorative by default (`aria-hidden="true"`) but exposes an opt-in announce mode for accessibility.

It is a **Type 4** component (data-table family): the public surface is `withData(Observable<FxRate[]>)`. It implements `ComponentBuilder` and follows the builder pattern (see `.agent/builder-pattern.md`). It delegates internal sub-parts to `LayoutBuilder` and `LabelBuilder`, but **does not** wrap itself in a `PanelBuilder` — the ticker is a transparent, framed element. If a glass (or any other) surface is wanted, the caller composes it: `new PanelBuilder().asGlass().withContent(new FxTickerBuilder()…)`.

## Architecture

Following the same modularization as `ChartBuilder`:

- **`FxTickerBuilder`** — public API, configuration orchestrator. Implements `ComponentBuilder`.
- **`FxTickerViewport`** — DOM orchestrator; owns the root element, label pill, marquee track, and per-tick render loop.
- **`FxTickerLogic`** — wraps the input `Observable<FxRate[]>` into a `state$` stream carrying current rates plus per-rate `delta` and `direction` (computed by diffing against the prior emission). Owns the previous-snapshot map so callers never have to populate `prev` manually.
- The "FX · live" pill is built via **`LabelBuilder`**; the two-slot horizontal frame is built via **`LayoutBuilder`**. There is no `PanelBuilder` involvement — surfaces are the caller's job.

## Data Model

```typescript
import { Money } from '../../types/money';

export interface FxRate {
    pair: string;          // e.g. 'EUR/USD' or 'AAPL' — used as the diff key
    rate: number | Money;  // current value: plain number (FX rate) or Money (price)
    decimals?: number;     // optional formatting override; default 4 for number, 2 for Money
}
```

The `rate` field is a discriminated union of `number` and `Money` (`{ amount: number; currencyId: string }` from `src/types/money.ts`). Both forms are mixable in the same `FxRate[]` — a single ticker can stream FX pairs alongside USD-denominated stock prices. The original `rate` is preserved on `TickerItem`, so any formatter that needs the currency reads it directly off `rate` (`typeof item.rate === 'number' ? null : item.rate.currencyId`).

Callers emit a `FxRate[]` — they do **not** pass `prev`. `FxTickerLogic` tracks the previous numeric value per `pair` internally (extracting `amount` when the value is `Money`) and emits an enriched stream:

```typescript
interface TickerItem {
    pair: string;
    rate: number | Money;     // unchanged from input — preserved for formatters
    amount: number;           // normalised numeric value used for diffing
    decimals: number;         // resolved default or per-item override
    delta: number;            // amount - previousAmount (0 on first sighting)
    direction: 'up' | 'down' | 'flat';
}
```

Diffing is keyed on `pair` and compares `amount`, so:

- Reordering the array between emissions is safe.
- Switching the same `pair` from `number` to `Money` (or vice versa) between emissions is allowed — `amount` stays comparable.
- Changing only the `currencyId` while `amount` stays equal counts as a flat tick (no flash). This is intentional: ticker flashes track *value* moves, not unit conversions.

## FxTickerBuilder Methods

The following methods MUST be implemented. All `with*` / `as*` methods return `this` for chaining; `build()` returns the final `HTMLElement`. Methods can be called in any order; the element is only constructed inside `build()`.

| Method | Signature | Default | Required | Purpose |
|---|---|---|---|---|
| `withData` | `(data: Observable<FxRate[]>): this` | — | yes | Sets the data source. |
| `withError` | `(error: Observable<string>): this` | `of('')` | no | Standard error slot per component convention. |
| `withLabel` | `(caption: Observable<string>): this` | `of('FX · live')` | no | Left-hand pill caption, built via `LabelBuilder`. |
| `withLabelVisible` | `(visible: Observable<boolean>): this` | `of(true)` | no | Hides the pill for edge-to-edge marquee. |
| `withRateFormatter` | `(fn: (item: TickerItem) => string): this` | `number`: `amount.toFixed(decimals)`; `Money`: locale-formatted `amount` with `rate.currencyId` symbol | no | Overrides per-rate text formatting (currency symbols, locale, separators). Formatter reads `currencyId` directly from `item.rate` when it is a `Money`. |
| `withDeltaFormatter` | `(fn: (item: TickerItem) => string): this` | `Math.abs(delta).toFixed(decimals)` (always unitless — deltas don't repeat the currency symbol) | no | Overrides per-delta text formatting. |
| `withScrollDuration` | `(seconds: Observable<number>): this` | `of(28)` | no | Marquee animation duration in seconds. |
| `withDirection` | `(direction: 'left' \| 'right'): this` | `'left'` | no | Scroll direction. |
| `withPauseOnHover` | `(enabled: boolean): this` | `true` | no | Pauses the marquee on root hover via CSS class. |
| `withFlashDuration` | `(ms: number): this` | `600` | no | Per-item flash animation duration. Cleanup timer is `ms + 50`. |
| `withFlashColors` | `(up: string, down: string): this` | `'flash-up'`, `'flash-down'` | no | Override flash color tokens. Must be theme-safelisted names, not raw hex. |
| `withClass` | `(className: Observable<string>): this` | — | no | Merges extra Tailwind classes onto the root via `cn()`. |
| `asAnnouncing` | `(): this` | off (decorative) | no | Removes `aria-hidden` and adds a throttled `aria-live="polite"` region. |
| `build` | `(): HTMLElement` | — | yes | Constructs and returns the final element. Must be called last. |

Notes:

- There is **no** `asGlass()`. The ticker is surface-less. Callers compose it inside a `PanelBuilder().asGlass()` if they want a glass card. See the "Inside a glass panel" usage example below.
- There is **no** `withValue` — this is a Type 4 data component, not a field.
- `withRateFormatter` / `withDeltaFormatter` take plain functions (not Observables): they are pure formatting logic, set once at build time. Reactive value formatting belongs in the upstream `Observable<FxRate[]>`.
- `withPauseOnHover` / `withDirection` take plain values (not Observables) because they map to a static CSS class chosen at build time. Other visual knobs that can change at runtime (`withScrollDuration`, `withLabelVisible`, etc.) take Observables.

## Implementation Requirements

- **Orchestration**: `FxTickerBuilder.build()` MUST instantiate `FxTickerViewport` and pass the `FxTickerLogic` instance to it. No DOM work happens inside the builder itself.
- **Viewport lifecycle**: `FxTickerViewport` MUST subscribe to `logic.state$` and re-render the marquee track on each emission. It MUST `registerDestroy()` to unsubscribe and clear any pending flash timers when the root element is removed from the DOM.
- **Doubled track**: the viewport MUST render each `TickerItem` twice (`[...items, ...items]`) inside the track so the `marqueeScroll` keyframe (`0 → -50%`) loops seamlessly without a visible seam. Each pair MUST be flashed in both copies on change.
- **Keyed diffing**: `FxTickerLogic` MUST key items by `pair`. When a previously-unseen pair appears, its `delta` is `0` and `direction` is `'flat'` (no flash on first sighting).
- **Number / Money normalisation**: `FxTickerLogic` MUST normalise each input `rate` into the `TickerItem`'s `amount` (extract `.amount` if `Money`, else use the number as-is). Diffing operates on `amount`. The original `rate` value is preserved on the item so formatters can render currency-aware output by reading `currencyId` directly from `rate` when it is a `Money` — `TickerItem` does NOT duplicate `currencyId` as a separate field.
- **Default formatting**: the built-in `withRateFormatter` default MUST handle both branches — plain `number` → `toFixed(decimals)`; `Money` → locale-formatted `amount` prefixed with the resolved currency symbol (reuse the same money-formatting helper used by `MoneyColumn` / `MoneyField` for consistency). Default `decimals` is `4` for `number` rates and `2` for `Money` rates.
- **No post-build manipulation**: per `.agent/builder-pattern.md`, no `classList.add`, `style.xxx`, or `appendChild` on the built element from user code. All configuration flows through builder methods. The viewport's own animation-class toggles are internal to the component and are the standard exception.
- **Reactive class composition**: `withScrollDuration`, `withLabelVisible`, etc. MUST be wired through `withClass` / `style` Observables internally; the viewport MUST NOT subscribe imperatively to user-facing inputs and mutate the DOM (use `LabelBuilder.withClass(observable)` style throughout).
- **Composition over raw HTML**: the label pill MUST be built with `LabelBuilder`. The root layout MUST be assembled via `LayoutBuilder().asHorizontal()` with two slots (label pill | marquee viewport). The ticker MUST NOT instantiate `PanelBuilder` itself — surface chrome (glass, borders, shadow) is the caller's responsibility, applied by wrapping the ticker in their own panel.
- **Cleanup**: `FxTickerViewport` MUST use `registerDestroy(root, () => { sub.unsubscribe(); flashTimers.forEach(clearTimeout); })`.
- **Pause-on-hover**: implemented via the `.marquee-paused-on-hover` utility class, NOT by toggling animation state in JS.
- **Empty / single-pair states**: when the data array is empty, the track MUST be hidden (but the surface and label remain). When there is exactly one pair, doubling still applies (one duplicate). No special case.

## Styling

### Marquee track

Animation keyframe `marqueeScroll` (already defined in `packages/landing-page/src/styles.css:285–288`) — translates `0 → -50%`. The viewport sets `animation-duration` dynamically from `withScrollDuration`.

### Flash

Keyframes `flashGreen` / `flashRed` and utility classes `.flash-green` / `.flash-red` (styles.css:290–297). The viewport adds the class on change and removes it via a tracked `setTimeout` after `flashDuration + 50` ms.

### Surface

The ticker's own root is a transparent `LayoutBuilder().asHorizontal()` frame — no background, border, shadow, or padding. To put it on a glass card, wrap it:

```typescript
new PanelBuilder().asGlass().withContent(new FxTickerBuilder().withData(rates$));
```

This keeps the ticker reusable across solid backgrounds, glass surfaces, and dense dashboards without leaking surface-specific styling into the component.

### Per-item layout

```
[pair label] [rate] [arrow + |delta|]
```

- `tabular-nums` on the row container so digits don't wobble during flash.
- Arrow glyphs: `▲` / `▼` (U+25B2 / U+25BC) — keep as text, not SVG, so they inherit `color` from the delta span.
- Pair label uses `text-label-medium font-semibold opacity-80` (M3 typography tokens).

### Theming

- Surface and label colors use M3 tokens (`text-on-surface`, `bg-surface-variant-alpha-30`, etc.) and adapt automatically to light / dark / pink themes via `themeManager`.
- Flash colors MUST go through `tailwind.config.mjs`:
  ```javascript
  theme: { extend: { colors: { 'flash-up': '#10B981', 'flash-down': '#EF4444' } } },
  safelist: ['text-flash-up', 'text-flash-down', 'bg-flash-up', 'bg-flash-down'],
  ```
  Never use `text-[#hex]` in `withClass` template literals — Tailwind's static scanner can't see them (see `.agent/components/label.md` § "Dynamic color via withClass").
- `withFlashColors(up, down)` overrides MUST also be themable token names (e.g. `'kpi-green'`), not raw hex.

## Files Structure

```
src/components/fx-ticker/
├── index.ts                  # barrel: FxTickerBuilder, FxRate (type)
├── fx-ticker-builder.ts      # FxTickerBuilder
├── fx-ticker-viewport.ts     # FxTickerViewport (internal)
├── fx-ticker-logic.ts        # FxTickerLogic + TickerItem (internal)
├── fx-ticker.css             # marquee-track, flash, paused-on-hover utilities
└── fx-ticker.test.ts
```

Only `FxTickerBuilder` and the `FxRate` interface are exported from `index.ts`. `FxTickerViewport`, `FxTickerLogic`, and `TickerItem` are internal — consistent with the chart/grid pattern.

## Usage

### Basic

```typescript
import { FxTickerBuilder } from '@tdq/ora-components';
import { interval, map, scan } from 'rxjs';

const rates$ = interval(1500).pipe(
    scan((acc) => acc.map(r => ({
        ...r,
        rate: Math.round((r.rate + (Math.random() - 0.5) * 0.002) * 10000) / 10000,
    })), [
        { pair: 'EUR/USD', rate: 1.0843 },
        { pair: 'EUR/GBP', rate: 0.8521 },
        { pair: 'EUR/JPY', rate: 168.42, decimals: 2 },
    ]),
);

const ticker = new FxTickerBuilder()
    .withData(rates$)
    .build();   // bare, surface-less — drop straight into any container
```

### Stock prices (Money rates)

```typescript
const quotes$ = new BehaviorSubject<FxRate[]>([
    { pair: 'AAPL', rate: { amount: 184.32, currencyId: 'USD' } },
    { pair: 'MSFT', rate: { amount: 421.07, currencyId: 'USD' } },
    { pair: 'BMW.DE', rate: { amount: 92.18, currencyId: 'EUR' } },
]);

new FxTickerBuilder()
    .withData(quotes$)
    .withLabel(of('Equities · live'))
    .build();   // default formatter handles Money rates with currency symbols
```

### Mixed FX pairs and prices in one ticker

```typescript
const mixed$ = of([
    { pair: 'EUR/USD', rate: 1.0843 },
    { pair: 'BTC',     rate: { amount: 67_420, currencyId: 'USD' }, decimals: 0 },
    { pair: 'GOLD',    rate: { amount: 2384.50, currencyId: 'USD' } },
]);

new FxTickerBuilder().withData(mixed$).build();
```

### On a glass card

```typescript
new PanelBuilder()
    .asGlass()
    .withContent(new FxTickerBuilder().withData(rates$))
    .build();
```

### Custom label + slower scroll, edge-to-edge

```typescript
new PanelBuilder()
    .asGlass()
    .withContent(
        new FxTickerBuilder()
            .withData(rates$)
            .withLabel(of('Markets · live'))
            .withScrollDuration(of(45))
            .withLabelVisible(of(false))   // hides pill for a clean marquee strip
    )
    .build();
```

### Accessible mode

```typescript
new FxTickerBuilder()
    .withData(rates$)
    .asAnnouncing()                        // emits throttled aria-live summaries
    .build();
```

## Migration from the inline `hero.ts` implementation

The current `packages/landing-page/src/sections/hero.ts:159–200` (`buildFxTicker`) is the de-facto prototype. Extracting it into `FxTickerBuilder` requires:

1. Move the rendering logic from `buildFxTicker` into `FxTickerViewport`.
2. Replace the caller-supplied `prev` field on `FxRate` with internal diffing in `FxTickerLogic` — callers stop maintaining `prev` themselves (the inline implementation's `.map(r => ({ ...r, prev: r.rate }))` at hero.ts:362–372 becomes unnecessary).
3. Move `marquee-track`, `flash-green`, `flash-red`, and `cursor-sweep`-adjacent utilities from `packages/landing-page/src/styles.css` into `src/components/fx-ticker/fx-ticker.css` so the component is self-contained.
4. Replace the inline raw-HTML `'FX · live'` pill with `LabelBuilder` (no innerHTML in the new component).
5. Promote the `#10B981` / `#EF4444` hex constants to theme-safelisted `flash-up` / `flash-down` color tokens in the ora-components Tailwind config (the landing-page config already has `kpi-green` / `trend-positive` precedent at `tailwind.config.mjs:38–44`).
6. The hero call site collapses to:
   ```typescript
   stack.appendChild(
       new PanelBuilder()
           .asGlass()
           .withContent(new FxTickerBuilder().withData(fxRates$))
           .build()
   );
   ```
   The glass surface stays in `hero.ts` (composed via `PanelBuilder`) — the ticker itself is surface-less. The `interval(1500)` jitter loop also stays in `hero.ts` (it's demo data generation, not part of the component).
