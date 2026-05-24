import {
    ButtonBuilder,
    ButtonStyle,
    ChartBuilder,
    ComboBoxBuilder,
    DatePickerBuilder,
    GridBuilder,
    Money,
    MoneyFieldBuilder,
    NumberFieldBuilder,
} from '@tdq/ora-components';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map, of } from 'rxjs';

export function createPlayground(): HTMLElement {
    const section = document.createElement('section');
    section.id = 'playground';
    section.setAttribute('aria-labelledby', 'playground-heading');
    section.className = 'py-px-96 px-px-24 relative overflow-hidden';
    section.style.cssText = 'background: linear-gradient(180deg, var(--md-sys-color-surface-container-low) 0%, var(--md-sys-color-surface) 100%);';

    // Background decoration
    const bgDec = document.createElement('div');
    bgDec.className = 'absolute inset-0 -z-10 overflow-hidden';
    bgDec.innerHTML = `
        <div class="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full" style="background: radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%);"></div>
        <div class="absolute top-0 left-0 w-[400px] h-[400px] rounded-full" style="background: radial-gradient(circle, rgba(79,70,229,0.05) 0%, transparent 70%);"></div>
    `;
    section.appendChild(bgDec);

    // Section header
    const header = document.createElement('div');
    header.className = 'max-w-7xl mx-auto text-center mb-px-64';
    header.innerHTML = `
        <div class="inline-flex items-center gap-px-8 px-px-16 py-px-8 rounded-full text-label-medium mb-px-24 badge-accent">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
            Interactive
        </div>
        <h2 id="playground-heading" class="text-[40px] font-bold text-on-surface leading-tight tracking-tight" style="letter-spacing: -0.025em;">
            See it in <span class="text-gradient-2">action</span>
        </h2>
        <p class="mt-px-16 text-body-large text-on-surface-variant max-w-2xl mx-auto" style="opacity: 0.75;">
            Four mini scenarios. Every input is a stream, every output is derived — no setup required.
        </p>
        <div class="mt-px-24 mx-auto w-24 h-px" style="background: linear-gradient(90deg, transparent, var(--md-sys-color-primary), transparent); opacity: 0.4;"></div>
    `;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-px-24';

    grid.appendChild(createPlaygroundCard(
        'Trade Ticket',
        'Buy or sell — quantity, limit, and live order value.',
        'trade',
        buildTradeTicket,
    ));

    grid.appendChild(createPlaygroundCard(
        'FX Converter',
        'Multi-currency input, derived conversion, one stream.',
        'fx',
        buildFxConverter,
    ));

    grid.appendChild(createPlaygroundCard(
        'Payment Calculator',
        'Pure derived state — change any input, watch the total.',
        'loan',
        buildPaymentCalculator,
    ));

    grid.appendChild(createPlaygroundCard(
        'Transaction Filter',
        'Pick a date range — the grid filters live.',
        'filter',
        buildTransactionFilter,
    ));

    section.appendChild(grid);
    return section;
}

// ---------- Card 1: Trade Ticket ----------

interface TradeSymbol {
    id: string;
    label: string;
}

