import { ToolbarBuilder, TextFieldBuilder, LabelBuilder, LayoutBuilder, LayoutGap } from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';
import { createButton, createControlStrip } from './story-helpers';

export default {
    title: 'Components/Toolbar',
    tags: ['stable', 'reactive'],
};

export const Default = () => {
    const toolbar = new ToolbarBuilder();

    toolbar
        .addSecondaryButton()
        .withCaption(of('Cancel'))
        .withClick(() => {});

    toolbar
        .addSecondaryButton()
        .withCaption(of('Settings'))
        .withClick(() => {});

    toolbar
        .withPrimaryButton()
        .withCaption(of('Save'))
        .withClick(() => {});

    const container = toolbar.build();
    container.classList.add('p-4');

    return container;
};

export const WithSearch = () => {
    const toolbar = new ToolbarBuilder();
    toolbar
        .withPrimaryButton()
        .withCaption(of('Search'))
        .withClick(() => {});

    const layout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.MEDIUM);

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withPlaceholder(of('Search...'))
            .withClass(of('w-full')),
    );

    layout.addSlot().withContent(toolbar);

    const container = layout.build();
    container.classList.add('p-4');

    return container;
};

export const Disabled = () => {
    const banner = new LabelBuilder()
        .withCaption(of('Read-only view'))
        .withClass(of('bg-surface-variant px-4 py-2 rounded w-full text-on-surface-variant'))
        .build();

    const toolbar = new ToolbarBuilder().withEnabled(of(false));

    toolbar
        .addTextButton()
        .withCaption(of('Edit'))
        .withClick(() => {});

    toolbar
        .addSecondaryButton()
        .withCaption(of('Cancel'))
        .withClick(() => {});

    toolbar
        .withPrimaryButton()
        .withCaption(of('Save'))
        .withClick(() => {});

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM);

    layout.addSlot().withContent({ build: () => banner });
    layout.addSlot().withContent(toolbar);

    const container = layout.build();
    container.classList.add('p-4');

    return container;
};

export const Reactive = () => {
    const banner = new LabelBuilder()
        .withCaption(of('Read-only view'))
        .withClass(of('bg-surface-variant px-4 py-2 rounded w-full text-on-surface-variant'))
        .build();

    const toolbar = new ToolbarBuilder().withEnabled(of(false));

    toolbar
        .addTextButton()
        .withCaption(of('Edit'))
        .withClick(() => {});

    toolbar
        .addSecondaryButton()
        .withCaption(of('Cancel'))
        .withClick(() => {});

    toolbar
        .withPrimaryButton()
        .withCaption(of('Save'))
        .withClick(() => {});

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM);

    layout.addSlot().withContent({ build: () => banner });
    layout.addSlot().withContent(toolbar);

    const container = layout.build();
    container.classList.add('p-4');

    return container;
};
