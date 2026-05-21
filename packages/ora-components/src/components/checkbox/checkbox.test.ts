import { CheckboxBuilder } from './checkbox';
import { BehaviorSubject } from 'rxjs';
import '@testing-library/jest-dom';

describe('CheckboxBuilder', () => {
    it('should create a checkbox with caption', () => {
        const caption$ = new BehaviorSubject('Accept Terms');
        const checkbox = new CheckboxBuilder()
            .withCaption(caption$)
            .build();

        expect(checkbox).toBeInstanceOf(HTMLLabelElement);
        expect(checkbox.textContent).toBe('Accept Terms');

        caption$.next('Terms and Conditions');
        expect(checkbox.textContent).toBe('Terms and Conditions');
    });

    it('should handle enabled/disabled state', () => {
        const enabled$ = new BehaviorSubject(true);
        const checkbox = new CheckboxBuilder()
            .withCaption(new BehaviorSubject('Enable me'))
            .withEnabled(enabled$)
            .build();

        const input = checkbox.querySelector('input') as HTMLInputElement;
        expect(input.disabled).toBe(false);
        expect(checkbox).toHaveClass('cursor-pointer');

        enabled$.next(false);
        expect(input.disabled).toBe(true);
        expect(checkbox).toHaveClass('opacity-38');
        expect(checkbox).toHaveClass('cursor-not-allowed');
    });

    it('should handle value state (two-way binding)', () => {
        const value$ = new BehaviorSubject(false);
        const checkbox = new CheckboxBuilder()
            .withValue(value$)
            .build();

        const input = checkbox.querySelector('input') as HTMLInputElement;
        expect(input.checked).toBe(false);

        // Update from observable
        value$.next(true);
        expect(input.checked).toBe(true);

        // Update from interaction
        input.checked = false;
        input.dispatchEvent(new Event('change'));
        expect(value$.value).toBe(false);
    });

    it('should apply glass styles', () => {
        const checkbox = new CheckboxBuilder()
            .asGlass()
            .build();

        // The glass effect should be applied to the box, not the root label
        const input = checkbox.querySelector('input') as HTMLInputElement;
        const box = input.nextElementSibling;
        expect(box).toHaveClass('glass-effect');
    });

    it('should apply custom class reactively', () => {
        const class$ = new BehaviorSubject('custom-class');
        const checkbox = new CheckboxBuilder()
            .withClass(class$)
            .build();

        expect(checkbox.classList.contains('custom-class')).toBe(true);

        class$.next('another-class');
        expect(checkbox.classList.contains('custom-class')).toBe(false);
        expect(checkbox.classList.contains('another-class')).toBe(true);
    });

    describe('intermediate state', () => {
        it('emitting intermediate sets input.checked=true, input.indeterminate=true, and applies transform overrides', () => {
            const value$ = new BehaviorSubject<import('./checkbox').CheckboxValue>(false);
            const checkbox = new CheckboxBuilder().withValue(value$).build();
            const input = checkbox.querySelector('input') as HTMLInputElement;
            const container = input.parentElement as HTMLElement;
            const iconContainer = container.children[2] as HTMLElement;
            const indeterminateContainer = container.children[4] as HTMLElement;

            value$.next('intermediate');

            expect(input.checked).toBe(true);
            expect(input.indeterminate).toBe(true);
            expect(iconContainer.style.transform).toBe('scale(0)');
            expect(indeterminateContainer.style.transform).toBe('scale(1)');
        });

        it('emitting true after intermediate sets checked=true, clears transforms', () => {
            const value$ = new BehaviorSubject<import('./checkbox').CheckboxValue>('intermediate');
            const checkbox = new CheckboxBuilder().withValue(value$).build();
            const input = checkbox.querySelector('input') as HTMLInputElement;
            const container = input.parentElement as HTMLElement;
            const iconContainer = container.children[2] as HTMLElement;
            const indeterminateContainer = container.children[4] as HTMLElement;

            // confirm intermediate is the starting state
            expect(input.checked).toBe(true);
            expect(iconContainer.style.transform).toBe('scale(0)');
            expect(indeterminateContainer.style.transform).toBe('scale(1)');

            value$.next(true);

            expect(input.indeterminate).toBe(false);
            expect(input.checked).toBe(true);
            expect(iconContainer.style.transform).toBe('');
            expect(indeterminateContainer.style.transform).toBe('');
        });

        it('emitting false after intermediate sets checked=false, clears transforms', () => {
            const value$ = new BehaviorSubject<import('./checkbox').CheckboxValue>('intermediate');
            const checkbox = new CheckboxBuilder().withValue(value$).build();
            const input = checkbox.querySelector('input') as HTMLInputElement;
            const container = input.parentElement as HTMLElement;
            const iconContainer = container.children[2] as HTMLElement;
            const indeterminateContainer = container.children[4] as HTMLElement;

            // confirm intermediate is the starting state
            expect(input.checked).toBe(true);
            expect(iconContainer.style.transform).toBe('scale(0)');

            value$.next(false);

            expect(input.indeterminate).toBe(false);
            expect(input.checked).toBe(false);
            expect(iconContainer.style.transform).toBe('');
            expect(indeterminateContainer.style.transform).toBe('');
        });

        it('clicking while intermediate emits true (not false)', () => {
            const value$ = new BehaviorSubject<import('./checkbox').CheckboxValue>('intermediate');
            const checkbox = new CheckboxBuilder().withValue(value$).build();
            const input = checkbox.querySelector('input') as HTMLInputElement;

            // Simulate a browser click on an indeterminate checkbox: browser sets checked=true
            // but onChangeFn must emit true based on currentValue, not input.checked
            input.dispatchEvent(new Event('change'));

            expect(value$.value).toBe(true);
        });
    });

});
