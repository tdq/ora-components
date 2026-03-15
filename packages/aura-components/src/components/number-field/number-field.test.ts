import { BehaviorSubject, Subject, of } from 'rxjs';
import { NumberFieldBuilder, NumberFieldStyle } from './number-field';

describe('NumberFieldBuilder', () => {
    let builder: NumberFieldBuilder;

    beforeEach(() => {
        builder = new NumberFieldBuilder();
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
            const value$ = new BehaviorSubject<number | null>(10);
            // Set step to 0.1 to allow one decimal place in formatting
            const container = builder.withValue(value$).withStep(of(0.1)).build();
            const input = container.querySelector('input') as HTMLInputElement;

            expect(input.value).toBe('10.0');
            expect(input.getAttribute('aria-valuenow')).toBe('10');

            value$.next(25.5);
            expect(input.value).toBe('25.5');
            expect(input.getAttribute('aria-valuenow')).toBe('25.5');
        });

        test('should handle null values', () => {
            const value$ = new BehaviorSubject<number | null>(null);
            const container = builder.withValue(value$).build();
            const input = container.querySelector('input') as HTMLInputElement;

            expect(input.value).toBe('');
            expect(input.hasAttribute('aria-valuenow')).toBe(false);

            value$.next(42);
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
            // The error element is inside the footer div
            const footer = container.lastElementChild as HTMLElement;
            const errorEl = footer.querySelector('span') as HTMLElement;

            expect(errorEl.classList.contains('hidden')).toBe(true);
            expect(input.getAttribute('aria-invalid')).toBe('false');

            error$.next('Value too high');
            expect(errorEl.textContent).toBe('Value too high');
            expect(errorEl.classList.contains('hidden')).toBe(false);
            expect(input.getAttribute('aria-invalid')).toBe('true');

            // Error styles are on the wrapper (outline-based, matching text-field)
            const wrapper = input.parentElement as HTMLElement;
            expect(wrapper.classList.contains('outline-error')).toBe(true);
        });

        test('should handle placeholder and enabled states', () => {
            const placeholder$ = new BehaviorSubject('Enter number');
            const enabled$ = new BehaviorSubject(true);
            const container = builder
                .withPlaceholder(placeholder$)
                .withEnabled(enabled$)
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            expect(input.placeholder).toBe('Enter number');
            expect(input.disabled).toBe(false);

            enabled$.next(false);
            expect(input.disabled).toBe(true);
        });
    });

    describe('3. Input filtering', () => {
        test('should allow only valid numeric characters', () => {
            const value$ = new Subject<number | null>();
            let lastValue: number | null | undefined;
            value$.subscribe(v => lastValue = v);

            const container = builder.withValue(value$).build();
            const input = container.querySelector('input') as HTMLInputElement;

            input.value = '12abc3';
            input.dispatchEvent(new Event('input'));
            expect(input.value).toBe('123');
            expect(lastValue).toBe(123);

            input.value = '12.3.4';
            input.dispatchEvent(new Event('input'));
            expect(input.value).toBe('12.34');
            expect(lastValue).toBe(12.34);

            input.value = '-12-3';
            input.dispatchEvent(new Event('input'));
            expect(input.value).toBe('-123');
            expect(lastValue).toBe(-123);
        });

        test('should respect integer format by disallowing decimals', () => {
            const format$ = new BehaviorSubject('integer');
            const container = builder.withFormat(format$).build();
            const input = container.querySelector('input') as HTMLInputElement;

            input.value = '12.34';
            input.dispatchEvent(new Event('input'));
            expect(input.value).toBe('1234');
        });
    });

    describe('4. Blur logic', () => {
        test('should clamp value on blur', () => {
            const value$ = new BehaviorSubject<number | null>(10);
            const min$ = new BehaviorSubject(0);
            const max$ = new BehaviorSubject(20);
            const container = builder
                .withValue(value$)
                .withMinValue(min$)
                .withMaxValue(max$)
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            input.value = '30';
            input.dispatchEvent(new Event('blur'));
            expect(input.value).toBe('20');
            expect(value$.value).toBe(20);

            input.value = '-10';
            input.dispatchEvent(new Event('blur'));
            expect(input.value).toBe('0');
            expect(value$.value).toBe(0);
        });

        test('should round to step on blur', () => {
            const value$ = new BehaviorSubject<number | null>(10);
            const step$ = new BehaviorSubject(5);
            const container = builder
                .withValue(value$)
                .withStep(step$)
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            input.value = '12';
            input.dispatchEvent(new Event('blur'));
            expect(input.value).toBe('10');
            expect(value$.value).toBe(10);

            input.value = '13';
            input.dispatchEvent(new Event('blur'));
            expect(input.value).toBe('15');
            expect(value$.value).toBe(15);
        });

        test('should handle floating point precision in stepping', () => {
            const value$ = new BehaviorSubject<number | null>(0);
            const step$ = new BehaviorSubject(0.1);
            const container = builder
                .withValue(value$)
                .withStep(step$)
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            input.value = '0.2';
            input.dispatchEvent(new Event('input'));

            // Simulate ArrowUp (0.2 + 0.1)
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(value$.value).toBe(0.3);
            expect(input.value).toBe('0.3');
        });
    });

    describe('5. Accessibility', () => {
        test('should have correct ARIA attributes and linkages', () => {
            const min$ = new BehaviorSubject(0);
            const max$ = new BehaviorSubject(100);
            const step$ = new BehaviorSubject(1);
            const value$ = new BehaviorSubject<number | null>(50);
            const container = builder
                .withMinValue(min$)
                .withMaxValue(max$)
                .withStep(step$)
                .withValue(value$)
                .withLabel(of('Test Label'))
                .build();
            const input = container.querySelector('input') as HTMLInputElement;
            const label = container.querySelector('label') as HTMLLabelElement;
            // Error element is now inside footer div
            const footer = container.lastElementChild as HTMLElement;
            const error = footer.querySelector('span') as HTMLElement;

            expect(input.getAttribute('role')).toBe('spinbutton');
            expect(input.getAttribute('aria-valuemin')).toBe('0');
            expect(input.getAttribute('aria-valuemax')).toBe('100');
            expect(input.getAttribute('aria-valuestep')).toBe('1');
            expect(input.getAttribute('aria-valuenow')).toBe('50');

            // ID Linkage
            expect(input.id).toBeTruthy();
            expect(label.getAttribute('for')).toBe(input.id);
            expect(input.getAttribute('aria-describedby')).toBe(error.id);

            min$.next(-10);
            expect(input.getAttribute('aria-valuemin')).toBe('-10');
        });
    });

    describe('6. Keyboard Navigation', () => {
        let value$: BehaviorSubject<number | null>;
        let input: HTMLInputElement;

        beforeEach(() => {
            value$ = new BehaviorSubject<number | null>(10);
            const container = builder
                .withValue(value$)
                .withStep(of(1))
                .withMinValue(of(0))
                .withMaxValue(of(100))
                .build();
            input = container.querySelector('input') as HTMLInputElement;
        });

        test('ArrowUp should increment by step', () => {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(value$.value).toBe(11);
        });

        test('ArrowDown should decrement by step', () => {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            expect(value$.value).toBe(9);
        });

        test('PageUp should increment by step * 10', () => {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp' }));
            expect(value$.value).toBe(20);
        });

        test('PageDown should decrement by step * 10', () => {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown' }));
            expect(value$.value).toBe(0);
        });

        test('Home should set to min', () => {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
            expect(value$.value).toBe(0);
        });

        test('End should set to max', () => {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
            expect(value$.value).toBe(100);
        });
    });

    describe('6. Integration with the builder pattern', () => {
        test('should support glass effect and style chaining', () => {
            const container = builder
                .asGlass()
                .withStyle(new BehaviorSubject(NumberFieldStyle.OUTLINED))
                .build();
            // Styles are now applied to the wrapper div (parent of input)
            const wrapper = container.querySelector('input')?.parentElement as HTMLElement;

            expect(wrapper.classList.contains('glass-effect')).toBe(true);
            expect(wrapper.classList.contains('rounded-small')).toBe(true);
        });
    });

    describe('7. Prefix and Suffix', () => {
        test('should render prefix and suffix when provided', () => {
            const prefix$ = new BehaviorSubject('Pre');
            const suffix$ = new BehaviorSubject('Suf');
            const container = builder
                .withPrefix(prefix$)
                .withSuffix(suffix$)
                .build();

            const inputWrapper = container.querySelector('input')?.parentElement as HTMLElement;
            // First child of wrapper is prefix, input, then suffix
            const prefixEl = inputWrapper.firstElementChild as HTMLElement;
            const suffixEl = inputWrapper.lastElementChild as HTMLElement;

            expect(prefixEl.tagName).toBe('SPAN');
            expect(prefixEl.textContent).toBe('Pre');
            expect(prefixEl.classList.contains('hidden')).toBe(false);

            expect(suffixEl.tagName).toBe('SPAN');
            expect(suffixEl.textContent).toBe('Suf');
            expect(suffixEl.classList.contains('hidden')).toBe(false);

            // Update observables
            prefix$.next('');
            expect(prefixEl.classList.contains('hidden')).toBe(true);

            suffix$.next('New Suffix');
            expect(suffixEl.textContent).toBe('New Suffix');
        });
    });

    test('should clean up subscriptions on destroy', async () => {
        const value$ = new BehaviorSubject<number | null>(10);
        const container = builder.withValue(value$).build();
        const input = container.querySelector('input') as HTMLInputElement;

        document.body.appendChild(container);
        document.body.removeChild(container);

        // Wait for MutationObserver
        await new Promise(resolve => setTimeout(resolve, 0));

        value$.next(20);
        expect(input.value).toBe('10'); // Should not have updated
    });

    describe('8. Inline Error State', () => {
        test('should render error icon and show popover on click', async () => {
            const error$ = new BehaviorSubject('');
            const container = builder.asInlineError().withError(error$).build();
            document.body.appendChild(container);

            const inputWrapper = container.querySelector('input')?.parentElement as HTMLElement;
            // suffixContainer is the span after the input, before the activeIndicator
            const spans = inputWrapper.querySelectorAll(':scope > span');
            const suffixContainer = spans[spans.length - 1] as HTMLElement;

            expect(suffixContainer.querySelector('button')).toBeNull();

            error$.next('Invalid number');
            const errorButton = suffixContainer.querySelector('button') as HTMLButtonElement;
            expect(errorButton).toBeTruthy();
            expect(errorButton.getAttribute('aria-label')).toContain('Invalid number');

            // Check outline-based error on wrapper (matching text-field)
            expect(inputWrapper.classList.contains('outline-error')).toBe(true);

            // Find the popover
            const popover = document.body.querySelector('.error-popover') as HTMLElement;
            expect(popover).toBeTruthy();
            expect(popover.textContent).toBe('Invalid number');

            // Click icon to show popover
            errorButton.click();

            // In JSDOM, showPopover might not be implemented, so we check if display changes or just assume call happened
            // The component handles fallback to style.display = 'block'
            expect(popover.style.display).not.toBe('none');

            error$.next('');
            expect(suffixContainer.querySelector('button')).toBeNull();

            document.body.removeChild(container);
            await new Promise(resolve => setTimeout(resolve, 0));
        });
    });
});
