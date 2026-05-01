import { ButtonBuilder, ButtonStyle } from '@/components/button';
import { LayoutBuilder, LayoutGap, SlotSize, Alignment } from 'ora-components';
import { createPlaceholder } from './placeholder';
import { BehaviorSubject, of, Subject } from 'rxjs';

export default {
    title: 'Components/Layout',
};

export const Horizontal = () => {
    const layout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.MEDIUM);

    layout.addSlot().withContent(createPlaceholder('Slot 1', '#FEE2E2'));
    layout.addSlot().withContent(createPlaceholder('Slot 2', '#FEF3C7'));
    layout.addSlot().withContent(createPlaceholder('Slot 3', '#D1FAE5'));

    return layout.build();
};

export const Vertical = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(createPlaceholder('Header', '#DBEAFE'));
    layout.addSlot().withContent(createPlaceholder('Content', '#F3F4F6'));
    layout.addSlot().withContent(createPlaceholder('Footer', '#E5E7EB'));

    return layout.build();
};

export const MixedSizes = () => {
    const layout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.EXTRA_LARGE);

    layout.addSlot()
        .withSize(SlotSize.QUARTER)
        .withContent(createPlaceholder('Sidebar (1/4)', '#F3F4F6'));

    layout.addSlot()
        .withSize(SlotSize.HALF)
        .withContent(createPlaceholder('Main Content (1/2)', '#FFFFFF'));

    layout.addSlot()
        .withSize(SlotSize.QUARTER)
        .withContent(createPlaceholder('Right (1/4)', '#F3F4F6'));

    return layout.build();
};

export const ConditionalVisibility = () => {
    const visible$ = new BehaviorSubject(true);
    const click$ = new Subject<void>();
    click$.subscribe(() => visible$.next(!visible$.value));

    const toggleBtn = new ButtonBuilder()
        .withCaption(of('Toggle Middle Slot'))
        .withClick(() => click$.next())
        .withStyle(of(ButtonStyle.FILLED));

    const innerLayout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.MEDIUM);

    innerLayout.addSlot().withContent(createPlaceholder('Left', '#FEE2E2'));
    innerLayout.addSlot()
        .withVisible(visible$)
        .withContent(createPlaceholder('MIDDLE (Conditional)', '#FEF3C7'));
    innerLayout.addSlot().withContent(createPlaceholder('Right', '#D1FAE5'));

    const outerLayout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    outerLayout.addSlot().withContent(toggleBtn);
    outerLayout.addSlot().withContent(innerLayout);

    return outerLayout.build();
};

export const AlignmentStory = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM);

    layout.addSlot()
        .withAlignment(of(Alignment.LEFT))
        .withContent(createPlaceholder('Left Aligned Slot', '#FEE2E2'));

    layout.addSlot()
        .withAlignment(of(Alignment.CENTER))
        .withContent(createPlaceholder('Center Aligned Slot', '#FEF3C7'));

    layout.addSlot()
        .withAlignment(of(Alignment.RIGHT))
        .withContent(createPlaceholder('Right Aligned Slot', '#D1FAE5'));

    return layout.build();
};

export const LayoutAlignmentStory = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM)
        .withAlignment(of(Alignment.CENTER));

    layout.addSlot().withContent(createPlaceholder('Aligned via Layout 1', '#FEE2E2'));
    layout.addSlot().withContent(createPlaceholder('Aligned via Layout 2', '#FEF3C7'));

    return layout.build();
};
