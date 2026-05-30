import { router } from '../routes';
import {
    themeManager,
    registerDestroy
} from '@tdq/ora-components';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { isMobileViewport } from '../utils/viewport';
import { createDashboardDemo } from '../components/dashboard/dashboard-demo';

// ---------- Hero ----------

export function createHero(): HTMLElement {
    const section = document.createElement('section');
    section.setAttribute('aria-labelledby', 'hero-heading');

    section.innerHTML = `
        <div id="hero-container" class="min-h-screen relative overflow-hidden transition-colors duration-500">
            <div class="absolute inset-0 ledger-grid-bg opacity-40 pointer-events-none"></div>
            <div class="absolute inset-0 pointer-events-none">
                <div id="hero-blob-anchor" class="absolute top-1/3 right-[8%] w-[20rem] h-[20rem] rounded-full blur-2xl bg-accent-blob-1 opacity-70" style="transition: opacity 700ms ease;"></div>
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
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true">
                                    <path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path>
                                </svg>
                            </button>
                            <button id="install-btn" aria-label="Copy installation command to clipboard"
                                class="ring-offset-background focus-visible:outline-hidden focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-11 rounded-large backdrop-blur-md px-6 py-6 text-base font-mono-code border border-outline-alpha-20 bg-surface-variant-alpha-30 text-on-surface hover:bg-surface-variant-alpha-50">
                                <span class="text-on-surface opacity-50" aria-hidden="true">$</span>
                                <span>npm i @tdq/ora-components</span>
                                <span data-copy-icon class="opacity-60 ml-1" aria-hidden="true">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </span>
                            </button>
                        </div>
                    </div>
                    <div id="hero-visual-panel" class="relative min-w-0">
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

    // ----- Dashboard Demo -----
    const { desktopElement, mobileElement } = createDashboardDemo(sub);

    if (isMobileViewport()) {
        visualPanel.style.display = 'none';
        const exploreBtnEl = section.querySelector('#explore-dashboard-btn') as HTMLElement;
        if (exploreBtnEl) exploreBtnEl.style.display = 'none';

        if (mobileElement) {
            const mobileTile = document.createElement('div');
            mobileTile.className = 'mt-px-24';
            mobileTile.appendChild(mobileElement);
            const heroCol = section.querySelector('.space-y-8') as HTMLElement;
            heroCol?.appendChild(mobileTile);
        }
    } else if (desktopElement) {
        visualPanel.appendChild(desktopElement);
    }

    return section;
}
