import { BehaviorSubject } from 'rxjs';
import { ComboBoxBuilder, ComboBoxStyle } from './combobox-builder';
import { fireEvent, screen, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';

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

        const listbox = screen.getByRole('listbox', { hidden: true });
        expect(listbox).toHaveClass('hidden');
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
        expect(listbox).not.toHaveClass('hidden');

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
        expect(screen.getByRole('listbox', { hidden: true })).toHaveClass('hidden');
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
        expect(screen.getByRole('listbox')).not.toHaveClass('hidden');
        
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
        expect(screen.getByRole('listbox', { hidden: true })).toHaveClass('hidden');
    });

    test('should verify dropdown behavior: should open on focus/input, close on Escape or click outside', () => {
        const items$ = new BehaviorSubject(items);
        const container = builder
            .withItems(items$)
            .build();
        document.body.appendChild(container);

        const input = screen.getByRole('combobox');
        const listbox = screen.getByRole('listbox', { hidden: true });

        // Click to open
        fireEvent.click(input);
        expect(listbox).not.toHaveClass('hidden');

        // Escape to close
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(listbox).toHaveClass('hidden');

        // Input to open
        fireEvent.input(input, { target: { value: 'a' } });
        expect(listbox).not.toHaveClass('hidden');

        // Click outside to close
        fireEvent.click(document.body);
        expect(listbox).toHaveClass('hidden');
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

        const listbox = screen.getByRole('listbox', { hidden: true });
        expect(listbox).toBeTruthy();

        fireEvent.click(input);
        expect(input).toHaveAttribute('aria-expanded', 'true');
        
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

        const inputContainer = container.querySelector('.bg-white\\/10');
        expect(inputContainer).toBeTruthy();
        expect(inputContainer).toHaveClass('backdrop-blur-md');
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
            expect(options[2]).toHaveClass('bg-on-surface/12');
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

        const listbox = screen.getByRole('listbox');
        expect(listbox).toHaveClass('bg-surface');
        expect(listbox).not.toHaveClass('bg-surface-container-low');
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

    test('should use itemIdProvider for complex objects', () => {
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

        const options = screen.getAllByRole('option');
        expect(options[0].id).toContain('-option-1');
        expect(options[1].id).toContain('-option-2');

        fireEvent.click(options[1]);
        expect(value$.getValue()).toEqual(complexItems[1]);
        expect(input).toHaveValue('Option 2');
    });

    test('should have aria-controls matching listbox id', () => {
        const container = builder.build();
        document.body.appendChild(container);

        const input = screen.getByRole('combobox');
        const listbox = screen.getByRole('listbox', { hidden: true });

        expect(input).toHaveAttribute('aria-controls', listbox.id);
        expect(listbox.id).toMatch(/^cb-.*-listbox$/);
    });

    test('should update focusedIndex on mouse hover', async () => {
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

        // Hover second item
        const options = screen.getAllByRole('option');
        fireEvent.mouseEnter(options[1]);
        
        // Check if second item is highlighted
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
});
