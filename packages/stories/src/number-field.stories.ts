import { NumberFieldBuilder, NumberFieldStyle } from 'ora-components';
import { BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { LayoutBuilder, LayoutGap } from 'ora-components';
import { LabelBuilder, LabelSize } from 'ora-components';

export default {
    title: 'Components/NumberField',
};

export const Default = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM);

    layout.addSlot().withContent(
        new NumberFieldBuilder()
            .withLabel(of('Default Number Field'))
            .withPlaceholder(of('Enter a number...'))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');
    return container;
};

export const Styles = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE);

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Tonal (Default)'))
            .withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new NumberFieldBuilder()
            .withPlaceholder(of('Tonal style...'))
            .withStyle(of(NumberFieldStyle.TONAL))
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Outlined'))
            .withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new NumberFieldBuilder()
            .withPlaceholder(of('Outlined style...'))
            .withStyle(of(NumberFieldStyle.OUTLINED))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');
    return container;
};

export const Glass = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE);

    layout.addSlot().withContent(
        new NumberFieldBuilder()
            .withLabel(of('Glass Tonal'))
            .asGlass()
            .withStyle(of(NumberFieldStyle.TONAL))
    );

    layout.addSlot().withContent(
        new NumberFieldBuilder()
            .withLabel(of('Glass Outlined'))
            .asGlass()
            .withStyle(of(NumberFieldStyle.OUTLINED))
    );

    const container = layout.build();
    container.classList.add('p-8', 'bg-gradient-to-br', 'from-indigo-500', 'to-purple-600', 'min-h-[300px]');
    return container;
};

export const Formats = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new NumberFieldBuilder()
            .withLabel(of('Integer Only'))
            .withFormat(of('integer'))
            .withValue(new BehaviorSubject<number | null>(42))
    );

    layout.addSlot().withContent(
        new NumberFieldBuilder()
            .withLabel(of('Decimal (2 places)'))
            .withFormat(of('0.00'))
            .withValue(new BehaviorSubject<number | null>(123.456))
    );

    layout.addSlot().withContent(
        new NumberFieldBuilder()
            .withLabel(of('Decimal (4 places)'))
            .withFormat(of('0.0000'))
            .withValue(new BehaviorSubject<number | null>(Math.PI))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');
    return container;
};

export const PrefixSuffixAndPrecision = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    // Currency
    layout.addSlot().withContent(
        new NumberFieldBuilder()
            .withLabel(of('Price (Currency)'))
            .withPrefix(of('$'))
            .withPrecision(of(2))
            .withPlaceholder(of('0.00'))
            .withValue(new BehaviorSubject<number | null>(99.99))
    );

    // Percentage
    layout.addSlot().withContent(
        new NumberFieldBuilder()
            .withLabel(of('Discount (Percentage)'))
            .withSuffix(of('%'))
            .withPrecision(of(1))
            .withMinValue(of(0))
            .withMaxValue(of(100))
            .withValue(new BehaviorSubject<number | null>(15.5))
    );

    // Mass
    layout.addSlot().withContent(
        new NumberFieldBuilder()
            .withLabel(of('Weight (High Precision)'))
            .withSuffix(of('kg'))
            .withPrecision(of(3))
            .withStep(of(0.005))
            .withValue(new BehaviorSubject<number | null>(75.125))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');
    return container;
};

export const Constraints = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new NumberFieldBuilder()
            .withLabel(of('Min 0, Max 100, Step 10'))
            .withMinValue(of(0))
            .withMaxValue(of(100))
            .withStep(of(10))
            .withValue(new BehaviorSubject<number | null>(50))
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Try entering 12 or 150, then blur the field to see clamping/stepping in action.'))
            .withSize(LabelSize.SMALL)
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');
    return container;
};

export const States = () => {
    const enabled$ = new BehaviorSubject(true);

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new NumberFieldBuilder()
            .withLabel(of('Togglable Field'))
            .withEnabled(enabled$)
            .withValue(new BehaviorSubject<number | null>(100))
    );

    // Controls
    const controls = document.createElement('label');
    controls.className = 'flex items-center gap-2 cursor-pointer';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.onchange = (e) => enabled$.next((e.target as HTMLInputElement).checked);

    const labelText = new LabelBuilder()
        .withCaption(of('Enabled'))
        .withSize(LabelSize.MEDIUM)
        .build();

    controls.appendChild(checkbox);
    controls.appendChild(labelText);

    layout.addSlot().withContent({
        build: () => controls
    });

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');
    return container;
};

export const Errors = () => {
    const value$ = new BehaviorSubject<number | null>(0);
    const error$ = value$.pipe(
        map(val => (val !== null && val < 0) ? 'Negative numbers are not allowed' : ((val !== null && val > 1000) ? 'Value too large' : ''))
    );

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new NumberFieldBuilder()
            .withLabel(of('Validation Example'))
            .withValue(value$)
            .withError(error$)
            .withPlaceholder(of('Enter a number between 0 and 1000'))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');
    return container;
};

export const LabelAndPlaceholder = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new NumberFieldBuilder()
            .withLabel(of('Custom Label'))
            .withPlaceholder(of('Custom Placeholder...'))
    );

    layout.addSlot().withContent(
        new NumberFieldBuilder()
            .withPlaceholder(of('No label, only placeholder'))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');
    return container;
};

export const InlineErrors = () => {
    const value$ = new BehaviorSubject<number | null>(0);
    const error$ = value$.pipe(
        map(val => (val !== null && val < 0) ? 'Negative numbers are not allowed' : ((val !== null && val > 1000) ? 'Value too large' : ''))
    );

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new NumberFieldBuilder()
            .withLabel(of('Inline Error Example'))
            .asInlineError()
            .withValue(value$)
            .withError(error$)
            .withPlaceholder(of('Click the icon on error'))
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Try entering a negative number to see the error icon. Click it to show a tooltip.'))
            .withSize(LabelSize.SMALL)
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');
    return container;
};
