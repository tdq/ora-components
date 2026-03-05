import { of } from 'rxjs';
import { GridBuilder } from './grid-builder';

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
        
        const viewport = container.querySelector('.overflow-y-auto');
        const content = viewport?.querySelector('.relative');
        
        // Rows are rendered in virtualized mode
        const rows = content?.querySelectorAll('.absolute');
        expect(rows?.length).toBeGreaterThan(0);
        
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
        expect(firstRow.classList.contains('bg-primary/5')).toBe(true);
        
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
            expect(row.classList.contains('bg-primary/5')).toBe(true);
        });
        
        document.body.removeChild(container);
    });
});
