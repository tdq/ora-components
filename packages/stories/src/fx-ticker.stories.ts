import { FxTickerBuilder, FxRate, PanelBuilder, LayoutBuilder, LayoutGap } from '@tdq/ora-components';
import { BehaviorSubject, interval, of } from 'rxjs';
import { scan } from 'rxjs/operators';
import { createGlassBackdrop, GLASS_GRADIENTS } from './story-helpers';

export default {
    title: 'Components/FxTicker',
    tags: ['autodocs', 'stable', 'reactive'],
};

// ---------------------------------------------------------------------------
// Static seed data (deterministic — no Math.random at module scope)
// ---------------------------------------------------------------------------

const FX_SEED: FxRate[] = [
    { pair: 'EUR/USD', rate: 1.0843 },
    { pair: 'EUR/GBP', rate: 0.8521 },
    { pair: 'EUR/JPY', rate: 168.42, decimals: 2 },
    { pair: 'EUR/CHF', rate: 0.9612 },
    { pair: 'EUR/CAD', rate: 1.4855 },
    { pair: 'EUR/AUD', rate: 1.6431 },
];

const EQUITY_SEED: FxRate[] = [
    { pair: 'AAPL',   rate: { amount: 184.32, currencyId: 'USD' } },
    { pair: 'MSFT',   rate: { amount: 421.07, currencyId: 'USD' } },
    { pair: 'NVDA',   rate: { amount: 875.39, currencyId: 'USD' } },
    { pair: 'BMW.DE', rate: { amount:  92.18, currencyId: 'EUR' } },
    { pair: 'ASML',   rate: { amount: 742.60, currencyId: 'EUR' } },
];

const MIXED_SEED: FxRate[] = [
    { pair: 'EUR/USD', rate: 1.0843 },
    { pair: 'BTC',     rate: { amount: 67_420, currencyId: 'USD' }, decimals: 0 },
    { pair: 'GOLD',    rate: { amount: 2384.50, currencyId: 'USD' } },
    { pair: 'EUR/JPY', rate: 168.42, decimals: 2 },
    { pair: 'AAPL',   rate: { amount: 184.32, currencyId: 'USD' } },
];

// ---------------------------------------------------------------------------
// Deterministic jitter (replaces Math.random — seeded per-tick, per-pair)
// ---------------------------------------------------------------------------

function deterministicStep(base: number, tick: number, pairIndex: number): number {
    const x = ((tick + 1) * 9301 + (pairIndex + 1) * 49297) % 233280;
    return (x / 233280 - 0.5) * 2; // -1..1
}

function jitterRates(rates: FxRate[], tick: number): FxRate[] {
    return rates.map((r, i) => {
        if (tick % 3 === i % 3) return r; // ~33% stay flat each tick
        if (typeof r.rate === 'number') {
            const jitter = r.rate > 10 ? 0.18 : 0.0018;
            const newRate = Math.round((r.rate + deterministicStep(r.rate, tick, i) * jitter) * 10000) / 10000;
            return { ...r, rate: newRate };
        }
        const jitter = r.rate.amount > 1000 ? 5 : 0.5;
        const newAmount = Math.round((r.rate.amount + deterministicStep(r.rate.amount, tick, i) * jitter) * 100) / 100;
        return { ...r, rate: { ...r.rate, amount: newAmount } };
    });
}

// ---------------------------------------------------------------------------
// 1. Default — static FX rates, no live updates
// ---------------------------------------------------------------------------

export const Default = () => {
    return new FxTickerBuilder()
        .withData(of(FX_SEED))
        .build();
};

// ---------------------------------------------------------------------------
// 2. WithMoneyRates — stock prices as Money values
// ---------------------------------------------------------------------------

export const WithMoneyRates = () => {
    return new FxTickerBuilder()
        .withData(of(EQUITY_SEED))
        .withLabel(of('Equities · live'))
        .build();
};

// ---------------------------------------------------------------------------
// 3. MixedRates — FX numbers + Money prices in one ticker
// ---------------------------------------------------------------------------

export const MixedRates = () => {
    return new FxTickerBuilder()
        .withData(of(MIXED_SEED))
        .withLabel(of('Markets · live'))
        .build();
};

// ---------------------------------------------------------------------------
// 4. LiveUpdates — simulated ticking with flash highlights
// ---------------------------------------------------------------------------

export const LiveUpdates = () => {
    const rates$ = interval(1500).pipe(
        scan((rates, tick) => jitterRates(rates, tick), FX_SEED),
    );

    return new FxTickerBuilder()
        .withData(rates$)
        .build();
};

// ---------------------------------------------------------------------------
// 5. LiveEquities — Money rates ticking
// ---------------------------------------------------------------------------

export const LiveEquities = () => {
    const rates$ = interval(1200).pipe(
        scan((rates, tick) => jitterRates(rates, tick), EQUITY_SEED),
    );

    return new FxTickerBuilder()
        .withData(rates$)
        .withLabel(of('Equities · live'))
        .build();
};

// ---------------------------------------------------------------------------
// 6. ScrollSpeed — slow vs fast marquee
// ---------------------------------------------------------------------------

