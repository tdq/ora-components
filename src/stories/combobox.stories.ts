import { ComboBoxBuilder, ComboBoxStyle } from '../components/combobox';
import { BehaviorSubject, of } from 'rxjs';
import { LayoutBuilder, LayoutGap } from '../components/layout';
import { LabelBuilder, LabelSize } from '../components/label';

export default {
    title: 'Components/ComboBox',
};

const FRUITS = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape'];

export const Styles = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE);

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Tonal Style'))
            .withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withCaption(of('Select a fruit'))
            .withStyle(of(ComboBoxStyle.TONAL))
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Outlined Style'))
            .withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withCaption(of('Select a fruit'))
            .withStyle(of(ComboBoxStyle.OUTLINED))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const Placeholder = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withPlaceholder('Type to search fruits...')
            .withCaption(of('ComboBox with placeholder'))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const InitialValue = () => {
    const value$ = new BehaviorSubject<string | null>('Cherry');

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withValue(value$)
            .withCaption(of('Pre-selected item'))
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
        new ComboBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withEnabled(of(false))
            .withCaption(of('Disabled ComboBox'))
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Error State'))
            .withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withError(of('This field is required'))
            .withCaption(of('Error ComboBox'))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const ProgrammaticControl = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    const combobox = new ComboBoxBuilder<string>()
        .withItems(of(FRUITS))
        .withCaption(of('Controlled ComboBox'))
        .build();

    layout.addSlot().withContent({
        build: () => combobox
    });

    const buttonsLayout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.MEDIUM);

    const showButton = document.createElement('button');
    showButton.textContent = 'Show';
    showButton.className = 'px-4 py-2 bg-primary text-on-primary rounded-full hover:shadow-lg transition-shadow';
    showButton.onclick = () => combobox.show();

    const hideButton = document.createElement('button');
    hideButton.textContent = 'Hide';
    hideButton.className = 'px-4 py-2 bg-secondary text-on-secondary rounded-full hover:shadow-lg transition-shadow';
    hideButton.onclick = () => combobox.hide();

    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Toggle';
    toggleButton.className = 'px-4 py-2 bg-tertiary text-on-tertiary rounded-full hover:shadow-lg transition-shadow';
    toggleButton.onclick = () => combobox.toggle();

    buttonsLayout.addSlot().withContent({ build: () => showButton });
    buttonsLayout.addSlot().withContent({ build: () => hideButton });
    buttonsLayout.addSlot().withContent({ build: () => toggleButton });

    layout.addSlot().withContent(buttonsLayout);

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

interface User {
    id: number;
    name: string;
    role: string;
}

const USERS: User[] = [
    { id: 1, name: 'Alice Smith', role: 'Admin' },
    { id: 2, name: 'Bob Jones', role: 'User' },
    { id: 3, name: 'Charlie Brown', role: 'Editor' },
    { id: 4, name: 'Diana Prince', role: 'Guest' },
];

export const ComplexObjects = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new ComboBoxBuilder<User>()
            .withItems(of(USERS))
            .withItemCaptionProvider((user) => `${user.name} (${user.role})`)
            .withItemIdProvider((user) => user.id)
            .withCaption(of('Select user (custom ID provider)'))
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
        new ComboBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withCaption(of('Glass effect'))
            .asGlass()
    );

    const container = layout.build();
    container.classList.add('p-12', 'max-w-md', 'bg-gradient-to-br', 'from-primary', 'to-secondary', 'min-h-[300px]');

    return container;
};

export const Interactive = () => {
    const value$ = new BehaviorSubject<string | null>(null);
    const label$ = new BehaviorSubject<string>('Select a fruit');

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withValue(value$)
            .withCaption(label$)
    );

    const statusLabel = new LabelBuilder()
        .withCaption(of('Current Selection: None'))
        .withSize(LabelSize.MEDIUM)
        .build();

    value$.subscribe(val => {
        statusLabel.textContent = `Current Selection: ${val || 'None'}`;
    });

    layout.addSlot().withContent({
        build: () => statusLabel
    });

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};
