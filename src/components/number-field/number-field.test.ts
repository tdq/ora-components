import { BehaviorSubject, Subject } from 'rxjs';
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
            const value$ = new BehaviorSubject(10);
            const container = builder.withValue(value$).build();
            const input = container.querySelector('input') as HTMLInputElement;

            // Default format '0.##' results in 2 fixed decimal places if dot is present in format
            expect(input.value).toBe('10.00');
            expect(input.getAttribute('aria-valuenow')).toBe('10');

            value$.next(25.5);
            expect(input.value).toBe('25.50');
            expect(input.getAttribute('aria-valuenow')).toBe('25.5');
        });

        test('should update label reactively', () => {
            const label$ = new BehaviorSubject('');
            const container = builder.withLabel(label$).build();
            const labelEl = container.querySelector('span:first-child') as HTMLElement;

            expect(labelEl.classList.contains('hidden')).toBe(true);

            label$.next('Amount');
            expect(labelEl.textContent).toBe('Amount');
            expect(labelEl.classList.contains('hidden')).toBe(false);
        });

        test('should update error reactively', () => {
            const error$ = new BehaviorSubject('');
            const container = builder.withError(error$).build();
            const input = container.querySelector('input') as HTMLInputElement;
            const errorEl = container.querySelector('span:last-child') as HTMLElement;

            expect(errorEl.classList.contains('hidden')).toBe(true);
            expect(input.getAttribute('aria-invalid')).toBe('false');

            error$.next('Value too high');
            expect(errorEl.textContent).toBe('Value too high');
            expect(errorEl.classList.contains('hidden')).toBe(false);
            expect(input.getAttribute('aria-invalid')).toBe('true');
            expect(input.classList.contains('ring-error')).toBe(true);
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
            const value$ = new Subject<number>();
            let lastValue: number | undefined;
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
            const value$ = new BehaviorSubject(10);
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
            expect(input.value).toBe('20.00');
            expect(value$.value).toBe(20);

            input.value = '-10';
            input.dispatchEvent(new Event('blur'));
            expect(input.value).toBe('0.00');
            expect(value$.value).toBe(0);
        });

        test('should round to step on blur', () => {
            const value$ = new BehaviorSubject(10);
            const step$ = new BehaviorSubject(5);
            const container = builder
                .withValue(value$)
                .withStep(step$)
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            input.value = '12';
            input.dispatchEvent(new Event('blur'));
            expect(input.value).toBe('10.00');
            expect(value$.value).toBe(10);

            input.value = '13';
            input.dispatchEvent(new Event('blur'));
            expect(input.value).toBe('15.00');
            expect(value$.value).toBe(15);
        });

        test('should format value based on format string on blur', () => {
            const value$ = new BehaviorSubject(10);
            const format$ = new BehaviorSubject('0.00');
            const container = builder
                .withValue(value$)
                .withFormat(format$)
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            input.value = '12.345';
            input.dispatchEvent(new Event('blur'));
            expect(input.value).toBe('12.35');
            expect(value$.value).toBe(12.345);
        });
    });

    describe('5. Accessibility', () => {
        test('should have correct ARIA attributes', () => {
            const min$ = new BehaviorSubject(0);
            const max$ = new BehaviorSubject(100);
            const step$ = new BehaviorSubject(1);
            const value$ = new BehaviorSubject(50);
            const container = builder
                .withMinValue(min$)
                .withMaxValue(max$)
                .withStep(step$)
                .withValue(value$)
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            expect(input.getAttribute('role')).toBe('spinbutton');
            expect(input.getAttribute('aria-valuemin')).toBe('0');
            expect(input.getAttribute('aria-valuemax')).toBe('100');
            expect(input.getAttribute('aria-valuestep')).toBe('1');
            expect(input.getAttribute('aria-valuenow')).toBe('50');

            min$.next(-10);
            expect(input.getAttribute('aria-valuemin')).toBe('-10');
        });
    });

    describe('6. Integration with the builder pattern', () => {
        test('should support glass effect and style chaining', () => {
            const container = builder
                .asGlass()
                .withStyle(new BehaviorSubject(NumberFieldStyle.OUTLINED))
                .build();
            const input = container.querySelector('input') as HTMLInputElement;

            expect(input.classList.contains('backdrop-blur-md')).toBe(true);
            expect(input.classList.contains('rounded-small')).toBe(true);
        });
    });

    test('should clean up subscriptions on destroy', async () => {
        const value$ = new BehaviorSubject(10);
        const container = builder.withValue(value$).build();
        const input = container.querySelector('input') as HTMLInputElement;

        document.body.appendChild(container);
        document.body.removeChild(container);

        // Wait for MutationObserver
        await new Promise(resolve => setTimeout(resolve, 0));

        value$.next(20);
        expect(input.value).toBe('10.00'); // Should not have updated
    });
});
