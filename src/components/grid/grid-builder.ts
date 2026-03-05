import { Observable, combineLatest, BehaviorSubject, of, map } from 'rxjs';
import { ComponentBuilder } from '@/core/component-builder';
import { ColumnsBuilder } from './columns/columns-builder';
import { ToolbarBuilder } from '../toolbar/toolbar-builder';
import { ActionsBuilder, GridAction } from './actions-builder';
import { GridColumn } from './types';
import { registerDestroy } from '@/core/destroyable-element';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

    private selectedItems$ = new BehaviorSubject<Set<ITEM>>(new Set());
    private readonly rowHeight = 52;
    private readonly buffer = 5;

    // Internal state for virtualization
    private renderedRows = new Map<number, { element: HTMLElement; item: ITEM }>();

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
        return this;
    }

    build(): HTMLElement {
        const container = document.createElement('div');
        container.className = cn(
            'flex flex-col w-full text-sm text-foreground bg-background rounded-lg border border-border overflow-hidden',
            this.isGlass && 'glass-effect bg-opacity-50 backdrop-blur-md'
        );

        if (this.toolbarBuilder) {
            if (this.isGlass) this.toolbarBuilder.asGlass();
            container.appendChild(this.toolbarBuilder.build());
        }

        const header = document.createElement('div');
        header.className = cn(
            'flex flex-row items-center border-b border-border bg-muted/50 font-medium px-4 h-[52px] sticky top-0 z-20',
            this.isGlass && 'bg-white/20'
        );
        container.appendChild(header);

        const viewport = document.createElement('div');
        viewport.className = 'flex-1 overflow-y-auto relative outline-none';
        viewport.tabIndex = -1;
        container.appendChild(viewport);

        const content = document.createElement('div');
        content.className = 'relative w-full';
        viewport.appendChild(content);

        const columns = this.columnsBuilder ? this.columnsBuilder.build() : [];
        const actions = this.actionsBuilder ? this.actionsBuilder.build() : [];

        let lastItems: ITEM[] = [];

        const updateVirtualization = (items: ITEM[]) => {
            this.renderVisibleRows(viewport, content, items, columns, actions, this.selectedItems$.value);
        };

        const sub = combineLatest([this.items$, this.height$, this.selectedItems$]).subscribe(([items, height, selected]) => {
            lastItems = items;
            container.style.height = `${height}px`;
            const totalHeight = items.length * this.rowHeight;
            content.style.height = `${totalHeight}px`;

            this.renderHeader(header, columns, items, selected);
            updateVirtualization(items);
        });

        registerDestroy(container, () => sub.unsubscribe());

        const onScroll = () => {
            updateVirtualization(lastItems);
        };

        viewport.addEventListener('scroll', onScroll);
        registerDestroy(container, () => viewport.removeEventListener('scroll', onScroll));

        return container;
    }

    private renderHeader(header: HTMLElement, columns: GridColumn<ITEM>[], items: ITEM[], selected: Set<ITEM>) {
        // Only rebuild header if columns or selection changed in a way that affects "select all"
        // For simplicity, we rebuild but we could optimize
        header.innerHTML = '';

        if (this.isMultiSelect) {
            const checkCell = document.createElement('div');
            checkCell.className = 'w-10 flex-none flex items-center justify-center';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'rounded border-outline w-4 h-4 cursor-pointer accent-primary';
            
            const allSelected = items.length > 0 && items.every(item => selected.has(item));
            const noneSelected = selected.size === 0;
            const isIndeterminate = !allSelected && !noneSelected && items.some(item => selected.has(item));
            
            checkbox.checked = allSelected;
            checkbox.indeterminate = isIndeterminate;

            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.selectedItems$.next(new Set(items));
                } else {
                    this.selectedItems$.next(new Set());
                }
            });

            checkCell.appendChild(checkbox);
            header.appendChild(checkCell);
        }

        columns.forEach(col => {
            const cell = document.createElement('div');
            this.applyColumnWidth(cell, col);
            
            cell.className = cn(
                'px-4 flex items-center text-left truncate font-medium text-on-surface-variant group',
                cell.className,
                col.sortable && 'cursor-pointer hover:text-primary transition-colors'
            );
            
            const span = document.createElement('span');
            span.textContent = col.header;
            span.className = 'truncate';
            cell.appendChild(span);

            if (col.sortable) {
                const icon = document.createElement('i');
                icon.className = 'fas fa-sort-down ml-2 opacity-0 group-hover:opacity-100 transition-opacity';
                cell.appendChild(icon);
            }
            
            header.appendChild(cell);
        });

        if (this.actionsBuilder) {
            const actionCell = document.createElement('div');
            actionCell.className = 'w-20 flex-none';
            header.appendChild(actionCell);
        }
    }

    private renderVisibleRows(
        viewport: HTMLElement,
        content: HTMLElement,
        items: ITEM[],
        columns: GridColumn<ITEM>[],
        actions: GridAction<ITEM>[],
        selected: Set<ITEM>
    ) {
        const scrollTop = viewport.scrollTop;
        const viewportHeight = viewport.clientHeight;
        const count = items.length;

        if (count === 0) {
            this.clearRenderedRows();
            return;
        }

        const startIndex = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.buffer);
        const endIndex = Math.min(count - 1, Math.floor((scrollTop + viewportHeight) / this.rowHeight) + this.buffer);

        // Remove rows that are no longer in the visible range + buffer
        for (const [index, row] of this.renderedRows.entries()) {
            if (index < startIndex || index > endIndex) {
                row.element.remove();
                this.renderedRows.delete(index);
            }
        }

        // Add or update rows
        for (let i = startIndex; i <= endIndex; i++) {
            const item = items[i];
            const isSelected = selected.has(item);
            const existing = this.renderedRows.get(i);

            if (!existing) {
                const element = this.createRow(item, i, columns, actions, isSelected);
                content.appendChild(element);
                this.renderedRows.set(i, { element, item });
            } else if (existing.item !== item) {
                // Item at this index changed, update content
                this.updateRowContent(existing.element, item, columns, actions, isSelected);
                existing.item = item;
            } else {
                // Same item, just update selection state
                this.updateRowSelection(existing.element, isSelected);
            }
        }
    }

    private createRow(
        item: ITEM,
        index: number,
        columns: GridColumn<ITEM>[],
        actions: GridAction<ITEM>[],
        isSelected: boolean
    ): HTMLElement {
        const row = document.createElement('div');
        row.className = cn(
            'absolute w-full flex items-center border-b border-border/50 hover:bg-muted/30 transition-colors',
            this.isEditable && 'cursor-text',
            isSelected && 'bg-primary/5'
        );
        row.style.top = `${index * this.rowHeight}px`;
        row.style.height = `${this.rowHeight}px`;

        this.populateRow(row, item, columns, actions, isSelected);

        return row;
    }

    private updateRowContent(
        row: HTMLElement,
        item: ITEM,
        columns: GridColumn<ITEM>[],
        actions: GridAction<ITEM>[],
        isSelected: boolean
    ) {
        row.innerHTML = '';
        this.populateRow(row, item, columns, actions, isSelected);
        row.className = cn(
            row.className.split(' ').filter(c => !c.startsWith('bg-primary/')).join(' '),
            isSelected && 'bg-primary/5'
        );
    }

    private populateRow(
        row: HTMLElement,
        item: ITEM,
        columns: GridColumn<ITEM>[],
        actions: GridAction<ITEM>[],
        isSelected: boolean
    ) {
        if (this.isMultiSelect) {
            const checkCell = document.createElement('div');
            checkCell.className = 'w-10 flex-none flex items-center justify-center';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'rounded border-outline w-4 h-4 cursor-pointer accent-primary';
            checkbox.checked = isSelected;

            checkbox.addEventListener('change', (e) => {
                const checked = (e.target as HTMLInputElement).checked;
                const current = new Set(this.selectedItems$.value);
                if (checked) {
                    current.add(item);
                } else {
                    current.delete(item);
                }
                this.selectedItems$.next(current);
            });

            checkCell.appendChild(checkbox);
            row.appendChild(checkCell);
        }

        columns.forEach(col => {
            const cell = document.createElement('div');
            this.applyColumnWidth(cell, col);
            cell.className = cn('px-4 flex items-center truncate', cell.className, col.cellClass);

            const content = col.render(item);
            if (content instanceof HTMLElement) {
                cell.appendChild(content);
            } else {
                cell.textContent = String(content);
            }
            row.appendChild(cell);
        });

        if (actions.length > 0) {
            const actionCell = document.createElement('div');
            actionCell.className = 'w-20 flex-none flex items-center justify-center gap-1';
            
            actions.forEach(action => {
                const btn = document.createElement('button');
                btn.className = 'p-2 hover:bg-muted rounded-full text-on-surface-variant hover:text-primary transition-colors';
                btn.title = action.label;
                
                if (action.icon) {
                    const icon = document.createElement('i');
                    icon.className = action.icon;
                    btn.appendChild(icon);
                } else {
                    btn.textContent = action.label;
                    btn.className = cn(btn.className, 'text-xs px-2 rounded-md');
                }

                btn.onclick = (e) => {
                    e.stopPropagation();
                    action.onClick(item);
                };
                actionCell.appendChild(btn);
            });
            row.appendChild(actionCell);
        }
    }

    private updateRowSelection(row: HTMLElement, isSelected: boolean) {
        if (this.isMultiSelect) {
            const checkbox = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
            if (checkbox) checkbox.checked = isSelected;
        }
        
        if (isSelected) {
            row.classList.add('bg-primary/5');
        } else {
            row.classList.remove('bg-primary/5');
        }
    }

    private applyColumnWidth(element: HTMLElement, col: GridColumn<ITEM>) {
        if (col.width) {
            if (col.width.includes('px') || col.width.includes('rem')) {
                element.style.width = col.width;
                element.classList.add('flex-none');
            } else if (col.width.includes('fr')) {
                element.style.flex = col.width.replace('fr', '');
            } else {
                element.style.width = col.width;
                element.classList.add('flex-none');
            }
        } else {
            element.classList.add('flex-1');
        }
    }

    private clearRenderedRows() {
        this.renderedRows.forEach(row => row.element.remove());
        this.renderedRows.clear();
    }
}
