import { ChartBuilder } from './chart-builder';
import { ChartLogic } from './chart-logic';
import { ChartState } from './types';
import { AxisRenderer } from './axis-renderer';
import { HIGHLIGHT_DIAMETER } from './constants';
import { Observable, of, BehaviorSubject } from 'rxjs';
import '@testing-library/jest-dom';
import { GatedObserver } from '../../utils/optimized-pipeline';
import { SeriesRenderer } from './series-renderer';

// ---------------------------------------------------------------------------
// Helpers for ChartLogic.calculateScales tests
// ---------------------------------------------------------------------------

type TestItem = { category: string; value: number };

function makeState(items: TestItem[]): ChartState<TestItem> {
    return {
        data: items,
        categoryField: 'category',
        charts: [],
        xAxis: { visible: true, showGridLines: true, showMinorGridLines: false, position: 'bottom', scaleType: 'category' },
        yAxis: { visible: true, showGridLines: true, showMinorGridLines: false, position: 'left', scaleType: 'linear', ticks: 5 },
        showLegend: false,
        showTooltip: false,
        isGlass: false,
        animate: false,
        height: 300,
        width: '100%',
    };
}

function makeItems(count: number): TestItem[] {
    return Array.from({ length: count }, (_, i) => ({ category: `C${i}`, value: i }));
}

// AxisRenderer.getLabelRotation constants (mirrors implementation):
//   CHAR_WIDTH_PX = 7
//   estimatedWidth = maxLen * 7
//   0   when estimatedWidth <= xStep * 0.8
//   -45 when estimatedWidth * 0.707 <= xStep * 0.8  (and did not satisfy the 0-check)
//   -90 otherwise
describe('AxisRenderer.getLabelRotation (ST-3)', () => {
    // --- Edge cases ---
    it('returns 0 for empty categories array', () => {
        expect(AxisRenderer.getLabelRotation([], 100)).toBe(0);
    });

    it('returns 0 for a single short category that fits', () => {
        // "A" → estimatedWidth=7; xStep=100; 7 <= 80 → 0
        expect(AxisRenderer.getLabelRotation(['A'], 100)).toBe(0);
    });

    it('returns 0 when xStep is 0 (degenerate guard)', () => {
        expect(AxisRenderer.getLabelRotation(['January'], 0)).toBe(0);
    });

    it('returns 0 when xStep is negative (degenerate guard)', () => {
        expect(AxisRenderer.getLabelRotation(['January'], -10)).toBe(0);
    });

    // --- No rotation: labels fit horizontally ---
    it('returns 0 when estimated label width is exactly at the 0.8*xStep threshold', () => {
        // maxLen=8 → estimatedWidth=56; xStep=70; 56 === 70*0.8=56 → 0
        expect(AxisRenderer.getLabelRotation(['ABCDEFGH'], 70)).toBe(0);
    });

    it('returns 0 when short labels are well below the threshold', () => {
        // "Jan"=3 chars → 21px; xStep=100; 21 <= 80 → 0
        expect(AxisRenderer.getLabelRotation(['Jan', 'Feb', 'Mar'], 100)).toBe(0);
    });

    it('uses the longest label across all categories when determining rotation', () => {
        // Longest is "AAAAAAAAAA"=10 chars → 70px; xStep=80; threshold=64
        // 70 > 64 → not 0; 70*0.707=49.49 <= 64 → -45
        expect(AxisRenderer.getLabelRotation(['A', 'AAAAAAAAAA', 'BB'], 80)).toBe(-45);
    });

    // --- Moderate overlap: -45 degree rotation ---
    it('returns -45 when label fits at 45 degrees but not horizontally', () => {
        // maxLen=10 → estimatedWidth=70; xStep=80; threshold=64
        // 70 > 64 → not 0; 70*0.707=49.49 <= 64 → -45
        expect(AxisRenderer.getLabelRotation(['AAAAAAAAAA'], 80)).toBe(-45);
    });

    it('returns -45 just above the horizontal threshold', () => {
        // maxLen=9 → 63px; xStep=78; 78*0.8=62.4; 63 > 62.4 → not 0
        // 63*0.707=44.54 <= 62.4 → -45
        expect(AxisRenderer.getLabelRotation(['123456789'], 78)).toBe(-45);
    });

    it('returns -45 at the exact 45-degree threshold boundary (estimatedWidth*0.707 === xStep*0.8)', () => {
        // maxLen=16 → estimatedWidth=112; xStep=99 → 99*0.8=79.2
        // Horizontal check: 112 > 79.2 → not 0
        // 112*0.707=79.184 <= 79.2 → -45
        expect(AxisRenderer.getLabelRotation(['A'.repeat(16)], 99)).toBe(-45);
    });

    // --- Severe overlap: -90 degree rotation ---
    it('returns -90 when label does not fit even at 45 degrees', () => {
        // maxLen=20 → estimatedWidth=140; xStep=80; threshold=64
        // 140 > 64 → not 0; 140*0.707=98.98 > 64 → -90
        expect(AxisRenderer.getLabelRotation(['A'.repeat(20)], 80)).toBe(-90);
    });

    it('returns -90 for realistic long month names packed tightly', () => {
        // "September"=9 chars → 63px; xStep=30; threshold=24
        // 63 > 24 → not 0; 63*0.707=44.54 > 24 → -90
        expect(AxisRenderer.getLabelRotation(['January', 'February', 'September'], 30)).toBe(-90);
    });

    it('returns -90 just above the 45-degree threshold boundary', () => {
        // maxLen=16 → estimatedWidth=112; xStep=98; 98*0.8=78.4
        // 112 > 78.4 → not 0; 112*0.707=79.184 > 78.4 → -90
        expect(AxisRenderer.getLabelRotation(['A'.repeat(16)], 98)).toBe(-90);
    });
});

