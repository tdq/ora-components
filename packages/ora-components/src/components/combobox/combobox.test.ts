import { BehaviorSubject } from 'rxjs';
import { ComboBoxBuilder, ComboBoxStyle } from './combobox-builder';
import { fireEvent, screen, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';

// jsdom does not implement scrollIntoView — stub it globally
HTMLElement.prototype.scrollIntoView = jest.fn();

describe('ComboBoxBuilder', () => {
    let builder: ComboBoxBuilder<string>;
    const items = ['Apple', 'Banana', 'Cherry'];

    beforeEach(() => {
        builder = new ComboBoxBuilder<string>();
        document.body.innerHTML = '';
    });

    test('should render ComboBox with initial items and value', () => {
        const items$ = new BehaviorSubject(items);
        const value$ = new BehaviorSubject<string | null>('Banana');
        const container = builder
            .withItems(items$)
            .withValue(value$)
            .build();
        document.body.appendChild(container);

        const input = screen.getByRole('combobox') as HTMLInputElement;
        expect(input.value).toBe('Banana');
        expect(input).toHaveAttribute('aria-expanded', 'false');
    });

    test('should verify filtering: typing in the input should update the list of displayed options', async () => {
        const items$ = new BehaviorSubject(items);
        const container = builder
            .withItems(items$)
            .build();
        document.body.appendChild(container);

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
        document.body.appendChild(container);

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
        document.body.appendChild(container);

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
        document.body.appendChild(container);

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
        document.body.appendChild(container);

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
        document.body.appendChild(container);

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
        document.body.appendChild(container);

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
        document.body.appendChild(container);

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
        document.body.appendChild(container);

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
        document.body.appendChild(container);

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
        document.body.appendChild(container);

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
        document.body.appendChild(container);

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
        document.body.appendChild(container);

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
        document.body.appendChild(container);

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

    test('max-h-px-256 constraint is applied on the ListBox root element inside the popover', () => {
        const items$ = new BehaviorSubject(items);
        const container = builder
            .withItems(items$)
            .build();
        document.body.appendChild(container);

        const input = screen.getByRole('combobox');
        fireEvent.click(input);

        // The ListBox root element is the grandparent of the <ul role="listbox">.
        // Structure: listBoxRoot(max-h-px-256) > listContainer(panel) > ul[role=listbox]
        const listbox = screen.getByRole('listbox');
        const listBoxRoot = listbox.closest('div')?.parentElement as HTMLElement;
        expect(listBoxRoot).toHaveClass('max-h-px-256');
    });

    // ── Spec 3: Initial value selection — dropdown stays open after value sync ─

    test('opening dropdown with initial value shows that item selected and highlighted', async () => {
        const items$ = new BehaviorSubject(items);
        const value$ = new BehaviorSubject<string | null>('Cherry');
        const container = builder
            .withItems(items$)
            .withValue(value$)
            .build();
        document.body.appendChild(container);

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
        document.body.appendChild(container);

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
});
