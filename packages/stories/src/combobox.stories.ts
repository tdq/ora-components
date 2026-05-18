import { ComboBoxBuilder, ComboBoxStyle } from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { LayoutBuilder, LayoutGap } from '@tdq/ora-components';
import { LabelBuilder, LabelSize } from '@tdq/ora-components';
import { createActionLog, createButton, createControlStrip } from './story-helpers';

export default {
    title: 'Components/ComboBox',
    tags: ['stable', 'glass', 'reactive'],
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
        new ComboBoxBuilder<string>()
            .withItems(items$)
            .withCaption(of('Loading ComboBox'))
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

const COUNTRIES = ['United States', 'Canada', 'Mexico', 'Brazil', 'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Japan', 'Australia', 'India', 'China', 'South Korea', 'South Africa'];

export const AsyncOptions = () => {
    const items$ = new BehaviorSubject<string[]>([]);
    const loading$ = new BehaviorSubject(true);

    // Simulate fetching options from a server
    const loadOptions = () => {
        loading$.next(true);
        items$.next([]);

        setTimeout(() => {
            items$.next(COUNTRIES);
            loading$.next(false);
        }, 800);
    };

    loadOptions(); // initial fetch

    // Status caption tied to loading state
    const caption$ = loading$.pipe(
        map(loading => loading ? 'Loading countries...' : 'Select a country')
    );

    const value$ = new BehaviorSubject<string | null>(null);
    const { element: actionLog, log } = createActionLog();

    value$.subscribe(val => {
        if (val) {
            log(`Selected: ${val}`);
        }
    });

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Async Options (simulated 800ms server delay)'))
            .withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(items$)
            .withCaption(caption$)
            .withPlaceholder('Search countries...')
            .withValue(value$)
    );

    // Reload button
    const reloadBtn = createButton('Reload Options', () => {
        log('Reloading options...');
        loadOptions();
    });

    layout.addSlot().withContent({
        build: () => createControlStrip([reloadBtn.build()])
    });

    layout.addSlot().withContent({ build: () => actionLog });

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

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

export const ProgrammaticControl = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    const value$ = new BehaviorSubject<string | null>(null);
    const combobox = new ComboBoxBuilder<string>()
        .withItems(of(FRUITS))
        .withValue(value$)
        .withCaption(of('Programmatically Controlled ComboBox'))
        .build();

    layout.addSlot().withContent({
        build: () => combobox
    });

    const appleButton = createButton('Select Apple', () => value$.next('Apple')).build();
    const bananaButton = createButton('Select Banana', () => value$.next('Banana')).build();
    const clearButton = createButton('Clear', () => value$.next(null)).build();

    layout.addSlot().withContent({ build: () => createControlStrip([appleButton, bananaButton, clearButton]) });

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
    container.classList.add('flex-1', 'p-12', 'bg-gradient-to-br', 'from-indigo-500', 'via-purple-500', 'to-pink-500');

    return container;
};
