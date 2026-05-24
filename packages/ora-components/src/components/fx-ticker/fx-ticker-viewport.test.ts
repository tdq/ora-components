import { BehaviorSubject, Subject } from 'rxjs';
import { FxTickerViewport, FxTickerViewportConfig } from './fx-ticker-viewport';
import { FxTickerLogic, FxRate, TickerItem } from './fx-ticker-logic';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRates(pairs: string[], baseRate = 1.1000): FxRate[] {
    return pairs.map((pair, i) => ({ pair, rate: baseRate + i * 0.0001, decimals: 4 }));
}

function buildViewport(overrides: Partial<FxTickerViewportConfig> = {}): {
    root: HTMLElement;
    data$: Subject<FxRate[]>;
    label$: BehaviorSubject<string>;
    labelVisible$: BehaviorSubject<boolean>;
    scrollDuration$: BehaviorSubject<number>;
    extraClass$: BehaviorSubject<string>;
} {
    const data$ = new Subject<FxRate[]>();
    const logic = new FxTickerLogic(data$);
    const label$ = new BehaviorSubject('FX');
    const labelVisible$ = new BehaviorSubject(true);
    const scrollDuration$ = new BehaviorSubject(28);
    const extraClass$ = new BehaviorSubject('');

    const config: FxTickerViewportConfig = {
        logic,
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

// ---------------------------------------------------------------------------
// Spec 1 — build() returns an HTMLElement
// ---------------------------------------------------------------------------

describe('FxTickerViewport', () => {
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
        it('populates track with 2× the pair count on first emission', () => {
            const { root, data$ } = buildViewport();
            const pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY'];
            data$.next(makeRates(pairs));

            const track = root.querySelector('[data-track]')!;
            const items = track.querySelectorAll('[data-rate]');
            // doubled: 3 pairs × 2 = 6 data-rate spans
            expect(items.length).toBe(pairs.length * 2);
        });

        // Spec 12 — each item has a [data-rate] span
        it('each ticker item contains a [data-rate] span', () => {
            const { root, data$ } = buildViewport();
            data$.next(makeRates(['EUR/USD', 'GBP/USD']));

            const track = root.querySelector('[data-track]')!;
            const rateSpans = track.querySelectorAll('[data-rate]');
            expect(rateSpans.length).toBeGreaterThan(0);
            rateSpans.forEach(span => {
                expect(span.tagName).toBe('SPAN');
            });
        });
    });

    // -------------------------------------------------------------------------
    // Spec 13 — same pairs, new rates → in-place update (same DOM nodes)
    // -------------------------------------------------------------------------

    describe('in-place update (same pair set)', () => {
        it('reuses the same [data-rate] DOM nodes on second emission with same pairs', () => {
            const { root, data$ } = buildViewport();
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
        });

        it('updates the rate text content on second emission', () => {
            const { root, data$ } = buildViewport();
            const pairs = ['EUR/USD'];

            data$.next([{ pair: 'EUR/USD', rate: 1.1000, decimals: 4 }]);
            const track = root.querySelector('[data-track]')!;
            const rateSpan = track.querySelectorAll('[data-rate]')[0] as HTMLElement;
            expect(rateSpan.textContent).toBe('1.1000');

            data$.next([{ pair: 'EUR/USD', rate: 1.1050, decimals: 4 }]);
            expect(rateSpan.textContent).toBe('1.1050');
        });
    });

    // -------------------------------------------------------------------------
    // Spec 14 — different pair set → innerHTML replaced
    // -------------------------------------------------------------------------

    describe('full re-render on pair set change', () => {
        it('replaces track innerHTML when pair set changes', () => {
            const { root, data$ } = buildViewport();

            data$.next(makeRates(['EUR/USD', 'GBP/USD']));
            const track = root.querySelector('[data-track]')!;
            const htmlBefore = track.innerHTML;

            data$.next(makeRates(['USD/JPY', 'AUD/USD', 'NZD/USD']));
            const htmlAfter = track.innerHTML;

            expect(htmlAfter).not.toBe(htmlBefore);
            // New pair count: 3 pairs × 2 = 6 data-rate spans
            expect(track.querySelectorAll('[data-rate]').length).toBe(6);
        });
    });

    // -------------------------------------------------------------------------
    // Spec 15 — flash class applied for direction: 'up', both copies
    // -------------------------------------------------------------------------

    describe('flash classes', () => {
        it('applies flashUpClass to both copies of [data-rate] for up items', () => {
            // Use fake timers so the class is not removed synchronously
            jest.useFakeTimers();

            const { root, data$ } = buildViewport({ flashUpClass: 'fx-flash-up', flashDownClass: 'fx-flash-down' });
            const pairs = ['EUR/USD'];

            // First emission sets baseline (direction: flat, no flash)
            data$.next([{ pair: 'EUR/USD', rate: 1.1000, decimals: 4 }]);
            // Second emission with higher rate → direction: up
            data$.next([{ pair: 'EUR/USD', rate: 1.1050, decimals: 4 }]);

            const track = root.querySelector('[data-track]')!;
            const rateSpans = track.querySelectorAll<HTMLElement>('[data-rate]');
            // Both copy 0 and copy 1 (index 0 and 1 for 1 pair)
            expect(rateSpans[0].classList.contains('fx-flash-up')).toBe(true);
            expect(rateSpans[1].classList.contains('fx-flash-up')).toBe(true);

            jest.useRealTimers();
        });

        // Spec 16 — no flash class when direction: 'flat'
        it('does NOT apply flash class when direction is flat', () => {
            jest.useFakeTimers();

            const { root, data$ } = buildViewport({ flashUpClass: 'fx-flash-up', flashDownClass: 'fx-flash-down' });
            // Only one emission → delta is 0, direction: flat
            data$.next([{ pair: 'EUR/USD', rate: 1.1000, decimals: 4 }]);

            const track = root.querySelector('[data-track]')!;
            const rateSpans = track.querySelectorAll<HTMLElement>('[data-rate]');
            expect(rateSpans[0].classList.contains('fx-flash-up')).toBe(false);
            expect(rateSpans[0].classList.contains('fx-flash-down')).toBe(false);

            jest.useRealTimers();
        });

        it('applies flashDownClass to both copies for down items', () => {
            jest.useFakeTimers();

            const { root, data$ } = buildViewport({ flashUpClass: 'fx-flash-up', flashDownClass: 'fx-flash-down' });
            data$.next([{ pair: 'EUR/USD', rate: 1.1050, decimals: 4 }]);
            data$.next([{ pair: 'EUR/USD', rate: 1.1000, decimals: 4 }]);

            const track = root.querySelector('[data-track]')!;
            const rateSpans = track.querySelectorAll<HTMLElement>('[data-rate]');
            expect(rateSpans[0].classList.contains('fx-flash-down')).toBe(true);
            expect(rateSpans[1].classList.contains('fx-flash-down')).toBe(true);

            jest.useRealTimers();
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
            const data$ = new Subject<FxRate[]>();
            const logic = new FxTickerLogic(data$);
            const label$ = new BehaviorSubject('FX');
            const labelVisible$ = new BehaviorSubject(true);
            const scrollDuration$ = new BehaviorSubject(28);

            const root = new FxTickerViewport({
                logic,
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

            // Emit empty array — should not crash and track stays empty
            data$.next([]);
            const track = root.querySelector('[data-track]')!;
            expect(track.children.length).toBe(0);
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
});
