import { GridColumn, GridAction } from './types';
import { GridStyles } from './grid-styles';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export class GridRow<ITEM> {
    private element: HTMLElement;
    private readonly rowHeight = 52;

    constructor(
        private item: ITEM,
        private index: number,
        private columns: GridColumn<ITEM>[],
        private actions: GridAction<ITEM>[],
        private isSelected: boolean,
        private isMultiSelect: boolean,
        private isEditable: boolean,
        private onToggleSelection: (item: ITEM) => void
    ) {
        this.element = this.createRow();
    }

    private createRow(): HTMLElement {
        const row = document.createElement('div');
        row.className = cn(
            GridStyles.row,
            this.index % 2 === 1 && GridStyles.rowOdd,
            this.isEditable && GridStyles.rowEditable,
            this.isSelected && GridStyles.rowSelected
        );
        row.style.top = `${this.index * this.rowHeight}px`;
        row.style.height = `${this.rowHeight}px`;

        this.populateRow(row);
        return row;
    }

    private populateRow(row: HTMLElement) {
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
            });

            checkCell.appendChild(checkbox);
            row.appendChild(checkCell);
        }

        this.columns.forEach((col) => {
            const cell = document.createElement('div');
            this.applyColumnWidth(cell, col);
            cell.className = cn(GridStyles.cell, col.cellClass);

            const content = col.render(this.item);
            if (content instanceof HTMLElement) {
                cell.appendChild(content);
            } else {
                cell.textContent = String(content);
            }
            row.appendChild(cell);
        });

        if (this.actions.length > 0) {
            const actionCell = document.createElement('div');
            actionCell.className = cn(
                GridStyles.actionCell,
                this.isSelected ? GridStyles.actionCellSelected : (this.index % 2 === 1 ? GridStyles.actionCellOdd : GridStyles.actionCellEven),
                'group-hover:bg-surface-variant/20 dark:group-hover:bg-slate-800/60'
            );

            this.actions.forEach(action => {
                const btn = document.createElement('button');
                btn.className = GridStyles.actionButton;
                btn.title = action.label;

                if (action.icon) {
                    const icon = document.createElement('i');
                    icon.className = action.icon;
                    btn.appendChild(icon);
                } else {
                    btn.textContent = action.label;
                    btn.className = cn(btn.className, GridStyles.actionButtonText);
                }

                btn.onclick = (e) => {
                    e.stopPropagation();
                    action.onClick(this.item);
                };
                actionCell.appendChild(btn);
            });
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

    getElement(): HTMLElement {
        return this.element;
    }

    getItem(): ITEM {
        return this.item;
    }

    update(item: ITEM, index: number, isSelected: boolean) {
        this.item = item;
        this.index = index;
        this.isSelected = isSelected;
        this.element.innerHTML = '';
        this.element.className = cn(
            GridStyles.row,
            this.index % 2 === 1 && GridStyles.rowOdd,
            this.isEditable && GridStyles.rowEditable,
            this.isSelected && GridStyles.rowSelected
        );
        this.element.style.top = `${this.index * this.rowHeight}px`;
        this.populateRow(this.element);
    }

    updateSelection(isSelected: boolean) {
        this.isSelected = isSelected;
        if (this.isMultiSelect) {
            const checkbox = this.element.querySelector('input[type="checkbox"]') as HTMLInputElement;
            if (checkbox) checkbox.checked = isSelected;
        }

        const actionCell = Array.from(this.element.children).find(c => (c as HTMLElement).classList.contains('sticky')) as HTMLElement;
        if (actionCell) {
            if (isSelected) {
                actionCell.classList.add('bg-primary/10');
                actionCell.classList.remove('bg-background', 'bg-surface-container-low/20');
            } else {
                actionCell.classList.remove('bg-primary/10');
                if (this.index % 2 === 1) {
                    actionCell.classList.add('bg-surface-container-low/20');
                    actionCell.classList.remove('bg-background');
                } else {
                    actionCell.classList.add('bg-background');
                    actionCell.classList.remove('bg-surface-container-low/20');
                }
            }
        }

        if (isSelected) {
            this.element.classList.add('bg-primary/10', 'border-l-primary');
            this.element.classList.remove('border-l-transparent');
        } else {
            this.element.classList.remove('bg-primary/10', 'border-l-primary');
            this.element.classList.add('border-l-transparent');
        }
    }

    updateColumns(columns: GridColumn<ITEM>[]) {
        this.columns = columns;
        let cellIndex = this.isMultiSelect ? 1 : 0;
        columns.forEach(col => {
            const cell = this.element.children[cellIndex] as HTMLElement;
            if (cell) {
                this.applyColumnWidth(cell, col);
            }
            cellIndex++;
        });
    }
}
