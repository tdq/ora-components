import { Observable, Subscription } from 'rxjs';
import { FxTickerLogic, TickerItem } from './fx-ticker-logic';
import { LabelBuilder } from '../label/label';
import { CurrencyRegistry } from '../../utils/currency-registry';
import { registerDestroy } from '../../core/destroyable-element';

export interface FxTickerViewportConfig {
    logic: FxTickerLogic;
    label$: Observable<string>;
    labelVisible$: Observable<boolean>;
    rateFormatter?: (item: TickerItem) => string;
    deltaFormatter?: (item: TickerItem) => string;
    scrollDuration$: Observable<number>;
    direction: 'left' | 'right';
    pauseOnHover: boolean;
    flashDuration: number;
    flashUpClass: string;
    flashDownClass: string;
    extraClass$?: Observable<string>;
    announcing: boolean;
}

function defaultRateFormatter(item: TickerItem): string {
    if (typeof item.rate !== 'number') {
        return CurrencyRegistry.format(item.rate, item.decimals);
    }
    return item.rate.toFixed(item.decimals);
}

function defaultDeltaFormatter(item: TickerItem): string {
    return Math.abs(item.delta).toFixed(item.decimals);
}

function buildItemHTML(
    item: TickerItem,
    rateFormatter: (i: TickerItem) => string,
    deltaFormatter: (i: TickerItem) => string,
): string {
    const formattedRate = rateFormatter(item);
    const formattedDelta = deltaFormatter(item);
    const isDown = item.direction === 'down';
    const arrow = isDown ? '▼' : '▲';
    const deltaClass = isDown ? 'fx-delta-down' : item.direction === 'flat' ? 'fx-delta-flat' : 'fx-delta-up';

    return (
        `<div class="inline-flex items-center gap-px-8 px-px-16 py-px-8 tabular-nums">` +
        `<span class="text-label-medium font-semibold text-on-surface opacity-80">${escapeHtml(item.pair)}</span>` +
        `<span data-rate class="text-label-medium font-semibold text-on-surface">${escapeHtml(formattedRate)}</span>` +
        `<span class="text-label-small font-semibold ${deltaClass}">${arrow} ${escapeHtml(formattedDelta)}</span>` +
        `</div>`
    );
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Internal viewport — not exported from index.ts */
export class FxTickerViewport {
    private readonly config: FxTickerViewportConfig;

    constructor(config: FxTickerViewportConfig) {
        this.config = config;
    }

    build(): HTMLElement {
        const {
            logic,
            label$,
            labelVisible$,
            rateFormatter = defaultRateFormatter,
            deltaFormatter = defaultDeltaFormatter,
            scrollDuration$,
            direction,
            pauseOnHover,
            flashDuration,
            flashUpClass,
            flashDownClass,
            extraClass$,
            announcing,
        } = this.config;

        // ── Root container ────────────────────────────────────────────────────
        const root = document.createElement('div');
        root.className = 'flex w-full items-center overflow-hidden';
        root.style.setProperty('--fx-flash-duration', flashDuration + 'ms');

        if (direction === 'right') {
            root.classList.add('fx-direction-right');
        }

        if (pauseOnHover) {
            root.classList.add('fx-pause-on-hover');
        }

        if (!announcing) {
            root.setAttribute('aria-hidden', 'true');
        }

        // ── Pill (label) ──────────────────────────────────────────────────────
        const pill = document.createElement('div');
        pill.className = [
            'text-label-small',
            'font-semibold',
            'uppercase',
            'tracking-widest',
            'text-on-surface-variant',
            'opacity-70',
            'border-r',
            'border-outline-alpha-20',
            'px-px-12',
            'py-px-8',
            'whitespace-nowrap',
            'flex',
            'items-center',
            'flex-none',
        ].join(' ');

        const labelEl = new LabelBuilder()
            .withCaption(label$)
            .build();
        pill.appendChild(labelEl);
        root.appendChild(pill);

        // ── Marquee viewport ──────────────────────────────────────────────────
        const marqueeViewport = document.createElement('div');
        marqueeViewport.className = 'overflow-hidden flex-1';
        root.appendChild(marqueeViewport);

        // ── Track ─────────────────────────────────────────────────────────────
        const track = document.createElement('div');
        track.setAttribute('data-track', '');
        track.className = 'fx-marquee-track flex whitespace-nowrap will-change-transform';

        marqueeViewport.appendChild(track);

        // ── Aria live region ──────────────────────────────────────────────────
        let ariaLive: HTMLDivElement | null = null;
        if (announcing) {
            ariaLive = document.createElement('div');
            // Visually hidden
            ariaLive.className = 'sr-only';
            ariaLive.setAttribute('aria-live', 'polite');
            root.appendChild(ariaLive);
        }

        // ── Subscriptions & flash timers ──────────────────────────────────────
        const sub = new Subscription();
        const flashTimers: ReturnType<typeof setTimeout>[] = [];

        // extraClass$ on root — swap previous extra tokens rather than clobbering className
        if (extraClass$) {
            let prevExtra = '';
            sub.add(
                extraClass$.subscribe(extra => {
                    if (prevExtra) root.classList.remove(...prevExtra.split(/\s+/).filter(Boolean));
                    if (extra) root.classList.add(...extra.split(/\s+/).filter(Boolean));
                    prevExtra = extra;
                })
            );
        }

        // Label visibility
        sub.add(
            labelVisible$.subscribe(visible => {
                pill.style.display = visible ? '' : 'none';
            })
        );

        // Scroll duration → CSS animation duration
        sub.add(
            scrollDuration$.subscribe(seconds => {
                track.style.animationDuration = `${seconds}s`;
            })
        );

        // State → update track; full re-render only when the pair list changes,
        // in-place update otherwise so the marquee animation is never interrupted.
        let lastPairs: string[] = [];

        sub.add(
            logic.state$.subscribe(items => {
                if (items.length === 0) return;

                const currentPairs = items.map(i => i.pair);
                const pairsChanged = currentPairs.join(',') !== lastPairs.join(',');

                let rateSpans: HTMLElement[];

                if (pairsChanged) {
                    // Full re-render (first emission or pair set changed)
                    const singleHTML = items
                        .map(item => buildItemHTML(item, rateFormatter, deltaFormatter))
                        .join('');
                    track.innerHTML = singleHTML + singleHTML;
                    lastPairs = currentPairs;

                    rateSpans = Array.from(track.querySelectorAll<HTMLElement>('[data-rate]'));
                } else {
                    // In-place update — patch text/class without touching the DOM structure
                    rateSpans = Array.from(track.querySelectorAll<HTMLElement>('[data-rate]'));

                    items.forEach((item, i) => {
                        const formattedRate = rateFormatter(item);
                        const formattedDelta = deltaFormatter(item);
                        const isDown = item.direction === 'down';
                        const arrow = isDown ? '▼' : '▲';
                        const deltaClass = isDown ? 'fx-delta-down' : item.direction === 'flat' ? 'fx-delta-flat' : 'fx-delta-up';

                        // Update both copies (i = first half, i + items.length = second half)
                        for (const idx of [i, i + items.length]) {
                            const rateSpan = rateSpans[idx];
                            if (!rateSpan) continue;
                            rateSpan.textContent = formattedRate;

                            // Delta span is the next sibling element
                            const deltaSpan = rateSpan.nextElementSibling as HTMLElement | null;
                            if (deltaSpan) {
                                deltaSpan.className = `text-label-small font-semibold ${deltaClass}`;
                                deltaSpan.textContent = `${arrow} ${formattedDelta}`;
                            }
                        }
                    });
                }

                // Apply flash classes for items with a direction change
                items.forEach((item, i) => {
                    if (item.direction === 'flat') return;

                    const flashClass = item.direction === 'up' ? flashUpClass : flashDownClass;

                    // Both copies (i and i + items.length)
                    const spanA = rateSpans[i];
                    const spanB = rateSpans[i + items.length];

                    [spanA, spanB].forEach(span => {
                        if (!span) return;
                        span.classList.add(flashClass);
                    });

                    const timerId = setTimeout(() => {
                        [spanA, spanB].forEach(span => {
                            if (!span) return;
                            span.classList.remove(flashClass);
                        });
                        const idx = flashTimers.indexOf(timerId);
                        if (idx !== -1) flashTimers.splice(idx, 1);
                    }, flashDuration + 50);

                    flashTimers.push(timerId);
                });

                // Update aria live region
                if (ariaLive) {
                    ariaLive.textContent = items
                        .map(item => `${item.pair} ${item.direction} ${rateFormatter(item)}`)
                        .join(', ');
                }
            })
        );

        // ── Cleanup ───────────────────────────────────────────────────────────
        registerDestroy(root, () => {
            sub.unsubscribe();
            flashTimers.forEach(clearTimeout);
            flashTimers.length = 0;
        });

        return root;
    }
}
