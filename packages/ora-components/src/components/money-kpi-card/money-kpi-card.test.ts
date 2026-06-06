import { Subject } from 'rxjs';
import { MoneyKPICardBuilder } from './money-kpi-card-builder';
import { Money } from '../../types/money';
import { Trend } from '../../types/trend';

// ---- Mock type helpers ----
interface IntersectionObserverMockStatic {
    triggerVisibility(element: Element, isIntersecting: boolean, ratio?: number): void;
    reset(): void;
}

interface GlobalWithIOMock {
    IntersectionObserverMock: IntersectionObserverMockStatic;
}

function getIOMock(): IntersectionObserverMockStatic {
    return (globalThis as unknown as GlobalWithIOMock).IntersectionObserverMock;
}

// ---- Helpers ----

/**
 * Builds a MoneyKPICard and returns:
 * - `body`: the actual HTMLElement returned by build() (a div — the card shell)
 * - `value$`: the reactive data source
 */
function buildCard(): { body: HTMLElement; value$: Subject<Money> } {
    const value$ = new Subject<Money>();
    const body = new MoneyKPICardBuilder()
        .withValue(value$)
        .build();
    return { body, value$ };
}

function triggerVisibleAndWait(el: HTMLElement): void {
    getIOMock().triggerVisibility(el, true);
    jest.advanceTimersByTime(150);
}

function getWholeEl(el: HTMLElement): HTMLElement | null {
    return el.querySelector('.text-on-surface.text-4xl') as HTMLElement | null;
}

