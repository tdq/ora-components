import { BehaviorSubject, map, Observable, combineLatest, of, Subscription } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { ColumnsBuilder } from './columns/columns-builder';
import { ToolbarBuilder } from '../toolbar/toolbar-builder';
import { ActionsBuilder } from './actions-builder';
import { SortDirection, PivotConfig, ColumnType, GridColumn, GridRowData } from './types';
import { registerDestroy } from '@/core/destroyable-element';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GridStyles } from './grid-styles';
import { GridLogic } from './grid-logic';
import { GridViewport } from './grid-viewport';
import { GridHeader } from './grid-header';
import { PivotLogic } from './pivot-logic';

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

    private logic = new GridLogic<ITEM>();

    withHeight(height: Observable<number>): this {
        this.height$ = height;
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

    withItems(items: Observable<ITEM[]>): this {
        this.logic.setItems(items);
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
            this._onCommit
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
            if (height === null) {
                container.style.height = '100%';
                container.style.minHeight = '0';
            } else {
                container.style.height = `${height}px`;
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
                columns = [...baseColumns, ...pivotColumns];

                columns$.next(columns);
                wireVisibility(columns);
                this.logic.setColumns(columns);
            } else if (!state.pivotConfig && lastPivotConfig) {
                lastPivotConfig = undefined;
                columns = this.columnsBuilder ? this.columnsBuilder.build() : [];
                columns$.next(columns);
                wireVisibility(columns);
                this.logic.setColumns(columns);
            }

            header.render(state.items, state.selectedItems, state.sortConfig);
            viewport.update(state.rows, state.selectedItems);
        });

        registerDestroy(container, () => {
            sub.unsubscribe();
            visColSub.unsubscribe();
            visSubs.forEach(s => s.unsubscribe());
            this.logic.destroy();
            viewport.destroy();
        });

        return container;
    }
}
