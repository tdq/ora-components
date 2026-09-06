import { GridViewport } from './grid-viewport';
import { GridColumn, ColumnType } from './types';
import { GRID_ROW_HEIGHT } from './grid-styles';

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
        // rowsContainer itself has class 'absolute', so query its children directly
        // to avoid counting the container as a row.
        const rowsContainer = content.querySelector('.absolute') as HTMLElement;
        const rows = rowsContainer.querySelectorAll('.absolute');

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
        // rowsContainer itself has class 'absolute', so query its children directly
        // to avoid counting the container as a row.
        let rowsContainer = content.querySelector('.absolute') as HTMLElement;
        let rows = rowsContainer.querySelectorAll('.absolute');

        // floor(0/52) + 5 = 5. 0-5 is 6 rows.
        expect(rows.length).toBe(6);

        // Update clientHeight to 500
        Object.defineProperty(viewport.getElement(), 'clientHeight', { value: 500, configurable: true, writable: true });

        // Manually trigger the ResizeObserver callback
        resizeCallback([], {} as any);

        // floor(500/52) + 5 = 9 + 5 = 14. 0 to 14 is 15 rows.
        rows = rowsContainer.querySelectorAll('.absolute');
        expect(rows.length).toBe(15);
    });


it('should update rows on scroll', () => {
    viewport.update(rowData, new Set());

    // Scroll to item 20
    const scrollTop = 20 * 52;
    Object.defineProperty(viewport.getElement(), 'scrollTop', { value: scrollTop, configurable: true });

    viewport.getElement().dispatchEvent(new Event('scroll'));

    const content = viewport.getElement().querySelector('.relative') as HTMLElement;
    // rowsContainer itself has class 'absolute', so query its children directly
    // to avoid counting the container as a row.
    const rowsContainer = content.querySelector('.absolute') as HTMLElement;
    const rows = Array.from(rowsContainer.querySelectorAll('.absolute')) as HTMLElement[];

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

describe('ARIA row semantics', () => {
    it('gives every rendered row role="row" and a 1-based aria-rowindex (header is row 1)', () => {
        viewport.update(rowData, new Set());

        const content = viewport.getElement().querySelector('.relative') as HTMLElement;
        const rowsContainer = content.querySelector('.absolute') as HTMLElement;
        const rows = Array.from(rowsContainer.querySelectorAll('[role="row"]')) as HTMLElement[];

        // startIndex 0, endIndex 8 (see 'should render visible rows' above) -> rows 0..8,
        // aria-rowindex = flattened index + 2 (row 1 is the header).
        expect(rows.length).toBe(9);
        expect(rows.map(r => r.getAttribute('aria-rowindex')))
            .toEqual(Array.from({ length: 9 }, (_, i) => String(i + 2)));
    });

    it('keeps aria-rowindex correct on rendered rows after scrolling', () => {
        viewport.update(rowData, new Set());

        const scrollTop = 20 * 52;
        Object.defineProperty(viewport.getElement(), 'scrollTop', { value: scrollTop, configurable: true });
        viewport.getElement().dispatchEvent(new Event('scroll'));

        const content = viewport.getElement().querySelector('.relative') as HTMLElement;
        const rowsContainer = content.querySelector('.absolute') as HTMLElement;
        const rows = Array.from(rowsContainer.querySelectorAll('[role="row"]')) as HTMLElement[];

        // Window is 15..28 (see 'should update rows on scroll' above).
        const rowIndices = rows.map(r => Number(r.getAttribute('aria-rowindex'))).sort((a, b) => a - b);
        expect(rowIndices).toEqual(Array.from({ length: 14 }, (_, i) => 15 + i + 2));
    });

    it('keeps aria-rowindex in sync when a rendered row DOM node is RECYCLED to a different item', () => {
        viewport.update(rowData, new Set());

        const content = viewport.getElement().querySelector('.relative') as HTMLElement;
        const rowsContainer = content.querySelector('.absolute') as HTMLElement;
        const before = Array.from(rowsContainer.querySelectorAll('[role="row"]')) as HTMLElement[];
        const firstSlotEl = before[0];
        expect(firstSlotEl.getAttribute('aria-rowindex')).toBe('2');
        expect(firstSlotEl.textContent).toContain('Item 0');

        // Rows are pooled by slot index (GridViewport.renderedRows), so shifting the data
        // hands slot 0's EXISTING element to a different item via GridRow.update(). That
        // update path is the only place aria-rowindex is refreshed after construction
        // (grid-row.ts) — if it were dropped, the recycled node would keep a stale index and
        // every earlier "after scrolling" assertion would still pass, because those windows
        // never reuse a node for a new index.
        viewport.update(rowData.slice(5), new Set());

        const after = Array.from(rowsContainer.querySelectorAll('[role="row"]')) as HTMLElement[];
        // Same DOM node, recycled — not re-created.
        expect(after[0]).toBe(firstSlotEl);
        expect(firstSlotEl.textContent).toContain('Item 5');
        expect(firstSlotEl.getAttribute('aria-rowindex')).toBe('2');

        // And the whole recycled window stays a contiguous 1-based run.
        expect(after.map(r => Number(r.getAttribute('aria-rowindex'))))
            .toEqual(after.map((_, i) => i + 2));
    });
});

describe('custom rowHeight (GridBuilder.withRowHeight plumbing)', () => {
    it('defaults to GRID_ROW_HEIGHT when no rowHeight is passed', () => {
        const vp = new GridViewport<TestItem>(columns, [], false, false, () => {}, () => {});
        Object.defineProperty(vp.getElement(), 'clientHeight', { value: 200, configurable: true });
        vp.update(rowData, new Set());

        const rowsContainer = vp.getElement().querySelector('.relative .absolute') as HTMLElement;
        const firstRow = rowsContainer.querySelector('.absolute') as HTMLElement;
        expect(firstRow.style.height).toBe(`${GRID_ROW_HEIGHT}px`);
    });

    it('uses the custom rowHeight for row height and translateY positioning', () => {
        const customHeight = 36;
        const vp = new GridViewport<TestItem>(columns, [], false, false, () => {}, () => {}, false, () => {}, customHeight);
        Object.defineProperty(vp.getElement(), 'clientHeight', { value: 200, configurable: true });
        vp.update(rowData, new Set());

        const rowsContainer = vp.getElement().querySelector('.relative .absolute') as HTMLElement;
        const rows = Array.from(rowsContainer.querySelectorAll('.absolute')) as HTMLElement[];
        expect(rows[0].style.height).toBe(`${customHeight}px`);

        const secondRow = rows.find(r => r.style.transform === `translateY(${customHeight}px)`);
        expect(secondRow).toBeTruthy();
    });
});
});

