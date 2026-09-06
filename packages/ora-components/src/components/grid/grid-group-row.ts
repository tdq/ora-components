import { GridGroupHeader } from './types';
import { GridStyles, GRID_ROW_HEIGHT, toAriaRowIndex } from './grid-styles';
import { Icons } from '@/core/icons';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export class GridGroupRow {
    private element: HTMLElement;

    constructor(
        private header: GridGroupHeader,
        private index: number,
        private onToggle: (groupKey: string) => void,
        private isGlass: boolean = false,
        private contentWidth: number = 0,
        private readonly rowHeight: number = GRID_ROW_HEIGHT
    ) {
        this.element = this.createGroupRow();
    }

    private createGroupRow(): HTMLElement {
        const row = document.createElement('div');
        // ARIA grid pattern: group rows are flattened into the same rowgroup as item rows
        // (GridViewport), and GridBuilder's aria-rowcount already counts them (see
        // GridRowData/GROUP_HEADER handling in grid-logic.ts) — they need the matching
        // role="row" + aria-rowindex to actually be reachable in the accessible tree.
        row.setAttribute('role', 'row');
        row.setAttribute('aria-rowindex', String(toAriaRowIndex(this.index)));
        row.className = cn(
            GridStyles.groupRow,
            this.isGlass && GridStyles.groupRowGlass
        );
        row.style.transform = `translateY(${this.index * this.rowHeight}px)`;
        row.style.height = `${this.rowHeight}px`;
        row.style.paddingLeft = `${this.header.level * 24}px`;
        if (this.contentWidth > 0) {
            row.style.minWidth = `${this.contentWidth}px`;
        }

        row.onclick = () => this.onToggle(this.header.groupKey);

        // A group row has one logical cell (toggle + label), not one per column — rowheader
        // (rather than gridcell) is the ARIA-correct role for a cell that identifies/describes
        // the row instead of holding a per-column value.
        const cell = document.createElement('div');
        cell.setAttribute('role', 'rowheader');
        cell.className = 'flex items-center flex-1 min-w-0';
        row.appendChild(cell);

        const toggle = document.createElement('div');
        toggle.className = cn(
            GridStyles.groupToggle,
            this.header.isExpanded && GridStyles.groupToggleExpanded
        );
        toggle.innerHTML = Icons.CHEVRON_RIGHT;
        cell.appendChild(toggle);

        const content = document.createElement('div');
        content.className = GridStyles.groupContent;

        const label = document.createElement('span');
        label.className = 'text-xs text-on-surface-variant/70 uppercase tracking-tight';
        label.textContent = `${this.header.field}:`;
        content.appendChild(label);

        const value = document.createElement('span');
        value.className = GridStyles.groupValue;
        value.textContent = String(this.header.groupValue);
        content.appendChild(value);

        const count = document.createElement('span');
        count.className = GridStyles.groupCount;
        count.textContent = `(${this.header.count})`;
        content.appendChild(count);

        cell.appendChild(content);

        return row;
    }

    getElement(): HTMLElement {
        return this.element;
    }

    getHeader(): GridGroupHeader {
        return this.header;
    }

    setContentWidth(width: number) {
        this.contentWidth = width;
        if (width > 0) {
            this.element.style.minWidth = `${width}px`;
        } else {
            this.element.style.minWidth = '';
        }
    }

    update(header: GridGroupHeader, index: number) {
        this.header = header;
        this.index = index;
        this.element.setAttribute('aria-rowindex', String(toAriaRowIndex(this.index)));
        this.element.style.transform = `translateY(${this.index * this.rowHeight}px)`;
        this.element.style.paddingLeft = `${this.header.level * 24}px`;
        if (this.contentWidth > 0) {
            this.element.style.minWidth = `${this.contentWidth}px`;
        }
        
        const toggle = this.element.querySelector('.aura-grid-group-toggle');
        if (toggle) {
            toggle.className = cn(
                GridStyles.groupToggle,
                this.header.isExpanded && GridStyles.groupToggleExpanded
            );
        }

        const content = this.element.querySelector(`.${GridStyles.groupContent}`);
        if (content) {
            const spans = content.querySelectorAll('span');
            if (spans.length >= 3) {
                const fieldText = `${this.header.field}:`;
                if (spans[0].textContent !== fieldText) {
                    spans[0].textContent = fieldText;
                }
                
                const valueText = String(this.header.groupValue);
                if (spans[1].textContent !== valueText) {
                    spans[1].textContent = valueText;
                }
                
                const countText = `(${this.header.count})`;
                if (spans[2].textContent !== countText) {
                    spans[2].textContent = countText;
                }
            }
        }
    }
}
