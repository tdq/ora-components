import { DatePickerBuilder, FieldStyle } from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';
import { LayoutBuilder, LayoutGap } from '@tdq/ora-components';
import { LabelBuilder, LabelSize } from '@tdq/ora-components';

export default {
    title: 'Components/DatePicker',
    tags: ['stable', 'glass', 'reactive'],
};

export const Default = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new DatePickerBuilder()
            .withCaption(of('Select Date'))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const InitialValue = () => {
    const value$ = new BehaviorSubject<Date | null>(new Date(2023, 11, 25));

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new DatePickerBuilder()
            .withValue(value$)
            .withCaption(of('Pre-selected Date'))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const RangeConstraints = () => {
    const minDate = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // 30 days from now

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new DatePickerBuilder()
            .withCaption(of('Next 30 days only'))
            .withMinDate(of(minDate))
            .withMaxDate(of(maxDate))
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of(`Range: ${minDate.toLocaleDateString()} – ${maxDate.toLocaleDateString()}`))
            .withSize(LabelSize.SMALL)
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Dates outside this range are disabled in the calendar picker.'))
            .withSize(LabelSize.SMALL)
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const CustomFormat = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new DatePickerBuilder()
            .withCaption(of('Custom Format (DD/MM/YYYY)'))
            .withFormat('DD/MM/YYYY')
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const States = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE);

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Disabled State'))
            .withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new DatePickerBuilder()
            .withEnabled(of(false))
            .withCaption(of('Disabled DatePicker'))
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Error State'))
            .withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new DatePickerBuilder()
            .withError(of('This date is unavailable'))
            .withCaption(of('Error DatePicker'))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const Interactive = () => {
    const value$ = new BehaviorSubject<Date | null>(null);

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new DatePickerBuilder()
            .withValue(value$)
            .withCaption(of('Select a date'))
    );

    const statusLabel = new LabelBuilder()
        .withCaption(of('Current Selection: None'))
        .withSize(LabelSize.MEDIUM)
        .build();

    value$.subscribe(val => {
        statusLabel.textContent = `Current Selection: ${val ? val.toDateString() : 'None'}`;
    });

    layout.addSlot().withContent({
        build: () => statusLabel
    });

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const Glass = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new DatePickerBuilder()
            .withCaption(of('Glass effect'))
            .asGlass()
    );

    const container = layout.build();
    container.classList.add('flex-1', 'p-12', 'bg-gradient-to-br', 'from-indigo-500', 'via-purple-500', 'to-pink-500');

    return container;
};

export const Styles = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE);

    layout.addSlot().withContent(
        new LabelBuilder().withCaption(of('Tonal (Default)')).withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new DatePickerBuilder()
            .withStyle(of(FieldStyle.TONAL))
            .withCaption(of('Tonal DatePicker'))
    );

    layout.addSlot().withContent(
        new LabelBuilder().withCaption(of('Outlined')).withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new DatePickerBuilder()
            .withStyle(of(FieldStyle.OUTLINED))
            .withCaption(of('Outlined DatePicker'))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

/**
 * `withMinDate`/`withMaxDate` are long-lived observables (not one-shot values) — pushing a
 * new BehaviorSubject value re-narrows the calendar's disabled-date range live, without
 * rebuilding the picker. This story drives both bounds from BehaviorSubjects and lets
 * buttons widen/narrow the selectable window at runtime. The range readout is itself
 * reactive — a BehaviorSubject<string> piped through withCaption() — rather than an
 * imperative textContent write, consistent with the rest of the reactive data flow here.
 */
export const LongLivedMinMax = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const formatRange = (start: Date, end: Date) => `Range: ${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;

    const minDate$ = new BehaviorSubject<Date>(startOfMonth);
    const maxDate$ = new BehaviorSubject<Date>(endOfMonth);
    const value$ = new BehaviorSubject<Date | null>(null);
    const rangeCaption$ = new BehaviorSubject<string>(formatRange(startOfMonth, endOfMonth));

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new DatePickerBuilder()
            .withCaption(of('Constrained to the current month (live range)'))
            .withValue(value$)
            .withMinDate(minDate$)
            .withMaxDate(maxDate$)
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(rangeCaption$)
            .withSize(LabelSize.SMALL)
    );

    const widenBtn = document.createElement('button');
    widenBtn.className = 'px-3 py-1 rounded-medium border border-outline text-label-medium mr-2';
    widenBtn.textContent = 'Widen to full quarter';
    widenBtn.onclick = () => {
        const quarterStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const quarterEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        minDate$.next(quarterStart);
        maxDate$.next(quarterEnd);
        rangeCaption$.next(formatRange(quarterStart, quarterEnd));
    };

    const narrowBtn = document.createElement('button');
    narrowBtn.className = 'px-3 py-1 rounded-medium border border-outline text-label-medium';
    narrowBtn.textContent = 'Narrow back to this month';
    narrowBtn.onclick = () => {
        minDate$.next(startOfMonth);
        maxDate$.next(endOfMonth);
        rangeCaption$.next(formatRange(startOfMonth, endOfMonth));
    };

    const controls = document.createElement('div');
    controls.className = 'flex gap-2';
    controls.appendChild(widenBtn);
    controls.appendChild(narrowBtn);

    layout.addSlot().withContent({ build: () => controls });

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};
