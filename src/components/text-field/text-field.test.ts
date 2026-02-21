import { BehaviorSubject, of } from 'rxjs';
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
        const style$ = new BehaviorSubject(TextFieldStyle.TONAL);
        const container = builder.withStyle(style$).build();
        const inputWrapper = container.querySelector('div.relative') as HTMLElement;

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
        const inputWrapper = container.querySelector('div.relative') as HTMLElement;

        expect(inputWrapper.classList.contains('custom-class')).toBe(true);

        class$.next('another-class');
        expect(inputWrapper.classList.contains('custom-class')).toBe(false);
        expect(inputWrapper.classList.contains('another-class')).toBe(true);
    });

    test('should support password mode', () => {
        const container = builder.asPassword().build();
        const input = container.querySelector('input') as HTMLInputElement;
        expect(input.type).toBe('password');
    });

    test('should support email mode', () => {
        const container = builder.asEmail().build();
        const input = container.querySelector('input') as HTMLInputElement;
        expect(input.type).toBe('email');
    });

    test('should expose event observables', (done) => {
        const container = builder.build();
        const input = container.querySelector('input') as HTMLInputElement;
        
        builder.onFocus().subscribe(() => {
            done();
        });

        input.dispatchEvent(new FocusEvent('focus'));
    });

    test('should handle required and readonly states', () => {
        const required$ = new BehaviorSubject(false);
        const readOnly$ = new BehaviorSubject(false);
        const container = builder.withRequired(required$).withReadOnly(readOnly$).build();
        const input = container.querySelector('input') as HTMLInputElement;

        expect(input.required).toBe(false);
        expect(input.readOnly).toBe(false);

        required$.next(true);
        readOnly$.next(true);
        expect(input.required).toBe(true);
        expect(input.readOnly).toBe(true);
    });

    test('should apply glass effect classes', () => {
        const container = builder.asGlass().build();
        const inputWrapper = container.querySelector('div.relative') as HTMLElement;

        expect(inputWrapper.classList.contains('bg-white/10')).toBe(true);
        expect(inputWrapper.classList.contains('backdrop-blur-md')).toBe(true);
    });

    test('should validate value and display error', () => {
        const value$ = new BehaviorSubject('');
        const container = builder
            .withValue(value$)
            .withValidator(v => v.length < 3 ? 'Too short' : null)
            .build();
        const input = container.querySelector('input') as HTMLInputElement;
        const supportText = container.querySelector('div:last-child span:first-child') as HTMLElement;

        input.value = 'hi';
        input.dispatchEvent(new Event('input'));
        expect(supportText.textContent).toBe('Too short');
        expect(supportText.classList.contains('hidden')).toBe(false);

        input.value = 'hello';
        input.dispatchEvent(new Event('input'));
        expect(supportText.textContent).toBe('');
        expect(supportText.classList.contains('hidden')).toBe(true);
    });

    test('should validate email format', () => {
        const value$ = new BehaviorSubject('');
        const container = builder
            .withValue(value$)
            .withEmailValidation('Invalid email')
            .build();
        const input = container.querySelector('input') as HTMLInputElement;
        const supportText = container.querySelector('div:last-child span:first-child') as HTMLElement;

        input.value = 'invalid-email';
        input.dispatchEvent(new Event('input'));
        expect(supportText.textContent).toBe('Invalid email');

        input.value = 'test@example.com';
        input.dispatchEvent(new Event('input'));
        expect(supportText.textContent).toBe('');
    });

    test('should support helper text', () => {
        const helper$ = new BehaviorSubject('Helper text');
        const container = builder.withHelperText(helper$).build();
        const supportText = container.querySelector('div:last-child span:first-child') as HTMLElement;

        expect(supportText.textContent).toBe('Helper text');
        expect(supportText.classList.contains('hidden')).toBe(false);
    });

    test('should support leading and trailing icons', () => {
        const leading$ = new BehaviorSubject('<span>leading</span>');
        const trailing$ = new BehaviorSubject('<span>trailing</span>');
        const container = builder
            .withLeadingIcon(leading$)
            .withTrailingIcon(trailing$)
            .build();

        const inputWrapper = container.querySelector('div.relative') as HTMLElement;
        expect(inputWrapper.innerHTML).toContain('leading');
        expect(inputWrapper.innerHTML).toContain('trailing');
    });

    test('should support prefix and suffix', () => {
        const container = builder
            .withPrefix(of('$'))
            .withSuffix(of('USD'))
            .build();

        const inputWrapper = container.querySelector('div.relative') as HTMLElement;
        expect(inputWrapper.textContent).toContain('$');
        expect(inputWrapper.textContent).toContain('USD');
    });

    test('should handle character counter', () => {
        const value$ = new BehaviorSubject('');
        const container = builder
            .withValue(value$)
            .withMaxLength(10)
            .withCharacterCounter()
            .build();
        const charCounter = container.querySelector('div:last-child span:last-child') as HTMLElement;

        expect(charCounter.textContent).toBe('0 / 10');

        value$.next('hello');
        expect(charCounter.textContent).toBe('5 / 10');
    });

    test('should toggle password visibility', () => {
        const container = builder.withPasswordToggle().build();
        const input = container.querySelector('input') as HTMLInputElement;
        const toggleBtn = container.querySelector('button') as HTMLButtonElement;

        expect(input.type).toBe('password');
        
        toggleBtn.click();
        expect(input.type).toBe('text');

        toggleBtn.click();
        expect(input.type).toBe('password');
    });

});