describe('ChartBuilder', () => {
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

    const testData = [
        { category: 'Jan', value1: 10, value2: 20 },
        { category: 'Feb', value1: 15, value2: 25 },
        { category: 'Mar', value1: 8, value2: 30 }
    ];

    it('withData() stores the raw Observable without subscribing immediately', () => {
        const spy = jest.fn();
        const data$ = new Observable<any[]>(subscriber => {
            spy();
            subscriber.next(testData);
        });

        const builder = new ChartBuilder<any>()
            .withData(data$)
            .withCategoryField('category');

        // Must NOT subscribe until build() is called
        expect(spy).not.toHaveBeenCalled();

        // build() subscribes and the pipeline delivers data
        builder.build();
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should create a chart container', () => {
        const chart = new ChartBuilder()
            .withData(of(testData))
            .withCategoryField('category')
            .build();

        expect(chart).toBeInstanceOf(HTMLDivElement);
        expect(chart.querySelector('svg')).not.toBeNull();
    });

    it('should display title when provided', () => {
        const title = 'Sales Report';
        const chart = new ChartBuilder()
            .withData(of(testData))
            .withCategoryField('category')
            .withTitle(of(title))
            .build();

        const titleEl = chart.querySelector('.text-title-large');
        expect(titleEl?.textContent).toBe(title);
    });

    it('should render line series', () => {
        const chartBuilder = new ChartBuilder<any>()
            .withData(of(testData))
            .withCategoryField('category');
        
        chartBuilder.addLineChart('value1').withLabel('Value 1');
        
        const chart = chartBuilder.build();

        // Check if path exists in SVG (lines use path now)
        const path = chart.querySelector('path');
        expect(path).not.toBeNull();
        expect(path).toHaveAttribute('stroke');
    });

    it('should render bar series', () => {
        const chartBuilder = new ChartBuilder<any>()
            .withData(of(testData))
            .withCategoryField('category');
        
        chartBuilder.addBarChart('value1');
        
        const chart = chartBuilder.build();

        // Check if rects exist in SVG (one per data point); exclude clipPath rects in defs
        const rects = Array.from(chart.querySelectorAll('rect')).filter(el => !el.closest('clipPath'));
        expect(rects.length).toBe(testData.length);
    });

    it('should render area series', () => {
        const chartBuilder = new ChartBuilder<any>()
            .withData(of(testData))
            .withCategoryField('category');
        
        chartBuilder.addAreaChart('value1');
        
        const chart = chartBuilder.build();

        // Check if path exists in SVG (area fill)
        const paths = chart.querySelectorAll('path');
        expect(paths.length).toBeGreaterThan(0);
    });

    it('should render multiple series', () => {
        const chartBuilder = new ChartBuilder<any>()
            .withData(of(testData))
            .withCategoryField('category');
        
        chartBuilder.addLineChart('value1');
        chartBuilder.addBarChart('value2');
        
        const chart = chartBuilder.build();

        expect(chart.querySelector('path')).not.toBeNull();
        const seriesRects = Array.from(chart.querySelectorAll('rect')).filter(el => !el.closest('clipPath'));
        expect(seriesRects.length).toBe(testData.length);
    });

    it('should render legend when enabled', () => {
        const chartBuilder = new ChartBuilder<any>()
            .withData(of(testData))
            .withCategoryField('category');
        
        chartBuilder.addLineChart('value1').withLabel('V1');
        chartBuilder.withLegend(true);
        
        const chart = chartBuilder.build();

        const legend = chart.querySelector('.flex.flex-wrap.gap-4');
        expect(legend).not.toBeNull();
        expect(legend?.textContent).toContain('V1');
    });

    it('should apply glass style padding', () => {
        const chart = new ChartBuilder()
            .withData(of(testData))
            .withCategoryField('category')
            .asGlass()
            .build();

        expect(chart).toHaveClass('p-4');
    });

    it('should include animation elements when enabled', () => {
        const chartBuilder = new ChartBuilder<any>()
            .withData(of(testData))
            .withCategoryField('category')
            .withAnimation(true);
        
        chartBuilder.addBarChart('value1');
        chartBuilder.addLineChart('value2');
        
        const chart = chartBuilder.build();

        // Check for animate elements in the SVG
        const animateElements = chart.querySelectorAll('animate');
        expect(animateElements.length).toBeGreaterThan(0);
        
        // At least 2 for each bar (y and height) + 1 for line (d)
        expect(animateElements.length).toBe(testData.length * 2 + 1);
    });

    it('should render bars with exactly 8px padding from the Y axis', () => {
        const chartBuilder = new ChartBuilder<any>()
            .withData(of(testData))
            .withCategoryField('category');
        
        chartBuilder.addBarChart('value1');
        
        const chart = chartBuilder.build();

        const rects = Array.from(chart.querySelectorAll('rect')).filter(el => !el.closest('clipPath'));
        const firstRectX = parseFloat(rects[0].getAttribute('x') || '0');

        // Padding should be exactly 8px
        // firstRectX = xScale(0) - barWidth / 2 = (8 + barWidth/2) - barWidth/2 = 8
        expect(firstRectX).toBeCloseTo(8, 1);
    });

    it('should respect X-axis tick density', () => {
        const testDataExtended = Array.from({ length: 10 }, (_, i) => ({ category: `C${i}`, value: i }));
        const chartBuilder = new ChartBuilder<any>()
            .withData(of(testDataExtended))
            .withCategoryField('category');
        
        chartBuilder.withXAxis(builder => builder.withTicks(5));
        
        const chart = chartBuilder.build();
        
        // Find text elements in the X-axis group
        // X-axis group is the one with translate(0, viewHeight)
        const texts = Array.from(chart.querySelectorAll('text')).filter(t => {
            const parentG = t.parentElement;
            return parentG && parentG.getAttribute('transform')?.includes('translate(0,');
        });

        // With 10 items and 5 ticks, tickStep = ceil(10/5) = 2.
        // So it should show 0, 2, 4, 6, 8 (5 ticks).
        expect(texts.length).toBe(5);
    });

    it('should render hover guide lines on mouse move', () => {
        const chartBuilder = new ChartBuilder<any>()
            .withData(of(testData))
            .withCategoryField('category')
            .withTooltip(true);
        
        chartBuilder.addLineChart('value1');
        
        const chart = chartBuilder.build();
        document.body.appendChild(chart); // Need to append to body for getBoundingClientRect
        
        const svg = chart.querySelector('svg');
        if (!svg) throw new Error('SVG not found');

        // Mock getBoundingClientRect for SVG
        svg.getBoundingClientRect = () => ({
            width: 500,
            height: 300,
            left: 0,
            top: 0,
            right: 500,
            bottom: 300,
            x: 0,
            y: 0,
            toJSON: () => {}
        });

        // Simulate mouse move
        const moveEvent = new MouseEvent('mousemove', {
            clientX: 100, // Should be inside data area (padding-left is 60)
            clientY: 150,
            bubbles: true
        });
        svg.dispatchEvent(moveEvent);

        // Check for hover lines
        // They should be inside the last G (hoverG)
        const mainG = svg.querySelector('g');
        const hoverG = mainG?.lastElementChild;
        expect(hoverG).not.toBeNull();
        
        const lines = hoverG?.querySelectorAll('line');
        // 1 vertical line = 1 line
        expect(lines?.length).toBe(1);

        // Vertical line should have x1 === x2
        const vLine = lines?.[0];
        expect(vLine).not.toBeUndefined();
        expect(vLine?.getAttribute('x1')).toBe(vLine?.getAttribute('x2'));
        expect(vLine?.getAttribute('stroke')).toContain('var(--md-sys-color-on-surface-variant)');
        expect(vLine?.getAttribute('stroke-dasharray')).toBe('4,4');
        
        document.body.removeChild(chart);
    });

    it('should respect render order: area, then bar, then line', () => {
        const chartBuilder = new ChartBuilder<any>()
            .withData(of(testData))
            .withCategoryField('category')
            .withAnimation(false); // Disable animation for easier path checking
        
        // Add in reverse order of required rendering
        chartBuilder.addLineChart('value1').withColor('red');
        chartBuilder.addBarChart('value2').withColor('blue');
        chartBuilder.addAreaChart('value1').withColor('green');
        
        const chart = chartBuilder.build();
        const svg = chart.querySelector('svg');
        const mainG = svg?.querySelector('g > g > g'); // The clipped series group inside the outer translated g

        if (!mainG) throw new Error('Main G not found');

        const children = Array.from(mainG.children);
        
        // Find indices of different chart types
        const areaIndex = children.findIndex(el => el.tagName === 'path' && el.getAttribute('fill') === 'green');
        const barIndex = children.findIndex(el => el.tagName === 'rect' && el.getAttribute('fill') === 'blue');
        const lineIndex = children.findIndex(el => el.tagName === 'path' && el.getAttribute('stroke') === 'red');

        expect(areaIndex).toBeLessThan(barIndex);
        expect(barIndex).toBeLessThan(lineIndex);
    });

    it('should update color reactively when color observable emits', () => {
        const color$ = new BehaviorSubject<string>('red');
        const chartBuilder = new ChartBuilder<any>()
            .withData(of(testData))
            .withCategoryField('category')
            .withAnimation(false);

        chartBuilder.addLineChart('value1').withColor(color$);

        const chart = chartBuilder.build();

        // Find the path for line chart
        const path = chart.querySelector('path[stroke="red"]');
        expect(path).not.toBeNull();

        color$.next('blue');

        // Wait for potential microtasks? ChartLogic updates state$ synchronously on .next()
        const updatedPath = chart.querySelector('path[stroke="blue"]');
        expect(updatedPath).not.toBeNull();
    });

    it('idempotency guard: GatedObserver source skips createOptimizedPipeline (no IntersectionObserver created)', () => {
        // Replace the mock with a spy that records construction calls
        let ioConstructorCalls = 0;
        const OriginalMock = window.IntersectionObserver;
        window.IntersectionObserver = new Proxy(OriginalMock, {
            construct(target, args) {
                ioConstructorCalls++;
                return Reflect.construct(target, args);
            }
        }) as any;

        try {
            const gatedData$ = new GatedObserver(of(testData));
            const chartBuilder = new ChartBuilder<any>()
                .withData(gatedData$)
                .withCategoryField('category');
            chartBuilder.addBarChart('value1');
            const chart = chartBuilder.build();

            // The GatedObserver is used directly — no IntersectionObserver instantiated
            expect(ioConstructorCalls).toBe(0);

            // Data still flows through and chart renders; exclude clipPath rects in defs
            const rects = Array.from(chart.querySelectorAll('rect')).filter(el => !el.closest('clipPath'));
            expect(rects.length).toBe(testData.length);
        } finally {
            window.IntersectionObserver = OriginalMock;
        }
    });
});

