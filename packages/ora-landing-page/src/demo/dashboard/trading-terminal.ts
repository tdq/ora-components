import {
    ChartBuilder,
    ComponentBuilder,
    PanelBuilder,
    PanelGap,
    GridBuilder,
    FxTickerBuilder,
    FxRate,
    LayoutBuilder,
    LayoutGap,
    SlotSize,
    LabelBuilder,
    LabelSize,
    TrendBuilder,
    ButtonBuilder,
    ButtonStyle,
    registerDestroy,
} from '@tdq/ora-components';
import { BehaviorSubject, combineLatest, map, Observable, Subscription, timer, of } from 'rxjs';
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
    return base * (1 + (Math.random() - 0.5) * 2 * (bps / 10000));
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

function formatPrice(n: number): string {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildOrderBook(mid: number): Array<{ buy: string; price: string; sell: string; side: 'bid' | 'ask' }> {
    const levels = 6;
    const rows: Array<{ buy: string; price: string; sell: string; side: 'bid' | 'ask' }> = [];
    const tickSize = mid > 500 ? 0.10 : mid > 100 ? 0.05 : 0.02;

    for (let i = levels; i >= 1; i--) {
        const price = round2(mid + i * tickSize);
        const vol = Math.round(100 + Math.random() * 900);
        rows.push({ buy: '', price: formatPrice(price), sell: vol.toString(), side: 'ask' });
    }
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
    const container = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE)
        .withClass(of('flex-1 p-px-24'));

    const masterSub = new Subscription();

    // -- Live price state per symbol --
    const prices = SYMBOLS.map(s => s.basePrice);

    // -- FxTicker live feed --
    const stockTicker$ = new BehaviorSubject<FxRate[]>(
        SYMBOLS.map((s, i) => ({ pair: s.ticker, rate: prices[i] }))
    );
    masterSub.add(timer(0, 1200).subscribe(() => {
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
        .withContent(new FxTickerBuilder().withData(stockTicker$));

    // -- Symbol pill tabs --
    const tabBar = buildSymbolTabBar(selectedIdx$);

    // -- Build panels --
    const { el: overviewEl, update: updateOverview } = buildOverviewPanel(masterSub, selectedIdx$, prices);
    const { el: newsEl, update: updateNews } = buildNewsPanel(selectedIdx$);
    const { el: chartEl, update: updateChart } = buildPriceChartPanel(masterSub, selectedIdx$, prices);
    const { el: orderBookEl, update: updateOrderBook } = buildOrderBookPanel(masterSub, selectedIdx$, prices);

    // -- Left column: overview (fixed) + news (fill) --
    const leftColLayout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);
    leftColLayout.addSlot().withSize(SlotSize.FIT).withContent({ build: () => overviewEl });
    leftColLayout.addSlot().withSize(SlotSize.FULL).withContent({ build: () => newsEl });

    // -- Right column: chart (fill) + order book (fixed) --
    const rightColLayout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);
    rightColLayout.addSlot().withSize(SlotSize.HALF).withContent({ build: () => chartEl });
    rightColLayout.addSlot().withSize(SlotSize.HALF).withContent({ build: () => orderBookEl });

    // -- Two-column horizontal layout --
    const mainGridLayout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.LARGE);
    mainGridLayout.addSlot().withSize(SlotSize.QUARTER).withContent(leftColLayout);
    mainGridLayout.addSlot().withSize(SlotSize.FULL).withContent(rightColLayout);

    container.addSlot().withContent(tickerPanel);
    container.addSlot().withContent({ build: () => tabBar });
    container.addSlot().withSize(SlotSize.FULL).withContent(mainGridLayout);

    const containerElement = container.build();

    // -- Wire up symbol switching --
    masterSub.add(selectedIdx$.subscribe(idx => {
        updateOverview(idx);
        updateNews(idx);
        updateChart(idx);
        updateOrderBook(idx);
    }));

    // -- Cleanup --
    registerDestroy(containerElement, () => masterSub.unsubscribe());

    return containerElement;
}

// ---------------------------------------------------------------------------
// Symbol tab bar
// ---------------------------------------------------------------------------

function buildSymbolTabBar(selectedIdx$: BehaviorSubject<number>): HTMLElement {
    const barLayout = new LayoutBuilder().asHorizontal().withGap(LayoutGap.SMALL);

    SYMBOLS.forEach((sym, idx) => {
        const isActive$ = selectedIdx$.pipe(map(i => i === idx));
        const extraClass$ = isActive$.pipe(map(active =>
            'h-auto py-1 px-[14px] rounded-full text-[13px] font-medium ' + (active
                ? '!border-[--dashboard-accent] !bg-[--dashboard-accent-soft] !text-[--dashboard-accent]'
                : '!border-[--dashboard-border-soft] !text-on-surface')
        ));

        barLayout.addSlot().withSize(SlotSize.FIT).withContent(
            new ButtonBuilder()
                .withCaption(of(sym.ticker))
                .withStyle(of(ButtonStyle.OUTLINED))
                .withClass(extraClass$)
                .withClick(() => selectedIdx$.next(idx))
        );
    });

    return barLayout.build();
}

