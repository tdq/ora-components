import { Subscription } from 'rxjs';
import { GridColumn, GridAction } from './types';
import { GridStyles } from './grid-styles';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export class GridRow<ITEM> {
    private element: HTMLElement;
    private actionCell?: HTMLElement;
    private checkbox?: HTMLInputElement;
    private listenerAbort?: AbortController;
    private columnSubscriptions: Subscription[] = [];
    private readonly rowHeight = 52;

    constructor(
        private item: ITEM,
        private index: number,
        private columns: GridColumn<ITEM>[],
        private actions: GridAction<ITEM>[],
        private isSelected: boolean,
        private isMultiSelect: boolean,
        private isEditable: boolean,
        private onToggleSelection: (item: ITEM) => void,
        private level: number = 0,
        private isGlass: boolean = false
    ) {
        this.element = this.createRow();
    }

    private createRow(): HTMLElement {
        const row = document.createElement('div');
        row.className = cn(
            GridStyles.row,
            !this.isGlass && this.index % 2 === 1 && GridStyles.rowOdd,
            this.isGlass && GridStyles.rowGlass,
            this.isEditable && GridStyles.rowEditable,
            this.isSelected && GridStyles.rowSelected
        );
        row.style.transform = `translateY(${this.index * this.rowHeight}px)`;
        row.style.height = `${this.rowHeight}px`;

        this.populateRow(row);
        return row;
    }

    private populateRow(row: HTMLElement) {
        this.listenerAbort = new AbortController();
        const { signal } = this.listenerAbort;

        let firstCell: HTMLElement | null = null;

        if (this.isMultiSelect) {
            const checkCell = document.createElement('div');
            checkCell.className = GridStyles.checkboxCell;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = GridStyles.checkboxInput;
            checkbox.checked = this.isSelected;

            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.onToggleSelection(this.item);
            }, { signal });

            this.checkbox = checkbox;
            checkCell.appendChild(checkbox);
            row.appendChild(checkCell);
            firstCell = checkCell;
        }

        this.columns.forEach((col, index) => {
            const cell = document.createElement('div');
            this.populateCell(cell, col, signal);
            row.appendChild(cell);
            if (!firstCell && index === 0) {
                firstCell = cell;
            }
        });

        if (firstCell && this.level > 0) {
            firstCell.style.paddingLeft = `${(this.level * 24) + 16}px`; // 16px is standard cell padding
        }

        if (this.actions.length > 0) {
            const actionCell = document.createElement('div');
            actionCell.className = cn(
                GridStyles.actionCell,
                this.isSelected ? GridStyles.actionCellSelected : (this.isGlass ? GridStyles.actionCellGlass : (this.index % 2 === 1 ? GridStyles.actionCellOdd : GridStyles.actionCellEven)),
                !this.isGlass && 'group-hover:bg-surface-variant/20 dark:group-hover:bg-slate-800/60'
            );

            this.actions.forEach((action) => {
                const wrapper = document.createElement('div');
                wrapper.className = GridStyles.tooltipWrapper;

                const btn = document.createElement('button');
                btn.className = GridStyles.actionButton;
                btn.setAttribute('aria-label', action.label);

                const iconWrapper = document.createElement('span');
                iconWrapper.className = 'w-4 h-4 inline-flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:block';
                iconWrapper.innerHTML = action.icon;
                btn.appendChild(iconWrapper);

                const tooltip = document.createElement('div');
                tooltip.className = GridStyles.tooltip;
                tooltip.setAttribute('popover', 'manual');
                tooltip.textContent = action.label;

                btn.addEventListener('mouseenter', () => {
                    const rect = btn.getBoundingClientRect();
                    tooltip.style.left = `${rect.left + rect.width / 2}px`;
                    tooltip.style.top = `${rect.top}px`;
                    if (!tooltip.matches(':popover-open')) {
                        tooltip.showPopover();
                    }
                }, { signal });

                btn.addEventListener('mouseleave', () => {
                    if (tooltip.matches(':popover-open')) {
                        tooltip.hidePopover();
                    }
                }, { signal });

                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    action.onClick(this.item);
                }, { signal });

                if (action.enable) {
                    btn.disabled = !action.enable(this.item);
                }
                if (action.visible) {
                    const visible = action.visible(this.item);
                    wrapper.style.display = visible ? '' : 'none';
                }

                wrapper.appendChild(btn);
                wrapper.appendChild(tooltip);
                actionCell.appendChild(wrapper);
            });

            this.actionCell = actionCell;
            row.appendChild(actionCell);
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

    private populateCell(cell: HTMLElement, col: GridColumn<ITEM>, signal: AbortSignal) {
        cell.innerHTML = '';
        this.applyColumnWidth(cell, col);
        
        if (col.cellClass) {
            const cls = col.cellClass(this.item);
            cell.className = cn(GridStyles.cell, cls);
        } else {
            cell.className = cn(GridStyles.cell);
        }

        const content = col.render(this.item);
        if (this.isEditable && col.editable && col.onEdit) {
            const onEdit = col.onEdit;
            const rawContent = content instanceof HTMLElement ? content.textContent ?? '' : (content != null ? String(content) : '');
            const span = document.createElement('span');
            span.className = 'outline-none block w-full';
            span.contentEditable = 'true';
            span.textContent = rawContent;
            let cancelled = false;
            span.addEventListener('blur', () => {
                if (!cancelled) {
                    onEdit(this.item, col.field, span.textContent ?? '');
                }
                cancelled = false;
            }, { signal });
            span.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    span.blur();
                } else if (e.key === 'Escape') {
                    cancelled = true;
                    span.textContent = String(col.render(this.item));
                    span.blur();
                }
            }, { signal });
            cell.appendChild(span);
        } else if (content instanceof HTMLElement) {
            cell.appendChild(content);
        } else {
            cell.textContent = content != null ? String(content) : '';
        }
    }

    getElement(): HTMLElement {
        return this.element;
    }

    getItem(): ITEM {
        return this.item;
    }

    update(item: ITEM, index: number, isSelected: boolean, level: number = 0) {
        this.item = item;
        this.index = index;
        this.isSelected = isSelected;
        this.level = level;
        this.actionCell = undefined;
        this.checkbox = undefined;
        this.element.querySelectorAll('[popover]').forEach(el => {
            const htmlEl = el as HTMLElement;
            if (htmlEl.matches(':popover-open')) htmlEl.hidePopover();
        });
        this.columnSubscriptions.forEach(s => s.unsubscribe());
        this.columnSubscriptions = [];
        this.listenerAbort?.abort();
        this.element.innerHTML = '';
        this.element.className = cn(
            GridStyles.row,
            !this.isGlass && this.index % 2 === 1 && GridStyles.rowOdd,
            this.isGlass && GridStyles.rowGlass,
            this.isEditable && GridStyles.rowEditable,
            this.isSelected && GridStyles.rowSelected
        );
        this.element.style.transform = `translateY(${this.index * this.rowHeight}px)`;
        this.populateRow(this.element);
    }

    updateSelection(isSelected: boolean) {
        if (this.isSelected === isSelected) return;
        this.isSelected = isSelected;

        if (this.checkbox) {
            this.checkbox.checked = isSelected;
        }

        if (this.actionCell) {
            this.actionCell.className = cn(
                GridStyles.actionCell,
                this.isSelected ? GridStyles.actionCellSelected : (this.isGlass ? GridStyles.actionCellGlass : (this.index % 2 === 1 ? GridStyles.actionCellOdd : GridStyles.actionCellEven)),
                !this.isGlass && 'group-hover:bg-surface-variant/20 dark:group-hover:bg-slate-800/60'
            );
        }

        this.element.className = cn(
            GridStyles.row,
            !this.isGlass && this.index % 2 === 1 && GridStyles.rowOdd,
            this.isGlass && GridStyles.rowGlass,
            this.isEditable && GridStyles.rowEditable,
            this.isSelected && GridStyles.rowSelected
        );
    }

    destroy(): void {
        this.columnSubscriptions.forEach(s => s.unsubscribe());
        this.columnSubscriptions = [];
        this.listenerAbort?.abort();
    }

    updateColumns(columns: GridColumn<ITEM>[]) {
        this.columnSubscriptions.forEach(s => s.unsubscribe());
        this.columnSubscriptions = [];
        this.columns = columns;
        
        const signal = this.listenerAbort?.signal;
        if (!signal) return;

        let cellIndex = this.isMultiSelect ? 1 : 0;
        columns.forEach(col => {
            const cell = this.element.children[cellIndex] as HTMLElement;
            if (cell) {
                this.populateCell(cell, col, signal);
            }
            cellIndex++;
        });
    }
}