export const ScrollSpeed = () => {
    const layout = new LayoutBuilder().asVertical().withGap(LayoutGap.LARGE);

    const speeds: Array<{ label: string; seconds: number }> = [
        { label: 'Slow (60s)',    seconds: 60 },
        { label: 'Default (28s)', seconds: 28 },
        { label: 'Fast (12s)',    seconds: 12 },
    ];

    speeds.forEach(({ label, seconds }) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex flex-col gap-2';

        const caption = document.createElement('span');
        caption.className = 'text-label-small text-on-surface-variant opacity-60 uppercase tracking-wide';
        caption.textContent = label;

        const ticker = new FxTickerBuilder()
            .withData(of(FX_SEED))
            .withScrollDuration(of(seconds))
            .build();

        wrapper.appendChild(caption);
        wrapper.appendChild(ticker);
        layout.addSlot().withContent({ build: () => wrapper });
    });

    return layout.build();
};

// ---------------------------------------------------------------------------
// 7. NoLabel — edge-to-edge marquee with pill hidden
// ---------------------------------------------------------------------------

export const NoLabel = () => {
    return new FxTickerBuilder()
        .withData(of(FX_SEED))
        .withLabelVisible(of(false))
        .build();
};

// ---------------------------------------------------------------------------
// 8. CustomFormatters — override rate and delta display
// ---------------------------------------------------------------------------

export const CustomFormatters = () => {
    const rates$ = interval(2000).pipe(
        scan((rates, tick) => jitterRates(rates, tick), FX_SEED),
    );

    return new FxTickerBuilder()
        .withData(rates$)
        .withLabel(of('Custom format'))
        .withRateFormatter(item => {
            if (typeof item.rate !== 'number') {
                return `$${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
            }
            return item.amount.toFixed(5); // 5 decimals instead of 4
        })
        .withDeltaFormatter(item => {
            const sign = item.direction === 'up' ? '+' : item.direction === 'down' ? '-' : '±';
            return `${sign}${Math.abs(item.delta).toFixed(5)}`;
        })
        .build();
};

// ---------------------------------------------------------------------------
// 9. Direction — right-to-left scroll
// ---------------------------------------------------------------------------

export const DirectionRight = () => {
    const layout = new LayoutBuilder().asVertical().withGap(LayoutGap.LARGE);

    const directions: Array<{ label: string; dir: 'left' | 'right' }> = [
        { label: 'Left (default)', dir: 'left' },
        { label: 'Right',          dir: 'right' },
    ];

    directions.forEach(({ label, dir }) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex flex-col gap-2';

        const caption = document.createElement('span');
        caption.className = 'text-label-small text-on-surface-variant opacity-60 uppercase tracking-wide';
        caption.textContent = label;

        const ticker = new FxTickerBuilder()
            .withData(of(FX_SEED))
            .withDirection(dir)
            .build();

        wrapper.appendChild(caption);
        wrapper.appendChild(ticker);
        layout.addSlot().withContent({ build: () => wrapper });
    });

    return layout.build();
};

// ---------------------------------------------------------------------------
// 10. GlassEffect — wrapped in PanelBuilder on a gradient background
// ---------------------------------------------------------------------------

export const GlassEffect = () => {
    const rates$ = interval(1500).pipe(
        scan((rates, tick) => jitterRates(rates, tick), FX_SEED),
    );

    const ticker = new FxTickerBuilder()
        .withData(rates$)
        .build();

    const panel = new PanelBuilder()
        .asGlass()
        .withContent({ build: () => ticker })
        .build();

    const backdrop = createGlassBackdrop(GLASS_GRADIENTS.BLUE_PURPLE, 4, 'opacity-60');
    backdrop.className += ' relative min-h-[120px] flex items-center p-8';

    const inner = document.createElement('div');
    inner.className = 'w-full';
    inner.appendChild(panel);
    backdrop.appendChild(inner);

    return backdrop;
};

// ---------------------------------------------------------------------------
// 11. Announcing — accessible mode with aria-live region
// ---------------------------------------------------------------------------

export const Announcing = () => {
    const rates$ = interval(3000).pipe(
        scan((rates, tick) => jitterRates(rates, tick), FX_SEED.slice(0, 3)),
    );

    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col gap-4';

    const note = document.createElement('p');
    note.className = 'text-label-small text-on-surface-variant opacity-70';
    note.textContent = 'aria-hidden is removed; an aria-live="polite" region announces rate changes.';

    const ticker = new FxTickerBuilder()
        .withData(rates$)
        .withLabel(of('Screen-reader friendly'))
        .asAnnouncing()
        .build();

    wrapper.appendChild(note);
    wrapper.appendChild(ticker);
    return wrapper;
};

// ---------------------------------------------------------------------------
// 12. InDashboardRow — realistic usage inside a glass panel alongside KPIs
// ---------------------------------------------------------------------------

export const InDashboardRow = () => {
    const rates$ = interval(1500).pipe(
        scan((rates, tick) => jitterRates(rates, tick), MIXED_SEED),
    );

    const ticker = new FxTickerBuilder()
        .withData(rates$)
        .withLabel(of('Markets · live'))
        .build();

    const panel = new PanelBuilder()
        .asGlass()
        .withContent({ build: () => ticker })
        .build();

    const backdrop = createGlassBackdrop(GLASS_GRADIENTS.INDIGO_PINK, 5, 'opacity-50');
    backdrop.className += ' relative min-h-[180px] flex flex-col justify-center p-8 gap-4';

    const heading = document.createElement('p');
    heading.className = 'text-label-medium font-semibold text-white opacity-80';
    heading.textContent = 'FxTicker as PanelBuilder content — glass surface from the parent';

    backdrop.appendChild(heading);
    backdrop.appendChild(panel);
    return backdrop;
};
