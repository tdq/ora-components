import { Observable, Subject, BehaviorSubject, combineLatest, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { registerDestroy } from '@/core/destroyable-element';

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
    private value$?: Subject<number>;
    private placeholder$?: Observable<string>;
    private enabled$?: Observable<boolean>;
    private style$?: Observable<NumberFieldStyle>;
    private error$?: Observable<string>;
    private label$?: Observable<string>;
    private className$?: Observable<string>;
    private format$?: Observable<string>;
    private min$?: Observable<number>;
    private max$?: Observable<number>;
    private step$?: Observable<number>;
    private isGlass: boolean = false;

    asGlass(isGlass: boolean = true): this {
        this.isGlass = isGlass;
        return this;
    }

    withValue(value: Subject<number>): this {
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

    private parseValue(val: string): number {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
    }

    private formatValue(val: number, format: string): string {
        if (format === 'integer') {
            return Math.round(val).toString();
        }
        if (format.includes('.')) {
            const decimalPlaces = format.split('.')[1].length;
            return val.toFixed(decimalPlaces);
        }
        // Default to up to 2 decimal places
        return Number(val.toFixed(2)).toString();
    }

    build(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'flex flex-col gap-px-4 w-full';

        const label = document.createElement('span');
        label.className = 'md-label-small text-on-surface-variant px-px-16 hidden';
        container.appendChild(label);

        const input = document.createElement('input');
        input.type = 'text';
        input.inputMode = 'decimal';
        input.setAttribute('role', 'spinbutton');
        input.className = cn(
            'px-px-16 py-px-12 w-full outline-none transition-all body-large placeholder:text-on-surface-variant placeholder:text-left text-on-surface text-right',
            'disabled:opacity-38 disabled:cursor-not-allowed'
        );
        container.appendChild(input);

        const error = document.createElement('span');
        error.className = 'md-label-small text-error px-px-16 hidden';
        container.appendChild(error);

        // State variables for blur handling
        let currentFormat = '0.##';
        let currentMin = -Infinity;
        let currentMax = Infinity;
        let currentStep: number | undefined;

        const formatSub = this.format$?.subscribe(f => {
            currentFormat = f;
            // Update current display value if needed
            if (this.value$ instanceof BehaviorSubject) {
                input.value = this.formatValue(this.value$.value, currentFormat);
            }
        });

        const minSub = this.min$?.subscribe(m => {
            currentMin = m;
            input.setAttribute('aria-valuemin', m.toString());
        });

        const maxSub = this.max$?.subscribe(m => {
            currentMax = m;
            input.setAttribute('aria-valuemax', m.toString());
        });

        const stepSub = this.step$?.subscribe(s => {
            currentStep = s;
            input.setAttribute('aria-valuestep', s.toString());
        });

        const placeholderSub = this.placeholder$?.subscribe(placeholder => {
            input.placeholder = placeholder;
        });

        const enabledSub = this.enabled$?.subscribe(enabled => {
            input.disabled = !enabled;
        });

        const style$ = this.style$ || of(NumberFieldStyle.TONAL);
        const className$ = this.className$ || of('');
        const error$ = this.error$ || of('');

        const combinedSub = combineLatest([style$, className$, error$]).subscribe(([style, extraClass, errorText]) => {
            const BASE_INPUT_CLASSES = 'px-px-16 py-px-12 w-full outline-none transition-all body-large placeholder:text-on-surface-variant placeholder:text-left text-on-surface text-right disabled:opacity-38 disabled:cursor-not-allowed';
            
            input.className = cn(
                BASE_INPUT_CLASSES,
                extraClass,
                !!errorText && 'ring-error focus:ring-error shadow-[inset_0_-1px_0_0_var(--md-sys-color-error)] focus:shadow-[inset_0_-2px_0_0_var(--md-sys-color-primary)]'
            );

            error.textContent = errorText;
            error.classList.toggle('hidden', !errorText);
            input.setAttribute('aria-invalid', (!!errorText).toString());

            if (this.isGlass) {
                input.classList.add('bg-white/10', 'backdrop-blur-md', 'border', 'border-white/20', 'focus:bg-white/20');
                if (style === NumberFieldStyle.OUTLINED) {
                    input.classList.add('rounded-small');
                } else {
                    input.classList.add('rounded-t-small');
                }
            } else {
                STYLE_MAP[style].split(' ').forEach(c => input.classList.add(c));
            }
        });

        const valueSub = this.value$?.subscribe(val => {
            const formatted = this.formatValue(val, currentFormat);
            if (this.parseValue(input.value) !== val || input.value === '') {
                 input.value = formatted;
            }
            input.setAttribute('aria-valuenow', val.toString());
        });

        const labelSub = this.label$?.subscribe(text => {
            label.textContent = text;
            label.classList.toggle('hidden', !text);
        });

        // Input Filtering
        input.oninput = (e) => {
            const target = e.target as HTMLInputElement;
            let val = target.value;

            // Allow only numbers, one decimal separator (if allowed), and one minus sign at the start
            const allowDecimal = currentFormat !== 'integer';
            
            // Regex to match valid partial numeric input
            // Allows: "", "-", "1", "-1", "1.", "1.2", "-1.2"
            let filtered = val.replace(/[^0-9.-]/g, '');
            
            // Ensure only one minus at the beginning
            const hasMinusAtStart = filtered.startsWith('-');
            filtered = (hasMinusAtStart ? '-' : '') + filtered.replace(/-/g, '');
            
            // Ensure only one decimal point
            if (allowDecimal) {
                const parts = filtered.split('.');
                if (parts.length > 2) {
                    filtered = parts[0] + '.' + parts.slice(1).join('');
                }
            } else {
                filtered = filtered.replace(/\./g, '');
            }

            if (val !== filtered) {
                target.value = filtered;
            }

            // Update value subject
            const parsed = parseFloat(filtered);
            if (!isNaN(parsed)) {
                this.value$?.next(parsed);
            }
        };

        // Blur Handling (Clamping, Stepping, Formatting)
        input.onblur = () => {
            let val = this.parseValue(input.value);

            // Clamp
            val = Math.max(currentMin, Math.min(currentMax, val));

            // Step
            if (currentStep !== undefined && currentStep > 0) {
                val = Math.round(val / currentStep) * currentStep;
            }

            // Re-format
            const formatted = this.formatValue(val, currentFormat);
            input.value = formatted;

            // Push final value
            this.value$?.next(val);
        };

        registerDestroy(container, () => {
            formatSub?.unsubscribe();
            minSub?.unsubscribe();
            maxSub?.unsubscribe();
            stepSub?.unsubscribe();
            placeholderSub?.unsubscribe();
            enabledSub?.unsubscribe();
            combinedSub.unsubscribe();
            valueSub?.unsubscribe();
            labelSub?.unsubscribe();
        });

        return container;
    }
}
