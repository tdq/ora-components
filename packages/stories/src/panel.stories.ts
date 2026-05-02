import { PanelBuilder, PanelGap } from '@tdq/ora-components';
import { createPlaceholder } from './placeholder';
import { LayoutBuilder, LayoutGap } from '@tdq/ora-components';

export default {
    title: 'Components/Panel',
};

export const Default = () => {
    return new PanelBuilder()
        .withContent(createPlaceholder('Panel Content', '#F3F4F6'))
        .build();
};

export const Gaps = () => {
    const container = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    container.addSlot().withContent(
        new PanelBuilder()
            .withGap(PanelGap.SMALL)
            .withContent(createPlaceholder('Small Gap (4px)', '#FEE2E2'))
    );

    container.addSlot().withContent(
        new PanelBuilder()
            .withGap(PanelGap.MEDIUM)
            .withContent(createPlaceholder('Medium Gap (8px)', '#FEF3C7'))
    );

    container.addSlot().withContent(
        new PanelBuilder()
            .withGap(PanelGap.LARGE)
            .withContent(createPlaceholder('Large Gap (16px)', '#D1FAE5'))
    );

    container.addSlot().withContent(
        new PanelBuilder()
            .withGap(PanelGap.EXTRA_LARGE)
            .withContent(createPlaceholder('Extra Large Gap (32px)', '#DBEAFE'))
    );

    return container.build();
};

export const Glass = () => {
    const background = document.createElement('div');
    background.className = 'p-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 min-h-[400px] flex items-center justify-center';
    
    const panel = new PanelBuilder()
        .asGlass()
        .withGap(PanelGap.LARGE)
        .withContent(createPlaceholder('Glass Panel', 'rgba(255, 255, 255, 0.1)'))
        .build();
    
    background.appendChild(panel);
    return background;
};
