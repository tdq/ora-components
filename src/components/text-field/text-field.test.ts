import { BehaviorSubject } from 'rxjs';
import { TextFieldBuilder, TextFieldStyle } from './text-field';

describe('TextFieldBuilder', () => {
    let builder: TextFieldBuilder;

    beforeEach(() => {
        builder = new TextFieldBuilder();
    });

    test('should render a container with an input element', () => {
        const container = builder.build();
        expect(container.tagName).toBe('DIV');
        expect(container.querySelector('input')).toBeTruthy();
    });

    test('should update placeholder reactively', () => {
        const placeholder$ = new BehaviorSubject('Initial Placeholder');
        const container = builder.withPlaceholder(placeholder$).build();
        const input = container.querySelector('input') as HTMLInputElement;

        expect(input.placeholder).toBe('Initial Placeholder');

        placeholder$.next('Updated Placeholder');
        expect(input.placeholder).toBe('Updated Placeholder');
    });

    test('should update value reactively from observable', () => {
        const value$ = new BehaviorSubject('Initial Value');
        const container = builder.withValue(value$).build();
        const input = container.querySelector('input') as HTMLInputElement;

        expect(input.value).toBe('Initial Value');

        value$.next('Updated Value');
        expect(input.value).toBe('Updated Value');
    });

    test('should update observable on input event', () => {
        const value$ = new BehaviorSubject('Initial');
        const container = builder.withValue(value$).build();
        const input = container.querySelector('input') as HTMLInputElement;

        input.value = 'New User Input';
        input.dispatchEvent(new Event('input'));

        expect(value$.getValue()).toBe('New User Input');
    });

    test('should handle enabled state reactively', () => {
        const enabled$ = new BehaviorSubject(true);
        const container = builder.withEnabled(enabled$).build();
        const input = container.querySelector('input') as HTMLInputElement;

        expect(input.disabled).toBe(false);

        enabled$.next(false);
        expect(input.disabled).toBe(true);
    });

    test('should handle style updates reactively', () => {
        const style$ = new BehaviorSubject(TextFieldStyle.FILLED);
        const container = builder.withStyle(style$).build();
        const input = container.querySelector('input') as HTMLInputElement;

        // Check if filled style classes are present (partial match based on our mapping)
        expect(input.classList.contains('bg-surface-variant')).toBe(true);

        style$.next(TextFieldStyle.OUTLINED);
        expect(input.classList.contains('bg-surface-variant')).toBe(false);
        expect(input.classList.contains('bg-transparent')).toBe(true);
        expect(input.classList.contains('ring-outline')).toBe(true);
    });


    test('should update label reactively', () => {
        const label$ = new BehaviorSubject('');
        const container = builder.withLabel(label$).build();
        const labelEl = container.querySelector('span:first-child') as HTMLElement;

        expect(labelEl.classList.contains('hidden')).toBe(true);

        label$.next('Test Label');
        expect(labelEl.textContent).toBe('Test Label');
        expect(labelEl.classList.contains('hidden')).toBe(false);
    });

    test('should update error reactively', () => {
        const error$ = new BehaviorSubject('');
        const container = builder.withError(error$).build();
        const errorEl = container.querySelector('span:last-child') as HTMLElement;

        expect(errorEl.classList.contains('hidden')).toBe(true);

        error$.next('Invalid input');
        expect(errorEl.textContent).toBe('Invalid input');
        expect(errorEl.classList.contains('hidden')).toBe(false);
    });

    test('should apply custom class reactively', () => {
        const class$ = new BehaviorSubject('custom-class');
        const container = builder.withClass(class$).build();
        const input = container.querySelector('input') as HTMLInputElement;

        expect(input.classList.contains('custom-class')).toBe(true);

        class$.next('another-class');
        expect(input.classList.contains('custom-class')).toBe(false);
        expect(input.classList.contains('another-class')).toBe(true);
    });

    test('should apply glass effect classes when asGlass is called', () => {
        const container = builder.asGlass().build();
        const input = container.querySelector('input') as HTMLInputElement;

        expect(input.classList.contains('bg-white/10')).toBe(true);
        expect(input.classList.contains('backdrop-blur-md')).toBe(true);
        expect(input.classList.contains('border-white/20')).toBe(true);
    });

    test('should clean up subscriptions on destroy', async () => {
        const placeholder$ = new BehaviorSubject('Initial');
        const container = builder.withPlaceholder(placeholder$).build();
        const input = container.querySelector('input') as HTMLInputElement;

        document.body.appendChild(container);
        document.body.removeChild(container);

        // Wait for MutationObserver (it's asynchronous)
        await new Promise(resolve => setTimeout(resolve, 0));

        placeholder$.next('New Value After Destroy');
        expect(input.placeholder).toBe('Initial');
    });

});
