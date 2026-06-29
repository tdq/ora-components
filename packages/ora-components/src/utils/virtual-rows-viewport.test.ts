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
});
