import { Observable, combineLatest, BehaviorSubject, of, map } from 'rxjs';
import { ComponentBuilder } from '@/core/component-builder';
import { ColumnsBuilder } from './columns/columns-builder';
import { ToolbarBuilder } from '../toolbar/toolbar-builder';
import { ActionsBuilder, GridAction } from './actions-builder';
import { GridColumn, SortConfig, SortDirection } from './types';
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
    private sortConfig$ = new BehaviorSubject<SortConfig>({ field: '', direction: SortDirection.NONE });
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

    withSort(field: keyof ITEM | string, direction: SortDirection = SortDirection.ASC): this {
        this.sortConfig$.next({ field: field as string, direction });
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
            'flex flex-row items-stretch border-b border-border bg-surface-container-low font-medium h-[52px] sticky top-0 z-20',
            this.isGlass && 'bg-white/20 backdrop-blur-md'
        );

        const viewport = document.createElement('div');
        viewport.className = 'flex-1 overflow-auto relative outline-none';
        viewport.tabIndex = -1;
        container.appendChild(viewport);

        // Move header inside viewport for horizontal sync
        viewport.appendChild(header);

        const content = document.createElement('div');
        content.className = 'relative w-full';
        viewport.appendChild(content);

        const columns = this.columnsBuilder ? this.columnsBuilder.build() : [];
        const actions = this.actionsBuilder ? this.actionsBuilder.build() : [];

        const sortedItems$ = combineLatest([this.items$, this.sortConfig$]).pipe(
            map(([items, sort]) => {
                if (!sort.field || sort.direction === SortDirection.NONE) {
                    return items;
                }
                return [...items].sort((a, b) => {
                    const valA = (a as any)[sort.field];
                    const valB = (b as any)[sort.field];
                    if (valA === valB) return 0;
                    const modifier = sort.direction === SortDirection.ASC ? 1 : -1;
                    return valA > valB ? modifier : -modifier;
                });
            })
        );

        let lastItems: ITEM[] = [];

        const updateVirtualization = (items: ITEM[]) => {
            this.renderVisibleRows(viewport, content, items, columns, actions, this.selectedItems$.value);
        };

        const sub = combineLatest([sortedItems$, this.height$, this.selectedItems$, this.sortConfig$]).subscribe(([items, height, selected, sort]) => {
            lastItems = items;
            container.style.height = `${height}px`;
            const totalHeight = items.length * this.rowHeight;
            content.style.height = `${totalHeight}px`;

            this.renderHeader(header, columns, items, selected, sort);
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

    private renderHeader(header: HTMLElement, columns: GridColumn<ITEM>[], items: ITEM[], selected: Set<ITEM>, sort: SortConfig) {
        header.innerHTML = '';

        if (this.isMultiSelect) {
            const checkCell = document.createElement('div');
            checkCell.className = 'w-12 flex-none flex items-center justify-center border-r border-border/50';

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

        columns.forEach((col, index) => {
            const cell = document.createElement('div');
            this.applyColumnWidth(cell, col);

            cell.className = cn(
                'px-4 h-full flex items-center text-left truncate font-medium text-on-surface-variant group relative border-r border-border/50',
                col.sortable && 'cursor-pointer hover:text-primary transition-colors',
                index === columns.length - 1 && 'border-r-0'
            );

            const span = document.createElement('span');
            span.textContent = col.header;
            span.className = 'truncate';
            cell.appendChild(span);

            if (col.sortable) {
                const icon = document.createElement('i');
                const isCurrent = sort.field === col.field;
                const iconClass = isCurrent && sort.direction === SortDirection.ASC ? 'fa-sort-up' :
                    isCurrent && sort.direction === SortDirection.DESC ? 'fa-sort-down' : 'fa-sort';

                icon.className = cn(
                    'fas ml-2 transition-opacity',
                    iconClass,
                    isCurrent ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-50'
                );
                cell.appendChild(icon);

                cell.addEventListener('click', (e) => {
                    if ((e.target as HTMLElement).classList.contains('resize-handle')) return;

                    let nextDirection = SortDirection.ASC;
                    if (isCurrent) {
                        if (sort.direction === SortDirection.ASC) nextDirection = SortDirection.DESC;
                        else if (sort.direction === SortDirection.DESC) nextDirection = SortDirection.NONE;
                    }
                    this.sortConfig$.next({ field: col.field as string, direction: nextDirection });
                });
            }

            if (col.resizable) {
                const handle = document.createElement('div');
                handle.className = 'resize-handle absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-30';
                cell.appendChild(handle);

                handle.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const startX = e.pageX;
                    const startWidth = cell.offsetWidth;

                    const onMouseMove = (moveEvent: MouseEvent) => {
                        const newWidth = Math.max(50, startWidth + (moveEvent.pageX - startX));
                        col.width = `${newWidth}px`;
                        this.applyColumnWidth(cell, col);
                        this.updateVisibleRowsWidth(columns);
                    };

                    const onMouseUp = () => {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });
            }

            header.appendChild(cell);
        });

        if (this.actionsBuilder) {
            const actionCell = document.createElement('div');
            actionCell.className = cn(
                'w-20 flex-none sticky right-0 bg-surface-container-low border-l border-border z-20',
                this.isGlass && 'bg-white/20 backdrop-blur-md'
            );
            header.appendChild(actionCell);
        }
    }

    private updateVisibleRowsWidth(columns: GridColumn<ITEM>[]) {
        this.renderedRows.forEach(({ element }) => {
            let cellIndex = this.isMultiSelect ? 1 : 0;
            columns.forEach(col => {
                const cell = element.children[cellIndex] as HTMLElement;
                if (cell) {
                    this.applyColumnWidth(cell, col);
                }
                cellIndex++;
            });
        });
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

        for (const [index, row] of this.renderedRows.entries()) {
            if (index < startIndex || index > endIndex) {
                row.element.remove();
                this.renderedRows.delete(index);
            }
        }

        for (let i = startIndex; i <= endIndex; i++) {
            const item = items[i];
            const isSelected = selected.has(item);
            const existing = this.renderedRows.get(i);

            if (!existing) {
                const element = this.createRow(item, i, columns, actions, isSelected);
                content.appendChild(element);
                this.renderedRows.set(i, { element, item });
            } else if (existing.item !== item) {
                this.updateRowContent(existing.element, item, columns, actions, isSelected);
                existing.item = item;
            } else {
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
            'absolute w-full flex items-stretch border-b border-border/50 hover:bg-muted/30 transition-colors group',
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
            checkCell.className = 'w-12 flex-none flex items-center justify-center border-r border-border/50';
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

        columns.forEach((col, index) => {
            const cell = document.createElement('div');
            this.applyColumnWidth(cell, col);
            cell.className = cn(
                'px-4 flex items-center truncate border-r border-border/50 h-full',
                col.cellClass,
                index === columns.length - 1 && 'border-r-0'
            );

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
            actionCell.className = cn(
                'w-20 flex-none flex items-center justify-center gap-1 sticky right-0 z-10 border-l border-border transition-colors',
                isSelected ? 'bg-primary/5' : 'bg-background',
                'group-hover:bg-muted/30'
            );

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

        const actionCell = Array.from(row.children).find(c => (c as HTMLElement).classList.contains('sticky')) as HTMLElement;
        if (actionCell) {
            if (isSelected) {
                actionCell.classList.add('bg-primary/5');
                actionCell.classList.remove('bg-background');
            } else {
                actionCell.classList.remove('bg-primary/5');
                actionCell.classList.add('bg-background');
            }
        }

        if (isSelected) {
            row.classList.add('bg-primary/5');
            row.classList.remove('bg-background');
        } else {
            row.classList.remove('bg-primary/5');
            row.classList.add('bg-background');
        }
    }

    private applyColumnWidth(element: HTMLElement, col: GridColumn<ITEM>) {
        if (col.width) {
            if (col.width.includes('px') || col.width.includes('rem')) {
                element.style.width = col.width;
                element.style.flex = 'none';
                element.classList.add('flex-none');
                element.classList.remove('flex-1');
            } else if (col.width.includes('fr')) {
                element.style.flex = col.width.replace('fr', '');
                element.style.width = '';
                element.classList.remove('flex-none');
                element.classList.remove('flex-1');
            } else {
                element.style.width = col.width;
                element.style.flex = 'none';
                element.classList.add('flex-none');
                element.classList.remove('flex-1');
            }
        } else {
            element.style.width = '';
            element.style.flex = '1';
            element.classList.add('flex-1');
            element.classList.remove('flex-none');
        }
    }

    private clearRenderedRows() {
        this.renderedRows.forEach(row => row.element.remove());
        this.renderedRows.clear();
    }
}
