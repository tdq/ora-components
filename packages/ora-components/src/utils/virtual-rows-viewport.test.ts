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
});
