import { ButtonBuilder, ButtonStyle } from '@/components/button';
import { LayoutBuilder, LayoutGap, SlotSize, Alignment } from '@tdq/ora-components';
import { createPlaceholder } from './placeholder';
import { BehaviorSubject, of, Subject } from 'rxjs';

export default {
    title: 'Components/Layout',
    tags: ['stable', 'reactive'],
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

/**
 * A `SlotSize.GROW` slot fills the remaining vertical space in a vertical layout and clips
 * its own overflow, letting scrollable content grow within a fixed page area instead of
 * pushing the footer off-screen. GROW only works because the outer container below is given
 * a DEFINITE height (`h-[500px]`) — LayoutBuilder adds `h-full min-h-0` to the container
 * whenever any slot is GROW, but `h-full` resolves to nothing without a bounded ancestor, and
 * the GROW slot itself would then have no basis to grow against (see layout.ts's `hasGrow`
 * handling and SlotBuilderImpl's `min-h-0` on the GROW wrapper). Each slot's `data-slot`
 * (defaulted from its index, or set explicitly via `withName`) is visible in the DOM — inspect
 * the elements to see `data-slot="header"`, `data-slot="scroll-area"`, `data-slot="footer"`.
 */
export const VerticalGrowSlot = () => {
    const outer = document.createElement('div');
    outer.className = 'h-[500px] border-2 border-dashed border-primary/40 p-2';

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.SMALL);

    layout.addSlot()
        .withName('header')
        .withContent(createPlaceholder('Header (content-fit height)', '#DBEAFE'));

    const scrollSlot = layout.addSlot()
        .withName('scroll-area')
        .withSize(SlotSize.GROW);

    const scrollContent = document.createElement('div');
    scrollContent.className = 'h-full overflow-y-auto flex flex-col gap-2 bg-surface-container-low rounded p-2';
    // The GROW slot's scroller must be reachable by keyboard alone (axe: scrollable-region-focusable).
    scrollContent.tabIndex = 0;
    scrollContent.setAttribute('role', 'region');
    scrollContent.setAttribute('aria-label', 'Scrollable rows');
    for (let i = 1; i <= 40; i++) {
        const row = document.createElement('div');
        row.className = 'px-3 py-2 rounded bg-surface text-body-medium border border-outline/10';
        row.textContent = `Scrollable row ${i} — this area fills the remaining height and scrolls internally`;
        scrollContent.appendChild(row);
    }
    scrollSlot.withContent({ build: () => scrollContent });

    layout.addSlot()
        .withName('footer')
        .withContent(createPlaceholder('Footer (content-fit height, always visible)', '#E5E7EB'));

    outer.appendChild(layout.build());
    return outer;
};
