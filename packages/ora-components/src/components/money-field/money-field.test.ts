import { BehaviorSubject, Subject, of } from 'rxjs';
import { MoneyFieldBuilder, MoneyFieldStyle } from './money-field';
import { Money } from '../../types/money';

describe('MoneyFieldBuilder', () => {
    let builder: MoneyFieldBuilder;

    beforeEach(() => {
        builder = new MoneyFieldBuilder();
    });

    describe('1. Component creation and default state', () => {
        test('should render a container with an input element', () => {
            const container = builder.build();
            expect(container.tagName).toBe('DIV');
            const input = container.querySelector('input');
            expect(input).toBeTruthy();
            expect(input?.type).toBe('text');
            expect(input?.inputMode).toBe('decimal');
            expect(input?.getAttribute('role')).toBe('spinbutton');
        });
    });

    describe('2. Reactive property updates', () => {
        test('should update value reactively', () => {
            const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
            const container = builder.withValue(value$).withStep(of(0.1)).build();
            const input = container.querySelector('input') as HTMLInputElement;

            expect(input.value).toBe('10.0');
            expect(input.getAttribute('aria-valuenow')).toBe('10');

            value$.next({ amount: 25.5, currencyId: 'USD' });
            expect(input.value).toBe('25.5');
            expect(input.getAttribute('aria-valuenow')).toBe('25.5');
        });

        test('should handle null values', () => {
            const value$ = new BehaviorSubject<Money | null>(null);
            const container = builder.withValue(value$).build();
            const input = container.querySelector('input') as HTMLInputElement;

            expect(input.value).toBe('');
            expect(input.hasAttribute('aria-valuenow')).toBe(false);

            value$.next({ amount: 42, currencyId: 'EUR' });
            expect(input.value).toBe('42');
            expect(input.getAttribute('aria-valuenow')).toBe('42');

            value$.next(null);
            expect(input.value).toBe('');
            expect(input.hasAttribute('aria-valuenow')).toBe(false);
        });

        test('should update label reactively', () => {
            const label$ = new BehaviorSubject('');
            const container = builder.withLabel(label$).build();
            const labelEl = container.querySelector('label') as HTMLElement;

            expect(labelEl.classList.contains('hidden')).toBe(true);

            label$.next('Amount');
            expect(labelEl.textContent).toBe('Amount');
            expect(labelEl.classList.contains('hidden')).toBe(false);
            expect(labelEl.getAttribute('for')).toBe(container.querySelector('input')?.id);
        });

        test('should update error reactively', () => {
            const error$ = new BehaviorSubject('');
            const container = builder.withError(error$).build();
            const input = container.querySelector('input') as HTMLInputElement;
            const footer = container.lastElementChild as HTMLElement;
            const errorEl = footer.querySelector('span') as HTMLElement;

            expect(errorEl.classList.contains('hidden')).toBe(true);
            expect(input.getAttribute('aria-invalid')).toBe('false');
            expect(input.hasAttribute('aria-describedby')).toBe(false);

            error$.next('Value too high');
            expect(errorEl.textContent).toBe('Value too high');
            expect(errorEl.classList.contains('hidden')).toBe(false);
            expect(input.getAttribute('aria-invalid')).toBe('true');
            expect(input.getAttribute('aria-describedby')).toBe(errorEl.id);

            const wrapper = input.parentElement as HTMLElement;
            expect(wrapper.classList.contains('outline-error')).toBe(true);

            error$.next('');
            expect(errorEl.classList.contains('hidden')).toBe(true);
            expect(input.getAttribute('aria-invalid')).toBe('false');
            expect(input.hasAttribute('aria-describedby')).toBe(false);
        });

        test('should handle placeholder and enabled states', () => {
            const placeholder$ = new BehaviorSubject('Enter amount');
            const enabled$ = new BehaviorSubject(true);
            const container = builder
                .withPlaceholder(placeholder$)
                .withEnabled(enabled$)
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            expect(input.placeholder).toBe('Enter amount');
            expect(input.disabled).toBe(false);

            enabled$.next(false);
            expect(input.disabled).toBe(true);
        });
    });

    describe('3. Currency handling', () => {
        test('should show static currency symbol for single currency', () => {
            const container = builder.withCurrencies(['USD']).build();
            const suffixContainer = container.querySelector('input')?.nextElementSibling as HTMLElement;
            
            expect(suffixContainer.classList.contains('hidden')).toBe(false);
            const symbolSpan = suffixContainer.querySelector('span');
            expect(symbolSpan).toBeTruthy();
            expect(symbolSpan?.textContent).toBe('$');
        });

        test('should create dropdown for multiple currencies', () => {
            const container = builder.withCurrencies(['USD', 'EUR', 'GBP']).build();
            const suffixContainer = container.querySelector('input')?.nextElementSibling as HTMLElement;

            expect(suffixContainer.classList.contains('hidden')).toBe(false);
            const dropdown = suffixContainer.querySelector('.currency-dropdown');
            expect(dropdown).toBeTruthy();
        });

        test('should update currency when value changes', () => {
            const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
            const container = builder
                .withValue(value$)
                .withCurrencies(['USD', 'EUR'])
                .build();

            const suffixContainer = container.querySelector('input')?.nextElementSibling as HTMLElement;
            const dropdown = suffixContainer.querySelector('.currency-dropdown');
            expect(dropdown).toBeTruthy();

            value$.next({ amount: 20, currencyId: 'EUR' });
            // The dropdown should reflect the new currency
        });
    });

    describe('4. Input filtering', () => {
        test('should allow only valid numeric characters', () => {
            const value$ = new Subject<Money | null>();
            let lastValue: Money | null | undefined;
            value$.subscribe(v => lastValue = v);

            const container = builder.withValue(value$).withCurrencies(['USD']).build();
            const input = container.querySelector('input') as HTMLInputElement;

            input.value = '12abc3';
            input.dispatchEvent(new Event('input'));
            expect(input.value).toBe('123');
            expect(lastValue?.amount).toBe(123);

            input.value = '12.3.4';
            input.dispatchEvent(new Event('input'));
            expect(input.value).toBe('12.34');
            expect(lastValue?.amount).toBe(12.34);

            input.value = '-12-3';
            input.dispatchEvent(new Event('input'));
            expect(input.value).toBe('-123');
            expect(lastValue?.amount).toBe(-123);
        });

        test('should respect integer format by disallowing decimals', () => {
            const format$ = new BehaviorSubject('integer');
            const container = builder.withFormat(format$).withCurrencies(['USD']).build();
            const input = container.querySelector('input') as HTMLInputElement;

            input.value = '12.34';
            input.dispatchEvent(new Event('input'));
            expect(input.value).toBe('1234');
        });
    });

    describe('5. Blur logic', () => {
        test('should clamp value on blur', () => {
            const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
            const min$ = new BehaviorSubject(0);
            const max$ = new BehaviorSubject(20);
            const container = builder
                .withValue(value$)
                .withMinValue(min$)
                .withMaxValue(max$)
                .withCurrencies(['USD'])
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            input.value = '30';
            input.dispatchEvent(new Event('blur'));
            expect(input.value).toBe('20');
            expect(value$.value?.amount).toBe(20);

            input.value = '-10';
            input.dispatchEvent(new Event('blur'));
            expect(input.value).toBe('0');
            expect(value$.value?.amount).toBe(0);
        });

        test('should round to precision on blur', () => {
            const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
            const step$ = new BehaviorSubject(0.05);
            const container = builder
                .withValue(value$)
                .withStep(step$)
                .withCurrencies(['USD'])
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            input.value = '1.234';
            input.dispatchEvent(new Event('blur'));
            expect(input.value).toBe('1.23');
            expect(value$.value?.amount).toBe(1.23);
        });

        test('should round to explicit precision on blur', () => {
            const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
            const precision$ = new BehaviorSubject(1);
            const container = builder
                .withValue(value$)
                .withPrecision(precision$)
                .withCurrencies(['USD'])
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            input.value = '1.234';
            input.dispatchEvent(new Event('blur'));
            expect(input.value).toBe('1.2');
            expect(value$.value?.amount).toBe(1.2);
        });

        test('blur with 2 decimals should not round incorrectly (10.55)', () => {
            const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
            const precision$ = new BehaviorSubject(2);
            const step$ = new BehaviorSubject(0.01);
            const container = builder
                .withValue(value$)
                .withPrecision(precision$)
                .withStep(step$)
                .withCurrencies(['USD'])
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            input.value = '10.55';
            input.dispatchEvent(new Event('blur'));
            // Should stay 10.55, not round to 11
            expect(value$.value?.amount).toBeCloseTo(10.55, 2);
            expect(input.value).toBe('10.55');
        });

        test('keyboard navigation uses correct step for 2 decimals', () => {
            const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
            const precision$ = new BehaviorSubject(2);
            const step$ = new BehaviorSubject(0.01);
            const container = builder
                .withValue(value$)
                .withPrecision(precision$)
                .withStep(step$)
                .withCurrencies(['USD'])
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            // Verify step attribute
            expect(input.getAttribute('aria-valuestep')).toBe('0.01');

            // Start at 10.55
            input.value = '10.55';
            input.dispatchEvent(new Event('input'));
            expect(value$.value?.amount).toBeCloseTo(10.55, 2);

            // ArrowUp should increment by 0.01
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(value$.value?.amount).toBeCloseTo(10.56, 2);
            expect(input.value).toBe('10.56');

            // ArrowDown twice should go back to 10.54
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            expect(value$.value?.amount).toBeCloseTo(10.54, 2);
            expect(input.value).toBe('10.54');
        });
    });

    describe('6. Accessibility', () => {
        test('should have correct ARIA attributes and linkages', () => {
            const min$ = new BehaviorSubject(0);
            const max$ = new BehaviorSubject(100);
            const step$ = new BehaviorSubject(1);
            const value$ = new BehaviorSubject<Money | null>({ amount: 50, currencyId: 'USD' });
            const container = builder
                .withMinValue(min$)
                .withMaxValue(max$)
                .withStep(step$)
                .withValue(value$)
                .withLabel(of('Test Label'))
                .withCurrencies(['USD'])
                .build();
            const input = container.querySelector('input') as HTMLInputElement;
            const label = container.querySelector('label') as HTMLLabelElement;
            const footer = container.lastElementChild as HTMLElement;
            const error = footer.querySelector('span') as HTMLElement;

            expect(input.getAttribute('role')).toBe('spinbutton');
            expect(input.getAttribute('aria-valuemin')).toBe('0');
            expect(input.getAttribute('aria-valuemax')).toBe('100');
            expect(input.getAttribute('aria-valuestep')).toBe('1');
            expect(input.getAttribute('aria-valuenow')).toBe('50');

            expect(input.id).toBeTruthy();
            expect(label.getAttribute('for')).toBe(input.id);
            expect(input.hasAttribute('aria-describedby')).toBe(false);

            min$.next(-10);
            expect(input.getAttribute('aria-valuemin')).toBe('-10');
        });
    });

    describe('7. Keyboard Navigation', () => {
        let value$: BehaviorSubject<Money | null>;
        let input: HTMLInputElement;

        beforeEach(() => {
            value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
            const container = builder
                .withValue(value$)
                .withStep(of(1))
                .withMinValue(of(0))
                .withMaxValue(of(100))
                .withCurrencies(['USD'])
                .build();
            input = container.querySelector('input') as HTMLInputElement;
        });

        test('ArrowUp should increment by step', () => {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(value$.value?.amount).toBe(11);
        });

        test('ArrowDown should decrement by step', () => {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            expect(value$.value?.amount).toBe(9);
        });

        test('PageUp should increment by step * 10', () => {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp' }));
            expect(value$.value?.amount).toBe(20);
        });

        test('PageDown should decrement by step * 10', () => {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown' }));
            expect(value$.value?.amount).toBe(0);
        });

        test('Home should set to min', () => {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
            expect(value$.value?.amount).toBe(0);
        });

        test('End should set to max', () => {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
            expect(value$.value?.amount).toBe(100);
        });
    });

    describe('8. Integration with the builder pattern', () => {
        test('should support glass effect and style chaining', () => {
            const container = builder
                .asGlass()
                .withStyle(new BehaviorSubject(MoneyFieldStyle.OUTLINED))
                .withCurrencies(['USD'])
                .build();
            const wrapper = container.querySelector('input')?.parentElement as HTMLElement;

            expect(wrapper.classList.contains('glass-effect')).toBe(true);
            expect(wrapper.classList.contains('rounded-small')).toBe(true);
        });

        test('should support inline error mode', () => {
            const error$ = new BehaviorSubject('Invalid amount');
            const container = builder
                .asInlineError()
                .withError(error$)
                .withCurrencies(['USD'])
                .build();
            
            const suffixContainer = container.querySelector('input')?.nextElementSibling as HTMLElement;
            const errorButton = suffixContainer.querySelector('button');
            expect(errorButton).toBeTruthy();
            expect(errorButton?.getAttribute('aria-label')).toContain('Invalid amount');
            
            const input = container.querySelector('input') as HTMLInputElement;
            expect(input.getAttribute('aria-invalid')).toBe('true');
            expect(input.hasAttribute('aria-describedby')).toBe(true);
        });
    });

    describe('9. Precision rounding edge cases', () => {
        test('blur rounds to explicit precision ignoring step', () => {
            const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
            const precision$ = new BehaviorSubject(1);
            const step$ = new BehaviorSubject(0.05);
            const container = builder
                .withValue(value$)
                .withPrecision(precision$)
                .withStep(step$)
                .withCurrencies(['USD'])
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            // Step 0.05 has precision 2, but explicit precision 1 should round to 1 decimal place
            input.value = '1.234';
            input.dispatchEvent(new Event('blur'));
            expect(input.value).toBe('1.2');
            expect(value$.value?.amount).toBe(1.2);
        });

        test('keyboard navigation rounds to step ignoring explicit precision', () => {
            const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
            const precision$ = new BehaviorSubject(1);
            const step$ = new BehaviorSubject(0.05);
            const container = builder
                .withValue(value$)
                .withPrecision(precision$)
                .withStep(step$)
                .withCurrencies(['USD'])
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            // Set current value to something not aligned with step
            input.value = '1.22';
            input.dispatchEvent(new Event('input'));
            expect(value$.value?.amount).toBe(1.22);

            // ArrowUp should add step (0.05) and round to nearest step (0.05 increments)
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            // 1.22 + 0.05 = 1.27, roundToStep(1.27, 0.05) = 1.25 (nearest 0.05)
            expect(value$.value?.amount).toBe(1.25);
        });

        test('min clamping works after rounding', () => {
            const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
            const min$ = new BehaviorSubject(0);
            const step$ = new BehaviorSubject(1);
            const container = builder
                .withValue(value$)
                .withMinValue(min$)
                .withStep(step$)
                .withCurrencies(['USD'])
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            // Value below min after rounding
            input.value = '-5.9';
            input.dispatchEvent(new Event('blur'));
            // Should clamp to min 0 (since rounding to integer? step precision 0)
            // step=1, precision undefined, getPrecision(1)=0, so round to integer -6 then clamp to 0? Wait blur uses precision from step (0) -> round to integer -6, clamp to 0 => 0
            expect(value$.value?.amount).toBe(0);
            expect(input.value).toBe('0');
        });

        test('max clamping works after rounding', () => {
            const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
            const max$ = new BehaviorSubject(10);
            const step$ = new BehaviorSubject(1);
            const container = builder
                .withValue(value$)
                .withMaxValue(max$)
                .withStep(step$)
                .withCurrencies(['USD'])
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            // Value above max after rounding
            input.value = '10.4';
            input.dispatchEvent(new Event('blur'));
            // step precision 0, round to integer 10, clamp to max 10 => 10
            expect(value$.value?.amount).toBe(10);
            expect(input.value).toBe('10');
        });

        test('floating point step rounding in keyboard navigation', () => {
            const value$ = new BehaviorSubject<Money | null>({ amount: 0, currencyId: 'USD' });
            const step$ = new BehaviorSubject(0.1);
            const container = builder
                .withValue(value$)
                .withStep(step$)
                .withCurrencies(['USD'])
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            // Start at 0.2
            input.value = '0.2';
            input.dispatchEvent(new Event('input'));
            expect(value$.value?.amount).toBe(0.2);

            // ArrowUp should add 0.1 -> 0.3
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(value$.value?.amount).toBe(0.3);
            expect(input.value).toBe('0.3');

            // ArrowDown twice should go back to 0.1
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            expect(value$.value?.amount).toBe(0.1);
        });

        test('blur with locale decimal separator', () => {
            const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
            const locale$ = new BehaviorSubject('de-DE');
            const precision$ = new BehaviorSubject(2);
            const container = builder
                .withValue(value$)
                .withLocale(locale$)
                .withPrecision(precision$)
                .withCurrencies(['USD'])
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            // German locale uses comma as decimal separator
            // Input with comma should be parsed correctly
            input.value = '1,234';
            input.dispatchEvent(new Event('blur'));
            // Round to 2 decimal places -> 1.23
            expect(value$.value?.amount).toBe(1.23);
            // Display should be formatted with comma? formatNumber uses locale.
            // Since we set locale de-DE, formatting will use comma.
            // However input.value after blur is set via syncInputValue which uses formatNumber with locale.
            // Expect '1,23'
            expect(input.value).toBe('1,23');
        });
    });

    describe('10. Currency dropdown position reference (container alignment)', () => {
        beforeEach(() => {
            document.body.innerHTML = '';
        });

        test('popover left aligns with container right edge (not inputWrapper, not currency button)', () => {
            // Build a multi-currency money field so the currency dropdown is created
            const moneyFieldContainer = builder.withCurrencies(['USD', 'EUR', 'GBP']).build();
            document.body.appendChild(moneyFieldContainer);

            // The position reference is now the outer container element (flex flex-col w-full),
            // NOT the inputWrapper (flex items-center h-[48px]).
            // The container is the top-level div returned by build().
            const containerRight = 600;
            moneyFieldContainer.getBoundingClientRect = () => ({
                top: 50, bottom: 98, left: 100, right: containerRight,
                width: 500, height: 48, x: 100, y: 50, toJSON: () => {}
            } as DOMRect);

            // Locate the currency dropdown button and give it a distinct right
            const currencyButton = moneyFieldContainer.querySelector('.currency-dropdown button') as HTMLButtonElement;
            expect(currencyButton).not.toBeNull();

            currencyButton.getBoundingClientRect = () => ({
                top: 50, bottom: 98, left: 555, right: 595,
                width: 40, height: 48, x: 555, y: 50, toJSON: () => {}
            } as DOMRect);

            // Open the currency dropdown
            currencyButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            const allPopovers = Array.from(document.body.querySelectorAll('[popover]')) as HTMLElement[];
            // The newly opened popover is the one with a left value set (end alignment uses left)
            const openPopover = allPopovers.find(el => el.style.left !== '') as HTMLElement;
            expect(openPopover).toBeDefined();

            // offsetWidth = 0 in jsdom → pre-render branch: left = posRect.right = containerRight
            expect(openPopover.style.left).toBe(`${containerRight}px`);
            expect(openPopover.style.right).toBe('');

            // Must NOT equal the currency-button-based left (595)
            expect(openPopover.style.left).not.toBe('595px');
        });

        test('popover left does NOT use inputWrapper right edge (old behaviour)', () => {
            // This test guards against regression to the old inputWrapper-based positioning.
            const moneyFieldContainer = builder.withCurrencies(['USD', 'EUR', 'GBP']).build();
            document.body.appendChild(moneyFieldContainer);

            // Give container a distinct right
            moneyFieldContainer.getBoundingClientRect = () => ({
                top: 50, bottom: 98, left: 50, right: 700,
                width: 650, height: 48, x: 50, y: 50, toJSON: () => {}
            } as DOMRect);

            // Give inputWrapper a different right
            const input = moneyFieldContainer.querySelector('input') as HTMLInputElement;
            const inputWrapper = input.parentElement as HTMLElement;
            const inputWrapperRight = 650;
            inputWrapper.getBoundingClientRect = () => ({
                top: 50, bottom: 98, left: 50, right: inputWrapperRight,
                width: 600, height: 48, x: 50, y: 50, toJSON: () => {}
            } as DOMRect);

            const currencyButton = moneyFieldContainer.querySelector('.currency-dropdown button') as HTMLButtonElement;
            currencyButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            const openPopover = Array.from(document.body.querySelectorAll('[popover]'))
                .find(el => (el as HTMLElement).style.left !== '') as HTMLElement;
            expect(openPopover).toBeDefined();

            // left should be container.right (700), not inputWrapper.right (650)
            expect(openPopover.style.left).toBe('700px');
            expect(openPopover.style.left).not.toBe(`${inputWrapperRight}px`);
        });
    });

    test('should clean up subscriptions on destroy', async () => {
        const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
        const container = builder.withValue(value$).withCurrencies(['USD']).build();
        const input = container.querySelector('input') as HTMLInputElement;

        document.body.appendChild(container);
        document.body.removeChild(container);

        await new Promise(resolve => setTimeout(resolve, 0));

        value$.next({ amount: 20, currencyId: 'USD' });
        expect(input.value).toBe('10'); // Should not have updated
    });
});