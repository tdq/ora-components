import { Observable, Subject, BehaviorSubject, combineLatest, distinctUntilChanged, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { ComponentBuilder } from '../../core/component-builder';
import { registerDestroy } from '@/core/destroyable-element';
import { formatDateTime, parseDateTime, isValidDate } from './datetime-utils';
import { renderCalendar } from '../component-parts/calendar';
import { renderTimePicker } from './time-picker';
import { LayoutBuilder, LayoutGap } from '../layout/layout';
import { DateTimePickerStyle, DayOfWeek, Time } from './types';
import { Icons } from '@/core/icons';
import { PopoverBuilder } from '../component-parts/popover';

/**
 * Minimal helper that wraps an existing HTMLElement into a ComponentBuilder
 * so it can be passed to Slot.withContent() without an ad-hoc wrapper object.
 */
class CalendarSlot implements ComponentBuilder {
    constructor(private renderFn: () => HTMLElement) {}
    build(): HTMLElement { return this.renderFn(); }
}

export class DateTimePickerBuilder implements ComponentBuilder {
    private value$?: Subject<Date | null>;
    private caption$?: Observable<string>;
    private minDate$?: Observable<Date>;
    private maxDate$?: Observable<Date>;
    private format = 'DD-MM-YYYY HH:mm';
    private enabled$?: Observable<boolean>;
    private error$?: Observable<string>;
    private style$?: Observable<DateTimePickerStyle>;
    private className$?: Observable<string>;
    private minTime$?: Observable<Time>;
    private maxTime$?: Observable<Time>;
    private isGlass: boolean = false;
    private firstDayOfWeek: DayOfWeek = DayOfWeek.MONDAY;
    private timeFormat: '12h' | '24h' = '24h';

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

    withMinTime(time: Observable<Time>): this {
        this.minTime$ = time;
        return this;
    }

    withMaxTime(time: Observable<Time>): this {
        this.maxTime$ = time;
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

    withStyle(style: Observable<DateTimePickerStyle>): this {
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

    withTimeFormat(format: '12h' | '24h'): this {
        this.timeFormat = format;
        return this;
    }

    build(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'flex flex-col gap-px-4 w-full relative';

        const { captionElement, inputWrapper, input, iconButton, errorElement } = this.createTemplate();

        container.appendChild(captionElement);
        container.appendChild(inputWrapper);
        container.appendChild(errorElement);

        const isExpanded$ = new BehaviorSubject<boolean>(false);
        const internalValue$ = new BehaviorSubject<Date | null>(null);
        const subs: any[] = [];

        const popoverLayout = new LayoutBuilder()
            .asHorizontal()
            .withGap(LayoutGap.MEDIUM)
            .withClass(of('p-px-16'));

        const calendar = renderCalendar({
            selectedDate$: internalValue$,
            isExpanded$: isExpanded$,
            minDate$: this.minDate$,
            maxDate$: this.maxDate$,
            onSelect: (date) => {
                const currentValue = internalValue$.value;
                const hours = currentValue ? currentValue.getHours() : 0;
                const minutes = currentValue ? currentValue.getMinutes() : 0;
                const combined = new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                    hours,
                    minutes
                );
                internalValue$.next(combined);
                this.value$?.next(combined);
            },
            onClose: () => {
                isExpanded$.next(false);
            },
            isGlass: this.isGlass,
            firstDayOfWeek: this.firstDayOfWeek
        });
        const calendarWrapper = document.createElement('div');
        calendarWrapper.className = 'w-[288px] shrink-0';
        calendarWrapper.appendChild(calendar);
        popoverLayout.addSlot().withContent(new CalendarSlot(() => calendarWrapper));

        const selectedHours$ = new BehaviorSubject<number>(internalValue$.value?.getHours() ?? 0);
        const selectedMinutes$ = new BehaviorSubject<number>(internalValue$.value?.getMinutes() ?? 0);

        // Keep hours/minutes subjects in sync with internal value
        subs.push(internalValue$.subscribe(date => {
            if (date) {
                selectedHours$.next(date.getHours());
                selectedMinutes$.next(date.getMinutes());
            }
        }));

        const effectiveMinHour$ = combineLatest([
            internalValue$,
            this.minDate$ ?? of(null),
            this.minTime$ ?? of(null),
        ]).pipe(
            map(([value, minDate, minTime]) => {
                if (!value || !minDate || !minTime) return null;
                const vd = new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
                const md = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime();
                return vd === md ? minTime.hour : null;
            }),
            startWith(null)
        );

        const effectiveMaxHour$ = combineLatest([
            internalValue$,
            this.maxDate$ ?? of(null),
            this.maxTime$ ?? of(null),
        ]).pipe(
            map(([value, maxDate, maxTime]) => {
                if (!value || !maxDate || !maxTime) return null;
                const vd = new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
                const md = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()).getTime();
                return vd === md ? maxTime.hour : null;
            }),
            startWith(null)
        );

        const effectiveMinMinute$ = combineLatest([
            internalValue$,
            this.minDate$ ?? of(null),
            this.minTime$ ?? of(null),
            selectedHours$,
        ]).pipe(
            map(([value, minDate, minTime, hours]) => {
                if (!value || !minDate || !minTime) return null;
                const vd = new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
                const md = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime();
                return (vd === md && hours === minTime.hour) ? minTime.minute : null;
            }),
            startWith(null)
        );

        const effectiveMaxMinute$ = combineLatest([
            internalValue$,
            this.maxDate$ ?? of(null),
            this.maxTime$ ?? of(null),
            selectedHours$,
        ]).pipe(
            map(([value, maxDate, maxTime, hours]) => {
                if (!value || !maxDate || !maxTime) return null;
                const vd = new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
                const md = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()).getTime();
                return (vd === md && hours === maxTime.hour) ? maxTime.minute : null;
            }),
            startWith(null)
        );

        const timePicker = renderTimePicker({
            selectedHours: selectedHours$,
            selectedMinutes: selectedMinutes$,
            onSelect: (hours, minutes) => {
                const currentDate = internalValue$.value;
                const baseDate = currentDate || new Date();
                const combined = new Date(
                    baseDate.getFullYear(),
                    baseDate.getMonth(),
                    baseDate.getDate(),
                    hours,
                    minutes
                );
                internalValue$.next(combined);
                this.value$?.next(combined);
            },
            timeFormat: this.timeFormat,
            isGlass: this.isGlass,
            minHour$: effectiveMinHour$,
            maxHour$: effectiveMaxHour$,
            minMinute$: effectiveMinMinute$,
            maxMinute$: effectiveMaxMinute$,
        });
        popoverLayout.addSlot().withContent(new CalendarSlot(() => timePicker));

        const popover = new PopoverBuilder()
            .withAnchor(inputWrapper)
            .withContent(popoverLayout)
            .withWidth('548px')
            .withOnClose(() => {
                input.focus();
                isExpanded$.next(false);
            });

        if (this.isGlass) {
            popover.asGlass();
        } else {
            popover.withClass('bg-surface border-outline');
        }

        this.setupLogic(
            input,
            inputWrapper,
            captionElement,
            errorElement,
            popover,
            calendar,
            iconButton,
            container,
            isExpanded$,
            internalValue$,
            subs
        );

        this.setupMasking(input);

        this.setupEventHandlers(input, iconButton, isExpanded$);

        registerDestroy(container, () => {
            subs.forEach(s => s?.unsubscribe());
        });

        const element = container as any;
        element.showPopover = () => isExpanded$.next(true);
        element.hidePopover = () => isExpanded$.next(false);
        element.toggle = () => isExpanded$.next(!isExpanded$.value);

        return container;
    }

    private createTemplate() {
        const captionElement = document.createElement('span');
        captionElement.className = this.isGlass
            ? 'md-label-small text-gray-900 dark:text-white px-px-16 hidden'
            : 'md-label-small text-on-surface-variant px-px-16 hidden';

        const inputWrapper = document.createElement('div');
        inputWrapper.className = this.isGlass
            ? 'flex items-center relative glass-effect rounded-small focus-within:border-primary transition-colors h-[48px]'
            : 'flex items-center relative bg-surface-variant rounded-t-small border-b border-outline-variant focus-within:border-primary transition-colors h-[48px]';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = this.isGlass
            ? 'px-px-16 w-full h-full bg-transparent outline-none body-large text-gray-900 dark:text-white placeholder:text-on-surface-variant/50'
            : 'px-px-16 w-full h-full bg-transparent outline-none body-large text-on-surface placeholder:text-on-surface-variant/50';
        input.placeholder = this.format;
        inputWrapper.appendChild(input);

        const iconButton = document.createElement('button');
        iconButton.type = 'button';
        iconButton.className = this.isGlass
            ? 'p-px-12 text-gray-600 dark:text-white/60 hover:text-primary transition-colors focus:outline-none'
            : 'p-px-12 text-on-surface-variant hover:text-primary transition-colors focus:outline-none';
        const calendarIconWrapper = document.createElement('span');
        calendarIconWrapper.className = 'w-6 h-6 inline-flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:block';
        calendarIconWrapper.innerHTML = Icons.CALENDAR;
        iconButton.appendChild(calendarIconWrapper);
        inputWrapper.appendChild(iconButton);

        const errorElement = document.createElement('span');
        errorElement.className = 'md-label-small text-error px-px-16 hidden';

        return { captionElement, inputWrapper, input, iconButton, errorElement };
    }

    private setupLogic(
        input: HTMLInputElement,
        inputWrapper: HTMLElement,
        captionElement: HTMLElement,
        errorElement: HTMLElement,
        popover: PopoverBuilder,
        popoverContent: HTMLElement,
        iconButton: HTMLButtonElement,
        container: HTMLElement,
        isExpanded$: BehaviorSubject<boolean>,
        internalValue$: BehaviorSubject<Date | null>,
        subs: any[]
    ) {
        if (this.value$) {
            subs.push(this.value$.pipe(distinctUntilChanged()).subscribe(val => {
                internalValue$.next(val || null);
                if (isValidDate(val)) {
                    const formatted = formatDateTime(val, this.format, this.timeFormat);
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

        subs.push(isExpanded$.pipe(distinctUntilChanged()).subscribe(expanded => {
            input.setAttribute('aria-expanded', expanded.toString());

            if (expanded) {
                popover.show();
                const grid = popoverContent.querySelector('[role="grid"]') as HTMLElement;
                grid?.focus();
            } else {
                popover.close();
            }
        }));

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
            if (char.length !== 1) return;

            const pos = input.selectionStart ?? 0;

            if (pos >= this.format.length && !this.isSelectionActive(input)) {
                e.preventDefault();
                return;
            }

            const expected = this.format[pos];
            const isDatePlaceholder = /[YMD]/.test(expected);
            const isTimePlaceholder = /[HhAmP]/.test(expected);

            if (isDatePlaceholder) {
                if (!/\d/.test(char)) {
                    e.preventDefault();
                }
            } else if (isTimePlaceholder) {
                if (!/\d/.test(char) && !/[APM: ]/i.test(char)) {
                    e.preventDefault();
                }
            } else {
                if (char === expected) {
                    // Allowed
                } else if (/\d/.test(char)) {
                    e.preventDefault();

                    const nextPos = pos + 1;
                    if (nextPos < this.format.length && /[YMDHh]/.test(this.format[nextPos])) {
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
            const parsed = parseDateTime(input.value, this.format, this.timeFormat);
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
