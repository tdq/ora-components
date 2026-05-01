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

    let resizeCallback: (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;

    beforeAll(() => {
        global.requestAnimationFrame = (callback: FrameRequestCallback) => {
            callback(performance.now());
            return 0;
        };

        global.ResizeObserver = class ResizeObserver {
            constructor(cb: any) {
                resizeCallback = cb;
            }
            observe() {}
            unobserve() {}
            disconnect() {}
        } as any;
    });

    let viewport: GridViewport<TestItem>;

    const rowData: import('./types').GridRowData<TestItem>[] = items.map((item, index) => ({
        type: 'ITEM',
        data: item,
        index,
        level: 0
    }));

    beforeEach(() => {
        viewport = new GridViewport<TestItem>(
            columns,
            [],
            false,
            false,
            () => {},
            () => {}
        );
        // Mock clientHeight for JSDOM
        Object.defineProperty(viewport.getElement(), 'clientHeight', { value: 200, configurable: true, writable: true });
    });

    it('should render visible rows', () => {
        viewport.update(rowData, new Set());
        const content = viewport.getElement().querySelector('.relative') as HTMLElement;
        const rows = content.querySelectorAll('.absolute');

        // rowHeight is 52. 200 / 52 = ~3.8 rows visible.
        // buffer is 5. So we expect startIndex = 0, endIndex = min(99, floor(200/52) + 5) = 3 + 5 = 8.
        // 0 to 8 is 9 rows.
        expect(rows.length).toBe(9);
    });

    it('should update rows when viewport size changes', () => {
        // Initial clientHeight 0
        Object.defineProperty(viewport.getElement(), 'clientHeight', { value: 0, configurable: true, writable: true });
        viewport.update(rowData, new Set());

        let content = viewport.getElement().querySelector('.relative') as HTMLElement;
        let rows = content.querySelectorAll('.absolute');

        // floor(0/52) + 5 = 5. 0-5 is 6 rows.
        expect(rows.length).toBe(6);

        // Update clientHeight to 500
        Object.defineProperty(viewport.getElement(), 'clientHeight', { value: 500, configurable: true, writable: true });

        // Manually trigger the ResizeObserver callback
        resizeCallback([], {} as any);

        // floor(500/52) + 5 = 9 + 5 = 14. 0 to 14 is 15 rows.
        rows = content.querySelectorAll('.absolute');
        expect(rows.length).toBe(15);
    });


it('should update rows on scroll', () => {
    viewport.update(rowData, new Set());

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

    const firstRowTop = Math.min(...rows.map(r => {
        const transform = r.style.transform;
        const match = transform.match(/translateY\((\d+)px\)/);
        return match ? parseInt(match[1]) : 0;
    }));
    expect(firstRowTop).toBe(15 * 52);
});
});