function buildTradeTicket(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-px-16';

    const side$ = new BehaviorSubject<'BUY' | 'SELL'>('BUY');
    const symbol$ = new BehaviorSubject<TradeSymbol | null>({ id: 'AAPL', label: 'AAPL — Apple Inc.' });
    const qty$ = new BehaviorSubject<number | null>(10);
    const price$ = new BehaviorSubject<Money | null>({ amount: 185.40, currencyId: 'USD' });

    // Side toggle: two buttons swapping styles
    const sideRow = document.createElement('div');
    sideRow.className = 'flex gap-px-8';
    sideRow.appendChild(
        new ButtonBuilder()
            .withCaption(of('Buy'))
            .withStyle(side$.pipe(map(s => s === 'BUY' ? ButtonStyle.FILLED : ButtonStyle.OUTLINED)))
            .withClick(() => side$.next('BUY'))
            .build()
    );
    sideRow.appendChild(
        new ButtonBuilder()
            .withCaption(of('Sell'))
            .withStyle(side$.pipe(map(s => s === 'SELL' ? ButtonStyle.FILLED : ButtonStyle.OUTLINED)))
            .withClick(() => side$.next('SELL'))
            .build()
    );
    container.appendChild(sideRow);

    // TradeSymbol combobox
    const symbols: TradeSymbol[] = [
        { id: 'AAPL', label: 'AAPL — Apple Inc.' },
        { id: 'MSFT', label: 'MSFT — Microsoft' },
        { id: 'NVDA', label: 'NVDA — NVIDIA' },
        { id: 'TSLA', label: 'TSLA — Tesla' },
        { id: 'SPY',  label: 'SPY — S&P 500 ETF' },
    ];
    container.appendChild(
        new ComboBoxBuilder<TradeSymbol>()
            .withPlaceholder('Select a symbol')
            .withItems(of(symbols))
            .withValue(symbol$)
            .withItemIdProvider(item => item.id)
            .withItemCaptionProvider(item => item.label)
            .build()
    );

    // Quantity + Price row
    const fieldRow = document.createElement('div');
    fieldRow.className = 'grid grid-cols-2 gap-px-12';
    fieldRow.appendChild(
        new NumberFieldBuilder()
            .withLabel(of('Quantity'))
            .withValue(qty$)
            .withMinValue(of(1))
            .withStep(of(1))
            .withPrecision(of(0))
            .build()
    );
    fieldRow.appendChild(
        new MoneyFieldBuilder()
            .withLabel(of('Limit price'))
            .withValue(price$)
            .withCurrencies(['USD'])
            .withPrecision(of(2))
            .build()
    );
    container.appendChild(fieldRow);

    // Live total
    const total$ = combineLatest([qty$, price$]).pipe(
        map(([qty, price]) => {
            const q = qty ?? 0;
            const p = price?.amount ?? 0;
            return q * p;
        })
    );
    const totalLine = document.createElement('div');
    totalLine.className = 'flex items-center justify-between px-px-12 py-px-8 rounded-medium';
    totalLine.style.cssText = 'background: var(--md-sys-color-surface-container-low);';
    totalLine.innerHTML = `
        <span class="text-body-small text-on-surface-variant">Estimated total</span>
        <span class="text-title-medium font-semibold text-on-surface" data-total>$0.00</span>
    `;
    const totalEl = totalLine.querySelector('[data-total]') as HTMLElement;
    total$.subscribe(v => { totalEl.textContent = formatUsd(v); });
    container.appendChild(totalLine);

    // Submit button — reactive caption + enabled
    const isValid$ = combineLatest([symbol$, qty$, price$]).pipe(
        map(([sym, qty, price]) => !!sym && (qty ?? 0) >= 1 && (price?.amount ?? 0) > 0)
    );
    container.appendChild(
        new ButtonBuilder()
            .withCaption(side$.pipe(map(s => s === 'BUY' ? 'Place buy order' : 'Place sell order')))
            .withStyle(of(ButtonStyle.FILLED))
            .withEnabled(isValid$)
            .withClick(() => { /* demo — no-op */ })
            .build()
    );

    return container;
}

// ---------- Card 2: FX Converter ----------

const FX_RATES: Record<string, number> = {
    USD: 1,
    EUR: 0.9245,
    GBP: 0.7910,
    JPY: 156.32,
};

