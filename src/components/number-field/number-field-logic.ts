import { Observable, Subject, Subscription, combineLatest } from 'rxjs';
import { NumberFieldStyle } from './number-field';
import { clamp, roundToStep, formatNumber } from '@/utils/number';
import { createNumberFieldErrorIcon } from './number-field-error';

export interface NumberFieldState {
    value$: Subject<number | null>;
    placeholder$: Observable<string>;
    enabled$: Observable<boolean>;
    style$: Observable<NumberFieldStyle>;
    error$: Observable<string>;
    label$: Observable<string>;
    className$: Observable<string>;
    format$: Observable<string>;
    precision$: Observable<number | undefined>;
    min$: Observable<number>;
    max$: Observable<number>;
    step$: Observable<number>;
    locale$: Observable<string | undefined>;
    prefix$: Observable<HTMLElement | string>;
    suffix$: Observable<HTMLElement | string>;
    isGlass: boolean;
    isInlineError: boolean;
}

export class NumberFieldLogic {
    private subscriptions = new Subscription();

    constructor(
        private container: HTMLElement,
        private input: HTMLInputElement,
        private inputWrapper: HTMLElement,
        private label: HTMLLabelElement,
        private errorText: HTMLElement,
        private prefixContainer: HTMLElement,
        private suffixContainer: HTMLElement,
        private state: NumberFieldState
    ) { }

    init() {
        let currentMin = -Infinity;
        let currentMax = Infinity;
        let currentStep = 1;
        let currentFormat = '';
        let currentPrecision: number | undefined;
        let currentLocale: string | undefined;

        this.subscriptions.add(
            combineLatest([
                this.state.style$,
                this.state.className$,
                this.state.error$,
                this.state.label$,
                this.state.placeholder$,
                this.state.enabled$,
                this.state.format$,
                this.state.precision$,
                this.state.min$,
                this.state.max$,
                this.state.step$,
                this.state.locale$,
                this.state.prefix$,
                this.state.suffix$
            ]).subscribe(([
                style, extraClass, errorMsg, labelMsg, placeholder, enabled,
                format, precision, min, max, step, locale,
                prefixContent, suffixContent
            ]) => {
                currentMin = min;
                currentMax = max;
                currentStep = step;
                currentFormat = format;
                currentPrecision = precision;
                currentLocale = locale;

                // Label
                this.label.textContent = labelMsg;
                this.label.classList.toggle('hidden', !labelMsg);

                // Input
                this.input.placeholder = placeholder;
                this.input.disabled = !enabled;
                this.input.setAttribute('aria-valuemin', min.toString());
                this.input.setAttribute('aria-valuemax', max.toString());
                this.input.setAttribute('aria-valuestep', step.toString());
                this.input.setAttribute('aria-invalid', (!!errorMsg).toString());

                // Prefix/Suffix
                this.updateAffix(this.prefixContainer, prefixContent);
                this.updateAffix(this.suffixContainer, suffixContent);

                // Error
                this.updateError(errorMsg);

                // Styles
                this.updateStyles(style, extraClass, !!errorMsg);

                // Synchronize value format
                const currentVal = (this.state.value$ as any).value !== undefined ? (this.state.value$ as any).value : null;
                this.syncInputValue(currentVal, currentFormat, currentPrecision, currentStep, currentLocale);
            })
        );

        this.subscriptions.add(
            this.state.value$.subscribe(val => {
                this.syncInputValue(val, currentFormat, currentPrecision, currentStep, currentLocale);
                if (val !== null) {
                    this.input.setAttribute('aria-valuenow', val.toString());
                } else {
                    this.input.removeAttribute('aria-valuenow');
                }
            })
        );

        this.setupEvents(currentMin, currentMax, currentStep, currentFormat, currentPrecision, currentLocale);
    }

    private setupEvents(min: number, max: number, step: number, format: string, precision: number | undefined, locale: string | undefined) {
        // We need to re-read currents in events because they might change via observables
        // But for step/min/max we can use the latest values from closure or better - from a local state if we want to be very precise.
        // Let's use a simple approach: update local vars in the main subscription.

        // Re-declaring vars in init to be accessible by reference in events
        let latestMin = min;
        let latestMax = max;
        let latestStep = step;
        let latestFormat = format;
        let latestPrecision = precision;
        let latestLocale = locale;

        this.subscriptions.add(
            combineLatest([this.state.min$, this.state.max$, this.state.step$, this.state.format$, this.state.precision$, this.state.locale$])
                .subscribe(([mi, ma, st, fo, pr, lo]) => {
                    latestMin = mi;
                    latestMax = ma;
                    latestStep = st;
                    latestFormat = fo;
                    latestPrecision = pr;
                    latestLocale = lo;
                })
        );

        this.input.oninput = (e) => {
            const target = e.target as HTMLInputElement;
            let val = target.value;
            const allowDecimal = latestFormat !== 'integer';

            let filtered = val.replace(/[^0-9.,-]/g, '');
            const hasMinusAtStart = filtered.startsWith('-');
            filtered = (hasMinusAtStart ? '-' : '') + filtered.replace(/-/g, '');

            if (allowDecimal) {
                const parts = filtered.split(/[.,]/);
                if (parts.length > 2) {
                    const firstSepIndex = filtered.search(/[.,]/);
                    const sep = filtered[firstSepIndex];
                    filtered = parts[0] + sep + parts.slice(1).join('');
                }
            } else {
                filtered = filtered.replace(/[.,]/g, '');
            }

            if (val !== filtered) target.value = filtered;

            const normalized = filtered.replace(',', '.');
            const parsed = parseFloat(normalized);
            if (!isNaN(parsed)) {
                this.state.value$.next(parsed);
            }
        };

        this.input.onkeydown = (e) => {
            if (this.input.disabled) return;
            let newValue = this.parseValue(this.input.value) ?? 0;
            let handled = true;

            switch (e.key) {
                case 'ArrowUp': newValue += latestStep; break;
                case 'ArrowDown': newValue -= latestStep; break;
                case 'PageUp': newValue += latestStep * 10; break;
                case 'PageDown': newValue -= latestStep * 10; break;
                case 'Home': handled = latestMin !== -Infinity; if (handled) newValue = latestMin; break;
                case 'End': handled = latestMax !== Infinity; if (handled) newValue = latestMax; break;
                default: handled = false;
            }

            if (handled) {
                e.preventDefault();
                const clamped = clamp(roundToStep(newValue, latestStep), latestMin, latestMax);
                this.state.value$.next(clamped);
            }
        };

        this.input.onblur = () => {
            const parsed = this.parseValue(this.input.value);
            if (parsed === null) {
                this.state.value$.next(null);
                this.input.value = '';
                return;
            }
            const val = clamp(roundToStep(parsed, latestStep), latestMin, latestMax);
            this.syncInputValue(val, latestFormat, latestPrecision, latestStep, latestLocale);
            this.state.value$.next(val);
        };
    }