// ---------------------------------------------------------------------------
// Stock overview panel
// ---------------------------------------------------------------------------

interface OverviewHandles {
    el: HTMLElement;
    update: (idx: number) => void;
}

function buildOverviewPanel(
    _masterSub: Subscription,
    selectedIdx$: BehaviorSubject<number>,
    prices: number[],
): OverviewHandles {
    // Combines symbol selection and a live price tick — components own their subscriptions
    const liveState$ = combineLatest([selectedIdx$, timer(0, 800)]).pipe(
        map(([idx]) => ({ idx, price: prices[idx] }))
    );

    const priceText$ = liveState$.pipe(map(({ price }) => `$${formatPrice(price)}`));
    const trend$ = liveState$.pipe(map(({ idx, price }) => ({
        value: ((price - SYMBOLS[idx].prevClose) / SYMBOLS[idx].prevClose) * 100,
        period: '',
    })));
    const metaText$ = selectedIdx$.pipe(map(idx => `${SYMBOLS[idx].name} · ${SYMBOLS[idx].market}`));

    const statDefs: Array<[string, Observable<string>]> = [
        ['Open',       selectedIdx$.pipe(map(idx => `$${formatPrice(SYMBOLS[idx].open)}`))],
        ['Prev Close', selectedIdx$.pipe(map(idx => `$${formatPrice(SYMBOLS[idx].prevClose)}`))],
        ['Change',     liveState$.pipe(map(({ idx, price }) => `$${formatPrice(Math.abs(price - SYMBOLS[idx].prevClose))}`))],
        ['Day Range',  selectedIdx$.pipe(map(idx => {
            const sym = SYMBOLS[idx];
            return `$${formatPrice(sym.prevClose * 0.995)} – $${formatPrice(sym.prevClose * 1.005)}`;
        }))],
    ];

    const panel = new PanelBuilder().withGap(PanelGap.LARGE).withClass(of('flex-shrink-0')).build();

    // Section header
    panel.appendChild(
        new LabelBuilder()
            .withCaption(of('Stock Overview'))
            .withSize(LabelSize.LARGE)
            .withClass(of('font-semibold text-on-surface block mb-3'))
            .build()
    );

    // Price + trend row
    const priceRowLayout = new LayoutBuilder().asHorizontal().withGap(LayoutGap.MEDIUM)
        .withClass(of('items-baseline mb-2'));
    priceRowLayout.addSlot().withSize(SlotSize.FIT).withContent(
        new LabelBuilder()
            .withCaption(priceText$)
            .withClass(of('text-[32px] font-bold leading-none text-on-surface tabular-nums'))
    );
    priceRowLayout.addSlot().withSize(SlotSize.FIT).withContent(
        new TrendBuilder().withTrend(trend$)
    );
    panel.appendChild(priceRowLayout.build());

    // Symbol name · market
    panel.appendChild(
        new LabelBuilder()
            .withCaption(metaText$)
            .withSize(LabelSize.SMALL)
            .withClass(of('opacity-55 text-on-surface block mb-[14px]'))
            .build()
    );

    // Stats grid
    const statsLayout = new LayoutBuilder().asVertical().withGap(LayoutGap.SMALL);
    for (const [label, value$] of statDefs) {
        const row = new LayoutBuilder().asHorizontal().withGap(LayoutGap.MEDIUM);
        row.addSlot().withSize(SlotSize.HALF).withContent(
            new LabelBuilder()
                .withCaption(of(label))
                .withSize(LabelSize.SMALL)
                .withClass(of('opacity-50 text-on-surface'))
        );
        row.addSlot().withSize(SlotSize.HALF).withContent(
            new LabelBuilder()
                .withCaption(value$)
                .withSize(LabelSize.SMALL)
                .withClass(of('font-medium text-on-surface tabular-nums'))
        );
        statsLayout.addSlot().withContent(row);
    }
    panel.appendChild(statsLayout.build());

    return { el: panel, update: () => {} };
}

// ---------------------------------------------------------------------------
// News panel
// ---------------------------------------------------------------------------

interface NewsHandles {
    el: HTMLElement;
    update: (idx: number) => void;
}

