import { DatePickerBuilder } from 'ora-components';
import { BehaviorSubject, of } from 'rxjs';
import { LayoutBuilder, LayoutGap } from 'ora-components';
import { LabelBuilder, LabelSize } from 'ora-components';

export default {
    title: 'Components/DatePicker',
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
    container.classList.add('p-12', 'max-w-md', 'bg-gradient-to-br', 'from-primary', 'to-secondary', 'min-h-[400px]');

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
