import { GridColumn, GridAction, GridRowData, GridGroupHeader } from './types';
import { GridStyles } from './grid-styles';
import { GridRow } from './grid-row';
import { GridGroupRow } from './grid-group-row';

export class GridViewport<ITEM> {
    private element: HTMLElement;
    private contentElement: HTMLElement;
    private rowsContainer: HTMLElement;
    private renderedRows = new Map<number, GridRow<ITEM> | GridGroupRow>();
    private readonly rowHeight = 52;
    private readonly buffer = 5;

    private lastRows: GridRowData<ITEM>[] = [];
    private lastSelected: Set<ITEM> = new Set();
    private ticking = false;

    private activeEditorRow: GridRow<ITEM> | null = null;
    private activeEditorCell: HTMLElement | null = null;

    private resizeObserver: ResizeObserver | null = null;

    constructor(
        private columns: GridColumn<ITEM>[],
        private actions: GridAction<ITEM>[],
        private isMultiSelect: boolean,
        private isEditable: boolean,
        private onToggleSelection: (item: ITEM) => void,
        private onToggleGroup: (groupKey: string) => void,
        private isGlass: boolean = false,
        private onCommit: (item: ITEM) => void = () => {}
    ) {
        this.element = document.createElement('div');
        this.element.className = GridStyles.viewport;
        this.element.tabIndex = -1;

        this.contentElement = document.createElement('div');
        this.contentElement.className = GridStyles.content;
        this.element.appendChild(this.contentElement);

        this.rowsContainer = document.createElement('div');
        this.rowsContainer.className = GridStyles.rowsContainer;
        this.contentElement.appendChild(this.rowsContainer);

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
        this.clearRenderedRows();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    update(rows: GridRowData<ITEM>[], selected: Set<ITEM>) {
        this.lastRows = rows;
        this.lastSelected = selected;
        //const totalHeight = rows.length * this.rowHeight;
        //this.contentElement.style.height = `${totalHeight}px`;
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
                if (row instanceof GridRow) {
                    // Commit any open editor before evicting
                    if (this.activeEditorRow === row && this.activeEditorCell) {
                        row.commitActiveEditor(this.activeEditorCell);
                        this.clearActiveEditor();
                    }
                    row.destroy();
                }
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
                if (existing instanceof GridRow) existing.destroy();
                existing.getElement().remove();
            }
            const groupRow = new GridGroupRow(header, index, (key) => this.onToggleGroup(key), this.isGlass);
            this.rowsContainer.appendChild(groupRow.getElement());
            this.renderedRows.set(index, groupRow);
        }
    }

    private handleTabToNextRow(rowIndex: number) {
        for (let i = rowIndex + 1; i < this.lastRows.length; i++) {
            const rowData = this.lastRows[i];
            if (rowData.type === 'ITEM') {
                const viewportHeight = this.element.clientHeight;
                const targetScrollTop = i * this.rowHeight;
                const currentScrollTop = this.element.scrollTop;
                if (targetScrollTop < currentScrollTop || targetScrollTop + this.rowHeight > currentScrollTop + viewportHeight) {
                    this.element.scrollTop = targetScrollTop - viewportHeight / 2;
                    this.renderVisibleRows(); // force synchronous render so the row exists before rAF
                }
                requestAnimationFrame(() => {
                    const row = this.renderedRows.get(i);
                    if (row instanceof GridRow) {
                        row.activateFirstEditableCell();
                    }
                });
                return;
            }
        }
    }

    private handleTabToPreviousRow(rowIndex: number) {
        for (let i = rowIndex - 1; i >= 0; i--) {
            const rowData = this.lastRows[i];
            if (rowData.type === 'ITEM') {
                const viewportHeight = this.element.clientHeight;
                const targetScrollTop = i * this.rowHeight;
                const currentScrollTop = this.element.scrollTop;
                if (targetScrollTop < currentScrollTop || targetScrollTop + this.rowHeight > currentScrollTop + viewportHeight) {
                    this.element.scrollTop = targetScrollTop - viewportHeight / 2;
                    this.renderVisibleRows(); // force synchronous render so the row exists before rAF
                }
                requestAnimationFrame(() => {
                    const row = this.renderedRows.get(i);
                    if (row instanceof GridRow) {
                        row.activateLastEditableCell();
                    }
                });
                return;
            }
        }
    }

    private handleEditorActivate(row: GridRow<ITEM>, cell: HTMLElement) {
        if (this.activeEditorRow && this.activeEditorCell) {
            if (this.activeEditorRow !== row || this.activeEditorCell !== cell) {
                this.activeEditorRow.commitActiveEditor(this.activeEditorCell);
            }
        }
        this.activeEditorRow = row;
        this.activeEditorCell = cell;
    }

    clearActiveEditor() {
        this.activeEditorRow = null;
        this.activeEditorCell = null;
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
                level,
                this.isGlass,
                this.onCommit,
                (rowIndex) => this.handleTabToNextRow(rowIndex),
                (rowIndex) => this.handleTabToPreviousRow(rowIndex),
                (r, cell) => this.handleEditorActivate(r, cell)
            );
            this.rowsContainer.appendChild(row.getElement());
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
        if (this.activeEditorRow && this.activeEditorCell) {
            this.activeEditorRow.commitActiveEditor(this.activeEditorCell);
            this.clearActiveEditor();
        }
        this.renderedRows.forEach(row => {
            if (row instanceof GridRow) row.destroy();
            row.getElement().remove();
        });
        this.renderedRows.clear();
        // If activeEditorRow/Cell weren't cleared by the guard above, null them here
        this.activeEditorRow = null;
        this.activeEditorCell = null;
    }
}
