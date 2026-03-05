import { Observable, Subject, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { registerDestroy } from '@/core/destroyable-element';
import { NumberFieldLogic, NumberFieldState } from './number-field-logic';
import { createNumberFieldLabel } from './number-field-label';
import { createNumberFieldSupportText } from './number-field-error';

export enum NumberFieldStyle {
    TONAL = 'tonal',
    OUTLINED = 'outlined'
}

export class NumberFieldBuilder implements ComponentBuilder {
    private value$?: Subject<number | null>;
    private placeholder$?: Observable<string>;
    private enabled$?: Observable<boolean>;
    private style$?: Observable<NumberFieldStyle>;
    private error$?: Observable<string>;
    private label$?: Observable<string>;
    private className$?: Observable<string>;
    private format$?: Observable<string>;
    private precision$?: Observable<number>;
    private min$?: Observable<number>;
    private max$?: Observable<number>;
    private step$?: Observable<number>;
    private locale$?: Observable<string>;
    private prefix$?: Observable<HTMLElement | string>;
    private suffix$?: Observable<HTMLElement | string>;
    private isGlass: boolean = false;
    private isInlineError: boolean = false;

    asGlass(isGlass: boolean = true): this {
        this.isGlass = isGlass;
        return this;
    }

    asInlineError(isInlineError: boolean = true): this {
        this.isInlineError = isInlineError;
        return this;
    }

    withValue(value: Subject<number | null>): this {
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

    withStyle(style: Observable<NumberFieldStyle>): this {
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

    withFormat(format: Observable<string>): this {
        this.format$ = format;
        return this;
    }

    withPrecision(precision: Observable<number>): this {
        this.precision$ = precision;
        return this;
    }

    withLocale(locale: Observable<string>): this {
        this.locale$ = locale;
        return this;
    }

    withMinValue(min: Observable<number>): this {
        this.min$ = min;
        return this;
    }

    withMaxValue(max: Observable<number>): this {
        this.max$ = max;
        return this;
    }

    withStep(step: Observable<number>): this {
        this.step$ = step;
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

    build(): HTMLElement {
        const id = `number-field-${Math.random().toString(36).substring(2, 9)}`;
        const errorId = `${id}-error`;

        const container = document.createElement('div');

        const label = createNumberFieldLabel(id);
        container.appendChild(label);

        const inputWrapper = document.createElement('div');
        container.appendChild(inputWrapper);

        const prefixContainer = document.createElement('span');
        prefixContainer.className = 'flex items-center shrink-0 hidden mr-px-8';
        inputWrapper.appendChild(prefixContainer);

        const input = document.createElement('input');
        input.id = id;
        input.type = 'text';
        input.inputMode = 'decimal';
        input.setAttribute('role', 'spinbutton');
        input.setAttribute('aria-describedby', errorId);
        input.className = 'flex-1 min-w-0 bg-transparent outline-none body-large text-on-surface text-right placeholder:text-on-surface-variant placeholder:text-left disabled:opacity-38 disabled:cursor-not-allowed';
        inputWrapper.appendChild(input);

        const suffixContainer = document.createElement('span');
        suffixContainer.className = 'flex items-center shrink-0 hidden ml-px-8';
        inputWrapper.appendChild(suffixContainer);

        const errorText = createNumberFieldSupportText(errorId);
        container.appendChild(errorText);

        const state: NumberFieldState = {
            value$: this.value$ || new Subject<number | null>(),
            placeholder$: this.placeholder$ || of(''),
            enabled$: this.enabled$ || of(true),
            style$: this.style$ || of(NumberFieldStyle.TONAL),
            error$: this.error$ || of(''),
            label$: this.label$ || of(''),
            className$: this.className$ || of(''),
            format$: this.format$ || of(''),
            precision$: this.precision$ || of(undefined),
            min$: this.min$ || of(-Infinity),
            max$: this.max$ || of(Infinity),
            step$: this.step$ || of(1),
            locale$: this.locale$ || of(undefined),
            prefix$: this.prefix$ || of(''),
            suffix$: this.suffix$ || of(''),
            isGlass: this.isGlass,
            isInlineError: this.isInlineError
        };

        const logic = new NumberFieldLogic(
            container,
            input,
            inputWrapper,
            label,
            errorText,
            prefixContainer,
            suffixContainer,
            state
        );

        logic.init();

        registerDestroy(container, () => {
            logic.destroy();
        });

        return container;
    }
}
