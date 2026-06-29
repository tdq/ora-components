export interface VirtualRowsConfig<ITEM> {
    /** Scroll container. Will be set position:relative; overflow-y:auto. */
    scrollEl: HTMLElement;
    /** Fixed row height in px; auto-measured from the first row when possible. */
    rowHeight: number;
    /** Extra rows rendered above/below the viewport. Default 5. */
    buffer?: number;
    /** Build a row element for an item at an index. */
    renderRow: (index: number, item: ITEM) => HTMLElement;
    /** Called for each row removed from the DOM (cleanup hook). */
    onEvict?: (el: HTMLElement, index: number) => void;
}

export class VirtualRowsViewport<ITEM> {
    private readonly scrollEl: HTMLElement;
    private readonly spacer: HTMLElement;
    private readonly renderRow: (index: number, item: ITEM) => HTMLElement;
    private readonly onEvict?: (el: HTMLElement, index: number) => void;
    private readonly buffer: number;
    private rowHeight: number;
    private measured = false;

    private items: ITEM[] = [];
    private rendered = new Map<number, HTMLElement>();
    private range = { start: 0, end: -1 };
    private ticking = false;
    private resizeObserver: ResizeObserver | null = null;

    constructor(config: VirtualRowsConfig<ITEM>) {
        this.scrollEl = config.scrollEl;
        this.renderRow = config.renderRow;
        this.onEvict = config.onEvict;
        this.buffer = config.buffer ?? 5;
        this.rowHeight = config.rowHeight;

        this.scrollEl.style.position = 'relative';
        this.scrollEl.style.overflowY = 'auto';

        this.spacer = document.createElement('div');
        this.spacer.setAttribute('aria-hidden', 'true');
        this.spacer.style.width = '1px';
        this.spacer.style.height = '0px';
        this.spacer.style.flexShrink = '0';
        this.scrollEl.appendChild(this.spacer);

        this.scrollEl.addEventListener('scroll', this.onScroll);

        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => this.render());
            this.resizeObserver.observe(this.scrollEl);
        }
    }

    setItems(items: ITEM[]): void {
        this.items = items;
        this.spacer.style.height = `${items.length * this.rowHeight}px`;
        // Use refresh() so stale rows at overlapping indices are evicted (onEvict
        // fires) and re-rendered from the new items array.  Calling render() directly
        // would skip already-rendered indices via the `if (has(i)) continue` guard,
        // leaving old captions / change-handlers in the DOM.
        this.refresh();
    }

    refresh(): void {
        // Force a full re-render of the current window (e.g. selection/style change).
        this.clearRendered();
        this.range = { start: 0, end: -1 };
        this.render();
    }

    scrollToIndex(index: number): void {
        if (index < 0 || index >= this.items.length) return;
        const top = index * this.rowHeight;
        const viewTop = this.scrollEl.scrollTop;
        const viewBottom = viewTop + this.scrollEl.clientHeight;
        if (top < viewTop) {
            this.scrollEl.scrollTop = top;
        } else if (top + this.rowHeight > viewBottom) {
            this.scrollEl.scrollTop = top + this.rowHeight - this.scrollEl.clientHeight;
        }
        this.render();
    }

    getRenderedRow(index: number): HTMLElement | undefined {
        return this.rendered.get(index);
    }

    getRenderedRange(): { start: number; end: number } {
        return { ...this.range };
    }

    destroy(): void {
        this.scrollEl.removeEventListener('scroll', this.onScroll);
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        this.clearRendered();
        this.spacer.remove();
    }

    private onScroll = () => {
        if (this.ticking) return;
        this.ticking = true;
        requestAnimationFrame(() => {
            try {
                this.render();
            } finally {
                this.ticking = false;
            }
        });
    };

    private clearRendered(): void {
        for (const [index, el] of this.rendered.entries()) {
            this.onEvict?.(el, index);
            el.remove();
        }
        this.rendered.clear();
    }

    private measureRowHeight(): void {
        if (this.measured) return;
        const first = this.rendered.values().next().value as HTMLElement | undefined;
        if (first && first.offsetHeight > 0) {
            this.rowHeight = first.offsetHeight;
            this.measured = true;
            this.spacer.style.height = `${this.items.length * this.rowHeight}px`;
            // Reposition all currently-rendered rows to use the measured height so
            // they don't sit at stale offsets until they're individually evicted.
            for (const [i, el] of this.rendered.entries()) {
                el.style.transform = `translateY(${i * this.rowHeight}px)`;
            }
        }
    }

    private render(): void {
        const count = this.items.length;
        if (count === 0) {
            this.clearRendered();
            this.range = { start: 0, end: -1 };
            return;
        }

        const scrollTop = this.scrollEl.scrollTop;
        const clientHeight = this.scrollEl.clientHeight;
        const start = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.buffer);
        // Use ceil-minus-1 so a row whose top edge lands exactly at (scrollTop + clientHeight)
        // is NOT counted as visible (e.g. clientHeight=200, rowHeight=40: last visible is index 4,
        // not 5). Math.floor would return 5 in that case, overshooting by one.
        const lastVisible = Math.ceil((scrollTop + clientHeight) / this.rowHeight) - 1;
        const end = Math.min(count - 1, lastVisible + this.buffer);

        // Evict rows outside the new window.
        for (const [index, el] of this.rendered.entries()) {
            if (index < start || index > end) {
                this.onEvict?.(el, index);
                el.remove();
                this.rendered.delete(index);
            }
        }

        // Render rows inside the window that are not yet present.
        for (let i = start; i <= end; i++) {
            if (this.rendered.has(i)) continue;
            const el = this.renderRow(i, this.items[i]);
            el.style.position = 'absolute';
            el.style.top = '0';
            el.style.left = '0';
            el.style.right = '0';
            el.style.transform = `translateY(${i * this.rowHeight}px)`;
            this.scrollEl.appendChild(el);
            this.rendered.set(i, el);
        }

        this.range = { start, end };
        this.measureRowHeight();
    }
}
