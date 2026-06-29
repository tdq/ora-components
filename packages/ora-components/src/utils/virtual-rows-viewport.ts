export interface VirtualRowsConfig<ITEM> {
    /** Scroll container. Will be set position:relative; overflow-y:auto. */
    scrollEl: HTMLElement;
    /** Estimated row height in px; used as fallback for rows not yet measured. Must be > 0. */
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
    private readonly estimate: number; // rowHeight from config — estimate for unmeasured rows
    private destroyed = false;

    private items: ITEM[] = [];
    /** Per-row measured heights; slot is undefined until the row has been measured. */
    private measured: number[] = [];
    /** Cumulative offsets of length n+1. prefix[0]=0; prefix[i+1]=prefix[i]+heightAt(i).
     *  prefix[n] is the total content height → spacer height. */
    private prefix: number[] = [0];
    private rendered = new Map<number, HTMLElement>();
    private range = { start: 0, end: -1 };
    private ticking = false;
    private resizeObserver: ResizeObserver | null = null;

    constructor(config: VirtualRowsConfig<ITEM>) {
        if (config.rowHeight <= 0) {
            throw new Error('rowHeight must be > 0');
        }
        this.scrollEl = config.scrollEl;
        this.renderRow = config.renderRow;
        this.onEvict = config.onEvict;
        this.buffer = config.buffer ?? 5;
        this.estimate = config.rowHeight;

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
        const n = items.length;
        // Reset all per-row measurements — new items, new heights.
        this.measured = new Array(n);
        this.buildPrefix(0);
        this.spacer.style.height = `${this.prefix[n]}px`;
        // Use refresh() so stale rows at overlapping indices are evicted (onEvict fires)
        // and re-rendered from the new items array.
        this.refresh();
    }

    refresh(): void {
        // Force a full re-render of the current window (e.g. selection/style change).
        // Do NOT reset measured — content heights are unchanged on selection/style refresh.
        this.clearRendered();
        this.range = { start: 0, end: -1 };
        this.render();
    }

    scrollToIndex(index: number): void {
        if (index < 0 || index >= this.items.length) return;
        // First call: use current (possibly estimate-based) prefix to scroll toward the target.
        this.scrollIntoView(index);
        // render() measures newly visible rows and patches prefix values around the target.
        this.render();
        // Second call: corrects scrollTop now that render() has updated the measured prefix.
        // On the happy path (target was already fully in view, or prefix was exact), this is a no-op.
        this.scrollIntoView(index);
    }

    getRenderedRow(index: number): HTMLElement | undefined {
        return this.rendered.get(index);
    }

    getRenderedRange(): { start: number; end: number } {
        return { ...this.range };
    }

    destroy(): void {
        // Set the flag first so any in-flight rAF callback that fires after this returns
        // immediately without touching the now-removed spacer / cleared DOM.
        this.destroyed = true;
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

    private heightAt(i: number): number {
        return this.measured[i] ?? this.estimate;
    }

    /**
     * Rebuild prefix[from+1 .. n] using current measured/estimate heights.
     * prefix[from] must already be correct when from > 0.
     * Also resizes prefix to n+1 if the item count changed.
     */
    private buildPrefix(from: number): void {
        const n = this.items.length;
        if (this.prefix.length !== n + 1) {
            this.prefix = new Array(n + 1);
            this.prefix[0] = 0;
            from = 0;
        }
        for (let i = from; i < n; i++) {
            this.prefix[i + 1] = this.prefix[i] + this.heightAt(i);
        }
    }

    /**
     * Binary search: returns the last index idx in [0, n-1] where prefix[idx] <= value.
     * Returns 0 when all prefix values exceed value (first row is always the best guess).
     */
    private searchLeft(value: number): number {
        const n = this.items.length;
        let lo = 0, hi = n;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (this.prefix[mid] <= value) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        // lo is now the first index where prefix[lo] > value; lo-1 is what we want.
        return Math.max(0, lo - 1);
    }

    /**
     * Binary search: returns the first index idx in [0, n] where prefix[idx] >= value.
     * Returns n when no prefix value in [0, n-1] meets the condition.
     */
    private searchRight(value: number): number {
        const n = this.items.length;
        let lo = 0, hi = n;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (this.prefix[mid] < value) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        return lo;
    }

    /** Scroll scrollEl so that row at `index` is visible, using the current prefix. */
    private scrollIntoView(index: number): void {
        const top = this.prefix[index];
        const rowH = this.heightAt(index);
        const scrollTop = this.scrollEl.scrollTop;
        const clientHeight = this.scrollEl.clientHeight;
        if (top < scrollTop) {
            this.scrollEl.scrollTop = top;
        } else if (top + rowH > scrollTop + clientHeight) {
            this.scrollEl.scrollTop = top + rowH - clientHeight;
        }
    }

    private clearRendered(): void {
        for (const [index, el] of this.rendered.entries()) {
            this.onEvict?.(el, index);
            el.remove();
        }
        this.rendered.clear();
    }

    /** Append a single row element positioned at the current prefix[i]. */
    private appendRow(i: number): void {
        const el = this.renderRow(i, this.items[i]);
        el.style.position = 'absolute';
        el.style.top = '0';
        el.style.left = '0';
        el.style.right = '0';
        el.style.transform = `translateY(${this.prefix[i]}px)`;
        this.scrollEl.appendChild(el);
        this.rendered.set(i, el);
    }

    /**
     * Read offsetHeight for rendered rows in index range [lo, hi].
     * Updates this.measured for any row whose height changed and is > 0.
     * Returns the smallest changed index (Infinity if nothing changed).
     * jsdom guard: offsetHeight === 0 → keep the estimate; h > 0 check ensures
     * existing fixed-height tests pass unchanged.
     */
    private measureRange(lo: number, hi: number): number {
        let minDirty = Infinity;
        for (let i = lo; i <= hi; i++) {
            const el = this.rendered.get(i);
            if (!el) continue;
            const h = el.offsetHeight;
            if (h > 0 && h !== this.measured[i]) {
                this.measured[i] = h;
                if (i < minDirty) minDirty = i;
            }
        }
        return minDirty;
    }

    /**
     * Rebuild prefix suffix from minDirty, update spacer, reposition all rendered rows.
     * Inline patch — does NOT call render() to avoid recursion.
     */
    private applyPatch(minDirty: number, count: number): void {
        this.buildPrefix(minDirty);
        this.spacer.style.height = `${this.prefix[count]}px`;
        for (const [i, el] of this.rendered.entries()) {
            el.style.transform = `translateY(${this.prefix[i]}px)`;
        }
    }

    private render(): void {
        // Guard: destroy() was called before this rAF callback fired.
        if (this.destroyed) return;

        const count = this.items.length;
        if (count === 0) {
            this.clearRendered();
            this.range = { start: 0, end: -1 };
            return;
        }

        const scrollTop = this.scrollEl.scrollTop;
        const clientHeight = this.scrollEl.clientHeight;

        // Compute the visible window via binary search over the prefix array.
        //   firstVisible = last row whose top (prefix[i]) <= scrollTop
        //   lastVisible  = (first row whose top >= scrollTop + clientHeight) - 1
        const firstVisible = this.searchLeft(scrollTop);
        const endIdx = this.searchRight(scrollTop + clientHeight);
        const lastVisible = endIdx - 1;

        const start = Math.max(0, firstVisible - this.buffer);
        let end = Math.min(count - 1, lastVisible + this.buffer);

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
            this.appendRow(i);
        }

        this.range = { start, end };

        // Measure pass: read offsetHeight for the rendered window.
        const minDirty = this.measureRange(start, end);

        if (minDirty < Infinity) {
            // Rebuild the prefix suffix and reposition all rendered rows.
            this.applyPatch(minDirty, count);

            // CRITICAL gap fix: if measured heights are SMALLER than the estimate, the
            // corrected prefix may reveal that more rows now fit in the viewport.
            // Extend the window inline (bounded single pass — no recursive render()).
            const newEndIdx = this.searchRight(scrollTop + clientHeight);
            const newEnd = Math.min(count - 1, newEndIdx - 1 + this.buffer);

            if (newEnd > end) {
                // Append extension rows using the already-patched prefix values.
                for (let i = end + 1; i <= newEnd; i++) {
                    this.appendRow(i);
                }
                // Measure and patch the extension in the same pass.
                const extDirty = this.measureRange(end + 1, newEnd);
                if (extDirty < Infinity) {
                    this.applyPatch(extDirty, count);
                }
                end = newEnd;
                this.range = { start, end };
            }
        }
    }
}
