import { BehaviorSubject, Subject, of } from 'rxjs';
import { FxTickerViewport, FxTickerViewportConfig } from './fx-ticker-viewport';
import { FxRate } from './fx-ticker-logic';
import { GatedObserver } from '../../utils/optimized-pipeline';

// ---------------------------------------------------------------------------
// IntersectionObserver mock helpers (installed globally via setupTests.ts)
// ---------------------------------------------------------------------------

interface IntersectionObserverMockStatic {
    triggerVisibility(element: Element, isIntersecting: boolean, ratio?: number): void;
    reset(): void;
    instances: Array<{ observedElements: Set<Element> }>;
}

function getIOMock(): IntersectionObserverMockStatic {
    return (globalThis as any).IntersectionObserverMock as IntersectionObserverMockStatic;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRates(pairs: string[], baseRate = 1.1000): FxRate[] {
    return pairs.map((pair, i) => ({ pair, rate: baseRate + i * 0.0001, decimals: 4 }));
}

/**
 * Build a viewport and return handles for driving it.
 *
 * NOTE: after this change, data$ is gated behind IntersectionObserver visibility.
 * To drive data through the pipeline in tests:
 *   1. Call `triggerVisible(root)` after building.
 *   2. Advance fake timers past the 150 ms appear-debounce.
 *   3. Then emit on data$.
 */
function buildViewport(overrides: Partial<FxTickerViewportConfig> = {}): {
    root: HTMLElement;
    data$: Subject<FxRate[]>;
    label$: BehaviorSubject<string>;
    labelVisible$: BehaviorSubject<boolean>;
    scrollDuration$: BehaviorSubject<number>;
    extraClass$: BehaviorSubject<string>;
} {
    const data$ = new Subject<FxRate[]>();
    const label$ = new BehaviorSubject('FX');
    const labelVisible$ = new BehaviorSubject(true);
    const scrollDuration$ = new BehaviorSubject(28);
    const extraClass$ = new BehaviorSubject('');

    const config: FxTickerViewportConfig = {
        data$,
        label$,
        labelVisible$,
        scrollDuration$,
        direction: 'left',
        pauseOnHover: false,
        flashDuration: 600,
        flashUpClass: 'fx-flash-up',
        flashDownClass: 'fx-flash-down',
        extraClass$,
        announcing: false,
        ...overrides,
    };

    const root = new FxTickerViewport(config).build();

    return { root, data$, label$, labelVisible$, scrollDuration$, extraClass$ };
}

/** Trigger visibility on root and advance past the 150 ms appear-debounce. */
function triggerVisible(root: HTMLElement, debounceMs = 150): void {
    getIOMock().triggerVisibility(root, true);
    jest.advanceTimersByTime(debounceMs);
}

// ---------------------------------------------------------------------------
// Shared setup / teardown for tests that drive data through the pipeline
// ---------------------------------------------------------------------------

// Tests that need fake timers + visibility reset are in describe blocks that
// call jest.useFakeTimers() / jest.useRealTimers() locally.

// ---------------------------------------------------------------------------
// Spec 1 — build() returns an HTMLElement
// ---------------------------------------------------------------------------

describe('FxTickerViewport', () => {
    beforeEach(() => {
        getIOMock().reset();
    });

    describe('build()', () => {
        it('returns an HTMLElement', () => {
            const { root } = buildViewport();
            expect(root).toBeInstanceOf(HTMLElement);
        });
    });

    // -------------------------------------------------------------------------
    // Spec 2 — aria-hidden when announcing: false
    // -------------------------------------------------------------------------

    describe('aria-hidden (announcing: false)', () => {
        it('sets aria-hidden="true" on root when announcing is false', () => {
            const { root } = buildViewport({ announcing: false });
            expect(root.getAttribute('aria-hidden')).toBe('true');
        });
    });

    // -------------------------------------------------------------------------
    // Spec 3 — no aria-hidden, aria-live child when announcing: true
    // -------------------------------------------------------------------------

    describe('aria-live (announcing: true)', () => {
        it('does NOT set aria-hidden on root when announcing is true', () => {
            const { root } = buildViewport({ announcing: true });
            expect(root.hasAttribute('aria-hidden')).toBe(false);
        });

        it('has an aria-live="polite" child element when announcing is true', () => {
            const { root } = buildViewport({ announcing: true });
            const liveEl = root.querySelector('[aria-live="polite"]');
            expect(liveEl).not.toBeNull();
        });
    });

    // -------------------------------------------------------------------------
    // Spec 4 — fx-pause-on-hover class present when pauseOnHover: true
    // -------------------------------------------------------------------------

    describe('pauseOnHover', () => {
        it('adds fx-pause-on-hover class when pauseOnHover is true', () => {
            const { root } = buildViewport({ pauseOnHover: true });
            expect(root.classList.contains('fx-pause-on-hover')).toBe(true);
        });

        // Spec 5
        it('does NOT add fx-pause-on-hover class when pauseOnHover is false', () => {
            const { root } = buildViewport({ pauseOnHover: false });
            expect(root.classList.contains('fx-pause-on-hover')).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    // Spec 6 — fx-direction-right when direction: 'right'
    // -------------------------------------------------------------------------

    describe('direction', () => {
        it('adds fx-direction-right class when direction is right', () => {
            const { root } = buildViewport({ direction: 'right' });
            expect(root.classList.contains('fx-direction-right')).toBe(true);
        });

        // Spec 7
        it('does NOT add fx-direction-right class when direction is left', () => {
            const { root } = buildViewport({ direction: 'left' });
            expect(root.classList.contains('fx-direction-right')).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    // Spec 8 — Pill element present and contains LabelBuilder text
    // -------------------------------------------------------------------------

    describe('pill / label', () => {
        it('contains a pill element that displays the label text', () => {
            const label$ = new BehaviorSubject('LIVE');
            const { root } = buildViewport({ label$ });
            // The pill is the first div child; the LabelBuilder span lives inside it
            const labelSpan = root.querySelector('span');
            expect(labelSpan).not.toBeNull();
            expect(labelSpan!.textContent).toBe('LIVE');
        });

        // Spec 9 — Pill hidden when labelVisible$ emits false
        it('hides pill when labelVisible$ emits false', () => {
            const labelVisible$ = new BehaviorSubject(true);
            const { root } = buildViewport({ labelVisible$ });
            // Pill is the first direct child div
            const pill = root.children[0] as HTMLElement;
            expect(pill.style.display).not.toBe('none');

            labelVisible$.next(false);
            expect(pill.style.display).toBe('none');
        });

        it('shows pill again when labelVisible$ emits true after false', () => {
            const labelVisible$ = new BehaviorSubject(false);
            const { root } = buildViewport({ labelVisible$ });
            const pill = root.children[0] as HTMLElement;
            expect(pill.style.display).toBe('none');

            labelVisible$.next(true);
            expect(pill.style.display).toBe('');
        });
    });

    // -------------------------------------------------------------------------
    // Spec 10 — track element [data-track] inside root
    // -------------------------------------------------------------------------

    describe('track element', () => {
        it('has a [data-track] element inside root', () => {
            const { root } = buildViewport();
            const track = root.querySelector('[data-track]');
            expect(track).not.toBeNull();
        });

        // Spec 11 — first state$ emission doubles items
        // Data now flows only after root is intersected + debounce elapses.
        it('populates track with 2× the pair count on first emission', () => {
            jest.useFakeTimers();
            try {
                const { root, data$ } = buildViewport();
                triggerVisible(root);

                const pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY'];
                data$.next(makeRates(pairs));

                const track = root.querySelector('[data-track]')!;
                const items = track.querySelectorAll('[data-rate]');
                // doubled: 3 pairs × 2 = 6 data-rate spans
                expect(items.length).toBe(pairs.length * 2);
            } finally {
                jest.useRealTimers();
            }
        });

        // Spec 12 — each item has a [data-rate] span
        it('each ticker item contains a [data-rate] span', () => {
            jest.useFakeTimers();
            try {
                const { root, data$ } = buildViewport();
                triggerVisible(root);
                data$.next(makeRates(['EUR/USD', 'GBP/USD']));

                const track = root.querySelector('[data-track]')!;
                const rateSpans = track.querySelectorAll('[data-rate]');
                expect(rateSpans.length).toBeGreaterThan(0);
                rateSpans.forEach(span => {
                    expect(span.tagName).toBe('SPAN');
                });
            } finally {
                jest.useRealTimers();
            }
        });
    });

    // -------------------------------------------------------------------------
    // Spec 13 — same pairs, new rates → in-place update (same DOM nodes)
    // -------------------------------------------------------------------------

    describe('in-place update (same pair set)', () => {
        it('reuses the same [data-rate] DOM nodes on second emission with same pairs', () => {
            jest.useFakeTimers();
            try {
                const { root, data$ } = buildViewport();
                triggerVisible(root);
                const pairs = ['EUR/USD', 'GBP/USD'];

                data$.next(makeRates(pairs, 1.1000));
                const track = root.querySelector('[data-track]')!;
                const nodesBefore = Array.from(track.querySelectorAll('[data-rate]'));

                data$.next(makeRates(pairs, 1.1050));
                const nodesAfter = Array.from(track.querySelectorAll('[data-rate]'));

                expect(nodesAfter.length).toBe(nodesBefore.length);
                nodesBefore.forEach((node, i) => {
                    expect(nodesAfter[i]).toBe(node);
                });
            } finally {
                jest.useRealTimers();
            }
        });

        it('updates the rate text content on second emission', () => {
            jest.useFakeTimers();
            try {
                const { root, data$ } = buildViewport();
                triggerVisible(root);

                data$.next([{ pair: 'EUR/USD', rate: 1.1000, decimals: 4 }]);
                const track = root.querySelector('[data-track]')!;
                const rateSpan = track.querySelectorAll('[data-rate]')[0] as HTMLElement;
                expect(rateSpan.textContent).toBe('1.1000');

                data$.next([{ pair: 'EUR/USD', rate: 1.1050, decimals: 4 }]);
                expect(rateSpan.textContent).toBe('1.1050');
            } finally {
                jest.useRealTimers();
            }
        });
    });

    // -------------------------------------------------------------------------
    // Spec 14 — different pair set → innerHTML replaced
    // -------------------------------------------------------------------------

    describe('full re-render on pair set change', () => {
        it('replaces track innerHTML when pair set changes', () => {
            jest.useFakeTimers();
            try {
                const { root, data$ } = buildViewport();
                triggerVisible(root);

                data$.next(makeRates(['EUR/USD', 'GBP/USD']));
                const track = root.querySelector('[data-track]')!;
                const htmlBefore = track.innerHTML;

                data$.next(makeRates(['USD/JPY', 'AUD/USD', 'NZD/USD']));
                const htmlAfter = track.innerHTML;

                expect(htmlAfter).not.toBe(htmlBefore);
                // New pair count: 3 pairs × 2 = 6 data-rate spans
                expect(track.querySelectorAll('[data-rate]').length).toBe(6);
            } finally {
                jest.useRealTimers();
            }
        });
    });

    // -------------------------------------------------------------------------
    // Spec 15 — flash class applied for direction: 'up', both copies
    // -------------------------------------------------------------------------

    describe('flash classes', () => {
        it('applies flashUpClass to both copies of [data-rate] for up items', () => {
            jest.useFakeTimers();
            try {
                const { root, data$ } = buildViewport({ flashUpClass: 'fx-flash-up', flashDownClass: 'fx-flash-down' });
                triggerVisible(root);

                // First emission sets baseline (direction: flat, no flash)
                data$.next([{ pair: 'EUR/USD', rate: 1.1000, decimals: 4 }]);
                // Second emission with higher rate → direction: up
                data$.next([{ pair: 'EUR/USD', rate: 1.1050, decimals: 4 }]);

                const track = root.querySelector('[data-track]')!;
                const rateSpans = track.querySelectorAll<HTMLElement>('[data-rate]');
                // Both copy 0 and copy 1 (index 0 and 1 for 1 pair)
                expect(rateSpans[0].classList.contains('fx-flash-up')).toBe(true);
                expect(rateSpans[1].classList.contains('fx-flash-up')).toBe(true);
            } finally {
                jest.useRealTimers();
            }
        });

        // Spec 16 — no flash class when direction: 'flat'
        it('does NOT apply flash class when direction is flat', () => {
            jest.useFakeTimers();
            try {
                const { root, data$ } = buildViewport({ flashUpClass: 'fx-flash-up', flashDownClass: 'fx-flash-down' });
                triggerVisible(root);
                // Only one emission → delta is 0, direction: flat
                data$.next([{ pair: 'EUR/USD', rate: 1.1000, decimals: 4 }]);

                const track = root.querySelector('[data-track]')!;
                const rateSpans = track.querySelectorAll<HTMLElement>('[data-rate]');
                expect(rateSpans[0].classList.contains('fx-flash-up')).toBe(false);
                expect(rateSpans[0].classList.contains('fx-flash-down')).toBe(false);
            } finally {
                jest.useRealTimers();
            }
        });

        it('applies flashDownClass to both copies for down items', () => {
            jest.useFakeTimers();
            try {
                const { root, data$ } = buildViewport({ flashUpClass: 'fx-flash-up', flashDownClass: 'fx-flash-down' });
                triggerVisible(root);
                data$.next([{ pair: 'EUR/USD', rate: 1.1050, decimals: 4 }]);
                data$.next([{ pair: 'EUR/USD', rate: 1.1000, decimals: 4 }]);

                const track = root.querySelector('[data-track]')!;
                const rateSpans = track.querySelectorAll<HTMLElement>('[data-rate]');
                expect(rateSpans[0].classList.contains('fx-flash-down')).toBe(true);
                expect(rateSpans[1].classList.contains('fx-flash-down')).toBe(true);
            } finally {
                jest.useRealTimers();
            }
        });
    });

    // -------------------------------------------------------------------------
    // Spec 17 — --fx-flash-duration CSS variable set on root
    // -------------------------------------------------------------------------

    describe('--fx-flash-duration CSS variable', () => {
        it('sets --fx-flash-duration on root from flashDuration config', () => {
            const { root } = buildViewport({ flashDuration: 800 });
            expect(root.style.getPropertyValue('--fx-flash-duration')).toBe('800ms');
        });

        it('uses the provided flashDuration value in the CSS variable', () => {
            const { root } = buildViewport({ flashDuration: 300 });
            expect(root.style.getPropertyValue('--fx-flash-duration')).toBe('300ms');
        });
    });

    // -------------------------------------------------------------------------
    // Spec 18 — extraClass$ adds/removes classes on root
    // -------------------------------------------------------------------------

    describe('extraClass$', () => {
        it('adds extra class to root on first emission', () => {
            const extraClass$ = new BehaviorSubject('my-extra-class');
            const { root } = buildViewport({ extraClass$ });
            expect(root.classList.contains('my-extra-class')).toBe(true);
        });

        it('swaps old extra class for new one on second emission', () => {
            const extraClass$ = new BehaviorSubject('class-a');
            const { root } = buildViewport({ extraClass$ });
            expect(root.classList.contains('class-a')).toBe(true);

            extraClass$.next('class-b');
            expect(root.classList.contains('class-a')).toBe(false);
            expect(root.classList.contains('class-b')).toBe(true);
        });

        it('removes extra class when empty string is emitted', () => {
            const extraClass$ = new BehaviorSubject('class-a');
            const { root } = buildViewport({ extraClass$ });
            extraClass$.next('');
            expect(root.classList.contains('class-a')).toBe(false);
        });

        it('does not corrupt base classes when swapping extra classes', () => {
            const extraClass$ = new BehaviorSubject('class-a');
            const { root } = buildViewport({ extraClass$ });
            const baseClasses = ['flex', 'w-full', 'items-center', 'overflow-hidden'];

            extraClass$.next('class-b');
            baseClasses.forEach(cls => {
                expect(root.classList.contains(cls)).toBe(true);
            });
        });
    });

    // -------------------------------------------------------------------------
    // Additional edge cases
    // -------------------------------------------------------------------------

    describe('edge cases', () => {
        it('ignores empty state$ emissions (items.length === 0)', () => {
            jest.useFakeTimers();
            try {
                const data$ = new Subject<FxRate[]>();
                const label$ = new BehaviorSubject('FX');
                const labelVisible$ = new BehaviorSubject(true);
                const scrollDuration$ = new BehaviorSubject(28);

                const root = new FxTickerViewport({
                    data$,
                    label$,
                    labelVisible$,
                    scrollDuration$,
                    direction: 'left',
                    pauseOnHover: false,
                    flashDuration: 600,
                    flashUpClass: 'fx-flash-up',
                    flashDownClass: 'fx-flash-down',
                    announcing: false,
                }).build();

                // Trigger visibility so pipeline is active
                triggerVisible(root);

                // Emit empty array — should not crash and track stays empty
                data$.next([]);
                const track = root.querySelector('[data-track]')!;
                expect(track.children.length).toBe(0);
            } finally {
                jest.useRealTimers();
            }
        });

        it('scrollDuration$ subscription updates track animationDuration style', () => {
            const scrollDuration$ = new BehaviorSubject(28);
            const { root } = buildViewport({ scrollDuration$ });
            const track = root.querySelector<HTMLElement>('[data-track]')!;
            expect(track.style.animationDuration).toBe('28s');

            scrollDuration$.next(60);
            expect(track.style.animationDuration).toBe('60s');
        });

        it('does not add aria-live child when announcing is false', () => {
            const { root } = buildViewport({ announcing: false });
            const liveEl = root.querySelector('[aria-live]');
            expect(liveEl).toBeNull();
        });

        it('updates label text reactively', () => {
            const label$ = new BehaviorSubject('FX');
            const { root } = buildViewport({ label$ });
            const span = root.querySelector('span')!;
            expect(span.textContent).toBe('FX');

            label$.next('RATES');
            expect(span.textContent).toBe('RATES');
        });
    });

    // -------------------------------------------------------------------------
    // Spec 19 — Visibility gating: data stream is gated on IntersectionObserver
    // -------------------------------------------------------------------------

    describe('visibility gating (optimized pipeline)', () => {
        it('does NOT populate track before root is intersected', () => {
            jest.useFakeTimers();
            try {
                const { root, data$ } = buildViewport();

                // Emit data before triggering visibility — pipeline must gate it
                data$.next(makeRates(['EUR/USD', 'GBP/USD']));
                jest.advanceTimersByTime(200); // well past any debounce

                const track = root.querySelector('[data-track]')!;
                expect(track.querySelectorAll('[data-rate]').length).toBe(0);
            } finally {
                jest.useRealTimers();
            }
        });

        it('populates track after triggerVisibility(root, true) + appear-debounce elapses', () => {
            jest.useFakeTimers();
            try {
                const { root, data$ } = buildViewport();

                // Trigger visibility and advance past appear-debounce (150 ms)
                getIOMock().triggerVisibility(root, true);
                jest.advanceTimersByTime(150);

                data$.next(makeRates(['EUR/USD', 'GBP/USD']));

                const track = root.querySelector('[data-track]')!;
                expect(track.querySelectorAll('[data-rate]').length).toBe(4); // 2 pairs × 2
                expect(track.textContent).toContain('EUR/USD');
                expect(track.textContent).toContain('GBP/USD');
            } finally {
                jest.useRealTimers();
            }
        });

        it('stops delivering data after root leaves viewport', () => {
            jest.useFakeTimers();
            try {
                const { root, data$ } = buildViewport();

                // Bring into view and emit first batch
                getIOMock().triggerVisibility(root, true);
                jest.advanceTimersByTime(150);
                data$.next(makeRates(['EUR/USD']));

                const track = root.querySelector('[data-track]')!;
                expect(track.querySelectorAll('[data-rate]').length).toBe(2); // 1 pair × 2

                // Hide the element — pipeline switches to EMPTY
                getIOMock().triggerVisibility(root, false);

                // Subsequent emissions must not reach the track
                data$.next(makeRates(['GBP/USD', 'USD/JPY']));
                // Track still has the original pair rendered (not updated)
                expect(track.textContent).not.toContain('GBP/USD');
                expect(track.textContent).not.toContain('USD/JPY');
            } finally {
                jest.useRealTimers();
            }
        });

        it('cleans up subscriptions when root is removed from DOM', () => {
            jest.useFakeTimers();
            try {
                const { root, data$ } = buildViewport();
                document.body.appendChild(root);
                triggerVisible(root);
                data$.next(makeRates(['EUR/USD']));
                const track = root.querySelector('[data-track]')!;
                expect(track.querySelectorAll('[data-rate]').length).toBe(2);
                root.remove();
                const htmlBefore = track.innerHTML;
                data$.next(makeRates(['GBP/USD']));
                expect(track.innerHTML).toBe(htmlBefore);
                document.body.innerHTML = '';
            } finally {
                jest.useRealTimers();
            }
        });

        it('registerDestroy teardown: removing root from DOM fires cleanup and subsequent data emissions do not throw', () => {
            jest.useFakeTimers();
            try {
                const { root, data$ } = buildViewport();

                // Attach to DOM so disconnectedCallback fires when root is removed
                document.body.appendChild(root);

                // Bring into view and emit data to exercise the live pipeline
                triggerVisible(root);
                data$.next(makeRates(['EUR/USD']));

                const track = root.querySelector('[data-track]')!;
                expect(track.querySelectorAll('[data-rate]').length).toBe(2);

                // Remove root from DOM — the registerDestroy cleanup fires synchronously
                // in jsdom, which calls sub.unsubscribe(), flashTimers cleared.
                root.remove();

                // Further emissions must not throw and must not mutate the track
                const htmlBeforeEmit = track.innerHTML;
                expect(() => {
                    data$.next(makeRates(['GBP/USD', 'USD/JPY']));
                }).not.toThrow();
                expect(track.innerHTML).toBe(htmlBeforeEmit);

                document.body.innerHTML = '';
            } finally {
                jest.useRealTimers();
            }
        });

        it('registerDestroy runs exactly once on removal (no double teardown)', () => {
            jest.useFakeTimers();
            try {
                const { root, data$ } = buildViewport();
                document.body.appendChild(root);
                triggerVisible(root);
                data$.next(makeRates(['EUR/USD']));
                const track = root.querySelector('[data-track]')!;
                expect(track.querySelectorAll('[data-rate]').length).toBe(2);
                root.remove();
                // Subsequent emissions must not throw — teardown has already fired
                expect(() => {
                    data$.next(makeRates(['GBP/USD', 'USD/JPY']));
                }).not.toThrow();
                expect(track.querySelectorAll('[data-rate]').length).toBe(2);
                document.body.innerHTML = '';
            } finally {
                jest.useRealTimers();
            }
        });

        it('idempotency guard: GatedObserver data$ renders immediately without triggerVisibility', () => {
            jest.useFakeTimers();
            try {
                const rates = makeRates(['EUR/USD', 'GBP/USD']);
                const gatedData$ = new GatedObserver(of(rates));

                const root = new FxTickerViewport({
                    data$: gatedData$,
                    label$: new BehaviorSubject('FX'),
                    labelVisible$: new BehaviorSubject(true),
                    scrollDuration$: new BehaviorSubject(28),
                    direction: 'left',
                    pauseOnHover: false,
                    flashDuration: 600,
                    flashUpClass: 'fx-flash-up',
                    flashDownClass: 'fx-flash-down',
                    announcing: false,
                }).build();

                // No triggerVisibility call — the GatedObserver bypasses the IO gate
                const track = root.querySelector('[data-track]')!;
                // 2 pairs × 2 copies = 4 [data-rate] spans
                expect(track.querySelectorAll('[data-rate]').length).toBe(rates.length * 2);
            } finally {
                jest.useRealTimers();
            }
        });
    });
});
