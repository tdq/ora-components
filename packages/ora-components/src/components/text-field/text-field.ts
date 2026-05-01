import { Observable, Subject, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { FieldStyle } from '../../theme';
import { generateFieldId } from '../component-parts';
import { buildTextField } from './text-field-logic';
import { createTextFieldLabel } from './text-field-label';
import { createTextFieldIconContainer } from './text-field-icon';
import { createTextFieldSupportText } from './text-field-error';

export { FieldStyle as TextFieldStyle };

export class TextFieldBuilder implements ComponentBuilder {
    private value$?: Subject<string>;
    private placeholder$ = of('');
    private enabled$ = of(true);
    private style$ = of(FieldStyle.TONAL);
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

    withStyle(style: Observable<FieldStyle>): this {
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
        const id = generateFieldId('text-field');
        const errorId = `${id}-error`;

        const container = document.createElement('div');
        container.className = 'flex flex-col w-full group';

        const label = createTextFieldLabel(id);
        container.appendChild(label);

        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'relative flex items-center gap-2 px-4 transition-all duration-200 h-[48px]';
        container.appendChild(inputWrapper);

        const leadingIconContainer = createTextFieldIconContainer('hidden');
        inputWrapper.appendChild(leadingIconContainer);

        const prefix = document.createElement('span');
        prefix.className = 'body-large text-on-surface-variant select-none';
        inputWrapper.appendChild(prefix);

        const input = document.createElement('input');
        input.id = id;
        inputWrapper.appendChild(input);

        const suffix = document.createElement('span');
        suffix.className = 'body-large text-on-surface-variant select-none';
        inputWrapper.appendChild(suffix);

        const trailingIconContainer = createTextFieldIconContainer();
        inputWrapper.appendChild(trailingIconContainer);

        const activeIndicator = document.createElement('div');
        activeIndicator.className = 'absolute bottom-0 left-0 right-0 h-[1px] bg-outline-variant transition-all duration-200 origin-center scale-x-100 group-focus-within:h-[2px] group-focus-within:bg-primary';
        inputWrapper.appendChild(activeIndicator);

        const footer = document.createElement('div');
        footer.className = 'flex justify-between px-4 min-h-[20px] mt-1';
        container.appendChild(footer);

        const supportText = createTextFieldSupportText(errorId);
        footer.appendChild(supportText);

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
        }, {
            container,
            label,
            input,
            inputWrapper,
            prefix,
            suffix,
            leadingIconContainer,
            trailingIconContainer,
            activeIndicator,
            footer,
            supportText
        });
    }
}