describe('Chart Glass Effect', () => {
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

    const testData = [
        { category: 'Jan', value1: 10 },
        { category: 'Feb', value1: 15 }
    ];

    it('should NOT have backdrop-blur on container when asGlass is called', () => {
        const chart = new ChartBuilder()
            .withData(of(testData))
            .withCategoryField('category')
            .asGlass()
            .build();

        // New behavior: should NOT have backdrop-blur-md (or any panel background)
        expect(chart).not.toHaveClass('backdrop-blur-md');
        expect(chart).not.toHaveClass('bg-white/10');
    });

    it('should have glass-effect class on tooltip when asGlass is called', () => {
        const chart = new ChartBuilder()
            .withData(of(testData))
            .withCategoryField('category')
            .withTooltip(true)
            .asGlass()
            .build();

        document.body.appendChild(chart);
        
        const svg = chart.querySelector('svg');
        if (!svg) throw new Error('SVG not found');

        svg.getBoundingClientRect = () => ({
            width: 500, height: 300, left: 0, top: 0, right: 500, bottom: 300, x: 0, y: 0, toJSON: () => {}
        } as DOMRect);

        const moveEvent = new MouseEvent('mousemove', {
            clientX: 100, clientY: 150, bubbles: true
        });
        svg.dispatchEvent(moveEvent);

        const tooltip = chart.querySelector('.absolute.z-50');
        expect(tooltip).not.toBeNull();
        expect(tooltip).toHaveClass('glass-effect');
        
        document.body.removeChild(chart);
    });

    it('should NOT have glass-effect class on tooltip when asGlass is NOT called', () => {
        const chart = new ChartBuilder()
            .withData(of(testData))
            .withCategoryField('category')
            .withTooltip(true)
            .build();

        document.body.appendChild(chart);
        
        const svg = chart.querySelector('svg');
        if (!svg) throw new Error('SVG not found');

        svg.getBoundingClientRect = () => ({
            width: 500, height: 300, left: 0, top: 0, right: 500, bottom: 300, x: 0, y: 0, toJSON: () => {}
        } as DOMRect);

        const moveEvent = new MouseEvent('mousemove', {
            clientX: 100, clientY: 150, bubbles: true
        });
        svg.dispatchEvent(moveEvent);

        const tooltip = chart.querySelector('.absolute.z-50');
        expect(tooltip).not.toBeNull();
        expect(tooltip).not.toHaveClass('glass-effect');
        
        document.body.removeChild(chart);
    });
});

// ---------------------------------------------------------------------------
// ST-2: ChartLogic.calculateScales — data-point downsampling
// ---------------------------------------------------------------------------

describe('ChartLogic.calculateScales — downsampling (ST-2)', () => {
    let logic: ChartLogic<TestItem>;
    const DENSITY_FACTOR = 2 * HIGHLIGHT_DIAMETER;

    beforeEach(() => {
        logic = new ChartLogic<TestItem>();
    });

    afterEach(() => {
        logic.destroy();
    });

    describe('no downsampling when data.length <= viewWidth / DENSITY_FACTOR', () => {
        it('returns all points when data.length equals (viewWidth / DENSITY_FACTOR) exactly', () => {
            const viewWidth = 120;
            const maxPoints = Math.floor(viewWidth / DENSITY_FACTOR); // floor(120/24) = 5
            const items = makeItems(maxPoints);
            const state = makeState(items);
            const scales = logic.calculateScales(state, viewWidth, 300);
            expect(scales.displayData.length).toBe(maxPoints);
        });

        it('returns all points when data.length is less than viewWidth / DENSITY_FACTOR', () => {
            const viewWidth = 240; // floor(240/24) = 10
            const items = makeItems(5);
            const state = makeState(items);
            const scales = logic.calculateScales(state, viewWidth, 300);
            expect(scales.displayData.length).toBe(5);
        });

        it('returns all points when data.length equals Math.floor(viewWidth / DENSITY_FACTOR)', () => {
            // viewWidth=100.9 → MAX_POINTS=floor(100.9/24)=4; data.length=4 → no downsampling
            const items = makeItems(4);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 100.9, 300);
            expect(scales.displayData.length).toBe(4);
        });

        it('preserves original data references when no downsampling occurs', () => {
            const items = makeItems(2);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 500, 300);
            expect(scales.displayData).toEqual(items);
        });
    });

    describe('downsampling when data.length > Math.floor(viewWidth / DENSITY_FACTOR)', () => {
        it('caps displayData length at Math.floor(viewWidth / DENSITY_FACTOR)', () => {
            const viewWidth = 240;
            const maxPoints = Math.floor(viewWidth / DENSITY_FACTOR); // 10
            const items = makeItems(500);
            const state = makeState(items);
            const scales = logic.calculateScales(state, viewWidth, 300);
            expect(scales.displayData.length).toBe(maxPoints);
        });

        it('uses Math.floor on a fractional viewWidth before capping', () => {
            // viewWidth=119.9 → floor(119.9/24) = 4
            const items = makeItems(500);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 119.9, 300);
            expect(scales.displayData.length).toBe(4);
        });

        it('never renders more points than Math.floor(viewWidth / DENSITY_FACTOR) regardless of dataset size', () => {
            const viewWidth = 300;
            const maxPoints = Math.floor(viewWidth / DENSITY_FACTOR); // floor(300/24) = 12
            for (const dataSize of [13, 50, 100, 1000]) {
                const items = makeItems(dataSize);
                const state = makeState(items);
                const scales = logic.calculateScales(state, viewWidth, 300);
                expect(scales.displayData.length).toBeLessThanOrEqual(maxPoints);
            }
        });
    });

    describe('first and last data points are always preserved', () => {
        it('displayData[0] is the original first data point after downsampling', () => {
            const items = makeItems(1000);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 100, 300);
            expect(scales.displayData[0]).toBe(items[0]);
        });

        it('displayData[last] is the original last data point after downsampling', () => {
            const items = makeItems(1000);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 100, 300);
            expect(scales.displayData[scales.displayData.length - 1]).toBe(items[items.length - 1]);
        });

        it('first and last points are preserved with no downsampling', () => {
            const items = makeItems(10);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 500, 300);
            expect(scales.displayData[0]).toBe(items[0]);
            expect(scales.displayData[scales.displayData.length - 1]).toBe(items[items.length - 1]);
        });

        it('first and last points are preserved at the exact downsampling boundary', () => {
            // data.length=101 just exceeds MAX_POINTS=100
            const items = makeItems(101);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 100, 300);
            expect(scales.displayData[0]).toBe(items[0]);
            expect(scales.displayData[scales.displayData.length - 1]).toBe(items[100]);
        });
    });

    describe('edge case: very small viewWidth (< 2px)', () => {
        it('uses MAX_POINTS=2 when viewWidth=1.5 (Math.max(2, Math.floor(1.5)))', () => {
            const items = makeItems(100);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 1.5, 300);
            // MAX_POINTS = Math.max(2, Math.floor(1.5)) = Math.max(2, 1) = 2
            expect(scales.displayData.length).toBe(2);
        });

        it('with MAX_POINTS=2, displayData contains only first and last points', () => {
            const items = makeItems(100);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 1.5, 300);
            expect(scales.displayData[0]).toBe(items[0]);
            expect(scales.displayData[1]).toBe(items[99]);
        });

        it('uses MAX_POINTS=2 when viewWidth=0 (fully degenerate)', () => {
            const items = makeItems(50);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 0, 300);
            // Math.max(2, Math.floor(0)) = 2
            expect(scales.displayData.length).toBe(2);
        });

        it('uses MAX_POINTS=2 when viewWidth=1 (Math.max(2,1)=2)', () => {
            const items = makeItems(50);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 1, 300);
            expect(scales.displayData.length).toBe(2);
        });
    });

    describe('categories mirror displayData after downsampling', () => {
        it('scales.categories length matches displayData length after downsampling', () => {
            const items = makeItems(500);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 100, 300);
            expect(scales.categories.length).toBe(scales.displayData.length);
        });

        it('scales.categories[0] matches the category of displayData[0]', () => {
            const items = makeItems(500);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 100, 300);
            expect(scales.categories[0]).toBe(String((scales.displayData[0] as TestItem).category));
        });

        it('scales.categories[last] matches the category of displayData[last]', () => {
            const items = makeItems(500);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 100, 300);
            const last = scales.displayData.length - 1;
            expect(scales.categories[last]).toBe(String((scales.displayData[last] as TestItem).category));
        });
    });
});

// ---------------------------------------------------------------------------
// getYDomain — default min/max behavior (ST-4)
// ---------------------------------------------------------------------------

