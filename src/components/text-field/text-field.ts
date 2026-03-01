import { Observable, Subject, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { buildTextField, TextFieldStyle } from './text-field-logic';

export { TextFieldStyle };

export class TextFieldBuilder implements ComponentBuilder {
    private value$?: Subject<string>;
    private placeholder$ = of('');
    private enabled$ = of(true);
    private style$ = of(TextFieldStyle.TONAL);
    private error$ = of('');
    private label$ = of('');
    private className$ = of('');

    private isGlass: boolean = false;
    private isPassword: boolean = false;
    private isEmail: boolean = false;
    private isInlineError: boolean = false;

    private prefix$ = of<HTMLElement | string>('');
    private suffix$ = of<HTMLElement | string>('');

    private focusSubject = new Subject<FocusEvent>();
    private blurSubject = new Subject<FocusEvent>();
    private changeSubject = new Subject<Event>();

    withValue(value: Subject<string>): this {
        this.value$ = value;
        return this;
    }

    withPlaceholder(placeholder: Observable<string>): this {
        this.placeholder$ = placeholder;
        return this;
    }

    withEnabled(enabled: Observable<boolean>): this {
        this.enabled$ = enabled;
        return this;
    }

    withStyle(style: Observable<TextFieldStyle>): this {
        this.style$ = style;
        return this;
    }

    withError(error: Observable<string>): this {
        this.error$ = error;
        return this;
    }

    withLabel(label: Observable<string>): this {
        this.label$ = label;
        return this;
    }

    withClass(className: Observable<string>): this {
        this.className$ = className;
        return this;
    }

    withPrefix(text: Observable<HTMLElement | string>): this {
        this.prefix$ = text;
        return this;
    }

    withSuffix(text: Observable<HTMLElement | string>): this {
        this.suffix$ = text;
        return this;
    }

    asGlass(): this {
        this.isGlass = true;
        return this;
    }

    asPassword(): this {
        this.isPassword = true;
        return this;
    }

    asEmail(): this {
        this.isEmail = true;
        return this;
    }

    asInlineError(): this {
        this.isInlineError = true;
        return this;
    }

    build(): HTMLElement {
        return buildTextField({
            value$: this.value$,
            placeholder$: this.placeholder$,
            enabled$: this.enabled$,
            style$: this.style$,
            error$: this.error$,
            label$: this.label$,
            className$: this.className$,
            isGlass: this.isGlass,
            isPassword: this.isPassword,
            isEmail: this.isEmail,
            isInlineError: this.isInlineError,
            prefix$: this.prefix$,
            suffix$: this.suffix$,
            focusSubject: this.focusSubject,
            blurSubject: this.blurSubject,
            changeSubject: this.changeSubject
        });
    }
}
