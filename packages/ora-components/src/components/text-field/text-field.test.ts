import { BehaviorSubject, of } from 'rxjs';
import { TextFieldBuilder, TextFieldStyle } from './text-field';

describe('TextFieldBuilder', () => {
    let builder: TextFieldBuilder;

    beforeEach(() => {
        builder = new TextFieldBuilder();
        document.body.innerHTML = '';
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
        const style$ = new BehaviorSubject(TextFieldStyle.TONAL);
        const container = builder.withStyle(style$).build();
        const inputWrapper = container.querySelector('div.h-\\[48px\\]') as HTMLElement;

        expect(inputWrapper.classList.contains('bg-surface-variant')).toBe(true);

        style$.next(TextFieldStyle.OUTLINED);
        expect(inputWrapper.classList.contains('bg-surface-variant')).toBe(false);
        expect(inputWrapper.classList.contains('bg-transparent')).toBe(true);
    });

    test('should update label reactively and use label element', () => {
        const label$ = new BehaviorSubject('');
        const container = builder.withLabel(label$).build();
        const labelEl = container.querySelector('label') as HTMLLabelElement;
        const input = container.querySelector('input') as HTMLInputElement;

        expect(labelEl.classList.contains('hidden')).toBe(true);
        expect(labelEl.htmlFor).toBe(input.id);

        label$.next('Test Label');
        expect(labelEl.textContent).toBe('Test Label');
        expect(labelEl.classList.contains('hidden')).toBe(false);
    });

    test('should update error reactively and set ARIA attributes', () => {
        const error$ = new BehaviorSubject('');
        const container = builder.withError(error$).build();
        const supportText = container.querySelector('div:last-child span:first-child') as HTMLElement;
        const input = container.querySelector('input') as HTMLInputElement;

        expect(supportText.classList.contains('hidden')).toBe(true);
        expect(input.getAttribute('aria-invalid')).toBe('false');

        error$.next('Invalid input');
        expect(supportText.textContent).toBe('Invalid input');
        expect(supportText.classList.contains('hidden')).toBe(false);
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(input.getAttribute('aria-describedby')).toContain(supportText.id);
    });

    test('should apply custom class reactively', () => {
        const class$ = new BehaviorSubject('custom-class');
        const container = builder.withClass(class$).build();
        const inputWrapper = container.querySelector('div.h-\\[48px\\]') as HTMLElement;

        expect(inputWrapper.classList.contains('custom-class')).toBe(true);

        class$.next('another-class');
        expect(inputWrapper.classList.contains('custom-class')).toBe(false);
        expect(inputWrapper.classList.contains('another-class')).toBe(true);
    });

    test('should support password mode with toggle', () => {
        const container = builder.asPassword().build();
        const input = container.querySelector('input') as HTMLInputElement;
        expect(input.type).toBe('password');

        const toggleBtn = container.querySelector('button') as HTMLButtonElement;
        expect(toggleBtn).toBeTruthy();

        toggleBtn.click();
        expect(input.type).toBe('text');

        toggleBtn.click();
        expect(input.type).toBe('password');
    });

    test('should support email mode', () => {
        const container = builder.asEmail().build();
        const input = container.querySelector('input') as HTMLInputElement;
        expect(input.type).toBe('email');
    });

    test('should apply glass effect classes', () => {
        const container = builder.asGlass().build();
        const inputWrapper = container.querySelector('div.h-\\[48px\\]') as HTMLElement;

        expect(inputWrapper.classList.contains('glass-effect')).toBe(true);
    });

    test('should support prefix and suffix', () => {
        const container = builder
            .withPrefix(of('$'))
            .withSuffix(of('USD'))
            .build();

        const inputWrapper = container.querySelector('div.h-\\[48px\\]') as HTMLElement;
        expect(inputWrapper.textContent).toContain('$');
        expect(inputWrapper.textContent).toContain('USD');
    });

    test('should support inline error with popover and error outline', async () => {
        const error$ = new BehaviorSubject('');
        const container = builder.withError(error$).asInlineError().build();
        document.body.appendChild(container);

        error$.next('Some error');

        // Wait for reactive updates
        await new Promise(r => setTimeout(r, 0));

        const errorBtn = container.querySelector('button') as HTMLButtonElement;
        expect(errorBtn).toBeTruthy();

        // Check red outline on input wrapper
        const inputWrapper = container.querySelector('div.relative.flex.items-center.h-\\[48px\\]') as HTMLElement;
        expect(inputWrapper.classList.contains('outline-error')).toBe(true);

        // Click to toggle popover
        errorBtn.click();

        const popover = document.body.querySelector('.error-popover') as HTMLElement;
        expect(popover).toBeTruthy();
        expect(popover.textContent).toBe('Some error');
        expect(popover.classList.contains('elevation-2')).toBe(true);

        container.remove();
        if (popover) popover.remove();
    });

    test('should handle popover auto-close after timeout', () => {
        jest.useFakeTimers();
        const error$ = new BehaviorSubject('Error');
        const container = builder.withError(error$).asInlineError().build();
        document.body.appendChild(container);

        const errorBtn = container.querySelector('button') as HTMLButtonElement;
        expect(errorBtn).toBeTruthy();
        errorBtn.click();

        const popover = document.body.querySelector('.error-popover') as HTMLElement;
        expect(popover).toBeTruthy();

        // Advance timers by 5s
        jest.advanceTimersByTime(5000);

        jest.useRealTimers();
        container.remove();
        if (popover) popover.remove();
    });

    it('should set data-testid on the input', () => {
        const el = new TextFieldBuilder().withTestId('my-field').build();
        expect(el.querySelector('input')?.dataset.testid).toBe('my-field');
    });

    it('should put data-testid on the element that receives focus', () => {
        const el = new TextFieldBuilder().withTestId('my-field').build();
        document.body.appendChild(el);

        const tagged = el.querySelector('[data-testid="my-field"]') as HTMLElement;
        expect(tagged.tagName).toBe('INPUT');
        expect(el.querySelectorAll('input').length).toBe(1);

        tagged.focus();
        expect(document.activeElement).toBe(tagged);
    });

    it('should keep data-testid after a value emission and an error state change', () => {
        const value$ = new BehaviorSubject('a');
        const error$ = new BehaviorSubject('');
        const el = new TextFieldBuilder()
            .withValue(value$)
            .withError(error$)
            .withTestId('my-field')
            .build();
        document.body.appendChild(el);

        const input = el.querySelector('input') as HTMLInputElement;
        expect(input.dataset.testid).toBe('my-field');

        value$.next('changed');
        error$.next('Required');

        expect(input.dataset.testid).toBe('my-field');
        expect(el.querySelector('[data-testid="my-field"]')).toBe(input);

        error$.next('');
        expect(el.querySelector('[data-testid="my-field"]')).toBe(input);

        value$.complete();
        error$.complete();
    });
});