// ---- Test suite ----
describe('MoneyKPICard — always-on visibility gating', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        getIOMock().reset();
    });

    afterEach(() => {
        // Remove any leftover children from document.body
        document.body.innerHTML = '';
        jest.useRealTimers();
        getIOMock().reset();
    });

    // -----------------------------------------------------------------------
    // 1. Root element must be a div (the card body)
    // -----------------------------------------------------------------------
    it('returns an HTMLElement (div) from build()', () => {
        const { body } = buildCard();
        expect(body).toBeInstanceOf(HTMLElement);
        expect(body.tagName.toLowerCase()).toBe('div');
    });

    it('cleans up subscriptions when body is removed from DOM', () => {
        const { body, value$ } = buildCard();
        document.body.appendChild(body);
        triggerVisibleAndWait(body);
        value$.next({ amount: 500.00, currencyId: 'USD' });
        const wholeEl = getWholeEl(body);
        expect(wholeEl?.textContent).toBe('500');
        body.remove();
        value$.next({ amount: 99999.00, currencyId: 'USD' });
        jest.advanceTimersByTime(300);
        expect(wholeEl?.textContent).toBe('500');
    });

    // -----------------------------------------------------------------------
    // 2. build() without withValue() still throws
    // -----------------------------------------------------------------------
    it('throws if build() is called without withValue()', () => {
        expect(() => new MoneyKPICardBuilder().build()).toThrow(
            'MoneyKPICardBuilder: withValue() is required before build()'
        );
    });

    // -----------------------------------------------------------------------
    // 3. Card does NOT render value until body becomes visible
    // -----------------------------------------------------------------------
    it('does not render a value before the body is visible', () => {
        const { body, value$ } = buildCard();
        document.body.appendChild(body);

        // Push a value before triggering visibility
        value$.next({ amount: 1234.56, currencyId: 'USD' });
        jest.advanceTimersByTime(300);

        const wholeEl = getWholeEl(body);
        // Value element should be empty / not yet populated
        expect(wholeEl?.textContent ?? '').toBe('');
    });

    // -----------------------------------------------------------------------
    // 4. Card renders value once body is visible + default 150ms debounce elapsed
    // -----------------------------------------------------------------------
    it('renders value after triggerVisibility(true) + debounce elapses', () => {
        const { body, value$ } = buildCard();
        document.body.appendChild(body);

        triggerVisibleAndWait(body);

        value$.next({ amount: 9999.00, currencyId: 'USD' });

        const wholeEl = getWholeEl(body);
        expect(wholeEl?.textContent).toBe('9,999');
    });

    // -----------------------------------------------------------------------
    // 5. Hiding the body stops further DOM updates
    // -----------------------------------------------------------------------
    it('stops updating the DOM after the body becomes hidden', () => {
        const { body, value$ } = buildCard();
        document.body.appendChild(body);

        // Make visible and push initial value
        triggerVisibleAndWait(body);
        value$.next({ amount: 100.00, currencyId: 'USD' });

        const wholeEl = getWholeEl(body);
        expect(wholeEl?.textContent).toBe('100');

        // Hide the body — pipeline switches to EMPTY
        getIOMock().triggerVisibility(body, false);

        // Push another value; should not reach the DOM
        value$.next({ amount: 9999.00, currencyId: 'USD' });
        jest.advanceTimersByTime(300);

        expect(wholeEl?.textContent).toBe('100');
    });

    // -----------------------------------------------------------------------
    // 6. Removing body from DOM triggers registerDestroy teardown —
    //    no further updates.
    //    TRUE teardown guard: deliberately re-trigger visibility on the removed
    //    element (WITHOUT resetting the mock) and push a new value.  A leaked
    //    subscription would process the IO callback, pass the debounce, and
    //    update the DOM — so this assertion genuinely fails if teardown didn't
    //    happen.
    // -----------------------------------------------------------------------
    it('does not update the DOM after the body is removed from the document', () => {
        const { body, value$ } = buildCard();
        document.body.appendChild(body);

        triggerVisibleAndWait(body);
        value$.next({ amount: 500.00, currencyId: 'USD' });

        const wholeEl = getWholeEl(body);
        expect(wholeEl?.textContent).toBe('500');

        // Remove body — registerDestroy fires → cleanup runs (sub.unsubscribe())
        body.remove();

        // Do NOT reset the mock.  Re-trigger visibility on the removed element
        // so that a still-live IntersectionObserver callback would fire, and
        // advance timers past the debounce window.
        getIOMock().triggerVisibility(body, true);
        jest.advanceTimersByTime(300);

        // Push a new value — if the subscription is alive it will render '99,999'
        value$.next({ amount: 99999.00, currencyId: 'USD' });
        jest.advanceTimersByTime(300);

        // Teardown must have occurred; DOM stays at the last pre-removal value
        expect(wholeEl?.textContent).toBe('500');
    });

    // -----------------------------------------------------------------------
    // 8. Defaults to 150ms debounce — value does not render before debounce elapses
    // -----------------------------------------------------------------------
    it('defaults to 150ms debounce — value does not render before debounce elapses', () => {
        const value$ = new Subject<Money>();
        const body = new MoneyKPICardBuilder().withValue(value$).build();
        document.body.appendChild(body);

        getIOMock().triggerVisibility(body, true);
        value$.next({ amount: 777.00, currencyId: 'USD' });

        // Advance only 100ms — debounce has not elapsed
        jest.advanceTimersByTime(100);
        const wholeEl = getWholeEl(body);
        expect(wholeEl?.textContent ?? '').toBe('');

        // Finish debounce
        jest.advanceTimersByTime(50);
        value$.next({ amount: 777.00, currencyId: 'USD' });
        expect(wholeEl?.textContent).toBe('777');
    });

    // -----------------------------------------------------------------------
    // 9. Re-subscribes after re-appear (body scrolls back into view)
    // -----------------------------------------------------------------------
    it('resumes updates when body re-enters the viewport after hiding', () => {
        const { body, value$ } = buildCard();
        document.body.appendChild(body);

        // First appear — push a value
        triggerVisibleAndWait(body);
        value$.next({ amount: 100.00, currencyId: 'USD' });

        const wholeEl = getWholeEl(body);
        expect(wholeEl?.textContent).toBe('100');

        // Hide
        getIOMock().triggerVisibility(body, false);
        value$.next({ amount: 200.00, currencyId: 'USD' });
        jest.advanceTimersByTime(150);
        expect(wholeEl?.textContent).toBe('100'); // still 100, not updated

        // Re-appear — wait for debounce
        getIOMock().triggerVisibility(body, true);
        jest.advanceTimersByTime(150);
        value$.next({ amount: 300.00, currencyId: 'USD' });

        expect(wholeEl?.textContent).toBe('300');
    });

    // -----------------------------------------------------------------------
    // 10. Re-subscribe self-heal: value pushed while hidden is dropped; fresh
    //     value after reappear actually renders (distinguishes live from torn-down)
    // -----------------------------------------------------------------------
    it('drops value pushed while hidden and renders a fresh value after reappear', () => {
        const { body, value$ } = buildCard();
        document.body.appendChild(body);

        // First appear — establish a known good state
        triggerVisibleAndWait(body);
        value$.next({ amount: 1000.00, currencyId: 'USD' });
        const wholeEl = getWholeEl(body);
        expect(wholeEl?.textContent).toBe('1,000');

        // Hide — pipeline suspends
        getIOMock().triggerVisibility(body, false);
        jest.advanceTimersByTime(150);

        // Push two values while hidden — neither should reach the DOM
        value$.next({ amount: 2000.00, currencyId: 'USD' });
        value$.next({ amount: 3000.00, currencyId: 'USD' });
        jest.advanceTimersByTime(150);
        expect(wholeEl?.textContent).toBe('1,000'); // still the old value

        // Re-appear — pipeline re-subscribes, wait for debounce
        getIOMock().triggerVisibility(body, true);
        jest.advanceTimersByTime(150);

        // Push a new value; this is the first emission the re-subscribed pipeline sees
        value$.next({ amount: 4000.00, currencyId: 'USD' });
        expect(wholeEl?.textContent).toBe('4,000'); // NEW value rendered
    });

    // -----------------------------------------------------------------------
    // 11. Regression: label renders correctly once visible (visual wiring survives refactor)
    // -----------------------------------------------------------------------
    it('renders label text once visible', () => {
        const value$ = new Subject<Money>();
        const label$ = new Subject<string>();
        const body = new MoneyKPICardBuilder()
            .withValue(value$)
            .withLabel(label$)
            .build();
        document.body.appendChild(body);

        triggerVisibleAndWait(body);
        label$.next('Total Revenue');
        value$.next({ amount: 500.00, currencyId: 'USD' });

        // Label is rendered by LabelBuilder — find any element containing the text
        expect(body.textContent).toContain('Total Revenue');
        expect(getWholeEl(body)?.textContent).toBe('500');
    });

    // -----------------------------------------------------------------------
    // 12. Regression: trend renders correctly once visible
    // -----------------------------------------------------------------------
    it('renders trend chip once visible', () => {
        const value$ = new Subject<Money>();
        const trend$ = new Subject<Trend>();
        const body = new MoneyKPICardBuilder()
            .withValue(value$)
            .withTrend(trend$)
            .build();
        document.body.appendChild(body);

        triggerVisibleAndWait(body);
        trend$.next({ value: 5.2, period: 'vs last month' });
        value$.next({ amount: 250.00, currencyId: 'USD' });

        // TrendBuilder renders a <span> with a trend direction class
        const trendSpan = body.querySelector('.trend-up');
        expect(trendSpan).not.toBeNull();
        expect(trendSpan?.textContent).toContain('5.2');
        expect(getWholeEl(body)?.textContent).toBe('250');
    });

    // -----------------------------------------------------------------------
    // 13. Regression: description renders correctly once visible
    // -----------------------------------------------------------------------
    it('renders description text once visible', () => {
        const value$ = new Subject<Money>();
        const description$ = new Subject<string>();
        const body = new MoneyKPICardBuilder()
            .withValue(value$)
            .withDescription(description$)
            .build();
        document.body.appendChild(body);

        triggerVisibleAndWait(body);
        description$.next('vs last quarter');
        value$.next({ amount: 750.00, currencyId: 'USD' });

        const descEl = body.querySelector('.mkp-description');
        expect(descEl).not.toBeNull();
        expect(descEl?.textContent).toContain('vs last quarter');
    });

    // -----------------------------------------------------------------------
    // 14. Regression: precision is applied once visible
    // -----------------------------------------------------------------------
    it('renders correct decimal precision once visible', () => {
        const value$ = new Subject<Money>();
        const body = new MoneyKPICardBuilder()
            .withValue(value$)
            .withPrecision(4)
            .build();
        document.body.appendChild(body);

        triggerVisibleAndWait(body);
        value$.next({ amount: 1234.5678, currencyId: 'USD' });

        // With precision 4, the cents element should show 4 decimal digits
        const centsEl = body.querySelector('.text-on-surface.text-2xl.font-semibold.leading-none');
        expect(centsEl?.textContent).toBe('5678');
    });

});
