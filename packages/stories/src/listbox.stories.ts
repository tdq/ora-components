import { ListBoxBuilder, ListBoxStyle, registerDestroy } from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';
import { LayoutBuilder, LayoutGap } from '@tdq/ora-components';
import { LabelBuilder, LabelSize } from '@tdq/ora-components';

export default {
    title: 'Components/ListBox',
    tags: ['stable', 'glass', 'reactive'],
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

    // Borderless
    const borderlessColumn = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);
    borderlessColumn.addSlot().withContent(
        new LabelBuilder().withCaption(of('Borderless Style')).withSize(LabelSize.MEDIUM)
    );
    borderlessColumn.addSlot().withContent(
        new ListBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withCaption(of('Select a fruit'))
            .withStyle(of(ListBoxStyle.BORDERLESS))
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

export const Loading = () => {
    const items$ = new BehaviorSubject<string[]>([]);

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Loading State'))
            .withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new ListBoxBuilder<string>()
            .withItems(items$)
            .withCaption(of('Loading ListBox'))
            .withHeight(of(200))
    );

    const loadingLabel = new LabelBuilder()
        .withCaption(of('Loading options...'))
        .withSize(LabelSize.MEDIUM)
        .build();

    layout.addSlot().withContent({ build: () => loadingLabel });

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    setTimeout(() => {
        loadingLabel.remove();
        items$.next(FRUITS);
    }, 800);

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
    container.classList.add('flex-1', 'p-12', 'bg-gradient-to-br', 'from-indigo-500', 'via-purple-500', 'to-pink-500');

    return container;
};

/**
 * Virtualized rendering (B11): 10,000 items, only a window of <li> elements exists in
 * the DOM at any time. Keyboard navigation patches just the previously- and
 * newly-focused rows in place, selection patches only the rows whose id matches the
 * old/new selection, and switching style re-renders the window in place after
 * discarding cached row measurements. Click the list and hold ArrowDown to see the
 * window slide without the DOM growing.
 */
export const Virtualized = () => {
    const BIG_LIST = Array.from({ length: 10000 }, (_, i) => `Item ${i + 1}`);
    const style$ = new BehaviorSubject<ListBoxStyle>(ListBoxStyle.TONAL);
    const value$ = new BehaviorSubject<string | null>(null);

    const layout = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('10,000 items — rendered as a moving window'))
            .withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new ListBoxBuilder<string>()
            .withItems(of(BIG_LIST))
            .withCaption(of('Virtualized list'))
            .withStyle(style$)
            .withValue(value$)
            .withHeight(of(300))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    const toolbar = document.createElement('div');
    toolbar.className = 'flex gap-2 items-center mt-4';

    const styleButton = document.createElement('button');
    styleButton.className = 'px-3 py-1 rounded-medium border border-outline text-label-medium';
    const STYLE_CYCLE = [ListBoxStyle.TONAL, ListBoxStyle.OUTLINED, ListBoxStyle.BORDERLESS];
    const styleName = (s: ListBoxStyle) => STYLE_CYCLE.indexOf(s) === 0 ? 'TONAL' : (STYLE_CYCLE.indexOf(s) === 1 ? 'OUTLINED' : 'BORDERLESS');
    styleButton.textContent = `Style: ${styleName(style$.getValue())} (click to cycle)`;
    styleButton.onclick = () => {
        const next = STYLE_CYCLE[(STYLE_CYCLE.indexOf(style$.getValue()) + 1) % STYLE_CYCLE.length];
        style$.next(next); // in-place refresh of the rendered window + re-measure
        styleButton.textContent = `Style: ${styleName(next)} (click to cycle)`;
    };
    toolbar.appendChild(styleButton);

    const readout = document.createElement('span');
    readout.className = 'text-label-medium text-on-surface-variant';
    const updateReadout = () => {
        const count = container.querySelectorAll('li[role="option"]').length;
        readout.textContent = `${count} <li> in the DOM · selected: ${value$.getValue() ?? 'none'}`;
    };
    const valueSub = value$.subscribe(updateReadout);
    // Refresh the readout as the window slides.
    container.addEventListener('scroll', updateReadout, true);
    container.addEventListener('keyup', updateReadout, true);
    registerDestroy(container, () => {
        valueSub.unsubscribe();
        container.removeEventListener('scroll', updateReadout, true);
        container.removeEventListener('keyup', updateReadout, true);
    });

    // The ListBox's items$ is viewport-gated (createOptimizedPipeline) — rows only render
    // once an IntersectionObserver confirms the container is on-screen, which happens after
    // this function returns and Storybook appends the element to the DOM. Reading the DOM
    // synchronously here would report 0. A double rAF waits for that append + layout + the
    // observer's first callback before taking the initial reading.
    requestAnimationFrame(() => requestAnimationFrame(updateReadout));
    toolbar.appendChild(readout);

    container.appendChild(toolbar);

    return container;
};
