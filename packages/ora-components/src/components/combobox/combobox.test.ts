import { BehaviorSubject, Subject, of } from 'rxjs';
import { ComboBoxBuilder, ComboBoxStyle } from './combobox-builder';
import { fireEvent, screen, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { GatedObserver } from '../../utils/optimized-pipeline';

// jsdom does not implement scrollIntoView — stub it globally
HTMLElement.prototype.scrollIntoView = jest.fn();

// ---- Mock type helpers ----
interface IntersectionObserverMockStatic {
    triggerVisibility(element: Element, isIntersecting: boolean, ratio?: number): void;
    reset(): void;
}

interface GlobalWithIOMock {
    IntersectionObserverMock: IntersectionObserverMockStatic;
}

function getIOMock(): IntersectionObserverMockStatic {
    return (globalThis as unknown as GlobalWithIOMock).IntersectionObserverMock;
}

/**
 * Attaches container to document.body (if not already), fires the
 * IntersectionObserver mock for the CONTAINER (the always-visible combobox
 * root div), then advances fake timers 50 ms past the 20 ms appearDebounceMs
 * used by createOptimizedPipeline.
 *
 * The gating is on the combobox container — not the popover/listbox — so
 * options flow through as soon as the container is made visible.
 */
function triggerContainerVisibleAndWait(container: HTMLElement): void {
    if (!document.body.contains(container)) {
        document.body.appendChild(container);
    }
    getIOMock().triggerVisibility(container, true);
    jest.advanceTimersByTime(50);
}

/** Generates ['Item 0', 'Item 1', ..., `Item ${n - 1}`] for long-list tests. */
function makeItems(n: number): string[] {
    return Array.from({ length: n }, (_, i) => `Item ${i}`);
}

describe('ComboBoxBuilder', () => {
    let builder: ComboBoxBuilder<string>;
    const items = ['Apple', 'Banana', 'Cherry'];

    beforeEach(() => {
        jest.useFakeTimers();
        getIOMock().reset();
        builder = new ComboBoxBuilder<string>();
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.useRealTimers();
        getIOMock().reset();
    });

    test('should render ComboBox with initial items and value', () => {
        const items$ = new BehaviorSubject(items);
        const value$ = new BehaviorSubject<string | null>('Banana');
        const container = builder
            .withItems(items$)
            .withValue(value$)
            .build();
        document.body.appendChild(container);
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox') as HTMLInputElement;
        expect(input.value).toBe('Banana');
        expect(input).toHaveAttribute('aria-expanded', 'false');
    });

    test('should verify filtering: typing in the input should update the list of displayed options', async () => {
        const items$ = new BehaviorSubject(items);
        const container = builder
            .withItems(items$)
            .build();
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox');
        fireEvent.input(input, { target: { value: 'Ap' } });

        // Listbox should be visible
        const listbox = screen.getByRole('listbox');
        expect(listbox).toBeVisible();

        await waitFor(() => {
            const options = screen.getAllByRole('option');
            expect(options).toHaveLength(1);
            expect(options[0].textContent).toBe('Apple');
        });
    });

    test('should verify selection: clicking an option should update the bound Subject', () => {
        const items$ = new BehaviorSubject(items);
        const value$ = new BehaviorSubject<string | null>(null);
        const container = builder
            .withItems(items$)
            .withValue(value$)
            .build();
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox');
        fireEvent.click(input); // Open dropdown

        const appleOption = screen.getByText('Apple');
        fireEvent.click(appleOption);

        expect(value$.getValue()).toBe('Apple');
        expect(input).toHaveValue('Apple');
        expect(screen.getByRole('listbox', { hidden: true })).not.toBeVisible();
    });

    test('should verify keyboard navigation: ArrowUp/Down should highlight items, Enter should select', async () => {
        const items$ = new BehaviorSubject(items);
        const value$ = new BehaviorSubject<string | null>(null);
        const container = builder
            .withItems(items$)
            .withValue(value$)
            .withStyle(new BehaviorSubject(ComboBoxStyle.OUTLINED))
            .build();
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox');

        // ArrowDown once to open
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        expect(screen.getByRole('listbox')).toBeVisible();

        // After first ArrowDown, it opens and already highlights the first item
        await waitFor(() => {
            const options = screen.getAllByRole('option');
            expect(options[0]).toHaveClass('bg-on-surface/12');
        });

        // ArrowDown again to highlight second
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        await waitFor(() => {
            const options = screen.getAllByRole('option');
            expect(options[1]).toHaveClass('bg-on-surface/12');
            expect(options[0]).not.toHaveClass('bg-on-surface/12');
        });

        // Enter to select
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(value$.getValue()).toBe('Banana');
        expect(input).toHaveValue('Banana');
        expect(screen.getByRole('listbox', { hidden: true })).not.toBeVisible();
    });

    test('should verify dropdown behavior: should open on focus/input, close on Escape or click outside', () => {
        const items$ = new BehaviorSubject(items);
        const container = builder
            .withItems(items$)
            .build();
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox');

        // Click to open
        fireEvent.click(input);
        const listbox = screen.getByRole('listbox');
        expect(listbox).toBeVisible();

        // Escape to close
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(listbox).not.toBeVisible();

        // Input to open
        fireEvent.input(input, { target: { value: 'a' } });
        expect(listbox).toBeVisible();

        // Click outside to close
        fireEvent.click(document.body);
        expect(listbox).not.toBeVisible();
    });

    test('should verify reactive updates: changing the items$ or value$ Subjects from outside should update the UI', async () => {
        const items$ = new BehaviorSubject(items);
        const value$ = new BehaviorSubject<string | null>(null);
        const container = builder
            .withItems(items$)
            .withValue(value$)
            .build();
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox');

        // Change value$ from outside
        value$.next('Cherry');
        expect(input).toHaveValue('Cherry');

        // Reset search term by clearing input to see all items
        fireEvent.input(input, { target: { value: '' } });

        // Change items$ from outside
        items$.next(['New Item']);
        fireEvent.click(input); // Open to see new items

        await waitFor(() => {
            const options = screen.getAllByRole('option');
            expect(options).toHaveLength(1);
            expect(options[0].textContent).toBe('New Item');
        });
    });

    test('should verify accessibility: check for appropriate ARIA roles and attributes', async () => {
        const items$ = new BehaviorSubject(items);
        const container = builder
            .withItems(items$)
            .build();
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox');
        expect(input).toHaveAttribute('aria-autocomplete', 'list');
        expect(input).toHaveAttribute('aria-expanded', 'false');
        expect(input).toHaveAttribute('aria-haspopup', 'listbox');

        fireEvent.click(input);
        expect(input).toHaveAttribute('aria-expanded', 'true');
        const listbox = screen.getByRole('listbox');
        expect(listbox).toBeTruthy();

        // When opened, the first item is already highlighted
        await waitFor(() => {
            const options = screen.getAllByRole('option');
            expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
        });
    });

    test('should apply glass styling when asGlass is called', () => {
        const container = builder
            .asGlass()
            .build();
        document.body.appendChild(container);

        const inputContainer = container.querySelector('.glass-effect');
        expect(inputContainer).toBeTruthy();
    });

    test('should highlight selected item when dropdown opens', async () => {
        const items$ = new BehaviorSubject(items);
        const value$ = new BehaviorSubject<string | null>('Cherry');
        const container = builder
            .withItems(items$)
            .withValue(value$)
            .withStyle(new BehaviorSubject(ComboBoxStyle.OUTLINED))
            .build();
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox');
        fireEvent.click(input); // Open dropdown

        await waitFor(() => {
            const options = screen.getAllByRole('option');
            // Cherry is both selected and focused — selected item rendering takes priority
            // over the focus highlight (bg-on-surface/12 is only for focused-but-not-selected).
            // The ListBox uses BORDERLESS style inside the popover, so the tonal selected
            // background (bg-on-secondary-container/20) is applied.
            expect(options[2]).toHaveClass('bg-on-secondary-container/20');
            expect(options[2]).toHaveAttribute('aria-selected', 'true');
            expect(options[2].textContent).toBe('Cherry');
        });
    });

    test('should have bg-surface background for listbox in OUTLINED style', () => {
        const style$ = new BehaviorSubject(ComboBoxStyle.OUTLINED);
        const container = builder
            .withStyle(style$)
            .build();
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox');
        fireEvent.click(input); // Open dropdown

        // bg-surface is applied by ListBox to the inner listContainer div, not the <ul> itself
        const listbox = screen.getByRole('listbox');
        const listContainer = listbox.closest('div');
        expect(listContainer).toHaveClass('bg-surface');
        expect(listContainer).not.toHaveClass('bg-surface-container-low');
    });

    test('should render placeholder when provided', () => {
        const placeholder = 'Search items...';
        const container = builder
            .withPlaceholder(placeholder)
            .build();
        document.body.appendChild(container);

        const input = screen.getByRole('combobox') as HTMLInputElement;
        expect(input.placeholder).toBe(placeholder);
    });

    test('should use itemIdProvider for complex objects', async () => {
        interface Item { id: number; name: string; }
        const complexItems: Item[] = [
            { id: 1, name: 'Option 1' },
            { id: 2, name: 'Option 2' }
        ];
        const complexBuilder = new ComboBoxBuilder<Item>();
        const items$ = new BehaviorSubject(complexItems);
        const value$ = new BehaviorSubject<Item | null>(null);

        const container = complexBuilder
            .withItems(items$)
            .withValue(value$)
            .withItemCaptionProvider(item => item.name)
            .withItemIdProvider(item => item.id)
            .build();
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox');
        fireEvent.click(input); // Open dropdown

        // IDs are assigned asynchronously after ListBox renders
        await waitFor(() => {
            const options = screen.getAllByRole('option');
            expect(options[0].id).toContain('-option-1');
            expect(options[1].id).toContain('-option-2');
        });

        const options = screen.getAllByRole('option');
        fireEvent.click(options[1]);
        expect(value$.getValue()).toEqual(complexItems[1]);
        expect(input).toHaveValue('Option 2');
    });

    test('should have aria-controls matching listbox id', () => {
        const container = builder.build();
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox');

        // aria-controls is set upfront; open to verify it resolves to the actual listbox
        const ariaControls = input.getAttribute('aria-controls');
        expect(ariaControls).toMatch(/^cb-.*-listbox$/);

        fireEvent.click(input);
        const listbox = screen.getByRole('listbox');
        expect(input).toHaveAttribute('aria-controls', listbox.id);
    });

    test('should update focusedIndex on keyboard ArrowDown', async () => {
        const items$ = new BehaviorSubject(items);
        const container = builder
            .withItems(items$)
            .withStyle(new BehaviorSubject(ComboBoxStyle.OUTLINED))
            .build();
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox');
        fireEvent.click(input); // Open dropdown

        // Initial focus is 0
        await waitFor(() => {
            const options = screen.getAllByRole('option');
            expect(options[0]).toHaveClass('bg-on-surface/12');
        });

        // ArrowDown to focus second item
        fireEvent.keyDown(input, { key: 'ArrowDown' });

        await waitFor(() => {
            const currentOptions = screen.getAllByRole('option');
            expect(currentOptions[1]).toHaveClass('bg-on-surface/12');
            expect(currentOptions[0]).not.toHaveClass('bg-on-surface/12');
        });
    });

    test('should verify visibility: withVisible should toggle hidden class', () => {
        const visible$ = new BehaviorSubject(true);
        const container = builder
            .withVisible(visible$)
            .build();
        document.body.appendChild(container);

        expect(container).not.toHaveClass('hidden');

        visible$.next(false);
        expect(container).toHaveClass('hidden');

        visible$.next(true);
        expect(container).not.toHaveClass('hidden');
    });

    test('should show "No results" message and keep listbox in DOM when filtered items is empty', async () => {
        const items$ = new BehaviorSubject(items);
        const container = builder
            .withItems(items$)
            .build();
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox');

        // Type a term that matches nothing
        fireEvent.input(input, { target: { value: 'zzznomatch' } });

        // The <ul role="listbox"> must remain in the DOM (spec point 5)
        const listbox = screen.getByRole('listbox', { hidden: true });
        expect(listbox).toBeTruthy();

        // "No results" div must be visible — it lives inside the popover which is
        // appended to document.body, not inside the main container div.
        // The builder sets display to '' (empty string) to show; jsdom resolves
        // that to 'block', so we check it is not 'none'.
        await waitFor(() => {
            const allDivs = Array.from(document.querySelectorAll('div'));
            const noResultsDiv = allDivs.find(d => d.textContent === 'No results');
            expect(noResultsDiv).toBeTruthy();
            expect(noResultsDiv!.style.display).not.toBe('none');
        });

        // Type a term that does match — "No results" must hide again
        fireEvent.input(input, { target: { value: 'Apple' } });

        await waitFor(() => {
            const allDivs = Array.from(document.querySelectorAll('div'));
            const noResultsDiv = allDivs.find(d => d.textContent === 'No results');
            expect(noResultsDiv).toBeTruthy();
            expect(noResultsDiv!.style.display).toBe('none');
        });
    });

    test('should NOT select focused item when Space key is pressed (allows multi-word typing)', async () => {
        const items$ = new BehaviorSubject(items);
        const value$ = new BehaviorSubject<string | null>(null);
        const container = builder
            .withItems(items$)
            .withValue(value$)
            .build();
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox');

        // Open and focus first item via ArrowDown
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        expect(screen.getByRole('listbox')).toBeVisible();

        await waitFor(() => {
            const options = screen.getAllByRole('option');
            expect(options[0]).toHaveClass('bg-on-surface/12');
        });

        // Press Space — must NOT select the focused item
        fireEvent.keyDown(input, { key: ' ' });

        // Value remains unchanged
        expect(value$.getValue()).toBeNull();
        // Dropdown must remain open
        expect(input).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('listbox')).toBeVisible();
    });

    // ── Spec 2: No gaps — ListBox outer container has no py-* padding ─────────

    test('inner ListBox container has no py-* padding class (no gap above/below list)', () => {
        const items$ = new BehaviorSubject(items);
        const container = builder
            .withItems(items$)
            .build();
        triggerContainerVisibleAndWait(container);

        // Open the dropdown so the popover and listbox are mounted
        const input = screen.getByRole('combobox');
        fireEvent.click(input);

        // The ListBox outer container is the div wrapping the <ul role="listbox">
        const listbox = screen.getByRole('listbox');
        const listContainer = listbox.closest('div') as HTMLElement;

        // No py-* class should be present on the outer container
        const classes = Array.from(listContainer.classList);
        const pyClasses = classes.filter(c => /^py-/.test(c));
        expect(pyClasses).toHaveLength(0);
    });

    test('default max-height (256) is synced reactively onto the ListBox scroll element, not statically', async () => {
        const items$ = new BehaviorSubject(items);
        const container = builder
            .withItems(items$)
            .build();
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox');
        fireEvent.click(input);

        // No static max-h-px-256/overflow-hidden class on the ListBox root anymore.
        const listbox = screen.getByRole('listbox');
        const listBoxRoot = listbox.closest('div')?.parentElement as HTMLElement;
        expect(listBoxRoot).not.toHaveClass('max-h-px-256');

        // The <ul role="listbox"> itself (the actual scroller) gets the reactive height.
        await waitFor(() => {
            expect(listbox.style.maxHeight).toBe('256px');
        });
    });

    test('withMaxHeight(of(120)) sets the ListBox scroll element max-height to 120px and popover data-placement', async () => {
        const items$ = new BehaviorSubject(items);
        const container = builder
            .withItems(items$)
            .withMaxHeight(of(120))
            .build();
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox');
        fireEvent.click(input);

        const listbox = screen.getByRole('listbox');
        await waitFor(() => {
            expect(listbox.style.maxHeight).toBe('120px');
        });

        const popoverEl = listbox.closest('[popover]') as HTMLElement;
        expect(['top', 'bottom']).toContain(popoverEl.getAttribute('data-placement'));
    });

    // ── Spec 3: Initial value selection — dropdown stays open after value sync ─

    test('opening dropdown with initial value shows that item selected and highlighted', async () => {
        const items$ = new BehaviorSubject(items);
        const value$ = new BehaviorSubject<string | null>('Cherry');
        const container = builder
            .withItems(items$)
            .withValue(value$)
            .build();
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox');
        fireEvent.click(input); // Open dropdown

        await waitFor(() => {
            const options = screen.getAllByRole('option');
            const cherry = options[2]; // Cherry is index 2
            expect(cherry.textContent).toBe('Cherry');
            expect(cherry).toHaveAttribute('aria-selected', 'true');
            expect(cherry).toHaveClass('bg-on-secondary-container/20');
            expect(cherry).toHaveClass('font-bold');
        });
    });

    test('external value sync while dropdown is open does NOT close the dropdown (isSyncingExternalValue guard)', () => {
        const items$ = new BehaviorSubject(items);
        const value$ = new BehaviorSubject<string | null>(null);
        const container = builder
            .withItems(items$)
            .withValue(value$)
            .build();
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox');
        // Open the dropdown
        fireEvent.click(input);
        expect(input).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('listbox')).toBeVisible();

        // Simulate external value update while dropdown is open
        value$.next('Cherry');

        // Dropdown must remain open — isSyncingExternalValue guard prevents close
        expect(input).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('listbox')).toBeVisible();
    });

    // ── Viewport gating: lazy behavior proof ──────────────────────────────────

    test('options do NOT appear before the container is visible (lazy gating)', () => {
        const items$ = new BehaviorSubject(items);
        const container = builder
            .withItems(items$)
            .build();

        // Attach to DOM but do NOT trigger visibility
        document.body.appendChild(container);

        // Open the dropdown via click — options should not exist yet
        const input = screen.getByRole('combobox');
        fireEvent.click(input);

        // Advance timers without triggering IO — no items should have rendered
        jest.advanceTimersByTime(200);

        const options = document.querySelectorAll('[role="option"]');
        expect(options).toHaveLength(0);
    });

    test('options DO appear after triggerVisibility(container, true) + timer advance', async () => {
        const items$ = new BehaviorSubject(items);
        const container = builder
            .withItems(items$)
            .build();

        // Attach and make container visible — gatedItems$ will emit
        triggerContainerVisibleAndWait(container);

        // Open the dropdown
        const input = screen.getByRole('combobox');
        fireEvent.click(input);

        await waitFor(() => {
            const options = screen.getAllByRole('option');
            expect(options).toHaveLength(3);
            expect(options[0].textContent).toBe('Apple');
            expect(options[1].textContent).toBe('Banana');
            expect(options[2].textContent).toBe('Cherry');
        });
    });

    test('gatedItems$ is shared: pipeline tears down when hidden and ignores new items pushed while invisible', async () => {
        const items$ = new BehaviorSubject(items);
        const container = builder
            .withItems(items$)
            .build();

        // Make the container visible so gatedItems$ starts emitting
        triggerContainerVisibleAndWait(container);

        // Open the dropdown to confirm items render
        const input = screen.getByRole('combobox');
        fireEvent.click(input);

        await waitFor(() => {
            const options = screen.getAllByRole('option');
            expect(options).toHaveLength(3);
        });

        // Hide the container — refCount: true causes the upstream pipeline (and its
        // IntersectionObserver) to tear down once both internal consumers unsubscribe.
        getIOMock().triggerVisibility(container, false);
        jest.advanceTimersByTime(200);

        // Push new items while the pipeline is torn down — they must NOT reach the DOM
        items$.next([...items, 'Date', 'Elderberry']);
        jest.advanceTimersByTime(200);

        // The listbox must still reflect the last visible render (3 items)
        const allOptions = document.querySelectorAll('[role="option"]');
        expect(allOptions).toHaveLength(3);
    });

    test('filtered results do NOT appear before visibility, DO appear after', async () => {
        const items$ = new BehaviorSubject(items);
        const container = builder
            .withItems(items$)
            .build();

        // Attach but do NOT make visible
        document.body.appendChild(container);
        const input = screen.getByRole('combobox');

        // Type to filter — nothing should render yet
        fireEvent.input(input, { target: { value: 'App' } });
        jest.advanceTimersByTime(200);
        expect(document.querySelectorAll('[role="option"]')).toHaveLength(0);

        // Now make it visible — filtered results should flow through
        getIOMock().triggerVisibility(container, true);
        jest.advanceTimersByTime(50);

        await waitFor(() => {
            const options = screen.getAllByRole('option');
            expect(options).toHaveLength(1);
            expect(options[0].textContent).toBe('Apple');
        });
    });

    // ── GatedObserver idempotency: inner ListBox skips re-gating ─────────────

    test('inner ListBox renders options without its own triggerVisibility — receives a pre-branded GatedObserver from ComboBox', async () => {
        // ComboBox gates at the container level and passes new GatedObserver(filteredItems$)
        // to the inner ListBox. The ListBox's instanceof check must detect the brand and
        // NOT create a second IntersectionObserver.  We verify this by confirming that
        // options render once the container is made visible (single IO gate), and that
        // opening the dropdown immediately shows items without any additional visibility
        // trigger on the listbox itself.
        const items$ = new BehaviorSubject(items);
        const container = builder
            .withItems(items$)
            .build();

        // Make only the outer container visible — no second trigger needed
        triggerContainerVisibleAndWait(container);

        const input = screen.getByRole('combobox');
        fireEvent.click(input); // open dropdown

        // Options must be present — the inner ListBox used GatedObserver directly
        await waitFor(() => {
            const options = screen.getAllByRole('option');
            expect(options).toHaveLength(3);
            expect(options[0].textContent).toBe('Apple');
            expect(options[1].textContent).toBe('Banana');
            expect(options[2].textContent).toBe('Cherry');
        });

        // Confirm zero IntersectionObserver instances exist for the listbox element
        // (the popover/listbox element should NOT be observed — only the container is).
        const listbox = screen.getByRole('listbox');
        const allInstances = (globalThis as unknown as GlobalWithIOMock & {
            IntersectionObserverMock: { instances?: Array<{ observedElements: Set<Element> }> }
        }).IntersectionObserverMock.instances ?? [];
        const listboxObserved = allInstances.some(
            inst => inst.observedElements && inst.observedElements.has(listbox)
        );
        expect(listboxObserved).toBe(false);
    });

    test('idempotency guard: GatedObserver passed to withItems renders immediately without triggerVisibility', () => {
        // If a caller pre-gates items$ before passing to ComboBoxBuilder, ComboBox
        // creates its own pipeline on the container regardless — the GatedObserver
        // guard in ComboBox is on the inner ListBox, not on items$ itself.
        // This test confirms the outer gate (container IO) still works correctly when
        // items is a plain BehaviorSubject (normal path), and that options render only
        // after the container is made visible.
        const plainItems$ = new BehaviorSubject(items);
        const container = builder
            .withItems(plainItems$)
            .build();

        // Attach but do NOT trigger visibility
        document.body.appendChild(container);
        jest.advanceTimersByTime(100);

        const input = screen.getByRole('combobox');
        fireEvent.click(input);

        // Without visibility, no options should be in the DOM
        expect(document.querySelectorAll('[role="option"]')).toHaveLength(0);

        // Now gate opens — options must appear
        getIOMock().triggerVisibility(container, true);
        jest.advanceTimersByTime(50);

        const options = document.querySelectorAll('[role="option"]');
        expect(options).toHaveLength(3);
    });

    // ── Accessible name priority (withAriaLabel) ──────────────────────────────

    describe('accessible name priority', () => {
        let warnSpy: jest.SpyInstance;

        beforeEach(() => {
            warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            warnSpy.mockRestore();
        });

        test('caption wins over ariaLabel and placeholder', () => {
            const container = builder
                .withCaption(of('Caption text'))
                .withAriaLabel('Aria label text')
                .withPlaceholder('Placeholder text')
                .build();
            document.body.appendChild(container);

            const input = screen.getByRole('combobox');
            expect(input).toHaveAttribute('aria-labelledby');
            expect(input).not.toHaveAttribute('aria-label');
        });

        test('ariaLabel wins over placeholder when no caption', () => {
            const container = builder
                .withAriaLabel('Aria label text')
                .withPlaceholder('Placeholder text')
                .build();
            document.body.appendChild(container);

            const input = screen.getByRole('combobox');
            expect(input).not.toHaveAttribute('aria-labelledby');
            expect(input).toHaveAttribute('aria-label', 'Aria label text');
        });

        test('falls back to placeholder when no caption/ariaLabel', () => {
            const container = builder
                .withPlaceholder('Placeholder text')
                .build();
            document.body.appendChild(container);

            const input = screen.getByRole('combobox');
            expect(input).toHaveAttribute('aria-label', 'Placeholder text');
        });

        test('warns once (dev mode) when no caption/ariaLabel/placeholder configured', () => {
            const container = builder.build();
            document.body.appendChild(container);

            const input = screen.getByRole('combobox');
            expect(input).not.toHaveAttribute('aria-label');
            expect(input).not.toHaveAttribute('aria-labelledby');
            expect(warnSpy).toHaveBeenCalledTimes(1);
        });

        test('withAriaLabel accepts an Observable and updates reactively', () => {
            const ariaLabel$ = new BehaviorSubject('Initial label');
            const container = builder
                .withAriaLabel(ariaLabel$)
                .build();
            document.body.appendChild(container);

            const input = screen.getByRole('combobox');
            expect(input).toHaveAttribute('aria-label', 'Initial label');

            ariaLabel$.next('Updated label');
            expect(input).toHaveAttribute('aria-label', 'Updated label');
        });

        test('withCaption(Subject) that has not emitted yet does not starve the ariaLabel/placeholder fallback', () => {
            // Regression: combineLatest([captionText$, ariaLabelText$]) without startWith('')
            // would never emit until BOTH sources emit at least once. A caption Subject with
            // no initial value would then permanently block aria-label/aria-labelledby (and
            // the warn) even though a placeholder was provided.
            const caption$ = new Subject<string>();
            const container = builder
                .withCaption(caption$)
                .withPlaceholder('Placeholder text')
                .build();
            document.body.appendChild(container);

            const input = screen.getByRole('combobox');
            // No caption emitted yet -> falls back to placeholder, not starved.
            expect(input).toHaveAttribute('aria-label', 'Placeholder text');
            expect(input).not.toHaveAttribute('aria-labelledby');

            // Once the caption actually emits, it takes priority as documented.
            caption$.next('Caption text');
            expect(input).toHaveAttribute('aria-labelledby');
            expect(input).not.toHaveAttribute('aria-label');
        });

        test('an async caption$ that has not emitted yet does NOT trigger the no-accessible-name warn (config-time check, not runtime)', () => {
            // Regression: the warn used to be evaluated inside the combineLatest subscriber
            // against the CURRENT resolved text, so a caption$ Subject that simply hasn't
            // emitted yet (but was configured via withCaption) looked identical to "no name
            // configured at all" and incorrectly warned. It is now a one-time config-time
            // check (was withCaption/withAriaLabel/withPlaceholder called at all?).
            const caption$ = new Subject<string>();
            const container = builder
                .withCaption(caption$)
                .build();
            document.body.appendChild(container);

            // No emission yet, no placeholder/ariaLabel either — still must not warn, because
            // a caption WAS configured and will eventually supply a name.
            expect(warnSpy).not.toHaveBeenCalled();

            caption$.next('Caption text');
            expect(warnSpy).not.toHaveBeenCalled();
        });
    });

    // ── withValue: Observable (read-only) vs Subject (write-back) ────────────

    describe('withValue Observable vs Subject', () => {
        test('plain Observable updates displayed text/highlight but is never written back to', async () => {
            const source = new BehaviorSubject<string | null>(null);
            const value$ = source.asObservable();
            const nextSpy = jest.spyOn(source, 'next');

            const items$ = new BehaviorSubject(items);
            const container = builder
                .withItems(items$)
                .withValue(value$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox') as HTMLInputElement;

            // Observable drives displayed text
            source.next('Banana');
            expect(input.value).toBe('Banana');

            // User selection updates text/highlight locally but must not write back
            // to the read-only source.
            fireEvent.click(input);
            const appleOption = screen.getByText('Apple');
            nextSpy.mockClear();
            fireEvent.click(appleOption);

            expect(input.value).toBe('Apple');
            expect(nextSpy).not.toHaveBeenCalled();
        });

        test('Subject overload writes back on user selection', () => {
            const items$ = new BehaviorSubject(items);
            const value$ = new Subject<string | null>();
            const nextSpy = jest.spyOn(value$, 'next');

            const container = builder
                .withItems(items$)
                .withValue(value$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox');
            fireEvent.click(input);
            const appleOption = screen.getByText('Apple');
            fireEvent.click(appleOption);

            expect(nextSpy).toHaveBeenCalledWith('Apple');
        });

        test('source re-emitting the SAME value after a local select() still restores the display (no distinctUntilChanged starvation)', () => {
            // Regression: a local-only select() (read-only Observable mode) changes the
            // displayed text without touching the source. If the external subscription used
            // distinctUntilChanged, the source re-emitting the value it already held would be
            // filtered out (compared against the last value that passed through the stream,
            // not against what's currently displayed) and the display would never resync.
            const source = new BehaviorSubject<string | null>('Banana');
            const items$ = new BehaviorSubject(items);
            const container = builder
                .withItems(items$)
                .withValue(source.asObservable())
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox') as HTMLInputElement;
            expect(input.value).toBe('Banana');

            // Local-only selection — does not touch the read-only source.
            container.select('Apple');
            expect(input.value).toBe('Apple');

            // Source re-emits the SAME value it already held, intending to restore the display.
            source.next('Banana');
            expect(input.value).toBe('Banana');
        });

        test('a redundant re-emission of the same, already-displayed item is absorbed as a no-op', () => {
            // A form control that re-emits its current value on every unrelated re-render
            // re-runs the resync (currentValue$/listBoxValue$/setDisplayText) each tick.
            // That is harmless: every write is idempotent, so the observable end state is
            // unchanged and no in-progress UI state (keyboard focus, displayed text) moves.
            const value$ = new BehaviorSubject<string | null>('Banana');
            const items$ = new BehaviorSubject(items);
            const container = builder
                .withItems(items$)
                .withValue(value$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox') as HTMLInputElement;
            expect(input.value).toBe('Banana');

            // Move keyboard focus away from the selected row before the redundant emission.
            fireEvent.keyDown(input, { key: 'ArrowDown' }); // open
            fireEvent.keyDown(input, { key: 'ArrowDown' }); // focus moves
            const activeIdBefore = input.getAttribute('aria-activedescendant');

            // Redundant re-emission: same item, already correctly displayed.
            value$.next('Banana');

            expect(input.value).toBe('Banana');
            // The no-op absorption must not disturb unrelated in-progress UI state (keyboard
            // focus is untouched by this subscription regardless — this asserts it stays so).
            expect(input.getAttribute('aria-activedescendant')).toBe(activeIdBefore);
        });
    });

    // ── Element API: select()/open()/close() ──────────────────────────────────

    describe('element API', () => {
        test('open()/close() toggle the popover', () => {
            const items$ = new BehaviorSubject(items);
            const container = builder
                .withItems(items$)
                .build();
            triggerContainerVisibleAndWait(container);

            // The popover is built lazily on first open — before that, nothing is appended
            // to document.body, so the listbox does not exist in the DOM yet.
            expect(screen.queryByRole('listbox', { hidden: true })).toBeNull();

            container.open();
            const listbox = screen.getByRole('listbox', { hidden: true });
            expect(listbox).toBeVisible();

            container.close();
            expect(listbox).not.toBeVisible();
        });

        test('select(item) updates text, emits value, and closes the popover', () => {
            const items$ = new BehaviorSubject(items);
            const value$ = new BehaviorSubject<string | null>(null);
            const container = builder
                .withItems(items$)
                .withValue(value$)
                .build();
            triggerContainerVisibleAndWait(container);

            container.open();
            container.select('Banana');

            const input = screen.getByRole('combobox') as HTMLInputElement;
            expect(input.value).toBe('Banana');
            expect(value$.getValue()).toBe('Banana');
            expect(screen.getByRole('listbox', { hidden: true })).not.toBeVisible();
        });

        test('select(null) clears the input text', () => {
            const items$ = new BehaviorSubject(items);
            const value$ = new BehaviorSubject<string | null>('Apple');
            const container = builder
                .withItems(items$)
                .withValue(value$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox') as HTMLInputElement;
            container.select(null);
            expect(input.value).toBe('');
        });
    });

    // ── Long lists: virtualization + keyboard robustness ──────────────────────

    describe('long lists (1000 items)', () => {
        test('rendered <li> count stays well below item count, aria-setsize reflects total', async () => {
            const items$ = new BehaviorSubject(makeItems(1000));
            const container = builder
                .withItems(items$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox');
            fireEvent.click(input);

            await waitFor(() => {
                const options = screen.getAllByRole('option');
                expect(options.length).toBeGreaterThan(0);
                expect(options.length).toBeLessThan(1000);
                expect(options[0]).toHaveAttribute('aria-setsize', '1000');
            });
        });

        test('ArrowDown x50 keeps aria-activedescendant resolving to a live element', async () => {
            const items$ = new BehaviorSubject(makeItems(1000));
            const container = builder
                .withItems(items$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox');
            fireEvent.keyDown(input, { key: 'ArrowDown' }); // opens + focuses index 0

            for (let i = 0; i < 50; i++) {
                fireEvent.keyDown(input, { key: 'ArrowDown' });
            }

            await waitFor(() => {
                const activeId = input.getAttribute('aria-activedescendant');
                expect(activeId).toBeTruthy();
                const el = document.getElementById(activeId as string);
                expect(el).toBeTruthy();
                expect(document.body.contains(el)).toBe(true);
            });
        });

        test('activedescendant subscription-order invariant: referenced option is already in the DOM when the attribute is set', async () => {
            const items$ = new BehaviorSubject(makeItems(1000));
            const container = builder
                .withItems(items$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox');
            const originalSetAttribute = input.setAttribute.bind(input);
            const setAttributeSpy = jest.spyOn(input, 'setAttribute').mockImplementation((name: string, value: string) => {
                if (name === 'aria-activedescendant') {
                    expect(document.getElementById(value)).toBeTruthy();
                }
                return originalSetAttribute(name, value);
            });

            fireEvent.keyDown(input, { key: 'ArrowDown' });

            await waitFor(() => {
                expect(setAttributeSpy).toHaveBeenCalledWith('aria-activedescendant', expect.any(String));
            });

            setAttributeSpy.mockRestore();
        });

        test('Home/End/PageUp/PageDown move focus as expected', async () => {
            const items$ = new BehaviorSubject(makeItems(1000));
            const container = builder
                .withItems(items$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox');
            fireEvent.keyDown(input, { key: 'ArrowDown' }); // open, focus 0

            fireEvent.keyDown(input, { key: 'End' });
            await waitFor(() => {
                const activeId = input.getAttribute('aria-activedescendant');
                expect(activeId).toContain('-option-Item 999');
            });

            fireEvent.keyDown(input, { key: 'Home' });
            await waitFor(() => {
                const activeId = input.getAttribute('aria-activedescendant');
                expect(activeId).toContain('-option-Item 0');
            });

            fireEvent.keyDown(input, { key: 'PageDown' });
            await waitFor(() => {
                const activeId = input.getAttribute('aria-activedescendant');
                expect(activeId).toContain('-option-Item 10');
            });

            fireEvent.keyDown(input, { key: 'PageUp' });
            await waitFor(() => {
                const activeId = input.getAttribute('aria-activedescendant');
                expect(activeId).toContain('-option-Item 0');
            });
        });

        test('PageDown from focusedIndex -1 lands on the first row, not row 9 (treats -1 as "before first")', async () => {
            const items$ = new BehaviorSubject(makeItems(1000));
            const container = builder
                .withItems(items$)
                .withFilterDebounce(0) // isolate PageDown behaviour from the adaptive debounce
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox');
            fireEvent.keyDown(input, { key: 'ArrowDown' }); // open, focus 0

            // Filter to zero matches — the focusedIndex clamp resets focus to -1.
            fireEvent.input(input, { target: { value: 'zzznomatch' } });
            expect(input).not.toHaveAttribute('aria-activedescendant');

            // Restore the full (non-empty) list — focus stays at -1 (nothing re-focuses it).
            fireEvent.input(input, { target: { value: '' } });
            expect(input).not.toHaveAttribute('aria-activedescendant');

            fireEvent.keyDown(input, { key: 'PageDown' });
            await waitFor(() => {
                const activeId = input.getAttribute('aria-activedescendant');
                expect(activeId).toContain('-option-Item 0');
            });
        });

        test('focusedIndex clamps when filtering shrinks the list — aria-activedescendant never names a stale/out-of-range item', () => {
            const items$ = new BehaviorSubject(items); // Apple/Banana/Cherry
            const container = builder
                .withItems(items$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox');
            fireEvent.keyDown(input, { key: 'ArrowDown' }); // open, focus 0 (Apple)
            fireEvent.keyDown(input, { key: 'ArrowDown' }); // focus 1 (Banana)
            fireEvent.keyDown(input, { key: 'ArrowDown' }); // focus 2 (Cherry)
            expect(input.getAttribute('aria-activedescendant')).toContain('Cherry');

            // Filter down to a list that no longer has an index 2.
            fireEvent.input(input, { target: { value: 'Apple' } });

            const activeId = input.getAttribute('aria-activedescendant');
            expect(activeId).toContain('Apple');
            // The referenced element must actually exist — not name a row outside the
            // now-shrunk (and possibly unrendered) filtered list.
            expect(document.getElementById(activeId as string)).toBeTruthy();
        });

        test('an in-range focusedIndex that now names a DIFFERENT item after filtering updates aria-activedescendant (Apple/Banana regression)', () => {
            // Regression: the old clamp only fired when idx >= items.length. Focus Apple at
            // index 0, then filter to ['Banana'] (still length 1, index 0 still "in range")
            // — focusedIndex$'s VALUE never changes, so a subscriber keyed only off that
            // value change would keep pointing aria-activedescendant at the removed "Apple"
            // option while the ListBox highlight (and Enter) would act on "Banana".
            const items$ = new BehaviorSubject(items); // Apple/Banana/Cherry
            const value$ = new BehaviorSubject<string | null>(null);
            const container = builder
                .withItems(items$)
                .withValue(value$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox');
            fireEvent.keyDown(input, { key: 'ArrowDown' }); // open, focus index 0 (Apple)
            expect(input.getAttribute('aria-activedescendant')).toContain('Apple');

            // "n" matches only "Banana" (Apple/Cherry don't contain "n") — index 0 stays
            // in range but now names a different item.
            fireEvent.input(input, { target: { value: 'n' } });

            const activeId = input.getAttribute('aria-activedescendant');
            expect(activeId).toContain('Banana');
            expect(activeId).not.toContain('Apple');

            // The referenced element must exist and carry the focus highlight — the ListBox
            // subscribes to the branded filteredItems$ inside its own build() (before this
            // combobox's filteredItems$ subscription), so it has already re-rendered by now.
            const el = document.getElementById(activeId as string);
            expect(el).toBeTruthy();
            expect(el).toHaveClass('bg-on-surface/12');

            // Enter must select the item the attribute (and highlight) actually names.
            fireEvent.keyDown(input, { key: 'Enter' });
            expect(value$.getValue()).toBe('Banana');
        });
    });

    // ── Filtering: shareReplay, caching, adaptive debounce, flush, bypass ─────

    describe('filtering: shared pipeline + adaptive debounce', () => {
        test('captionProvider is only re-scanned once per items emission, not per keystroke', () => {
            const captionProvider = jest.fn((item: string) => item);
            const items$ = new BehaviorSubject(items); // small list, synchronous filtering
            const container = builder
                .withItems(items$)
                .withItemCaptionProvider(captionProvider)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox');
            captionProvider.mockClear();

            fireEvent.input(input, { target: { value: 'A' } });
            const callsAfterFirst = captionProvider.mock.calls.length;
            expect(callsAfterFirst).toBeGreaterThan(0);

            captionProvider.mockClear();
            fireEvent.input(input, { target: { value: 'Ap' } });
            // Items array reference unchanged -> the lower-cased caption cache used for
            // filtering is reused, so the provider is only invoked (if at all) for the
            // handful of rows the virtualized ListBox re-renders — never a full re-scan
            // of the source list.
            expect(captionProvider.mock.calls.length).toBeLessThan(items.length);
        });

        test('captionProvider is called 0 times across keystrokes once the cache is warm, and re-scans only when the items reference actually changes (150 items)', () => {
            const captionProvider = jest.fn((item: string) => item);
            const items$ = new BehaviorSubject(Array.from({ length: 150 }, (_, i) => `Item ${i}`));
            const container = builder
                .withItems(items$)
                .withItemCaptionProvider(captionProvider)
                .withFilterDebounce(0) // isolate cache behaviour from the adaptive debounce
                .build();

            // The lower-cased caption cache is built as soon as items are gated in — a full
            // scan (>= 150 calls; the virtualized window also renders a few initial rows,
            // each invoking the provider once for display) happens here, before the user
            // has typed anything.
            triggerContainerVisibleAndWait(container);
            expect(captionProvider.mock.calls.length).toBeGreaterThanOrEqual(150);

            const input = screen.getByRole('combobox');
            captionProvider.mockClear();

            // First keystroke: items$ reference unchanged -> cache reused -> 0 calls.
            fireEvent.input(input, { target: { value: 'zzz' } });
            expect(captionProvider).not.toHaveBeenCalled();
            expect(screen.queryAllByRole('option')).toHaveLength(0);

            captionProvider.mockClear();

            // Second keystroke: still the same items$ reference -> still 0 calls.
            fireEvent.input(input, { target: { value: 'zzzz' } });
            expect(captionProvider).not.toHaveBeenCalled();

            captionProvider.mockClear();

            // A genuinely new items array invalidates the cache and triggers a fresh scan —
            // proving the "0 calls" above is cache reuse, not a permanently frozen cache.
            items$.next(Array.from({ length: 150 }, (_, i) => `Item ${i}`));
            expect(captionProvider.mock.calls.length).toBeGreaterThanOrEqual(150);
        });

        test('small lists (<100 items) filter synchronously — no debounce', () => {
            const items$ = new BehaviorSubject(makeItems(10));
            const container = builder
                .withItems(items$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox');
            fireEvent.input(input, { target: { value: 'Item 1' } });

            // Synchronous — no timer advance needed.
            const options = screen.getAllByRole('option');
            expect(options.map(o => o.textContent)).toEqual(['Item 1']);
        });

        test('large lists (>=100 items) debounce: 19ms nothing, 150ms filtered', () => {
            const items$ = new BehaviorSubject(makeItems(150));
            const container = builder
                .withItems(items$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox');
            fireEvent.click(input);
            // First rendered row reflects the unfiltered list (virtualized — only a window
            // of rows is in the DOM, so content is checked rather than a raw count).
            expect(screen.getAllByRole('option')[0].textContent).toBe('Item 0');

            fireEvent.input(input, { target: { value: 'Item 5' } });

            jest.advanceTimersByTime(19);
            // Not yet filtered — still showing the unfiltered list.
            expect(screen.getAllByRole('option')[0].textContent).toBe('Item 0');

            jest.advanceTimersByTime(131); // total 150ms
            const filtered = screen.getAllByRole('option');
            filtered.forEach(o => expect(o.textContent).toContain('Item 5'));
        });

        test('Enter flushes the pending debounce synchronously before selecting', () => {
            const items$ = new BehaviorSubject(makeItems(150));
            const value$ = new BehaviorSubject<string | null>(null);
            const container = builder
                .withItems(items$)
                .withValue(value$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox');
            fireEvent.input(input, { target: { value: 'Item 5' } });
            // No timer advance — debounce is still pending.
            fireEvent.keyDown(input, { key: 'Enter' });

            // The flushed filter narrowed to items containing "Item 5"; Enter selects the
            // currently focused (first) one of that filtered set.
            expect(value$.getValue()).toContain('Item 5');
        });

        test('End flushes the pending debounce so focus lands on the last row of the FILTERED (not stale) list', () => {
            const items$ = new BehaviorSubject(makeItems(150));
            const container = builder
                .withItems(items$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox');
            // Matches: "Item 5", "Item 50".."Item 59" — 11 items, in that order.
            fireEvent.input(input, { target: { value: 'Item 5' } });
            // No timer advance — debounce is still pending (150 items >= threshold).
            fireEvent.keyDown(input, { key: 'End' });

            const activeId = input.getAttribute('aria-activedescendant');
            expect(activeId).toContain('-option-Item 59');
        });

        test('clearing the term to "" bypasses the debounce', () => {
            const items$ = new BehaviorSubject(makeItems(150));
            const container = builder
                .withItems(items$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox');
            fireEvent.input(input, { target: { value: 'Item 5' } });
            // Clear before the 150ms debounce elapses.
            fireEvent.input(input, { target: { value: '' } });

            // Bypasses debounce -> full (unfiltered) list restored immediately, no timer
            // advance needed. Checked via content since the list is virtualized.
            const options = screen.getAllByRole('option');
            expect(options[0].textContent).toBe('Item 0');
        });

        test('withFilterDebounce(0) disables debouncing even for large lists', () => {
            const items$ = new BehaviorSubject(makeItems(150));
            const container = builder
                .withItems(items$)
                .withFilterDebounce(0)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox');
            fireEvent.input(input, { target: { value: 'Item 5' } });

            // Synchronous — no timer advance needed.
            const options = screen.getAllByRole('option');
            options.forEach(o => expect(o.textContent).toContain('Item 5'));
        });

        test('withFilterDebounce(300) overrides the 150ms default for large lists', () => {
            const items$ = new BehaviorSubject(makeItems(150));
            const container = builder
                .withItems(items$)
                .withFilterDebounce(300)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox');
            fireEvent.input(input, { target: { value: 'Item 5' } });

            // At the DEFAULT debounce (150ms) the list must still be unfiltered,
            // proving the override actually replaced the default.
            jest.advanceTimersByTime(150);
            expect(
                screen.getAllByRole('option').some(o => o.textContent === 'Item 0')
            ).toBe(true);

            // Past the override window, the filter has applied.
            jest.advanceTimersByTime(160);
            screen.getAllByRole('option').forEach(o =>
                expect(o.textContent).toContain('Item 5')
            );
        });
    });

    // ── Keyboard: wrap-around ──────────────────────────────────────────────────

    describe('ArrowUp/ArrowDown wrap-around', () => {
        const activeId = (input: HTMLElement) =>
            input.getAttribute('aria-activedescendant');

        test('ArrowDown from the last item wraps to the first', () => {
            const items$ = new BehaviorSubject(items);
            const container = builder.withItems(items$).build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox');
            fireEvent.click(input); // opens, focus index 0

            fireEvent.keyDown(input, { key: 'End' }); // last item (index 2)
            const lastId = activeId(input);
            expect(document.getElementById(lastId!)?.textContent).toContain('Cherry');

            fireEvent.keyDown(input, { key: 'ArrowDown' }); // wraps to index 0
            const wrappedId = activeId(input);
            expect(wrappedId).not.toBe(lastId);
            expect(document.getElementById(wrappedId!)?.textContent).toContain('Apple');
        });

        test('ArrowUp from the first item wraps to the last', () => {
            const items$ = new BehaviorSubject(items);
            const container = builder.withItems(items$).build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox');
            fireEvent.click(input); // opens, focus index 0
            expect(document.getElementById(activeId(input)!)?.textContent).toContain('Apple');

            fireEvent.keyDown(input, { key: 'ArrowUp' }); // wraps to last
            expect(document.getElementById(activeId(input)!)?.textContent).toContain('Cherry');
        });
    });

    // ── No nested scrollers ────────────────────────────────────────────────────

    test('popover wrapper is overflow-hidden so only the <ul> scrolls (no nested scrollers)', () => {
        const items$ = new BehaviorSubject(items);
        const container = builder.withItems(items$).withMaxHeight(of(120)).build();
        triggerContainerVisibleAndWait(container);

        container.open();

        const listbox = screen.getByRole('listbox', { hidden: true });
        const popoverEl = listbox.closest('[popover]') as HTMLElement;
        expect(popoverEl).toHaveClass('overflow-hidden');
        expect(listbox).toHaveClass('overflow-y-auto');

        // Exactly one scrollable element in the popover subtree: the <ul>.
        const scrollers = Array.from(popoverEl.querySelectorAll('*')).filter(el =>
            el.classList.contains('overflow-y-auto') || el.classList.contains('overflow-auto')
        );
        expect(scrollers).toEqual([listbox]);
    });

    // ── withValue: source re-emitting null while the user is typing ────────────

    describe('withValue: null re-emission during an active search', () => {
        test('a source re-emitting null while the user has typed a search term does NOT wipe the input', () => {
            const items$ = new BehaviorSubject(items);
            const value$ = new BehaviorSubject<string | null>(null);
            const container = builder
                .withItems(items$)
                .withValue(value$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox') as HTMLInputElement;

            // User types a search term; nothing is selected yet.
            fireEvent.input(input, { target: { value: 'Ban' } });
            expect(input.value).toBe('Ban');

            // An unrelated re-render pushes the SAME (null) value back through the source.
            value$.next(null);

            expect(input.value).toBe('Ban');
        });

        // Architect ruling: withValue emissions are authoritative over SELECTION state
        // (currentValue$, ListBox highlight, activedescendant bookkeeping) and are never
        // suppressed, for both null and non-null values — they are only gated off the
        // DISPLAYED INPUT TEXT while the user is mid-search (isFiltering$ true).

        test('null mid-search clears the ListBox selection highlight but leaves the typed text (1/3)', () => {
            const items$ = new BehaviorSubject(items); // Apple/Banana/Cherry
            const value$ = new BehaviorSubject<string | null>('Apple');
            const container = builder
                .withItems(items$)
                .withValue(value$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox') as HTMLInputElement;
            expect(input.value).toBe('Apple');

            // Types a search term that still matches the selected item ("Apple") so its
            // highlight stays observable; oninput opens the dropdown automatically.
            fireEvent.input(input, { target: { value: 'Ap' } });
            expect(input.value).toBe('Ap');
            expect(screen.getByText('Apple').closest('li')).toHaveClass('font-bold');

            // An unrelated re-render pushes null through the source.
            value$.next(null);

            // Selection state is authoritative and never suppressed -> highlight clears...
            expect(screen.getByText('Apple').closest('li')).not.toHaveClass('font-bold');
            // ...but the DISPLAYED TEXT is gated on isFiltering$ (still true) -> untouched.
            expect(input.value).toBe('Ap');
        });

        test('a different non-null value mid-search moves the ListBox highlight but leaves the typed text (2/3)', () => {
            const items$ = new BehaviorSubject(items); // Apple/Banana/Cherry
            const value$ = new BehaviorSubject<string | null>('Apple');
            const container = builder
                .withItems(items$)
                .withValue(value$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox') as HTMLInputElement;

            // "e" matches Apple and Cherry (not Banana) — keeps both selectable/observable.
            fireEvent.input(input, { target: { value: 'e' } });
            expect(input.value).toBe('e');
            expect(screen.getByText('Apple').closest('li')).toHaveClass('font-bold');

            // A genuinely different selection is made elsewhere while the user is typing.
            value$.next('Cherry');

            // Selection state moves...
            expect(screen.getByText('Apple').closest('li')).not.toHaveClass('font-bold');
            expect(screen.getByText('Cherry').closest('li')).toHaveClass('font-bold');
            // ...but the typed search text is left untouched (still mid-search).
            expect(input.value).toBe('e');
        });

        test('the same value re-applied after the popup closes rewrites the displayed text (3/3)', () => {
            const items$ = new BehaviorSubject(items); // Apple/Banana/Cherry
            const value$ = new BehaviorSubject<string | null>('Apple');
            const container = builder
                .withItems(items$)
                .withValue(value$)
                .build();
            triggerContainerVisibleAndWait(container);

            const input = screen.getByRole('combobox') as HTMLInputElement;

            fireEvent.input(input, { target: { value: 'Something else' } });
            expect(input.value).toBe('Something else');

            // Close the popup — isFiltering$ resets to false, re-converging the two halves.
            fireEvent.keyDown(input, { key: 'Escape' });

            // The same value re-emitted now rewrites the display: no longer mid-search.
            value$.next('Apple');
            expect(input.value).toBe('Apple');
        });
    });

    // ── Destroy path: full cleanup ─────────────────────────────────────────────

    describe('destroy path', () => {
        test('removing the element completes all internal Subjects and removes the popover from body', () => {
            const items$ = new BehaviorSubject(items);
            const container = builder
                .withItems(items$)
                .build();
            document.body.appendChild(container);
            triggerContainerVisibleAndWait(container);

            // The popover is built lazily — nothing with a [popover] attribute exists in
            // the document until the dropdown is actually opened for the first time.
            expect(document.querySelectorAll('[popover]')).toHaveLength(0);

            // Open once so the popover is actually built (it's lazy — see 'open()/close()
            // toggle the popover').
            container.open();
            const listbox = screen.getByRole('listbox', { hidden: true });
            const popoverEl = listbox.closest('[popover]') as HTMLElement;
            expect(document.body.contains(popoverEl)).toBe(true);

            const completeSpy = jest.spyOn(Subject.prototype, 'complete');

            document.body.removeChild(container);
            // disconnectedCallback on the internal lifecycle-boundary custom element fires
            // synchronously in jsdom — no timer/microtask flush needed.

            // At least the 6 internally-created Subjects (searchTerm$, isFiltering$,
            // isExpanded$, focusedIndex$, currentValue$, listBoxValue$, flushNow$) are
            // completed on destroy.
            expect(completeSpy.mock.calls.length).toBeGreaterThanOrEqual(6);
            // The popover wrapper is removed from the DOM once its anchor is destroyed
            // (PopoverBuilder ties cleanup to the anchor's lifetime).
            expect(document.body.contains(popoverEl)).toBe(false);

            completeSpy.mockRestore();
        });

        test('leaves no observers on the caller-owned items$ / value$ subjects', () => {
            const items$ = new BehaviorSubject(items);
            const value$ = new BehaviorSubject<string | null>('Banana');
            const container = builder
                .withItems(items$)
                .withValue(value$)
                .build();
            triggerContainerVisibleAndWait(container);
            container.open();

            expect(items$.observed).toBe(true);
            expect(value$.observed).toBe(true);

            document.body.removeChild(container);

            expect(items$.observed).toBe(false);
            expect(value$.observed).toBe(false);
        });
    });
});
