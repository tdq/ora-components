import { MultiSelectListBuilder, MultiSelectListStyle, LayoutBuilder, LayoutGap, LabelBuilder, LabelSize } from 'aura-components';
import { BehaviorSubject, of } from 'rxjs';

export default {
    title: 'Components/MultiSelectList',
};

const FRUITS = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape', 'Honeydew', 'Kiwi', 'Lemon', 'Mango', 'Nectarine', 'Orange', 'Papaya', 'Quince', 'Raspberry', 'Strawberry', 'Tangerine', 'Ugli Fruit', 'Watermelon'];

export const Styles = () => {
    const layout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.EXTRA_LARGE);

    const tonalColumn = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);
    tonalColumn.addSlot().withContent(
        new LabelBuilder().withCaption(of('Tonal Style')).withSize(LabelSize.MEDIUM)
    );
    tonalColumn.addSlot().withContent(
        new MultiSelectListBuilder<string>()
            .withItems(of(FRUITS))
            .withCaption(of('Select fruits'))
            .withStyle(of(MultiSelectListStyle.TONAL))
            .withHeight(of(200))
    );
    layout.addSlot().withContent(tonalColumn);

    const outlinedColumn = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);
    outlinedColumn.addSlot().withContent(
        new LabelBuilder().withCaption(of('Outlined Style')).withSize(LabelSize.MEDIUM)
    );
    outlinedColumn.addSlot().withContent(
        new MultiSelectListBuilder<string>()
            .withItems(of(FRUITS))
            .withCaption(of('Select fruits'))
            .withStyle(of(MultiSelectListStyle.OUTLINED))
            .withHeight(of(200))
    );
    layout.addSlot().withContent(outlinedColumn);

    const borderlessColumn = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);
    borderlessColumn.addSlot().withContent(
        new LabelBuilder().withCaption(of('Borderless Style')).withSize(LabelSize.MEDIUM)
    );
    borderlessColumn.addSlot().withContent(
        new MultiSelectListBuilder<string>()
            .withItems(of(FRUITS))
            .withCaption(of('Select fruits'))
            .withStyle(of(MultiSelectListStyle.BORDERLESS))
            .withHeight(of(200))
    );
    layout.addSlot().withContent(borderlessColumn);

    const container = layout.build();
    container.classList.add('p-4');

    return container;
};

export const States = () => {
    const layout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.EXTRA_LARGE);

    const disabledColumn = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);
    disabledColumn.addSlot().withContent(
        new LabelBuilder().withCaption(of('Disabled State')).withSize(LabelSize.MEDIUM)
    );
    disabledColumn.addSlot().withContent(
        new MultiSelectListBuilder<string>()
            .withItems(of(FRUITS))
            .withEnabled(of(false))
            .withHeight(of(150))
    );
    layout.addSlot().withContent(disabledColumn);

    const errorColumn = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);
    errorColumn.addSlot().withContent(
        new LabelBuilder().withCaption(of('Error State')).withSize(LabelSize.MEDIUM)
    );
    errorColumn.addSlot().withContent(
        new MultiSelectListBuilder<string>()
            .withItems(of(FRUITS))
            .withError(of('Selection is required'))
            .withHeight(of(150))
    );
    layout.addSlot().withContent(errorColumn);

    const container = layout.build();
    container.classList.add('p-4');

    return container;
};

export const Interactive = () => {
    const value$ = new BehaviorSubject<string[]>(['Apple', 'Banana']);

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new MultiSelectListBuilder<string>()
            .withItems(of(FRUITS))
            .withValue(value$)
            .withHeight(of(250))
    );

    const statusLabel = new LabelBuilder()
        .withCaption(of(''))
        .withSize(LabelSize.MEDIUM)
        .build();

    value$.subscribe(vals => {
        statusLabel.textContent = `Selected (${vals.length}): ${vals.join(', ') || 'None'}`;
    });

    layout.addSlot().withContent({
        build: () => statusLabel
    });

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
    { id: 5, name: 'Evan Wright', role: 'User' },
    { id: 6, name: 'Fiona Green', role: 'Editor' },
];

export const ComplexObjects = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new MultiSelectListBuilder<User>()
            .withItems(of(USERS))
            .withItemIdProvider((user) => user.id)
            .withItemCaptionProvider((user) => `${user.name} (${user.role})`)
            .withValue(new BehaviorSubject<User[]>([USERS[0]]))
            .withCaption(of('Assign roles'))
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
        new MultiSelectListBuilder<string>()
            .withItems(of(FRUITS.slice(0, 8)))
            .withCaption(of('Glass effect'))
            .withHeight(of(250))
            .asGlass()
    );

    const container = layout.build();
    container.classList.add('p-12', 'max-w-md', 'bg-gradient-to-br', 'from-primary', 'to-secondary', 'min-h-[400px]');

    return container;
};

export const SelectAllToggle = () => {
    const layout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.EXTRA_LARGE);

    const withSelectAllColumn = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);
    withSelectAllColumn.addSlot().withContent(
        new LabelBuilder().withCaption(of('With Select All (default)')).withSize(LabelSize.MEDIUM)
    );
    withSelectAllColumn.addSlot().withContent(
        new MultiSelectListBuilder<string>()
            .withItems(of(FRUITS.slice(0, 6)))
            .withCaption(of('Select fruits'))
            .withHeight(of(220))
    );
    layout.addSlot().withContent(withSelectAllColumn);

    const withoutSelectAllColumn = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);
    withoutSelectAllColumn.addSlot().withContent(
        new LabelBuilder().withCaption(of('Without Select All')).withSize(LabelSize.MEDIUM)
    );
    withoutSelectAllColumn.addSlot().withContent(
        new MultiSelectListBuilder<string>()
            .withItems(of(FRUITS.slice(0, 6)))
            .withCaption(of('Select fruits'))
            .withSelectAll(false)
            .withHeight(of(220))
    );
    layout.addSlot().withContent(withoutSelectAllColumn);

    const container = layout.build();
    container.classList.add('p-4');

    return container;
};
