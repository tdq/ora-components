import { Observable, Subject, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { FieldStyle } from '../../theme';
import { generateFieldId } from '../component-parts';
import { registerDestroy } from '@/core/destroyable-element';
import { NumberFieldLogic, NumberFieldState } from './number-field-logic';
import { createNumberFieldLabel } from './number-field-label';
import { createNumberFieldSupportText } from './number-field-error';

export { FieldStyle as NumberFieldStyle };

export class NumberFieldBuilder implements ComponentBuilder {
    private value$?: Subject<number | null>;
    private placeholder$ = of('');
    private enabled$ = of(true);
    private style$ = of(FieldStyle.TONAL);
    private error$ = of('');
    private label$ = of('');
    private className$ = of('');
    private format$ = of('');
    private precision$ = of<number | undefined>(undefined);
    private min$ = of(-Infinity);
    private max$ = of(Infinity);
    private step$ = of(1);
    private locale$ = of<string | undefined>(undefined);
    private prefix$ = of<HTMLElement | string>('');
    private suffix$ = of<HTMLElement | string>('');
    private isGlass: boolean = false;
    private isInlineError: boolean = false;

    asGlass(): this {
        this.isGlass = true;
        return this;
    }

    asInlineError(): this {
        this.isInlineError = true;
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
        const id = generateFieldId('number-field');
        const errorId = `${id}-error`;

        const container = document.createElement('div');

        const label = createNumberFieldLabel(id);
        container.appendChild(label);

        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'relative flex items-center gap-2 px-4 transition-all duration-200 h-[48px]';
        container.appendChild(inputWrapper);

        const prefixContainer = document.createElement('span');
        prefixContainer.className = 'flex items-center shrink-0 hidden';
        inputWrapper.appendChild(prefixContainer);

        const input = document.createElement('input');
        input.id = id;
        input.type = 'text';
        input.inputMode = 'decimal';
        input.setAttribute('role', 'spinbutton');
        input.setAttribute('aria-describedby', errorId);
        input.className = 'flex-1 min-w-0 bg-transparent outline-none transition-all body-large text-on-surface text-right placeholder:text-on-surface-variant placeholder:text-left disabled:opacity-38 disabled:cursor-not-allowed h-full';
        inputWrapper.appendChild(input);

        const suffixContainer = document.createElement('span');
        suffixContainer.className = 'flex items-center shrink-0 hidden';
        inputWrapper.appendChild(suffixContainer);

        const activeIndicator = document.createElement('div');
        activeIndicator.className = 'absolute bottom-0 left-0 right-0 h-[1px] bg-outline-variant transition-all duration-200 origin-center scale-x-100 group-focus-within:h-[2px] group-focus-within:bg-primary';
        inputWrapper.appendChild(activeIndicator);

        const footer = document.createElement('div');
        footer.className = 'flex justify-between px-4 min-h-[20px] mt-1';
        container.appendChild(footer);

        const errorText = createNumberFieldSupportText(errorId);
        footer.appendChild(errorText);

        const state: NumberFieldState = {
            value$: this.value$ || new Subject<number | null>(),
            placeholder$: this.placeholder$,
            enabled$: this.enabled$,
            style$: this.style$,
            error$: this.error$,
            label$: this.label$,
            className$: this.className$,
            format$: this.format$,
            precision$: this.precision$,
            min$: this.min$,
            max$: this.max$,
            step$: this.step$,
            locale$: this.locale$,
            prefix$: this.prefix$,
            suffix$: this.suffix$,
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
            activeIndicator,
            footer,
            state
        );

        logic.init();

        registerDestroy(container, () => {
            logic.destroy();
        });

        return container;
    }
}
