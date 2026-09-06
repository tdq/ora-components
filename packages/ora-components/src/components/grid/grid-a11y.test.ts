import { of } from 'rxjs';
import { axe, toHaveNoViolations } from 'jest-axe';
import { GridBuilder } from './grid-builder';
import { GRID_ROW_HEIGHT } from './grid-styles';

// Already globally registered in setupTests.ts; re-extending here is a harmless no-op and
// keeps this file's a11y assertions self-contained/readable in isolation.
expect.extend(toHaveNoViolations);

describe('Grid ARIA semantics', () => {
    interface TestItem {
        id: number;
        name: string;
        amount: number;
    }

    const items: TestItem[] = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        amount: i * 10
    }));

    // The global IntersectionObserver mock (setupTests.ts) is already installed on `window` —
    // it just needs an explicit triggerVisibility() call per element, same as
    // combobox.test.ts's triggerContainerVisibleAndWait() and enum-column.test.ts.
    function getIOMock(): { triggerVisibility(el: Element, isIntersecting: boolean): void; reset(): void } {
        return (globalThis as any).IntersectionObserverMock;
    }

    let container: HTMLElement;
    const originalRAF = global.requestAnimationFrame;

    beforeEach(() => {
        jest.useFakeTimers();
        getIOMock().reset();

        // Synchronous rAF, same as grid-viewport.test.ts's beforeAll — GridViewport's scroll
        // handler defers renderVisibleRows() through requestAnimationFrame, which jsdom's
        // default implementation schedules asynchronously and would never fire before the
        // assertions below run.
        global.requestAnimationFrame = (callback: FrameRequestCallback) => {
            callback(performance.now());
            return 0;
        };
    });

    afterEach(() => {
        jest.useRealTimers();
        global.requestAnimationFrame = originalRAF;
        getIOMock().reset();
        if (container?.isConnected) document.body.removeChild(container);
    });

    function buildGrid(): HTMLElement {
        const grid = new GridBuilder<TestItem>()
            .withItems(of(items))
            .withHeight(of(400));

        const cols = grid.withColumns();
        cols.addTextColumn('name').withHeader('Name').asSortable();
        cols.addNumberColumn('amount').withHeader('Amount');
        cols.addTextColumn('id').withHeader('Id');

        const el = grid.build();
        document.body.appendChild(el);

        // The grid's items source is gated behind createOptimizedPipeline (viewport
        // visibility, observing the grid's own host element) — without this the grid never
        // subscribes to withItems() and renders zero rows.
        getIOMock().triggerVisibility(el, true);
        jest.advanceTimersByTime(150);

        // Give the virtualizer a real clientHeight so more than the zero-height fallback
        // window of rows renders — matches the jsdom mocking pattern used throughout
        // grid-viewport.test.ts (lines 22-38: rAF/ResizeObserver/clientHeight are not
        // measured by jsdom's layout engine and must be stubbed).
        const viewportEl = el.querySelector('.overflow-auto') as HTMLElement;
        Object.defineProperty(viewportEl, 'clientHeight', { value: 400, configurable: true });

        return el;
    }

    it('has no jest-axe violations', async () => {
        container = buildGrid();
        // axe's internal scan is promise/microtask driven against REAL timers; fake timers
        // (needed above only to drive createOptimizedPipeline's appearDebounceMs) would hang
        // it indefinitely.
        jest.useRealTimers();
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });

    it('has an inner role="grid" element (not the host) with aria-rowcount counting the header row + every data row', () => {
        container = buildGrid();

        // role="grid" lives on an inner wrapper, NOT on the host `container` — see
        // grid-builder.ts's build(): a toolbar button is not a valid owned child of
        // role="grid" (axe: aria-required-children), so it must sit outside it. The host
        // element rule (withTestId/registerDestroy/rules.md "Grid -> host element") is
        // unaffected — see the withTestId assertion below.
        expect(container.getAttribute('role')).toBeNull();
        const gridEl = container.querySelector('[role="grid"]') as HTMLElement;
        expect(gridEl).not.toBeNull();
        // ARIA 1.2: aria-rowcount includes header rows. 50 items + 1 header row = 51.
        // (Documented here rather than left implicit, per the brief: the plan's "50" in the
        // measured-cost note refers to the item count, not the ARIA row total.)
        expect(gridEl.getAttribute('aria-rowcount')).toBe('51');
    });

    it('withTestId still lands on the host element, not the inner role="grid" wrapper', () => {
        const grid = new GridBuilder<TestItem>()
            .withItems(of(items))
            .withHeight(of(400))
            .withTestId('items-grid');
        grid.withColumns().addTextColumn('name').withHeader('Name');
        const el = grid.build();
        container = el;

        expect(el.getAttribute('data-testid')).toBe('items-grid');
        expect(el.getAttribute('role')).toBeNull();
        const gridEl = el.querySelector('[role="grid"]') as HTMLElement;
        expect(gridEl.hasAttribute('data-testid')).toBe(false);
    });

    it('role="grid" owns exactly two rowgroups — the header wrapper and the scrollable body', () => {
        container = buildGrid();
        const gridEl = container.querySelector('[role="grid"]') as HTMLElement;

        // ARIA grid pattern: every direct child of role="grid" must resolve to row or
        // rowgroup. Both wrappers are tabbable (headerWrapper tabIndex=-1, viewport
        // scrollable), so an implicit "generic" node here is an aria-required-children
        // violation — assert the roles structurally, not just via axe.
        const children = Array.from(gridEl.children) as HTMLElement[];
        expect(children.map(c => c.getAttribute('role'))).toEqual(['rowgroup', 'rowgroup']);

        const [headerGroup, bodyGroup] = children;
        // header rowgroup > row(aria-rowindex 1) > columnheader
        const headerRow = headerGroup.querySelector('[role="row"]') as HTMLElement;
        expect(headerRow.getAttribute('aria-rowindex')).toBe('1');
        expect(headerRow.querySelectorAll('[role="columnheader"]').length).toBe(3);

        // body rowgroup is the scroll container itself, and owns the data rows
        expect(bodyGroup.classList.contains('overflow-auto')).toBe(true);
        const bodyRows = bodyGroup.querySelectorAll('[role="row"]');
        expect(bodyRows.length).toBeGreaterThan(0);
        bodyRows.forEach(r => expect(r.querySelectorAll('[role="gridcell"]').length).toBe(3));
    });

    it('header container is role="row" with role="columnheader" cells', () => {
        container = buildGrid();

        const header = container.querySelector('[role="row"]') as HTMLElement;
        expect(header).not.toBeNull();
        expect(header.getAttribute('aria-rowindex')).toBe('1');

        const columnHeaders = header.querySelectorAll('[role="columnheader"]');
        expect(columnHeaders.length).toBe(3);
    });

    it('sortable header aria-sort cycles ascending -> descending -> none on click', () => {
        container = buildGrid();

        const sortableHeader = container.querySelector('[role="columnheader"][aria-sort]') as HTMLElement;
        expect(sortableHeader).not.toBeNull();
        expect(sortableHeader.getAttribute('aria-sort')).toBe('none');

        sortableHeader.click();
        expect(sortableHeader.getAttribute('aria-sort')).toBe('ascending');

        sortableHeader.click();
        expect(sortableHeader.getAttribute('aria-sort')).toBe('descending');

        sortableHeader.click();
        expect(sortableHeader.getAttribute('aria-sort')).toBe('none');
    });

    it('each rendered row is role="row" with aria-rowindex, and cells are role="gridcell"', () => {
        container = buildGrid();

        const viewportEl = container.querySelector('.overflow-auto') as HTMLElement;
        const rows = Array.from(viewportEl.querySelectorAll('[role="row"]')) as HTMLElement[];
        expect(rows.length).toBeGreaterThan(0);

        rows.forEach(row => {
            const rowIndex = Number(row.getAttribute('aria-rowindex'));
            // Row 1 is the header; data rows start at 2.
            expect(rowIndex).toBeGreaterThanOrEqual(2);
            const cells = row.querySelectorAll('[role="gridcell"]');
            expect(cells.length).toBe(3);
        });
    });

    it('keeps aria-rowindex correct on rendered rows after scrolling', () => {
        container = buildGrid();
        const viewportEl = container.querySelector('.overflow-auto') as HTMLElement;

        const scrollTop = 30 * GRID_ROW_HEIGHT;
        Object.defineProperty(viewportEl, 'scrollTop', { value: scrollTop, configurable: true });
        viewportEl.dispatchEvent(new Event('scroll'));

        const rows = Array.from(viewportEl.querySelectorAll('[role="row"]')) as HTMLElement[];
        expect(rows.length).toBeGreaterThan(0);

        // Every rendered row's 0-based flattened index (rowIndex - 2) should now sit near
        // item 30, not near the top of the list.
        const flattenedIndices = rows.map(row => Number(row.getAttribute('aria-rowindex')) - 2);
        expect(Math.min(...flattenedIndices)).toBeGreaterThan(10);
    });

    describe('with a toolbar (code review S9 finding: toolbar button is not a valid role="grid" child)', () => {
        function buildToolbarGrid(): HTMLElement {
            const grid = new GridBuilder<TestItem>()
                .withItems(of(items))
                .withHeight(of(400));
            grid.withToolbar().addTextButton().withCaption(of('Refresh'));
            grid.withColumns().addTextColumn('name').withHeader('Name').asSortable();

            const el = grid.build();
            document.body.appendChild(el);
            getIOMock().triggerVisibility(el, true);
            jest.advanceTimersByTime(150);

            const viewportEl = el.querySelector('.overflow-auto') as HTMLElement;
            Object.defineProperty(viewportEl, 'clientHeight', { value: 400, configurable: true });
            return el;
        }

        it('has no jest-axe violations with a toolbar present', async () => {
            container = buildToolbarGrid();
            jest.useRealTimers();
            const results = await axe(container);
            expect(results).toHaveNoViolations();
        });

        it('keeps the toolbar OUTSIDE the role="grid" element, as a sibling', () => {
            container = buildToolbarGrid();

            const gridEl = container.querySelector('[role="grid"]') as HTMLElement;
            expect(gridEl).not.toBeNull();
            expect(gridEl.querySelector('button')).toBeNull();

            const toolbarButton = container.querySelector('button') as HTMLElement;
            expect(toolbarButton).not.toBeNull();
            expect(gridEl.contains(toolbarButton)).toBe(false);
        });
    });

    describe('multi-select header cell', () => {
        function buildMultiSelectGrid(): HTMLElement {
            const grid = new GridBuilder<TestItem>()
                .withItems(of(items))
                .withHeight(of(400))
                .asMultiSelect();
            grid.withColumns().addTextColumn('name').withHeader('Name');

            const el = grid.build();
            document.body.appendChild(el);
            getIOMock().triggerVisibility(el, true);
            jest.advanceTimersByTime(150);

            const viewportEl = el.querySelector('.overflow-auto') as HTMLElement;
            Object.defineProperty(viewportEl, 'clientHeight', { value: 400, configurable: true });
            return el;
        }

        it('has no jest-axe violations with multi-select enabled', async () => {
            container = buildMultiSelectGrid();
            jest.useRealTimers();
            const results = await axe(container);
            expect(results).toHaveNoViolations();
        });

        it('gives the checkbox header cell role="columnheader" with an accessible name', () => {
            container = buildMultiSelectGrid();

            const header = container.querySelector('[role="row"]') as HTMLElement;
            const checkboxHeaderCell = header.firstElementChild as HTMLElement;
            expect(checkboxHeaderCell.getAttribute('role')).toBe('columnheader');
            expect(checkboxHeaderCell.getAttribute('aria-label')).toBe('Select all');
        });
    });

    describe('actions header cell', () => {
        const CHECK_ICON = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';

        function buildActionsGrid(): HTMLElement {
            const grid = new GridBuilder<TestItem>()
                .withItems(of(items))
                .withHeight(of(400));
            grid.withColumns().addTextColumn('name').withHeader('Name');
            grid.withActions().addAction(CHECK_ICON, 'Approve', () => {});

            const el = grid.build();
            document.body.appendChild(el);
            getIOMock().triggerVisibility(el, true);
            jest.advanceTimersByTime(150);

            const viewportEl = el.querySelector('.overflow-auto') as HTMLElement;
            Object.defineProperty(viewportEl, 'clientHeight', { value: 400, configurable: true });
            return el;
        }

        it('has no jest-axe violations with row actions enabled', async () => {
            container = buildActionsGrid();
            jest.useRealTimers();
            const results = await axe(container);
            expect(results).toHaveNoViolations();
        });

        it('gives the action header cell role="columnheader" with an accessible name', () => {
            container = buildActionsGrid();

            const header = container.querySelector('[role="row"]') as HTMLElement;
            const actionHeaderCell = header.lastElementChild as HTMLElement;
            expect(actionHeaderCell.getAttribute('role')).toBe('columnheader');
            expect(actionHeaderCell.textContent).toBe('Actions');
        });
    });

    describe('grouped rows', () => {
        interface GItem { id: number; name: string; category: string; }

        function buildGroupedGrid(): { el: HTMLElement; viewportEl: HTMLElement } {
            const gItems: GItem[] = Array.from({ length: 6 }, (_, i) => ({
                id: i,
                name: `Item ${i}`,
                category: i < 3 ? 'A' : 'B'
            }));

            const grid = new GridBuilder<GItem>()
                .withItems(of(gItems))
                .withHeight(of(400))
                .withGrouping(of(['category']));
            grid.withColumns().addTextColumn('name').withHeader('Name');

            const el = grid.build();
            document.body.appendChild(el);
            getIOMock().triggerVisibility(el, true);
            jest.advanceTimersByTime(150);

            const viewportEl = el.querySelector('.overflow-auto') as HTMLElement;
            Object.defineProperty(viewportEl, 'clientHeight', { value: 400, configurable: true });
            return { el, viewportEl };
        }

        it('has no jest-axe violations with (collapsed) groups, and group rows get role="row" + a rowheader cell', async () => {
            const { el, viewportEl } = buildGroupedGrid();
            container = el;

            // Groups start collapsed: 2 GROUP_HEADER rows only (see grid-builder.test.ts's
            // equivalent withAutoHeight grouping test for this same fixture shape).
            const rows = Array.from(viewportEl.querySelectorAll('[role="row"]')) as HTMLElement[];
            expect(rows.length).toBe(2);
            rows.forEach(row => {
                expect(row.querySelector('[role="rowheader"]')).not.toBeNull();
                expect(row.getAttribute('aria-rowindex')).not.toBeNull();
            });

            jest.useRealTimers();
            const results = await axe(el);
            expect(results).toHaveNoViolations();
        });

        it('keeps aria-rowindex continuous (no gaps/dupes) across group and item rows once a group is expanded', () => {
            const { el, viewportEl } = buildGroupedGrid();
            container = el;

            const collapsedRows = Array.from(viewportEl.querySelectorAll('[role="row"]')) as HTMLElement[];
            expect(collapsedRows.map(r => r.getAttribute('aria-rowindex'))).toEqual(['2', '3']);

            // Expand the first group — same interaction pattern as pivot-grouping.test.ts.
            collapsedRows[0].click();
            jest.advanceTimersByTime(50);

            const expandedRows = Array.from(viewportEl.querySelectorAll('[role="row"]')) as HTMLElement[];
            // Expanded group (1) + its 3 items + still-collapsed second group (1) = 5 rows.
            expect(expandedRows.length).toBe(5);
            const rowIndices = expandedRows.map(r => Number(r.getAttribute('aria-rowindex')));
            expect(rowIndices).toEqual([2, 3, 4, 5, 6]);
        });

        it('aria-rowcount tracks the VISIBLE flattened rows (+1 header) and re-counts on expand/collapse', () => {
            const { el, viewportEl } = buildGroupedGrid();
            container = el;
            const gridEl = el.querySelector('[role="grid"]') as HTMLElement;

            // Convention (grid-builder.ts:303 via toAriaRowCount, grid-styles.ts:34):
            // aria-rowcount = flattened row count + 1, where the +1 is the header row
            // (GRID_HEADER_ARIA_ROWINDEX = 1) and the flattened count is only what is
            // currently REACHABLE — a collapsed group's children are not rows of the tree
            // grid, so the count changes as groups toggle.
            const maxRowIndex = () => Math.max(
                ...Array.from(viewportEl.querySelectorAll('[role="row"]'))
                    .map(r => Number(r.getAttribute('aria-rowindex')))
            );

            // Collapsed: 2 group header rows + 1 header = 3.
            expect(gridEl.getAttribute('aria-rowcount')).toBe('3');
            expect(maxRowIndex()).toBe(3);

            // Expand group A -> [gA, 3 items, gB] = 4 flattened + gB... expand both groups.
            (viewportEl.querySelectorAll('[role="row"]')[0] as HTMLElement).click();
            jest.advanceTimersByTime(50);
            const afterFirst = Array.from(viewportEl.querySelectorAll('[role="row"]')) as HTMLElement[];
            expect(gridEl.getAttribute('aria-rowcount')).toBe('6'); // 1 + 3 + 1 flattened + header
            expect(maxRowIndex()).toBe(6);

            // Expand group B too: 2 group rows + 6 item rows = 8 flattened, + 1 header = 9.
            afterFirst[afterFirst.length - 1].click();
            jest.advanceTimersByTime(50);
            expect(viewportEl.querySelectorAll('[role="row"]').length).toBe(8);
            expect(gridEl.getAttribute('aria-rowcount')).toBe('9');
            expect(maxRowIndex()).toBe(9);

            // Collapse group A again — the count must shrink back, not stay at its high-water mark.
            (viewportEl.querySelectorAll('[role="row"]')[0] as HTMLElement).click();
            jest.advanceTimersByTime(50);
            expect(gridEl.getAttribute('aria-rowcount')).toBe('6');
            expect(maxRowIndex()).toBe(6);
        });

        it('has no jest-axe violations once a group is EXPANDED (rowheader and gridcell rows coexist)', async () => {
            const { el, viewportEl } = buildGroupedGrid();
            container = el;

            const collapsedRows = Array.from(viewportEl.querySelectorAll('[role="row"]')) as HTMLElement[];
            collapsedRows[0].click();
            jest.advanceTimersByTime(50);

            // Collapsed-only is the easy case; expanded is where a group `row` containing a
            // `rowheader` sits as a sibling of item `row`s containing `gridcell`s — the mix
            // axe's aria-required-children / required-parent rules actually police.
            const expandedRows = Array.from(viewportEl.querySelectorAll('[role="row"]')) as HTMLElement[];
            expect(expandedRows.length).toBe(5);
            expect(viewportEl.querySelectorAll('[role="rowheader"]').length).toBe(2);
            expect(viewportEl.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(0);

            jest.useRealTimers();
            const results = await axe(el);
            expect(results).toHaveNoViolations();
        });
    });
});
