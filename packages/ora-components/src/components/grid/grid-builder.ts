import { BehaviorSubject, map, Observable, combineLatest, of, Subscription, Subject } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { ColumnsBuilder } from './columns/columns-builder';
import { ToolbarBuilder } from '../toolbar/toolbar-builder';
import { ActionsBuilder } from './actions-builder';
import { SortDirection, PivotConfig, ColumnType, GridColumn, GridRowData } from './types';
import { createOptimizedPipeline } from '../../utils/optimized-pipeline';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GridStyles, GRID_ROW_HEIGHT, GRID_HEADER_HEIGHT, GRID_TOOLBAR_HEIGHT_ALLOWANCE } from './grid-styles';
import { GridLogic } from './grid-logic';
import { GridViewport } from './grid-viewport';
import { GridHeader } from './grid-header';
import { PivotLogic } from './pivot-logic';
import { registerDestroy } from '@/core/destroyable-element';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export class GridBuilder<ITEM> implements ComponentBuilder {
    private height$: Observable<number | null> = of(null);
    private columnsBuilder?: ColumnsBuilder<ITEM>;
    private toolbarBuilder?: ToolbarBuilder;
    private actionsBuilder?: ActionsBuilder<ITEM>;
    private isGlass: boolean = false;
    private isEditable: boolean = false;
    private isMultiSelect: boolean = false;
    private _onCommit: (item: ITEM) => void = () => { };
    private rowHeight: number = GRID_ROW_HEIGHT;
    private isAutoHeight: boolean = false;
    private autoHeightMaxRows: number = 0;

    private logic = new GridLogic<ITEM>();
    private rawItems$?: Observable<ITEM[]>;
    private selectedRows$?: Subject<ITEM[]>;

    withHeight(height: Observable<number>): this {
        this.height$ = height;
        return this;
    }

    /** Overrides the default GRID_ROW_HEIGHT (52px) per-row height. */
    withRowHeight(px: number): this {
        this.rowHeight = px;
        return this;
    }

    /**
     * Sizes the grid's container height to fit up to `maxRows` rendered rows
     * (min(rows.length, maxRows) * rowHeight + header height [+ toolbar allowance when
     * withToolbar() is set]), reacting to the row count as it changes. Uses `rows.length`
     * (the flattened, grouping-aware row list — GROUP_HEADER rows included, collapsed groups'
     * hidden children excluded), not the raw item count, so grouped/collapsed grids size to
     * what's actually rendered. Once the row count exceeds maxRows, the container height stays
     * capped and the viewport scrolls internally as usual. Overrides withHeight.
     */
    withAutoHeight(maxRows: number): this {
        this.isAutoHeight = true;
        this.autoHeightMaxRows = maxRows;
        return this;
    }

    withColumns(): ColumnsBuilder<ITEM> {
        this.columnsBuilder = new ColumnsBuilder<ITEM>();
        return this.columnsBuilder;
    }

    asGlass(): this {
        this.isGlass = true;
        return this;
    }

    withToolbar(): ToolbarBuilder {
        this.toolbarBuilder = new ToolbarBuilder();
        return this.toolbarBuilder;
    }

    asEditable(onCommit: (item: ITEM) => void): this {
        this.isEditable = true;
        this._onCommit = onCommit;
        return this;
    }

    withActions(): ActionsBuilder<ITEM> {
        this.actionsBuilder = new ActionsBuilder<ITEM>();
        return this.actionsBuilder;
    }

    asMultiSelect(): this {
        this.isMultiSelect = true;
        return this;
    }

    /**
     * Two-way binding between the grid's row selection and a consumer-provided Subject.
     *
     * Notes:
     * - For checkbox-driven multi-row selection the grid must also be configured with
     *   `asMultiSelect()`.
     * - A `BehaviorSubject<ITEM[]>` may be passed to pre-seed the grid's initial
     *   selection from the subject's current value; its replayed emission is applied
     *   before the grid's own selection state is pushed back out.
     */
    withRowsSelected(rows: Subject<ITEM[]>): this {
        this.selectedRows$ = rows;
        return this;
    }

    withItems(items: Observable<ITEM[]>): this {
        this.rawItems$ = items;
        return this;
    }

    withPivot(config: PivotConfig): this {
        this.logic.setPivot(of(config));
        return this;
    }

    withGrouping(groupBy$: Observable<(keyof ITEM | string)[]>): this {
        this.logic.setGrouping(groupBy$ as Observable<string[]>);
        return this;
    }

    withSort(field: keyof ITEM | string, direction: SortDirection = SortDirection.ASC): this {
        this.logic.setSort(field as string, direction);
        return this;
    }

    private generatePivotColumns(items: ITEM[], config: PivotConfig): GridColumn<ITEM>[] {
        const dynamic = PivotLogic.getDynamicColumns(items, config);
        return dynamic.map(col => ({
            id: col.id,
            field: col.field,
            type: ColumnType.NUMBER,
            header: col.header,
            width: '150px',
            sortable: true,
            resizable: true,
            cellClass: col.id.startsWith('total_') ? () => GridStyles.totalCell : undefined,
            render: (item: any) => {
                const val = item[col.field];
                return typeof val === 'number' ? val.toLocaleString() : (val ?? '');
            }
        }));
    }

    build(): HTMLElement {
        const container = document.createElement('div');
        container.className = cn(
            GridStyles.container,
            this.isGlass && GridStyles.glass
        );

        if (this.rawItems$) {
            const gatedItems$ = createOptimizedPipeline(container, this.rawItems$);
            this.logic.setItems(gatedItems$);
        }

        if (this.toolbarBuilder) {
            if (this.isGlass) this.toolbarBuilder.asGlass();
            container.appendChild(this.toolbarBuilder.build());
        }

        const actions = this.actionsBuilder ? this.actionsBuilder.build() : [];

        // We'll create initial viewport and header with current columns.
        // If pivoting is enabled, they will be updated when data arrives.
        let columns = this.columnsBuilder ? this.columnsBuilder.build() : [];

        const columns$ = new BehaviorSubject<GridColumn<ITEM>[]>(columns);
        const visibilityMap$ = new BehaviorSubject<Map<string, boolean>>(new Map());

        const viewport = new GridViewport(
            columns,
            actions,
            this.isMultiSelect,
            this.isEditable,
            (item) => this.logic.toggleSelection(item),
            (groupKey) => this.logic.toggleGroup(groupKey),
            this.isGlass,
            this._onCommit,
            this.rowHeight
        );

        this.logic.setColumns(columns);

        let currentItems: ITEM[] = [];

        const header = new GridHeader(
            columns,
            this.isGlass,
            this.isMultiSelect,
            actions.length,
            (field, direction) => this.logic.setSort(field, direction),
            (checked) => {
                if (checked) {
                    const set = new Set(currentItems);
                    this.logic.setSelectedItems(set);
                } else {
                    this.logic.setSelectedItems(new Set());
                }
            },
            (resizedColumns) => viewport.updateColumns(resizedColumns)
        );

        const headerWrapper = document.createElement('div');
        headerWrapper.className = GridStyles.headerWrapper;
        headerWrapper.tabIndex = -1;
        headerWrapper.appendChild(header.getElement());
        container.appendChild(headerWrapper);

        const viewportEl = viewport.getElement();
        container.appendChild(viewportEl);

        viewportEl.addEventListener('scroll', () => {
            if (headerWrapper.scrollLeft !== viewportEl.scrollLeft) {
                headerWrapper.scrollLeft = viewportEl.scrollLeft;
            }
        }, { passive: true });

        let lastRawItems: ITEM[] | null = null;
        let lastPivotConfig: PivotConfig | undefined = undefined;

        // State snapshots for visibility callback
        let lastSelectedItems: Set<ITEM> = new Set();
        let lastRows: GridRowData<ITEM>[] = [];
        // --- Unified column visibility via derived stream ---
        let visSubs: Subscription[] = [];

        // Releases per-column resources (e.g. EnumColumnBuilder's options subscription — see
        // GridColumn.destroy in types.ts) for a column SET that is no longer in use: called for
        // the outgoing columns whenever pivot mode regenerates/reverts the column set, and for
        // the grid's own final teardown below. Never called for a column set still in use (e.g.
        // the visibility-filtered `visibleColumns$` subset shares the SAME column instances as
        // the full set, not a replacement — no destroy needed there).
        function destroyColumns(cols: GridColumn<ITEM>[]): void {
            cols.forEach(col => col.destroy?.());
        }

        function wireVisibility(cols: GridColumn<ITEM>[]): void {
            visSubs.forEach(s => s.unsubscribe());
            visSubs = [];

            const map = new Map<string, boolean>();
            cols.forEach(col => {
                map.set(col.id, true);
                if (col.visible$) {
                    visSubs.push(
                        col.visible$.subscribe(visible => {
                            const next = new Map(visibilityMap$.value);
                            next.set(col.id, visible);
                            visibilityMap$.next(next);
                        })
                    );
                }
            });
            visibilityMap$.next(map);
        }

        wireVisibility(columns);

        const visibleColumns$ = combineLatest([columns$, visibilityMap$]).pipe(
            map(([cols, vis]) => cols.filter(c => vis.get(c.id) !== false))
        );

        const visColSub = visibleColumns$.subscribe(filtered => {
            header.updateColumns(filtered);
            viewport.clearRenderedRows();
            viewport.updateColumns(filtered);
            viewport.update(lastRows, lastSelectedItems);
        });
        // --- End column visibility support ---

        const sub = combineLatest([this.logic.state$, this.height$]).subscribe(([state, height]) => {
            currentItems = state.items;
            lastSelectedItems = state.selectedItems;
            lastRows = state.rows;

            const resolvedHeight = this.isAutoHeight
                ? Math.min(state.rows.length, this.autoHeightMaxRows) * this.rowHeight
                    + GRID_HEADER_HEIGHT
                    + (this.toolbarBuilder ? GRID_TOOLBAR_HEIGHT_ALLOWANCE : 0)
                : height;

            if (resolvedHeight === null) {
                container.style.height = '100%';
                container.style.minHeight = '0';
            } else {
                container.style.height = `${resolvedHeight}px`;
                container.style.minHeight = '';
            }

            if (state.pivotConfig && (state.rawItems !== lastRawItems || state.pivotConfig !== lastPivotConfig)) {
                lastRawItems = state.rawItems;
                lastPivotConfig = state.pivotConfig;

                // In pivot mode, we might need to regenerate columns if items change
                // or if it's the first time.
                // We must use rawItems because state.items are already pivoted!
                const pivotColumns = this.generatePivotColumns(state.rawItems, state.pivotConfig);

                // Merge with base columns (row grouping fields)
                const baseColumns = this.columnsBuilder ? this.columnsBuilder.build() : [];
                const outgoingColumns = columns;
                columns = [...baseColumns, ...pivotColumns];

                columns$.next(columns);
                wireVisibility(columns);
                this.logic.setColumns(columns);
                destroyColumns(outgoingColumns);
            } else if (!state.pivotConfig && lastPivotConfig) {
                lastPivotConfig = undefined;
                const outgoingColumns = columns;
                columns = this.columnsBuilder ? this.columnsBuilder.build() : [];
                columns$.next(columns);
                wireVisibility(columns);
                this.logic.setColumns(columns);
                destroyColumns(outgoingColumns);
            }

            header.render(state.items, state.selectedItems, state.sortConfig);
            viewport.update(state.rows, state.selectedItems);
        });

        const mainSub = new Subscription();
        mainSub.add(sub);
        mainSub.add(visColSub);

        if (this.selectedRows$) {
            const subject = this.selectedRows$;
            let suppressInbound = false;
            let suppressOutbound = false;

            // Inbound first: consumer subject -> grid selection.
            // Subscribing inbound before outbound means a BehaviorSubject's replayed
            // initial value seeds the grid before outSub's synchronous fire on subscribe.
            const inSub = subject.subscribe(rows => {
                if (suppressInbound) return;
                suppressOutbound = true;
                try { this.logic.setSelectedItems(new Set(rows)); } finally { suppressOutbound = false; }
            });

            // Outbound: grid selection -> consumer subject.
            // selectedItems$ is a BehaviorSubject so this fires synchronously on subscribe;
            // suppressInbound prevents the echo back through inSub.
            const outSub = this.logic.selectedItems$.subscribe(set => {
                if (suppressOutbound) return;
                suppressInbound = true;
                try { subject.next(Array.from(set)); } finally { suppressInbound = false; }
            });

            mainSub.add(inSub);
            mainSub.add(outSub);
        }

        registerDestroy(container, () => {
            mainSub.unsubscribe();
            visSubs.forEach(s => s.unsubscribe());
            this.logic.destroy();
            viewport.destroy();
            destroyColumns(columns);
        });

        return container;
    }
}