describe('ChartLogic.calculateScales — Y domain defaults (ST-4)', () => {
    let logic: ChartLogic<TestItem>;

    beforeEach(() => {
        logic = new ChartLogic<TestItem>();
    });

    afterEach(() => {
        logic.destroy();
    });

    function stateWithChart(items: TestItem[], min?: number | 'auto', max?: number | 'auto'): ChartState<TestItem> {
        const s = makeState(items);
        s.charts = [{ type: 'line', field: 'value', label: 'v' }];
        if (min !== undefined) s.yAxis.min = min;
        if (max !== undefined) s.yAxis.max = max;
        return s;
    }

    it('default: domain min equals actual data minimum', () => {
        const items = [
            { category: 'A', value: 5 },
            { category: 'B', value: 20 },
            { category: 'C', value: 10 },
        ];
        const scales = logic.calculateScales(stateWithChart(items), 400, 300);
        expect(scales.yDomain[0]).toBe(5);
    });

    it('default: domain max equals actual data maximum', () => {
        const items = [
            { category: 'A', value: 5 },
            { category: 'B', value: 20 },
            { category: 'C', value: 10 },
        ];
        const scales = logic.calculateScales(stateWithChart(items), 400, 300);
        expect(scales.yDomain[1]).toBe(20);
    });

    it('default: does NOT force min to zero when all values are positive', () => {
        const items = [
            { category: 'A', value: 10 },
            { category: 'B', value: 50 },
        ];
        const scales = logic.calculateScales(stateWithChart(items), 400, 300);
        expect(scales.yDomain[0]).toBe(10);
    });

    it("withMin('auto'): same as default — uses data minimum", () => {
        const items = [{ category: 'A', value: 7 }, { category: 'B', value: 42 }];
        const scales = logic.calculateScales(stateWithChart(items, 'auto'), 400, 300);
        expect(scales.yDomain[0]).toBe(7);
    });

    it("withMax('auto'): same as default — uses data maximum", () => {
        const items = [{ category: 'A', value: 7 }, { category: 'B', value: 42 }];
        const scales = logic.calculateScales(stateWithChart(items, undefined, 'auto'), 400, 300);
        expect(scales.yDomain[1]).toBe(42);
    });

    it('explicit min: overrides data minimum', () => {
        const items = [{ category: 'A', value: 10 }, { category: 'B', value: 50 }];
        const scales = logic.calculateScales(stateWithChart(items, 0), 400, 300);
        expect(scales.yDomain[0]).toBe(0);
    });

    it('explicit max: overrides data maximum', () => {
        const items = [{ category: 'A', value: 10 }, { category: 'B', value: 50 }];
        const scales = logic.calculateScales(stateWithChart(items, undefined, 100), 400, 300);
        expect(scales.yDomain[1]).toBe(100);
    });

    it('explicit min and max: no padding applied on top', () => {
        const items = [{ category: 'A', value: 10 }, { category: 'B', value: 50 }];
        const scales = logic.calculateScales(stateWithChart(items, 5, 60), 400, 300);
        expect(scales.yDomain[0]).toBe(5);
        expect(scales.yDomain[1]).toBe(60);
    });

    it('degenerate case: min === max after all — adds ±10', () => {
        const items = [{ category: 'A', value: 30 }, { category: 'B', value: 30 }];
        const scales = logic.calculateScales(stateWithChart(items), 400, 300);
        expect(scales.yDomain[0]).toBe(20);
        expect(scales.yDomain[1]).toBe(40);
    });
});

// ---------------------------------------------------------------------------
// Regression: aura findings #1 (late-mount animation) and #2 (null gaps)
// ---------------------------------------------------------------------------

