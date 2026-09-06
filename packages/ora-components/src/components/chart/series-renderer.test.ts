import { ChartBuilder } from './chart-builder';
import { of } from 'rxjs';

// ---------------------------------------------------------------------------
// SeriesRenderer.renderBars — grouped and stacked bar placement (Task 7).
//
// Mirrors the IntersectionObserver mock used throughout chart.test.ts so
// createOptimizedPipeline delivers data synchronously on build().
// ---------------------------------------------------------------------------

describe('SeriesRenderer — grouped and stacked bars', () => {
    const originalIntersectionObserver = window.IntersectionObserver;

    beforeEach(() => {
        jest.useFakeTimers();

        class MockIntersectionObserver implements IntersectionObserver {
            readonly root: Element | Document | null = null;
            readonly rootMargin: string = '';
            readonly thresholds: ReadonlyArray<number> = [];

            constructor(private callback: IntersectionObserverCallback) {}

            observe(element: Element) {
                const entry: IntersectionObserverEntry = {
                    target: element,
                    isIntersecting: true,
                    intersectionRatio: 1,
                    boundingClientRect: element.getBoundingClientRect(),
                    intersectionRect: element.getBoundingClientRect(),
                    rootBounds: null,
                    time: Date.now(),
                } as IntersectionObserverEntry;

                this.callback([entry], this);
                jest.advanceTimersByTime(150);
            }

            unobserve() {}
            disconnect() {}
            takeRecords() { return []; }
        }

        window.IntersectionObserver = MockIntersectionObserver as any;
    });

    afterEach(() => {
        jest.useRealTimers();
        window.IntersectionObserver = originalIntersectionObserver;
    });

    type Row = { category: string; a: number; b: number };
    const threeCategoryData: Row[] = [
        { category: 'A', a: 10, b: 20 },
        { category: 'B', a: 15, b: 5 },
        { category: 'C', a: 8, b: 12 }
    ];

    function barRects(chart: HTMLElement) {
        return Array.from(chart.querySelectorAll('rect')).filter(el => !el.closest('clipPath'));
    }

    function interval(rect: Element) {
        const x = parseFloat(rect.getAttribute('x')!);
        const width = parseFloat(rect.getAttribute('width')!);
        return { x, width, end: x + width };
    }

    function overlaps(a: { x: number; end: number }, b: { x: number; end: number }): boolean {
        return a.x < b.end && b.x < a.end;
    }

    it('renders one rect per series per category (6 rects for 2 series x 3 categories)', () => {
        const builder = new ChartBuilder<Row>()
            .withData(of(threeCategoryData))
            .withCategoryField('category')
            .withAnimation(false);
        builder.addBarChart('a').withColor('red');
        builder.addBarChart('b').withColor('blue');

        const chart = builder.build();
        expect(barRects(chart).length).toBe(6);
    });

    it('gives the two series disjoint [x, x+width] intervals within each category group', () => {
        const builder = new ChartBuilder<Row>()
            .withData(of(threeCategoryData))
            .withCategoryField('category')
            .withAnimation(false);
        builder.addBarChart('a').withColor('red');
        builder.addBarChart('b').withColor('blue');

        const chart = builder.build();
        const rects = barRects(chart);

        const redIntervals = rects.filter(r => r.getAttribute('fill') === 'red').map(interval).sort((x, y) => x.x - y.x);
        const blueIntervals = rects.filter(r => r.getAttribute('fill') === 'blue').map(interval).sort((x, y) => x.x - y.x);

        expect(redIntervals.length).toBe(3);
        expect(blueIntervals.length).toBe(3);

        redIntervals.forEach((redInt, i) => {
            const blueInt = blueIntervals[i];
            expect(overlaps(redInt, blueInt)).toBe(false);
        });
    });

    it('withBarWidth(0.5) renders that series at 50% of its shared slot width', () => {
        const builder = new ChartBuilder<Row>()
            .withData(of(threeCategoryData))
            .withCategoryField('category')
            .withAnimation(false);
        // 'a' keeps the default 0.8 ratio; 'b' is narrowed to 0.5 of the *same* slot.
        builder.addBarChart('a').withColor('red');
        builder.addBarChart('b').withColor('blue').withBarWidth(0.5);

        const chart = builder.build();
        const rects = barRects(chart);

        const redWidth = parseFloat(rects.find(r => r.getAttribute('fill') === 'red')!.getAttribute('width')!);
        const blueWidth = parseFloat(rects.find(r => r.getAttribute('fill') === 'blue')!.getAttribute('width')!);

        // Both series' slots are the same width (barSlot); 'a' occupies 0.8 of its slot,
        // 'b' occupies 0.5 of its own — so blueWidth / redWidth === 0.5 / 0.8.
        const slotWidth = redWidth / 0.8;
        expect(blueWidth).toBeCloseTo(slotWidth * 0.5, 1);
    });

    it('withBarWidth narrows a bar within its slot without moving the slot itself', () => {
        // A single non-stacked series is its own whole slot; changing its ratio must only
        // change the width (inset evenly from both sides), never the slot's center.
        function firstBarCenter(ratio: number): number {
            const builder = new ChartBuilder<Row>()
                .withData(of(threeCategoryData))
                .withCategoryField('category')
                .withAnimation(false);
            builder.addBarChart('a').withColor('red').withBarWidth(ratio);
            const rect = barRects(builder.build()).find(r => r.getAttribute('fill') === 'red')!;
            const x = parseFloat(rect.getAttribute('x')!);
            const width = parseFloat(rect.getAttribute('width')!);
            return x + width / 2;
        }

        expect(firstBarCenter(0.5)).toBeCloseTo(firstBarCenter(0.8), 1);
        expect(firstBarCenter(1)).toBeCloseTo(firstBarCenter(0.8), 1);
    });

    it('gives one, two and three bar series the same single-bar rendered width (bug fix)', () => {
        // The bug: adding series to a category used to divide the group width among them,
        // making each bar thinner. A single series' rendered width must be unchanged no
        // matter how many other series share its category.
        function firstBarWidth(seriesCount: number): number {
            const builder = new ChartBuilder<Row>()
                .withData(of(threeCategoryData))
                .withCategoryField('category')
                .withAnimation(false);
            const fields: (keyof Row)[] = ['a', 'b', 'a'];
            for (let i = 0; i < seriesCount; i++) {
                builder.addBarChart(fields[i] as string).withColor(i === 0 ? 'red' : `series-${i}`);
            }
            const chart = builder.build();
            const rect = barRects(chart).find(r => r.getAttribute('fill') === 'red')!;
            return parseFloat(rect.getAttribute('width')!);
        }

        const oneSeriesWidth = firstBarWidth(1);
        expect(firstBarWidth(2)).toBeCloseTo(oneSeriesWidth, 1);
        expect(firstBarWidth(3)).toBeCloseTo(oneSeriesWidth, 1);
    });

    it('keeps grouped rects contiguous and the group centered on the category tick', () => {
        const builder = new ChartBuilder<Row>()
            .withData(of(threeCategoryData))
            .withCategoryField('category')
            .withAnimation(false);
        builder.addBarChart('a').withColor('red').withBarWidth(1);
        builder.addBarChart('b').withColor('blue').withBarWidth(1);

        const chart = builder.build();
        const rects = barRects(chart);
        const redIntervals = rects.filter(r => r.getAttribute('fill') === 'red').map(interval).sort((x, y) => x.x - y.x);
        const blueIntervals = rects.filter(r => r.getAttribute('fill') === 'blue').map(interval).sort((x, y) => x.x - y.x);

        // ratio 1 removes the inset, so adjacent slots (red then blue) must be flush.
        redIntervals.forEach((redInt, i) => {
            const blueInt = blueIntervals[i];
            expect(blueInt.x).toBeCloseTo(redInt.end, 1);
        });

        // The group (red + blue) is centered on the category's tick: since `xScale(i)` is
        // affine in `i` (evenly spaced ticks) and every group has the same width, the group
        // midpoints must themselves be evenly spaced by the same step.
        const groupCenters = redIntervals.map((redInt, i) => (redInt.x + blueIntervals[i].end) / 2);
        const step0 = groupCenters[1] - groupCenters[0];
        const step1 = groupCenters[2] - groupCenters[1];
        expect(step1).toBeCloseTo(step0, 1);
    });

    it('keeps the 8px left-edge padding for a grouped (2-series) category (edge-overflow regression)', () => {
        // Regression: widening the group to give every series the single-bar width must not
        // push the leftmost bar of the first category past the Y-axis's 8px padding — the
        // group's edge padding/spacing (xScale) has to grow with it, not stay pinned to the
        // width a single bar would have used.
        const builder = new ChartBuilder<Row>()
            .withData(of(threeCategoryData))
            .withCategoryField('category')
            .withAnimation(false);
        builder.addBarChart('a').withColor('red').withBarWidth(1);
        builder.addBarChart('b').withColor('blue').withBarWidth(1);

        const chart = builder.build();
        const rects = barRects(chart);
        const firstCategoryX = Math.min(...rects.map(r => parseFloat(r.getAttribute('x')!)));
        expect(firstCategoryX).toBeCloseTo(8, 0);
    });

    it('gives a stacked group and a non-stacked series both the single-bar width', () => {
        const data = [{ category: 'A', a: 10, b: 5, c: 3 }];
        const soloBuilder = new ChartBuilder<any>()
            .withData(of(data))
            .withCategoryField('category')
            .withAnimation(false);
        soloBuilder.addBarChart('a').withColor('red');
        const soloWidth = parseFloat(barRects(soloBuilder.build()).find(r => r.getAttribute('fill') === 'red')!.getAttribute('width')!);

        const builder = new ChartBuilder<any>()
            .withData(of(data))
            .withCategoryField('category')
            .withAnimation(false);
        builder.addBarChart('a').withColor('red'); // non-stacked, its own slot
        builder.addBarChart('b').asStacked().withColor('blue'); // stacked group, shared slot
        builder.addBarChart('c').asStacked().withColor('green'); // stacked group, shared slot

        const chart = builder.build();
        const rects = barRects(chart);
        const nonStackedWidth = parseFloat(rects.find(r => r.getAttribute('fill') === 'red')!.getAttribute('width')!);
        const stackedWidth = parseFloat(rects.find(r => r.getAttribute('fill') === 'blue')!.getAttribute('width')!);

        expect(nonStackedWidth).toBeCloseTo(soloWidth, 1);
        expect(stackedWidth).toBeCloseTo(soloWidth, 1);
    });

    it('stacks two positive stacked series: the second series bottom meets the first series top', () => {
        const data: Row[] = [{ category: 'A', a: 10, b: 5 }];
        const builder = new ChartBuilder<Row>()
            .withData(of(data))
            .withCategoryField('category')
            .withAnimation(false);
        builder.addBarChart('a').asStacked().withColor('red');
        builder.addBarChart('b').asStacked().withColor('blue');

        const chart = builder.build();
        const rectA = chart.querySelector('rect[fill="red"]')!;
        const rectB = chart.querySelector('rect[fill="blue"]')!;

        const yA = parseFloat(rectA.getAttribute('y')!);
        const yB = parseFloat(rectB.getAttribute('y')!);
        const hB = parseFloat(rectB.getAttribute('height')!);

        // SVG y grows downward; the second (higher-value) stacked series sits visually
        // above the first, so its bottom edge (y + height) meets the first series' top edge.
        expect(yB + hB).toBeCloseTo(yA, 1);
    });

    it('stacks negative values downward from the zero line, independently of the positive stack', () => {
        const data: Row[] = [{ category: 'A', a: -10, b: -5 }];
        const builder = new ChartBuilder<Row>()
            .withData(of(data))
            .withCategoryField('category')
            .withAnimation(false);
        builder.addBarChart('a').asStacked().withColor('red');
        builder.addBarChart('b').asStacked().withColor('blue');

        const chart = builder.build();
        const rectA = chart.querySelector('rect[fill="red"]')!;
        const rectB = chart.querySelector('rect[fill="blue"]')!;

        const yA = parseFloat(rectA.getAttribute('y')!);
        const hA = parseFloat(rectA.getAttribute('height')!);
        const yB = parseFloat(rectB.getAttribute('y')!);

        // Both bars grow downward from the zero line: the second series' top edge meets
        // the first series' bottom edge (opposite pairing from the positive-value case).
        expect(yB).toBeCloseTo(yA + hA, 1);
    });

    it('mixes positive and negative values within one category, stacking each sign separately', () => {
        const data: Row[] = [{ category: 'A', a: 10, b: -5 }];
        const builder = new ChartBuilder<Row>()
            .withData(of(data))
            .withCategoryField('category')
            .withAnimation(false);
        builder.addBarChart('a').asStacked().withColor('red');
        builder.addBarChart('b').asStacked().withColor('blue');

        const chart = builder.build();
        const rectA = chart.querySelector('rect[fill="red"]')!;
        const rectB = chart.querySelector('rect[fill="blue"]')!;

        // 'a' (positive) and 'b' (negative) must not touch — each stacks from its own
        // zero-line baseline, not from the other series' edge.
        const yA = parseFloat(rectA.getAttribute('y')!);
        const hA = parseFloat(rectA.getAttribute('height')!);
        const yB = parseFloat(rectB.getAttribute('y')!);

        expect(yA + hA).toBeCloseTo(yB, 1); // both start flush against the same zero line
    });

    it('mixing one non-stacked series with a stacked group gives each its own slot (no overlap)', () => {
        const data = [{ category: 'A', a: 10, b: 5, c: 3 }];
        const builder = new ChartBuilder<any>()
            .withData(of(data))
            .withCategoryField('category')
            .withAnimation(false);
        builder.addBarChart('a').withColor('red'); // non-stacked, its own slot
        builder.addBarChart('b').asStacked().withColor('blue'); // stacked group, shared slot
        builder.addBarChart('c').asStacked().withColor('green'); // stacked group, shared slot

        const chart = builder.build();
        const rects = barRects(chart);
        expect(rects.length).toBe(3);

        const nonStacked = interval(rects.find(r => r.getAttribute('fill') === 'red')!);
        const stacked1 = interval(rects.find(r => r.getAttribute('fill') === 'blue')!);
        const stacked2 = interval(rects.find(r => r.getAttribute('fill') === 'green')!);

        // The non-stacked series and the stacked group occupy disjoint x ranges...
        expect(overlaps(nonStacked, stacked1)).toBe(false);
        expect(overlaps(nonStacked, stacked2)).toBe(false);
        // ...while the two stacked series inside the group share the same x/width.
        expect(stacked1.x).toBeCloseTo(stacked2.x, 1);
        expect(stacked1.width).toBeCloseTo(stacked2.width, 1);
    });
});
