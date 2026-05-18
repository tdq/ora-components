import { TabsBuilder, LabelBuilder, ButtonBuilder, ButtonStyle } from '@tdq/ora-components';
import { of, BehaviorSubject } from 'rxjs';

export default {
    title: 'Components/Tabs',
    tags: ['stable', 'glass', 'reactive'],
    parameters: {
        layout: 'padded',
    },
};

export const Default = () => {
    const tabs = new TabsBuilder()
        .withCaption(of('Tabs Example'))
        .withDescription(of('Standard tabs with content'));

    tabs.addTab()
        .withCaption(of('Tab 1'))
        .withContent(new LabelBuilder().withCaption(of('Content for Tab 1')));
    
    tabs.addTab()
        .withCaption(of('Tab 2'))
        .withContent(new LabelBuilder().withCaption(of('Content for Tab 2')));

    tabs.addTab()
        .withCaption(of('Tab 3'))
        .withContent(new LabelBuilder().withCaption(of('Content for Tab 3')));

    return tabs.build();
};

export const Scrollable = () => {
    const tabs = new TabsBuilder()
        .withCaption(of('Scrollable Tabs'))
        .withDescription(of('Resize window to see scrolling'));

    for (let i = 1; i <= 15; i++) {
        tabs.addTab()
            .withCaption(of(`Tab ${i}`))
            .withContent(new LabelBuilder().withCaption(of(`Content for Tab ${i}`)));
    }

    return tabs.build();
};

export const WithVisibilityToggle = () => {
    const container = document.createElement('div');
    const visible$ = new BehaviorSubject(true);

    const toggleBtn = new ButtonBuilder()
        .withCaption(of('Toggle Tab 2'))
        .withStyle(of(ButtonStyle.FILLED))
        .withClick(() => visible$.next(!visible$.value))
        .build();
    toggleBtn.classList.add('mb-4');
    container.appendChild(toggleBtn);

    const tabs = new TabsBuilder()
        .withCaption(of('Dynamic Visibility'));

    tabs.addTab()
        .withCaption(of('Always Visible'))
        .withContent(new LabelBuilder().withCaption(of('Tab 1 Content')));
    
    tabs.addTab()
        .withCaption(of('Toggle Me'))
        .withVisible(visible$)
        .withContent(new LabelBuilder().withCaption(of('Tab 2 Content (Toggled)')));

    tabs.addTab()
        .withCaption(of('Another Tab'))
        .withContent(new LabelBuilder().withCaption(of('Tab 3 Content')));

    container.appendChild(tabs.build());
    return container;
};

export const GlassEffect = () => {
    const tabs = new TabsBuilder()
        .asGlass()
        .withCaption(of('Glass Tabs'))
        .withDescription(of('Tabs with glassmorphism effect'));

    tabs.addTab()
        .withCaption(of('Profile'))
        .withContent(new LabelBuilder().withCaption(of('Profile Settings Content')).withClass(of('text-white')));
    
    tabs.addTab()
        .withCaption(of('Security'))
        .withContent(new LabelBuilder().withCaption(of('Security Settings Content')).withClass(of('text-white')));

    return tabs.build();
};
