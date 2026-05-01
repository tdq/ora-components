import { Observable, Subject, Subscription, combineLatest } from 'rxjs';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FieldStyle } from '../../theme';
import { Money } from '../../types/money';
import { clamp, roundToStep, formatNumber, getPrecision } from '@/utils/number';
import { CurrencyRegistry } from '@/utils/currency-registry';
import { createCurrencyDropdown } from './currency-dropdown';
import { createMoneyFieldErrorIcon } from './money-field-error';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface MoneyFieldState {
    value$: Subject<Money | null>;
    placeholder$: Observable<string>;
    enabled$: Observable<boolean>;
    style$: Observable<FieldStyle>;
    error$: Observable<string>;
    label$: Observable<string>;
    className$: Observable<string>;
    format$: Observable<string>;
    precision$: Observable<number | undefined>;
    min$: Observable<number>;
    max$: Observable<number>;
    step$: Observable<number>;
    locale$: Observable<string | undefined>;
    isGlass: boolean;
    isInlineError: boolean;
    currencies: string[];
}

export class MoneyFieldLogic {
    private subscriptions = new Subscription();
    private currencyValue$ = new Subject<string | null>();
    private currentCurrency: string = '';
    private currentValue: Money | null = null;

    constructor(
        private container: HTMLElement,
        private input: HTMLInputElement,
        private inputWrapper: HTMLElement,
        private label: HTMLLabelElement,
        private errorText: HTMLElement,
        private suffixContainer: HTMLElement,
        private activeIndicator: HTMLElement,
        private footer: HTMLElement,
        private state: MoneyFieldState
    ) { }

    private getSeparators(locale?: string): { decimal: string; grouping: string } {
        // Default for English-style locales
        let decimal = '.';
        let grouping = ',';
        if (locale) {
            const lower = locale.toLowerCase();
            // European-style locales where comma is decimal separator
            if (lower.startsWith('de') || lower.startsWith('fr') || lower.startsWith('es') || lower.startsWith('it') || lower.startsWith('pt')) {
                decimal = ',';
                grouping = '.';
            }
        }
        return { decimal, grouping };
    }

