import { Observable, Subject, BehaviorSubject, combineLatest, of, Subscription } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { registerDestroy } from '@/core/destroyable-element';
import { clamp, roundToStep, formatNumber } from '@/utils/number';

export enum NumberFieldStyle {
    TONAL = 'tonal',
    OUTLINED = 'outlined'
}

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const STYLE_MAP: Record<NumberFieldStyle, string> = {
    [NumberFieldStyle.TONAL]: 'bg-surface-variant rounded-t-small shadow-[inset_0_-1px_0_0_var(--md-sys-color-outline-variant)] focus:shadow-[inset_0_-2px_0_0_var(--md-sys-color-primary)]',
    [NumberFieldStyle.OUTLINED]: 'bg-transparent rounded-small ring-1 ring-inset ring-outline focus:ring-2 focus:ring-inset focus:ring-primary',
};

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
    private prefix$ = of('');
    private suffix$ = of('');
    private isGlass: boolean = false;

    asGlass(isGlass: boolean = true): this {
        this.isGlass = isGlass;
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

    withPrefix(text: Observable<string>): this {
        this.prefix$ = text;
        return this;
    }

    withSuffix(text: Observable<string>): this {
        this.suffix$ = text;
        return this;
    }

    private parseValue(val: string): number | null {
        if (!val.trim()) return null;
        const normalized = val.replace(',', '.');
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? null : parsed;
    }

    build(): HTMLElement {
        const id = `number-field-${Math.random().toString(36).substring(2, 9)}`;
        const errorId = `${id}-error`;

        const container = document.createElement('div');
        container.className = 'flex flex-col gap-px-4 w-full';

        const label = document.createElement('label');
        label.setAttribute('for', id);
        label.className = 'md-label-small text-on-surface-variant px-px-16 hidden';
        container.appendChild(label);

        // Input Wrapper (for prefix/suffix and MD3 states)
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'relative flex items-center px-px-16 transition-all duration-200';
        container.appendChild(inputWrapper);

        // Prefix
        const prefix = document.createElement('span');
        prefix.className = 'body-large text-on-surface-variant select-none mr-2 hidden';
        inputWrapper.appendChild(prefix);

        const input = document.createElement('input');
        input.id = id;
        input.type = 'text';
        input.inputMode = 'decimal';
        input.setAttribute('role', 'spinbutton');
        input.setAttribute('aria-describedby', errorId);
        input.className = cn(
            'flex-1 min-w-0 py-px-12 bg-transparent outline-none transition-all body-large placeholder:text-on-surface-variant placeholder:text-left text-on-surface text-right',
            'disabled:opacity-38 disabled:cursor-not-allowed'
        );
        inputWrapper.appendChild(input);

        // Suffix
        const suffix = document.createElement('span');
        suffix.className = 'body-large text-on-surface-variant select-none ml-2 hidden';
        inputWrapper.appendChild(suffix);

        const error = document.createElement('span');
        error.id = errorId;
        error.className = 'md-label-small text-error px-px-16 hidden';
        container.appendChild(error);

        const subscriptions = new Subscription();

        // Consolidated State
        const style$ = this.style$ || of(NumberFieldStyle.TONAL);
        const className$ = this.className$ || of('');
        const error$ = this.error$ || of('');
        const label$ = this.label$ || of('');
        const placeholder$ = this.placeholder$ || of('');
        const enabled$ = this.enabled$ || of(true);
        const format$ = this.format$ || of('');
        const precision$ = this.precision$ || of(undefined);
        const min$ = this.min$ || of(-Infinity);
        const max$ = this.max$ || of(Infinity);
        const step$ = this.step$ || of(1);
        const locale$ = this.locale$ || of(undefined);

        let currentMin = -Infinity;
        let currentMax = Infinity;
        let currentStep = 1;
        let currentFormat = '';
        let currentPrecision: number | undefined;
        let currentLocale: string | undefined;

        subscriptions.add(
            combineLatest([
                style$, className$, error$, label$, placeholder$, enabled$,
                format$, precision$, min$, max$, step$, locale$,
                this.prefix$, this.suffix$
            ]).subscribe(([
                style, extraClass, errorText, labelText, placeholder, enabled,
                format, precision, min, max, step, locale,
                prefixText, suffixText
            ]) => {
                currentMin = min;
                currentMax = max;
                currentStep = step;
                currentFormat = format;
                currentPrecision = precision;
                currentLocale = locale;

                // Prefix/Suffix
                prefix.textContent = prefixText;
                prefix.classList.toggle('hidden', !prefixText);
                suffix.textContent = suffixText;
                suffix.classList.toggle('hidden', !suffixText);

                const BASE_WRAPPER_CLASSES = 'relative flex items-center px-px-16 transition-all duration-200';
                
                inputWrapper.className = cn(
                    BASE_WRAPPER_CLASSES,
                    extraClass,
                    !!errorText && 'ring-error focus-within:ring-error shadow-[inset_0_-1px_0_0_var(--md-sys-color-error)] focus-within:shadow-[inset_0_-2px_0_0_var(--md-sys-color-primary)]'
                );

                error.textContent = errorText;
                error.classList.toggle('hidden', !errorText);
                input.setAttribute('aria-invalid', (!!errorText).toString());

                label.textContent = labelText;
                label.classList.toggle('hidden', !labelText);

                input.placeholder = placeholder;
                input.disabled = !enabled;

                input.setAttribute('aria-valuemin', min.toString());
                input.setAttribute('aria-valuemax', max.toString());
                input.setAttribute('aria-valuestep', step.toString());

                // Reset styles
                inputWrapper.classList.remove('bg-surface-variant', 'bg-transparent', 'rounded-small', 'rounded-t-small', 'shadow-[inset_0_-1px_0_0_var(--md-sys-color-outline-variant)]', 'focus-within:shadow-[inset_0_-2px_0_0_var(--md-sys-color-primary)]', 'ring-1', 'ring-inset', 'ring-outline', 'focus-within:ring-2', 'focus-within:ring-primary', 'glass-effect', 'focus-within:bg-white/20');

                // Define text color classes
                const glassTextClasses = ['text-on-primary-container', 'dark:text-white'];
                const standardLabelClasses = ['text-on-surface-variant'];
                const standardInputClasses = ['text-on-surface'];
                const standardAffixClasses = ['text-on-surface-variant'];

                if (this.isGlass) {
                    inputWrapper.classList.add('glass-effect', 'focus-within:bg-white/20');
                    if (style === NumberFieldStyle.OUTLINED) {
                        inputWrapper.classList.add('rounded-small');
                    } else {
                        inputWrapper.classList.add('rounded-t-small');
                    }

                    // Apply glass text colors
                    label.classList.remove(...standardLabelClasses);
                    label.classList.add(...glassTextClasses);

                    input.classList.remove(...standardInputClasses);
                    input.classList.add(...glassTextClasses);

                    [prefix, suffix].forEach(el => {
                        el.classList.remove(...standardAffixClasses);
                        el.classList.add(...glassTextClasses);
                    });

                    // For error/description, if we want it same as label color in glass mode
                    // Note: Usually error is red, but requirement says "description color same as label color"
                    // If error is considered "description", we might override it here.
                    // However, let's keep error red for now unless it's explicitly helper text.
                    // But wait, the prompt says "Set description color same as label color".
                    // NumberField only has 'error' slot, no separate helper text slot visible in code (unlike TextField).
                    // If the user considers error as description, we should change it.
                    // But error is usually critical. Let's assume description refers to helper text which NumberField lacks,
                    // OR it refers to the label itself (caption).
                    // Let's stick to label/input/affixes for now as they are the main "text" elements.
                    
                } else {
                    const styles = STYLE_MAP[style].split(' ');
                    // Replace focus: with focus-within:
                    styles.forEach(c => {
                        const adaptedClass = c.replace('focus:', 'focus-within:');
                        inputWrapper.classList.add(adaptedClass);
                    });

                    // Revert text colors
                    label.classList.remove(...glassTextClasses);
                    label.classList.add(...standardLabelClasses);

                    input.classList.remove(...glassTextClasses);
                    input.classList.add(...standardInputClasses);

                    [prefix, suffix].forEach(el => {
                        el.classList.remove(...glassTextClasses);
                        el.classList.add(...standardAffixClasses);
                    });
                }

                // Update display value if already set
                if (this.value$ instanceof BehaviorSubject) {
                    const val = this.value$.value;
                    const formatted = formatNumber(val, {
                        format: currentFormat,
                        precision: currentPrecision,
                        step: currentStep,
                        locale: currentLocale
                    });
                    if (this.parseValue(input.value) !== val || input.value === '') {
                        input.value = formatted;
                    }
                }
            })
        );

        subscriptions.add(this.value$?.subscribe(val => {
            const formatted = formatNumber(val, {
                format: currentFormat,
                precision: currentPrecision,
                step: currentStep,
                locale: currentLocale
            });
            if (this.parseValue(input.value) !== val || input.value === '') {
                 input.value = formatted;
            }
            if (val !== null) {
                input.setAttribute('aria-valuenow', val.toString());
            } else {
                input.removeAttribute('aria-valuenow');
            }
        }));

        // Input Filtering
        input.oninput = (e) => {
            const target = e.target as HTMLInputElement;
            let val = target.value;

            // Allow only numbers, decimal separators (.,), and one minus sign at the start
            const allowDecimal = currentFormat !== 'integer';
            
            // Regex to match valid partial numeric input
            // Allows: "", "-", "1", "-1", "1.", "1,2", "-1.2"
            let filtered = val.replace(/[^0-9.,-]/g, '');
            
            // Ensure only one minus at the beginning
            const hasMinusAtStart = filtered.startsWith('-');
            filtered = (hasMinusAtStart ? '-' : '') + filtered.replace(/-/g, '');
            
            // Ensure only one decimal point (either . or ,)
            if (allowDecimal) {
                const parts = filtered.split(/[.,]/);
                if (parts.length > 2) {
                    // Keep the first separator's type if possible, or default to .
                    const firstSepIndex = filtered.search(/[.,]/);
                    const sep = filtered[firstSepIndex];
                    filtered = parts[0] + sep + parts.slice(1).join('');
                }
            } else {
                filtered = filtered.replace(/[.,]/g, '');
            }

            if (val !== filtered) {
                target.value = filtered;
            }

            // Update value subject - normalize to . for parseFloat
            const normalized = filtered.replace(',', '.');
            const parsed = parseFloat(normalized);
            if (!isNaN(parsed)) {
                this.value$?.next(parsed);
            }
        };

        // Keyboard Handling
        input.onkeydown = (e) => {
            if (input.disabled) return;

            let newValue = this.parseValue(input.value) ?? 0;
            let handled = true;

            switch (e.key) {
                case 'ArrowUp':
                    newValue += currentStep;
                    break;
                case 'ArrowDown':
                    newValue -= currentStep;
                    break;
                case 'PageUp':
                    newValue += currentStep * 10;
                    break;
                case 'PageDown':
                    newValue -= currentStep * 10;
                    break;
                case 'Home':
                    if (currentMin !== -Infinity) newValue = currentMin;
                    else handled = false;
                    break;
                case 'End':
                    if (currentMax !== Infinity) newValue = currentMax;
                    else handled = false;
                    break;
                default:
                    handled = false;
            }

            if (handled) {
                e.preventDefault();
                const clamped = clamp(roundToStep(newValue, currentStep), currentMin, currentMax);
                this.value$?.next(clamped);
            }
        };

        // Blur Handling (Clamping, Stepping, Formatting)
        input.onblur = () => {
            const parsed = this.parseValue(input.value);
            if (parsed === null) {
                this.value$?.next(null);
                input.value = '';
                return;
            }

            const val = clamp(roundToStep(parsed, currentStep), currentMin, currentMax);

            // Re-format
            const formatted = formatNumber(val, {
                format: currentFormat,
                precision: currentPrecision,
                step: currentStep,
                locale: currentLocale
            });
            input.value = formatted;

            // Push final value
            this.value$?.next(val);
        };

        registerDestroy(container, () => {
            subscriptions.unsubscribe();
        });

        return container;
    }
}
