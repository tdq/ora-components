import { Observable, combineLatest, of } from 'rxjs';
import { ComponentBuilder } from '@/core/component-builder';
import { ColumnsBuilder } from './columns/columns-builder';
import { ToolbarBuilder } from '../toolbar/toolbar-builder';
import { ActionsBuilder } from './actions-builder';
import { SortDirection } from './types';
import { registerDestroy } from '@/core/destroyable-element';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GridStyles } from './grid-styles';
import { GridLogic } from './grid-logic';
import { GridViewport } from './grid-viewport';
import { GridHeader } from './grid-header';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export class GridBuilder<ITEM> implements ComponentBuilder {
    private height$: Observable<number> = of(400);
    private columnsBuilder?: ColumnsBuilder<ITEM>;
    private toolbarBuilder?: ToolbarBuilder;
    private actionsBuilder?: ActionsBuilder<ITEM>;
    private items$: Observable<ITEM[]> = of([]);
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
        this.items$ = items;
        this.logic.setItems(items);
        return this;
    }

    withSort(field: keyof ITEM | string, direction: SortDirection = SortDirection.ASC): this {
        this.logic.setSort(field as string, direction);
        return this;
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

        const columns = this.columnsBuilder ? this.columnsBuilder.build() : [];
        const actions = this.actionsBuilder ? this.actionsBuilder.build() : [];

        const viewport = new GridViewport(
            columns,
            actions,
            this.isMultiSelect,
            this.isEditable,
            (item) => this.logic.toggleSelection(item)
        );

        let currentItems: ITEM[] = [];

        const header = new GridHeader(
            columns,
            this.isGlass,
            this.isMultiSelect,
            actions.length > 0,
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
            header.render(state.items, state.selectedItems, state.sortConfig);
            viewport.update(state.items, state.selectedItems);
        });

        registerDestroy(container, () => {
            sub.unsubscribe();
            this.logic.destroy();
        });

        return container;
    }
}
