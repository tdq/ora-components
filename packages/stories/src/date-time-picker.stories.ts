import { DateTimePickerBuilder } from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';
import { LayoutBuilder, LayoutGap } from '@tdq/ora-components';
import { LabelBuilder, LabelSize } from '@tdq/ora-components';

export default {
    title: 'Components/DateTimePicker',
};

export const Default = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new DateTimePickerBuilder()
            .withCaption(of('Select Date & Time'))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const InitialValue = () => {
    const value$ = new BehaviorSubject<Date | null>(new Date(2023, 11, 25, 14, 30));

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new DateTimePickerBuilder()
            .withValue(value$)
            .withCaption(of('Pre-selected Date & Time'))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const TwelveHourFormat = () => {
    const value$ = new BehaviorSubject<Date | null>(new Date(2024, 6, 4, 14, 30));

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new DateTimePickerBuilder()
            .withValue(value$)
            .withCaption(of('12-Hour Format (AM/PM)'))
            .withFormat('DD-MM-YYYY hh:mm A')
            .withTimeFormat('12h')
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const RangeConstraints = () => {
    const minDate = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new DateTimePickerBuilder()
            .withCaption(of('Next 30 days only'))
            .withMinDate(of(minDate))
            .withMaxDate(of(maxDate))
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
        new DateTimePickerBuilder()
            .withEnabled(of(false))
            .withCaption(of('Disabled DateTimePicker'))
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Error State'))
            .withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new DateTimePickerBuilder()
            .withError(of('This date is unavailable'))
            .withCaption(of('Error DateTimePicker'))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const Glass = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new DateTimePickerBuilder()
            .withCaption(of('Glass effect'))
            .asGlass()
    );

    const container = layout.build();
    container.classList.add('p-12', 'max-w-md', 'bg-gradient-to-br', 'from-primary', 'to-secondary', 'min-h-[400px]');

    return container;
};

export const Interactive = () => {
    const value$ = new BehaviorSubject<Date | null>(null);

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new DateTimePickerBuilder()
            .withValue(value$)
            .withCaption(of('Select date and time'))
    );

    const statusLabel = new LabelBuilder()
        .withCaption(of('Current Selection: None'))
        .withSize(LabelSize.MEDIUM)
        .build();

    value$.subscribe(val => {
        statusLabel.textContent = `Current Selection: ${val ? val.toLocaleString() : 'None'}`;
    });

    layout.addSlot().withContent({
        build: () => statusLabel
    });

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};
