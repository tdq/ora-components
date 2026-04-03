import { GridColumn, SortConfig, SortDirection } from './types';
import { GridStyles } from './grid-styles';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Icons } from '@/core/icons';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export class GridHeader<ITEM> {
    private element: HTMLElement;

    constructor(
        private columns: GridColumn<ITEM>[],
        private isGlass: boolean,
        private isMultiSelect: boolean,
        private actionCount: number,
        private onSort: (field: string, direction: SortDirection) => void,
        private onSelectAll: (checked: boolean) => void,
        private onColumnsResized: (columns: GridColumn<ITEM>[]) => void
    ) {
        this.element = this.createHeader();
    }

    private createHeader(): HTMLElement {
        const header = document.createElement('div');
        header.className = cn(
            GridStyles.header,
            this.isGlass && GridStyles.headerGlass
        );
        return header;
    }

    render(items: ITEM[], selected: Set<ITEM>, sort: SortConfig) {
        this.element.innerHTML = '';

        if (this.isMultiSelect) {
            const checkCell = document.createElement('div');
            checkCell.className = GridStyles.checkboxCell;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = GridStyles.checkboxInput;

            const allSelected = items.length > 0 && items.every(item => selected.has(item));
            const noneSelected = selected.size === 0;
            const isIndeterminate = !allSelected && !noneSelected && items.some(item => selected.has(item));

            checkbox.checked = allSelected;
            checkbox.indeterminate = isIndeterminate;

            checkbox.addEventListener('change', () => {
                this.onSelectAll(checkbox.checked);
            });

            checkCell.appendChild(checkbox);
            this.element.appendChild(checkCell);
        }

        this.columns.forEach((col, index) => {
            const cell = document.createElement('div');
            this.applyColumnWidth(cell, col);

            cell.className = cn(
                GridStyles.headerCell,
                col.sortable && GridStyles.headerCellSortable,
                col.resizable && 'resizable-column',
                (index > 0 && this.columns[index - 1].resizable) && 'prev-resizable'
            );

            const span = document.createElement('span');
            span.textContent = col.header;
            span.className = 'truncate';
            cell.appendChild(span);

            if (col.sortable) {
                const iconWrapper = document.createElement('span');
                const isCurrent = sort.field === col.field;
                const iconSvg = isCurrent && sort.direction === SortDirection.ASC ? Icons.SORT_UP :
                    isCurrent && sort.direction === SortDirection.DESC ? Icons.SORT_DOWN : Icons.SORT;

                iconWrapper.className = cn(
                    GridStyles.sortIcon,
                    isCurrent ? GridStyles.sortIconActive : GridStyles.sortIconInactive
                );
                iconWrapper.innerHTML = iconSvg;
                cell.appendChild(iconWrapper);

                cell.addEventListener('click', (e) => {
                    if ((e.target as HTMLElement).classList.contains('resize-handle')) return;

                    let nextDirection = SortDirection.ASC;
                    if (isCurrent) {
                        if (sort.direction === SortDirection.ASC) nextDirection = SortDirection.DESC;
                        else if (sort.direction === SortDirection.DESC) nextDirection = SortDirection.NONE;
                    }
                    this.onSort(col.field as string, nextDirection);
                });
            }

            if (col.resizable) {
                const handle = document.createElement('div');
                handle.className = GridStyles.resizeHandle;
                cell.appendChild(handle);

                handle.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const startX = e.pageX;
                    const startWidth = cell.offsetWidth;
                    
                    document.body.style.cursor = 'col-resize';
                    handle.classList.add('active');
                    cell.classList.add(GridStyles.headerCellActive);

                    const onMouseMove = (moveEvent: MouseEvent) => {
                        const newWidth = Math.max(50, startWidth + (moveEvent.pageX - startX));
                        col.width = `${newWidth}px`;
                        this.applyColumnWidth(cell, col);
                        this.onColumnsResized(this.columns);
                    };

                    const onMouseUp = () => {
                        document.body.style.cursor = '';
                        handle.classList.remove('active');
                        cell.classList.remove(GridStyles.headerCellActive);
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });
            }

            this.element.appendChild(cell);
        });

        if (this.actionCount > 0) {
            const actionCell = document.createElement('div');
            actionCell.className = cn(
                GridStyles.actionHeaderCell,
                this.isGlass && GridStyles.actionHeaderCellGlass
            );
            this.element.appendChild(actionCell);
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

    updateColumns(columns: GridColumn<ITEM>[]) {
        this.columns = columns;
    }
}
