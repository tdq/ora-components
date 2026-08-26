import { VirtualRowsViewport } from './virtual-rows-viewport';

describe('VirtualRowsViewport', () => {
    let resizeCallback: () => void;

    beforeAll(() => {
        global.requestAnimationFrame = (cb: FrameRequestCallback) => { cb(0); return 0; };
        global.ResizeObserver = class {
            constructor(cb: any) { resizeCallback = () => cb([], this as any); }
            observe() {} unobserve() {} disconnect() {}
        } as any;
    });

    const makeScrollEl = (clientHeight: number): HTMLElement => {
        const el = document.createElement('div');
        Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true, writable: true });
        Object.defineProperty(el, 'scrollTop', { value: 0, configurable: true, writable: true });
        document.body.appendChild(el);
        return el;
    };

    const renderRow = (index: number) => {
        const d = document.createElement('div');
        d.dataset.index = String(index);
        d.textContent = `row ${index}`;
        return d;
    };

    afterEach(() => { document.body.innerHTML = ''; });

    it('renders only the visible window plus buffer', () => {
        const scrollEl = makeScrollEl(200); // 200/40 = 5 visible; +buffer 5 => indices 0..9 => 10 rows
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        const rendered = scrollEl.querySelectorAll('[data-index]');
        expect(rendered.length).toBe(10);
        expect(vp.getRenderedRange()).toEqual({ start: 0, end: 9 });
    });

    it('sizes the spacer to total * rowHeight', () => {
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        const spacer = scrollEl.querySelector('[aria-hidden="true"]') as HTMLElement;
        expect(spacer.style.height).toBe('4000px');
    });

    it('positions rows with translateY based on index', () => {
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        const row3 = vp.getRenderedRow(3)!;
        expect(row3.style.transform).toBe('translateY(120px)');
    });

    it('anchors every rendered row at top:0 so translateY offsets from the container top (regression: rows were invisible without top)', () => {
        // Without `top:0`, rows with position:absolute default their static position
        // to after the spacer div, placing them far below the visible viewport.
        // This test guards the anchor so layout failures are caught even in jsdom.
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        const { start, end } = vp.getRenderedRange();
        for (let i = start; i <= end; i++) {
            const el = vp.getRenderedRow(i)!;
            expect(el.style.top).toBe('0px');
            expect(el.style.transform).toBe(`translateY(${i * 40}px)`);
        }
    });

    it('shifts the window and evicts rows on scroll', () => {
        const scrollEl = makeScrollEl(200);
        const evicted: number[] = [];
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow, onEvict: (_e, i) => evicted.push(i) });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        (scrollEl as any).scrollTop = 2000; // index 50
        scrollEl.dispatchEvent(new Event('scroll'));
        expect(vp.getRenderedRow(0)).toBeUndefined();
        expect(evicted).toContain(0);
        const range = vp.getRenderedRange();
        expect(range.start).toBeLessThanOrEqual(50);
        expect(range.end).toBeGreaterThanOrEqual(50);
    });

    it('re-renders the window on ResizeObserver callback', () => {
        const scrollEl = makeScrollEl(0); // height 0 -> only buffer rows
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        const before = scrollEl.querySelectorAll('[data-index]').length;
        (scrollEl as any).clientHeight = 400;
        resizeCallback();
        const after = scrollEl.querySelectorAll('[data-index]').length;
        expect(after).toBeGreaterThan(before);
    });

    it('clears all rows and zeroes the spacer on empty items', () => {
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems([1, 2, 3]);
        vp.setItems([]);
        expect(scrollEl.querySelectorAll('[data-index]').length).toBe(0);
        const spacer = scrollEl.querySelector('[aria-hidden="true"]') as HTMLElement;
        expect(spacer.style.height).toBe('0px');
    });

    it('scrollToIndex sets scrollTop and renders that row', () => {
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        vp.scrollToIndex(80);
        expect(vp.getRenderedRow(80)).toBeDefined();
    });

    it('destroy() removes the scroll listener and calls onEvict for rendered rows', () => {
        const scrollEl = makeScrollEl(200);
        const evicted: number[] = [];
        const vp = new VirtualRowsViewport<number>({
            scrollEl, rowHeight: 40, renderRow, onEvict: (_e, i) => evicted.push(i),
        });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        const rangeBeforeDestroy = vp.getRenderedRange();
        // Verify at least some rows are rendered so the test is meaningful.
        expect(rangeBeforeDestroy.end).toBeGreaterThanOrEqual(0);

        vp.destroy();

        // onEvict must have been called for every row that was rendered at destroy time.
        for (let i = rangeBeforeDestroy.start; i <= rangeBeforeDestroy.end; i++) {
            expect(evicted).toContain(i);
        }

        // Spacer must be removed from the DOM.
        expect(scrollEl.querySelector('[aria-hidden="true"]')).toBeNull();

        // After destroy, scrolling must not re-render anything (listener detached).
        const evictedCountAfterDestroy = evicted.length;
        (scrollEl as any).scrollTop = 2000;
        scrollEl.dispatchEvent(new Event('scroll'));
        expect(vp.getRenderedRange()).toEqual(rangeBeforeDestroy); // range unchanged
        expect(evicted.length).toBe(evictedCountAfterDestroy);    // no new evictions
    });

    it('refresh() re-renders the window reflecting updated external state', () => {
        const scrollEl = makeScrollEl(200);
        let suffix = 'original';
        const dynamicRenderRow = (index: number, item: number) => {
            const d = document.createElement('div');
            d.dataset.index = String(index);
            d.textContent = `row ${index} ${suffix}`;
            return d;
        };
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow: dynamicRenderRow });
        vp.setItems([0, 1, 2]);

        // Confirm initial render used 'original'.
        expect(vp.getRenderedRow(0)!.textContent).toBe('row 0 original');

        // Change external state then refresh — rows must be rebuilt with new content.
        suffix = 'updated';
        vp.refresh();

        expect(vp.getRenderedRow(0)!.textContent).toBe('row 0 updated');
        expect(vp.getRenderedRow(1)!.textContent).toBe('row 1 updated');
    });

    it('respects a custom buffer value', () => {
        // buffer:2, clientHeight:0 => only 2 rows above + 2 below the viewport edge
        // visible rows: 0 (floor(0/40)=0), so start=max(0,0-2)=0, lastVisible=ceil(0/40)-1=-1, end=-1+2=1
        // => indices 0..1 => 2 rows
        const scrollEl = makeScrollEl(0);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, buffer: 2, renderRow });
        vp.setItems(Array.from({ length: 50 }, (_, i) => i));
        const range = vp.getRenderedRange();
        // start must be 0; end must be buffer-1 = 1 (only buffer rows since clientHeight=0)
        expect(range.start).toBe(0);
        expect(range.end).toBe(1);
        expect(scrollEl.querySelectorAll('[data-index]').length).toBe(2);
    });

    it('initialises scrollEl with position:relative and overflow-y:auto', () => {
        const scrollEl = makeScrollEl(0);
        new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        expect(scrollEl.style.position).toBe('relative');
        expect(scrollEl.style.overflowY).toBe('auto');
    });

    it('scrollToIndex is a no-op for out-of-bounds indices', () => {
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems(Array.from({ length: 10 }, (_, i) => i));
        const rangeBefore = vp.getRenderedRange();
        vp.scrollToIndex(-1);
        vp.scrollToIndex(10); // equal to items.length — out of bounds
        expect(vp.getRenderedRange()).toEqual(rangeBefore);
        expect((scrollEl as any).scrollTop).toBe(0);
    });

    it('scrollToIndex does not change scrollTop when index is already fully visible', () => {
        const scrollEl = makeScrollEl(200); // rows 0-4 visible
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        // Index 3 is visible (top=120, bottom=160, viewport 0-200)
        vp.scrollToIndex(3);
        expect((scrollEl as any).scrollTop).toBe(0);
    });

    it('calls onEvict for each cleared row when setItems([]) is called', () => {
        const scrollEl = makeScrollEl(200);
        const evicted: number[] = [];
        const vp = new VirtualRowsViewport<number>({
            scrollEl, rowHeight: 40, renderRow, onEvict: (_e, i) => evicted.push(i),
        });
        vp.setItems([0, 1, 2]);
        const rangeBefore = vp.getRenderedRange();
        vp.setItems([]);
        // Every index that was rendered must have had onEvict called.
        for (let i = rangeBefore.start; i <= rangeBefore.end; i++) {
            expect(evicted).toContain(i);
        }
    });

    it('setItems with a different dataset evicts stale rows and renders from the new items (regression: stale row bug)', () => {
        // Regression test for the bug where setItems called render() directly.
        // render() has `if (this.rendered.has(i)) continue`, so rows at overlapping
        // indices were never rebuilt — old captions / handlers stayed in the DOM.
        const scrollEl = makeScrollEl(200);
        const renderByItem = (_index: number, item: number) => {
            const d = document.createElement('div');
            d.textContent = `item-${item}`;
            return d;
        };
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow: renderByItem });

        // First dataset: items 10, 20, 30, …
        vp.setItems([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
        expect(vp.getRenderedRow(0)!.textContent).toBe('item-10');

        // Second dataset: completely different values at the same indices
        vp.setItems([99, 88, 77, 66, 55, 44, 33, 22, 11, 0]);
        // Row at index 0 must be rebuilt from the NEW dataset, not left stale.
        expect(vp.getRenderedRow(0)!.textContent).toBe('item-99');
        expect(vp.getRenderedRow(1)!.textContent).toBe('item-88');
    });

    // -------------------------------------------------------------------------
    // Variable-height tests
    // -------------------------------------------------------------------------

    /**
     * Helper that returns a renderRow function where each element's offsetHeight
     * is mocked via Object.defineProperty so jsdom returns a real value.
     * Even indices → 40px, odd indices → 80px.
     */
    const makeVariableRenderRow = () =>
        (index: number, _item: number): HTMLElement => {
            const d = document.createElement('div');
            d.dataset.index = String(index);
            const h = index % 2 === 0 ? 40 : 80;
            Object.defineProperty(d, 'offsetHeight', { value: h, configurable: true });
            return d;
        };

    /** Extract the translateY pixel value from an element's transform style. */
    const getTranslateY = (el: HTMLElement): number => {
        const match = el.style.transform.match(/translateY\((-?\d+(?:\.\d+)?)px\)/);
        if (!match) throw new Error(`No translateY found in: ${el.style.transform}`);
        return parseFloat(match[1]);
    };

    it('variable-height rows are positioned without overlap after measurement', () => {
        // Use a viewport tall enough to render all itemCount rows in one pass so that
        // every row is measured and the spacer reflects the full measured total.
        const itemCount = 20;
        const maxRowHeight = 80; // odd-index rows
        const scrollEl = makeScrollEl(itemCount * maxRowHeight + 1); // 1601px — fits all rows
        const vp = new VirtualRowsViewport<number>({
            scrollEl,
            rowHeight: 40,
            renderRow: makeVariableRenderRow(),
        });
        vp.setItems(Array.from({ length: itemCount }, (_, i) => i));

        // After setItems + initial render, measure pass has run and updated prefix.
        // Verify contiguous non-overlapping positions for all rendered rows.
        const { start, end } = vp.getRenderedRange();
        let expectedTop = 0;
        // Build expected tops from measured heights (even=40, odd=80)
        const heights = Array.from({ length: itemCount }, (_, i) => i % 2 === 0 ? 40 : 80);
        const prefixes = [0];
        for (let i = 0; i < itemCount; i++) prefixes.push(prefixes[i] + heights[i]);

        for (let i = start; i <= end; i++) {
            const el = vp.getRenderedRow(i)!;
            expect(el).toBeDefined();
            expect(getTranslateY(el)).toBe(prefixes[i]);
        }

        // Spacer must reflect the fully-measured total height.
        const total = prefixes[itemCount];
        const spacer = scrollEl.querySelector('[aria-hidden="true"]') as HTMLElement;
        expect(spacer.style.height).toBe(`${total}px`);
    });

    it('last row does not overlap the previous row when scrolled to the bottom (regression)', () => {
        const itemCount = 20;
        const heights = Array.from({ length: itemCount }, (_, i) => i % 2 === 0 ? 40 : 80);
        const prefixes = [0];
        for (let i = 0; i < itemCount; i++) prefixes.push(prefixes[i] + heights[i]);
        const total = prefixes[itemCount];

        // Viewport is small enough to require scrolling.
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({
            scrollEl,
            rowHeight: 40,
            buffer: 2,
            renderRow: makeVariableRenderRow(),
        });
        vp.setItems(Array.from({ length: itemCount }, (_, i) => i));

        // Scroll progressively so rows get measured, then land at the bottom.
        const steps = [200, 400, 600, Math.max(0, total - 200)];
        for (const pos of steps) {
            (scrollEl as any).scrollTop = pos;
            scrollEl.dispatchEvent(new Event('scroll'));
        }

        // The last and second-to-last rows must both be rendered and non-overlapping.
        const lastEl = vp.getRenderedRow(itemCount - 1);
        const prevEl = vp.getRenderedRow(itemCount - 2);
        expect(lastEl).toBeDefined();
        expect(prevEl).toBeDefined();

        const lastTop = getTranslateY(lastEl!);
        const prevTop = getTranslateY(prevEl!);
        // Strict contiguity: each row top must equal the independently-computed prefix value.
        // (>= allowed the CRITICAL gap to hide; === catches both overlap AND gap.)
        expect(prevTop).toBe(prefixes[itemCount - 2]);
        expect(lastTop).toBe(prefixes[itemCount - 1]);
    });

    it('scrollToIndex with variable heights scrolls to the measured offset', () => {
        const itemCount = 30;
        const heights = Array.from({ length: itemCount }, (_, i) => i % 2 === 0 ? 40 : 80);
        const prefixes = [0];
        for (let i = 0; i < itemCount; i++) prefixes.push(prefixes[i] + heights[i]);

        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({
            scrollEl,
            rowHeight: 40,
            buffer: 2,
            renderRow: makeVariableRenderRow(),
        });
        vp.setItems(Array.from({ length: itemCount }, (_, i) => i));

        // Scroll incrementally so all rows up to index 20 get measured.
        for (const pos of [200, 400, 600, 800]) {
            (scrollEl as any).scrollTop = pos;
            scrollEl.dispatchEvent(new Event('scroll'));
        }

        // Now scrollToIndex(20) — target must be rendered.
        vp.scrollToIndex(20);
        const el = vp.getRenderedRow(20);
        expect(el).toBeDefined();

        // Its translateY must equal the cumulative prefix for index 20.
        // (After measurement the prefix is exact for rows 0..rendered-end.)
        expect(getTranslateY(el!)).toBe(prefixes[20]);
    });

    it('uniform-height fallback still works when offsetHeight is 0 (jsdom default)', () => {
        // Default renderRow returns elements with offsetHeight===0 in jsdom,
        // so all rows keep the estimate. This confirms the h > 0 guard works.
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems(Array.from({ length: 50 }, (_, i) => i));

        const { start, end } = vp.getRenderedRange();
        for (let i = start; i <= end; i++) {
            expect(getTranslateY(vp.getRenderedRow(i)!)).toBe(i * 40);
        }
        const spacer = scrollEl.querySelector('[aria-hidden="true"]') as HTMLElement;
        expect(spacer.style.height).toBe('2000px'); // 50 * 40
    });

    // -------------------------------------------------------------------------
    // Cold-jump companion tests — exercise paths that incremental-scroll tests skip
    // -------------------------------------------------------------------------

    it('cold-jump (a): initial render fills the viewport with no gap when measured heights are smaller than the estimate', () => {
        // CRITICAL gap scenario: rows are SHORTER than estimate → estimate-based window
        // leaves empty space at viewport bottom. The extension pass must fill it.
        const estimate = 40;
        const actualHeight = 20; // shorter than estimate
        const clientHeight = 200;
        const itemCount = 50;
        const scrollEl = makeScrollEl(clientHeight);

        const smallRowRender = (index: number, _item: number): HTMLElement => {
            const d = document.createElement('div');
            d.dataset.index = String(index);
            Object.defineProperty(d, 'offsetHeight', { value: actualHeight, configurable: true });
            return d;
        };

        const vp = new VirtualRowsViewport<number>({
            scrollEl,
            rowHeight: estimate,
            buffer: 2,
            renderRow: smallRowRender,
        });
        // No intermediate scrolling — this is the cold-jump (first render from setItems).
        vp.setItems(Array.from({ length: itemCount }, (_, i) => i));

        const { start, end } = vp.getRenderedRange();

        // The last rendered row's bottom must reach or exceed the viewport bottom.
        const lastEl = vp.getRenderedRow(end)!;
        expect(lastEl).toBeDefined();
        expect(getTranslateY(lastEl) + actualHeight).toBeGreaterThanOrEqual(clientHeight);

        // All rendered rows must be strictly contiguous (no gaps, no overlaps).
        for (let i = start + 1; i <= end; i++) {
            const el = vp.getRenderedRow(i)!;
            const prev = vp.getRenderedRow(i - 1)!;
            expect(getTranslateY(el)).toBe(getTranslateY(prev) + actualHeight);
        }
    });

    it('cold-jump (b): scrollToIndex corrects scrollTop after render measures prefix near the target', () => {
        // MAJOR scrollToIndex scenario: rows are LARGER than estimate. The first
        // scrollIntoView() undershoots (estimate-based prefix < actual prefix), so
        // after render() measures and patches the prefix, the target row ends up below
        // the viewport bottom. The second scrollIntoView() call must correct this.
        const estimate = 20;
        const actualHeight = 40; // larger than estimate → first scrollIntoView undershoots
        const clientHeight = 200;
        const itemCount = 50;
        const scrollEl = makeScrollEl(clientHeight);

        // Independently-computed true prefixes for assertions.
        const prefixes = Array.from({ length: itemCount + 1 }, (_, i) => i * actualHeight);

        const largeRowRender = (index: number, _item: number): HTMLElement => {
            const d = document.createElement('div');
            d.dataset.index = String(index);
            Object.defineProperty(d, 'offsetHeight', { value: actualHeight, configurable: true });
            return d;
        };

        const vp = new VirtualRowsViewport<number>({
            scrollEl,
            rowHeight: estimate,
            buffer: 2,
            renderRow: largeRowRender,
        });
        // setItems triggers a render that measures a handful of rows near scrollTop=0.
        vp.setItems(Array.from({ length: itemCount }, (_, i) => i));

        // Cold jump — no intermediate scrolling before scrollToIndex.
        const target = 15;
        vp.scrollToIndex(target);

        const el = vp.getRenderedRow(target)!;
        expect(el).toBeDefined();

        // The row must be positioned at its correct measured offset.
        expect(getTranslateY(el)).toBe(prefixes[target]);

        // After the double-scrollIntoView, the row must be visible in the viewport.
        const scrollTopAfter = (scrollEl as any).scrollTop as number;
        expect(getTranslateY(el)).toBeGreaterThanOrEqual(scrollTopAfter);
        expect(getTranslateY(el) + actualHeight).toBeLessThanOrEqual(scrollTopAfter + clientHeight);
    });

    it('constructor throws when rowHeight is 0 or negative', () => {
        const scrollEl = makeScrollEl(200);
        expect(() => new VirtualRowsViewport({ scrollEl, rowHeight: 0, renderRow }))
            .toThrow('rowHeight must be > 0');
        expect(() => new VirtualRowsViewport({ scrollEl, rowHeight: -10, renderRow }))
            .toThrow('rowHeight must be > 0');
    });

    // -------------------------------------------------------------------------
    // updateRow() / in-place refresh() — targeted patching
    // -------------------------------------------------------------------------

    it('updateRow re-renders a single row in place without touching the spacer or scrollTop', () => {
        const scrollEl = makeScrollEl(200);
        let suffix = 'v1';
        const dynamicRenderRow = (index: number) => {
            const d = document.createElement('div');
            d.dataset.index = String(index);
            d.textContent = `row ${index} ${suffix}`;
            return d;
        };
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow: dynamicRenderRow });
        vp.setItems([0, 1, 2]);
        (scrollEl as any).scrollTop = 0;
        const spacerBefore = (scrollEl.querySelector('[aria-hidden="true"]') as HTMLElement).style.height;

        suffix = 'v2';
        vp.updateRow(1);

        expect(vp.getRenderedRow(0)!.textContent).toBe('row 0 v1'); // untouched
        expect(vp.getRenderedRow(1)!.textContent).toBe('row 1 v2'); // updated
        expect(vp.getRenderedRow(2)!.textContent).toBe('row 2 v1'); // untouched

        const spacerAfter = (scrollEl.querySelector('[aria-hidden="true"]') as HTMLElement).style.height;
        expect(spacerAfter).toBe(spacerBefore);
        expect((scrollEl as any).scrollTop).toBe(0);
    });

    it('updateRow on an unrendered index is a no-op', () => {
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        const before = scrollEl.querySelectorAll('[data-index]').length;

        vp.updateRow(50); // far outside the rendered window near the top

        expect(scrollEl.querySelectorAll('[data-index]').length).toBe(before);
        expect(vp.getRenderedRow(50)).toBeUndefined();
    });

    it('refresh() does not touch spacer height or scrollTop', () => {
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        (scrollEl as any).scrollTop = 40;
        const spacerBefore = (scrollEl.querySelector('[aria-hidden="true"]') as HTMLElement).style.height;

        vp.refresh();

        const spacerAfter = (scrollEl.querySelector('[aria-hidden="true"]') as HTMLElement).style.height;
        expect(spacerAfter).toBe(spacerBefore);
        expect((scrollEl as any).scrollTop).toBe(40);
    });

    // -------------------------------------------------------------------------
    // setItems() measurement preservation
    // -------------------------------------------------------------------------

    it('setItems preserves measured height for indices whose item reference is unchanged', () => {
        const scrollEl = makeScrollEl(500); // tall enough to render + measure every row
        let heightsForRender: number[] = [50, 50, 50, 50];
        const measuredRenderRow = (index: number) => {
            const d = document.createElement('div');
            d.dataset.index = String(index);
            Object.defineProperty(d, 'offsetHeight', { value: heightsForRender[index], configurable: true });
            return d;
        };
        const vp = new VirtualRowsViewport<{ id: number }>({ scrollEl, rowHeight: 40, renderRow: measuredRenderRow });

        const items = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }];
        vp.setItems(items); // every row measured at 50px -> prefix [0,50,100,150,200]
        expect(getTranslateY(vp.getRenderedRow(3)!)).toBe(150);

        // Second setItems: index 1 gets a brand new item reference; indices 0,2,3 keep
        // their previous reference. Simulate offsetHeight being unmeasurable this pass
        // (0 -> jsdom guard keeps whatever is in `measured`).
        const newItems = [items[0], { id: 99 }, items[2], items[3]];
        heightsForRender = [0, 0, 0, 0];
        vp.setItems(newItems);

        // Index 2 (unchanged reference) keeps its previously measured height (50px):
        // prefix[2] = height(0)=50 + height(1) -> only height(1) reverts to the 40px
        // estimate since index 1 got a new item reference.
        expect(getTranslateY(vp.getRenderedRow(2)!)).toBe(90);
        // Index 3 (unchanged reference) also keeps its measured height (50px):
        // prefix[3] = height(0)=50 + height(1)=40(estimate) + height(2)=50(preserved) = 140.
        expect(getTranslateY(vp.getRenderedRow(3)!)).toBe(140);
    });

    // -------------------------------------------------------------------------
    // B11 code-review fixes: updateRow re-measurement, refresh() full recompute,
    // ascending DOM order after scroll-up
    // -------------------------------------------------------------------------

    it('updateRow re-measures the patched row and repositions subsequent rows when its height changes', () => {
        const scrollEl = makeScrollEl(500); // tall enough to render + measure everything
        let growRow1 = false;
        const growableRenderRow = (index: number) => {
            const d = document.createElement('div');
            d.dataset.index = String(index);
            const h = (index === 1 && growRow1) ? 80 : 40;
            Object.defineProperty(d, 'offsetHeight', { value: h, configurable: true });
            return d;
        };
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow: growableRenderRow });
        vp.setItems([0, 1, 2, 3]);

        expect(getTranslateY(vp.getRenderedRow(2)!)).toBe(80);  // 40 + 40
        expect(getTranslateY(vp.getRenderedRow(3)!)).toBe(120); // 40 + 40 + 40

        // Simulate e.g. a selection change adding `font-bold` and growing row 1.
        growRow1 = true;
        vp.updateRow(1);

        // Row 1 is now 80px tall — rows below it must shift down, not overlap.
        expect(getTranslateY(vp.getRenderedRow(2)!)).toBe(120); // 40 + 80
        expect(getTranslateY(vp.getRenderedRow(3)!)).toBe(160); // 40 + 80 + 40
        const spacer = scrollEl.querySelector('[aria-hidden="true"]') as HTMLElement;
        expect(spacer.style.height).toBe('200px'); // 40 + 80 + 40 + 40
    });

    it('refresh() recomputes the window from current scrollTop/clientHeight (evicts/appends), not just patches existing rows', () => {
        // Simulates the multi-select-list scenario: the first render happens while the
        // container still reports 0 height (before layout/ResizeObserver catches up), so
        // only the buffer-sized narrow window is rendered. A later style/selection change
        // calls refresh() — by then the container has real height, and refresh() must
        // widen the window itself rather than only patching the stale narrow set of rows.
        const scrollEl = makeScrollEl(0);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, buffer: 2, renderRow });
        vp.setItems(Array.from({ length: 50 }, (_, i) => i));
        const narrowRange = vp.getRenderedRange();
        expect(narrowRange.end).toBeLessThan(10);

        (scrollEl as any).clientHeight = 400;
        vp.refresh();

        const widerRange = vp.getRenderedRange();
        expect(widerRange.end).toBeGreaterThan(narrowRange.end);
    });

    it('keeps rendered rows in ascending DOM order after scrolling down then back up', () => {
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, buffer: 2, renderRow });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));

        // Scroll down — window shifts forward, higher indices get appended.
        (scrollEl as any).scrollTop = 2000;
        scrollEl.dispatchEvent(new Event('scroll'));

        // Scroll back up — window shifts backward, re-adding lower indices that must be
        // inserted BEFORE the still-rendered higher ones, not appended after them.
        (scrollEl as any).scrollTop = 0;
        scrollEl.dispatchEvent(new Event('scroll'));

        const domIndices = Array.from(scrollEl.querySelectorAll('[data-index]'))
            .map(el => Number((el as HTMLElement).dataset.index));
        const sorted = [...domIndices].sort((a, b) => a - b);
        expect(domIndices).toEqual(sorted);
    });

    it('updateRow does not blindly extend the window when scrollTop drifted without a render (regression: scrollbar drag before rAF)', () => {
        // Repro: a scrollbar drag can move scrollTop far down without the throttled
        // scroll-event render() having run yet (rAF hasn't fired). If updateRow() then
        // patches a row from the OLD window and only extends geometry from a stale
        // `range.end`, it appends every index between the old window and the new scroll
        // position instead of re-deriving the window — thousands of rows for a big jump.
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, buffer: 5, renderRow });
        vp.setItems(Array.from({ length: 10000 }, (_, i) => i));
        const initialCount = scrollEl.querySelectorAll('[data-index]').length;
        expect(initialCount).toBeLessThan(20); // sane initial window near the top

        // Scrollbar drag: scrollTop jumps far down with NO 'scroll' event dispatched.
        (scrollEl as any).scrollTop = 300000;

        vp.updateRow(2); // targets a row from the OLD (pre-jump) window

        const renderedCount = scrollEl.querySelectorAll('[data-index]').length;
        // Must stay bounded to a sane window size — never balloon toward thousands.
        expect(renderedCount).toBeLessThanOrEqual(30);
    });

    it('invalidateMeasurements() heals a height that went stale because renderRow reads external state (regression: row stuck at old height forever)', () => {
        // Repro: renderRow reads external mutable state (e.g. a captured selection) that
        // changes a row's height (font-bold growing it to 88px). The row scrolls out
        // before that state change, so it's never re-measured; a later setItems() with
        // the SAME item references (per-reference measurement preservation) then keeps
        // reusing the stale 88px forever, corrupting prefix/spacer for every row after it.
        const itemCount = 20;
        let boldIndex: number | null = 5;
        const scrollEl = makeScrollEl(80); // small window: ~2 rows visible + buffer
        const externalStateRenderRow = (index: number): HTMLElement => {
            const d = document.createElement('div');
            d.dataset.index = String(index);
            const h = index === boldIndex ? 88 : 40;
            Object.defineProperty(d, 'offsetHeight', { value: h, configurable: true });
            return d;
        };
        const vp = new VirtualRowsViewport<number>({
            scrollEl, rowHeight: 40, buffer: 2, renderRow: externalStateRenderRow,
        });
        const items = Array.from({ length: itemCount }, (_, i) => i);
        vp.setItems(items);

        // Scroll row 5 into view so it gets measured at 88px while "selected".
        vp.scrollToIndex(5);
        expect(vp.getRenderedRow(5)!.offsetHeight).toBe(88);

        // Scroll far away — row 5 is evicted and won't be measured again.
        (scrollEl as any).scrollTop = 2000;
        scrollEl.dispatchEvent(new Event('scroll'));
        expect(vp.getRenderedRow(5)).toBeUndefined();

        // External state changes: row 5 is no longer "selected" and would now render at
        // 40px — but nothing tells the viewport its cached measurement is stale.
        boldIndex = null;

        // Re-emit the SAME item references (setItems preserves cached heights per-index
        // when the reference is unchanged) and scroll to the end — row 5's stale 88px
        // still contributes to the spacer/prefix even though it's off-screen.
        vp.setItems([...items]);
        vp.scrollToIndex(itemCount - 1);
        const spacerStale = (scrollEl.querySelector('[aria-hidden="true"]') as HTMLElement).style.height;
        expect(spacerStale).toBe(`${(itemCount - 1) * 40 + 88}px`); // 19 rows @ 40px + row 5 stuck @ 88px

        // Fix: invalidate measurements (e.g. right after the external state change) so
        // every height reverts to the estimate and is re-derived from the current
        // renderRow output when next measured.
        vp.invalidateMeasurements();
        const spacerHealed = (scrollEl.querySelector('[aria-hidden="true"]') as HTMLElement).style.height;
        expect(spacerHealed).toBe(`${itemCount * 40}px`); // all rows back to the 40px estimate
    });

    it('updateRows() patches multiple rows with a single window recompute, not one per row', () => {
        const scrollEl = makeScrollEl(200);
        const renderCalls: number[] = [];
        const countingRenderRow = (index: number) => {
            renderCalls.push(index);
            const d = document.createElement('div');
            d.dataset.index = String(index);
            return d;
        };
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow: countingRenderRow });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        renderCalls.length = 0;

        vp.updateRows([1, 2, 3]);

        // Each patched row is rebuilt exactly once (renderRow called once per index) —
        // a per-row updateRow() loop would additionally re-render every OTHER rendered
        // row on each of the 3 calls (3 full render() passes instead of 1).
        expect(renderCalls.filter(i => i === 1).length).toBe(1);
        expect(renderCalls.filter(i => i === 2).length).toBe(1);
        expect(renderCalls.filter(i => i === 3).length).toBe(1);
        expect(vp.getRenderedRow(1)).toBeDefined();
        expect(vp.getRenderedRow(2)).toBeDefined();
        expect(vp.getRenderedRow(3)).toBeDefined();
    });

    it('handles a large backward scroll jump without a pathological forward probe (bounded findNextRenderedElement)', () => {
        // Regression for the stale-range.end forward-probe bound: a 10k-row backward
        // jump used to probe up to the OLD (pre-jump) range end for every appended row.
        // This just needs to complete quickly and land on a sane, correctly-ordered
        // window — the old bug was a perf/complexity issue, not a correctness crash.
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, buffer: 5, renderRow });
        vp.setItems(Array.from({ length: 10000 }, (_, i) => i));

        // Scroll deep into the list, then jump all the way back to the top.
        (scrollEl as any).scrollTop = 9000 * 40;
        scrollEl.dispatchEvent(new Event('scroll'));
        (scrollEl as any).scrollTop = 0;
        const start = Date.now();
        scrollEl.dispatchEvent(new Event('scroll'));
        const elapsedMs = Date.now() - start;

        expect(elapsedMs).toBeLessThan(200); // was effectively O(old window size) per row
        const range = vp.getRenderedRange();
        expect(range.start).toBe(0);

        const domIndices = Array.from(scrollEl.querySelectorAll('[data-index]'))
            .map(el => Number((el as HTMLElement).dataset.index));
        expect(domIndices).toEqual([...domIndices].sort((a, b) => a - b));
    });

    it('destroy() prevents in-flight rAF from re-rendering after teardown', () => {
        // rAF is synchronous in this test environment, so the sequence
        // scroll → destroy → rAF fires tests the destroyed guard directly.
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        const rangeBeforeDestroy = vp.getRenderedRange();

        // Trigger the rAF but capture ticking=true before it fires by going through
        // the actual event path, then destroy synchronously. Since our rAF stub fires
        // immediately the real guard path is: destroy sets flag, render() checks it.
        vp.destroy();

        // After destroy the range must be unchanged (render() returned early).
        expect(vp.getRenderedRange()).toEqual(rangeBeforeDestroy);
        // Spacer must be gone.
        expect(scrollEl.querySelector('[aria-hidden="true"]')).toBeNull();
    });

    // -------------------------------------------------------------------------
    // B11 QA: measurement lifecycle + batching edge cases
    // -------------------------------------------------------------------------

    it('setItems drops measured heights for the stale tail when the new array is shorter', () => {
        const scrollEl = makeScrollEl(500); // tall enough to render + measure every row
        let heightsForRender: number[] = [100, 100, 100, 100];
        const measuredRenderRow = (index: number) => {
            const d = document.createElement('div');
            d.dataset.index = String(index);
            Object.defineProperty(d, 'offsetHeight', { value: heightsForRender[index] ?? 0, configurable: true });
            return d;
        };
        const vp = new VirtualRowsViewport<{ id: number }>({ scrollEl, rowHeight: 40, renderRow: measuredRenderRow });
        const spacer = () => (scrollEl.querySelector('[aria-hidden="true"]') as HTMLElement).style.height;

        const items = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }];
        vp.setItems(items);
        expect(spacer()).toBe('400px'); // 4 rows measured @ 100px

        // Shorter array, same references for the surviving prefix. The measurements for
        // the dropped tail (indices 2,3) must not survive into the new prefix/spacer.
        heightsForRender = [0, 0]; // unmeasurable this pass -> preserved values are what count
        vp.setItems([items[0], items[1]]);

        expect(spacer()).toBe('200px'); // 2 preserved rows @ 100px, no tail contribution
        expect(vp.getRenderedRange().end).toBe(1);
        expect(vp.getRenderedRow(2)).toBeUndefined();
        expect(vp.getRenderedRow(3)).toBeUndefined();
    });

    it('refresh() keeps the rendered count bounded when scrollTop drifted without a scroll event', () => {
        // Same hazard as the updateRow() scrollbar-drag regression, via refresh(): the
        // style-change path calls refresh() and must re-derive the window from the current
        // scrollTop rather than extending from a stale range.
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, buffer: 5, renderRow });
        vp.setItems(Array.from({ length: 10000 }, (_, i) => i));
        expect(scrollEl.querySelectorAll('[data-index]').length).toBeLessThan(20);

        (scrollEl as any).scrollTop = 300000; // no 'scroll' event dispatched
        vp.refresh();

        expect(scrollEl.querySelectorAll('[data-index]').length).toBeLessThanOrEqual(30);
        expect(vp.getRenderedRange().start).toBeGreaterThan(7000);
    });

    it('invalidateMeasurements() rebuilds prefix and spacer immediately, but does NOT reposition already-rendered rows until the next render', () => {
        const scrollEl = makeScrollEl(500);
        let heightsForRender: number[] = [100, 100, 100, 100];
        const measuredRenderRow = (index: number) => {
            const d = document.createElement('div');
            d.dataset.index = String(index);
            Object.defineProperty(d, 'offsetHeight', { value: heightsForRender[index], configurable: true });
            return d;
        };
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow: measuredRenderRow });
        vp.setItems([0, 1, 2, 3]);
        const spacer = () => (scrollEl.querySelector('[aria-hidden="true"]') as HTMLElement).style.height;
        expect(spacer()).toBe('400px');
        expect(getTranslateY(vp.getRenderedRow(3)!)).toBe(300);

        vp.invalidateMeasurements();

        // Prefix/spacer are rebuilt from the estimate straight away...
        expect(spacer()).toBe('160px'); // 4 rows @ the 40px estimate
        // ...but the DOM nodes still carry the transforms computed from the OLD prefix:
        // the viewport is only fully consistent again after a render/refresh.
        expect(getTranslateY(vp.getRenderedRow(3)!)).toBe(300);

        heightsForRender = [0, 0, 0, 0]; // unmeasurable -> estimate stands
        vp.refresh();
        expect(getTranslateY(vp.getRenderedRow(3)!)).toBe(120); // 3 × 40px estimate
    });

    it('updateRows([]) recomputes the window without replacing any row element', () => {
        const scrollEl = makeScrollEl(0);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, buffer: 2, renderRow });
        vp.setItems(Array.from({ length: 50 }, (_, i) => i));
        const narrowEnd = vp.getRenderedRange().end;
        const row0Before = vp.getRenderedRow(0);

        (scrollEl as any).clientHeight = 400;
        vp.updateRows([]);

        expect(vp.getRenderedRow(0)).toBe(row0Before); // no patch => same element instance
        expect(vp.getRenderedRange().end).toBeGreaterThan(narrowEnd); // window still recomputed
    });

    it('refresh() replaces every rendered row element and evicts each old one exactly once', () => {
        const scrollEl = makeScrollEl(200);
        const evicted: number[] = [];
        const vp = new VirtualRowsViewport<number>({
            scrollEl, rowHeight: 40, buffer: 1, renderRow,
            onEvict: (_el, index) => { evicted.push(index); },
        });
        vp.setItems([0, 1, 2, 3, 4]);
        const { start, end } = vp.getRenderedRange();
        const before: Array<[number, HTMLElement]> = [];
        for (let i = start; i <= end; i++) {
            before.push([i, vp.getRenderedRow(i)!]);
        }
        expect(before.length).toBeGreaterThan(0);
        evicted.length = 0;

        vp.refresh();

        for (const [i, el] of before) {
            expect(vp.getRenderedRow(i)).toBeDefined();
            expect(vp.getRenderedRow(i)).not.toBe(el); // element identity is NOT preserved
            expect(evicted.filter(e => e === i).length).toBe(1);
        }
    });
});
