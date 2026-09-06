export interface VirtualRowsConfig<ITEM> {
    /** Scroll container. Will be set position:relative; overflow-y:auto. */
    scrollEl: HTMLElement;
    /** Estimated row height in px; used as fallback for rows not yet measured. Must be > 0. */
    rowHeight: number;
    /** Extra rows rendered above/below the viewport. Default 5. */
    buffer?: number;
    /**
     * Build a row element for an item at an index. Must be a pure function of
     * (index, item) — measurement preservation across `setItems()` relies on being able
     * to reuse a previously measured height for an index whose item reference is
     * unchanged, which is only valid if the same item always renders to the same height.
     * If `renderRow` depends on external mutable state (e.g. a captured selection or
     * style variable read from the closure), call `invalidateMeasurements()` after that
     * state changes so stale heights aren't reused.
     */
    renderRow: (index: number, item: ITEM) => HTMLElement;
    /**
     * Called for each row removed from the DOM (cleanup hook). Fires both when a row
     * scrolls out of the window AND when a row already in the window is re-rendered in
     * place (`updateRow()`/`updateRows()`/`refresh()`) — in the latter case the *old*
     * element is what's passed in, immediately followed by a replacement being rendered
     * at the same index. Do not remove the element yourself; the viewport owns
     * removal/replacement.
     */
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
        const prevItems = this.items;
        this.items = items;
        const n = items.length;
        // Preserve the measured height for indices whose item reference is unchanged
        // (e.g. keyboard navigation re-emitting the same array) — only reset the slots
        // whose content actually changed.
        const nextMeasured: number[] = new Array(n);
        const minLen = Math.min(prevItems.length, n);
        for (let i = 0; i < minLen; i++) {
            if (prevItems[i] === items[i]) {
                nextMeasured[i] = this.measured[i];
            }
        }
        this.measured = nextMeasured;
        this.buildPrefix(0);
        this.spacer.style.height = `${this.prefix[n]}px`;
        // Full rebuild: item identities may have shifted at overlapping indices, so
        // every rendered row must be evicted (onEvict fires) and re-rendered fresh.
        this.clearRendered();
        this.range = { start: 0, end: -1 };
        this.render();
    }

    /**
     * Re-render every currently rendered row in place (e.g. style change affecting all
     * rows), then re-run the window computation from the current scrollTop/clientHeight
     * so any drift (rows now stale-positioned, a container that gained real height since
     * the last render, more/fewer rows now fitting) is corrected — evicting/appending as
     * needed and re-measuring. This is render()'s full pipeline minus the destructive
     * clear-and-reset setItems() does. Note element identity is NOT preserved: every
     * currently rendered row's element is replaced (renderRow is called again and the
     * old node swapped out via onEvict), same as updateRow()/updateRows() — what carries
     * over across the call is which *indices* stay in the window, not the DOM nodes.
     */
    refresh(): void {
        this.updateRows(Array.from(this.rendered.keys()));
    }

    /**
     * Re-render multiple rows in place (each a no-op if not currently rendered — same
     * per-row semantics as updateRow()), then run a single window recompute (render())
     * for the whole batch. Prefer this over calling updateRow() in a loop whenever
     * several indices need patching together (e.g. the previously- and newly-focused
     * row, or every rendered row whose id matches an old/new selection): render() is
     * O(window), so N sequential updateRow() calls cost O(window × N) while a single
     * updateRows() call costs O(window) once.
     */
    updateRows(indices: number[]): void {
        for (const index of indices) {
            this.patchRowContent(index);
        }
        this.render();
    }

    /**
     * Re-render a single row in place, if it is currently rendered (no-op otherwise),
     * then fall through to a full window recompute (render()) so the row's new height is
     * measured, prefix/spacer/positions are corrected, and — crucially — the *actual*
     * window is re-derived from the current scrollTop/clientHeight rather than trusting
     * `this.range`. `this.range` can be stale relative to scrollTop (e.g. a scrollbar
     * drag moves scrollTop before the throttled scroll-event render() has run): patching
     * geometry via an isolated extend-from-`range.end` step in that state would append
     * every index between the old range and the new scroll position instead of evicting
     * and re-windowing, so this always goes through the same window-derivation render()
     * uses. Equivalent to `updateRows([index])` — prefer updateRows() when patching more
     * than one row so the render() cost is paid once, not once per row.
     */
    updateRow(index: number): void {
        this.updateRows([index]);
    }

    /**
     * Discard all measured row heights, reverting every row to the estimate — and
     * immediately rebuilds the prefix from scratch and resizes the spacer to match, so
     * prefix and spacer agree with each other on return. Note that already-rendered rows
     * keep the `translateY` they were given under the OLD prefix: their DOM positions are
     * only brought back in line by the next `render()`/`refresh()`/`setItems()`, so call
     * one of those before the next paint. Call this if `renderRow` output can change height for the
     * same (index, item) pair — e.g. it reads external mutable state such as a captured
     * selection or style variable — before the next `setItems()`/`refresh()`, so a
     * `setItems()` call with unchanged item references doesn't reuse a height that was
     * only valid under the old state (e.g. a row measured at 88px while selected keeping
     * that height forever after it scrolls out and is deselected).
     */
    invalidateMeasurements(): void {
        this.measured = new Array(this.items.length);
        this.buildPrefix(0);
        this.spacer.style.height = `${this.prefix[this.items.length]}px`;
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

    /** Build a row element for index i, positioned at the current prefix[i]. */
    private buildRowElement(i: number): HTMLElement {
        const el = this.renderRow(i, this.items[i]);
        el.style.position = 'absolute';
        el.style.top = '0';
        el.style.left = '0';
        el.style.right = '0';
        el.style.transform = `translateY(${this.prefix[i]}px)`;
        return el;
    }

    /**
     * Replace a currently rendered row's element with a freshly built one — content only,
     * no measurement and no window recompute. No-op if the index isn't rendered. Internal
     * building block for updateRows(); callers needing correct geometry afterward must
     * follow up with a render() (updateRows() does this once for the whole batch).
     */
    private patchRowContent(index: number): void {
        const el = this.rendered.get(index);
        if (!el) return;
        this.onEvict?.(el, index);
        const newEl = this.buildRowElement(index);
        this.scrollEl.replaceChild(newEl, el);
        this.rendered.set(index, newEl);
    }

    /**
     * Append a single row element positioned at the current prefix[i], inserted in
     * ascending index order among the currently rendered rows. Plain appendChild would
     * place it after whatever was rendered most recently — correct when filling a window
     * top-down, but wrong when scrolling *up* re-adds lower indices after higher ones are
     * already in the DOM (e.g. window 10..20 rendered, scroll up to 5..15: rows 5..9 must
     * land BEFORE row 10, not after row 15).
     *
     * `windowEnd` must be the upper bound of the window currently being filled (passed by
     * the caller, not read from `this.range.end`): `this.range.end` still holds the
     * *previous* window's end while render()'s fill loop is running, and after a large
     * scroll jump that previous end can be far beyond the new window — bounding the
     * forward probe by it turns every append into an O(old window size) scan instead of
     * O(gap to the next rendered row).
     */
    private appendRow(i: number, windowEnd: number): void {
        const el = this.buildRowElement(i);
        const nextEl = this.findNextRenderedElement(i, windowEnd);
        if (nextEl) {
            this.scrollEl.insertBefore(el, nextEl);
        } else {
            this.scrollEl.appendChild(el);
        }
        this.rendered.set(i, el);
    }

    /**
     * The element of the smallest currently-rendered index strictly greater than i, not
     * exceeding `windowEnd`. Probes forward index-by-index (O(gap) instead of a full
     * O(rendered size) map scan per call — the window is contiguous, so the next
     * rendered index is usually i+1).
     */
    private findNextRenderedElement(i: number, windowEnd: number): HTMLElement | undefined {
        for (let j = i + 1; j <= windowEnd; j++) {
            const el = this.rendered.get(j);
            if (el) return el;
        }
        return undefined;
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

    /**
     * Measure rendered rows in [lo, hi]; if any height actually changed, rebuild the
     * prefix suffix, resize the spacer, reposition every rendered row, and — if the
     * measured heights turned out smaller than the estimate — extend the window so no
     * gap is left at the viewport bottom (the "CRITICAL gap fix"). Only called from
     * render(), at the end of its window computation — updateRow()/updateRows() no
     * longer call this directly; they fall through to a full render() instead (see
     * updateRow()'s doc comment for why an isolated extend-from-`range.end` step is
     * unsafe there).
     */
    private measureAndPatch(lo: number, hi: number): void {
        const count = this.items.length;
        const minDirty = this.measureRange(lo, hi);
        if (minDirty === Infinity) return;

        this.applyPatch(minDirty, count);

        const scrollTop = this.scrollEl.scrollTop;
        const clientHeight = this.scrollEl.clientHeight;
        const newEndIdx = this.searchRight(scrollTop + clientHeight);
        const newEnd = Math.min(count - 1, newEndIdx - 1 + this.buffer);

        if (newEnd > this.range.end) {
            const prevEnd = this.range.end;
            for (let i = prevEnd + 1; i <= newEnd; i++) {
                this.appendRow(i, newEnd);
            }
            const extDirty = this.measureRange(prevEnd + 1, newEnd);
            if (extDirty < Infinity) {
                this.applyPatch(extDirty, count);
            }
            this.range = { start: this.range.start, end: newEnd };
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
            this.appendRow(i, end);
        }

        this.range = { start, end };

        // Measure pass + gap-fix extension for the freshly computed window.
        this.measureAndPatch(start, end);
    }
}
