import { GridViewport } from './grid-viewport';
import { GridColumn, ColumnType } from './types';

describe('GridViewport', () => {
    interface TestItem {
        id: number;
        name: string;
    }

    const items: TestItem[] = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
    const columns: GridColumn<TestItem>[] = [
        {
            id: 'name',
            field: 'name',
            type: ColumnType.TEXT,
            header: 'Name',
            render: (item) => item.name
        }
    ];

    let viewport: GridViewport<TestItem>;

    beforeEach(() => {
        viewport = new GridViewport<TestItem>(
            columns,
            [],
            false,
            false,
            () => {}
        );
        // Mock clientHeight for JSDOM
        Object.defineProperty(viewport.getElement(), 'clientHeight', { value: 200, configurable: true });
    });

    it('should render visible rows', () => {
        viewport.update(items, new Set());
        const content = viewport.getElement().querySelector('.relative') as HTMLElement;
        const rows = content.querySelectorAll('.absolute');
        
        // rowHeight is 52. 200 / 52 = ~3.8 rows visible.
        // buffer is 5. So we expect startIndex = 0, endIndex = min(99, floor(200/52) + 5) = 3 + 5 = 8.
        // 0 to 8 is 9 rows.
        expect(rows.length).toBe(9);
    });

    it('should update rows on scroll', () => {
        viewport.update(items, new Set());
        
        // Scroll to item 20
        const scrollTop = 20 * 52;
        Object.defineProperty(viewport.getElement(), 'scrollTop', { value: scrollTop, configurable: true });
        
        viewport.getElement().dispatchEvent(new Event('scroll'));
        
        const content = viewport.getElement().querySelector('.relative') as HTMLElement;
        const rows = Array.from(content.querySelectorAll('.absolute')) as HTMLElement[];
        
        // startIndex = floor(1040 / 52) - 5 = 20 - 5 = 15
        // endIndex = floor((1040 + 200) / 52) + 5 = floor(1240 / 52) + 5 = 23 + 5 = 28
        // 15 to 28 is 14 rows.
        expect(rows.length).toBe(14);
        
        const firstRowTop = Math.min(...rows.map(r => parseInt(r.style.top)));
        expect(firstRowTop).toBe(15 * 52);
    });
});