function buildFxConverter(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-px-12';

    const source$ = new BehaviorSubject<Money | null>({ amount: 1000, currencyId: 'USD' });
    const target$ = new BehaviorSubject<Money | null>({ amount: 924.50, currencyId: 'EUR' });

    const row = document.createElement('div');
    row.className = 'grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-px-12 items-center';

    row.appendChild(buildFxColumn('You send',
        new MoneyFieldBuilder()
            .withValue(source$)
            .withCurrencies(['USD', 'EUR', 'GBP', 'JPY'])
            .withPrecision(of(2))
            .build()
    ));

    const arrow = document.createElement('div');
    arrow.className = 'flex items-center justify-center text-on-surface-variant pt-px-20';
    arrow.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
    row.appendChild(arrow);

    row.appendChild(buildFxColumn('They receive',
        new MoneyFieldBuilder()
            .withValue(target$)
            .withCurrencies(['USD', 'EUR', 'GBP', 'JPY'])
            .withPrecision(of(2))
            .withEnabled(of(false))
            .build()
    ));

    container.appendChild(row);

    // Derived: whenever source or target currency changes, recompute target amount
    combineLatest([source$, target$.pipe(map(t => t?.currencyId ?? 'EUR'))])
        .subscribe(([src, targetCcy]) => {
            if (!src) return;
            const srcRate = FX_RATES[src.currencyId] ?? 1;
            const tgtRate = FX_RATES[targetCcy] ?? 1;
            const converted = (src.amount / srcRate) * tgtRate;
            const current = target$.value;
            if (!current || current.amount !== converted || current.currencyId !== targetCcy) {
                target$.next({ amount: Number(converted.toFixed(2)), currencyId: targetCcy });
            }
        });

    // Rate hint line
    const hint = document.createElement('div');
    hint.className = 'text-body-small text-on-surface-variant px-px-4';
    hint.style.opacity = '0.7';
    const hintEl = document.createElement('span');
    hint.appendChild(hintEl);
    combineLatest([source$, target$]).subscribe(([src, tgt]) => {
        if (!src || !tgt) { hintEl.textContent = ''; return; }
        const srcRate = FX_RATES[src.currencyId] ?? 1;
        const tgtRate = FX_RATES[tgt.currencyId] ?? 1;
        const rate = tgtRate / srcRate;
        hintEl.textContent = `1 ${src.currencyId} = ${rate.toFixed(4)} ${tgt.currencyId} · indicative mid-market`;
    });
    container.appendChild(hint);

    // 6-month rate history chart
    const pair$ = combineLatest([
        source$.pipe(map(s => s?.currencyId ?? 'USD'), distinctUntilChanged()),
        target$.pipe(map(t => t?.currencyId ?? 'EUR'), distinctUntilChanged()),
    ]);
    const seriesLabel$ = new BehaviorSubject<string>('USD/EUR');
    const data$ = pair$.pipe(map(([src, tgt]) => {
        seriesLabel$.next(`${src}/${tgt}`);
        return buildRateHistory(src, tgt);
    }));

    const chart = new ChartBuilder<RatePoint>()
        .withData(data$)
        .withCategoryField('x')
        .withHeight(180)
        .withLegend(false)
        .withTooltip(true)
        .withAnimation(true);
    chart.addLineChart('y')
        .withLabel('Change')
        .withColor('var(--md-sys-color-primary)')
        .withWidth(2)
        .withMarkers(false)
        .withTooltip(p => `${p.rate.toFixed(4)}  (${p.y >= 0 ? '+' : ''}${p.y.toFixed(2)}%)`);
    chart.withYAxis()
        .withTicks(4)
        .withGridLines(true)
        .withFormat(v => `${v >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`);
    chart.withXAxis().withTicks(6);

    const chartWrap = document.createElement('div');
    chartWrap.className = 'flex flex-col gap-px-8 mt-px-8 px-px-4';
    const chartHeader = document.createElement('div');
    chartHeader.className = 'flex items-center justify-between';
    chartHeader.innerHTML = `
        <span class="text-label-medium text-on-surface-variant" style="opacity: 0.75;" data-pair>USD/EUR</span>
        <span class="text-label-small text-on-surface-variant" style="opacity: 0.55;">Last 6 months</span>
    `;
    const pairEl = chartHeader.querySelector('[data-pair]') as HTMLElement;
    seriesLabel$.subscribe(label => { pairEl.textContent = label; });
    chartWrap.appendChild(chartHeader);
    chartWrap.appendChild(chart.build());
    container.appendChild(chartWrap);

    return container;
}

interface RatePoint {
    x: string;
    y: number;    // percent change from start of window
    rate: number; // raw rate at this point
}

function buildRateHistory(src: string, tgt: string): RatePoint[] {
    const srcRate = FX_RATES[src] ?? 1;
    const tgtRate = FX_RATES[tgt] ?? 1;
    const endRate = tgtRate / srcRate;

    // 26 weekly points; deterministic walk seeded from the currency pair so
    // re-selecting the same pair shows the same chart.
    const points = 26;
    const seed = hashSeed(`${src}-${tgt}`);
    const rnd = mulberry32(seed);

    const drift = (rnd() - 0.5) * 0.06; // start within ±3% of end
    const startRate = endRate * (1 + drift);
    const stepDrift = (endRate - startRate) / (points - 1);
    const today = new Date();

    const series: RatePoint[] = [];
    for (let i = 0; i < points; i++) {
        const noise = (rnd() - 0.5) * endRate * 0.012;
        const rate = i === points - 1
            ? endRate
            : startRate + stepDrift * i + noise;
        const d = new Date(today);
        d.setDate(today.getDate() - (points - 1 - i) * 7);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const pct = ((rate / startRate) - 1) * 100;
        series.push({ x: label, y: Number(pct.toFixed(2)), rate: Number(rate.toFixed(4)) });
    }
    return series;
}

