import { router } from '../routes';
import {
    ChartBuilder,
    GridBuilder,
    FormBuilder,
    ButtonStyle,
    PanelBuilder,
    themeManager,
    registerDestroy,
    Money
} from '@tdq/ora-components';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';

interface TransactionItem {
    id: number;
    type: string;
    amount: Money;
    status: 'Completed' | 'Pending' | 'Failed';
}

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
                                    class="text-gradient-1 transition-all duration-500">Components
                                    That</span><br /><span id="hero-title-2"
                                    class="text-gradient-2 transition-all duration-500">Take
                                    Observables</span>
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


    // 1. Interactive Chart (Line chart with live data)
    const chartCard = new PanelBuilder()
        .withClass(of('col-span-2'))
        .asGlass();
    const chartData$ = of(Array.from({ length: 10 }, (_, i) => ({
        time: i,
        value: Math.floor(Math.random() * 100) + 50
    })))
    const chart = new ChartBuilder()
        .withData(chartData$)
        .withHeight(160);
    chart.addLineChart('value').withColor('#10b981');
    chartCard.withContent(chart);
    visualGrid.appendChild(chartCard.build());

    // 2. Interactive Form (Small subscribe form)
    const formCard = new PanelBuilder()
        .asGlass();
    const form = new FormBuilder()
        .asGlass()
        .withCaption(of('Sign in'));
    const fields = form.withFields();
    fields.addTextField().withLabel(of('Login')).withPlaceholder(of('Enter your login...')).asInlineError();
    fields.addPasswordField().withLabel(of('Password')).withPlaceholder(of('Enter your password...')).asInlineError();
    const toolbar = form.withToolbar();
    toolbar.withPrimaryButton().withCaption(of('Login')).withStyle(of(ButtonStyle.FILLED));

    formCard.withContent(form);
    visualGrid.appendChild(formCard.build());

    // 3. Interactive Grid (Transaction history)
    const gridData$ = of<TransactionItem[]>([
        { id: 1, type: 'Income', amount: { amount: 1200, currencyId: 'EUR' }, status: 'Completed' },
        { id: 2, type: 'Expense', amount: { amount: 450, currencyId: 'EUR' }, status: 'Pending' },
        { id: 3, type: 'Income', amount: { amount: 800, currencyId: 'EUR' }, status: 'Completed' },
        { id: 4, type: 'Expense', amount: { amount: 120, currencyId: 'EUR' }, status: 'Failed' }
    ]);
    const grid = new GridBuilder<TransactionItem>()
        .withItems(gridData$)
        .asGlass();
    const cols = grid.withColumns();
    cols.addTextColumn('type').withHeader('Type');
    cols.addMoneyColumn('amount').withHeader('Amount');
    cols.addCustomColumn()
        .withHeader('Status')
        .withRenderer((item: TransactionItem) => {
            const chip = document.createElement('span');
            chip.className = 'px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200';
            
            // Apply theme-aware styling based on status (consistent with demo chip-utils)
            if (item.status === 'Completed') {
                chip.style.backgroundColor = 'var(--md-sys-color-primary-container)';
                chip.style.color = 'var(--md-sys-color-on-primary-container)';
            } else if (item.status === 'Pending') {
                chip.style.backgroundColor = 'var(--md-sys-color-secondary-container)';
                chip.style.color = 'var(--md-sys-color-on-secondary-container)';
            } else if (item.status === 'Failed') {
                chip.style.backgroundColor = 'var(--md-sys-color-error-container, rgba(242, 184, 181, 0.2))';
                chip.style.color = 'var(--md-sys-color-on-error-container, #601410)';
            }
            
            chip.textContent = item.status;
            return chip;
        });

    visualGrid.appendChild(grid.build());

    // 4. Subscribe panel
    const subscribePanel = new PanelBuilder()
        .withClass(of('col-span-2 bg-sky-600'))
        .asGlass();

    const subscribeForm = new FormBuilder().withCaption(of('Stay updated')).asGlass();
    subscribeForm.withFields().addTextField().withLabel(of('Email')).withPlaceholder(of('Enter your email...')).asInlineError();
    subscribeForm.withToolbar().withPrimaryButton().withCaption(of('Subscribe')).withStyle(of(ButtonStyle.FILLED));

    subscribePanel.withContent(subscribeForm);
    const subscribeElem = subscribePanel.build()
    subscribeElem.style.backgroundColor = 'var(--subscribe-panel-bg)'
    visualGrid.appendChild(subscribeElem);

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
