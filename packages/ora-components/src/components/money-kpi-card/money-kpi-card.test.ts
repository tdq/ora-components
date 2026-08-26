import { Subject, BehaviorSubject, of } from 'rxjs';
import { MoneyKPICardBuilder } from './money-kpi-card-builder';
import { Money } from '../../types/money';
import { Trend } from '../../types/trend';
import { GatedObserver } from '../../utils/optimized-pipeline';

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
    return el.querySelector('.mkp-whole') as HTMLElement | null;
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
    it('paints the first value synchronously before the body is visible, gates the rest', () => {
        const { body, value$ } = buildCard();
        document.body.appendChild(body);

        // First emission is painted eagerly (no IntersectionObserver needed)
        value$.next({ amount: 1234.56, currencyId: 'USD' });
        const wholeEl = getWholeEl(body);
        expect(wholeEl?.textContent).toBe('1,234');

        // Subsequent emissions stay viewport-gated
        value$.next({ amount: 9999.00, currencyId: 'USD' });
        jest.advanceTimersByTime(300);
        expect(wholeEl?.textContent).toBe('1,234');
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
    it('exercises the actual 20ms appear debounce — value 2 is not shown at 19ms, is shown at 20ms', () => {
        const value$ = new BehaviorSubject<Money>({ amount: 1, currencyId: 'USD' });
        const body = new MoneyKPICardBuilder().withValue(value$).build();
        document.body.appendChild(body);

        // Eager first paint — synchronous, no visibility needed.
        const wholeEl = getWholeEl(body);
        expect(wholeEl?.textContent).toBe('1');

        // Visibility resolves after the pipeline's 20ms appearDebounceMs. The BehaviorSubject
        // already holds value 2 by the time the debounce elapses.
        getIOMock().triggerVisibility(body, true);
        value$.next({ amount: 2, currencyId: 'USD' });

        jest.advanceTimersByTime(19);
        expect(wholeEl?.textContent).toBe('1');

        jest.advanceTimersByTime(1);
        expect(wholeEl?.textContent).toBe('2');
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
    // 7. Idempotency guard: a GatedObserver source bypasses createOptimizedPipeline
    //    and renders immediately without any triggerVisibility call.
    // -----------------------------------------------------------------------
    it('renders immediately when value$ is already a GatedObserver (no triggerVisibility needed)', () => {
        const gatedValue$ = new GatedObserver(of({ amount: 1234.56, currencyId: 'USD' }));
        const body = new MoneyKPICardBuilder()
            .withValue(gatedValue$)
            .build();
        document.body.appendChild(body);

        // No triggerVisibility call — the GatedObserver is used directly
        const wholeEl = getWholeEl(body);
        expect(wholeEl?.textContent).toBe('1,234');
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


    // -----------------------------------------------------------------------
    // 15. Negative amounts render a leading U+2212 sign span (finding #4)
    // -----------------------------------------------------------------------
    it('renders a leading minus-sign span for negative amounts', () => {
        const body = new MoneyKPICardBuilder()
            .withValue(of({ amount: -1234.56, currencyId: 'USD' }))
            .build();
        document.body.appendChild(body);

        const signEl = body.querySelector('.mkp-sign') as HTMLElement | null;
        expect(signEl?.textContent).toBe('\u2212');
        expect(signEl?.className).toContain('text-4xl');
        expect(signEl?.className).toContain('font-bold');
        expect(getWholeEl(body)?.textContent).toBe('1,234');
        expect(body.querySelector('.mkp-cents')?.textContent).toBe('56');
        expect(signEl?.nextElementSibling).toBe(body.querySelector('.mkp-symbol'));
    });

    it('renders no sign text for positive amounts', () => {
        const body = new MoneyKPICardBuilder()
            .withValue(of({ amount: 10, currencyId: 'USD' }))
            .build();
        expect(body.querySelector('.mkp-sign')?.textContent ?? '').toBe('');
    });

    // -----------------------------------------------------------------------
    // 16. Locale-aware separators (finding #5)
    // -----------------------------------------------------------------------
    it('uses locale grouping and decimal separators from withLocale', () => {
        const body = new MoneyKPICardBuilder()
            .withValue(of({ amount: 1234567.5, currencyId: 'EUR' }))
            .withLocale('de-DE')
            .build();
        expect(getWholeEl(body)?.textContent).toBe('1.234.567');
        expect(body.querySelector('.mkp-sep')?.textContent).toBe(',');
        expect(body.querySelector('.mkp-cents')?.textContent).toBe('50');
    });

    it('accepts an Observable locale', () => {
        const body = new MoneyKPICardBuilder()
            .withValue(of({ amount: 1234567.5, currencyId: 'EUR' }))
            .withLocale(of('fr-FR'))
            .build();
        expect(body.querySelector('.mkp-sep')?.textContent).toBe(',');
        expect(getWholeEl(body)?.textContent?.replace(/[\u202f\u00a0 ]/g, ' ')).toBe('1 234 567');
    });

    // -----------------------------------------------------------------------
    // 17. Precision 0 renders no separator and no cents span (finding #6)
    // -----------------------------------------------------------------------
    it('renders no separator and no cents span with precision 0', () => {
        const body = new MoneyKPICardBuilder()
            .withValue(of({ amount: 442000.49, currencyId: 'EUR' }))
            .withPrecision(0)
            .build();
        expect(body.querySelector('.mkp-sep')).toBeNull();
        expect(body.querySelector('.mkp-cents')).toBeNull();
        expect(getWholeEl(body)?.textContent).toBe('442,000');
        expect(body.querySelector('.flex.items-baseline')?.textContent).toBe('€442,000');
    });

    // -----------------------------------------------------------------------
    // 18. Currency display: symbol (no space) vs ISO code (normal space) (finding #7)
    // -----------------------------------------------------------------------
    it("renders the ISO code followed by a space with withCurrencyDisplay('code')", () => {
        const body = new MoneyKPICardBuilder()
            .withValue(of({ amount: 442000, currencyId: 'EUR' }))
            .withPrecision(0)
            .withCurrencyDisplay('code')
            .build();
        expect(body.querySelector('.mkp-symbol')?.textContent).toBe('EUR ');
        expect(body.querySelector('.flex.items-baseline')?.textContent).toBe('EUR 442,000');
    });

    it('renders the symbol with no space by default', () => {
        const body = new MoneyKPICardBuilder()
            .withValue(of({ amount: 442000, currencyId: 'EUR' }))
            .build();
        expect(body.querySelector('.mkp-symbol')?.textContent).toBe('€');
    });


    // -----------------------------------------------------------------------
    // 19. Regression (A2 review): no gap-* class sits between sign/symbol/number,
    //     and 'code' vs 'symbol' currency display are visually distinguishable.
    // -----------------------------------------------------------------------
    it('has no gap between sign/symbol/number and distinguishes symbol vs code currency display', () => {
        const symbolBody = new MoneyKPICardBuilder()
            .withValue(of({ amount: 442000, currencyId: 'EUR' }))
            .withPrecision(0)
            .build();
        const valueRow = symbolBody.querySelector('.flex.items-baseline') as HTMLElement;
        expect(valueRow.className.split(' ').some(c => c.startsWith('gap-'))).toBe(false);
        expect(valueRow.textContent).toBe('€442,000');

        const codeBody = new MoneyKPICardBuilder()
            .withValue(of({ amount: 442000, currencyId: 'EUR' }))
            .withPrecision(0)
            .withCurrencyDisplay('code')
            .build();
        expect(codeBody.querySelector('.flex.items-baseline')?.textContent).toBe('EUR 442,000');
    });


    // -----------------------------------------------------------------------
    // 20. Regression (A2 re-review): withLatestFrom no longer blanks the card
    //     while a not-yet-emitted locale/currencyDisplay Subject is pending —
    //     defaults apply immediately, then the stream's own emission re-renders.
    // -----------------------------------------------------------------------
    it('paints with en-US defaults immediately when withLocale is a pending Subject, then re-renders on emission', () => {
        const locale$ = new Subject<string>();
        const body = new MoneyKPICardBuilder()
            .withValue(of({ amount: 1234567.5, currencyId: 'EUR' }))
            .withLocale(locale$)
            .build();
        document.body.appendChild(body);

        // Defaults to en-US immediately — not blocked on locale$ emitting.
        expect(getWholeEl(body)?.textContent).toBe('1,234,567');
        expect(body.querySelector('.mkp-sep')?.textContent).toBe('.');

        // Later emission re-renders with the new locale's grouping.
        locale$.next('de-DE');
        expect(getWholeEl(body)?.textContent).toBe('1.234.567');
        expect(body.querySelector('.mkp-sep')?.textContent).toBe(',');
    });

    // -----------------------------------------------------------------------
    // 21. Regression (A2 re-review): grouping stays correct past 1e21, where
    //     Number#toString switches to exponential notation ("1e+21").
    // -----------------------------------------------------------------------
    it('groups amounts at and above 1e21 without falling back to exponential notation', () => {
        const body = new MoneyKPICardBuilder()
            .withValue(of({ amount: 1e21, currencyId: 'USD' }))
            .withPrecision(0)
            .build();
        expect(getWholeEl(body)?.textContent).toBe('1,000,000,000,000,000,000,000');
    });
});

// ---------------------------------------------------------------------------
// A2 validation suite — sign, locale, precision, currencyDisplay, eager paint,
// teardown, and first-paint render count.
// ---------------------------------------------------------------------------
describe('MoneyKPICard — A2 requirements', () => {
    const created: HTMLElement[] = [];

    function mount(el: HTMLElement): HTMLElement {
        document.body.appendChild(el);
        created.push(el);
        return el;
    }

    afterEach(() => {
        for (const el of created.splice(0)) el.remove();
        document.body.innerHTML = '';
        getIOMock().reset();
    });

    const q = (root: HTMLElement, sel: string) => root.querySelector(sel) as HTMLElement | null;
    const text = (root: HTMLElement, sel: string) => q(root, sel)?.textContent ?? null;
    const valueRow = (root: HTMLElement) => q(root, '.flex.items-baseline')!;

    // ---- Sign ------------------------------------------------------------
    it('renders the sign span with exactly the whole part size/weight classes', () => {
        const body = mount(new MoneyKPICardBuilder()
            .withValue(of({ amount: -1234.56, currencyId: 'USD' }))
            .build());
        const sign = q(body, '.mkp-sign')!;
        const whole = getWholeEl(body)!;
        const sizing = (el: HTMLElement) =>
            el.className.split(/\s+/).filter(c => /^text-\d|^font-|^leading-/.test(c)).sort().join(' ');
        expect(sign.textContent).toBe('−');
        expect(sizing(sign)).toBe(sizing(whole));
    });

    it.each([
        ['-0.004 at precision 2', -0.004, 2, '00'],
        ['-0.0049 at precision 2', -0.0049, 2, '00'],
    ])('shows no minus sign for %s (rounds to zero)', (_label, amount, precision, cents) => {
        const body = mount(new MoneyKPICardBuilder()
            .withValue(of({ amount, currencyId: 'USD' }))
            .withPrecision(precision)
            .build());
        expect(text(body, '.mkp-sign')).toBe('');
        expect(getWholeEl(body)?.textContent).toBe('0');
        expect(text(body, '.mkp-cents')).toBe(cents);
        expect(valueRow(body).textContent).not.toContain('−');
    });

    it('shows no minus sign for a negative fraction at precision 0', () => {
        const body = mount(new MoneyKPICardBuilder()
            .withValue(of({ amount: -0.4, currencyId: 'USD' }))
            .withPrecision(0)
            .build());
        expect(text(body, '.mkp-sign')).toBe('');
        expect(valueRow(body).textContent).toBe('$0');
    });

    it('still shows the minus sign when the amount rounds to a non-zero value', () => {
        const body = mount(new MoneyKPICardBuilder()
            .withValue(of({ amount: -0.006, currencyId: 'USD' }))
            .withPrecision(2)
            .build());
        expect(text(body, '.mkp-sign')).toBe('−');
        expect(text(body, '.mkp-cents')).toBe('01');
        expect(valueRow(body).textContent).toBe('−$0.01');
    });

    it('shows no minus sign for exactly zero', () => {
        const body = mount(new MoneyKPICardBuilder()
            .withValue(of({ amount: 0, currencyId: 'USD' }))
            .build());
        expect(text(body, '.mkp-sign')).toBe('');
        expect(valueRow(body).textContent).toBe('$0.00');
    });

    // ---- Locale ----------------------------------------------------------
    const intlSeps = (locale: string) => {
        const parts = new Intl.NumberFormat(locale).formatToParts(1234567.8);
        return {
            group: parts.find(p => p.type === 'group')!.value,
            decimal: parts.find(p => p.type === 'decimal')!.value,
        };
    };

    it.each(['en-US', 'de-DE', 'fr-FR'])(
        'groups per Intl-derived separators for %s',
        (locale) => {
            const { group, decimal } = intlSeps(locale);
            const body = mount(new MoneyKPICardBuilder()
                .withValue(of({ amount: 1234567.5, currencyId: 'EUR' }))
                .withLocale(locale)
                .build());
            expect(getWholeEl(body)?.textContent).toBe(['1', '234', '567'].join(group));
            expect(text(body, '.mkp-sep')).toBe(decimal);
            expect(text(body, '.mkp-cents')).toBe('50');
        }
    );

    it('falls back to en-US separators for an invalid locale tag', () => {
        const body = mount(new MoneyKPICardBuilder()
            .withValue(of({ amount: 1234567.5, currencyId: 'EUR' }))
            .withLocale('not a locale')
            .build());
        expect(getWholeEl(body)?.textContent).toBe('1,234,567');
        expect(text(body, '.mkp-sep')).toBe('.');
    });

    it('re-renders on every locale emission from an Observable source', () => {
        const locale$ = new Subject<string>();
        const body = mount(new MoneyKPICardBuilder()
            .withValue(of({ amount: 1234567.5, currencyId: 'EUR' }))
            .withLocale(locale$)
            .build());
        expect(getWholeEl(body)?.textContent).toBe('1,234,567');

        for (const locale of ['de-DE', 'fr-FR', 'en-US']) {
            locale$.next(locale);
            const { group, decimal } = intlSeps(locale);
            expect(getWholeEl(body)?.textContent).toBe(['1', '234', '567'].join(group));
            expect(text(body, '.mkp-sep')).toBe(decimal);
        }
        locale$.complete();
    });

    // ---- Precision -------------------------------------------------------
    it('re-renders immediately when precision changes', () => {
        const precision$ = new Subject<number>();
        const body = mount(new MoneyKPICardBuilder()
            .withValue(of({ amount: 1234.56, currencyId: 'USD' }))
            .withPrecision(precision$)
            .build());

        // default 2 while precision$ is pending
        expect(valueRow(body).textContent).toBe('$1,234.56');

        precision$.next(0);
        expect(q(body, '.mkp-sep')).toBeNull();
        expect(q(body, '.mkp-cents')).toBeNull();
        expect(valueRow(body).textContent).toBe('$1,235');

        precision$.next(4);
        expect(q(body, '.mkp-sep')).not.toBeNull();
        expect(valueRow(body).textContent).toBe('$1,234.5600');

        precision$.next(2);
        expect(valueRow(body).textContent).toBe('$1,234.56');
        precision$.complete();
    });

    // ---- Currency display ------------------------------------------------
    it('switches between symbol and code from an Observable currencyDisplay', () => {
        const display$ = new Subject<'symbol' | 'code'>();
        const body = mount(new MoneyKPICardBuilder()
            .withValue(of({ amount: 442000, currencyId: 'EUR' }))
            .withPrecision(0)
            .withCurrencyDisplay(display$)
            .build());

        expect(valueRow(body).textContent).toBe('€442,000');

        display$.next('code');
        expect(text(body, '.mkp-symbol')).toBe('EUR ');
        expect(valueRow(body).textContent).toBe('EUR 442,000');
        // exactly one plain U+0020 between code and digits
        expect(valueRow(body).textContent).toMatch(/^EUR 442,000$/);

        display$.next('symbol');
        expect(valueRow(body).textContent).toBe('€442,000');
        display$.complete();
    });

    it('uppercases a lowercase currencyId in code mode', () => {
        const body = mount(new MoneyKPICardBuilder()
            .withValue(of({ amount: 1000, currencyId: 'eur' }))
            .withPrecision(0)
            .withCurrencyDisplay('code')
            .build());
        expect(valueRow(body).textContent).toBe('EUR 1,000');
    });

    it('falls back to the currency id when no symbol is registered', () => {
        const body = mount(new MoneyKPICardBuilder()
            .withValue(of({ amount: 1000, currencyId: 'XYZ' }))
            .withPrecision(0)
            .build());
        expect(text(body, '.mkp-symbol')).toBe('XYZ');
    });

    it('keeps the value row free of gap-* classes in code mode too', () => {
        const body = mount(new MoneyKPICardBuilder()
            .withValue(of({ amount: -442000, currencyId: 'EUR' }))
            .withPrecision(0)
            .withCurrencyDisplay('code')
            .build());
        const row = valueRow(body);
        expect(row.className.split(/\s+/).some(c => c.startsWith('gap-'))).toBe(false);
        expect(row.textContent).toBe('−EUR 442,000');
    });

    // ---- Large magnitudes -------------------------------------------------
    it('groups a non-round amount above 1e21', () => {
        const body = mount(new MoneyKPICardBuilder()
            .withValue(of({ amount: 1.5e21, currencyId: 'USD' }))
            .withPrecision(0)
            .build());
        expect(getWholeEl(body)?.textContent).toBe('1,500,000,000,000,000,000,000');
    });

    // ---- Eager first paint + gating ---------------------------------------
    it('paints the first value synchronously off-screen and gates later values by 20ms', () => {
        jest.useFakeTimers();
        try {
            const value$ = new BehaviorSubject<Money>({ amount: 10, currencyId: 'USD' });
            const body = new MoneyKPICardBuilder().withValue(value$).withPrecision(0).build();
            // NOT appended: no IntersectionObserver entry has fired yet.
            expect(getWholeEl(body)?.textContent).toBe('10');

            document.body.appendChild(body);
            created.push(body);

            value$.next({ amount: 20, currencyId: 'USD' });
            jest.advanceTimersByTime(300);
            expect(getWholeEl(body)?.textContent).toBe('10'); // still gated

            getIOMock().triggerVisibility(body, true);
            jest.advanceTimersByTime(19);
            expect(getWholeEl(body)?.textContent).toBe('10');
            jest.advanceTimersByTime(1);
            expect(getWholeEl(body)?.textContent).toBe('20');

            value$.next({ amount: 30, currencyId: 'USD' });
            expect(getWholeEl(body)?.textContent).toBe('30'); // live once visible
            value$.complete();
        } finally {
            jest.useRealTimers();
        }
    });

    // ---- Teardown ---------------------------------------------------------
    it('releases value$, locale$, precision$ and currencyDisplay$ observers on removal', () => {
        const value$ = new Subject<Money>();
        const locale$ = new Subject<string>();
        const precision$ = new Subject<number>();
        const display$ = new Subject<'symbol' | 'code'>();

        const body = mount(new MoneyKPICardBuilder()
            .withValue(value$)
            .withLocale(locale$)
            .withPrecision(precision$)
            .withCurrencyDisplay(display$)
            .build());

        // connect
        expect(value$.observed).toBe(true);
        expect(locale$.observed).toBe(true);
        expect(precision$.observed).toBe(true);
        expect(display$.observed).toBe(true);

        // update
        value$.next({ amount: 5000, currencyId: 'USD' });
        expect(getWholeEl(body)?.textContent).toBe('5,000');

        // disconnect
        body.remove();

        expect(value$.observers.length).toBe(0);
        expect(locale$.observers.length).toBe(0);
        expect(precision$.observers.length).toBe(0);
        expect(display$.observers.length).toBe(0);

        // and nothing repaints afterwards
        locale$.next('de-DE');
        precision$.next(0);
        value$.next({ amount: 9, currencyId: 'USD' });
        expect(getWholeEl(body)?.textContent).toBe('5,000');
    });

    it('releases description$ and class$ observers on removal', () => {
        const description$ = new Subject<string>();
        const class$ = new Subject<string>();
        const body = mount(new MoneyKPICardBuilder()
            .withValue(of({ amount: 1, currencyId: 'USD' }))
            .withDescription(description$)
            .withClass(class$)
            .build());
        expect(description$.observed).toBe(true);
        expect(class$.observed).toBe(true);
        body.remove();
        expect(description$.observers.length).toBe(0);
        expect(class$.observers.length).toBe(0);
    });

    // ---- Reviewer NIT: first-paint render count ---------------------------
    it('[NIT] records how many render frames the first paint produces', () => {
        // Instrument the value row's text nodes: every state$ emission rewrites
        // .mkp-whole textContent, so counting childList mutations on it counts frames.
        const frames: string[] = [];
        const realCreateElement = document.createElement.bind(document);
        const createSpy = jest.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
            const el = realCreateElement(tag);
            if (tag === 'span') {
                let value = '';
                Object.defineProperty(el, 'textContent', {
                    configurable: true,
                    get: () => value,
                    set: (v: string) => {
                        value = v;
                        if ((el as HTMLElement).className.includes('mkp-whole')) frames.push(v);
                    },
                });
            }
            return el;
        }) as typeof document.createElement);

        try {
            new MoneyKPICardBuilder()
                .withValue(of({ amount: 442000, currencyId: 'EUR' }))
                .withPrecision(0)
                .build();
        } finally {
            createSpy.mockRestore();
        }

        // eslint-disable-next-line no-console
        console.log(`[NIT] first-paint whole-part writes: ${frames.length} -> ${JSON.stringify(frames)}`);
        // Observed today: 2 identical frames — combineLatest's startWith defaults emit
        // once and the builder's own of(...) default emits again for the last source.
        // Upper bound guards against further duplication; a fix to 1 keeps this green.
        expect(frames.length).toBeGreaterThanOrEqual(1);
        expect(frames.length).toBeLessThanOrEqual(2);
        expect(new Set(frames).size).toBe(1); // every frame paints the same text
    });
});