function hashSeed(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function mulberry32(a: number): () => number {
    return function() {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function buildFxColumn(label: string, field: HTMLElement): HTMLElement {
    const col = document.createElement('div');
    col.className = 'flex flex-col gap-px-4';
    const labelEl = document.createElement('span');
    labelEl.className = 'text-label-medium text-on-surface-variant h-px-16 leading-px-16';
    labelEl.style.opacity = '0.75';
    labelEl.textContent = label;
    col.appendChild(labelEl);
    col.appendChild(field);
    return col;
}

// ---------- Card 3: Payment Calculator ----------

function buildPaymentCalculator(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-px-16';

    const principal$ = new BehaviorSubject<Money | null>({ amount: 250000, currencyId: 'USD' });
    const ratePct$ = new BehaviorSubject<number | null>(6.5);
    const termYears$ = new BehaviorSubject<number | null>(30);

    container.appendChild(
        new MoneyFieldBuilder()
            .withLabel(of('Loan amount'))
            .withValue(principal$)
            .withCurrencies(['USD'])
            .withPrecision(of(2))
            .build()
    );

    const row = document.createElement('div');
    row.className = 'grid grid-cols-2 gap-px-12';
    row.appendChild(
        new NumberFieldBuilder()
            .withLabel(of('Annual rate'))
            .withValue(ratePct$)
            .withSuffix(of('%'))
            .withPrecision(of(2))
            .withMinValue(of(0))
            .withMaxValue(of(30))
            .withStep(of(0.25))
            .build()
    );
    row.appendChild(
        new NumberFieldBuilder()
            .withLabel(of('Term'))
            .withValue(termYears$)
            .withSuffix(of('yrs'))
            .withPrecision(of(0))
            .withMinValue(of(1))
            .withMaxValue(of(40))
            .withStep(of(1))
            .build()
    );
    container.appendChild(row);

    // Monthly payment derivation
    const payment$ = combineLatest([principal$, ratePct$, termYears$]).pipe(
        map(([p, r, t]) => {
            const principal = p?.amount ?? 0;
            const annualRate = (r ?? 0) / 100;
            const months = (t ?? 0) * 12;
            if (principal <= 0 || months <= 0) return 0;
            if (annualRate === 0) return principal / months;
            const mr = annualRate / 12;
            return (principal * mr) / (1 - Math.pow(1 + mr, -months));
        })
    );

    const output = document.createElement('div');
    output.className = 'flex flex-col items-start gap-px-4 px-px-16 py-px-16 rounded-large';
    output.style.cssText = 'background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container);';
    output.innerHTML = `
        <span class="text-label-medium" style="opacity: 0.75;">Monthly payment</span>
        <span class="text-headline-medium font-bold tracking-tight" data-monthly>$0.00</span>
        <span class="text-body-small" style="opacity: 0.7;" data-total>Total interest: $0.00</span>
    `;
    const monthlyEl = output.querySelector('[data-monthly]') as HTMLElement;
    const totalEl = output.querySelector('[data-total]') as HTMLElement;
    combineLatest([payment$, principal$, termYears$]).subscribe(([monthly, p, t]) => {
        monthlyEl.textContent = formatUsd(monthly);
        const principal = p?.amount ?? 0;
        const totalPaid = monthly * (t ?? 0) * 12;
        const interest = Math.max(0, totalPaid - principal);
        totalEl.textContent = `Total interest: ${formatUsd(interest)}`;
    });
    container.appendChild(output);

    return container;
}

// ---------- Card 4: Transaction Filter ----------

interface Txn {
    date: Date;
    counterparty: string;
    amount: Money;
    status: string;
}

const MOCK_TXNS: Txn[] = [
    { date: daysAgo(1),  counterparty: 'Stripe payout',        amount: { amount:  4250.00, currencyId: 'USD' }, status: 'Settled' },
    { date: daysAgo(2),  counterparty: 'AWS',                  amount: { amount:  -312.40, currencyId: 'USD' }, status: 'Pending' },
    { date: daysAgo(3),  counterparty: 'Notion subscription',  amount: { amount:   -16.00, currencyId: 'USD' }, status: 'Settled' },
    { date: daysAgo(6),  counterparty: 'Wire — Acme Corp',     amount: { amount: 12800.00, currencyId: 'USD' }, status: 'Settled' },
    { date: daysAgo(9),  counterparty: 'Payroll',              amount: { amount: -8420.55, currencyId: 'USD' }, status: 'Settled' },
    { date: daysAgo(14), counterparty: 'Refund — Linear',      amount: { amount:    48.00, currencyId: 'USD' }, status: 'Settled' },
    { date: daysAgo(18), counterparty: 'Office lease',         amount: { amount: -3200.00, currencyId: 'USD' }, status: 'Settled' },
    { date: daysAgo(25), counterparty: 'Wire — Globex',        amount: { amount:  5600.00, currencyId: 'USD' }, status: 'Pending' },
];

function renderTxnStatusChip(status: string): HTMLElement {
    const chip = document.createElement('span');
    chip.className = 'inline-flex items-center px-px-8 py-px-2 rounded-full text-label-small font-medium';
    const colors: Record<string, { bg: string; text: string }> = {
        Settled: { bg: 'var(--kpi-green-soft)', text: 'var(--kpi-green-text)' },
        Pending: { bg: 'var(--kpi-amber-soft)', text: 'var(--kpi-amber-text)' },
    };
    const c = colors[status] ?? { bg: 'var(--md-sys-color-surface-container-high)', text: 'var(--md-sys-color-on-surface-variant)' };
    chip.style.cssText = `background: ${c.bg}; color: ${c.text};`;
    chip.textContent = status;
    return chip;
}

function buildTransactionFilter(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-px-12';

    const from$ = new BehaviorSubject<Date | null>(daysAgo(30));
    const to$   = new BehaviorSubject<Date | null>(new Date());
    const items$ = new BehaviorSubject<Txn[]>(MOCK_TXNS);

    const dateRow = document.createElement('div');
    dateRow.className = 'grid grid-cols-2 gap-px-12';
    dateRow.appendChild(
        new DatePickerBuilder()
            .withCaption(of('From'))
            .withValue(from$)
            .withMaxDate(to$.pipe(map(d => d ?? new Date())))
            .withFormat('DD-MM-YYYY')
            .build()
    );
    dateRow.appendChild(
        new DatePickerBuilder()
            .withCaption(of('To'))
            .withValue(to$)
            .withMinDate(from$.pipe(map(d => d ?? new Date(0))))
            .withFormat('DD-MM-YYYY')
            .build()
    );
    container.appendChild(dateRow);

    combineLatest([from$, to$]).subscribe(([from, to]) => {
        const filtered = MOCK_TXNS.filter(t => {
            if (from && t.date < startOfDay(from)) return false;
            if (to && t.date > endOfDay(to)) return false;
            return true;
        });
        items$.next(filtered);
    });

    const grid = new GridBuilder<Txn>().withItems(items$).withHeight(of(280));
    const cols = grid.withColumns();
    cols.addDateColumn('date').withHeader('Date').withWidth('110px').withFormat('medium');
    cols.addTextColumn('counterparty').withHeader('Counterparty').withWidth('1fr');
    cols.addMoneyColumn('amount')
        .withHeader('Amount')
        .withWidth('140px')
        .withPrecision(2)
        .withClass(t => t.amount.amount >= 0 ? 'txn-amount-positive font-medium tabular-nums' : 'font-medium tabular-nums');
    cols.addCustomColumn()
        .withHeader('Status')
        .withWidth('110px')
        .withAlign('center')
        .withRenderer(t => renderTxnStatusChip(t.status));

    const gridWrap = document.createElement('div');
    gridWrap.className = 'rounded-medium border overflow-hidden';
    gridWrap.style.cssText = 'border-color: rgba(121, 116, 126, 0.12);';
    gridWrap.appendChild(grid.build());
    container.appendChild(gridWrap);

    return container;
}

// ---------- Shared helpers ----------

function formatUsd(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

function startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function endOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
}

function createPlaygroundCard(
    title: string,
    description: string,
    _type: string,
    contentBuilder: () => HTMLElement
): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'rounded-extra-large overflow-hidden border';
    wrapper.style.cssText = 'border-color: rgba(121, 116, 126, 0.12); background: var(--md-sys-color-surface); box-shadow: 0 2px 16px rgba(0,0,0,0.04);';

    // Card header bar
    const cardHeader = document.createElement('div');
    cardHeader.className = 'flex items-center justify-between px-px-24 py-px-16 border-b';
    cardHeader.style.cssText = 'border-color: rgba(121, 116, 126, 0.08); background: var(--md-sys-color-surface-container-low);';
    cardHeader.innerHTML = `
        <div class="flex flex-col gap-px-4">
            <span class="text-title-small font-semibold text-on-surface">${title}</span>
            <span class="text-body-small text-on-surface-variant" style="opacity: 0.65;">${description}</span>
        </div>
        <div class="flex items-center gap-px-8 px-px-12 py-px-4 rounded-full text-label-small badge-accent">
            <span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
            Live Preview
        </div>
    `;
    wrapper.appendChild(cardHeader);

    // Card body
    const body = document.createElement('div');
    body.className = 'p-px-24';
    body.appendChild(contentBuilder());
    wrapper.appendChild(body);

    return wrapper;
}
