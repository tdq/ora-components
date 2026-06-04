import { BehaviorSubject, combineLatest, of, Subject, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { TimePickerOptions } from './types';
import { registerDestroy } from '@/core/destroyable-element';
import { LayoutBuilder, LayoutGap } from '../layout/layout';
import { ListBoxBuilder } from '../listbox/listbox';
import { ListBoxStyle } from '../listbox/types';
import { CheckboxBuilder } from '../checkbox/checkbox';
import { LabelBuilder } from '../label/label';

export function renderTimePicker(options: TimePickerOptions): HTMLElement {
    const subs: Subscription[] = [];

    // Internal reactive state — initialised to 0, then immediately synced from the
    // incoming BehaviourSubjects (which emit synchronously on subscribe).
    const hours$ = new BehaviorSubject<number>(0);
    const minutes$ = new BehaviorSubject<number>(0);
    const isPM$ = new BehaviorSubject<boolean>(false);

    // Sync from the external observables
    subs.push(options.selectedHours.subscribe(h => hours$.next(h)));
    subs.push(options.selectedMinutes.subscribe(m => minutes$.next(m)));

    // Derive AM/PM from the (now-synced) hours
    subs.push(hours$.subscribe(h => isPM$.next(h >= 12)));

    const baseHourItems = options.timeFormat === '24h'
        ? Array.from({ length: 24 }, (_, i) => i)
        : Array.from({ length: 12 }, (_, i) => (i + 1) % 12 || 12);

    const baseMinuteItems = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    const hourItems$ = combineLatest([
        of(baseHourItems),
        options.minHour$ ?? of(null),
        options.maxHour$ ?? of(null),
    ]).pipe(
        map(([items, minHour, maxHour]) => {
            if (minHour === null && maxHour === null) return items;
            if (options.timeFormat === '12h') {
                return items.filter(displayHour => {
                    const amHour = displayHour % 12;
                    const pmHour = amHour + 12;
                    const amValid = (minHour === null || amHour >= minHour) && (maxHour === null || amHour <= maxHour);
                    const pmValid = (minHour === null || pmHour >= minHour) && (maxHour === null || pmHour <= maxHour);
                    return amValid || pmValid;
                });
            }
            return items.filter(h => {
                if (minHour !== null && h < minHour) return false;
                if (maxHour !== null && h > maxHour) return false;
                return true;
            });
        }),
        distinctUntilChanged((a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]))
    );

    const minuteItems$ = combineLatest([
        of(baseMinuteItems),
        options.minMinute$ ?? of(null),
        options.maxMinute$ ?? of(null),
    ]).pipe(
        map(([items, minMinute, maxMinute]) => {
            if (minMinute === null && maxMinute === null) return items;
            return items.filter(m => {
                if (minMinute !== null && m < minMinute) return false;
                if (maxMinute !== null && m > maxMinute) return false;
                return true;
            });
        }),
        distinctUntilChanged((a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]))
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Build the root layout (vertical, bordered)
    // ─────────────────────────────────────────────────────────────────────────
    const rootLayout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM)
        .withClass(of('time-picker'));

    // ─────────────────────────────────────────────────────────────────────────
    // Header — "Time" label + optional AM/PM checkbox
    // ─────────────────────────────────────────────────────────────────────────
    const headerLayout = new LayoutBuilder()
        .asHorizontal()
        .withClass(of('justify-between items-center px-px-8'));

    const timeLabel = new LabelBuilder()
        .withCaption(of('Time'))
        .withClass(of(options.isGlass ? 'text-gray-600 dark:text-white/60' : 'text-on-surface-variant'));

    headerLayout.addSlot().withContent(timeLabel);

    if (options.timeFormat === '12h') {
        const amPmCheckbox = new CheckboxBuilder();

        if (options.isGlass) {
            amPmCheckbox.asGlass();
        }

        // Reactive caption: "PM" when checked, "AM" when unchecked
        amPmCheckbox.withCaption(
            isPM$.pipe(map(isPM => (isPM ? 'PM' : 'AM')))
        );

        // Bind the checkbox checked-state to our internal isPM$ stream
        amPmCheckbox.withValue(isPM$);

        headerLayout.addSlot().withContent(amPmCheckbox);
    }

    rootLayout.addSlot().withContent(headerLayout);

    // ─────────────────────────────────────────────────────────────────────────
    // Hours / Minutes grid
    // ─────────────────────────────────────────────────────────────────────────
    const gridLayout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.SMALL)
        .withClass(of('px-px-8'));

    // -- Hours ListBox --------------------------------------------------------
    const hourValue$ = new Subject<number | null>();

    // Handle hour selection (from listbox user click)
    subs.push(
        hourValue$.subscribe(displayHour => {
            if (displayHour === null) return;

            let actualHours = displayHour;
            if (options.timeFormat === '12h') {
                const isPM = isPM$.value;
                if (isPM && displayHour !== 12) actualHours = displayHour + 12;
                else if (!isPM && displayHour === 12) actualHours = 0;
                // else: PM & 12 → noon (12), AM & 1-11 → stays
            }

            const currentHours = hours$.value;
            if (actualHours !== currentHours) {
                hours$.next(actualHours);
                options.onSelect(actualHours, minutes$.value);
            }
        })
    );

    // Reflect internal hours state back to listbox display selection
    subs.push(
        hours$.subscribe(h => {
            let display = h;
            if (options.timeFormat === '12h') {
                display = h % 12 || 12;
            }
            hourValue$.next(display);
        })
    );

    const hoursBox = new ListBoxBuilder<number>()
        .withCaption(of('Hour'))
        .withItems(hourItems$)
        .withValue(hourValue$)
        .withItemCaptionProvider(h => h.toString().padStart(2, '0'))
        .withStyle(of(ListBoxStyle.BORDERLESS))
        .withHeight(of(232))
        .withClass(of('w-[100px]'));

    if (options.isGlass) {
        hoursBox.asGlass();
    }

    // -- Minutes ListBox ------------------------------------------------------
    const minuteValue$ = new Subject<number | null>();

    subs.push(
        minuteValue$.subscribe(m => {
            if (m === null) return;
            const currentMinutes = minutes$.value;
            if (m !== currentMinutes) {
                minutes$.next(m);
                options.onSelect(hours$.value, m);
            }
        })
    );

    subs.push(
        minutes$.subscribe(m => {
            minuteValue$.next(m);
        })
    );

    const minutesBox = new ListBoxBuilder<number>()
        .withCaption(of('Minute'))
        .withItems(minuteItems$)
        .withValue(minuteValue$)
        .withItemCaptionProvider(m => m.toString().padStart(2, '0'))
        .withStyle(of(ListBoxStyle.BORDERLESS))
        .withHeight(of(232))
        .withClass(of('w-[100px]'));

    if (options.isGlass) {
        minutesBox.asGlass();
    }

    // -- Handle AM/PM checkbox toggle — adjust hours accordingly --------------
    subs.push(
        isPM$.subscribe(isPM => {
            const currentHours = hours$.value;
            if (isPM && currentHours < 12) {
                // Was AM, now PM — add 12 (except midnight → noon)
                const newHours = currentHours === 0 ? 12 : currentHours + 12;
                hours$.next(newHours);
                options.onSelect(newHours, minutes$.value);
            } else if (!isPM && currentHours >= 12) {
                // Was PM, now AM — subtract 12
                const newHours = currentHours - 12;
                hours$.next(newHours);
                options.onSelect(newHours, minutes$.value);
            }
        })
    );

    // Wire slots into the grid
    gridLayout.addSlot().withContent(hoursBox);
    gridLayout.addSlot().withContent(minutesBox);

    rootLayout.addSlot().withContent(gridLayout);

    // ─────────────────────────────────────────────────────────────────────────
    // Build the element
    // ─────────────────────────────────────────────────────────────────────────
    const element = rootLayout.build();

    // Cleanup all subscriptions when the container is removed from the DOM
    registerDestroy(element, () => {
        subs.forEach(s => s.unsubscribe());
    });

    return element;
}
