import {
    ChartBuilder,
    PanelBuilder,
    PanelGap,
    GridBuilder,
    FxTickerBuilder,
    FxRate,
    registerDestroy,
} from '@tdq/ora-components';
import { BehaviorSubject, interval, Subscription, of } from 'rxjs';
import { themedColor$ } from './theme-tokens';

// ---------------------------------------------------------------------------
// Domain data
// ---------------------------------------------------------------------------

interface SymbolDef {
    ticker: string;
    name: string;
    market: string;
    basePrice: number;
    prevClose: number;
    open: number;
    news: { heading: string; body: string };
}

const SYMBOLS: SymbolDef[] = [
    {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        market: 'NASDAQ',
        basePrice: 213.50,
        prevClose: 211.80,
        open: 212.40,
        news: {
            heading: 'Apple expands AI features in iOS 18',
            body: 'Apple Inc. announced new generative AI integrations across its core apps, including Siri, Messages, and Photos. The update is expected to roll out to all compatible devices in the coming weeks.',
        },
    },
    {
        ticker: 'MSFT',
        name: 'Microsoft Corp.',
        market: 'NASDAQ',
        basePrice: 425.20,
        prevClose: 422.60,
        open: 423.80,
        news: {
            heading: 'Microsoft Azure AI revenue surges 38%',
            body: 'Microsoft reported record cloud revenue driven by Azure AI adoption across enterprise customers. The company raised its full-year guidance citing strong demand for Copilot integrations.',
        },
    },
    {
        ticker: 'NVDA',
        name: 'NVIDIA Corp.',
        market: 'NASDAQ',
        basePrice: 875.40,
        prevClose: 868.00,
        open: 870.50,
        news: {
            heading: 'NVIDIA Blackwell GPU demand outpaces supply',
            body: 'NVIDIA confirmed strong demand for its next-gen Blackwell architecture, with lead times extending to 12 months for certain configurations. Data center customers are prioritising AI inference workloads.',
        },
    },
    {
        ticker: 'TSLA',
        name: 'Tesla Inc.',
        market: 'NASDAQ',
        basePrice: 182.30,
        prevClose: 180.10,
        open: 181.50,
        news: {
            heading: 'Tesla FSD v12 rollout accelerates globally',
            body: 'Tesla began rolling out Full Self-Driving v12 to additional markets outside North America, with regulatory approval pending in the EU. The update introduces end-to-end neural network driving.',
        },
    },
    {
        ticker: 'AMZN',
        name: 'Amazon.com Inc.',
        market: 'NASDAQ',
        basePrice: 191.60,
        prevClose: 189.40,
        open: 190.80,
        news: {
            heading: 'Amazon AWS posts 17% YoY growth',
            body: 'Amazon Web Services posted strong quarterly results with 17% year-over-year growth, driven by AI infrastructure spend and multi-year enterprise commitments to the platform.',
        },
    },
    {
        ticker: 'MSTR',
        name: 'MicroStrategy Inc.',
        market: 'NASDAQ',
        basePrice: 1342.00,
        prevClose: 1318.50,
        open: 1325.80,
        news: {
            heading: 'MicroStrategy adds 5,000 BTC to treasury reserve',
            body: 'MicroStrategy announced the purchase of an additional 5,000 Bitcoin, bringing its total holdings to over 200,000 BTC. The company continues its strategy of using Bitcoin as its primary treasury asset.',
        },
    },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jitter(base: number, bps: number): number {
    // bps = basis points, e.g. 30 = ±0.30%
    return base * (1 + (Math.random() - 0.5) * 2 * (bps / 10000));
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

function formatPrice(n: number): string {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDelta(price: number, prevClose: number): string {
    const pct = ((price - prevClose) / prevClose) * 100;
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
}

function buildOrderBook(mid: number): Array<{ buy: string; price: string; sell: string; side: 'bid' | 'ask' }> {
    const levels = 6;
    const rows: Array<{ buy: string; price: string; sell: string; side: 'bid' | 'ask' }> = [];
    const tickSize = mid > 500 ? 0.10 : mid > 100 ? 0.05 : 0.02;

    // Asks above mid (lowest ask first → sorted ascending by price)
    for (let i = levels; i >= 1; i--) {
        const price = round2(mid + i * tickSize);
        const vol = Math.round(100 + Math.random() * 900);
        rows.push({ buy: '', price: formatPrice(price), sell: vol.toString(), side: 'ask' });
    }
    // Bids below mid (highest bid first → sorted descending by price)
    for (let i = 1; i <= levels; i++) {
        const price = round2(mid - i * tickSize);
        const vol = Math.round(100 + Math.random() * 900);
        rows.push({ buy: vol.toString(), price: formatPrice(price), sell: '', side: 'bid' });
    }
    return rows;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function createTradingTerminal(): HTMLElement {
    const masterSub = new Subscription();

    const container = document.createElement('div');
    container.className = 'flex-1 overflow-y-auto p-px-24';
    container.style.cssText = 'display:flex; flex-direction:column; gap:16px; min-width:0; overflow-x:hidden;';

    // -- Live price state per symbol --
    const prices = SYMBOLS.map(s => s.basePrice);

    // -- FxTicker live feed --
    const stockTicker$ = new BehaviorSubject<FxRate[]>(
        SYMBOLS.map((s, i) => ({ pair: s.ticker, rate: prices[i] }))
    );
    masterSub.add(interval(1200).subscribe(() => {
        const updated = SYMBOLS.map((s, i) => {
            prices[i] = round2(jitter(prices[i], 30));
            return { pair: s.ticker, rate: prices[i] };
        });
        stockTicker$.next(updated);
    }));

    // -- Selected symbol index --
    const selectedIdx$ = new BehaviorSubject<number>(0);

    // -- FxTicker bar --
    const tickerPanel = new PanelBuilder()
        .withContent(new FxTickerBuilder().withData(stockTicker$))
        .build();
    container.appendChild(tickerPanel);

    // -- Symbol pill tabs --
    const tabBar = buildSymbolTabBar(selectedIdx$);
    container.appendChild(tabBar);

    // -- Main two-column grid --
    const mainGrid = document.createElement('div');
    mainGrid.className = 'grid grid-cols-[280px_1fr] gap-px-24';
    mainGrid.style.cssText = 'flex:1; min-height:0;';
    container.appendChild(mainGrid);

    // Left column: stock overview + news
    const leftCol = document.createElement('div');
    leftCol.style.cssText = 'display:flex; flex-direction:column; gap:16px; min-width:0;';
    mainGrid.appendChild(leftCol);

    // Right column: chart + order book
    const rightCol = document.createElement('div');
    rightCol.style.cssText = 'display:flex; flex-direction:column; gap:16px; min-width:0;';
    mainGrid.appendChild(rightCol);

    // -- Stock overview panel (live price + stats) --
    const { el: overviewEl, update: updateOverview } = buildOverviewPanel(masterSub, selectedIdx$, prices);
    leftCol.appendChild(overviewEl);

    // -- News panel --
    const { el: newsEl, update: updateNews } = buildNewsPanel();
    leftCol.appendChild(newsEl);

    // -- Price chart panel --
    const { el: chartEl, update: updateChart } = buildPriceChartPanel(masterSub, selectedIdx$, prices);
    rightCol.appendChild(chartEl);

    // -- Order book panel --
    const { el: orderBookEl, update: updateOrderBook } = buildOrderBookPanel(masterSub, selectedIdx$, prices);
    rightCol.appendChild(orderBookEl);

    // -- Wire up symbol switching --
    masterSub.add(selectedIdx$.subscribe(idx => {
        updateOverview(idx);
        updateNews(idx);
        updateChart(idx);
        updateOrderBook(idx);
        updateTabHighlight(tabBar, idx);
    }));

    // -- Cleanup --
    registerDestroy(container, () => masterSub.unsubscribe());

    return container;
}

// ---------------------------------------------------------------------------
// Symbol tab bar
// ---------------------------------------------------------------------------

function buildSymbolTabBar(selectedIdx$: BehaviorSubject<number>): HTMLElement {
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex; align-items:center; gap:8px; flex-wrap:wrap;';

    SYMBOLS.forEach((sym, idx) => {
        const btn = document.createElement('button');
        btn.dataset['idx'] = String(idx);
        btn.style.cssText = [
            'display:inline-flex; align-items:center; gap:6px; padding:4px 14px;',
            'border-radius:999px; border:1px solid var(--dashboard-border-soft);',
            'font-size:13px; font-weight:500; cursor:pointer;',
            'transition:background 0.15s, color 0.15s, border-color 0.15s;',
            'background:transparent; color:var(--md-sys-color-on-surface);',
        ].join('');

        if (idx === 0) {
            // Active dot indicator for first item by default
            const dot = document.createElement('span');
            dot.className = 'js-active-dot';
            dot.style.cssText = 'width:7px; height:7px; border-radius:50%; background:var(--dashboard-accent); flex-shrink:0;';
            btn.appendChild(dot);
        }

        btn.appendChild(document.createTextNode(sym.ticker));
        btn.addEventListener('click', () => selectedIdx$.next(idx));
        bar.appendChild(btn);
    });

    return bar;
}

function updateTabHighlight(tabBar: HTMLElement, activeIdx: number): void {
    const buttons = tabBar.querySelectorAll<HTMLButtonElement>('button[data-idx]');
    buttons.forEach(btn => {
        const idx = Number(btn.dataset['idx']);
        const isActive = idx === activeIdx;

        // Remove existing dot
        const existingDot = btn.querySelector('.js-active-dot');
        if (existingDot) btn.removeChild(existingDot);

        if (isActive) {
            const dot = document.createElement('span');
            dot.className = 'js-active-dot';
            dot.style.cssText = 'width:7px; height:7px; border-radius:50%; background:var(--dashboard-accent); flex-shrink:0;';
            btn.insertBefore(dot, btn.firstChild);
            btn.style.background = 'var(--dashboard-accent-soft)';
            btn.style.color = 'var(--dashboard-accent)';
            btn.style.borderColor = 'var(--dashboard-accent)';
        } else {
            btn.style.background = 'transparent';
            btn.style.color = 'var(--md-sys-color-on-surface)';
            btn.style.borderColor = 'var(--dashboard-border-soft)';
        }
    });
}

// ---------------------------------------------------------------------------
// Stock overview panel
// ---------------------------------------------------------------------------

interface OverviewHandles {
    el: HTMLElement;
    update: (idx: number) => void;
}

function buildOverviewPanel(
    masterSub: Subscription,
    selectedIdx$: BehaviorSubject<number>,
    prices: number[],
): OverviewHandles {
    const panel = new PanelBuilder().withGap(PanelGap.LARGE).build();
    panel.style.cssText = 'flex-shrink:0;';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;';
    const headerTitle = document.createElement('span');
    headerTitle.className = 'text-label-large font-semibold text-on-surface';
    headerTitle.textContent = 'Stock Overview';
    header.appendChild(headerTitle);
    panel.appendChild(header);

    // Price display
    const priceRow = document.createElement('div');
    priceRow.style.cssText = 'display:flex; align-items:baseline; gap:10px; margin-bottom:8px;';

    const priceEl = document.createElement('span');
    priceEl.style.cssText = [
        'font-size:32px; font-weight:700; line-height:1;',
        'color:var(--md-sys-color-on-surface); font-variant-numeric:tabular-nums;',
    ].join('');

    const badgeEl = document.createElement('span');
    badgeEl.style.cssText = [
        'display:inline-flex; align-items:center; padding:2px 10px;',
        'border-radius:999px; font-size:12px; font-weight:600;',
    ].join('');

    priceRow.appendChild(priceEl);
    priceRow.appendChild(badgeEl);
    panel.appendChild(priceRow);

    // Meta row (name, market)
    const metaEl = document.createElement('div');
    metaEl.style.cssText = 'font-size:12px; color:var(--md-sys-color-on-surface); opacity:0.55; margin-bottom:14px;';
    panel.appendChild(metaEl);

    // Stats table
    const statsEl = document.createElement('div');
    statsEl.style.cssText = [
        'display:grid; grid-template-columns:1fr 1fr; gap:8px 12px;',
        'font-size:12px;',
    ].join('');
    panel.appendChild(statsEl);

    function renderStats(idx: number, price: number): void {
        const sym = SYMBOLS[idx];
        const delta = price - sym.prevClose;
        const isUp = delta >= 0;

        priceEl.textContent = `$${formatPrice(price)}`;

        badgeEl.textContent = formatDelta(price, sym.prevClose);
        badgeEl.style.background = isUp ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
        badgeEl.style.color = isUp ? 'var(--kpi-green)' : 'var(--kpi-red-text)';

        metaEl.textContent = `${sym.name} · ${sym.market}`;

        const rows: Array<[string, string]> = [
            ['Open',       `$${formatPrice(sym.open)}`],
            ['Prev Close', `$${formatPrice(sym.prevClose)}`],
            ['Change',     `$${formatPrice(Math.abs(delta))}`],
            ['Day Range',  `$${formatPrice(sym.prevClose * 0.995)} – $${formatPrice(sym.prevClose * 1.005)}`],
        ];

        while (statsEl.firstChild) statsEl.removeChild(statsEl.firstChild);
        for (const [label, value] of rows) {
            const labelEl = document.createElement('span');
            labelEl.style.cssText = 'color:var(--md-sys-color-on-surface); opacity:0.5;';
            labelEl.textContent = label;

            const valueEl = document.createElement('span');
            valueEl.style.cssText = 'color:var(--md-sys-color-on-surface); font-weight:500; font-variant-numeric:tabular-nums;';
            valueEl.textContent = value;

            statsEl.appendChild(labelEl);
            statsEl.appendChild(valueEl);
        }
    }

    // Initial render
    renderStats(0, prices[0]);

    // Re-render at 800ms cadence; prices[] is owned by the FxTicker interval (1200ms)
    masterSub.add(interval(800).subscribe(() => {
        const idx = selectedIdx$.value;
        renderStats(idx, prices[idx]);
    }));

    return {
        el: panel,
        update: (idx) => renderStats(idx, prices[idx]),
    };
}

// ---------------------------------------------------------------------------
// News panel
// ---------------------------------------------------------------------------

interface NewsHandles {
    el: HTMLElement;
    update: (idx: number) => void;
}

function buildNewsPanel(): NewsHandles {
    const panel = new PanelBuilder().withGap(PanelGap.LARGE).build();
    panel.style.cssText = 'flex:1; min-height:0;';

    const headerEl = document.createElement('div');
    headerEl.style.cssText = 'display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;';
    const headerTitle = document.createElement('span');
    headerTitle.className = 'text-label-large font-semibold text-on-surface';
    headerTitle.textContent = 'News';
    headerEl.appendChild(headerTitle);
    panel.appendChild(headerEl);

    const tagEl = document.createElement('span');
    tagEl.style.cssText = [
        'display:inline-flex; align-items:center; padding:2px 8px; margin-bottom:10px;',
        'border-radius:999px; font-size:11px; font-weight:600;',
        'background:var(--dashboard-accent-soft); color:var(--dashboard-accent);',
    ].join('');
    tagEl.textContent = SYMBOLS[0].ticker;
    panel.appendChild(tagEl);

    const headingEl = document.createElement('p');
    headingEl.style.cssText = [
        'font-size:13px; font-weight:600; line-height:1.4;',
        'color:var(--md-sys-color-on-surface); margin-bottom:8px;',
    ].join('');
    headingEl.textContent = SYMBOLS[0].news.heading;
    panel.appendChild(headingEl);

    const bodyEl = document.createElement('p');
    bodyEl.style.cssText = [
        'font-size:12px; line-height:1.6;',
        'color:var(--md-sys-color-on-surface); opacity:0.65;',
    ].join('');
    bodyEl.textContent = SYMBOLS[0].news.body;
    panel.appendChild(bodyEl);

    return {
        el: panel,
        update: (idx) => {
            const sym = SYMBOLS[idx];
            tagEl.textContent = sym.ticker;
            headingEl.textContent = sym.news.heading;
            bodyEl.textContent = sym.news.body;
        },
    };
}

// ---------------------------------------------------------------------------
// Price chart panel
// ---------------------------------------------------------------------------

interface ChartHandles {
    el: HTMLElement;
    update: (idx: number) => void;
}

function buildPriceChartPanel(
    masterSub: Subscription,
    selectedIdx$: BehaviorSubject<number>,
    prices: number[],
): ChartHandles {
    const HISTORY_LEN = 30;

    const panel = new PanelBuilder().withGap(PanelGap.LARGE).build();
    panel.style.cssText = 'flex:1; min-height:0; display:flex; flex-direction:column;';

    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex; align-items:center; justify-content:space-between; margin-bottom:4px; flex-shrink:0;';

    const titleEl = document.createElement('span');
    titleEl.className = 'text-label-large font-semibold text-on-surface';
    titleEl.textContent = `${SYMBOLS[0].ticker} · Price`;
    headerRow.appendChild(titleEl);
    panel.appendChild(headerRow);

    // Seed 30 historical data points slightly before current price
    function seedHistory(symIdx: number): Array<{ x: string; y: number }> {
        const base = prices[symIdx];
        return Array.from({ length: HISTORY_LEN }, (_, i) => ({
            x: String(i + 1),
            y: round2(base * (1 + (Math.random() - 0.5) * 0.008)),
        }));
    }

    const history$ = new BehaviorSubject<Array<{ x: string; y: number }>>(seedHistory(0));

    const chart = new ChartBuilder<{ x: string; y: number }>()
        .withData(history$)
        .withCategoryField('x');
    chart.addAreaChart('y')
        .withLabel('Price (USD)')
        .withColor(themedColor$('accent'));

    const chartEl = chart.build();
    chartEl.style.cssText = 'flex:1; min-height:200px;';
    panel.appendChild(chartEl);

    // Append a new price point every 2s
    let pointCounter = HISTORY_LEN + 1;
    masterSub.add(interval(2000).subscribe(() => {
        const idx = selectedIdx$.value;
        const cur = history$.value;
        const next: Array<{ x: string; y: number }> = [
            ...cur.slice(1),
            { x: String(pointCounter++), y: round2(jitter(prices[idx], 20)) },
        ];
        history$.next(next);
    }));

    let currentIdx = 0;

    return {
        el: panel,
        update: (idx) => {
            if (idx === currentIdx) return;
            currentIdx = idx;
            titleEl.textContent = `${SYMBOLS[idx].ticker} · Price`;
            pointCounter = HISTORY_LEN + 1;
            history$.next(seedHistory(idx));
        },
    };
}

// ---------------------------------------------------------------------------
// Order book panel
// ---------------------------------------------------------------------------

interface OrderBookHandles {
    el: HTMLElement;
    update: (idx: number) => void;
}

interface DomRow {
    buy: string;
    price: string;
    sell: string;
    side: 'bid' | 'ask';
}

function buildOrderBookPanel(
    masterSub: Subscription,
    selectedIdx$: BehaviorSubject<number>,
    prices: number[],
): OrderBookHandles {
    const panel = new PanelBuilder().withGap(PanelGap.LARGE).build();
    panel.style.cssText = 'flex-shrink:0;';

    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;';
    const titleEl = document.createElement('span');
    titleEl.className = 'text-label-large font-semibold text-on-surface';
    titleEl.textContent = 'Order Book — DOM';
    headerRow.appendChild(titleEl);

    const liveBadge = document.createElement('span');
    liveBadge.style.cssText = [
        'display:inline-flex; align-items:center; gap:5px;',
        'font-size:11px; font-weight:600; color:var(--kpi-green); opacity:0.85;',
    ].join('');
    const pingWrap = document.createElement('span');
    pingWrap.style.cssText = 'position:relative; display:inline-flex; width:7px; height:7px;';

    const pingRing = document.createElement('span');
    pingRing.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; border-radius:50%; background:var(--kpi-green); opacity:0.6; animation:ping 1.2s ease-in-out infinite;';

    const pingDot = document.createElement('span');
    pingDot.style.cssText = 'position:relative; width:7px; height:7px; border-radius:50%; background:var(--kpi-green);';

    pingWrap.appendChild(pingRing);
    pingWrap.appendChild(pingDot);
    liveBadge.appendChild(pingWrap);
    liveBadge.appendChild(document.createTextNode('live'));
    headerRow.appendChild(liveBadge);
    panel.appendChild(headerRow);

    const dom$ = new BehaviorSubject<DomRow[]>(buildOrderBook(prices[0]));

    const grid = new GridBuilder<DomRow>()
        .withItems(dom$)
        .withHeight(of(220));

    const cols = grid.withColumns();

    cols.addCustomColumn()
        .withHeader('Buy')
        .withWidth('1fr')
        .withRenderer((row: DomRow) => {
            const el = document.createElement('span');
            el.style.cssText = 'font-variant-numeric:tabular-nums; font-size:12px; font-weight:500;';
            el.style.color = row.buy ? 'var(--kpi-green)' : 'transparent';
            el.textContent = row.buy || '—';
            return el;
        });

    cols.addCustomColumn()
        .withHeader('Price')
        .withWidth('100px')
        .withRenderer((row: DomRow) => {
            const el = document.createElement('span');
            el.style.cssText = [
                'font-variant-numeric:tabular-nums; font-size:12px; font-weight:600;',
                `color:${row.side === 'ask' ? 'var(--kpi-red-text)' : 'var(--kpi-green)'};`,
            ].join('');
            el.textContent = row.price;
            return el;
        });

    cols.addCustomColumn()
        .withHeader('Sell')
        .withWidth('1fr')
        .withRenderer((row: DomRow) => {
            const el = document.createElement('span');
            el.style.cssText = 'font-variant-numeric:tabular-nums; font-size:12px; font-weight:500;';
            el.style.color = row.sell ? 'var(--kpi-red-text)' : 'transparent';
            el.textContent = row.sell || '—';
            return el;
        });

    panel.appendChild(grid.build());

    // Live-update every 1500ms
    masterSub.add(interval(1500).subscribe(() => {
        const idx = selectedIdx$.value;
        dom$.next(buildOrderBook(prices[idx]));
    }));

    let currentIdx = 0;

    return {
        el: panel,
        update: (idx) => {
            if (idx === currentIdx) return;
            currentIdx = idx;
            dom$.next(buildOrderBook(prices[idx]));
        },
    };
}
