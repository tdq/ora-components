import { LabelBuilder, LabelSize } from 'aura-components';
import { BehaviorSubject, of } from 'rxjs';
import { LayoutBuilder, LayoutGap, SlotSize } from 'aura-components';
import { TextFieldBuilder } from 'aura-components';

export default {
    title: 'Components/Label',
};

export const Sizes = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    const sizes = Object.values(LabelSize);

    sizes.forEach(size => {
        const row = new LayoutBuilder()
            .asHorizontal()
            .withGap(LayoutGap.LARGE);

        row.addSlot()
            .withSize(SlotSize.QUARTER)
            .withContent(
                new LabelBuilder()
                    .withCaption(of(`${size.toUpperCase()}:`))
                    .withSize(LabelSize.MEDIUM)
            );

        row.addSlot().withContent(
            new LabelBuilder()
                .withCaption(of(`This is a ${size} label`))
                .withSize(size)
        );

        layout.addSlot().withContent(row);
    });

    const container = layout.build();
    container.classList.add('p-4');

    return container;
};

export const Reactive = () => {
    const caption$ = new BehaviorSubject('Type something below...');

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE);

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(caption$)
            .withSize(LabelSize.LARGE)
    );

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withPlaceholder(of('Change label text...'))
            .withValue(caption$)
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};
