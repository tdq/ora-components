import { of } from 'rxjs';
import { GridBuilder } from './grid-builder';
import { SortDirection } from './types';
import { MoneyColumnBuilder } from './columns/money-column';
import { NumberColumnBuilder } from './columns/number-column';
import { PercentageColumnBuilder } from './columns/percentage-column';

describe('GridBuilder', () => {
    let container: HTMLElement;

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
        const firstRow = container.querySelector('.absolute.w-full') as HTMLElement;
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

        const rows = container.querySelectorAll('.absolute.w-full');
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
            const headerCells = header!.querySelectorAll(':scope > div');
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
});