    init() {
        let currentMin = -Infinity;
        let currentMax = Infinity;
        let currentStep = 1;
        let currentFormat = '';
        let currentPrecision: number | undefined;
        let currentLocale: string | undefined;

        // Initialize currency display once (currencies are static)
        this.updateCurrencyDisplay(this.state.currencies);

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
                this.state.locale$
            ]).subscribe(([
                style, extraClass, errorMsg, labelMsg, placeholder, enabled,
                format, precision, min, max, step, locale
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
                this.label.classList.toggle('text-error', !!errorMsg);

                // Input
                this.input.placeholder = placeholder;
                this.input.disabled = !enabled;
                this.input.setAttribute('aria-valuemin', min.toString());
                this.input.setAttribute('aria-valuemax', max.toString());
                this.input.setAttribute('aria-valuestep', step.toString());
                this.input.setAttribute('aria-invalid', (!!errorMsg).toString());

                // Error
                this.updateError(errorMsg);

                // Styles
                this.updateStyles(style, extraClass, !!errorMsg);

                // Synchronize value format
                this.syncInputValue(this.currentValue, currentFormat, currentPrecision, currentStep, currentLocale);
            })
        );

        this.subscriptions.add(
            this.state.value$.subscribe(val => {
                this.currentValue = val;
                this.syncInputValue(val, currentFormat, currentPrecision, currentStep, currentLocale);
                if (val !== null) {
                    this.input.setAttribute('aria-valuenow', val.amount.toString());
                    // Update current currency if value has currency
                    if (val.currencyId && val.currencyId !== this.currentCurrency) {
                        this.currentCurrency = val.currencyId;
                        this.currencyValue$.next(val.currencyId);
                    }
                } else {
                    this.input.removeAttribute('aria-valuenow');
                }
            })
        );

        // Subscribe to currency changes
        this.subscriptions.add(
            this.currencyValue$.subscribe(currencyId => {
                if (currencyId && currencyId !== this.currentCurrency) {
                    this.currentCurrency = currencyId;
                    if (this.currentValue) {
                        this.state.value$.next({ ...this.currentValue, currencyId });
                    } else {
                        // Keep amount as null when field is empty
                        this.state.value$.next(null);
                    }
                }
            })
        );

        this.setupEvents(currentMin, currentMax, currentStep, currentFormat, currentPrecision, currentLocale);
    }

    private updateCurrencyDisplay(currencies: string[]) {
        this.suffixContainer.innerHTML = '';

        if (currencies.length === 0) {
            this.suffixContainer.classList.add('hidden');
            return;
        }

        if (currencies.length === 1) {
            // Single currency: show static symbol
            const currencyId = currencies[0];
            const symbol = CurrencyRegistry.getSymbol(currencyId);
            const span = document.createElement('span');
            span.className = this.state.isGlass
                ? 'body-large text-gray-900 dark:text-white/80 select-none'
                : 'body-large text-on-surface-variant select-none';
            span.textContent = symbol;
            this.suffixContainer.appendChild(span);
            this.suffixContainer.classList.remove('hidden');

            // If we have a value with a different currency or no currency, update it
            if (this.currentValue && this.currentValue.currencyId !== currencyId) {
                this.state.value$.next({ ...this.currentValue, currencyId });
            }
            this.currentCurrency = currencyId;
        } else {
            // Multiple currencies: create purpose-built currency dropdown
            const dropdown = createCurrencyDropdown(
                currencies,
                this.currencyValue$,
                this.state.enabled$,
                this.state.isGlass,
                this.container
            );
            dropdown.classList.add('h-full');
            this.suffixContainer.appendChild(dropdown);
            this.suffixContainer.classList.remove('hidden', 'gap-2');
            this.suffixContainer.classList.add('gap-0');
            this.suffixContainer.classList.add('border-l', 'border-outline-variant', 'pl-0');

            // Set initial currency if we have one
            if (this.currentCurrency && currencies.includes(this.currentCurrency)) {
                this.currencyValue$.next(this.currentCurrency);
            } else if (currencies.length > 0) {
                this.currentCurrency = currencies[0];
                this.currencyValue$.next(currencies[0]);
            }
        }
    }

    private setupEvents(min: number, max: number, step: number, format: string, precision: number | undefined, locale: string | undefined) {
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
            const { decimal, grouping } = this.getSeparators(latestLocale);

            let filtered = val.replace(/[^0-9.,-]/g, '');
            // Remove grouping separators
            const groupingEscaped = grouping === '.' ? '\\.' : grouping;
            filtered = filtered.replace(new RegExp(groupingEscaped, 'g'), '');
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

            const normalized = filtered.replace(decimal, '.');
            const parsed = parseFloat(normalized);
            if (!isNaN(parsed)) {
                const currencyId = this.currentValue?.currencyId || this.currentCurrency || (this.state.currencies.length > 0 ? this.state.currencies[0] : 'USD');
                this.state.value$.next({ amount: parsed, currencyId });
            } else if (filtered === '' || filtered === '-') {
                // Clear value if empty or just minus sign
                this.state.value$.next(null);
            }
        };

        this.input.onkeydown = (e) => {
            if (this.input.disabled) return;
            let currentAmount = this.currentValue?.amount ?? 0;
            let newValue = currentAmount;
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
                const currencyId = this.currentValue?.currencyId || this.currentCurrency || (this.state.currencies.length > 0 ? this.state.currencies[0] : 'USD');
                this.state.value$.next({ amount: clamped, currencyId });
            }
        };

        this.input.onblur = () => {
            const parsed = this.parseValue(this.input.value, latestLocale);
            const currencyId = this.currentValue?.currencyId || this.currentCurrency || (this.state.currencies.length > 0 ? this.state.currencies[0] : 'USD');

            if (parsed === null) {
                this.state.value$.next(null);
                this.input.value = '';
                return;
            }

            const precision = latestPrecision !== undefined ? latestPrecision : getPrecision(latestStep);
            const rounded = parseFloat(parsed.toFixed(precision));
            const val = clamp(rounded, latestMin, latestMax);

            this.syncInputValue({ amount: val, currencyId }, latestFormat, latestPrecision, latestStep, latestLocale, true);
            this.state.value$.next({ amount: val, currencyId });
        };
    }

    private updateError(msg: string) {
        const showErrorMessage = !!msg;

        if (this.state.isInlineError) {
            this.errorText.textContent = msg;
            this.errorText.classList.add('hidden');

            this.footer.classList.toggle('hidden', true);
            this.footer.style.minHeight = '0px';
            this.footer.style.height = '0px';
            this.footer.style.marginTop = '0px';

            const existingIcon = this.suffixContainer.querySelector('button[aria-label^="Error:"]');
            if (msg) {
                // Always recreate the error icon to ensure popover text is updated
                if (existingIcon) {
                    existingIcon.remove();
                }
                const icon = createMoneyFieldErrorIcon(msg);
                // Insert error icon before currency dropdown/suffix
                this.suffixContainer.insertBefore(icon, this.suffixContainer.firstChild);
                this.suffixContainer.classList.remove('hidden');
            } else if (existingIcon) {
                existingIcon.remove();
                if (this.suffixContainer.childNodes.length === 0) {
                    this.suffixContainer.classList.add('hidden');
                }
            }
        } else {
            this.errorText.textContent = msg;
            this.errorText.classList.toggle('hidden', !showErrorMessage);
            this.errorText.classList.toggle('text-error', true);

            this.footer.classList.toggle('hidden', false);
            this.footer.style.minHeight = '20px';
            this.footer.style.height = 'auto';
            this.footer.style.marginTop = '4px';
        }

        this.input.setAttribute('aria-invalid', showErrorMessage ? 'true' : 'false');
        if (showErrorMessage) this.input.setAttribute('aria-describedby', this.errorText.id);
        else this.input.removeAttribute('aria-describedby');
    }

    private updateStyles(style: FieldStyle, extraClass: string, hasError: boolean) {
        const isOutlined = style === FieldStyle.OUTLINED;

        // Base container styles
        this.container.className = 'flex flex-col w-full';
        if (extraClass) this.container.classList.add(...extraClass.split(' '));

        // Validation classes (same as text-field)
        const validationClasses = hasError
            ? 'outline outline-1 -outline-offset-1 outline-error focus-within:outline-error text-error'
            : '';

        // Input Wrapper styles - 48px height, MD3
        const baseWrapperClasses = [
            'relative', 'flex', 'items-center', 'gap-2', 'px-4', 'transition-all', 'duration-200', 'h-[48px]'
        ];

        this.inputWrapper.className = baseWrapperClasses.join(' ');
        if (validationClasses) {
            this.inputWrapper.classList.add(...validationClasses.split(' '));
        }

        if (this.state.isGlass) {
            this.inputWrapper.classList.add('glass-effect', 'focus-within:bg-white/20');
            this.inputWrapper.classList.add(isOutlined ? 'rounded-small' : 'rounded-t-small');
            this.activeIndicator.classList.add('hidden');
            
            this.label.className = cn(this.label.className, 'text-gray-900 dark:text-white');
            this.input.className = cn(this.input.className, 'text-gray-900 dark:text-white placeholder:text-gray-900/50 dark:placeholder:text-white/50');
        } else {
            this.label.className = cn(this.label.className, 'text-on-surface-variant');
            this.input.className = cn(this.input.className, 'text-on-surface placeholder:text-on-surface-variant');
            
            if (isOutlined) {
                this.inputWrapper.classList.add(
                    'bg-transparent', 'rounded-small',
                    'outline', 'outline-1', '-outline-offset-1', 'outline-outline',
                    'focus-within:outline-2', 'focus-within:outline-primary'
                );
                this.activeIndicator.classList.add('hidden');
            } else {
                this.inputWrapper.classList.add('bg-surface-variant', 'rounded-t-small');
                this.activeIndicator.classList.remove('hidden');
                this.activeIndicator.classList.toggle('bg-error', hasError);
                this.activeIndicator.classList.toggle('bg-outline-variant', !hasError);
            }
        }
    }

    private syncInputValue(val: Money | null, format: string, precision: number | undefined, step: number, locale: string | undefined, force: boolean = false) {
        const formatted = formatNumber(val?.amount ?? null, { format, precision, step, locale });
        const currentParsed = this.parseValue(this.input.value, locale);
        if (force || currentParsed !== (val?.amount ?? null) || this.input.value === '' && val !== null) {
            this.input.value = formatted;
        }
    }

    private parseValue(val: string, locale?: string): number | null {
        if (!val.trim()) return null;
        const normalized = this.normalizeNumberString(val, locale);
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? null : parsed;
    }

    private normalizeNumberString(val: string, locale?: string): string {
        const { decimal, grouping } = this.getSeparators(locale);
        // Remove grouping separators
        const groupingEscaped = grouping === '.' ? '\\.' : grouping;
        let cleaned = val.replace(new RegExp(groupingEscaped, 'g'), '');
        // Replace decimal separator with '.' for parseFloat
        cleaned = cleaned.replace(decimal, '.');
        // Ensure only one decimal point
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            // If multiple decimal separators, keep only first
            cleaned = parts[0] + '.' + parts.slice(1).join('');
        }
        return cleaned;
    }

    destroy() {
        this.subscriptions.unsubscribe();
        this.currencyValue$.complete();
    }
}