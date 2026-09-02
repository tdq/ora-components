import { ComboBoxBuilder, ComboBoxStyle } from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { LayoutBuilder, LayoutGap } from '@tdq/ora-components';
import { LabelBuilder, LabelSize } from '@tdq/ora-components';
import { ButtonBuilder, ButtonStyle } from '@tdq/ora-components';
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

/**
 * `asInlineError()` — the error is shown as a red outline plus an error icon
 * (click it for the message) instead of support text under the field.
 * Covers: no error, static error in both styles, a live "required" validation,
 * a manual toggle, and the glass variant.
 */
export const InlineErrorStates = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE);

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('No error — the field renders exactly like a plain ComboBox'))
            .withSize(LabelSize.MEDIUM)
    );
    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withCaption(of('Fruit'))
            .withError(of(''))
            .asInlineError()
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Static error — TONAL and OUTLINED'))
            .withSize(LabelSize.MEDIUM)
    );
    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withCaption(of('Fruit (tonal)'))
            .withError(of('This field is required'))
            .asInlineError()
            .withStyle(of(ComboBoxStyle.TONAL))
    );
    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withCaption(of('Fruit (outlined)'))
            .withError(of('This field is required'))
            .asInlineError()
            .withStyle(of(ComboBoxStyle.OUTLINED))
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Live validation — required until a value is picked'))
            .withSize(LabelSize.MEDIUM)
    );
    const required$ = new BehaviorSubject<string | null>(null);
    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withCaption(of('Fruit (required)'))
            .withValue(required$)
            .withError(required$.pipe(map(v => (v ? '' : 'Pick a fruit'))))
            .asInlineError()
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Manual toggle'))
            .withSize(LabelSize.MEDIUM)
    );
    const toggled$ = new BehaviorSubject<string>('');
    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withCaption(of('Fruit (toggle)'))
            .withError(toggled$)
            .asInlineError()
    );
    layout.addSlot().withContent(
        new ButtonBuilder()
            .withCaption(toggled$.pipe(map(e => (e ? 'Clear error' : 'Show error'))))
            .withStyle(of(ButtonStyle.OUTLINED))
            .withClick(() => toggled$.next(toggled$.getValue() ? '' : 'Something went wrong'))
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Disabled with error'))
            .withSize(LabelSize.MEDIUM)
    );
    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withCaption(of('Fruit (disabled)'))
            .withEnabled(of(false))
            .withError(of('Cannot be changed'))
            .asInlineError()
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const InlineErrorGlass = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withCaption(of('Glass, no error'))
            .withError(of(''))
            .asInlineError()
            .asGlass()
    );

    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(of(FRUITS))
            .withCaption(of('Glass, inline error'))
            .withError(of('This field is required'))
            .asInlineError()
            .asGlass()
    );

    const container = layout.build();
    container.classList.add('flex-1', 'p-12', 'bg-gradient-to-br', 'from-indigo-500', 'via-purple-500', 'to-pink-500');

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

/** 1000 virtualized options + adaptive debounce + a clamped popup height. */
export const LargeListAndTuning = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    const MANY = Array.from({ length: 1000 }, (_, i) => `Item ${i}`);

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('1000 items — virtualized, 150ms adaptive filter debounce (default for >= 100 items)'))
            .withSize(LabelSize.SMALL)
    );

    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(of(MANY))
            // No caption: the accessible name comes from withAriaLabel instead.
            .withAriaLabel(of('Large item list'))
            .withPlaceholder('Type to filter 1000 items...')
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('withMaxHeight(120) — the <ul> scrolls, the popover wrapper never does'))
            .withSize(LabelSize.SMALL)
    );

    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(of(MANY))
            .withCaption(of('Short popup (120px)'))
            .withMaxHeight(120)
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('withFilterDebounce(0) — filters synchronously on every keystroke'))
            .withSize(LabelSize.SMALL)
    );

    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(of(MANY))
            .withCaption(of('No debounce'))
            .withFilterDebounce(0)
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

/** 10,000 deterministic virtualized options — only a window of `<li>` rows renders in the DOM. */
export const LargeList10k = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    const HUGE = Array.from({ length: 10000 }, (_, i) => `Account #${String(i + 1).padStart(5, '0')}`);

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('10,000 items — virtualized dropdown, deterministic labels'))
            .withSize(LabelSize.SMALL)
    );

    layout.addSlot().withContent(
        new ComboBoxBuilder<string>()
            .withItems(of(HUGE))
            .withCaption(of('Search accounts'))
            .withPlaceholder('Type to filter 10,000 accounts...')
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

/**
 * PopoverBuilder's flip math (`popover.ts`'s `_position()`) measures space against the REAL
 * browser viewport (`window.innerHeight` vs. `anchorRect.bottom`), not against any bounding
 * container the anchor happens to sit inside. So demonstrating the flip requires the anchor to
 * actually be near the bottom of the browser's visible viewport — a bounded, independently
 * scrolling box does not trigger it (there's ample room below the anchor in the real viewport,
 * even though the box itself is short), and a naked `position: fixed` anchor escapes normal
 * document flow (and any bounding container, including a docs `<Canvas>` iframe) to float
 * relative to the whole page.
 *
 * The fix used here: opt into `layout: 'fullscreen'` (see this story's `.parameters` below) so
 * the story renders at the full viewport, size the container to `h-screen`, and anchor the
 * combobox via `position: absolute` near ITS bottom edge — since the container itself spans
 * the viewport, that also puts the anchor near the viewport's real bottom edge, without ever
 * using `position: fixed`.
 */
export const NearViewportBottom = () => {
    const container = document.createElement('div');
    container.className = 'relative h-screen p-8';

    const info = document.createElement('div');
    info.className = 'text-body-medium text-on-surface-variant max-w-2xl';
    info.textContent = 'The combobox below is anchored near the bottom of this full-height viewport. There is not enough room below it for the dropdown to open downward, so the popover flips to open above the input and clamps its height to the available space.';
    container.appendChild(info);

    const anchorWrap = document.createElement('div');
    anchorWrap.className = 'absolute left-8 right-8 bottom-8 max-w-md';
    anchorWrap.appendChild(
        new ComboBoxBuilder<string>()
            .withItems(of(FRUITS.concat(COUNTRIES)))
            .withCaption(of('Anchored near the bottom of the viewport'))
            .withMaxHeight(220)
            .build()
    );
    container.appendChild(anchorWrap);

    return container;
};
NearViewportBottom.parameters = { layout: 'fullscreen' };
