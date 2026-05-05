import { router } from '../routes';
import {
    ChartBuilder,
    GridBuilder,
    PanelBuilder,
    LabelBuilder,
    LayoutBuilder,
    themeManager,
    registerDestroy
} from '@tdq/ora-components';
import { KPICardBuilder } from '../demo/dashboard/kpi-card';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';

export function createHero(): HTMLElement {
    const section = document.createElement('section');

    section.innerHTML = `
        <div id="hero-container" class="min-h-screen relative overflow-hidden transition-colors duration-500">
            <div class="absolute inset-0">
                <div id="hero-blob-1"
                    class="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl transition-all duration-700 bg-accent-blob-1">
                </div>
                <div id="hero-blob-2"
                    class="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl transition-all duration-700 bg-accent-blob-2">
                </div>
            </div>
            <div class="relative z-10 container mx-auto px-4 py-20">
                <div class="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
                    <div class="space-y-8">
                        <div class="space-y-6">
                            <div id="hero-badge" class="inline-flex items-center gap-px-8 px-px-16 py-px-8 rounded-full text-label-medium mb-px-32 transition-all duration-500 badge-accent">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                </svg>
                                <span>RxJS native · TypeScript · Material 3</span>
                            </div>
                            <h1 class="text-5xl md:text-7xl font-bold leading-tight">
                                <span id="hero-title-1"
                                    class="text-gradient-1 transition-all duration-500">Components for</span><br /><span id="hero-title-2"
                                    class="text-gradient-2 transition-all duration-500">Financial Applications</span>
                            </h1>
                            <p id="hero-description" class="text-xl max-w-lg leading-relaxed transition-colors duration-500 text-on-surface opacity-80">
                                Pass an RxJS stream to any prop. No framework, no Shadow DOM, no wrappers — your
                                observable in, reactive DOM out.
                            </p>
                        </div>
                        <div id="hero-stats" class="mt-px-32 flex items-center gap-0 transition-colors duration-500">
                            <div class="flex flex-col items-start pr-px-24">
                                <span class="text-title-medium font-bold text-on-surface stats-label transition-colors duration-500">Zero</span>
                                <span class="text-label-small text-on-surface-variant mt-px-2 stats-sublabel transition-colors duration-500"
                                    style="opacity: 0.6;">runtime deps</span>
                            </div>
                            <div class="w-px h-8 bg-outline opacity-15"></div>
                            <div class="flex flex-col items-start px-px-24">
                                <span class="text-title-medium font-bold text-on-surface stats-label transition-colors duration-500">~45kb</span>
                                <span class="text-label-small text-on-surface-variant mt-px-2 stats-sublabel transition-colors duration-500"
                                    style="opacity: 0.6;">gzipped</span>
                            </div>
                            <div class="w-px h-8 bg-outline opacity-15"></div>
                            <div class="flex flex-col items-start pl-px-24">
                                <span class="text-title-medium font-bold text-on-surface stats-label transition-colors duration-500">100%</span>
                                <span class="text-label-small text-on-surface-variant mt-px-2 stats-sublabel transition-colors duration-500"
                                    style="opacity: 0.6;">TypeScript</span>
                            </div>
                        </div>
                        <div class="flex flex-row gap-4">
                            <button
                                id="explore-dashboard-btn"
                                class="ring-offset-background focus-visible:outline-hidden focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 h-11 rounded-md text-white border-0 px-8 py-6 text-lg font-semibold group" style="background: linear-gradient(to right, #4f46e5, #818cf8);">
                                Explore Live Dashboard<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                    stroke-linecap="round" stroke-linejoin="round"
                                    class="lucide lucide-arrow-right ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform">
                                    <path d="M5 12h14"></path>
                                    <path d="m12 5 7 7-7 7"></path>
                                </svg></button><button
                                id="install-btn"
                                class="ring-offset-background focus-visible:outline-hidden focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 h-11 rounded-md backdrop-blur-md px-8 py-6 text-lg border-outline-alpha-20 bg-surface-variant-alpha-30 text-on-surface hover:bg-surface-variant-alpha-50">
                                Install in 60 seconds
                            </button>
                        </div>
                    </div>
                    <div class="relative transform rotate-2">
                        <div class="grid grid-cols-2 gap-6" id="hero-visual-grid">
                            <!-- Interactive components will be injected here -->
                        </div>
                        <div id="hero-blob-3"
                            class="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-xl transition-all duration-700 bg-accent-blob-1">
                        </div>
                        <div id="hero-blob-4"
                            class="absolute -bottom-4 -left-4 w-16 h-16 rounded-full blur-xl transition-all duration-700 bg-accent-blob-2">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const sub = themeManager.theme$.pipe(
        map(theme => {
            if (theme === 'system') {
                return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            return theme;
        })
    ).subscribe((theme: any) => {
        const container = section.querySelector('#hero-container') as HTMLElement;
        const themeBg = theme === 'dark'
            ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
            : theme === 'pink'
                ? 'bg-gradient-to-br from-white via-pink-50 to-pink-100'
                : 'bg-gradient-to-br from-white via-indigo-50 to-indigo-100';

        if (container) container.className = `min-h-screen relative overflow-hidden transition-colors duration-500 ${themeBg}`;

        const exploreBtn = section.querySelector('#explore-dashboard-btn') as HTMLElement;
        if (exploreBtn) {
            const btnGradient = theme === 'dark'
                ? 'linear-gradient(to right, #4F378B, #633B48)'
                : theme === 'pink'
                    ? 'linear-gradient(to right, #7D2950, #db2777)'
                    : 'linear-gradient(to right, #4f46e5, #818cf8)';
            exploreBtn.style.background = btnGradient;
        }
    });


    registerDestroy(section, () => sub.unsubscribe());

    const visualGrid = section.querySelector('#hero-visual-grid')!;


    // 1. Portfolio Performance Chart (glass panel, col-span-2)
    const portfolioData$ = of([
        { month: 'Jan', value: 120000, invested: 100000 },
        { month: 'Feb', value: 128000, invested: 100000 },
        { month: 'Mar', value: 135000, invested: 100000 },
        { month: 'Apr', value: 142000, invested: 100000 },
        { month: 'May', value: 138000, invested: 100000 },
        { month: 'Jun', value: 152000, invested: 100000 },
        { month: 'Jul', value: 160000, invested: 100000 },
        { month: 'Aug', value: 158000, invested: 100000 },
        { month: 'Sep', value: 168000, invested: 100000 },
        { month: 'Oct', value: 175000, invested: 100000 },
        { month: 'Nov', value: 182000, invested: 100000 },
        { month: 'Dec', value: 190000, invested: 100000 },
    ]);

    const chartPanel = new PanelBuilder()
        .withClass(of('col-span-2'))
        .asGlass();

    const chartLayout = new LayoutBuilder().asVertical();
    chartLayout.addSlot().withContent(new LabelBuilder().withCaption(of('Portfolio Performance')));

    const chart = new ChartBuilder()
        .withData(portfolioData$ as any)
        .withCategoryField('month')
        .withHeight(180);
    chart.addAreaChart('value').withLabel('Portfolio Value (€)').withColor('#0EA5E9');
    chart.addLineChart('invested').withLabel('Invested (€)').withColor('#6750A4');

    chartLayout.addSlot().withContent(chart);
    chartPanel.withContent(chartLayout);
    visualGrid.appendChild(chartPanel.build());

    // 2. P&L KPI Card (glass + sky-blue bg, 1 col)
    visualGrid.appendChild(new KPICardBuilder()
        .withLabel(of('P&L'))
        .withValue(of('€ 190,000'))
        .withValueColor(of('#0EA5E9'))
        .withTrend(of('+90.0%'), of(true))
        .withPanelClass(of('bg-sky-600'))
        .asGlass()
        .build());

    // 3. ROI KPI Card (glass + sky-blue bg, 1 col)
    visualGrid.appendChild(new KPICardBuilder()
        .withLabel(of('ROI'))
        .withValue(of('90.0%'))
        .withValueColor(of('#10B981'))
        .withTrend(of('+22.4%'), of(true))
        .withPanelClass(of('bg-sky-600'))
        .asGlass()
        .build());

    // 4. Positions (glass panel + grid, col-span-2)
    // UP&L = (Last - Entry) × Qty for Long, (Entry - Last) × Qty for Short
    // Mkt Val = Last × Qty
    const positionsData$ = of([
        { side: 'Long', stock: 'AAPL',  entry: { amount: 195.50, currencyId: 'EUR' }, last: { amount: 199.00, currencyId: 'EUR' }, qty: 1200, mktVal: { amount: 238800, currencyId: 'EUR' }, pnl: { amount:  12500, currencyId: 'EUR' }, upnl: { amount:   4200, currencyId: 'EUR' } },
        { side: 'Short', stock: 'MSFT',  entry: { amount: 380.20, currencyId: 'EUR' }, last: { amount: 375.00, currencyId: 'EUR' }, qty:  500, mktVal: { amount: 187500, currencyId: 'EUR' }, pnl: { amount:  -2300, currencyId: 'EUR' }, upnl: { amount:   2600, currencyId: 'EUR' } },
        { side: 'Long', stock: 'GOOGL', entry: { amount: 142.30, currencyId: 'EUR' }, last: { amount: 145.80, currencyId: 'EUR' }, qty: 2100, mktVal: { amount: 306180, currencyId: 'EUR' }, pnl: { amount:   8700, currencyId: 'EUR' }, upnl: { amount:   7350, currencyId: 'EUR' } },
        { side: 'Long', stock: 'TSLA',  entry: { amount: 248.10, currencyId: 'EUR' }, last: { amount: 252.40, currencyId: 'EUR' }, qty: 1500, mktVal: { amount: 378600, currencyId: 'EUR' }, pnl: { amount:   3100, currencyId: 'EUR' }, upnl: { amount:   6450, currencyId: 'EUR' } },
        { side: 'Short', stock: 'NVDA',  entry: { amount: 820.00, currencyId: 'EUR' }, last: { amount: 835.50, currencyId: 'EUR' }, qty:  800, mktVal: { amount: 668400, currencyId: 'EUR' }, pnl: { amount:  -8900, currencyId: 'EUR' }, upnl: { amount: -12400, currencyId: 'EUR' } },
        { side: 'Long', stock: 'AMZN',  entry: { amount: 178.25, currencyId: 'EUR' }, last: { amount: 182.00, currencyId: 'EUR' }, qty: 4200, mktVal: { amount: 764400, currencyId: 'EUR' }, pnl: { amount:  15400, currencyId: 'EUR' }, upnl: { amount:  15750, currencyId: 'EUR' } },
    ]);

    const positionsPanel = new PanelBuilder()
        .withClass(of('col-span-2'))
        .asGlass();

    const positionsLayout = new LayoutBuilder().asVertical();
    positionsLayout.addSlot().withContent(new LabelBuilder().withCaption(of('Positions')));

    const positionsGrid = new GridBuilder()
        .withItems(positionsData$ as any)
        .withHeight(of(240))
        .asGlass();
    const posCols = positionsGrid.withColumns();
    posCols.addCustomColumn()
        .withHeader('Side')
        .withWidth('65px')
        .asResizable()
        .withRenderer((item: any) => {
            const chip = document.createElement('span');
            const isLong = item.side === 'Long';
            chip.className = 'px-px-8 py-px-2 rounded-full text-xs font-semibold';
            chip.style.cssText = isLong
                ? 'background: rgba(16,185,129,0.12); color: #10b981;'
                : 'background: rgba(239,68,68,0.12); color: #ef4444;';
            chip.textContent = item.side;
            return chip;
        });
    posCols.addTextColumn('stock').withHeader('Stock').withWidth('1fr').asResizable();
    posCols.addMoneyColumn('entry').withHeader('Entry').withWidth('1fr').asResizable();
    posCols.addMoneyColumn('last').withHeader('Last').withWidth('1fr').asResizable();
    posCols.addTextColumn('qty').withHeader('Qty').withWidth('70px').asResizable();
    posCols.addMoneyColumn('mktVal').withHeader('Mkt Val').withWidth('1fr').asResizable();
    posCols.addCustomColumn()
        .withHeader('P&L')
        .withWidth('1fr')
        .asResizable()
        .withRenderer((item: any) => {
            const amt = item.pnl.amount;
            const isPos = amt >= 0;
            const span = document.createElement('span');
            span.style.cssText = `color: ${isPos ? '#10b981' : '#ef4444'}; font-variant-numeric: tabular-nums;`;
            span.textContent = `${isPos ? '+' : '-'}${item.pnl.currencyId === 'EUR' ? '€' : item.pnl.currencyId} ${Math.abs(amt).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            return span;
        });
    posCols.addCustomColumn()
        .withHeader('UP&L')
        .withWidth('1fr')
        .asResizable()
        .withRenderer((item: any) => {
            const amt = item.upnl.amount;
            const isPos = amt >= 0;
            const span = document.createElement('span');
            span.style.cssText = `color: ${isPos ? '#10b981' : '#ef4444'}; font-variant-numeric: tabular-nums;`;
            span.textContent = `${isPos ? '+' : '-'}${item.upnl.currencyId === 'EUR' ? '€' : item.upnl.currencyId} ${Math.abs(amt).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            return span;
        });

    positionsLayout.addSlot().withContent(positionsGrid);
    positionsPanel.withContent(positionsLayout);
    visualGrid.appendChild(positionsPanel.build());

    // Add event listeners
    const exploreBtn = section.querySelector('#explore-dashboard-btn');
    if (exploreBtn) {
        exploreBtn.addEventListener('click', () => router.navigate('/dashboard'));
    }

    const installBtn = section.querySelector('#install-btn');
    if (installBtn) {
        installBtn.addEventListener('click', () => {
            document.getElementById('get-started')?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    return section;
}
