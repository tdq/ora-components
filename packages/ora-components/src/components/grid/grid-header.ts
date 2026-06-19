import { BehaviorSubject, Subscription, skip, of } from 'rxjs';
import { GridColumn, SortConfig, SortDirection } from './types';
import { GridStyles, getAlignClass, applyColumnWidth } from './grid-styles';
import { CheckboxBuilder } from '../checkbox/checkbox';
import type { CheckboxValue } from '../checkbox/checkbox';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Icons } from '@/core/icons';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export class GridHeader<ITEM> {
    private element: HTMLElement;
    private headerCheckboxSub?: Subscription;

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

    private lastColumns?: GridColumn<ITEM>[];
    private currentSort?: SortConfig;

    render(items: ITEM[], selected: Set<ITEM>, sort: SortConfig) {
        this.currentSort = sort;
        const columnsChanged = this.columns !== this.lastColumns;
        this.lastColumns = this.columns;
        
        const expectedChildrenCount = (this.isMultiSelect ? 1 : 0) + this.columns.length + (this.actionCount > 0 ? 1 : 0);
        const reuse = !columnsChanged && this.element.children.length === expectedChildrenCount;

        if (!reuse) {
            this.element.innerHTML = '';
        }

        let childIdx = 0;

        if (this.isMultiSelect) {
            const checkCell = reuse ? (this.element.children[childIdx++] as HTMLElement) : document.createElement('div');
            if (!reuse) {
                checkCell.className = GridStyles.checkboxCell;
            }

            const allSelected = items.length > 0 && items.every(item => selected.has(item));
            const isIndeterminate = !allSelected && selected.size > 0 && items.some(item => selected.has(item));
            const initialValue: CheckboxValue = allSelected ? true : isIndeterminate ? 'intermediate' : false;
            
            // For now, always re-create checkbox to ensure correct RxJS binding
            // Optimization of the checkbox itself would require more state management
            while (checkCell.firstChild) {
                checkCell.removeChild(checkCell.firstChild);
            }

            const value$ = new BehaviorSubject<CheckboxValue>(initialValue);
            this.headerCheckboxSub?.unsubscribe();
            this.headerCheckboxSub = value$.pipe(skip(1)).subscribe(checked => {
                if (checked !== 'intermediate') {
                    this.onSelectAll(checked);
                }
            });

            const checkboxEl = new CheckboxBuilder()
                .asGlass(this.isGlass)
                .withValue(value$)
                .withAriaLabel(of('Select all'))
                .build();

            checkCell.appendChild(checkboxEl);
            if (!reuse) this.element.appendChild(checkCell);
        }

        this.columns.forEach((col, index) => {
            const cell = reuse ? (this.element.children[childIdx++] as HTMLElement) : document.createElement('div');
            applyColumnWidth(cell, col);

            const alignClass = getAlignClass(col.align);
            const targetClass = cn(
                GridStyles.headerCell,
                alignClass,
                col.sortable && GridStyles.headerCellSortable,
                col.resizable && 'resizable-column',
                (index > 0 && this.columns[index - 1].resizable) && 'prev-resizable'
            );

            if (cell.className !== targetClass) {
                cell.className = targetClass;
            }

            // Update content only if changed
            const headerText = col.header;
            let span = cell.querySelector('span.truncate') as HTMLElement;
            if (!span) {
                while (cell.firstChild) cell.removeChild(cell.firstChild);
                span = document.createElement('span');
                span.className = 'truncate';
                cell.appendChild(span);
            }
            if (span.textContent !== headerText) {
                span.textContent = headerText;
            }

            if (col.sortable) {
                let iconWrapper = cell.querySelector(`.${GridStyles.sortIcon.split(' ')[0]}`) as HTMLElement;
                const isCurrent = sort.field === col.field;
                const iconSvg = isCurrent && sort.direction === SortDirection.ASC ? Icons.SORT_UP :
                    isCurrent && sort.direction === SortDirection.DESC ? Icons.SORT_DOWN : Icons.SORT;

                // Make the sortable header keyboard-navigable.
                // `aria-sort` requires a `columnheader`/`rowheader` role contained in a `row`,
                // which this grid doesn't model. Convey sort state via `aria-label` instead.
                const sortStateLabel = isCurrent && sort.direction === SortDirection.ASC ? 'sorted ascending' :
                    isCurrent && sort.direction === SortDirection.DESC ? 'sorted descending' : 'not sorted';
                cell.tabIndex = 0;
                cell.setAttribute('role', 'button');
                cell.setAttribute('aria-label', `${headerText}, ${sortStateLabel}, activate to sort`);

                if (!iconWrapper) {
                    iconWrapper = document.createElement('span');
                    cell.appendChild(iconWrapper);
                }

                const iconClass = cn(
                    GridStyles.sortIcon,
                    isCurrent ? GridStyles.sortIconActive : GridStyles.sortIconInactive
                );
                if (iconWrapper.className !== iconClass) {
                    iconWrapper.className = iconClass;
                }
                if (iconWrapper.innerHTML !== iconSvg) {
                    iconWrapper.innerHTML = iconSvg;
                }

                if (!reuse) {
                    const triggerSort = () => {
                        let nextDirection = SortDirection.ASC;
                        if (this.currentSort?.field === col.field) {
                            if (this.currentSort.direction === SortDirection.ASC) nextDirection = SortDirection.DESC;
                            else if (this.currentSort.direction === SortDirection.DESC) nextDirection = SortDirection.NONE;
                        }
                        this.onSort(col.field as string, nextDirection);
                    };

                    cell.addEventListener('click', (e) => {
                        if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
                        triggerSort();
                    });

                    cell.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            triggerSort();
                        }
                    });
                }
            }

            if (col.resizable) {
                let handle = cell.querySelector('.resize-handle') as HTMLElement;
                if (!handle) {
                    handle = document.createElement('div');
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
                            applyColumnWidth(cell, col);
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
            }

            if (!reuse) this.element.appendChild(cell);
        });

        if (this.actionCount > 0) {
            const actionCell = reuse ? (this.element.children[childIdx++] as HTMLElement) : document.createElement('div');
            const targetClass = cn(
                GridStyles.actionHeaderCell,
                this.isGlass && GridStyles.actionHeaderCellGlass
            );
            if (actionCell.className !== targetClass) {
                actionCell.className = targetClass;
            }
            actionCell.style.width = `${this.actionCount * 40}px`;
            if (!reuse) this.element.appendChild(actionCell);
        }
    }

    getElement(): HTMLElement {
        return this.element;
    }

    updateColumns(columns: GridColumn<ITEM>[]) {
        this.columns = columns;
    }

    destroy(): void {
        this.headerCheckboxSub?.unsubscribe();
    }
}