function buildNewsPanel(selectedIdx$: BehaviorSubject<number>): NewsHandles {
    const ticker$ = selectedIdx$.pipe(map(idx => SYMBOLS[idx].ticker));
    const heading$ = selectedIdx$.pipe(map(idx => SYMBOLS[idx].news.heading));
    const body$ = selectedIdx$.pipe(map(idx => SYMBOLS[idx].news.body));

    const panel = new PanelBuilder().withGap(PanelGap.LARGE).withClass(of('flex-1 min-h-0')).build();

    // Section header
    panel.appendChild(
        new LabelBuilder()
            .withCaption(of('News'))
            .withSize(LabelSize.LARGE)
            .withClass(of('font-semibold text-on-surface block mb-3'))
            .build()
    );

    // Ticker tag
    panel.appendChild(
        new LabelBuilder()
            .withCaption(ticker$)
            .withSize(LabelSize.SMALL)
            .withClass(of('inline-flex items-center px-2 py-0.5 rounded-full font-semibold bg-[--dashboard-accent-soft] text-[--dashboard-accent] mb-[10px] block'))
            .build()
    );

    // Heading
    panel.appendChild(
        new LabelBuilder()
            .withCaption(heading$)
            .withClass(of('text-[13px] font-semibold leading-[1.4] text-on-surface mb-2 block'))
            .build()
    );

    // Body
    panel.appendChild(
        new LabelBuilder()
            .withCaption(body$)
            .withSize(LabelSize.SMALL)
            .withClass(of('leading-[1.6] text-on-surface opacity-65 block'))
            .build()
    );

    return { el: panel, update: () => {} };
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

    const panel = new PanelBuilder()
        .withGap(PanelGap.LARGE);

    const content = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);
    
    panel.withContent(content);

    // Header
    const headerLayout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.NONE);
    headerLayout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(selectedIdx$.pipe(map(idx => `${SYMBOLS[idx].ticker} · Price`)))
            .withSize(LabelSize.LARGE)
    );

    content.addSlot().withSize(SlotSize.FIT).withContent(headerLayout);

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

    content.addSlot().withSize(SlotSize.FULL).withContent(chart);

    let pointCounter = HISTORY_LEN + 1;
    masterSub.add(timer(0, 2000).subscribe(() => {
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
        el: panel.build(),
        update: (idx) => {
            if (idx === currentIdx) return;
            currentIdx = idx;
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
    const panel = new PanelBuilder().withGap(PanelGap.LARGE);

    const content = new LayoutBuilder()
        .asVertical()
        .withClass(of('h-full'))
        .withGap(LayoutGap.LARGE);
    
    panel.withContent(content);

    // Header: title + live badge
    const headerLayout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.NONE)
        .withClass(of('items-center justify-between mb-1'));
    headerLayout.addSlot().withSize(SlotSize.FIT).withContent(
        new LabelBuilder()
            .withCaption(of('Order Book — DOM'))
            .withSize(LabelSize.LARGE)
            .withClass(of('font-semibold text-on-surface'))
    );
    headerLayout.addSlot().withSize(SlotSize.FIT).withContent(buildLiveBadge());
    content.addSlot().withSize(SlotSize.FIT).withContent(headerLayout);

    const dom$ = new BehaviorSubject<DomRow[]>(buildOrderBook(prices[0]));

    const grid = new GridBuilder<DomRow>()
        .withItems(dom$);

    const cols = grid.withColumns();

    cols.addCustomColumn()
        .withHeader('Buy')
        .withWidth('1fr')
        .withRenderer((row: DomRow) =>
            new LabelBuilder()
                .withCaption(of(row.buy || '—'))
                .withSize(LabelSize.SMALL)
                .withClass(of(`tabular-nums text-[12px] font-medium${row.buy ? '' : ' invisible'}`))
                .build()
        );

    cols.addCustomColumn()
        .withHeader('Price')
        .withWidth('100px')
        .withRenderer((row: DomRow) =>
            new LabelBuilder()
                .withCaption(of(row.price))
                .withSize(LabelSize.SMALL)
                .withClass(of(`tabular-nums text-[12px] font-semibold ${row.side === 'ask' ? 'text-[var(--kpi-red-text)]' : 'text-[var(--kpi-green)]'}`))
                .build()
        );

    cols.addCustomColumn()
        .withHeader('Sell')
        .withWidth('1fr')
        .withRenderer((row: DomRow) =>
            new LabelBuilder()
                .withCaption(of(row.sell || '—'))
                .withSize(LabelSize.SMALL)
                .withClass(of(`tabular-nums text-[12px] font-medium${row.sell ? '' : ' invisible'}`))
                .build()
        );

    content.addSlot().withSize(SlotSize.FULL).withContent(grid);

    masterSub.add(timer(0, 1500).subscribe(() => {
        const idx = selectedIdx$.value;
        dom$.next(buildOrderBook(prices[idx]));
    }));

    let currentIdx = 0;

    return {
        el: panel.build(),
        update: (idx) => {
            if (idx === currentIdx) return;
            currentIdx = idx;
            dom$.next(buildOrderBook(prices[idx]));
        },
    };
}

function buildLiveBadge(): ComponentBuilder {
    return new LabelBuilder()
        .withCaption(of('live'))
        .withSize(LabelSize.SMALL)
        .withClass(of('inline-flex items-center gap-[5px] text-[11px] font-semibold text-[--kpi-green] opacity-85'));
}
