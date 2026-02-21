import { ButtonBuilder, ButtonStyle } from './button';
import { BehaviorSubject, Subject } from 'rxjs';
import '@testing-library/jest-dom';

describe('ButtonBuilder', () => {
    it('should create a button with caption', () => {
        const caption$ = new BehaviorSubject('Submit');
        const button = new ButtonBuilder()
            .withCaption(caption$)
            .build();

        expect(button).toBeInstanceOf(HTMLButtonElement);
        expect(button.textContent).toBe('Submit');

        caption$.next('Send');
        expect(button.textContent).toBe('Send');
    });

    it('should handle enabled/disabled state', () => {
        const enabled$ = new BehaviorSubject(true);
        const button = new ButtonBuilder()
            .withCaption(new BehaviorSubject('Click'))
            .withEnabled(enabled$)
            .build();

        expect(button.disabled).toBe(false);

        enabled$.next(false);
        expect(button.disabled).toBe(true);
        expect(button).toHaveClass('disabled:opacity-50');
    });

    it('should apply correct styles', () => {
        const style$ = new BehaviorSubject(ButtonStyle.TONAL);
        const button = new ButtonBuilder()
            .withCaption(new BehaviorSubject('Delete'))
            .withStyle(style$)
            .build();

        expect(button).toHaveClass('bg-secondary-container');

        style$.next(ButtonStyle.OUTLINED);
        expect(button).not.toHaveClass('bg-secondary-container');
        expect(button).toHaveClass('border-outline');
    });

    it('should emit click events when click$ is a Subject', () => {
        const click$ = new Subject<void>();
        const spy = jest.fn();
        click$.subscribe(spy);

        const button = new ButtonBuilder()
            .withCaption(new BehaviorSubject('Click'))
            .withClick(click$)
            .build();

        button.click();
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should have default primary style if none provided', () => {
        const button = new ButtonBuilder()
            .withCaption(new BehaviorSubject('Default'))
            .build();

        expect(button).toHaveClass('bg-primary');
    });

    it('should apply custom class reactively', () => {
        const class$ = new BehaviorSubject('custom-class');
        const button = new ButtonBuilder()
            .withCaption(new BehaviorSubject('Class Test'))
            .withClass(class$)
            .build();

        expect(button.classList.contains('custom-class')).toBe(true);

        class$.next('another-class');
        expect(button.classList.contains('custom-class')).toBe(false);
        expect(button.classList.contains('another-class')).toBe(true);
    });

    it('should apply glass style to PRIMARY button', () => {
        const button = new ButtonBuilder()
            .withCaption(new BehaviorSubject('Glass'))
            .asGlass()
            .build();

        expect(button).toHaveClass('bg-white/10');
        expect(button).toHaveClass('backdrop-blur-md');
        expect(button).toHaveClass('text-on-primary'); // Kept from primary style
    });

    it('should NOT apply glass style to TEXT button', () => {
        const style$ = new BehaviorSubject(ButtonStyle.TEXT);
        const button = new ButtonBuilder()
            .withCaption(new BehaviorSubject('Text Glass'))
            .withStyle(style$)
            .asGlass()
            .build();

        // Should NOT have glass classes
        expect(button).not.toHaveClass('bg-white/10');
        expect(button).not.toHaveClass('backdrop-blur-md');
        
        // Should have text style classes
        expect(button).toHaveClass('bg-transparent');
        expect(button).toHaveClass('text-primary');
    });
});
