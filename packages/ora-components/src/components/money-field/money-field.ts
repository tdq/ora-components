import { Observable, Subject, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { FieldStyle } from '../../theme';
import { Money } from '../../types/money';
import { generateFieldId } from '../component-parts';
import { registerDestroy } from '@/core/destroyable-element';
import { MoneyFieldLogic, MoneyFieldState } from './money-field-logic';
import { createMoneyFieldLabel } from './money-field-label';
import { createMoneyFieldSupportText } from './money-field-error';

export { FieldStyle as MoneyFieldStyle };

export class MoneyFieldBuilder implements ComponentBuilder {
    private value$?: Subject<Money | null>;
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
    private isGlass: boolean = false;
    private isInlineError: boolean = false;
    private currencies: string[] = [];

    asGlass(): this {
        this.isGlass = true;
        return this;
    }

    asInlineError(): this {
        this.isInlineError = true;
        return this;
    }

    withValue(value: Subject<Money | null>): this {
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

    withLocale(locale: Observable<string>): this {
        this.locale$ = locale;
        return this;
    }

    withCurrencies(currencies: string[]): this {
        this.currencies = currencies;
        return this;
    }

    build(): HTMLElement {
        const id = generateFieldId('money-field');
        const errorId = `${id}-error`;

        const container = document.createElement('div');

        const label = createMoneyFieldLabel(id);
        container.appendChild(label);

        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'relative flex items-center gap-2 px-4 transition-all duration-200 h-[48px]';
        container.appendChild(inputWrapper);

        const input = document.createElement('input');
        input.id = id;
        input.type = 'text';
        input.inputMode = 'decimal';
        input.setAttribute('role', 'spinbutton');
        input.className = 'flex-1 min-w-0 bg-transparent outline-none transition-all body-large text-on-surface text-right placeholder:text-on-surface-variant placeholder:text-left disabled:opacity-38 disabled:cursor-not-allowed h-full';
        inputWrapper.appendChild(input);

        const suffixContainer = document.createElement('span');
        suffixContainer.className = 'flex items-center gap-2 shrink-0 hidden';
        inputWrapper.appendChild(suffixContainer);

        const activeIndicator = document.createElement('div');
        activeIndicator.className = 'absolute bottom-0 left-0 right-0 h-[1px] bg-outline-variant transition-all duration-200 origin-center scale-x-100 group-focus-within:h-[2px] group-focus-within:bg-primary';
        inputWrapper.appendChild(activeIndicator);

        const footer = document.createElement('div');
        footer.className = 'flex justify-between px-4 min-h-[20px] mt-1';
        container.appendChild(footer);

        const errorText = createMoneyFieldSupportText(errorId);
        footer.appendChild(errorText);

        const state: MoneyFieldState = {
            value$: this.value$ || new Subject<Money | null>(),
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
            isGlass: this.isGlass,
            isInlineError: this.isInlineError,
            currencies: this.currencies
        };

        const logic = new MoneyFieldLogic(
            container,
            input,
            inputWrapper,
            label,
            errorText,
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