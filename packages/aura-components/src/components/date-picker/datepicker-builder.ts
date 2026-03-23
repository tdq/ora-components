import { Observable, Subject, BehaviorSubject, distinctUntilChanged } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { registerDestroy } from '@/core/destroyable-element';
import { formatDate, parseDate, isValidDate } from './date-utils';
import { renderCalendar } from './calendar';
import { DatePickerStyle, DayOfWeek } from './types';
import { Icons } from '@/core/icons';

export class DatePickerBuilder implements ComponentBuilder {
    private value$?: Subject<Date | null>;
    private caption$?: Observable<string>;
    private minDate$?: Observable<Date>;
    private maxDate$?: Observable<Date>;
    private format = 'DD-MM-YYYY';
    private enabled$?: Observable<boolean>;
    private error$?: Observable<string>;
    private style$?: Observable<DatePickerStyle>;
    private className$?: Observable<string>;
    private isGlass: boolean = false;
    private firstDayOfWeek: DayOfWeek = DayOfWeek.MONDAY;

    withValue(value: Subject<Date | null>): this {
        this.value$ = value;
        return this;
    }

    withCaption(caption: Observable<string>): this {
        this.caption$ = caption;
        return this;
    }

    withMinDate(min: Observable<Date>): this {
        this.minDate$ = min;
        return this;
    }

    withMaxDate(max: Observable<Date>): this {
        this.maxDate$ = max;
        return this;
    }

    withFormat(format: string): this {
        this.format = format;
        return this;
    }

    withEnabled(enabled: Observable<boolean>): this {
        this.enabled$ = enabled;
        return this;
    }

    withError(error: Observable<string>): this {
        this.error$ = error;
        return this;
    }

    withStyle(style: Observable<DatePickerStyle>): this {
        this.style$ = style;
        return this;
    }

    withClass(className: Observable<string>): this {
        this.className$ = className;
        return this;
    }

    asGlass(isGlass: boolean = true): this {
        this.isGlass = isGlass;
        return this;
    }

    withFirstDayOfTheWeek(day: DayOfWeek): this {
        this.firstDayOfWeek = day;
        return this;
    }

    build(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'flex flex-col gap-px-4 w-full relative';

        // 1. Template Structure
        const { captionElement, inputWrapper, input, iconButton, errorElement, popup } = this.createTemplate();
        
        container.appendChild(captionElement);
        container.appendChild(inputWrapper);
        container.appendChild(errorElement);
        container.appendChild(popup);

        // 2. Internal State
        const isExpanded$ = new BehaviorSubject<boolean>(false);
        const internalValue$ = new BehaviorSubject<Date | null>(null);
        const subs: any[] = [];

        // 3. Logic & Subscriptions
        this.setupLogic(
            input, 
            inputWrapper, 
            captionElement, 
            errorElement, 
            popup, 
            iconButton, 
            container, 
            isExpanded$, 
            internalValue$, 
            subs
        );

        // 4. Input Masking & Validation
        this.setupMasking(input);

        // 5. Calendar Initialization
        const calendar = renderCalendar({
            selectedDate$: internalValue$,
            isExpanded$: isExpanded$,
            minDate$: this.minDate$,
            maxDate$: this.maxDate$,
            onSelect: (date) => {
                this.value$?.next(date);
                isExpanded$.next(false);
            },
            onClose: () => {
                isExpanded$.next(false);
            },
            isGlass: this.isGlass,
            firstDayOfWeek: this.firstDayOfWeek
        });
        popup.appendChild(calendar);

        // 6. Event Handlers
        this.setupEventHandlers(input, iconButton, isExpanded$);

        const scrollHandler = (e: Event) => {
            if (isExpanded$.value && !popup.contains(e.target as Node)) {
                isExpanded$.next(false);
            }
        };
        document.addEventListener('scroll', scrollHandler, true);

        // 7. Cleanup
        registerDestroy(container, () => {
            subs.forEach(s => s?.unsubscribe());
            if (typeof document !== 'undefined') {
                document.removeEventListener('scroll', scrollHandler, true);
            }
        });

        // Expose public API
        const element = container as any;
        element.showPopover = () => isExpanded$.next(true);
        element.hidePopover = () => isExpanded$.next(false);
        element.toggle = () => isExpanded$.next(!isExpanded$.value);

        return container;
    }

