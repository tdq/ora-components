import { Observable, combineLatest, BehaviorSubject, fromEvent, of } from 'rxjs';
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
    private enabled$: Observable<boolean> = of(true);
    private isGlass: boolean = false;
    private isEditable: boolean = false;
    private isMultiSelect: boolean = false;

    private selectedItems = new BehaviorSubject<Set<ITEM>>(new Set());
    private rowHeight = 52; 

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

    withEnabled(enabled: Observable<boolean>): this {
        this.enabled$ = enabled;
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
            'flex flex-row items-center border-b border-border bg-muted/50 font-medium px-4 h-[52px] sticky top-0 z-10',
             this.isGlass && 'bg-white/20'
        );
        container.appendChild(header);

        const viewport = document.createElement('div');
        viewport.className = 'flex-1 overflow-y-auto relative';
        container.appendChild(viewport);

        const content = document.createElement('div');
        content.className = 'relative w-full';
        viewport.appendChild(content);

        const columns = this.columnsBuilder ? this.columnsBuilder.build() : [];
        const actions = this.actionsBuilder ? this.actionsBuilder.build() : [];

        let currentItems: ITEM[] = [];

        const render = () => {
             this.renderVisibleRows(viewport, content, currentItems, columns, actions);
        };

        const sub = combineLatest([this.items$, this.height$]).subscribe(([items, height]) => {
            currentItems = items;
            container.style.height = `${height}px`;
            const totalHeight = items.length * this.rowHeight;
            content.style.height = `${totalHeight}px`;
            
            // Re-render header to update selection state if needed or just once? 
            // Header rendering depends on columns, which are static here. 
            // But "select all" checkbox might need update.
            this.renderHeader(header, columns, items, viewport);
            
            render();
        });
        registerDestroy(container, () => sub.unsubscribe());

        const scrollHandler = () => {
            render();
        };
        viewport.addEventListener('scroll', scrollHandler);
        registerDestroy(container, () => viewport.removeEventListener('scroll', scrollHandler));

        return container;
    }

    private renderHeader(header: HTMLElement, columns: GridColumn<ITEM>[], items: ITEM[], viewport: HTMLElement) {
        header.innerHTML = '';
        
        if (this.isMultiSelect) {
            const checkCell = document.createElement('div');
            checkCell.className = 'w-10 flex-none flex items-center justify-center';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'rounded border-gray-300 w-4 h-4';
            
            checkbox.addEventListener('change', (e) => {
                const checked = (e.target as HTMLInputElement).checked;
                if (checked) {
                    this.selectedItems.next(new Set(items));
                } else {
                    this.selectedItems.next(new Set());
                }
                viewport.dispatchEvent(new Event('scroll'));
            });
            
            checkCell.appendChild(checkbox);
            header.appendChild(checkCell);
        }

        columns.forEach(col => {
            const cell = document.createElement('div');
            let widthClass = 'flex-1';
            let styleWidth = '';
            if (col.width) {
                 if (col.width.includes('px') || col.width.includes('rem')) {
                    widthClass = 'flex-none';
                    styleWidth = col.width;
                 } else {
                    styleWidth = col.width;
                 }
            }
            
            cell.className = cn('px-4 py-2 flex items-center text-left truncate', widthClass);
            if (styleWidth) cell.style.width = styleWidth;
            
            cell.textContent = col.header;
            if (col.sortable) {
                cell.classList.add('cursor-pointer', 'hover:text-primary');
            }
            header.appendChild(cell);
        });

        if (this.actionsBuilder) {
             const actionCell = document.createElement('div');
             actionCell.className = 'w-20 flex-none';
             header.appendChild(actionCell);
        }
        
        // Add scrollbar spacer
        const spacer = document.createElement('div');
        spacer.className = 'w-4 flex-none'; // Approximate scrollbar width
        header.appendChild(spacer);
    }

    private renderVisibleRows(
        viewport: HTMLElement, 
        content: HTMLElement, 
        items: ITEM[], 
        columns: GridColumn<ITEM>[],
        actions: GridAction<ITEM>[]
    ) {
        content.innerHTML = '';
        
        const scrollTop = viewport.scrollTop;
        const viewportHeight = viewport.clientHeight;
        
        const count = items.length;
        if (count === 0) return;

        const startIndex = Math.max(0, Math.floor(scrollTop / this.rowHeight));
        // Add buffer
        const buffer = 5;
        const endIndex = Math.min(count - 1, Math.floor((scrollTop + viewportHeight) / this.rowHeight) + buffer);
        
        const adjustedStartIndex = Math.max(0, startIndex - buffer);

        for (let i = adjustedStartIndex; i <= endIndex; i++) {
            const item = items[i];
            const row = this.createRow(item, i, columns, actions);
            content.appendChild(row);
        }
    }

    private createRow(item: ITEM, index: number, columns: GridColumn<ITEM>[], actions: GridAction<ITEM>[]): HTMLElement {
        const row = document.createElement('div');
        row.className = cn(
            'absolute w-full flex items-center border-b border-border/50 hover:bg-muted/30 transition-colors',
            this.isEditable && 'cursor-text'
        );
        row.style.top = `${index * this.rowHeight}px`;
        row.style.height = `${this.rowHeight}px`;

        if (this.isMultiSelect) {
             const checkCell = document.createElement('div');
             checkCell.className = 'w-10 flex-none flex items-center justify-center';
             const checkbox = document.createElement('input');
             checkbox.type = 'checkbox';
             checkbox.className = 'rounded border-gray-300 w-4 h-4';
             
             const selected = this.selectedItems.value.has(item);
             checkbox.checked = selected;
             
             checkbox.addEventListener('change', (e) => {
                 const checked = (e.target as HTMLInputElement).checked;
                 const current = this.selectedItems.value;
                 if (checked) current.add(item);
                 else current.delete(item);
                 this.selectedItems.next(current);
             });

             checkCell.appendChild(checkbox);
             row.appendChild(checkCell);
        }

        columns.forEach(col => {
            const cell = document.createElement('div');
            let widthClass = 'flex-1';
            let styleWidth = '';
            if (col.width) {
                 if (col.width.includes('px') || col.width.includes('rem')) {
                    widthClass = 'flex-none';
                    styleWidth = col.width;
                 } else {
                    styleWidth = col.width;
                 }
            }

            cell.className = cn('px-4 flex items-center truncate', widthClass);
            if (styleWidth) cell.style.width = styleWidth;

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
            actionCell.className = 'w-20 flex-none flex items-center justify-center gap-2';
            actions.forEach(action => {
                const btn = document.createElement('button');
                btn.className = 'p-1 hover:bg-muted rounded text-foreground/70 hover:text-foreground';
                if (action.icon) {
                     const i = document.createElement('i');
                     // Assuming icon is a class name like 'fas fa-edit' or similar
                     i.className = action.icon;
                     btn.appendChild(i);
                } else {
                    btn.textContent = action.label;
                    btn.className = cn(btn.className, 'text-xs border px-1');
                }
                btn.onclick = (e) => {
                    e.stopPropagation();
                    action.onClick(item);
                };
                actionCell.appendChild(btn);
            });
            row.appendChild(actionCell);
        }

        return row;
    }
}
