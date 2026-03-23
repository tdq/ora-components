import { Observable, combineLatest, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { ColumnsBuilder } from './columns/columns-builder';
import { ToolbarBuilder } from '../toolbar/toolbar-builder';
import { ActionsBuilder } from './actions-builder';
import { SortDirection, PivotConfig, ColumnType, GridColumn } from './types';
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
    private height$: Observable<number> = of(400);
    private columnsBuilder?: ColumnsBuilder<ITEM>;
    private toolbarBuilder?: ToolbarBuilder;
    private actionsBuilder?: ActionsBuilder<ITEM>;
    private isGlass: boolean = false;
    private isEditable: boolean = false;
    private isMultiSelect: boolean = false;

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

    asEditable(): this {
        this.isEditable = true;
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
            cellClass: col.id.startsWith('total_') ? of(GridStyles.totalCell) : undefined,
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

        const viewport = new GridViewport(
            columns,
            actions,
            this.isMultiSelect,
            this.isEditable,
            (item) => this.logic.toggleSelection(item),
            (groupKey) => this.logic.toggleGroup(groupKey),
            this.isGlass
        );

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

        viewport.addHeader(header.getElement());
        container.appendChild(viewport.getElement());

        const sub = combineLatest([this.logic.state$, this.height$]).subscribe(([state, height]) => {
            currentItems = state.items;
            container.style.height = `${height}px`;

            if (state.pivotConfig) {
                // In pivot mode, we might need to regenerate columns if items change
                // or if it's the first time.
                // We must use rawItems because state.items are already pivoted!
                const pivotColumns = this.generatePivotColumns(state.rawItems, state.pivotConfig);
                
                // Merge with base columns (row grouping fields)
                const baseColumns = this.columnsBuilder ? this.columnsBuilder.build() : [];
                columns = [...baseColumns, ...pivotColumns];
                
                // Update viewport and header with new columns
                viewport.updateColumns(columns);
                header.updateColumns(columns);
            }

            header.render(state.items, state.selectedItems, state.sortConfig);
            viewport.update(state.rows, state.selectedItems);
        });

        registerDestroy(container, () => {
            sub.unsubscribe();
            this.logic.destroy();
            viewport.destroy();
        });

        return container;
    }
}