    private createTemplate() {
        // Label
        const captionElement = document.createElement('span');
        captionElement.className = 'md-label-small text-on-surface-variant px-px-16 hidden';

        // Input Field Container
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'flex items-center relative bg-surface-variant rounded-t-small border-b border-outline-variant focus-within:border-primary transition-colors h-[48px]';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'px-px-16 w-full h-full bg-transparent outline-none body-large text-on-surface placeholder:text-on-surface-variant/50';
        input.placeholder = this.format;
        inputWrapper.appendChild(input);

        const iconButton = document.createElement('button');
        iconButton.type = 'button';
        iconButton.className = 'p-px-12 text-on-surface-variant hover:text-primary transition-colors focus:outline-none';
        const calendarIconWrapper = document.createElement('span');
        calendarIconWrapper.className = 'w-6 h-6 inline-flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:block';
        calendarIconWrapper.innerHTML = Icons.CALENDAR;
        iconButton.appendChild(calendarIconWrapper);
        inputWrapper.appendChild(iconButton);

        // Error message
        const errorElement = document.createElement('span');
        errorElement.className = 'md-label-small text-error px-px-16 hidden';

        // Calendar Popup
        const popup = document.createElement('div');
        popup.setAttribute('popover', 'auto');
        popup.className = 'absolute mt-px-4 z-50 bg-surface border-outline rounded-small shadow-level-2 p-px-16 w-px-320 m-0';

        return { captionElement, inputWrapper, input, iconButton, errorElement, popup };
    }

    private setupLogic(
        input: HTMLInputElement,
        inputWrapper: HTMLElement,
        captionElement: HTMLElement,
        errorElement: HTMLElement,
        popup: HTMLElement,
        iconButton: HTMLButtonElement,
        container: HTMLElement,
        isExpanded$: BehaviorSubject<boolean>,
        internalValue$: BehaviorSubject<Date | null>,
        subs: any[]
    ) {
        // Value subscription
        if (this.value$) {
            subs.push(this.value$.pipe(distinctUntilChanged()).subscribe(val => {
                internalValue$.next(val || null);
                if (isValidDate(val)) {
                    const formatted = formatDate(val, this.format);
                    if (input.value !== formatted) {
                        input.value = formatted;
                    }
                } else if (!val) {
                    input.value = '';
                }
            }));
        }

        subs.push(this.caption$?.subscribe(text => {
            captionElement.textContent = text;
            captionElement.classList.toggle('hidden', !text);
        }));

        subs.push(this.error$?.subscribe(text => {
            errorElement.textContent = text;
            errorElement.classList.toggle('hidden', !text);
            const hasError = !!text;
            inputWrapper.classList.toggle('border-error', hasError);
            inputWrapper.classList.toggle('focus-within:border-error', hasError);
        }));

        subs.push(this.enabled$?.subscribe(enabled => {
            input.disabled = !enabled;
            iconButton.disabled = !enabled;
            container.classList.toggle('opacity-38', !enabled);
            container.classList.toggle('pointer-events-none', !enabled);
        }));

        if (this.isGlass) {
            inputWrapper.classList.remove('bg-surface-variant', 'border-b', 'border-outline-variant', 'rounded-t-small');
            inputWrapper.classList.add('glass-effect', 'rounded-small');
            
            popup.classList.remove('bg-surface', 'border-outline');
            popup.classList.add('glass-effect');

            // Apply glass text colors
            const glassLabelInputClasses = ['text-gray-900', 'dark:text-white'];
            const glassIconClasses = ['text-gray-600', 'dark:text-white/60'];
            
            captionElement.classList.remove('text-on-surface-variant');
            captionElement.classList.add(...glassLabelInputClasses);

            input.classList.remove('text-on-surface');
            input.classList.add(...glassLabelInputClasses);

            iconButton.classList.remove('text-on-surface-variant');
            iconButton.classList.add(...glassIconClasses);
        }

        subs.push(isExpanded$.subscribe(expanded => {
            input.setAttribute('aria-expanded', expanded.toString());
            
            if (expanded) {
                const rect = inputWrapper.getBoundingClientRect();
                popup.style.top = `${rect.bottom + 4}px`;
                popup.style.left = `${rect.left}px`;
                
                try {
                    if ((popup as any).showPopover) {
                        (popup as any).showPopover();
                    }
                } catch (e) {
                    // Ignore if already shown or not supported
                }
                
                const grid = popup.querySelector('[role="grid"]') as HTMLElement;
                grid?.focus();
            } else {
                try {
                    if ((popup as any).hidePopover) {
                        (popup as any).hidePopover();
                    }
                } catch (e) {
                    // Ignore if already hidden or not supported
                }
                
                // Return focus to input when closing IF the focus was inside the popup
                if (popup.contains(document.activeElement)) {
                    input.focus();
                }
            }
        }));

        popup.addEventListener('toggle', (event: any) => {
            const isNowOpen = event.newState === 'open';
            if (isExpanded$.value !== isNowOpen) {
                isExpanded$.next(isNowOpen);
            }
        });

        subs.push(this.style$?.subscribe(style => {
            if (style.primaryColor) container.style.setProperty('--md-sys-color-primary', style.primaryColor);
            if (style.surfaceColor) container.style.setProperty('--md-sys-color-surface', style.surfaceColor);
            if (style.onSurfaceColor) container.style.setProperty('--md-sys-color-on-surface', style.onSurfaceColor);
            if (style.borderRadius) container.style.setProperty('--md-sys-shape-corner-small', style.borderRadius);
            if (style.fontFamily) container.style.fontFamily = style.fontFamily;
        }));

        subs.push(this.className$?.subscribe(name => {
            if (name) container.classList.add(...name.split(' '));
        }));
    }

