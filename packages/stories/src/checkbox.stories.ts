import { CheckboxBuilder } from 'aura-components';
import { BehaviorSubject, of } from 'rxjs';
import { LayoutBuilder, LayoutGap } from 'aura-components';

export default {
    title: 'Components/Checkbox',
};

export const Basic = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM);

    layout.addSlot().withContent(
        new CheckboxBuilder()
            .withCaption(of('Default Checkbox'))
    );

    layout.addSlot().withContent(
        new CheckboxBuilder()
            .withCaption(of('Checked Checkbox'))
            .withValue(new BehaviorSubject(true))
    );

    layout.addSlot().withContent(
        new CheckboxBuilder()
            .withCaption(of('Disabled Checkbox'))
            .withEnabled(of(false))
    );

    layout.addSlot().withContent(
        new CheckboxBuilder()
            .withCaption(of('Disabled Checked Checkbox'))
            .withEnabled(of(false))
            .withValue(new BehaviorSubject(true))
    );

    const container = layout.build();
    container.classList.add('p-4');

    return container;
};

export const Interactive = () => {
    const value$ = new BehaviorSubject(false);
    const caption$ = new BehaviorSubject('Unchecked');

    value$.subscribe(val => {
        caption$.next(val ? 'Checked' : 'Unchecked');
    });

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM);

    layout.addSlot().withContent(
        new CheckboxBuilder()
            .withCaption(caption$)
            .withValue(value$)
    );

    const container = layout.build();
    container.classList.add('p-4');

    return container;
};

export const Glass = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM);

    const glassCheckbox = new CheckboxBuilder()
        .withCaption(of('Glass Checkbox'))
        .asGlass();

    layout.addSlot().withContent(glassCheckbox);

    const container = layout.build();
    container.classList.add('p-8', 'bg-primary', 'min-h-[200px]');

    return container;
};
