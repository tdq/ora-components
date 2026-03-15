import { of } from 'rxjs';
import { GridBuilder } from './grid-builder';
import { SortDirection } from './types';

describe('GridBuilder', () => {
    let container: HTMLElement;

    interface TestItem {
        id: number;
        name: string;
    }

    const items: TestItem[] = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
    ];

    it('should set initial sort with withSort', () => {
        const grid = new GridBuilder<TestItem>()
            .withItems(of([
                { id: 3, name: 'C' },
                { id: 1, name: 'A' },
                { id: 2, name: 'B' },
            ]))
            .withHeight(of(400))
            .withSort('name', SortDirection.DESC);

        grid.withColumns().addTextColumn('name').withHeader('Name').asSortable();

        container = grid.build();
        document.body.appendChild(container);

        // Should be sorted DESC: C, B, A
        // We look for the first row's cell content
        const rows = container.querySelectorAll('.absolute');
        const firstRow = rows[0];
        const cells = firstRow.querySelectorAll('div');
        // The first cell in our case is 'name' column since we only added one
        expect(cells[0].textContent).toBe('C');

        document.body.removeChild(container);
    });

    it('should build a grid with columns', () => {
        const grid = new GridBuilder<TestItem>()
            .withItems(of(items))
            .withHeight(of(400));

        const cols = grid.withColumns();
        cols.addTextColumn('id').withHeader('ID');
        cols.addTextColumn('name').withHeader('Name');

        container = grid.build();
        document.body.appendChild(container);

        const header = container.querySelector('.sticky');
        expect(header).toBeTruthy();
        expect(header?.textContent).toContain('ID');
        expect(header?.textContent).toContain('Name');

        // Wait for next tick to let rxjs combineLatest emit
        // Actually, since we use 'of()', it should be synchronous if we are careful

        // Rows are rendered in virtualized mode
        const rows = container.querySelectorAll('.absolute');
        expect(rows.length).toBeGreaterThan(0);

        document.body.removeChild(container);
    });

    it('should handle selection in multi-select mode', () => {
        const grid = new GridBuilder<TestItem>()
            .withItems(of(items))
            .withHeight(of(400))
            .asMultiSelect();

        grid.withColumns().addTextColumn('name');

        container = grid.build();
        document.body.appendChild(container);

        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        // 1 in header + 3 in rows
        expect(checkboxes.length).toBe(4);

        const firstRowCheckbox = checkboxes[1] as HTMLInputElement;
        firstRowCheckbox.click();

        // Check if row has selection background
        const firstRow = container.querySelector('.absolute') as HTMLElement;
        expect(firstRow.classList.contains('bg-primary/10')).toBe(true);

        document.body.removeChild(container);
    });

    it('should handle "select all" correctly', () => {
        const grid = new GridBuilder<TestItem>()
            .withItems(of(items))
            .withHeight(of(400))
            .asMultiSelect();

        grid.withColumns().addTextColumn('name');

        container = grid.build();
        document.body.appendChild(container);

        const headerCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
        headerCheckbox.click();

        const rowCheckboxes = Array.from(container.querySelectorAll('input[type="checkbox"]')).slice(1) as HTMLInputElement[];
        expect(rowCheckboxes.every(cb => cb.checked)).toBe(true);

        const rows = container.querySelectorAll('.absolute');
        rows.forEach(row => {
            expect(row.classList.contains('bg-primary/10')).toBe(true);
        });

        document.body.removeChild(container);
    });

    it('should handle sorting correctly', () => {
        const grid = new GridBuilder<TestItem>()
            .withItems(of([
                { id: 3, name: 'C' },
                { id: 1, name: 'A' },
                { id: 2, name: 'B' },
            ]))
            .withHeight(of(400));

        grid.withColumns().addTextColumn('name').withHeader('Name').asSortable();

        container = grid.build();
        document.body.appendChild(container);

        const headerCell = container.querySelector('.cursor-pointer') as HTMLElement;

        // Initial state (unsorted or original order)
        let firstRowName = container.querySelector('.absolute div')?.textContent;
        // The original order was C, A, B.

        // Click to sort ASC (A, B, C)
        headerCell.click();
        firstRowName = container.querySelector('.absolute div')?.textContent;
        expect(firstRowName).toBe('A');

        // Click to sort DESC (C, B, A)
        const headerCell2 = container.querySelector('.cursor-pointer') as HTMLElement;
        headerCell2.click();
        firstRowName = container.querySelector('.absolute div')?.textContent;
        expect(firstRowName).toBe('C');

        document.body.removeChild(container);
    });

    it('should support column resizing', () => {
        const grid = new GridBuilder<TestItem>()
            .withItems(of(items))
            .withHeight(of(400));

        grid.withColumns().addTextColumn('name').withHeader('Name').withWidth('100px').asResizable();

        container = grid.build();
        document.body.appendChild(container);

        const headerCell = container.querySelector('.relative.px-4') as HTMLElement;
        expect(headerCell.style.width).toBe('100px');

        // Mock offsetWidth for JSDOM
        Object.defineProperty(headerCell, 'offsetWidth', { value: 100, configurable: true });

        const resizeHandle = headerCell.querySelector('.resize-handle') as HTMLElement;
        expect(resizeHandle).toBeTruthy();

        // Simulate mouse down on resize handle
        const mouseDown = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            clientX: 100,
            pageX: 100
        } as any);
        resizeHandle.dispatchEvent(mouseDown);

        // Simulate mouse move
        const mouseMove = new MouseEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            clientX: 150,
            pageX: 150
        } as any);
        document.dispatchEvent(mouseMove);

        // Width should be original (100) + movement (150-100) = 150
        expect(headerCell.style.width).toBe('150px');

        // Check if row cell width also updated
        const rowCell = container.querySelector('.absolute div') as HTMLElement;
        expect(rowCell.style.width).toBe('150px');

        // Simulate mouse up
        const mouseUp = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true
        } as any);
        document.dispatchEvent(mouseUp);

        document.body.removeChild(container);
    });
});
