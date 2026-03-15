import { ListBoxBuilder, ListBoxStyle } from 'aura-components';
import { BehaviorSubject, of } from 'rxjs';
import { LayoutBuilder, LayoutGap } from 'aura-components';
import { LabelBuilder, LabelSize } from 'aura-components';

export default {
    title: 'Components/ListBox',
};

const FRUITS = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape', 'Honeydew', 'Kiwi', 'Lemon', 'Mango', 'Nectarine', 'Orange', 'Papaya', 'Quince', 'Raspberry', 'Strawberry', 'Tangerine', 'Ugli Fruit', 'Watermelon'];

export const Styles = () => {
    const layout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.EXTRA_LARGE);

    // Tonal
    const tonalColumn = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);
    tonalColumn.addSlot().withContent(
        new LabelBuilder().withCaption(of('Tonal Style')).withSize(LabelSize.MEDIUM)
    );
    tonalColumn.addSlot().withContent(
        new ListBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withCaption(of('Select a fruit'))
            .withStyle(of(ListBoxStyle.TONAL))
            .withHeight(of(200))
    );
    layout.addSlot().withContent(tonalColumn);

    // Outlined
    const outlinedColumn = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);
    outlinedColumn.addSlot().withContent(
        new LabelBuilder().withCaption(of('Outlined Style')).withSize(LabelSize.MEDIUM)
    );
    outlinedColumn.addSlot().withContent(
        new ListBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withCaption(of('Select a fruit'))
            .withStyle(of(ListBoxStyle.OUTLINED))
            .withHeight(of(200))
    );
    layout.addSlot().withContent(outlinedColumn);

    const container = layout.build();
    container.classList.add('p-4');

    return container;
};

export const States = () => {
    const layout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.EXTRA_LARGE);

    // Disabled
    const disabledColumn = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);
    disabledColumn.addSlot().withContent(
        new LabelBuilder().withCaption(of('Disabled State')).withSize(LabelSize.MEDIUM)
    );
    disabledColumn.addSlot().withContent(
        new ListBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withEnabled(of(false))
            .withCaption(of('Disabled ListBox'))
            .withHeight(of(150))
    );
    layout.addSlot().withContent(disabledColumn);

    // Error
    const errorColumn = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);
    errorColumn.addSlot().withContent(
        new LabelBuilder().withCaption(of('Error State')).withSize(LabelSize.MEDIUM)
    );
    errorColumn.addSlot().withContent(
        new ListBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withError(of('Selection is required'))
            .withCaption(of('Error ListBox'))
            .withHeight(of(150))
    );
    layout.addSlot().withContent(errorColumn);

    const container = layout.build();
    container.classList.add('p-4');

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
    { id: 5, name: 'Evan Wright', role: 'User' },
    { id: 6, name: 'Fiona Green', role: 'Editor' },
];

export const ComplexObjects = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new ListBoxBuilder<User>()
            .withItems(of(USERS))
            .withItemCaptionProvider((user) => `${user.name} (${user.role})`)
            .withItemIdProvider((user) => user.id)
            .withCaption(of('Select user (custom ID provider)'))
            .withHeight(of(250))
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
        new ListBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withCaption(of('Glass effect'))
            .withHeight(of(200))
            .asGlass()
    );

    const container = layout.build();
    container.classList.add('p-12', 'max-w-md', 'bg-gradient-to-br', 'from-primary', 'to-secondary', 'min-h-[400px]');

    return container;
};

export const Interactive = () => {
    const value$ = new BehaviorSubject<string | null>(null);

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new ListBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withValue(value$)
            .withCaption(of('Interactive Selection'))
            .withHeight(of(200))
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
