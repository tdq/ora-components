import { ChartBuilder } from './chart-builder';
import { ChartLogic } from './chart-logic';
import { ChartState } from './types';
import { AxisRenderer } from './axis-renderer';
import { of } from 'rxjs';
import '@testing-library/jest-dom';

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
    const testData = [
        { category: 'Jan', value1: 10, value2: 20 },
        { category: 'Feb', value1: 15, value2: 25 },
        { category: 'Mar', value1: 8, value2: 30 }
    ];

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

        // Check if rects exist in SVG (one per data point)
        const rects = chart.querySelectorAll('rect');
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
        expect(chart.querySelectorAll('rect').length).toBe(testData.length);
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

    it('should apply glass style', () => {
        const chart = new ChartBuilder()
            .withData(of(testData))
            .withCategoryField('category')
            .asGlass()
            .build();

        expect(chart).toHaveClass('backdrop-blur-md');
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

        const rects = chart.querySelectorAll('rect');
        const firstRectX = parseFloat(rects[0].getAttribute('x') || '0');
        
        // Padding should be exactly 8px
        // firstRectX = xScale(0) - barWidth / 2 = (8 + barWidth/2) - barWidth/2 = 8
        expect(firstRectX).toBeCloseTo(8, 1);
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
        const mainG = svg?.querySelector('g > g'); // The g where series are rendered

        if (!mainG) throw new Error('Main G not found');

        const children = Array.from(mainG.children);
        
        // Find indices of different chart types
        const areaIndex = children.findIndex(el => el.tagName === 'path' && el.getAttribute('fill') === 'green');
        const barIndex = children.findIndex(el => el.tagName === 'rect' && el.getAttribute('fill') === 'blue');
        const lineIndex = children.findIndex(el => el.tagName === 'path' && el.getAttribute('stroke') === 'red');

        expect(areaIndex).toBeLessThan(barIndex);
        expect(barIndex).toBeLessThan(lineIndex);
    });
});

// ---------------------------------------------------------------------------
// ST-2: ChartLogic.calculateScales — data-point downsampling
// ---------------------------------------------------------------------------

describe('ChartLogic.calculateScales — downsampling (ST-2)', () => {
    let logic: ChartLogic<TestItem>;

    beforeEach(() => {
        logic = new ChartLogic<TestItem>();
    });

    afterEach(() => {
        logic.destroy();
    });

    describe('no downsampling when data.length <= viewWidth', () => {
        it('returns all points when data.length equals viewWidth exactly', () => {
            const items = makeItems(100);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 100, 300);
            expect(scales.displayData.length).toBe(100);
        });

        it('returns all points when data.length is less than viewWidth', () => {
            const items = makeItems(50);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 200, 300);
            expect(scales.displayData.length).toBe(50);
        });

        it('returns all points when data.length equals Math.floor(viewWidth)', () => {
            // viewWidth=100.9 → MAX_POINTS=100; data.length=100 → no downsampling
            const items = makeItems(100);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 100.9, 300);
            expect(scales.displayData.length).toBe(100);
        });

        it('preserves original data references when no downsampling occurs', () => {
            const items = makeItems(5);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 500, 300);
            expect(scales.displayData).toEqual(items);
        });
    });

    describe('downsampling when data.length > Math.floor(viewWidth)', () => {
        it('caps displayData length at Math.floor(viewWidth)', () => {
            const items = makeItems(500);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 200, 300);
            expect(scales.displayData.length).toBe(200);
        });

        it('uses Math.floor on a fractional viewWidth before capping', () => {
            // viewWidth=199.9 → MAX_POINTS=199
            const items = makeItems(500);
            const state = makeState(items);
            const scales = logic.calculateScales(state, 199.9, 300);
            expect(scales.displayData.length).toBe(199);
        });

        it('never renders more points than Math.floor(viewWidth) regardless of dataset size', () => {
            const viewWidth = 300;
            for (const dataSize of [301, 500, 1000, 10000]) {
                const items = makeItems(dataSize);
                const state = makeState(items);
                const scales = logic.calculateScales(state, viewWidth, 300);
                expect(scales.displayData.length).toBeLessThanOrEqual(Math.floor(viewWidth));
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
