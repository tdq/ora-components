import { GridGroupHeader } from './types';
import { GridStyles } from './grid-styles';
import { Icons } from '@/core/icons';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export class GridGroupRow {
    private element: HTMLElement;
    private readonly rowHeight = 52;

    constructor(
        private header: GridGroupHeader,
        private index: number,
        private onToggle: (groupKey: string) => void
    ) {
        this.element = this.createGroupRow();
    }

    private createGroupRow(): HTMLElement {
        const row = document.createElement('div');
        row.className = GridStyles.groupRow;
        row.style.transform = `translateY(${this.index * this.rowHeight}px)`;
        row.style.height = `${this.rowHeight}px`;
        row.style.paddingLeft = `${this.header.level * 24}px`;

        row.onclick = () => this.onToggle(this.header.groupKey);

        const toggle = document.createElement('div');
        toggle.className = cn(
            GridStyles.groupToggle,
            this.header.isExpanded && GridStyles.groupToggleExpanded
        );
        toggle.innerHTML = Icons.CHEVRON_RIGHT;
        row.appendChild(toggle);

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

        row.appendChild(content);

        return row;
    }

    getElement(): HTMLElement {
        return this.element;
    }

    getHeader(): GridGroupHeader {
        return this.header;
    }

    update(header: GridGroupHeader, index: number) {
        this.header = header;
        this.index = index;
        this.element.style.transform = `translateY(${this.index * this.rowHeight}px)`;
        this.element.style.paddingLeft = `${this.header.level * 24}px`;
        
        const toggle = this.element.querySelector(`.${GridStyles.groupToggle.split(' ')[0]}`);
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
                spans[0].textContent = `${this.header.field}:`;
                spans[1].textContent = String(this.header.groupValue);
                spans[2].textContent = `(${this.header.count})`;
            }
        }
    }
}
