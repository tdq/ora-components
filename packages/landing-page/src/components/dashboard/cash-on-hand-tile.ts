import { BehaviorSubject, Subscription } from 'rxjs';

const pad2 = (n: number) => n.toString().padStart(2, '0');

export function buildCashOnHandTile(cash$: BehaviorSubject<number>, sub: Subscription): HTMLElement {
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
            <span class="js-pulse-badge inline-block w-1.5 h-1.5 rounded-full bg-kpi-green animate-pulse"></span>
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
