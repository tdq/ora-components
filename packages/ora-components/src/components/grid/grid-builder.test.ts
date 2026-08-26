import { of, Subject, BehaviorSubject } from 'rxjs';
import { GridBuilder } from './grid-builder';
import { GridRow } from './grid-row';
import { SortDirection } from './types';
import { MoneyColumnBuilder } from './columns/money-column';
import { NumberColumnBuilder } from './columns/number-column';
import { PercentageColumnBuilder } from './columns/percentage-column';
import { GatedObserver } from '../../utils/optimized-pipeline';
import { GRID_ROW_HEIGHT, GRID_HEADER_HEIGHT, GRID_TOOLBAR_HEIGHT_ALLOWANCE } from './grid-styles';
import { EnumColumnBuilder } from './columns/enum-column';
import { AggregationType } from './types';

describe('GridBuilder', () => {
    let container: HTMLElement;
    const originalIntersectionObserver = window.IntersectionObserver;

    beforeEach(() => {
        jest.useFakeTimers();

        class MockIntersectionObserver implements IntersectionObserver {
            readonly root: Element | Document | null = null;
            readonly rootMargin: string = '';
            readonly thresholds: ReadonlyArray<number> = [];

            constructor(private callback: IntersectionObserverCallback) {}

            observe(element: Element) {
                const entry: IntersectionObserverEntry = {
                    target: element,
                    isIntersecting: true,
                    intersectionRatio: 1,
                    boundingClientRect: element.getBoundingClientRect(),
                    intersectionRect: element.getBoundingClientRect(),
                    rootBounds: null,
                    time: Date.now(),
                } as IntersectionObserverEntry;

                this.callback([entry], this);
                jest.advanceTimersByTime(150);
            }

            unobserve() {}
            disconnect() {}
            takeRecords() { return []; }
        }

        window.IntersectionObserver = MockIntersectionObserver as any;
    });

    afterEach(() => {
        jest.useRealTimers();
        window.IntersectionObserver = originalIntersectionObserver;
    });

    interface TestItem {
        id: number;
        name: string;
    }

    interface AlignmentItem {
        price: { amount: number; currencyId: string };
        quantity: number;
        rate: number;
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
        const rows = container.querySelectorAll('.absolute.w-full');
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
        const rows = container.querySelectorAll('.absolute.w-full');
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
        // Use .items-stretch to distinguish grid rows from checkbox icon containers
        // (both have .absolute.w-full, but only grid rows have .items-stretch)
        const firstRow = container.querySelector('.absolute.w-full.items-stretch') as HTMLElement;
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

        // Use .items-stretch to distinguish grid rows from checkbox icon containers
        const rows = container.querySelectorAll('.absolute.w-full.items-stretch');
        rows.forEach(row => {
            expect(row.classList.contains('bg-primary/10')).toBe(true);
        });

        document.body.removeChild(container);
    });

    it('header checkbox is indeterminate when some (but not all) items are selected', () => {
        const grid = new GridBuilder<TestItem>()
            .withItems(of(items))
            .withHeight(of(400))
            .asMultiSelect();

        grid.withColumns().addTextColumn('name');

        container = grid.build();
        document.body.appendChild(container);

        // Select only the first row checkbox — this leaves 2 of 3 rows unselected
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        const firstRowCheckbox = checkboxes[1] as HTMLInputElement;
        firstRowCheckbox.click();

        // The header checkbox should now show the intermediate state via input.indeterminate=true
        // and transform overrides (dash icon shown, checkmark hidden)
        const headerCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
        const headerCheckboxContainer = headerCheckbox.parentElement as HTMLElement;
        const headerIconContainer = headerCheckboxContainer.children[2] as HTMLElement;
        const headerIndeterminateContainer = headerCheckboxContainer.children[4] as HTMLElement;
        expect(headerCheckbox.checked).toBe(true);
        expect(headerCheckbox.indeterminate).toBe(true);
        expect(headerIconContainer.style.transform).toBe('scale(0)');
        expect(headerIndeterminateContainer.style.transform).toBe('scale(1)');

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
        let firstRowName = container.querySelector('.absolute.w-full div')?.textContent;
        // The original order was C, A, B.

        // Click to sort ASC (A, B, C)
        headerCell.click();
        firstRowName = container.querySelector('.absolute.w-full div')?.textContent;
        expect(firstRowName).toBe('A');

        // Click to sort DESC (C, B, A)
        const headerCell2 = container.querySelector('.cursor-pointer') as HTMLElement;
        headerCell2.click();
        firstRowName = container.querySelector('.absolute.w-full div')?.textContent;
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
        const rowCell = container.querySelector('.absolute.w-full div') as HTMLElement;
        expect(rowCell.style.width).toBe('150px');

        // Simulate mouse up
        const mouseUp = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true
        } as any);
        document.dispatchEvent(mouseUp);

        document.body.removeChild(container);
    });

    it('should set height to 100% by default', () => {
        const grid = new GridBuilder<TestItem>()
            .withItems(of(items));

        grid.withColumns().addTextColumn('name').withHeader('Name');

        container = grid.build();
        document.body.appendChild(container);

        expect(container.style.height).toBe('100%');
        expect(container.style.minHeight).toBe('0');

        document.body.removeChild(container);
    });

    it('idempotency guard: GatedObserver items$ skips createOptimizedPipeline (no IntersectionObserver created)', () => {
        let ioConstructorCalls = 0;
        const OriginalMock = window.IntersectionObserver;
        window.IntersectionObserver = new Proxy(OriginalMock, {
            construct(target, args) {
                ioConstructorCalls++;
                return Reflect.construct(target, args);
            }
        }) as any;

        try {
            const gatedItems$ = new GatedObserver(of(items));
            const grid = new GridBuilder<TestItem>()
                .withItems(gatedItems$)
                .withHeight(of(400));

            grid.withColumns().addTextColumn('name').withHeader('Name');

            container = grid.build();
            document.body.appendChild(container);

            // GatedObserver is used directly — no IntersectionObserver instantiated
            expect(ioConstructorCalls).toBe(0);

            // Data still flows through and rows are rendered
            const rows = container.querySelectorAll('.absolute.w-full');
            expect(rows.length).toBeGreaterThan(0);

            document.body.removeChild(container);
        } finally {
            window.IntersectionObserver = OriginalMock;
        }
    });

    it('IO-less fallback: withItems renders rows synchronously when IntersectionObserver is unavailable', () => {
        const OriginalMock = window.IntersectionObserver;
        (window as any).IntersectionObserver = undefined;

        try {
            const grid = new GridBuilder<TestItem>()
                .withItems(of(items))
                .withHeight(of(400));

            grid.withColumns().addTextColumn('name').withHeader('Name');

            // build() + connect: no viewport events, no timer advancement.
            container = grid.build();
            document.body.appendChild(container);

            const rows = container.querySelectorAll('.absolute.w-full');
            expect(rows.length).toBeGreaterThan(0);

            // disconnect must stay clean without an IntersectionObserver to disconnect.
            expect(() => document.body.removeChild(container)).not.toThrow();
        } finally {
            window.IntersectionObserver = OriginalMock;
        }
    });

    describe('withRowHeight / withAutoHeight', () => {
        interface RHItem { id: number; name: string; }
        const rhItems: RHItem[] = Array.from({ length: 3 }, (_, i) => ({ id: i, name: `Item ${i}` }));

        it('withRowHeight changes row element height and translateY math', () => {
            const grid = new GridBuilder<RHItem>()
                .withItems(of(rhItems))
                .withHeight(of(400))
                .withRowHeight(40);
            grid.withColumns().addTextColumn('name');

            const rhContainer = grid.build();
            document.body.appendChild(rhContainer);

            const rows = Array.from(rhContainer.querySelectorAll('.absolute.w-full.items-stretch')) as HTMLElement[];
            expect(rows.length).toBeGreaterThan(0);
            expect(rows[0].style.height).toBe('40px');
            expect(rows[0].style.transform).toBe('translateY(0px)');

            const secondRow = rows.find(r => r.style.transform === 'translateY(40px)');
            expect(secondRow).toBeTruthy();
            expect(secondRow!.style.height).toBe('40px');

            document.body.removeChild(rhContainer);
        });

        it('defaults to GRID_ROW_HEIGHT when withRowHeight is not called', () => {
            const grid = new GridBuilder<RHItem>()
                .withItems(of(rhItems))
                .withHeight(of(400));
            grid.withColumns().addTextColumn('name');

            const rhContainer = grid.build();
            document.body.appendChild(rhContainer);

            const row = rhContainer.querySelector('.absolute.w-full.items-stretch') as HTMLElement;
            expect(row.style.height).toBe(`${GRID_ROW_HEIGHT}px`);

            document.body.removeChild(rhContainer);
        });

        it('withAutoHeight sizes the container for the current item count up to maxRows', () => {
            const grid = new GridBuilder<RHItem>()
                .withItems(of(rhItems)) // 3 items
                .withAutoHeight(5);
            grid.withColumns().addTextColumn('name');

            const rhContainer = grid.build();
            document.body.appendChild(rhContainer);

            expect(rhContainer.style.height).toBe(`${3 * GRID_ROW_HEIGHT + GRID_HEADER_HEIGHT}px`);

            document.body.removeChild(rhContainer);
        });

        it('withAutoHeight caps the container height at maxRows once itemCount exceeds it (scrolls inside)', () => {
            const many: RHItem[] = Array.from({ length: 20 }, (_, i) => ({ id: i, name: `Item ${i}` }));
            const grid = new GridBuilder<RHItem>()
                .withItems(of(many))
                .withAutoHeight(5);
            grid.withColumns().addTextColumn('name');

            const rhContainer = grid.build();
            document.body.appendChild(rhContainer);

            expect(rhContainer.style.height).toBe(`${5 * GRID_ROW_HEIGHT + GRID_HEADER_HEIGHT}px`);

            document.body.removeChild(rhContainer);
        });

        it('withAutoHeight sizes on rendered rows.length (group headers), not raw item count, when grouped', () => {
            interface GItem { id: number; name: string; category: string; }
            const gItems: GItem[] = [
                { id: 1, name: 'A', category: 'Cat1' },
                { id: 2, name: 'B', category: 'Cat1' },
                { id: 3, name: 'C', category: 'Cat2' },
            ];
            const grid = new GridBuilder<GItem>()
                .withItems(of(gItems))
                .withGrouping(of(['category']))
                .withAutoHeight(10);
            grid.withColumns().addTextColumn('name');

            const rhContainer = grid.build();
            document.body.appendChild(rhContainer);

            // Groups start collapsed -> rows = 2 GROUP_HEADER rows only, not the 3 raw items.
            expect(rhContainer.style.height).toBe(`${2 * GRID_ROW_HEIGHT + GRID_HEADER_HEIGHT}px`);

            document.body.removeChild(rhContainer);
        });

        it('withAutoHeight budgets a toolbar height allowance when withToolbar() is set', () => {
            const grid = new GridBuilder<RHItem>()
                .withItems(of(rhItems)) // 3 items
                .withAutoHeight(5);
            grid.withToolbar().addTextButton().withCaption(of('Refresh'));
            grid.withColumns().addTextColumn('name');

            const rhContainer = grid.build();
            document.body.appendChild(rhContainer);

            expect(rhContainer.style.height).toBe(
                `${3 * GRID_ROW_HEIGHT + GRID_HEADER_HEIGHT + GRID_TOOLBAR_HEIGHT_ALLOWANCE}px`
            );

            document.body.removeChild(rhContainer);
        });

        it('withAutoHeight re-sizes reactively as the row count changes', () => {
            const items$ = new BehaviorSubject<RHItem[]>(rhItems); // 3 items
            const grid = new GridBuilder<RHItem>()
                .withItems(items$)
                .withAutoHeight(5);
            grid.withColumns().addTextColumn('name');

            const rhContainer = grid.build();
            document.body.appendChild(rhContainer);

            expect(rhContainer.style.height).toBe(`${3 * GRID_ROW_HEIGHT + GRID_HEADER_HEIGHT}px`);

            // Grows with the row count...
            items$.next(Array.from({ length: 4 }, (_, i) => ({ id: i, name: `Item ${i}` })));
            expect(rhContainer.style.height).toBe(`${4 * GRID_ROW_HEIGHT + GRID_HEADER_HEIGHT}px`);

            // ...caps at maxRows...
            items$.next(Array.from({ length: 12 }, (_, i) => ({ id: i, name: `Item ${i}` })));
            expect(rhContainer.style.height).toBe(`${5 * GRID_ROW_HEIGHT + GRID_HEADER_HEIGHT}px`);

            // ...and shrinks again, down to the header alone when the grid empties.
            items$.next([]);
            expect(rhContainer.style.height).toBe(`${GRID_HEADER_HEIGHT}px`);

            document.body.removeChild(rhContainer);
        });

        it('withRowHeight combined with withAutoHeight uses the custom row height in the calculation', () => {
            const grid = new GridBuilder<RHItem>()
                .withItems(of(rhItems)) // 3 items
                .withRowHeight(30)
                .withAutoHeight(5);
            grid.withColumns().addTextColumn('name');

            const rhContainer = grid.build();
            document.body.appendChild(rhContainer);

            expect(rhContainer.style.height).toBe(`${3 * 30 + GRID_HEADER_HEIGHT}px`);

            document.body.removeChild(rhContainer);
        });
    });

    describe('column alignment', () => {
        let alignmentContainer: HTMLElement;

        afterEach(() => {
            if (alignmentContainer && alignmentContainer.parentNode) {
                alignmentContainer.parentNode.removeChild(alignmentContainer);
            }
        });

        it('should apply right alignment to money, number, and percentage columns by default', () => {
            const items: AlignmentItem[] = [
                { price: { amount: 100, currencyId: 'USD' }, quantity: 123.45, rate: 0.75 }
            ];

            const grid = new GridBuilder<AlignmentItem>()
                .withItems(of(items))
                .withHeight(of(400));

            const columns = grid.withColumns();
            columns.addMoneyColumn('price').withHeader('Price');
            columns.addNumberColumn('quantity').withHeader('Quantity');
            columns.addPercentageColumn('rate').withHeader('Rate');

            alignmentContainer = grid.build();
            document.body.appendChild(alignmentContainer);

            // Get the first row's cells (skip checkbox column if present)
            const row = alignmentContainer.querySelector('.absolute.w-full') as HTMLElement;
            expect(row).not.toBeNull();
            const cells = row.querySelectorAll('div');
            // Assuming no multi-select, cells are columns in order
            // There might be extra divs inside cells, but we can filter by direct children
            // For simplicity, we'll just check that at least three cells exist
            expect(cells.length).toBeGreaterThanOrEqual(3);

            // Find cells that are direct children of row (skip nested divs)
            const rowChildren = Array.from(row.children).filter(child => child.tagName === 'DIV');
            expect(rowChildren.length).toBe(3);

            // Each cell should have justify-end and text-right classes
            rowChildren.forEach(cell => {
                expect(cell.classList.contains('justify-end')).toBe(true);
                expect(cell.classList.contains('text-right')).toBe(true);
            });
        });

        it('should allow overriding alignment with withAlign', () => {
            const items: AlignmentItem[] = [
                { price: { amount: 100, currencyId: 'USD' }, quantity: 123.45, rate: 0.75 }
            ];

            const grid = new GridBuilder<AlignmentItem>()
                .withItems(of(items))
                .withHeight(of(400));

            const columns = grid.withColumns();
            columns.addMoneyColumn('price').withHeader('Price').withAlign('left');
            columns.addNumberColumn('quantity').withHeader('Quantity').withAlign('center');
            columns.addPercentageColumn('rate').withHeader('Rate'); // default right

            alignmentContainer = grid.build();
            document.body.appendChild(alignmentContainer);

            const row = alignmentContainer.querySelector('.absolute.w-full') as HTMLElement;
            const rowChildren = Array.from(row.children).filter(child => child.tagName === 'DIV');
            expect(rowChildren.length).toBe(3);

            // First column left-aligned
            expect(rowChildren[0].classList.contains('justify-start')).toBe(true);
            expect(rowChildren[0].classList.contains('text-left')).toBe(true);
            // Second column center-aligned
            expect(rowChildren[1].classList.contains('justify-center')).toBe(true);
            expect(rowChildren[1].classList.contains('text-center')).toBe(true);
            // Third column right-aligned (default)
            expect(rowChildren[2].classList.contains('justify-end')).toBe(true);
            expect(rowChildren[2].classList.contains('text-right')).toBe(true);
        });
    });

    describe('suppressCheckboxEmit — programmatic updateSelection must not fire onToggleSelection', () => {
        interface SimpleItem { id: number; name: string; }

        it('programmatic updateSelection(true) does not invoke onToggleSelection', () => {
            const toggleCalls: SimpleItem[] = [];
            const item: SimpleItem = { id: 1, name: 'A' };
            const row = new GridRow<SimpleItem>(
                item,
                0,
                [{ field: 'name', header: 'Name', render: (i) => i.name }],
                [],
                false,   // isSelected
                true,    // isMultiSelect
                false,   // isEditable
                (i) => toggleCalls.push(i)
            );
            document.body.appendChild(row.getElement());

            row.updateSelection(true);

            expect(toggleCalls).toHaveLength(0);

            document.body.removeChild(row.getElement());
            row.destroy();
        });

        it('programmatic updateSelection(false) does not invoke onToggleSelection', () => {
            const toggleCalls: SimpleItem[] = [];
            const item: SimpleItem = { id: 2, name: 'B' };
            const row = new GridRow<SimpleItem>(
                item,
                0,
                [{ field: 'name', header: 'Name', render: (i) => i.name }],
                [],
                true,    // isSelected
                true,    // isMultiSelect
                false,   // isEditable
                (i) => toggleCalls.push(i)
            );
            document.body.appendChild(row.getElement());

            row.updateSelection(false);

            expect(toggleCalls).toHaveLength(0);

            document.body.removeChild(row.getElement());
            row.destroy();
        });

        it('user interaction (checkbox change event) still fires onToggleSelection', () => {
            const toggleCalls: SimpleItem[] = [];
            const item: SimpleItem = { id: 3, name: 'C' };
            const row = new GridRow<SimpleItem>(
                item,
                0,
                [{ field: 'name', header: 'Name', render: (i) => i.name }],
                [],
                false,   // isSelected
                true,    // isMultiSelect
                false,   // isEditable
                (i) => toggleCalls.push(i)
            );
            document.body.appendChild(row.getElement());

            const input = row.getElement().querySelector('input[type="checkbox"]') as HTMLInputElement;
            input.checked = true;
            input.dispatchEvent(new Event('change'));

            expect(toggleCalls).toHaveLength(1);
            expect(toggleCalls[0]).toBe(item);

            document.body.removeChild(row.getElement());
            row.destroy();
        });

        it('updateSelection is a no-op when selection state is unchanged', () => {
            const toggleCalls: SimpleItem[] = [];
            const item: SimpleItem = { id: 4, name: 'D' };
            const row = new GridRow<SimpleItem>(
                item,
                0,
                [{ field: 'name', header: 'Name', render: (i) => i.name }],
                [],
                false,   // isSelected = false
                true,    // isMultiSelect
                false,   // isEditable
                (i) => toggleCalls.push(i)
            );
            document.body.appendChild(row.getElement());

            // Calling updateSelection(false) when already false — should skip next() entirely
            row.updateSelection(false);

            expect(toggleCalls).toHaveLength(0);

            document.body.removeChild(row.getElement());
            row.destroy();
        });
    });

    describe('withRowsSelected — two-way selection binding', () => {
        let selContainer: HTMLElement;

        afterEach(() => {
            if (selContainer && selContainer.parentNode) {
                selContainer.parentNode.removeChild(selContainer);
            }
        });

        function buildWithSubject(subject: Subject<TestItem[]>): HTMLElement {
            const grid = new GridBuilder<TestItem>()
                .withItems(of(items))
                .withHeight(of(400))
                .asMultiSelect()
                .withRowsSelected(subject);
            grid.withColumns().addTextColumn('name');
            const el = grid.build();
            document.body.appendChild(el);
            return el;
        }

        it('withRowsSelected returns this (chainable)', () => {
            const subject = new Subject<TestItem[]>();
            const grid = new GridBuilder<TestItem>();
            const result = grid.withRowsSelected(subject);
            expect(result).toBe(grid);
        });

        it('outbound: clicking a row checkbox emits that item into the subject', () => {
            const subject = new Subject<TestItem[]>();
            const emissions: TestItem[][] = [];
            subject.subscribe(v => emissions.push(v));
            selContainer = buildWithSubject(subject);

            // checkboxes[0] = header, checkboxes[1] = first row
            const checkboxes = selContainer.querySelectorAll('input[type="checkbox"]');
            const baselineCount = emissions.length;
            (checkboxes[1] as HTMLInputElement).click();

            expect(emissions.length).toBe(baselineCount + 1);
            expect(emissions[emissions.length - 1]).toEqual([items[0]]);
        });

        it('outbound: clicking the header "select all" checkbox emits all items', () => {
            const subject = new Subject<TestItem[]>();
            const emissions: TestItem[][] = [];
            subject.subscribe(v => emissions.push(v));
            selContainer = buildWithSubject(subject);

            const headerCheckbox = selContainer.querySelector('input[type="checkbox"]') as HTMLInputElement;
            const baselineCount = emissions.length;
            headerCheckbox.click();

            expect(emissions.length).toBe(baselineCount + 1);
            expect(emissions[emissions.length - 1]).toEqual(items);
        });

        it('outbound: deselecting via header checkbox emits []', () => {
            const subject = new Subject<TestItem[]>();
            const emissions: TestItem[][] = [];
            subject.subscribe(v => emissions.push(v));
            selContainer = buildWithSubject(subject);

            // First click: select all. The header re-renders and replaces the checkbox element.
            (selContainer.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
            // Re-query after re-render to get the current element, then deselect.
            (selContainer.querySelector('input[type="checkbox"]') as HTMLInputElement).click();

            expect(emissions[emissions.length - 1]).toEqual([]);
        });

        it('inbound: subject$.next([items[0]]) selects that row in the grid', () => {
            const subject = new Subject<TestItem[]>();
            selContainer = buildWithSubject(subject);

            subject.next([items[0]]);

            const checkboxes = selContainer.querySelectorAll('input[type="checkbox"]');
            const firstRowCheckbox = checkboxes[1] as HTMLInputElement;
            expect(firstRowCheckbox.checked).toBe(true);
            const firstRow = selContainer.querySelector('.absolute.w-full.items-stretch') as HTMLElement;
            expect(firstRow.classList.contains('bg-primary/10')).toBe(true);
        });

        it('pre-seed: BehaviorSubject initial value selects that row on initial render', () => {
            const subject = new BehaviorSubject<TestItem[]>([items[0]]);
            const grid = new GridBuilder<TestItem>()
                .withItems(of(items))
                .withHeight(of(400))
                .asMultiSelect()
                .withRowsSelected(subject);
            grid.withColumns().addTextColumn('name');
            selContainer = grid.build();
            document.body.appendChild(selContainer);

            const checkboxes = selContainer.querySelectorAll('input[type="checkbox"]');
            const firstRowCheckbox = checkboxes[1] as HTMLInputElement;
            expect(firstRowCheckbox.checked).toBe(true);
            const firstRow = selContainer.querySelector('.absolute.w-full.items-stretch') as HTMLElement;
            expect(firstRow.classList.contains('bg-primary/10')).toBe(true);
        });

        it('no feedback loop: a single checkbox click causes exactly one new outbound emission', () => {
            const subject = new Subject<TestItem[]>();
            const emissions: TestItem[][] = [];
            subject.subscribe(v => emissions.push(v));
            selContainer = buildWithSubject(subject);

            const baselineCount = emissions.length;
            const checkboxes = selContainer.querySelectorAll('input[type="checkbox"]');
            (checkboxes[1] as HTMLInputElement).click();

            expect(emissions.length).toBe(baselineCount + 1);
        });

        it('without withRowsSelected the grid builds and selection works as before', () => {
            const grid = new GridBuilder<TestItem>()
                .withItems(of(items))
                .withHeight(of(400))
                .asMultiSelect();
            grid.withColumns().addTextColumn('name');
            selContainer = grid.build();
            document.body.appendChild(selContainer);

            const checkboxes = selContainer.querySelectorAll('input[type="checkbox"]');
            expect(checkboxes.length).toBe(4);
            (checkboxes[1] as HTMLInputElement).click();

            const firstRow = selContainer.querySelector('.absolute.w-full.items-stretch') as HTMLElement;
            expect(firstRow.classList.contains('bg-primary/10')).toBe(true);
        });
    });

    describe('FullCoverage — all 11 column types', () => {
        interface FullCoverageItem {
            id: number;
            name: string;
            email: string;
            firstName: string;
            lastName: string;
            phone: string;
            department: string;
            score: number;
            rating: number;
            clicks: number;
            lastLogin: Date;
            createdAt: Date;
            lastModified: Date;
            role: 'ADMIN' | 'USER' | 'MANAGER' | 'VIEWER';
            status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
            active: boolean;
            verified: boolean;
            progress: number;
            balance: { amount: number; currencyId: string };
            priority: 'low' | 'medium' | 'high';
            buttonLabel: string;
        }

        const firstNames = ['James', 'Mary', 'Robert', 'Patricia'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown'];
        const departments = ['Engineering', 'Marketing', 'Sales', 'Support'];

        const generateItem = (i: number): FullCoverageItem => ({
            id: i,
            name: `Item ${i}`,
            email: `item${i}@test.com`,
            firstName: firstNames[i % firstNames.length],
            lastName: lastNames[i % lastNames.length],
            phone: `+1-555-${String(1000 + (i % 9000)).slice(0, 4)}`,
            department: departments[i % departments.length],
            score: Math.floor(Math.random() * 100),
            rating: Math.floor(Math.random() * 5) + 1,
            clicks: Math.floor(Math.random() * 10000),
            lastLogin: new Date(Date.now() - Math.random() * 1e10),
            createdAt: new Date(Date.now() - Math.random() * 1e11),
            lastModified: new Date(Date.now() - Math.random() * 5e9),
            role: (['ADMIN', 'USER', 'MANAGER', 'VIEWER'] as const)[i % 4],
            status: (['ACTIVE', 'INACTIVE', 'PENDING'] as const)[i % 3],
            active: i % 2 === 0,
            verified: i % 3 === 0,
            progress: Math.random(),
            balance: { amount: Math.floor(Math.random() * 10000) / 100, currencyId: ['USD', 'EUR', 'GBP'][i % 3] },
            priority: (['low', 'medium', 'high'] as const)[i % 3],
            buttonLabel: `Btn${i}`,
        });

        const items = Array.from({ length: 50 }, (_, i) => generateItem(i + 1));

        it('should build a grid with all 22 columns, correct widths, and correct resizability', () => {
            const grid = new GridBuilder<FullCoverageItem>()
                .withItems(of(items))
                .withHeight(of(700));

            const columns = grid.withColumns();
            // Number — id
            columns.addNumberColumn('id').withHeader('ID').withWidth('60px');
            // Text
            columns.addTextColumn('name').withHeader('Name').withWidth('120px').asResizable();
            columns.addTextColumn('email').withHeader('Email').withWidth('220px').asResizable();
            columns.addTextColumn('firstName').withHeader('First Name').withWidth('100px').asResizable();
            columns.addTextColumn('lastName').withHeader('Last Name').withWidth('100px').asResizable();
            columns.addTextColumn('phone').withHeader('Phone').withWidth('130px').asResizable();
            columns.addTextColumn('department').withHeader('Department').withWidth('130px').asResizable();
            // Number
            columns.addNumberColumn('score').withHeader('Score').withWidth('80px').asResizable();
            columns.addNumberColumn('rating').withHeader('Rating').withWidth('70px');
            columns.addNumberColumn('clicks').withHeader('Clicks').withWidth('80px').asResizable();
            // Date
            columns.addDateColumn('lastLogin').withHeader('Last Login').withWidth('120px').asResizable();
            columns.addDateColumn('createdAt').withHeader('Created').withWidth('120px').asResizable();
            // DateTime
            columns.addDateTimeColumn('lastModified').withHeader('Modified').withWidth('150px').asResizable();
            // Enum
            columns.addEnumColumn('role').withHeader('Role').withWidth('100px');
            columns.addEnumColumn('status').withHeader('Status').withWidth('100px');
            // Boolean
            columns.addBooleanColumn('active').withHeader('Active').withWidth('70px');
            columns.addBooleanColumn('verified').withHeader('Verified').withWidth('70px');
            // Percentage
            columns.addPercentageColumn('progress').withHeader('Progress').withWidth('90px');
            // Money
            columns.addMoneyColumn('balance').withHeader('Balance').withWidth('100px').asResizable();
            // Icon
            columns.addIconColumn('priority')
                .withHeader('Priority')
                .withWidth('70px')
                .withIconProvider((item) => {
                    if (item.priority === 'high') return 'bg-red-500';
                    if (item.priority === 'medium') return 'bg-yellow-500';
                    return 'bg-green-500';
                });
            // Button
            columns.addButtonColumn('buttonLabel')
                .withHeader('Action')
                .withWidth('90px')
                .withLabel('Go')
                .withClick((item) => { /* noop in test */ });
            // Custom
            columns.addCustomColumn()
                .withHeader('Status Badge')
                .withWidth('150px')
                .withRenderer((item) => {
                    const badge = document.createElement('span');
                    badge.textContent = item.active ? 'Active' : 'Inactive';
                    return badge;
                });

            const actions = grid.withActions();
            actions.addAction(
                `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/></svg>`,
                'Edit',
                () => {}
            );
            actions.addAction(
                `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z"/></svg>`,
                'Delete',
                () => {}
            );
            actions.addAction(
                `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z"/></svg>`,
                'View',
                () => {}
            );

            const container = grid.build();
            document.body.appendChild(container);

            expect(container).toBeInstanceOf(HTMLElement);
            expect(container.style.height).toBe('700px');

            // Verify headers exist for all columns
            const header = container.querySelector('.sticky');
            expect(header).toBeTruthy();
            expect(header!.textContent).toContain('Name');
            expect(header!.textContent).toContain('Email');
            expect(header!.textContent).toContain('First Name');
            expect(header!.textContent).toContain('Last Name');
            expect(header!.textContent).toContain('Phone');
            expect(header!.textContent).toContain('Department');
            expect(header!.textContent).toContain('ID');
            expect(header!.textContent).toContain('Score');
            expect(header!.textContent).toContain('Rating');
            expect(header!.textContent).toContain('Clicks');
            expect(header!.textContent).toContain('Last Login');
            expect(header!.textContent).toContain('Created');
            expect(header!.textContent).toContain('Modified');
            expect(header!.textContent).toContain('Role');
            expect(header!.textContent).toContain('Status');
            expect(header!.textContent).toContain('Active');
            expect(header!.textContent).toContain('Verified');
            expect(header!.textContent).toContain('Progress');
            expect(header!.textContent).toContain('Balance');
            expect(header!.textContent).toContain('Priority');
            expect(header!.textContent).toContain('Action');

            // Rows should be present
            const rows = container.querySelectorAll('.absolute.w-full');
            expect(rows.length).toBeGreaterThan(0);

            // Verify header cells are present
            const headerElement = header!.children[0] as HTMLElement;
            const headerCells = headerElement.querySelectorAll(':scope > div');
            expect(headerCells.length).toBeGreaterThanOrEqual(22);

            // Check resizability — count all resize handles (12 resizable columns)
            const resizeHandles = header!.querySelectorAll('.resize-handle');
            expect(resizeHandles.length).toBe(12);

            document.body.removeChild(container);
        });

        it('should render without glass, multi-select, editing, toolbar, or sorting', () => {
            const grid = new GridBuilder<FullCoverageItem>()
                .withItems(of(items))
                .withHeight(of(700));

            const columns = grid.withColumns();
            columns.addTextColumn('name').withHeader('Name');

            const container = grid.build();
            document.body.appendChild(container);

            // No sorting indicators
            expect(container.querySelector('.cursor-pointer')).toBeFalsy();
            // No multi-select checkboxes
            expect(container.querySelector('input[type="checkbox"]')).toBeFalsy();

            document.body.removeChild(container);
        });

        it('should render icon column with valid CSS classes', () => {
            const grid = new GridBuilder<FullCoverageItem>()
                .withItems(of(items.slice(0, 3)))
                .withHeight(of(300));

            const columns = grid.withColumns();
            columns.addIconColumn('priority')
                .withHeader('Priority')
                .withIconProvider((item) => {
                    if (item.priority === 'high') return 'bg-red-500 w-3 h-3';
                    if (item.priority === 'medium') return 'bg-yellow-500 w-3 h-3';
                    return 'bg-green-500 w-3 h-3';
                });

            const container = grid.build();
            document.body.appendChild(container);

            // Wait for rendering cycle
            const icons = container.querySelectorAll('i');
            expect(icons.length).toBeGreaterThan(0);
            expect(icons[0].className).toMatch(/^bg-\w+-\d+ w-3 h-3$/);

            document.body.removeChild(container);
        });
    });

    describe('GridColumn.destroy() lifecycle (GridBuilder wiring)', () => {
        interface DestroyTestItem { category: string; value: number; status: string; }

        function spyOnBuiltColumnDestroy(): { destroyCalls: number[]; restore: () => void } {
            const destroyCalls: number[] = [];
            let buildCount = 0;
            const originalBuild = EnumColumnBuilder.prototype.build;
            const spy = jest.spyOn(EnumColumnBuilder.prototype, 'build').mockImplementation(function (this: any) {
                const col = originalBuild.call(this);
                const generation = ++buildCount;
                const originalDestroy = col.destroy;
                col.destroy = () => {
                    destroyCalls.push(generation);
                    originalDestroy?.();
                };
                return col;
            });
            return { destroyCalls, restore: () => spy.mockRestore() };
        }

        it('destroys every column when the grid itself is removed', () => {
            const { destroyCalls, restore } = spyOnBuiltColumnDestroy();
            try {
                const grid = new GridBuilder<DestroyTestItem>()
                    .withItems(of([{ category: 'A', value: 1, status: 'ACTIVE' }]))
                    .withHeight(of(400));
                grid.withColumns().addEnumColumn('status').withOptions([{ value: 'ACTIVE', label: 'Active' }]);

                const el = grid.build();
                document.body.appendChild(el);

                expect(destroyCalls).toEqual([]);

                document.body.removeChild(el);

                expect(destroyCalls).toEqual([1]);
            } finally {
                restore();
            }
        });

        it('destroys the OUTGOING column generation when pivot mode regenerates the column set, keeping the surviving generation alive', () => {
            const { destroyCalls, restore } = spyOnBuiltColumnDestroy();
            try {
                const itemsSubject = new BehaviorSubject<DestroyTestItem[]>([
                    { category: 'A', value: 1, status: 'ACTIVE' },
                ]);
                const grid = new GridBuilder<DestroyTestItem>()
                    .withItems(itemsSubject)
                    .withPivot({
                        rows: ['category'],
                        columns: [],
                        values: [{ field: 'value', aggregation: AggregationType.SUM }],
                    });
                grid.withColumns().addEnumColumn('status').withOptions([{ value: 'ACTIVE', label: 'Active' }]);

                const el = grid.build();
                document.body.appendChild(el);

                // GridLogic's items$ starts as a BehaviorSubject([]) and the gated items
                // pipeline resolves the real array right after (synchronously here, via the
                // always-intersecting IntersectionObserver mock) — this can already regenerate
                // pivot columns once during mount, before our own trigger below. Snapshot
                // whatever that produced rather than assuming an exact count.
                const destroyedAtMount = destroyCalls.length;
                const liveGeneration = destroyedAtMount + 1; // the generation currently in use

                // A new items array reference re-triggers pivot column regeneration (same
                // pivotConfig, different state.rawItems) — the currently-live generation
                // becomes the outgoing set and must be destroyed exactly once; the new
                // generation (now live) must NOT be.
                itemsSubject.next([{ category: 'B', value: 2, status: 'ACTIVE' }]);

                expect(destroyCalls.length).toBe(destroyedAtMount + 1);
                expect(destroyCalls[destroyCalls.length - 1]).toBe(liveGeneration);

                const survivingGeneration = liveGeneration + 1;

                // Removing the grid destroys the surviving generation.
                document.body.removeChild(el);

                expect(destroyCalls.length).toBe(destroyedAtMount + 2);
                expect(destroyCalls[destroyCalls.length - 1]).toBe(survivingGeneration);
            } finally {
                restore();
            }
        });

        it('leaves ZERO observers on a reactive options source after the grid is removed', () => {
            // Reviewer NIT (3): the real end-to-end check behind destroy() — a live options
            // Subject must have no subscribers left once the grid is gone, otherwise every
            // mounted/unmounted grid permanently retains its enum columns.
            const options$ = new Subject<{ value: any; label: string }[]>();
            const grid = new GridBuilder<DestroyTestItem>()
                .withItems(of([{ category: 'A', value: 1, status: 'ACTIVE' }]))
                .withHeight(of(400));
            grid.withColumns().addEnumColumn('status').withOptions(options$);

            const el = grid.build();
            document.body.appendChild(el);
            options$.next([{ value: 'ACTIVE', label: 'Active' }]);

            // Rendering the cells established the single shared options subscription.
            expect(options$.observers.length).toBe(1);

            document.body.removeChild(el);

            expect(options$.observers.length).toBe(0);
        });

        it('leaves ZERO observers after an editable enum column\'s editor was open at teardown (ordering check)', () => {
            // Resurrection guard: GridBuilder's registerDestroy runs viewport.destroy() —
            // which commits any open editor and therefore calls col.render(), re-subscribing
            // the options source — BEFORE destroyColumns(). Only that ordering ends at zero;
            // the reverse would leave a resurrected subscription behind.
            const options$ = new Subject<{ value: any; label: string }[]>();
            const grid = new GridBuilder<DestroyTestItem>()
                .withItems(of([{ category: 'A', value: 1, status: 'ACTIVE' }]))
                .withHeight(of(400))
                .asEditable(() => {});
            grid.withColumns().addEnumColumn('status').withOptions(options$).asEditable();

            const el = grid.build();
            document.body.appendChild(el);
            options$.next([
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
            ]);

            // Open the enum editor and leave it open across teardown.
            const row = el.querySelector('.absolute.w-full.items-stretch') as HTMLElement;
            expect(row).toBeTruthy();
            const cell = row.children[0] as HTMLElement; // the single enum column's cell
            cell.click();
            expect(cell.dataset.editing).toBe('1');

            expect(options$.observers.length).toBe(1);

            document.body.removeChild(el);

            expect(options$.observers.length).toBe(0);
        });
    });
});