    private updateAffix(container: HTMLElement, content: HTMLElement | string) {
        container.innerHTML = '';
        if (!content) {
            container.classList.add('hidden');
            return;
        }
        container.classList.remove('hidden');
        if (content instanceof HTMLElement) {
            container.appendChild(content);
        } else {
            const span = document.createElement('span');
            span.className = 'body-large text-on-surface-variant select-none';
            span.textContent = content;
            container.appendChild(span);
        }
    }

    private updateError(msg: string) {
        if (this.state.isInlineError) {
            this.errorText.classList.add('hidden');
            this.errorText.textContent = '';

            // Manage inline error icon
            const existingIcon = this.suffixContainer.querySelector('button[aria-label^="Error:"]');
            if (msg) {
                if (!existingIcon) {
                    const icon = createNumberFieldErrorIcon(msg);
                    this.suffixContainer.classList.remove('hidden');
                    this.suffixContainer.appendChild(icon);
                } else {
                    existingIcon.setAttribute('aria-label', `Error: ${msg}`);
                    // Potentially update popover text if we had a reference, 
                    // but createNumberFieldErrorIcon recreates everything.
                    // For simplicity, if error changes, re-create or just leave as is.
                }
            } else if (existingIcon) {
                existingIcon.remove();
                if (this.suffixContainer.childNodes.length === 0) {
                    this.suffixContainer.classList.add('hidden');
                }
            }
        } else {
            this.errorText.textContent = msg;
            this.errorText.classList.toggle('hidden', !msg);
        }
    }

    private updateStyles(style: NumberFieldStyle, extraClass: string, hasError: boolean) {
        const isOutlined = style === NumberFieldStyle.OUTLINED;

        // Base container styles
        this.container.className = 'flex flex-col w-full';
        if (extraClass) this.container.classList.add(...extraClass.split(' '));

        // Input Wrapper styles - 48px height, MD3
        const baseWrapperClasses = [
            'relative', 'flex', 'items-center', 'px-px-16', 'transition-all', 'duration-200', 'h-px-48', 'box-border'
        ];

        this.inputWrapper.className = baseWrapperClasses.join(' ');

        if (this.state.isGlass) {
            this.inputWrapper.classList.add('glass-effect', 'focus-within:bg-white/20');
            this.inputWrapper.classList.add(isOutlined ? 'rounded-small' : 'rounded-t-small');
            // Border/Outline for glass
            if (isOutlined) {
                this.inputWrapper.classList.add('ring-1', 'ring-inset', 'ring-white/20');
            } else {
                this.inputWrapper.classList.add('border-b', 'border-white/20');
            }
        } else {
            if (isOutlined) {
                this.inputWrapper.classList.add('rounded-small', 'ring-1', 'ring-inset', 'ring-outline', 'focus-within:ring-2', 'focus-within:ring-primary');
                if (hasError) this.inputWrapper.classList.add('ring-error', 'focus-within:ring-error');
            } else {
                this.inputWrapper.classList.add('bg-surface-variant', 'rounded-t-small', 'border-b', 'border-outline-variant', 'focus-within:border-primary', 'focus-within:border-b-2');
                if (hasError) this.inputWrapper.classList.add('ring-error', 'focus-within:ring-error', 'border-error', 'focus-within:border-error');
            }
        }
    }

    private syncInputValue(val: number | null, format: string, precision: number | undefined, step: number, locale: string | undefined) {
        const formatted = formatNumber(val, { format, precision, step, locale });
        if (this.parseValue(this.input.value) !== val || this.input.value === '' && val !== null) {
            this.input.value = formatted;
        }
    }

    private parseValue(val: string): number | null {
        if (!val.trim()) return null;
        const normalized = val.replace(',', '.');
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? null : parsed;
    }

    destroy() {
        this.subscriptions.unsubscribe();
    }
}
