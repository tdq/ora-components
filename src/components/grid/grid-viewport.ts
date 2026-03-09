import { GridColumn, GridAction } from './types';
import { GridStyles } from './grid-styles';
import { GridRow } from './grid-row';

export class GridViewport<ITEM> {
    private element: HTMLElement;
    private contentElement: HTMLElement;
    private renderedRows = new Map<number, GridRow<ITEM>>();
    private readonly rowHeight = 52;
    private readonly buffer = 5;

    private lastItems: ITEM[] = [];
    private lastSelected: Set<ITEM> = new Set();

    constructor(
        private columns: GridColumn<ITEM>[],
        private actions: GridAction<ITEM>[],
        private isMultiSelect: boolean,
        private isEditable: boolean,
        private onToggleSelection: (item: ITEM) => void
    ) {
        this.element = document.createElement('div');
        this.element.className = GridStyles.viewport;
        this.element.tabIndex = -1;

        this.contentElement = document.createElement('div');
        this.contentElement.className = GridStyles.content;
        this.element.appendChild(this.contentElement);

        this.element.addEventListener('scroll', () => this.handleScroll());
    }

    update(items: ITEM[], selected: Set<ITEM>) {
        this.lastItems = items;
        this.lastSelected = selected;
        const totalHeight = items.length * this.rowHeight;
        this.contentElement.style.height = `${totalHeight}px`;
        this.renderVisibleRows();
    }

    private handleScroll() {
        this.renderVisibleRows();
    }

    private renderVisibleRows() {
        const scrollTop = this.element.scrollTop;
        const viewportHeight = this.element.clientHeight;
        const items = this.lastItems;
        const selected = this.lastSelected;
        const count = items.length;

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
            const item = items[i];
            const isSelected = selected.has(item);
            const existing = this.renderedRows.get(i);

            if (!existing) {
                const row = new GridRow(
                    item,
                    i,
                    this.columns,
                    this.actions,
                    isSelected,
                    this.isMultiSelect,
                    this.isEditable,
                    this.onToggleSelection
                );
                this.contentElement.appendChild(row.getElement());
                this.renderedRows.set(i, row);
            } else if (existing.getItem() !== item) {
                existing.update(item, i, isSelected);
            } else {
                existing.updateSelection(isSelected);
            }
        }
    }

    updateColumns(columns: GridColumn<ITEM>[]) {
        this.columns = columns;
        this.renderedRows.forEach(row => row.updateColumns(columns));
    }

    addHeader(headerElement: HTMLElement) {
        // In the original implementation, header is inserted BEFORE contentElement inside viewport
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
