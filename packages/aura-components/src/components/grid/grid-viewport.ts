import { GridColumn, GridAction, GridRowData, GridGroupHeader } from './types';
import { GridStyles } from './grid-styles';
import { GridRow } from './grid-row';
import { GridGroupRow } from './grid-group-row';

export class GridViewport<ITEM> {
    private element: HTMLElement;
    private contentElement: HTMLElement;
    private renderedRows = new Map<number, GridRow<ITEM> | GridGroupRow>();
    private readonly rowHeight = 52;
    private readonly buffer = 5;

    private lastRows: GridRowData<ITEM>[] = [];
    private lastSelected: Set<ITEM> = new Set();
    private ticking = false;

    private resizeObserver: ResizeObserver | null = null;

    constructor(
        private columns: GridColumn<ITEM>[],
        private actions: GridAction<ITEM>[],
        private isMultiSelect: boolean,
        private isEditable: boolean,
        private onToggleSelection: (item: ITEM) => void,
        private onToggleGroup: (groupKey: string) => void
    ) {
        this.element = document.createElement('div');
        this.element.className = GridStyles.viewport;
        this.element.tabIndex = -1;

        this.contentElement = document.createElement('div');
        this.contentElement.className = GridStyles.content;
        this.element.appendChild(this.contentElement);

        this.element.addEventListener('scroll', () => {
            if (!this.ticking) {
                requestAnimationFrame(() => {
                    this.handleScroll();
                    this.ticking = false;
                });
                this.ticking = true;
            }
        });

        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.renderVisibleRows();
            });
            this.resizeObserver.observe(this.element);
        }
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    update(rows: GridRowData<ITEM>[], selected: Set<ITEM>) {
        this.lastRows = rows;
        this.lastSelected = selected;
        const totalHeight = rows.length * this.rowHeight;
        this.contentElement.style.height = `${totalHeight}px`;
        this.renderVisibleRows();
    }

    private handleScroll() {
        this.renderVisibleRows();
    }

    private renderVisibleRows() {
        const scrollTop = this.element.scrollTop;
        const viewportHeight = this.element.clientHeight;
        const rowsData = this.lastRows;
        const count = rowsData.length;

        if (count === 0) {
            this.clearRenderedRows();
            return;
        }

        const startIndex = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.buffer);
        const endIndex = Math.min(count - 1, Math.floor((scrollTop + viewportHeight) / this.rowHeight) + this.buffer);

        for (const [index, row] of this.renderedRows.entries()) {
            if (index < startIndex || index > endIndex) {
                row.getElement().remove();
                this.renderedRows.delete(index);
            }
        }

        for (let i = startIndex; i <= endIndex; i++) {
            const rowData = rowsData[i];
            const existing = this.renderedRows.get(i);

            if (rowData.type === 'GROUP_HEADER') {
                this.renderGroupRow(rowData, i, existing);
            } else {
                this.renderItemRow(rowData.data, i, rowData.level, existing);
            }
        }
    }

    private renderGroupRow(header: GridGroupHeader, index: number, existing?: GridRow<ITEM> | GridGroupRow) {
        if (existing instanceof GridGroupRow) {
            existing.update(header, index);
        } else {
            if (existing) {
                existing.getElement().remove();
            }
            const groupRow = new GridGroupRow(header, index, (key) => this.onToggleGroup(key));
            this.contentElement.appendChild(groupRow.getElement());
            this.renderedRows.set(index, groupRow);
        }
    }

    private renderItemRow(item: ITEM, index: number, level: number, existing?: GridRow<ITEM> | GridGroupRow) {
        const isSelected = this.lastSelected.has(item);
        if (existing instanceof GridRow) {
            if (existing.getItem() === item) {
                existing.updateSelection(isSelected);
            } else {
                existing.update(item, index, isSelected, level);
            }
        } else {
            if (existing) {
                existing.getElement().remove();
            }
            const row = new GridRow(
                item,
                index,
                this.columns,
                this.actions,
                isSelected,
                this.isMultiSelect,
                this.isEditable,
                this.onToggleSelection,
                level
            );
            this.contentElement.appendChild(row.getElement());
            this.renderedRows.set(index, row);
        }
    }

    updateColumns(columns: GridColumn<ITEM>[]) {
        this.columns = columns;
        this.renderedRows.forEach(row => {
            if (row instanceof GridRow) {
                row.updateColumns(columns);
            }
        });
    }

    addHeader(headerElement: HTMLElement) {
        this.element.insertBefore(headerElement, this.contentElement);
    }

    getElement(): HTMLElement {
        return this.element;
    }

    private clearRenderedRows() {
        this.renderedRows.forEach(row => row.getElement().remove());
        this.renderedRows.clear();
    }
}
