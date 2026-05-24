import { router } from '../routes';
import {
    ChartBuilder,
    GridBuilder,
    PanelBuilder,
    LabelBuilder,
    LayoutBuilder,
    FxTickerBuilder,
    FxRate,
    themeManager,
    registerDestroy
} from '@tdq/ora-components';
import { BehaviorSubject, interval, of, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { isMobileViewport } from '../utils/viewport';

// ---------- Domain types for the live ledger demo ----------

interface JournalEntry {
    id: string;
    date: string;
    account: string;
    currency: string;
    memo: string;
    debit: number;
    credit: number;
}

// ---------- Helpers ----------

const CURRENCY_SYMBOLS: Record<string, string> = {
    EUR: '€', USD: '$', GBP: '£', JPY: '¥', CHF: 'Fr',
};

const fmtEUR = (n: number): string =>
    '€ ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtAmount = (n: number, currency: string): string => {
    const sym = CURRENCY_SYMBOLS[currency] ?? currency;
    const decimals = currency === 'JPY' ? 0 : 2;
    return sym + ' ' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const pad2 = (n: number) => n.toString().padStart(2, '0');

function randAround(base: number, jitter: number): number {
    return base + (Math.random() - 0.5) * jitter;
}

function nextJournalEntry(now: Date, seq: number): JournalEntry {
    const accounts: Array<{ account: string; currency: string; memo: string }> = [
        { account: '1100 · Cash',                 currency: 'EUR', memo: 'Customer payment · INV-' },
        { account: '1200 · Accounts Receivable',  currency: 'USD', memo: 'Invoice issued · INV-' },
        { account: '4000 · Revenue',              currency: 'EUR', memo: 'Service revenue · SO-' },
        { account: '2100 · Accounts Payable',     currency: 'GBP', memo: 'Vendor bill · BIL-' },
        { account: '6500 · Operating Expense',    currency: 'USD', memo: 'SaaS subscription · ' },
        { account: '5000 · COGS',                 currency: 'JPY', memo: 'Materials issued · ' },
        { account: '1300 · Prepaid Expenses',     currency: 'CHF', memo: 'Insurance premium · ' },
    ];
    const pick = accounts[seq % accounts.length];
    const isJPY = pick.currency === 'JPY';
    const amt = isJPY
        ? Math.round(20000 + Math.random() * 980000)
        : Math.round((200 + Math.random() * 9800) * 100) / 100;
    const isDebit = seq % 2 === 0;
    const ref = (10000 + seq).toString();
    return {
        id: `je-${now.getTime()}-${seq}`,
        date: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`,
        account: pick.account,
        currency: pick.currency,
        memo: pick.memo + ref,
        debit: isDebit ? amt : 0,
        credit: isDebit ? 0 : amt,
    };
}

// ---------- Live KPI: Cash on Hand with rolling-digit cents ----------

function buildCashOnHandTile(cash$: BehaviorSubject<number>, sub: Subscription): HTMLElement {
    const root = document.createElement('div');
    root.className = 'rounded-large p-px-24 backdrop-blur-md border border-outline-alpha-20 bg-surface-variant-alpha-30 shadow-level-2 relative overflow-hidden';
    root.innerHTML = `
        <div class="flex items-center justify-between mb-px-12">
            <span class="text-label-medium text-on-surface-variant opacity-70 uppercase tracking-wide">Cash on Hand</span>
            <span class="inline-flex items-center gap-1 text-label-small font-semibold px-px-8 py-px-4 rounded-full text-trend-positive bg-trend-positive-bg">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 14l5-5 5 5z"/></svg>
                +0.4% today
            </span>
        </div>
        <div class="flex items-baseline gap-1 tabular-nums">
            <span class="text-on-surface opacity-70 text-2xl font-semibold">&euro;</span>
            <span data-cash-int class="text-on-surface text-4xl font-bold leading-none">0</span>
            <span class="text-on-surface opacity-70 text-2xl font-semibold">.</span>
            <span data-cash-cents class="text-on-surface text-2xl font-semibold leading-none inline-block min-w-[2ch] text-left">00</span>
        </div>
        <div class="mt-px-12 flex items-center gap-px-8 text-label-small text-on-surface-variant opacity-60">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-kpi-green animate-pulse"></span>
            <span>live &middot; reconciled to the cent</span>
        </div>
    `;
    const intEl = root.querySelector('[data-cash-int]') as HTMLElement;
    const centsEl = root.querySelector('[data-cash-cents]') as HTMLElement;

    sub.add(cash$.subscribe(v => {
        const intPart = Math.floor(v);
        const cents = Math.round((v - intPart) * 100);
        intEl.textContent = intPart.toLocaleString('en-US');
        centsEl.textContent = pad2(cents);
        centsEl.classList.remove('roll-digit');
        void centsEl.offsetWidth;
        centsEl.classList.add('roll-digit');
        root.classList.remove('flash-green');
        void root.offsetWidth;
        root.classList.add('flash-green');
    }));

    return root;
}

// ---------- Live KPI: AR Aging buckets (static demo) ----------

function buildArAgingTile(): HTMLElement {
    const root = document.createElement('div');
    root.className = 'rounded-large p-px-24 backdrop-blur-md border border-outline-alpha-20 bg-surface-variant-alpha-30 shadow-level-2';
    const buckets = [
        { label: '0–30',  pct: 62.1, color: '#10B981' },
        { label: '31–60', pct: 22.4, color: '#0EA5E9' },
        { label: '61–90', pct: 10.3, color: '#F59E0B' },
        { label: '90+',        pct: 5.2,  color: '#EF4444' },
    ];
    root.innerHTML = `
        <div class="flex items-center justify-between mb-px-12">
            <span class="text-label-medium text-on-surface-variant opacity-70 uppercase tracking-wide">AR Aging</span>
            <span class="inline-flex items-center gap-1 text-label-small font-semibold px-px-8 py-px-4 rounded-full text-trend-positive bg-trend-positive-bg">&uarr; 1.2 pp</span>
        </div>
        <div class="flex items-baseline gap-1 tabular-nums">
            <span class="text-on-surface text-4xl font-bold leading-none">92.4</span>
            <span class="text-on-surface opacity-70 text-xl font-semibold">% &lt; 30d</span>
        </div>
        <div class="mt-px-16 flex h-1.5 w-full overflow-hidden rounded-full" style="background: color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent);">
            ${buckets.map(b => `<div style="width: ${b.pct}%; background: ${b.color};" title="${b.label}d &middot; ${b.pct}%"></div>`).join('')}
        </div>
        <div class="mt-px-8 grid grid-cols-4 gap-px-8 text-label-small text-on-surface-variant opacity-70 tabular-nums">
            ${buckets.map(b => `<div class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full" style="background:${b.color};"></span><span>${b.label}</span></div>`).join('')}
        </div>
    `;
    return root;
}

// ---------- Hero ----------

export function createHero(): HTMLElement {
    const section = document.createElement('section');
    section.setAttribute('aria-labelledby', 'hero-heading');

    section.innerHTML = `
        <div id="hero-container" class="min-h-screen relative overflow-hidden transition-colors duration-500">
            <div class="absolute inset-0 ledger-grid-bg opacity-40 pointer-events-none"></div>
            <div class="absolute inset-0 pointer-events-none">
                <div id="hero-blob-anchor" class="absolute top-1/3 right-[8%] w-[28rem] h-[28rem] rounded-full blur-3xl transition-all duration-700 bg-accent-blob-1 opacity-70"></div>
            </div>
            <div class="relative z-10 container mx-auto px-4 pt-px-96 pb-px-64">
                <div class="grid xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 items-center min-h-[80vh]">
                    <div class="space-y-8 min-w-0">
                        <div class="space-y-6">
                            <div id="hero-badge" class="inline-flex items-center gap-px-8 px-px-16 py-px-8 rounded-full text-label-medium mb-px-32 transition-all duration-500 badge-accent">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                </svg>
                                <span>RxJS native &middot; TypeScript &middot; Material 3</span>
                            </div>
                            <h1 id="hero-heading" class="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight">
                                <span id="hero-title-1" class="text-gradient-1 transition-all duration-500">Components for</span><br />
                                <span id="hero-title-2" class="text-gradient-2 transition-all duration-500">Financial Applications</span>
                            </h1>
                            <p id="hero-description" class="text-xl max-w-lg leading-relaxed transition-colors duration-500 text-on-surface opacity-80">
                                Pass an RxJS stream to any prop. No framework, no Shadow DOM, no wrappers &mdash; your
                                observable in, reactive DOM out.
                            </p>
                        </div>
                        <div id="hero-stats" class="mt-px-32 flex items-stretch gap-0 transition-colors duration-500">
                            <div class="flex flex-col items-start pr-px-24">
                                <span class="text-title-medium font-bold text-on-surface tabular-nums">Cent-perfect</span>
                                <span class="text-label-small text-on-surface-variant mt-px-2 opacity-60">multi-currency money fields</span>
                            </div>
                            <div class="w-px bg-outline opacity-15"></div>
                            <div class="flex flex-col items-start px-px-24">
                                <span class="text-title-medium font-bold text-on-surface tabular-nums">60 fps</span>
                                <span class="text-label-small text-on-surface-variant mt-px-2 opacity-60">on 10k-row ledgers</span>
                            </div>
                            <div class="w-px bg-outline opacity-15"></div>
                            <div class="flex flex-col items-start pl-px-24">
                                <span class="text-title-medium font-bold text-on-surface tabular-nums">Zero</span>
                                <span class="text-label-small text-on-surface-variant mt-px-2 opacity-60">runtime dependencies</span>
                            </div>
                        </div>
                        <div class="flex flex-row flex-wrap gap-4">
                            <button id="explore-dashboard-btn"
                                class="ring-offset-background focus-visible:outline-hidden focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-11 rounded-large text-white border-0 px-8 py-6 text-lg font-semibold group shadow-level-3 hover:shadow-level-4"
                                style="background: linear-gradient(to right, #4f46e5, #818cf8);">
                                Open Live Books
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-2 group-hover:translate-x-1 transition-transform">
                                    <path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path>
                                </svg>
                            </button>
                            <button id="install-btn"
                                class="ring-offset-background focus-visible:outline-hidden focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-11 rounded-large backdrop-blur-md px-6 py-6 text-base font-mono-code border border-outline-alpha-20 bg-surface-variant-alpha-30 text-on-surface hover:bg-surface-variant-alpha-50">
                                <span class="text-on-surface opacity-50">$</span>
                                <span>npm i @tdq/ora-components</span>
                                <span data-copy-icon class="opacity-60 ml-1">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </span>
                            </button>
                        </div>
                    </div>
                    <div id="hero-visual-panel" class="relative min-w-0">
                        <div id="hero-visual-stack" class="relative space-y-4 min-w-0"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const sub = new Subscription();

    sub.add(themeManager.theme$.pipe(
        map(theme => {
            if (theme === 'system') {
                return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            return theme;
        })
    ).subscribe((theme: any) => {
        const container = section.querySelector('#hero-container') as HTMLElement;
        const themeBg = theme === 'dark'
            ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
            : theme === 'pink'
                ? 'bg-gradient-to-br from-white via-pink-50 to-rose-100'
                : 'bg-gradient-to-br from-white via-indigo-50/60 to-slate-50';
        if (container) container.className = `min-h-screen relative overflow-hidden transition-colors duration-500 ${themeBg}`;

        const exploreBtn = section.querySelector('#explore-dashboard-btn') as HTMLElement;
        if (exploreBtn) {
            exploreBtn.style.background = theme === 'dark'
                ? 'linear-gradient(to right, #4F378B, #633B48)'
                : theme === 'pink'
                    ? 'linear-gradient(to right, #7D2950, #db2777)'
                    : 'linear-gradient(to right, #4f46e5, #818cf8)';
        }
    }));

    registerDestroy(section, () => sub.unsubscribe());

    section.querySelector('#explore-dashboard-btn')!.addEventListener('click', () => router.navigate('/dashboard'));

    const installBtn = section.querySelector('#install-btn') as HTMLButtonElement;
    installBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText('npm i @tdq/ora-components');
            const icon = installBtn.querySelector('[data-copy-icon]') as HTMLElement;
            const original = icon.innerHTML;
            icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            setTimeout(() => { icon.innerHTML = original; }, 1400);
        } catch {
            document.getElementById('get-started')?.scrollIntoView({ behavior: 'smooth' });
        }
    });

    const visualPanel = section.querySelector('#hero-visual-panel') as HTMLElement;
    const stack = section.querySelector('#hero-visual-stack') as HTMLElement;

    // ----- Live streams -----

    const cash$ = new BehaviorSubject<number>(2481902.14);
    sub.add(interval(2000).subscribe(() => {
        const cur = cash$.value;
        cash$.next(Math.round(randAround(cur, 380) * 100) / 100);
    }));

    const fxRates$ = new BehaviorSubject<FxRate[]>([
        { pair: 'EUR/USD', rate: 1.0843 },
        { pair: 'EUR/GBP', rate: 0.8521 },
        { pair: 'EUR/JPY', rate: 168.42, decimals: 2 },
        { pair: 'EUR/CHF', rate: 0.9612 },
        { pair: 'EUR/CAD', rate: 1.4855 },
        { pair: 'EUR/AUD', rate: 1.6431 },
    ]);
    sub.add(interval(1500).subscribe(() => {
        const updated = fxRates$.value.map(r => {
            if (Math.random() < 0.55) {
                const jitter = (r.rate as number) > 10 ? 0.18 : 0.0018;
                const newRate = Math.round(randAround(r.rate as number, jitter) * 10000) / 10000;
                return { ...r, rate: newRate };
            }
            return r;
        });
        fxRates$.next(updated);
    }));

    // ----- Mobile fallback -----

    if (isMobileViewport()) {
        visualPanel.style.display = 'none';
        const exploreBtnEl = section.querySelector('#explore-dashboard-btn') as HTMLElement;
        if (exploreBtnEl) exploreBtnEl.style.display = 'none';

        const mobileTile = document.createElement('div');
        mobileTile.className = 'mt-px-24';
        mobileTile.appendChild(buildCashOnHandTile(cash$, sub));
        const heroCol = section.querySelector('.space-y-8') as HTMLElement;
        heroCol?.appendChild(mobileTile);
        return section;
    }

    // ----- Desktop collage -----

    // 1. FX ticker (top)
    stack.appendChild(
        new PanelBuilder().asGlass().withContent(
            new FxTickerBuilder().withData(fxRates$)
        ).build()
    );

    // 2. Cashflow chart (left) + KPI stack (right)
    const middleRow = document.createElement('div');
    middleRow.className = 'hero-middle-row';
    stack.appendChild(middleRow);

    const cashflowData$ = of([
        { month: 'Jan', net: 182, inflow: 612, outflow: 430 },
        { month: 'Feb', net: 198, inflow: 645, outflow: 447 },
        { month: 'Mar', net: 221, inflow: 712, outflow: 491 },
        { month: 'Apr', net: 207, inflow: 681, outflow: 474 },
        { month: 'May', net: 244, inflow: 758, outflow: 514 },
        { month: 'Jun', net: 261, inflow: 798, outflow: 537 },
        { month: 'Jul', net: 252, inflow: 781, outflow: 529 },
        { month: 'Aug', net: 278, inflow: 832, outflow: 554 },
        { month: 'Sep', net: 294, inflow: 866, outflow: 572 },
        { month: 'Oct', net: 312, inflow: 901, outflow: 589 },
        { month: 'Nov', net: 329, inflow: 938, outflow: 609 },
        { month: 'Dec', net: 348, inflow: 977, outflow: 629 },
    ]);

    const chartPanel = new PanelBuilder().asGlass();
    const chartLayout = new LayoutBuilder().asVertical();
    chartLayout.addSlot().withContent(
        new LabelBuilder().withCaption(of('Operating Cashflow — Trailing 12 mo · €k'))
    );
    const chart = new ChartBuilder()
        .withData(cashflowData$ as any)
        .withCategoryField('month')
        .withHeight(300);
    chart.addAreaChart('inflow').withLabel('Inflow').withColor('#10B981');
    chart.addAreaChart('outflow').withLabel('Outflow').withColor('#EF4444');
    chart.addLineChart('net').withLabel('Net').withColor('#6750A4');
    chartLayout.addSlot().withContent(chart);
    chartPanel.withContent(chartLayout);

    const chartWrap = document.createElement('div');
    chartWrap.className = 'relative overflow-hidden rounded-large h-full [&>*]:h-full';
    chartWrap.appendChild(chartPanel.build());
    const sweep = document.createElement('div');
    sweep.className = 'absolute top-0 bottom-0 w-px pointer-events-none cursor-sweep';
    sweep.style.cssText = 'left: 0; background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--md-sys-color-primary) 60%, transparent), transparent);';
    chartWrap.appendChild(sweep);
    middleRow.appendChild(chartWrap);

    const kpiStack = document.createElement('div');
    kpiStack.className = 'hero-kpi-stack';
    kpiStack.appendChild(buildCashOnHandTile(cash$, sub));
    kpiStack.appendChild(buildArAgingTile());
    middleRow.appendChild(kpiStack);

    // 3. Journal entries — live grid (full width)
    const journalPanel = new PanelBuilder().asGlass();
    const journalLayout = new LayoutBuilder().asVertical();

    const journalHeader = document.createElement('div');
    journalHeader.className = 'flex w-full items-center justify-between gap-px-16 mb-px-8';
    journalHeader.innerHTML = `
        <span class="text-label-large font-semibold text-on-surface">Journal Entries &mdash; Live</span>
        <span class="inline-flex items-center gap-px-8 text-label-small text-on-surface-variant opacity-70">
            <span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-kpi-green opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-kpi-green"></span></span>
            <span>posting &middot; auto-balanced</span>
        </span>
    `;
    journalLayout.addSlot().withContent({ build: () => journalHeader });

    const now = new Date();
    const seed: JournalEntry[] = Array.from({ length: 5 }, (_, i) => nextJournalEntry(now, i));
    const journal$ = new BehaviorSubject<JournalEntry[]>(seed);
    let seq = seed.length;
    sub.add(interval(3000).subscribe(() => {
        const next = nextJournalEntry(new Date(), seq++);
        const cur = journal$.value;
        journal$.next([next, ...cur].slice(0, 6));
    }));

    const journalGrid = new GridBuilder()
        .withItems(journal$ as any)
        .withHeight(of(220))
        .asGlass();
    const jcols = journalGrid.withColumns();
    jcols.addTextColumn('date').withHeader('Date').withWidth('110px').asResizable();
    jcols.addTextColumn('account').withHeader('Account').withWidth('220px').asResizable();
    jcols.addTextColumn('memo').withHeader('Memo').asResizable();
    jcols.addCustomColumn()
        .withHeader('Debit')
        .withWidth('130px')
        .asResizable()
        .withRenderer((item: any) => {
            const span = document.createElement('span');
            span.className = 'tabular-nums';
            span.style.cssText = 'color: var(--md-sys-color-on-surface); opacity: ' + (item.debit > 0 ? '1' : '0.25') + ';';
            span.textContent = item.debit > 0 ? fmtAmount(item.debit, item.currency) : '—';
            return span;
        });
    jcols.addCustomColumn()
        .withHeader('Credit')
        .withWidth('130px')
        .asResizable()
        .withRenderer((item: any) => {
            const span = document.createElement('span');
            span.className = 'tabular-nums';
            span.style.cssText = 'color: var(--md-sys-color-on-surface); opacity: ' + (item.credit > 0 ? '1' : '0.25') + ';';
            span.textContent = item.credit > 0 ? fmtAmount(item.credit, item.currency) : '—';
            return span;
        });
    jcols.addCustomColumn()
        .withHeader('')
        .withWidth('44px')
        .asResizable()
        .withRenderer(() => {
            const span = document.createElement('span');
            span.style.cssText = 'color:#10b981; font-weight:700;';
            span.textContent = '✓';
            return span;
        });

    journalLayout.addSlot().withContent(journalGrid);

    const totalsRow = document.createElement('div');
    totalsRow.setAttribute('aria-live', 'polite');
    totalsRow.className = 'mt-px-12 flex w-full items-center justify-between gap-px-16 px-px-12 py-px-8 rounded-large border border-outline-alpha-20 bg-surface-variant-alpha-30 tabular-nums';
    totalsRow.innerHTML = `
        <span class="text-label-medium font-semibold text-on-surface opacity-70 uppercase tracking-wide">Totals</span>
        <div class="flex items-center gap-px-24">
            <div class="flex items-baseline gap-1"><span class="text-label-small text-on-surface-variant opacity-60">Dr</span><span data-tot-dr class="text-title-medium font-bold text-on-surface">&euro; 0.00</span></div>
            <div class="flex items-baseline gap-1"><span class="text-label-small text-on-surface-variant opacity-60">Cr</span><span data-tot-cr class="text-title-medium font-bold text-on-surface">&euro; 0.00</span></div>
            <span data-bal class="inline-flex items-center gap-1 text-label-small font-semibold px-px-8 py-px-4 rounded-full text-trend-positive bg-trend-positive-bg">&#9878; balanced</span>
        </div>
    `;
    sub.add(journal$.subscribe(entries => {
        const dr = entries.reduce((s, e) => s + e.debit, 0);
        const cr = entries.reduce((s, e) => s + e.credit, 0);
        (totalsRow.querySelector('[data-tot-dr]') as HTMLElement).textContent = fmtEUR(dr);
        (totalsRow.querySelector('[data-tot-cr]') as HTMLElement).textContent = fmtEUR(cr);
        const balanced = Math.abs(dr - cr) < 0.005;
        const badge = totalsRow.querySelector('[data-bal]') as HTMLElement;
        badge.className = 'inline-flex items-center gap-1 text-label-small font-semibold px-px-8 py-px-4 rounded-full ' +
            (balanced ? 'text-trend-positive bg-trend-positive-bg' : 'text-trend-negative bg-trend-negative-bg');
        badge.textContent = balanced ? '⚖ balanced' : '⚠ out of balance';
    }));
    journalLayout.addSlot().withContent({ build: () => totalsRow });

    journalPanel.withContent(journalLayout);
    const journalEl = journalPanel.build();
    journalEl.classList.add('slide-in-down', 'hero-journal');
    stack.appendChild(journalEl);

    return section;
}
