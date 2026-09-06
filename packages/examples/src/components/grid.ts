import {
    GridBuilder, SortDirection, EnumOption,
    PanelBuilder, PanelGap,
    LabelBuilder, LayoutBuilder, LayoutGap, SlotSize,
    Money, Icons,
} from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';

// ─── shared data shapes ──────────────────────────────────────────────────────

interface Order {
    id: string;
    customer: string;
    amount: Money;
    units: number;
    status: 'Completed' | 'Pending' | 'Cancelled';
    active: boolean;
    date: string;
    completion: number;  // 0–100 %
}

const ORDERS: Order[] = [
    { id: 'ORD-001', customer: 'TechNova Corp',     amount: { amount: 1190.00, currencyId: 'EUR' }, units: 4,  status: 'Completed', active: true,  date: '2026-04-09', completion: 100 },
    { id: 'ORD-002', customer: 'Kevin Park',        amount: { amount:  299.00, currencyId: 'EUR' }, units: 1,  status: 'Pending',   active: true,  date: '2026-04-09', completion:  40 },
    { id: 'ORD-003', customer: 'Rachel Kim',        amount: { amount:   49.00, currencyId: 'EUR' }, units: 1,  status: 'Completed', active: true,  date: '2026-04-08', completion: 100 },
    { id: 'ORD-004', customer: 'Cascade Ventures',  amount: { amount: 2490.00, currencyId: 'EUR' }, units: 12, status: 'Completed', active: true,  date: '2026-04-07', completion: 100 },
    { id: 'ORD-005', customer: 'Diana Prince',      amount: { amount:   99.00, currencyId: 'EUR' }, units: 2,  status: 'Cancelled', active: false, date: '2026-04-04', completion:   0 },
    { id: 'ORD-006', customer: 'Oscar Ruiz',        amount: { amount:  199.00, currencyId: 'EUR' }, units: 3,  status: 'Completed', active: true,  date: '2026-04-06', completion: 100 },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function gridPanel(title: string, grid: GridBuilder<any>): PanelBuilder {
    const content = new LayoutBuilder().asVertical().withGap(LayoutGap.LARGE);
    content.addSlot().withSize(SlotSize.FIT).withContent(
        new LabelBuilder().withCaption(of(title))
    );
    content.addSlot().withSize(SlotSize.FULL).withContent(grid);

    return new PanelBuilder()
        .withGap(PanelGap.LARGE)
        .withContent(content);
}

// ─── examples ────────────────────────────────────────────────────────────────

/**
 * Basic Grid
 *
 * `.withItems(observable)` sets the data source — accepts any Observable<T[]>.
 * `.withColumns()` returns a ColumnsBuilder for defining columns.
 *
 * Column width: use px for fixed columns, '1fr' for flexible columns.
 * Always call `.withHeader()` so the column header renders correctly.
 */
export function createBasicGridExample(): PanelBuilder {
    const grid = new GridBuilder<Order>()
        .withItems(of(ORDERS));

    const cols = grid.withColumns();
    cols.addTextColumn('id')
        .withHeader('Order ID')
        .withWidth('110px');
    cols.addTextColumn('customer')
        .withHeader('Customer')
        .withWidth('1fr');
    cols.addDateColumn('date')
        .withHeader('Date')
        .withWidth('120px');
    cols.addMoneyColumn('amount')
        .withHeader('Amount')
        .withWidth('130px');

    return gridPanel('Basic Grid', grid);
}

/**
 * Column Types
 *
 * GridBuilder supports typed columns with built-in formatting:
 *   addTextColumn       — plain string
 *   addNumberColumn     — numeric, right-aligned; `.withDecimals(n)` controls precision
 *   addMoneyColumn      — currency formatted using the Money { amount, currencyId } shape
 *   addDateColumn       — date-only formatting
 *   addDateTimeColumn   — date + time formatting
 *   addPercentageColumn — renders a % value with a bar indicator
 *   addBooleanColumn    — true/false; `.asCheckbox()` renders a visual checkbox
 *   addEnumColumn       — string value; `.withItemCaptionProvider()` maps enum → label
 *   addIconColumn       — renders an icon from the Icons enum
 *   addTrendColumn      — renders a Trend { value, period } with up/down indicator
 *   addCustomColumn     — full control via `.withRenderer(item => HTMLElement | string)`
 */
export function createColumnTypesExample(): PanelBuilder {
    const grid = new GridBuilder<Order>()
        .withItems(of(ORDERS));

    const cols = grid.withColumns();

    cols.addTextColumn('customer')
        .withHeader('Customer')
        .withWidth('1fr');

    cols.addMoneyColumn('amount')
        .withHeader('Amount (€)')
        .withWidth('130px');

    cols.addNumberColumn('units')
        .withHeader('Units')
        .withWidth('80px')
        .withDecimals(0);

    cols.addPercentageColumn('completion')
        .withHeader('Completion')
        .withWidth('150px');

    cols.addBooleanColumn('active')
        .withHeader('Active')
        .withWidth('80px')
        .asCheckbox();

    cols.addEnumColumn('status')
        .withHeader('Status')
        .withWidth('110px')
        .withItemCaptionProvider(item => item.status);

    cols.addDateColumn('date')
        .withHeader('Date')
        .withWidth('120px');

    return gridPanel('Column Types', grid);
}

/**
 * Sortable Grid
 *
 * `.asSortable()` on a column enables click-to-sort for that column.
 * `.withSort(field, direction)` on the GridBuilder sets the initial sort.
 * Use `SortDirection.ASC` or `SortDirection.DESC`.
 *
 * `.withSortValue(fn)` on a column provides a custom sort key
 * (e.g. sort by numeric amount even though the column renders currency).
 */
export function createSortableGridExample(): PanelBuilder {
    const grid = new GridBuilder<Order>()
        .withItems(of(ORDERS))
        .withSort('date', SortDirection.DESC);  // default: newest first

    const cols = grid.withColumns();
    cols.addTextColumn('customer')
        .withHeader('Customer')
        .withWidth('1fr')
        .asSortable();
    cols.addMoneyColumn('amount')
        .withHeader('Amount (€)')
        .withWidth('130px')
        .asSortable()
        .withSortValue(item => item.amount.amount);  // sort by numeric value
    cols.addEnumColumn('status')
        .withHeader('Status')
        .withWidth('110px')
        .asSortable();
    cols.addDateColumn('date')
        .withHeader('Date')
        .withWidth('120px')
        .asSortable();

    return gridPanel('Sortable Grid', grid);
}

/**
 * Editable Grid
 *
 * `.asEditable(onCommit)` enables inline cell editing.
 * The `onCommit` callback receives the mutated row after the user confirms.
 * Persist the change in your store/API inside `onCommit`.
 *
 * Mark individual columns as editable with `.asEditable()` on the column builder.
 * Columns without `.asEditable()` remain read-only even when the grid is editable.
 */
export function createEditableGridExample(): PanelBuilder {
    const data$ = new BehaviorSubject<Order[]>([...ORDERS]);

    const grid = new GridBuilder<Order>()
        .withItems(data$)
        .asEditable((updated) => {
            // Replace the matching row in the subject
            const next = data$.value.map(o => o.id === updated.id ? updated : o);
            data$.next(next);
        });

    const cols = grid.withColumns();
    cols.addTextColumn('id')
        .withHeader('Order ID')
        .withWidth('110px');   // read-only — no .asEditable()
    cols.addTextColumn('customer')
        .withHeader('Customer')
        .withWidth('1fr')
        .asEditable();          // click to edit inline
    cols.addNumberColumn('units')
        .withHeader('Units')
        .withWidth('80px')
        .withDecimals(0)
        .asEditable();
    cols.addEnumColumn('status')
        .withHeader('Status')
        .withWidth('110px')
        .withItemCaptionProvider(item => item.status)
        .asEditable();

    return gridPanel('Editable Grid', grid);
}

/**
 * Row Actions
 *
 * `.withActions()` returns an ActionsBuilder for per-row icon buttons.
 * Each action gets an icon (Icons enum), a label (used as tooltip), and an onClick handler.
 *
 * `.withVisible(fn)` hides the action for rows where the predicate returns false.
 * `.withEnable(fn)` disables the action without hiding it.
 *
 * Note: `addAction()` returns an `ActionBuilder` for chaining modifiers (.withVisible,
 * .withEnable). To add multiple actions, call `.addAction()` on the ActionsBuilder again.
 * Actions require a raw SVG string for the icon — use the Icons class constants.
 */
export function createActionsGridExample(): PanelBuilder {
    const data$ = new BehaviorSubject<Order[]>([...ORDERS]);

    const grid = new GridBuilder<Order>().withItems(data$);

    const cols = grid.withColumns();
    cols.addTextColumn('id').withHeader('Order ID').withWidth('110px');
    cols.addTextColumn('customer').withHeader('Customer').withWidth('1fr');
    cols.addEnumColumn('status')
        .withHeader('Status')
        .withWidth('110px')
        .withItemCaptionProvider(item => item.status);

    const actions = grid.withActions();

    // Complete action — only visible on Pending rows
    actions.addAction(Icons.CHECKMARK, 'Complete', (item) => {
        const next = data$.value.map(o =>
            o.id === item.id ? { ...o, status: 'Completed' as const } : o
        );
        data$.next(next);
    }).withVisible(item => item.status === 'Pending');

    // Delete action — always visible
    actions.addAction(Icons.DELETE, 'Delete', (item) => {
        data$.next(data$.value.filter(o => o.id !== item.id));
    });

    return gridPanel('Row Actions', grid);
}

/**
 * Multi-Select Grid
 *
 * `.asMultiSelect()` adds a checkbox column and tracks selected rows internally.
 * `.withRowsSelected(subject)` exposes that selection as a two-way binding: the
 * grid pushes the selected rows into the `Subject` whenever they change, and
 * pushing an array back into the `Subject` sets the grid's selection (pass a
 * `BehaviorSubject<T[]>` to pre-seed the initial selection). Combine with toolbar
 * actions to operate on all selected rows at once.
 */
export function createMultiSelectGridExample(): PanelBuilder {
    // Two-way binding: read the current selection here, or push to set it.
    const selectedOrders$ = new BehaviorSubject<Order[]>([]);

    const grid = new GridBuilder<Order>()
        .withItems(of(ORDERS))
        .asMultiSelect()
        .withRowsSelected(selectedOrders$);

    const toolbar = grid.withToolbar();
    toolbar.addSecondaryButton()
        .withCaption(of('Export Selected'));
    toolbar.addTextButton()
        .withCaption(of('Clear Selection'));

    const cols = grid.withColumns();
    cols.addTextColumn('id').withHeader('Order ID').withWidth('110px');
    cols.addTextColumn('customer').withHeader('Customer').withWidth('1fr');
    cols.addMoneyColumn('amount').withHeader('Amount (€)').withWidth('130px');
    cols.addEnumColumn('status')
        .withHeader('Status')
        .withWidth('110px')
        .withItemCaptionProvider(item => item.status);

    return gridPanel('Multi-Select Grid', grid);
}

/**
 * Custom Column Renderer
 *
 * `.addCustomColumn().withRenderer(item => HTMLElement | string)` gives full
 * control over cell content. Return an HTMLElement to render rich content
 * (chips, badges, sparklines), or a string for plain text.
 *
 * Use `.withClass(item => string)` on any column to apply dynamic Tailwind
 * classes per row (e.g. highlight overdue rows in red).
 */
export function createCustomColumnGridExample(): PanelBuilder {
    const grid = new GridBuilder<Order>().withItems(of(ORDERS));

    const cols = grid.withColumns();

    cols.addTextColumn('customer')
        .withHeader('Customer')
        .withWidth('1fr');

    cols.addMoneyColumn('amount')
        .withHeader('Amount (€)')
        .withWidth('130px')
        .withClass(item => item.amount.amount > 500 ? 'font-bold text-on-surface' : '');

    // Status chip: returns a colored span element
    cols.addCustomColumn()
        .withHeader('Status')
        .withWidth('120px')
        .withRenderer(item => {
            const colors: Record<string, string> = {
                Completed: 'bg-green-500/10 text-green-600',
                Pending:   'bg-amber-500/10 text-amber-600',
                Cancelled: 'bg-red-500/10 text-red-600',
            };
            const chip = document.createElement('span');
            chip.className = `inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors[item.status] ?? ''}`;
            chip.textContent = item.status;
            return chip;
        });

    return gridPanel('Custom Column Renderer', grid);
}

/**
 * Reactive Grid — Live Data
 *
 * Pass a `BehaviorSubject<T[]>` to `.withItems()` and push new arrays into it
 * to update the grid without rebuilding. Only changed rows re-render.
 *
 * This pattern works for: live feeds, polling APIs, optimistic UI updates.
 */
export function createReactiveGridExample(): PanelBuilder {
    const data$ = new BehaviorSubject<Order[]>([...ORDERS]);

    const grid = new GridBuilder<Order>().withItems(data$);

    const toolbar = grid.withToolbar();
    toolbar.withPrimaryButton()
        .withCaption(of('Add Row'))
        .withClick(() => {
            const n = data$.value.length + 1;
            data$.next([
                ...data$.value,
                {
                    id: `ORD-00${n}`,
                    customer: `New Customer ${n}`,
                    amount: { amount: Math.round(Math.random() * 500 + 50), currencyId: 'EUR' },
                    units: 1,
                    status: 'Pending',
                    active: true,
                    date: new Date().toISOString().slice(0, 10),
                    completion: 0,
                },
            ]);
        });

    const cols = grid.withColumns();
    cols.addTextColumn('id').withHeader('Order ID').withWidth('110px');
    cols.addTextColumn('customer').withHeader('Customer').withWidth('1fr');
    cols.addMoneyColumn('amount').withHeader('Amount (€)').withWidth('130px');
    cols.addEnumColumn('status')
        .withHeader('Status')
        .withWidth('110px')
        .withItemCaptionProvider(item => item.status);

    return gridPanel('Reactive Grid (BehaviorSubject)', grid);
}

/**
 * Auto-Height Grid with Select Editor
 *
 * `.withAutoHeight(maxRows)` sizes the grid to its content —
 * `min(rows.length, maxRows) * rowHeight + header` — instead of filling its
 * parent's height. Use it for a short grid embedded in a form or dialog,
 * where a `height: 100%` grid would collapse or leave dead space.
 *
 * `.addEnumColumn(field).withOptions(options)` drives both the rendered
 * label and, once the column is `.asEditable()`, the inline select editor —
 * a ComboBox seeded with the same options — so display text and editable
 * choices can never drift apart.
 */
export function createAutoHeightSelectEditorGridExample(): PanelBuilder {
    const data$ = new BehaviorSubject<Order[]>(ORDERS.slice(0, 3).map(o => ({ ...o })));

    const statusOptions: EnumOption[] = [
        { value: 'Pending', label: 'Pending' },
        { value: 'Completed', label: 'Completed' },
        { value: 'Cancelled', label: 'Cancelled' },
    ];

    const grid = new GridBuilder<Order>()
        .withItems(data$)
        .withAutoHeight(5)  // sizes to content, up to 5 rows — no dead space in a compact card
        .asEditable((updated) => {
            const next = data$.value.map(o => o.id === updated.id ? updated : o);
            data$.next(next);
        });

    const cols = grid.withColumns();
    cols.addTextColumn('customer').withHeader('Customer').withWidth('1fr');
    cols.addMoneyColumn('amount').withHeader('Amount (€)').withWidth('130px');
    cols.addEnumColumn('status')
        .withHeader('Status')
        .withWidth('140px')
        .withOptions(statusOptions)  // seeds both the cell label and the select editor
        .asEditable();

    return gridPanel('Auto-Height Grid — Select Editor', grid);
}

/**
 * Grouped Grid
 *
 * `.withGrouping(observable<string[]>)` groups rows by one or more fields.
 * Pass a BehaviorSubject to make the grouping reactive (e.g. driven by a dropdown).
 *
 * Groups are collapsible. Aggregation per group uses column types automatically
 * (sums for numbers, counts for text).
 */
export function createGroupedGridExample(): PanelBuilder {
    const groupBy$ = new BehaviorSubject<(keyof Order)[]>(['status']);

    const grid = new GridBuilder<Order>()
        .withItems(of(ORDERS))
        .withGrouping(groupBy$);

    const cols = grid.withColumns();
    cols.addTextColumn('customer').withHeader('Customer').withWidth('1fr');
    cols.addMoneyColumn('amount').withHeader('Amount (€)').withWidth('130px');
    cols.addNumberColumn('units').withHeader('Units').withWidth('80px').withDecimals(0);
    cols.addEnumColumn('status')
        .withHeader('Status')
        .withWidth('110px')
        .withItemCaptionProvider(item => item.status);
    cols.addDateColumn('date').withHeader('Date').withWidth('120px');

    return gridPanel('Grouped Grid (by Status)', grid);
}