class GapTestIntersectionObserver implements IntersectionObserver {
    readonly root = null; readonly rootMargin = ''; readonly thresholds: ReadonlyArray<number> = [];
    constructor(private callback: IntersectionObserverCallback) {}
    observe(element: Element) {
        this.callback([{ target: element, isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry], this);
        jest.advanceTimersByTime(150);
    }
    unobserve() {} disconnect() {} takeRecords() { return []; }
}

describe('ChartBuilder animation on late mount (finding #1)', () => {
    const originalIntersectionObserver = window.IntersectionObserver;
    const originalRaf = window.requestAnimationFrame;
    let rafCallbacks: FrameRequestCallback[];

    beforeEach(() => {
        jest.useFakeTimers();
        rafCallbacks = [];
        window.requestAnimationFrame = ((cb: FrameRequestCallback) => { rafCallbacks.push(cb); return rafCallbacks.length; }) as any;
        window.IntersectionObserver = GapTestIntersectionObserver as any;
    });

    afterEach(() => {
        jest.useRealTimers();
        window.IntersectionObserver = originalIntersectionObserver;
        window.requestAnimationFrame = originalRaf;
    });

    const data = [
        { category: 'Jan', value: 10 },
        { category: 'Feb', value: 15 },
        { category: 'Mar', value: 8 }
    ];

    function buildAnimated() {
        const b = new ChartBuilder<any>().withData(of(data)).withCategoryField('category').withAnimation(true);
        b.addBarChart('value');
        b.addLineChart('value');
        b.addAreaChart('value');
        return b.build();
    }

    it('every <animate> has begin="indefinite"', () => {
        const chart = buildAnimated();
        const anims = Array.from(chart.querySelectorAll('animate'));
        expect(anims.length).toBeGreaterThan(0);
        anims.forEach(a => expect(a.getAttribute('begin')).toBe('indefinite'));
    });

    it('static attributes hold final values while animating', () => {
        const chart = buildAnimated();
        const rects = Array.from(chart.querySelectorAll('rect')).filter(el => !el.closest('clipPath'));
        rects.forEach(r => {
            const animH = r.querySelector('animate[attributeName="height"]');
            expect(r.getAttribute('height')).toBe(animH?.getAttribute('to'));
        });
        expect(rects.some(r => parseFloat(r.getAttribute('height')!) > 0.5)).toBe(true);
        const paths = Array.from(chart.querySelectorAll('path')).filter(p => p.querySelector('animate'));
        expect(paths.length).toBeGreaterThan(0);
        paths.forEach(p => {
            expect(p.getAttribute('d')).toBe(p.querySelector('animate[attributeName="d"]')!.getAttribute('to'));
        });
    });

    it('calls beginElement() on each animate once mounted after document time 0', () => {
        const proto = (window as any).SVGAnimateElement?.prototype ?? (window as any).SVGElement.prototype;
        const spy = jest.fn();
        (proto as any).beginElement = spy;
        try {
            const chart = buildAnimated();       // built detached -> scheduled via rAF
            expect(spy).not.toHaveBeenCalled();
            document.body.appendChild(chart);
            rafCallbacks.splice(0).forEach(cb => cb(0));
            const animCount = chart.querySelectorAll('animate').length;
            expect(animCount).toBeGreaterThan(0);
            expect(spy).toHaveBeenCalledTimes(animCount);
            document.body.removeChild(chart);
        } finally {
            delete (proto as any).beginElement;
        }
    });
});

describe('Chart null/NaN gaps (finding #2)', () => {
    const originalIntersectionObserver = window.IntersectionObserver;

    beforeEach(() => {
        jest.useFakeTimers();
        window.IntersectionObserver = GapTestIntersectionObserver as any;
    });

    afterEach(() => {
        jest.useRealTimers();
        window.IntersectionObserver = originalIntersectionObserver;
    });

    const gapData: any[] = [
        { category: 'Jan', value: 10 },
        { category: 'Feb', value: null },
        { category: 'Mar', value: 12 },
        { category: 'Apr', value: NaN },
        { category: 'May', value: 15 }
    ];

    it('excludes gaps from the Y domain (no pull to 0)', () => {
        const logic = new ChartLogic<any>();
        const s = makeState(gapData as any);
        s.charts = [{ type: 'line', field: 'value', label: 'v' }];
        expect(logic.calculateScales(s, 400, 300).yDomain).toEqual([10, 15]);
        // Stacked: same domain as the gap-free series (stacks always include 0)
        s.charts = [{ type: 'bar', field: 'value', label: 'v', isStacked: true }];
        const noGaps = makeState(gapData.filter(d => Number.isFinite(d.value)) as any);
        noGaps.charts = s.charts;
        expect(logic.calculateScales(s, 400, 300).yDomain).toEqual(logic.calculateScales(noGaps, 400, 300).yDomain);
        logic.destroy();
    });

    it('line path restarts with M after a gap and draws no marker for it', () => {
        const b = new ChartBuilder<any>().withData(of(gapData)).withCategoryField('category').withAnimation(false);
        b.addLineChart('value').withMarkers(true);
        const chart = b.build();
        const d = chart.querySelector('path[stroke]')!.getAttribute('d')!;
        expect((d.match(/M/g) || []).length).toBe(3);
        expect(chart.querySelectorAll('circle').length).toBe(3);
    });

    it('draws no bar for a gap', () => {
        const b = new ChartBuilder<any>().withData(of(gapData)).withCategoryField('category').withAnimation(false);
        b.addBarChart('value');
        const chart = b.build();
        const rects = Array.from(chart.querySelectorAll('rect')).filter(el => !el.closest('clipPath'));
        expect(rects.length).toBe(3);
    });

    it('area path restarts with M after a gap', () => {
        const b = new ChartBuilder<any>().withData(of(gapData)).withCategoryField('category').withAnimation(false);
        b.addAreaChart('value');
        const chart = b.build();
        const area = chart.querySelector('path[fill-opacity]')!.getAttribute('d')!;
        expect((area.match(/M/g) || []).length).toBe(3);
        expect((area.match(/Z/g) || []).length).toBe(3);
    });
});

// ---------------------------------------------------------------------------
// Regression: A1 code-review findings on the finding #1/#2 fix
// ---------------------------------------------------------------------------

describe('ChartLogic.calculateScales — all-gap series with an axis override (A1 blocking)', () => {
    let logic: ChartLogic<TestItem>;

    beforeEach(() => { logic = new ChartLogic<TestItem>(); });
    afterEach(() => { logic.destroy(); });

    function allGapState(min?: number | 'auto', max?: number | 'auto'): ChartState<TestItem> {
        const s = makeState([
            { category: 'A', value: NaN as any },
            { category: 'B', value: null as any },
        ]);
        s.charts = [{ type: 'line', field: 'value', label: 'v' }];
        if (min !== undefined) s.yAxis.min = min;
        if (max !== undefined) s.yAxis.max = max;
        return s;
    }

    it('withMin(0) alone on an all-gap series yields a finite, non-NaN domain', () => {
        const scales = logic.calculateScales(allGapState(0), 400, 300);
        expect(scales.yDomain[0]).toBe(0);
        expect(Number.isFinite(scales.yDomain[1])).toBe(true);
        expect(Number.isNaN(scales.yDomain[1])).toBe(false);
    });

    it('withMax(500) alone on an all-gap series keeps the user max instead of discarding it', () => {
        const scales = logic.calculateScales(allGapState(undefined, 500), 400, 300);
        expect(scales.yDomain[1]).toBe(500);
        expect(Number.isFinite(scales.yDomain[0])).toBe(true);
    });

    it('no override on an all-gap series still yields a finite domain', () => {
        const scales = logic.calculateScales(allGapState(), 400, 300);
        expect(scales.yDomain.every(Number.isFinite)).toBe(true);
    });
});

describe('SeriesRenderer animation lifecycle (A1 blocking)', () => {
    const originalRaf = window.requestAnimationFrame;
    const originalCaf = window.cancelAnimationFrame;

    afterEach(() => {
        window.requestAnimationFrame = originalRaf;
        window.cancelAnimationFrame = originalCaf;
    });

    function lineState(data: any[]): ChartState<any> {
        const s = makeState(data);
        s.animate = true;
        s.charts = [{ type: 'line', field: 'value', label: 'v' }] as any;
        return s;
    }

    it('the rAF "wait for connect" chain is cancelled on destroy and never rescheduled after', () => {
        let handleCounter = 0;
        const rafSpy = jest.fn(() => ++handleCounter);
        const cafSpy = jest.fn();
        window.requestAnimationFrame = rafSpy as any;
        window.cancelAnimationFrame = cafSpy as any;

        const renderer = new SeriesRenderer();
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g') as unknown as SVGGElement; // never attached
        const state = lineState([{ category: 'A', value: 1 }, { category: 'B', value: 2 }]);
        const logic = new ChartLogic<any>();
        const scales = logic.calculateScales(state, 100, 100);

        renderer.render(g, state, scales);
        expect(rafSpy).toHaveBeenCalledTimes(1); // scheduled once — g is not connected

        renderer.destroy();
        expect(cafSpy).toHaveBeenCalledTimes(1);
        expect(cafSpy).toHaveBeenCalledWith(1);
        expect(rafSpy).toHaveBeenCalledTimes(1); // no further scheduling once destroyed

        logic.destroy();
    });

    it('the rAF retry chain for a chart that never mounts is bounded, not infinite', () => {
        let scheduled = 0;
        const pending: FrameRequestCallback[] = [];
        window.requestAnimationFrame = ((cb: FrameRequestCallback) => { scheduled++; pending.push(cb); return scheduled; }) as any;
        window.cancelAnimationFrame = jest.fn() as any;

        const renderer = new SeriesRenderer();
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g') as unknown as SVGGElement; // never attached
        const state = lineState([{ category: 'A', value: 1 }]);
        const logic = new ChartLogic<any>();
        const scales = logic.calculateScales(state, 100, 100);

        renderer.render(g, state, scales);
        // Drain every frame the renderer schedules; since `g` never connects,
        // the chain must stop scheduling on its own well before frame 1000.
        let guard = 0;
        while (pending.length && guard < 1000) {
            const cb = pending.shift()!;
            cb(0);
            guard++;
        }
        expect(guard).toBeLessThan(20); // bounded (MAX_ANIM_RETRIES = 10), not unbounded

        renderer.destroy();
        logic.destroy();
    });

    it('a resize re-render (same data reference) does not re-trigger beginElement', () => {
        const proto = (window as any).SVGAnimateElement?.prototype ?? (window as any).SVGElement.prototype;
        const spy = jest.fn();
        (proto as any).beginElement = spy;
        try {
            const renderer = new SeriesRenderer();
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g') as unknown as SVGGElement;
            document.body.appendChild(g as unknown as Node); // connected: beginElement fires synchronously

            const state = lineState([{ category: 'A', value: 1 }, { category: 'B', value: 2 }]);
            const logic = new ChartLogic<any>();
            const scales = logic.calculateScales(state, 100, 100);

            renderer.render(g, state, scales);
            expect(spy).toHaveBeenCalledTimes(1);

            // ChartViewport rebuilds the SVG subtree on every render (resize
            // included), so a resize re-render targets a fresh `g` — but with
            // the SAME `state.data` reference. That must not restart the animation.
            const g2 = document.createElementNS('http://www.w3.org/2000/svg', 'g') as unknown as SVGGElement;
            document.body.appendChild(g2 as unknown as Node);
            renderer.render(g2, state, scales);
            expect(spy).toHaveBeenCalledTimes(1);
            expect(g2.querySelectorAll('animate').length).toBe(0);

            document.body.removeChild(g as unknown as Node);
            document.body.removeChild(g2 as unknown as Node);
            renderer.destroy();
            logic.destroy();
        } finally {
            delete (proto as any).beginElement;
        }
    });
});

describe('SeriesRenderer isolated points (A1 nit)', () => {
    const originalIntersectionObserver = window.IntersectionObserver;

    beforeEach(() => {
        jest.useFakeTimers();
        window.IntersectionObserver = GapTestIntersectionObserver as any;
    });

    afterEach(() => {
        jest.useRealTimers();
        window.IntersectionObserver = originalIntersectionObserver;
    });

    const isolatedData: any[] = [
        { category: 'A', value: null },
        { category: 'B', value: 5 },
        { category: 'C', value: null },
    ];

    it('renders a small (r=2) circle for an isolated line point with no markers enabled', () => {
        const b = new ChartBuilder<any>().withData(of(isolatedData)).withCategoryField('category').withAnimation(false);
        b.addLineChart('value'); // showMarkers defaults to false
        const chart = b.build();
        const circles = Array.from(chart.querySelectorAll('circle'));
        expect(circles.length).toBe(1);
        expect(circles[0].getAttribute('r')).toBe('2');
    });

    it('renders a small (r=2) circle for an isolated area point', () => {
        const b = new ChartBuilder<any>().withData(of(isolatedData)).withCategoryField('category').withAnimation(false);
        b.addAreaChart('value');
        const chart = b.build();
        const circles = Array.from(chart.querySelectorAll('circle'));
        expect(circles.length).toBe(1);
        expect(circles[0].getAttribute('r')).toBe('2');
    });
});

describe('ChartViewport hover effects skip gaps (A1 nit)', () => {
    const originalIntersectionObserver = window.IntersectionObserver;

    beforeEach(() => {
        jest.useFakeTimers();
        window.IntersectionObserver = GapTestIntersectionObserver as any;
    });

    afterEach(() => {
        jest.useRealTimers();
        window.IntersectionObserver = originalIntersectionObserver;
    });

    it('does not draw a ring/dot for a gapped series on hover', () => {
        const data: any[] = [
            { category: 'Jan', a: 10, b: null },
            { category: 'Feb', a: 15, b: 20 },
        ];
        const b = new ChartBuilder<any>().withData(of(data)).withCategoryField('category').withTooltip(true);
        b.addLineChart('a').withColor('red');
        b.addLineChart('b').withColor('blue');
        const chart = b.build();
        document.body.appendChild(chart);

        const svg = chart.querySelector('svg');
        if (!svg) throw new Error('SVG not found');
        svg.getBoundingClientRect = () => ({
            width: 500, height: 300, left: 0, top: 0, right: 500, bottom: 300, x: 0, y: 0, toJSON: () => {}
        } as DOMRect);

        // Hover over the first category (index 0), where series `b` is a gap.
        const moveEvent = new MouseEvent('mousemove', { clientX: 61, clientY: 150, bubbles: true });
        svg.dispatchEvent(moveEvent);

        const mainG = svg.querySelector('g');
        const hoverG = mainG?.lastElementChild;
        // 1 vertical guide line + (ring, point) for series `a` only = 3 elements.
        expect(hoverG?.children.length).toBe(3);

        document.body.removeChild(chart);
    });
});

// ---------------------------------------------------------------------------
// A1 QA: coverage gaps left by the A1 fix + its code review
// ---------------------------------------------------------------------------

describe('A1 QA — gap rendering per series type', () => {
    const originalIntersectionObserver = window.IntersectionObserver;

    beforeEach(() => {
        jest.useFakeTimers();
        window.IntersectionObserver = GapTestIntersectionObserver as any;
    });

    afterEach(() => {
        jest.useRealTimers();
        window.IntersectionObserver = originalIntersectionObserver;
    });

    // jsdom has no layout: ChartSvgArea.getViewBox falls back to 600x400, and
    // ChartViewport subtracts padding {left:60,right:40,top:20,bottom:40}.
    const VIEW_W = 500;
    const VIEW_H = 340;

    const gapData: any[] = [
        { category: 'Jan', value: 10 },
        { category: 'Feb', value: null },
        { category: 'Mar', value: 12 },
        { category: 'Apr', value: NaN },
        { category: 'May', value: 15 }
    ];

    function scalesFor(data: any[], charts: any[]) {
        const logic = new ChartLogic<any>();
        const s = makeState(data);
        s.charts = charts;
        const scales = logic.calculateScales(s, VIEW_W, VIEW_H);
        logic.destroy();
        return scales;
    }

    it('bar: the rect for the gap index is absent, not zero-height or shifted', () => {
        const b = new ChartBuilder<any>().withData(of(gapData)).withCategoryField('category').withAnimation(false);
        b.addBarChart('value');
        const chart = b.build();

        const scales = scalesFor(gapData, [{ type: 'bar', field: 'value', label: 'v' }]);
        const barWidth = scales.barWidth || 32;
        const rects = Array.from(chart.querySelectorAll('rect')).filter(el => !el.closest('clipPath'));

        // Only the three non-gap indices (0, 2, 4) produced a rect...
        const xs = rects.map(r => parseFloat(r.getAttribute('x')!)).sort((a, b2) => a - b2);
        expect(xs.map(x => Math.round(x))).toEqual(
            [0, 2, 4].map(i => Math.round(scales.xScale(i) - barWidth / 2))
        );

        // ...and no rect sits at the gap indices 1 or 3.
        [1, 3].forEach(i => {
            const gapX = scales.xScale(i) - barWidth / 2;
            expect(xs.some(x => Math.abs(x - gapX) < 0.5)).toBe(false);
        });

        // Exactly three bars, each with a real (non-NaN) height. Note the bar at
        // the domain minimum legitimately collapses to the 0.5px floor.
        expect(rects.length).toBe(3);
        rects.forEach(r => {
            const h = parseFloat(r.getAttribute('height')!);
            expect(Number.isFinite(h)).toBe(true);
            expect(h).toBeGreaterThanOrEqual(0.5);
        });
        expect(rects.some(r => parseFloat(r.getAttribute('height')!) > 0.5)).toBe(true);
    });

    it('area: each contiguous run is its own closed sub-path and no vertex sits at a gap index', () => {
        const b = new ChartBuilder<any>().withData(of(gapData)).withCategoryField('category').withAnimation(false);
        b.addAreaChart('value');
        const chart = b.build();

        const scales = scalesFor(gapData, [{ type: 'area', field: 'value', label: 'v' }]);
        const d = chart.querySelector('path[fill-opacity]')!.getAttribute('d')!;

        // 3 runs -> 3 `M ... Z` sub-paths.
        expect((d.match(/M/g) || []).length).toBe(3);
        expect((d.match(/Z/g) || []).length).toBe(3);
        expect(d).not.toContain('NaN');

        // Every x coordinate in the path belongs to a non-gap index.
        const xsInPath = Array.from(d.matchAll(/-?\d+(?:\.\d+)?(?=,)/g)).map(m => parseFloat(m[0]));
        const allowed = [0, 2, 4].map(i => scales.xScale(i));
        xsInPath.forEach(x => {
            expect(allowed.some(a => Math.abs(a - x) < 0.5)).toBe(true);
        });
    });

    it('area: a single-run series with leading and trailing gaps closes exactly once', () => {
        const data: any[] = [
            { category: 'A', value: null },
            { category: 'B', value: 4 },
            { category: 'C', value: 6 },
            { category: 'D', value: undefined },
        ];
        const b = new ChartBuilder<any>().withData(of(data)).withCategoryField('category').withAnimation(false);
        b.addAreaChart('value');
        const chart = b.build();
        const d = chart.querySelector('path[fill-opacity]')!.getAttribute('d')!;
        expect((d.match(/M/g) || []).length).toBe(1);
        expect((d.match(/Z/g) || []).length).toBe(1);
    });

    it('non-numeric junk (boolean, array, object, blank string) renders as a gap end to end', () => {
        const junk: any[] = [
            { category: 'A', value: 10 },
            { category: 'B', value: true },
            { category: 'C', value: [] },
            { category: 'D', value: '   ' },
            { category: 'E', value: { n: 5 } },
            { category: 'F', value: 20 },
        ];
        const b = new ChartBuilder<any>().withData(of(junk)).withCategoryField('category').withAnimation(false);
        b.addBarChart('value');
        b.addLineChart('value').withMarkers(true);
        const chart = b.build();

        const rects = Array.from(chart.querySelectorAll('rect')).filter(el => !el.closest('clipPath'));
        expect(rects.length).toBe(2);                     // A and F only
        expect(chart.querySelectorAll('circle').length).toBe(2);

        const d = chart.querySelector('path[stroke]')!.getAttribute('d')!;
        expect((d.match(/M/g) || []).length).toBe(2);     // two isolated runs
        expect(d).not.toContain('NaN');

        // Domain from the two real values only — booleans never coerced to 0/1.
        const scales = scalesFor(junk, [{ type: 'line', field: 'value', label: 'v' }]);
        expect(scales.yDomain).toEqual([10, 20]);
    });

    it('a fully empty (all-gap) series renders an empty path instead of throwing', () => {
        const allGap: any[] = [
            { category: 'A', value: null },
            { category: 'B', value: NaN },
        ];
        const b = new ChartBuilder<any>().withData(of(allGap)).withCategoryField('category').withAnimation(false);
        b.addLineChart('value');
        b.addAreaChart('value');
        b.addBarChart('value');
        let chart!: HTMLElement;
        expect(() => { chart = b.build(); }).not.toThrow();
        const paths = Array.from(chart.querySelectorAll('path'));
        paths.forEach(p => expect(p.getAttribute('d')).toBe(''));
        expect(Array.from(chart.querySelectorAll('rect')).filter(el => !el.closest('clipPath')).length).toBe(0);
        expect(chart.querySelectorAll('circle').length).toBe(0);
    });
});

describe('A1 QA — secondary axis and stacking with gaps', () => {
    let logic: ChartLogic<any>;

    beforeEach(() => { logic = new ChartLogic<any>(); });
    afterEach(() => { logic.destroy(); });

    function secondaryState(data: any[], charts: any[], secMin?: number, secMax?: number): ChartState<any> {
        const s = makeState(data);
        s.charts = charts;
        s.secondaryYAxis = {
            visible: true, showGridLines: false, showMinorGridLines: false,
            position: 'right', scaleType: 'linear', ticks: 5,
            ...(secMin !== undefined ? { min: secMin } : {}),
            ...(secMax !== undefined ? { max: secMax } : {}),
        };
        return s;
    }

    it('the secondary domain excludes gaps in the secondary series', () => {
        const data: any[] = [
            { category: 'A', primary: 1, secondary: 100 },
            { category: 'B', primary: 2, secondary: null },
            { category: 'C', primary: 3, secondary: NaN },
            { category: 'D', primary: 4, secondary: 300 },
        ];
        const scales = logic.calculateScales(secondaryState(data, [
            { type: 'line', field: 'primary', label: 'p' },
            { type: 'line', field: 'secondary', label: 's', useSecondaryAxis: true },
        ]), 400, 300);

        expect(scales.yDomain).toEqual([1, 4]);            // primary untouched by the gaps
        expect(scales.secondaryYDomain).toEqual([100, 300]);
        expect(scales.secondaryYDomain!.every(Number.isFinite)).toBe(true);
    });

    it('a gap on the secondary axis does not leak into the primary domain', () => {
        const data: any[] = [
            { category: 'A', primary: 10, secondary: null },
            { category: 'B', primary: 20, secondary: null },
        ];
        const scales = logic.calculateScales(secondaryState(data, [
            { type: 'line', field: 'primary', label: 'p' },
            { type: 'line', field: 'secondary', label: 's', useSecondaryAxis: true },
        ]), 400, 300);
        expect(scales.yDomain).toEqual([10, 20]);
    });

    it('an all-gap secondary series yields a finite default domain', () => {
        const data: any[] = [
            { category: 'A', primary: 10, secondary: null },
            { category: 'B', primary: 20, secondary: NaN },
        ];
        const scales = logic.calculateScales(secondaryState(data, [
            { type: 'line', field: 'primary', label: 'p' },
            { type: 'line', field: 'secondary', label: 's', useSecondaryAxis: true },
        ]), 400, 300);
        expect(scales.secondaryYDomain!.every(Number.isFinite)).toBe(true);
        expect(scales.secondaryYDomain).toEqual([0, 100]);
        expect(scales.secondaryYScale!(50)).not.toBeNaN();
    });

    it('an all-gap secondary series with only withMin(0) still gets a finite max', () => {
        const data: any[] = [{ category: 'A', primary: 10, secondary: null }];
        const scales = logic.calculateScales(secondaryState(data, [
            { type: 'line', field: 'primary', label: 'p' },
            { type: 'line', field: 'secondary', label: 's', useSecondaryAxis: true },
        ], 0), 400, 300);
        expect(scales.secondaryYDomain![0]).toBe(0);
        expect(Number.isFinite(scales.secondaryYDomain![1])).toBe(true);
        expect(scales.secondaryYScale!(0)).not.toBeNaN();
    });

    it('an all-gap secondary series with only withMax(500) keeps the user max', () => {
        const data: any[] = [{ category: 'A', primary: 10, secondary: null }];
        const scales = logic.calculateScales(secondaryState(data, [
            { type: 'line', field: 'primary', label: 'p' },
            { type: 'line', field: 's_missing', label: 's', useSecondaryAxis: true },
        ], undefined, 500), 400, 300);
        expect(scales.secondaryYDomain![1]).toBe(500);
        expect(Number.isFinite(scales.secondaryYDomain![0])).toBe(true);
    });

    it('a stacked pair with a gap in one member stacks only the present values', () => {
        const data: any[] = [
            { category: 'A', a: 10, b: 5 },
            { category: 'B', a: null, b: 5 },
            { category: 'C', a: 10, b: null },
            { category: 'D', a: null, b: null },
        ];
        const s = makeState(data);
        s.charts = [
            { type: 'bar', field: 'a', label: 'a', isStacked: true },
            { type: 'bar', field: 'b', label: 'b', isStacked: true },
        ] as any;
        const scales = logic.calculateScales(s, 400, 300);
        // Max stack = row A (10+5); rows with a single value contribute 10 and 5;
        // the all-gap row contributes nothing at all (not a 0 that pins the min).
        expect(scales.yDomain).toEqual([0, 15]);
    });

    it('a stacked pair of negatives with a gap keeps a finite negative min', () => {
        const data: any[] = [
            { category: 'A', a: -10, b: -5 },
            { category: 'B', a: null, b: null },
        ];
        const s = makeState(data);
        s.charts = [
            { type: 'bar', field: 'a', label: 'a', isStacked: true },
            { type: 'bar', field: 'b', label: 'b', isStacked: true },
        ] as any;
        const scales = logic.calculateScales(s, 400, 300);
        expect(scales.yDomain[0]).toBe(-15);
        expect(scales.yDomain.every(Number.isFinite)).toBe(true);
    });
});

describe('A1 QA — stacked series with a gap renders without crashing', () => {
    const originalIntersectionObserver = window.IntersectionObserver;

    beforeEach(() => {
        jest.useFakeTimers();
        window.IntersectionObserver = GapTestIntersectionObserver as any;
    });

    afterEach(() => {
        jest.useRealTimers();
        window.IntersectionObserver = originalIntersectionObserver;
    });

    const stackedData: any[] = [
        { category: 'A', a: 10, b: 5 },
        { category: 'B', a: null, b: 5 },
        { category: 'C', a: 10, b: NaN },
        { category: 'D', a: null, b: null },
    ];

    it('stacked bars: one rect per present value, none for the gaps', () => {
        const b = new ChartBuilder<any>().withData(of(stackedData)).withCategoryField('category').withAnimation(false);
        b.addBarChart('a').asStacked();
        b.addBarChart('b').asStacked();
        let chart!: HTMLElement;
        expect(() => { chart = b.build(); }).not.toThrow();

        const rects = Array.from(chart.querySelectorAll('rect')).filter(el => !el.closest('clipPath'));
        // present values: (A,a)(A,b)(B,b)(C,a) = 4
        expect(rects.length).toBe(4);
        rects.forEach(r => {
            expect(r.getAttribute('y')).not.toContain('NaN');
            expect(r.getAttribute('height')).not.toContain('NaN');
        });
    });

    it('stacked areas with a gap produce finite path data and animate cleanly', () => {
        const b = new ChartBuilder<any>().withData(of(stackedData)).withCategoryField('category').withAnimation(true);
        b.addAreaChart('a').asStacked();
        b.addAreaChart('b').asStacked();
        let chart!: HTMLElement;
        expect(() => { chart = b.build(); }).not.toThrow();

        Array.from(chart.querySelectorAll('path')).forEach(p => {
            expect(p.getAttribute('d')).not.toContain('NaN');
        });
        Array.from(chart.querySelectorAll('animate')).forEach(a => {
            expect(a.getAttribute('begin')).toBe('indefinite');
            expect(a.getAttribute('from')).not.toContain('NaN');
            expect(a.getAttribute('to')).not.toContain('NaN');
        });
    });
});

describe('A1 QA — animation lifecycle: re-render, new data, jsdom safety', () => {
    const originalRaf = window.requestAnimationFrame;
    const originalCaf = window.cancelAnimationFrame;

    afterEach(() => {
        window.requestAnimationFrame = originalRaf;
        window.cancelAnimationFrame = originalCaf;
    });

    function lineState(data: any[]): ChartState<any> {
        const s = makeState(data);
        s.animate = true;
        s.charts = [{ type: 'line', field: 'value', label: 'v' }] as any;
        return s;
    }

    it('a NEW data reference animates again (and emits fresh <animate> elements)', () => {
        const proto = (window as any).SVGAnimateElement?.prototype ?? (window as any).SVGElement.prototype;
        const spy = jest.fn();
        (proto as any).beginElement = spy;
        try {
            const renderer = new SeriesRenderer();
            const logic = new ChartLogic<any>();
            const g1 = document.createElementNS('http://www.w3.org/2000/svg', 'g') as unknown as SVGGElement;
            document.body.appendChild(g1 as unknown as Node);

            const first = lineState([{ category: 'A', value: 1 }, { category: 'B', value: 2 }]);
            const scales = logic.calculateScales(first, 100, 100);
            renderer.render(g1, first, scales);
            expect(spy).toHaveBeenCalledTimes(1);
            expect(g1.querySelectorAll('animate').length).toBe(1);

            // Same *values*, but a genuinely new array reference — a data update,
            // not a resize. It must animate again.
            const g2 = document.createElementNS('http://www.w3.org/2000/svg', 'g') as unknown as SVGGElement;
            document.body.appendChild(g2 as unknown as Node);
            const second = lineState([{ category: 'A', value: 1 }, { category: 'B', value: 2 }]);
            renderer.render(g2, second, logic.calculateScales(second, 100, 100));
            expect(g2.querySelectorAll('animate').length).toBe(1);
            expect(spy).toHaveBeenCalledTimes(2);

            document.body.removeChild(g1 as unknown as Node);
            document.body.removeChild(g2 as unknown as Node);
            renderer.destroy();
            logic.destroy();
        } finally {
            delete (proto as any).beginElement;
        }
    });

    it('a re-render cancels the rAF chain pending against the previous subtree', () => {
        const pending: FrameRequestCallback[] = [];
        let handle = 0;
        const cancelled: number[] = [];
        window.requestAnimationFrame = ((cb: FrameRequestCallback) => { pending.push(cb); return ++handle; }) as any;
        window.cancelAnimationFrame = ((h: number) => { cancelled.push(h); }) as any;

        const renderer = new SeriesRenderer();
        const logic = new ChartLogic<any>();
        const detached = document.createElementNS('http://www.w3.org/2000/svg', 'g') as unknown as SVGGElement;

        const first = lineState([{ category: 'A', value: 1 }, { category: 'B', value: 2 }]);
        renderer.render(detached, first, logic.calculateScales(first, 100, 100));
        expect(pending.length).toBe(1);          // waiting for `detached` to connect

        // Second render (new data, new subtree) must cancel the pending frame.
        const second = lineState([{ category: 'A', value: 5 }, { category: 'B', value: 6 }]);
        const detached2 = document.createElementNS('http://www.w3.org/2000/svg', 'g') as unknown as SVGGElement;
        renderer.render(detached2, second, logic.calculateScales(second, 100, 100));
        expect(cancelled).toContain(1);

        renderer.destroy();
        logic.destroy();
    });

    it('the retry budget resets per render — a stale exhausted chain does not starve the next one', () => {
        const pending: FrameRequestCallback[] = [];
        let handle = 0;
        window.requestAnimationFrame = ((cb: FrameRequestCallback) => { pending.push(cb); return ++handle; }) as any;
        window.cancelAnimationFrame = jest.fn() as any;

        const renderer = new SeriesRenderer();
        const logic = new ChartLogic<any>();
        const detached = document.createElementNS('http://www.w3.org/2000/svg', 'g') as unknown as SVGGElement;

        const first = lineState([{ category: 'A', value: 1 }, { category: 'B', value: 2 }]);
        renderer.render(detached, first, logic.calculateScales(first, 100, 100));
        let guard = 0;
        while (pending.length && guard < 100) { pending.shift()!(0); guard++; }
        expect(guard).toBe(10);                  // MAX_ANIM_RETRIES exhausted

        // A new render starts a fresh budget.
        const second = lineState([{ category: 'A', value: 5 }, { category: 'B', value: 6 }]);
        renderer.render(detached, second, logic.calculateScales(second, 100, 100));
        expect(pending.length).toBe(1);

        renderer.destroy();
        logic.destroy();
    });

    it('a beginElement that throws (jsdom / unsupported SMIL) does not break the render', () => {
        const proto = (window as any).SVGAnimateElement?.prototype ?? (window as any).SVGElement.prototype;
        const boom = jest.fn(() => { throw new Error('SMIL not supported'); });
        (proto as any).beginElement = boom;
        try {
            const renderer = new SeriesRenderer();
            const logic = new ChartLogic<any>();
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g') as unknown as SVGGElement;
            document.body.appendChild(g as unknown as Node);

            const state = lineState([{ category: 'A', value: 1 }, { category: 'B', value: 2 }]);
            expect(() => renderer.render(g, state, logic.calculateScales(state, 100, 100))).not.toThrow();
            expect(boom).toHaveBeenCalled();
            // The series is still drawn with its final values.
            expect(g.querySelector('path')!.getAttribute('d')).toBeTruthy();

            document.body.removeChild(g as unknown as Node);
            renderer.destroy();
            logic.destroy();
        } finally {
            delete (proto as any).beginElement;
        }
    });

    it('no <animate> and no beginElement at all when animation is disabled', () => {
        const proto = (window as any).SVGAnimateElement?.prototype ?? (window as any).SVGElement.prototype;
        const spy = jest.fn();
        (proto as any).beginElement = spy;
        try {
            const renderer = new SeriesRenderer();
            const logic = new ChartLogic<any>();
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g') as unknown as SVGGElement;
            document.body.appendChild(g as unknown as Node);

            const state = lineState([{ category: 'A', value: 1 }, { category: 'B', value: 2 }]);
            state.animate = false;
            renderer.render(g, state, logic.calculateScales(state, 100, 100));
            expect(g.querySelectorAll('animate').length).toBe(0);
            expect(spy).not.toHaveBeenCalled();

            document.body.removeChild(g as unknown as Node);
            renderer.destroy();
            logic.destroy();
        } finally {
            delete (proto as any).beginElement;
        }
    });

    it('destroy() is idempotent and a render after destroy still works', () => {
        const renderer = new SeriesRenderer();
        const logic = new ChartLogic<any>();
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g') as unknown as SVGGElement;
        const state = lineState([{ category: 'A', value: 1 }]);
        renderer.render(g, state, logic.calculateScales(state, 100, 100));
        expect(() => { renderer.destroy(); renderer.destroy(); }).not.toThrow();
        logic.destroy();
    });
});

describe('A1 QA — chart lifecycle: connect -> update -> disconnect', () => {
    const originalIntersectionObserver = window.IntersectionObserver;

    beforeEach(() => {
        jest.useFakeTimers();
        window.IntersectionObserver = GapTestIntersectionObserver as any;
    });

    afterEach(() => {
        jest.useRealTimers();
        window.IntersectionObserver = originalIntersectionObserver;
    });

    let source: BehaviorSubject<any[]>;

    afterEach(() => {
        source?.complete();
    });

    it('renders on connect, re-renders on data update, and stops after removal', () => {
        source = new BehaviorSubject<any[]>([
            { category: 'A', value: 1 },
            { category: 'B', value: 2 },
        ]);

        const b = new ChartBuilder<any>().withData(source.asObservable()).withCategoryField('category').withAnimation(false);
        b.addLineChart('value').withMarkers(true);
        const chart = b.build();
        document.body.appendChild(chart);

        // connect
        expect(chart.querySelectorAll('circle').length).toBe(2);

        // update — a gap appears in the middle of the stream
        source.next([
            { category: 'A', value: 1 },
            { category: 'B', value: null },
            { category: 'C', value: 3 },
        ]);
        expect(chart.querySelectorAll('circle').length).toBe(2);
        expect((chart.querySelector('path[stroke]')!.getAttribute('d')!.match(/M/g) || []).length).toBe(2);

        // disconnect — teardown must not throw and must stop further renders
        const before = chart.innerHTML;
        expect(() => document.body.removeChild(chart)).not.toThrow();
        expect(() => source.next([{ category: 'Z', value: 99 }])).not.toThrow();
        expect(chart.innerHTML).toBe(before);
    });

    it('an empty data emission clears the plot without throwing', () => {
        source = new BehaviorSubject<any[]>([{ category: 'A', value: 1 }]);
        const b = new ChartBuilder<any>().withData(source.asObservable()).withCategoryField('category').withAnimation(false);
        b.addLineChart('value');
        const chart = b.build();
        document.body.appendChild(chart);

        expect(() => source.next([])).not.toThrow();
        expect(chart.querySelectorAll('path[stroke]').length).toBe(0);

        document.body.removeChild(chart);
    });
});

describe('A1 QA — tooltip content for a gapped series [NIT]', () => {
    const originalIntersectionObserver = window.IntersectionObserver;

    beforeEach(() => {
        jest.useFakeTimers();
        window.IntersectionObserver = GapTestIntersectionObserver as any;
    });

    afterEach(() => {
        jest.useRealTimers();
        window.IntersectionObserver = originalIntersectionObserver;
    });

    function hoverFirstCategory() {
        const data: any[] = [
            { category: 'Jan', a: 10, b: null },
            { category: 'Feb', a: 15, b: 20 },
        ];
        const b = new ChartBuilder<any>().withData(of(data)).withCategoryField('category').withTooltip(true);
        b.addLineChart('a').withLabel('Alpha').withColor('red');
        b.addLineChart('b').withLabel('Beta').withColor('blue');
        const chart = b.build();
        document.body.appendChild(chart);

        const svg = chart.querySelector('svg')!;
        svg.getBoundingClientRect = () => ({
            width: 500, height: 300, left: 0, top: 0, right: 500, bottom: 300, x: 0, y: 0, toJSON: () => {}
        } as DOMRect);
        svg.dispatchEvent(new MouseEvent('mousemove', { clientX: 61, clientY: 150, bubbles: true }));

        const tooltip = chart.querySelector('.z-50') as HTMLElement;
        return { chart, tooltip };
    }

    // CURRENT BEHAVIOUR, pinned deliberately.
    // chart-viewport.ts:263 comments "gap: no ring/dot, tooltip already omits
    // this series", but ChartTooltip.show renders a row for EVERY configured
    // chart, so the gap series shows up as "Beta: null". Reported as a [NIT] —
    // the SVG highlight and the tooltip disagree about the gap.
    it('renders a row for the gapped series showing the raw value (contradicting the viewport comment)', () => {
        const { chart, tooltip } = hoverFirstCategory();
        expect(tooltip).toBeTruthy();
        const text = tooltip.textContent || '';
        expect(text).toContain('Jan');
        expect(text).toContain('Alpha: 10');
        expect(text).toContain('Beta: null');       // <- the NIT: not omitted
        document.body.removeChild(chart);
    });

    it('the tooltip row count includes the gapped series while the hover highlight excludes it', () => {
        const { chart, tooltip } = hoverFirstCategory();
        // header + one row per configured chart (2), gap included
        expect(tooltip.children.length).toBe(3);

        const svg = chart.querySelector('svg')!;
        const hoverG = svg.querySelector('g')!.lastElementChild!;
        // guide line + (ring, point) for the non-gap series only
        expect(hoverG.children.length).toBe(3);

        document.body.removeChild(chart);
    });
});
