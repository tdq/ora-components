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
});