    private setupMasking(input: HTMLInputElement) {
        input.addEventListener('keypress', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            
            const char = e.key;
            // Only handle single character inputs
            if (char.length !== 1) return;

            const pos = input.selectionStart ?? 0;
            
            // Prevent typing more than format length
            if (pos >= this.format.length && !this.isSelectionActive(input)) {
                e.preventDefault();
                return;
            }

            const expected = this.format[pos];
            const isPlaceholder = /[YMD]/.test(expected);

            if (isPlaceholder) {
                // Expected a digit (Year, Month, or Day part)
                if (!/\d/.test(char)) {
                    e.preventDefault();
                }
            } else {
                // Expected a separator
                if (char === expected) {
                    // Allowed
                } else if (/\d/.test(char)) {
                    // Auto-insert separator and then this digit if it matches the NEXT placeholder
                    e.preventDefault();
                    
                    const nextPos = pos + 1;
                    if (nextPos < this.format.length && /[YMD]/.test(this.format[nextPos])) {
                        const val = input.value;
                        const before = val.slice(0, pos);
                        const after = val.slice(input.selectionEnd ?? pos);
                        input.value = before + expected + char + after;
                        
                        const cursorIdx = pos + 2;
                        input.setSelectionRange(cursorIdx, cursorIdx);
                        input.dispatchEvent(new Event('input'));
                    }
                } else {
                    e.preventDefault();
                }
            }
        });
    }

    private isSelectionActive(input: HTMLInputElement): boolean {
        return input.selectionStart !== null && input.selectionEnd !== null && input.selectionStart !== input.selectionEnd;
    }

    private setupEventHandlers(
        input: HTMLInputElement,
        iconButton: HTMLButtonElement,
        isExpanded$: BehaviorSubject<boolean>
    ) {
        input.oninput = () => {
            const parsed = parseDate(input.value, this.format);
            if (parsed || input.value === '') {
                this.value$?.next(parsed);
            }
        };

        iconButton.onclick = (e) => {
            e.stopPropagation();
            isExpanded$.next(!isExpanded$.value);
        };

        input.onkeydown = (e) => {
            if (e.key === 'ArrowDown' && e.altKey) {
                e.preventDefault();
                isExpanded$.next(true);
            } else if (e.key === 'Escape') {
                isExpanded$.next(false);
            }
        };
    }
}
