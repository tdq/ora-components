import { ChartBuilder } from './chart-builder';
import { ChartLogic } from './chart-logic';
import { ChartState } from './types';
import { AxisRenderer } from './axis-renderer';
import { HIGHLIGHT_DIAMETER } from './constants';
import { Observable, of, BehaviorSubject } from 'rxjs';
import '@testing-library/jest-dom';
import { GatedObserver } from '../../utils/optimized-pipeline';

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
        isSparkline: false,
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
        
        // withBarWidth(1): a single non-stacked series has one full-width slot; ratio 1
        // keeps the rendered rect flush with the group's left edge, matching the group's
        // 8px padding from the Y axis exactly (see series-renderer.test.ts for the
        // ratio-narrowing behaviour itself).
        chartBuilder.addBarChart('value1').withBarWidth(1);

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

    describe('Task 6 — value formatting (axis ticks + tooltip)', () => {
        const primaryTickSelector = 'text[text-anchor="end"][x="-10"]';
        const secondaryTickSelector = 'text[text-anchor="start"][x="10"]';

        it('defaults to a grouped number format on y ticks (no withFormat)', () => {
            const chart = new ChartBuilder<any>()
                .withData(of([{ category: 'A', value: 0 }, { category: 'B', value: 600000 }]))
                .withCategoryField('category');
            chart.addLineChart('value');
            const el = chart.build();

            const ticks = Array.from(el.querySelectorAll(primaryTickSelector)).map(t => t.textContent);
            expect(ticks).toContain('600,000');
            expect(ticks.some(t => t === '600000')).toBe(false);
        });

        it('a non-evenly-divisible domain produces clean tick labels (no float noise)', () => {
            // min + (i/ticks)*(max-min) lands on values like 2962.8599999999997 for this
            // domain/tick-count combination — the tick labels must not show that noise.
            const chart = new ChartBuilder<any>()
                .withData(of([{ category: 'A', value: 1234.5 }, { category: 'B', value: 9876.3 }]))
                .withCategoryField('category');
            chart.addLineChart('value');
            const el = chart.build();

            const ticks = Array.from(el.querySelectorAll(primaryTickSelector)).map(t => t.textContent || '');
            expect(ticks.length).toBeGreaterThan(0);

            // The domain step is (9876.3 - 1234.5) / 5 = 1728.36; since the step is >= 1 the
            // default (no explicit withFormat) precision cap rounds ticks to whole numbers.
            ticks.forEach(t => {
                const decimalPart = t.split('.')[1];
                expect(decimalPart === undefined || decimalPart.length <= 2).toBe(true);
            });
        });

        it('a very small domain does not collapse every tick to "0" (exponential-notation edge case)', () => {
            // step = 0.0000025 / 5 = 5e-7; Number#toString of that switches to exponential
            // notation ("5.000000000000001e-7"), which broke a string-based decimal count and
            // silently rounded every tick to 0.
            const chart = new ChartBuilder<any>()
                .withData(of([{ category: 'A', value: 0 }, { category: 'B', value: 0.0000025 }]))
                .withCategoryField('category');
            chart.addLineChart('value');
            const el = chart.build();

            const ticks = Array.from(el.querySelectorAll(primaryTickSelector)).map(t => t.textContent || '');
            expect(ticks.length).toBeGreaterThan(0);
            // Not every tick collapsed to "0" — at least one tick reflects the small magnitude.
            expect(ticks.some(t => t !== '0')).toBe(true);
        });

        it('caps the default (no withFormat) tick precision instead of showing every clean decimal', () => {
            // Domain [0, 123456.78] with 5 ticks has an exact, non-noisy step of
            // 123456.78 / 5 = 24691.356 (3 clean decimals) — without a cap the second tick would
            // read "24,691.356"; since the step is >= 1, the default cap rounds to 0 decimals
            // (matching the pre-Task-6 default of whole-number ticks, now with grouping).
            const chart = new ChartBuilder<any>()
                .withData(of([{ category: 'A', value: 0 }, { category: 'B', value: 123456.78 }]))
                .withCategoryField('category');
            chart.addLineChart('value');
            const el = chart.build();

            const ticks = Array.from(el.querySelectorAll(primaryTickSelector)).map(t => t.textContent || '');
            expect(ticks.length).toBeGreaterThan(0);
            ticks.forEach(t => expect(t.includes('.')).toBe(false));
            expect(ticks).toContain('24,691');
        });

        it('a domain straddling zero never renders a tick as literal "-0"', () => {
            // min=-3630, max=907, ticks=5 -> tick index 4 is -0.3999999999996362, whose default
            // (0-decimal) rounding is exactly -0: (-0.4).toFixed(0) === "-0", and
            // Intl.NumberFormat formats -0 as "-0" too.
            const chart = new ChartBuilder<any>()
                .withData(of([{ category: 'A', value: -3630 }, { category: 'B', value: 907 }]))
                .withCategoryField('category');
            chart.addLineChart('value');
            const el = chart.build();

            const ticks = Array.from(el.querySelectorAll(primaryTickSelector)).map(t => t.textContent || '');
            expect(ticks.length).toBeGreaterThan(0);
            expect(ticks).toContain('0');
            ticks.forEach(t => expect(t.startsWith('-0')).toBe(false));
        });

        it('an unrecognized legacy format string ("$0,0") is treated as the default, not an explicit format, for the precision cap', () => {
            // withFormat('$0,0') is not a recognized ValueFormat preset, so resolveValueFormat
            // silently falls back to the 'number' preset — but the axis must still recognize
            // this as "no real format was requested" and apply the default precision cap,
            // exactly like calling no withFormat() at all on this same domain.
            const chart = new ChartBuilder<any>()
                .withData(of([{ category: 'A', value: 0 }, { category: 'B', value: 123456.78 }]))
                .withCategoryField('category');
            chart.addLineChart('value');
            chart.withYAxis().withFormat('$0,0');
            const el = chart.build();

            const ticks = Array.from(el.querySelectorAll(primaryTickSelector)).map(t => t.textContent || '');
            expect(ticks.length).toBeGreaterThan(0);
            ticks.forEach(t => expect(t.includes('.')).toBe(false));
            expect(ticks).toContain('24,691');
        });

        it('withFormat("currency:EUR") formats every y tick with the euro symbol, grouped', () => {
            const chart = new ChartBuilder<any>()
                .withData(of([{ category: 'A', value: 0 }, { category: 'B', value: 600000 }]))
                .withCategoryField('category');
            chart.addLineChart('value');
            chart.withYAxis().withFormat('currency:EUR');
            const el = chart.build();

            const ticks = Array.from(el.querySelectorAll(primaryTickSelector)).map(t => t.textContent || '');
            expect(ticks.length).toBeGreaterThan(0);
            ticks.forEach(t => {
                expect(t.startsWith('€')).toBe(true);
            });
            expect(ticks).toContain('€600,000.00');
        });

        it('secondary axis withFormat("percentage") only affects secondary ticks', () => {
            const chart = new ChartBuilder<any>()
                .withData(of([
                    { category: 'A', primary: 0, secondary: 0 },
                    { category: 'B', primary: 600000, secondary: 1 }
                ]))
                .withCategoryField('category');
            chart.addLineChart('primary');
            chart.addLineChart('secondary').asSecondaryAxis();
            chart.withSecondaryYAxis().withFormat('percentage');
            const el = chart.build();

            const primaryTicks = Array.from(el.querySelectorAll(primaryTickSelector)).map(t => t.textContent || '');
            const secondaryTicks = Array.from(el.querySelectorAll(secondaryTickSelector)).map(t => t.textContent || '');

            expect(secondaryTicks.length).toBeGreaterThan(0);
            secondaryTicks.forEach(t => expect(t.endsWith('%')).toBe(true));
            primaryTicks.forEach(t => expect(t.endsWith('%')).toBe(false));
        });

        it('withFormat(function) uses the function for ticks', () => {
            const chart = new ChartBuilder<any>()
                .withData(of([{ category: 'A', value: 0 }, { category: 'B', value: 10 }]))
                .withCategoryField('category');
            chart.addLineChart('value');
            chart.withYAxis().withFormat(v => `${v} units`);
            const el = chart.build();

            const ticks = Array.from(el.querySelectorAll(primaryTickSelector)).map(t => t.textContent || '');
            expect(ticks.length).toBeGreaterThan(0);
            ticks.forEach(t => expect(t.endsWith(' units')).toBe(true));
        });

        it('category (x) axis format is unaffected by withFormat', () => {
            const chart = new ChartBuilder<any>()
                .withData(of([{ category: 'Jan', value: 0 }, { category: 'Feb', value: 10 }]))
                .withCategoryField('category');
            chart.addLineChart('value');
            chart.withXAxis().withFormat('money');
            const el = chart.build();

            const xAxisTexts = Array.from(el.querySelectorAll('text')).filter(t => {
                const parentG = t.parentElement;
                return parentG && parentG.getAttribute('transform')?.includes('translate(0,');
            }).map(t => t.textContent);

            expect(xAxisTexts).toContain('Jan');
            expect(xAxisTexts).toContain('Feb');
        });

        function hoverAt(chart: HTMLElement, clientX: number) {
            document.body.appendChild(chart);
            const svg = chart.querySelector('svg')!;
            svg.getBoundingClientRect = () => ({
                width: 500, height: 300, left: 0, top: 0, right: 500, bottom: 300, x: 0, y: 0, toJSON: () => {}
            } as DOMRect);
            svg.dispatchEvent(new MouseEvent('mousemove', { clientX, clientY: 150, bubbles: true }));
            const tooltip = chart.querySelector('.z-50') as HTMLElement;
            return tooltip;
        }

        it('tooltip formats the series value with the axis currency format', () => {
            const data = [{ category: 'Jan', amount: 1234.5 }, { category: 'Feb', amount: 2000 }];
            const chart = new ChartBuilder<any>().withData(of(data)).withCategoryField('category').withTooltip(true);
            chart.addLineChart('amount').withLabel('Amount');
            chart.withYAxis().withFormat('currency:EUR');
            const el = chart.build();

            const tooltip = hoverAt(el, 61);
            expect(tooltip.textContent).toContain('Amount: €1,234.50');
            document.body.removeChild(el);
        });

        it('a series-level withFormat overrides the axis format in the tooltip only', () => {
            const data = [{ category: 'Jan', amount: 1234.5 }, { category: 'Feb', amount: 2000 }];
            const chart = new ChartBuilder<any>().withData(of(data)).withCategoryField('category').withTooltip(true);
            chart.addLineChart('amount').withLabel('Amount').withFormat('integer');
            chart.withYAxis().withFormat('currency:EUR');
            const el = chart.build();

            const tooltip = hoverAt(el, 61);
            expect(tooltip.textContent).toContain('Amount: 1,235');

            // Ticks (unaffected by the series-level override) still use the axis currency format.
            const ticks = Array.from(el.querySelectorAll(primaryTickSelector)).map(t => t.textContent || '');
            ticks.forEach(t => expect(t.startsWith('€')).toBe(true));

            document.body.removeChild(el);
        });

        it('a series asSecondaryAxis() without withSecondaryYAxis() falls back to the primary format in the tooltip', () => {
            const data = [{ category: 'Jan', amount: 1234.5 }, { category: 'Feb', amount: 2000 }];
            const chart = new ChartBuilder<any>().withData(of(data)).withCategoryField('category').withTooltip(true);
            chart.addLineChart('amount').withLabel('Amount').asSecondaryAxis();
            chart.withYAxis().withFormat('currency:EUR');
            // Deliberately no withSecondaryYAxis() call — scales.formatSecondary is undefined.
            const el = chart.build();

            const tooltip = hoverAt(el, 61);
            expect(tooltip.textContent).toContain('Amount: €1,234.50');
            document.body.removeChild(el);
        });

        it('withLocale wires the locale into preset formatting (de-DE grouping/decimal on ticks)', () => {
            const chart = new ChartBuilder<any>()
                .withData(of([{ category: 'A', value: 0 }, { category: 'B', value: 600000 }]))
                .withCategoryField('category')
                .withLocale('de-DE');
            chart.addLineChart('value');
            chart.withYAxis().withFormat('currency:EUR');
            const el = chart.build();

            const ticks = Array.from(el.querySelectorAll(primaryTickSelector)).map(t => t.textContent || '');
            expect(ticks.length).toBeGreaterThan(0);
            // de-DE: '.' groups, ',' is the decimal separator, and the € symbol trails the value
            // (separated by whichever whitespace variant Intl uses for this locale/currency pair).
            expect(ticks.some(t => /^600\.000,00\s€$/.test(t))).toBe(true);
        });

        it('withCurrency sets the currency used by the bare "currency" preset', () => {
            const chart = new ChartBuilder<any>()
                .withData(of([{ category: 'A', value: 0 }, { category: 'B', value: 600000 }]))
                .withCategoryField('category')
                .withCurrency('USD');
            chart.addLineChart('value');
            chart.withYAxis().withFormat('currency');
            const el = chart.build();

            const ticks = Array.from(el.querySelectorAll(primaryTickSelector)).map(t => t.textContent || '');
            expect(ticks.length).toBeGreaterThan(0);
            ticks.forEach(t => expect(t.startsWith('$')).toBe(true));
            expect(ticks).toContain('$600,000.00');
        });

        it('destroy() completes the locale$/currency$ subjects along with the rest of the internal state', () => {
            // state$ is a combineLatest over every internal subject, including _locale$/_currency$
            // (added for Task 6) — combineLatest only completes once ALL of its sources complete,
            // so if destroy() forgot to complete either new subject, this subscription's `complete`
            // callback would never fire and the assertion below would fail.
            const logic = new ChartLogic<TestItem>();
            let completed = false;
            logic.state$.subscribe({ complete: () => { completed = true; } });

            logic.destroy();

            expect(completed).toBe(true);
        });
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
        // The series group is the clipped one that actually holds the series; select
        // it by that identity rather than by nesting depth, which also matches the
        // axis group (rendered before it so grid lines sit behind the series).
        const mainG = Array.from(svg?.querySelectorAll('g[clip-path]') ?? [])
            .find(group => group.children.length > 0);

        if (!mainG) throw new Error('Main G not found');

        const children = Array.from(mainG.children);
        
        // Find indices of different chart types
        const areaIndex = children.findIndex(el => el.tagName === 'path' && el.getAttribute('fill') === 'green');
        const barIndex = children.findIndex(el => el.tagName === 'rect' && el.getAttribute('fill') === 'blue');
        const lineIndex = children.findIndex(el => el.tagName === 'path' && el.getAttribute('stroke') === 'red');

        expect(areaIndex).toBeLessThan(barIndex);
        expect(barIndex).toBeLessThan(lineIndex);
    });

    it('paints grid lines behind the series (axis group precedes the series group)', () => {
        const chartBuilder = new ChartBuilder<any>()
            .withData(of(testData))
            .withCategoryField('category')
            .withAnimation(false);
        chartBuilder.withYAxis().withGridLines(true);
        chartBuilder.withXAxis().withGridLines(true);
        chartBuilder.addLineChart('value1').withColor('red');

        const chart = chartBuilder.build();
        const svg = chart.querySelector('svg')!;

        // The plot group holds the axis group first, then the clipped series group.
        const seriesG = Array.from(svg.querySelectorAll('g[clip-path]'))
            .find(group => group.children.length > 0)!;
        const plotG = seriesG.parentElement!;
        const children = Array.from(plotG.children);
        const axisG = children.find(el => el !== seriesG && el.querySelector('line'))!;

        expect(axisG).toBeTruthy();
        expect(children.indexOf(axisG)).toBeLessThan(children.indexOf(seriesG));
        // The grid lines really are in that earlier group, not among the series.
        expect(axisG.querySelectorAll('line').length).toBeGreaterThan(0);
        expect(seriesG.querySelectorAll('line').length).toBe(0);
    });

    it('draws no grid lines by default (opt in with withGridLines(true))', () => {
        const chartBuilder = new ChartBuilder<any>()
            .withData(of(testData))
            .withCategoryField('category')
            .withAnimation(false);
        chartBuilder.addLineChart('value1').withColor('red');

        const svg = chartBuilder.build().querySelector('svg')!;
        const gridLines = svg.querySelectorAll('line');

        expect(gridLines.length).toBe(0);
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
        // Floats above a (possibly glass) host: keeps its blur past the nested-glass
        // suppression rule, and carries elevation without a shadow utility that would
        // overwrite glass-effect's ring. See index-layered.css.
        expect(tooltip).toHaveClass('glass-effect--overlay');
        expect(tooltip).not.toHaveClass('shadow-level-2');
        
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
// Null/NaN gap support (ported from the 9aca03c rewrite — functional part only;
// the animation model here remains the 0.1.7 one)
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
        // withBarWidth(1): keeps the rect flush with the group edge so the x assertion
        // below (xScale(i) - barWidth/2) stays exact; ratio-narrowing has its own coverage
        // in series-renderer.test.ts.
        b.addBarChart('value').withBarWidth(1);
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
            expect(a.getAttribute('from')).not.toContain('NaN');
            expect(a.getAttribute('to')).not.toContain('NaN');
        });
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

    it('withTestId sets data-testid on the host element', () => {
        const chart = new ChartBuilder()
            .withData(of([{ category: 'Jan', a: 10 }]))
            .withCategoryField('category')
            .withTestId('sales-chart')
            .build();
        expect(chart.getAttribute('data-testid')).toBe('sales-chart');
    });
});


describe('ChartBuilder — data-testid survives a re-render', () => {
    const originalIntersectionObserver = window.IntersectionObserver;

    beforeEach(() => {
        jest.useFakeTimers();

        // Without a firing IntersectionObserver the optimized pipeline never emits and
        // nothing is rendered at all — the same mock the other ChartBuilder suites use.
        class MockIntersectionObserver implements IntersectionObserver {
            readonly root: Element | Document | null = null;
            readonly rootMargin: string = '';
            readonly thresholds: ReadonlyArray<number> = [];

            constructor(private callback: IntersectionObserverCallback) {}

            observe(element: Element) {
                this.callback([{
                    target: element,
                    isIntersecting: true,
                    intersectionRatio: 1,
                    boundingClientRect: element.getBoundingClientRect(),
                    intersectionRect: element.getBoundingClientRect(),
                    rootBounds: null,
                    time: Date.now(),
                } as IntersectionObserverEntry], this);
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

    it('keeps data-testid on the host across a data$ emission', () => {
        const data$ = new BehaviorSubject<any[]>([
            { category: 'Jan', value1: 10 },
            { category: 'Feb', value1: 20 },
        ]);
        const chartBuilder = new ChartBuilder<any>()
            .withData(data$)
            .withCategoryField('category')
            .withAnimation(false)
            .withTestId('sales-chart');
        chartBuilder.addBarChart('value1');

        const chart = chartBuilder.build();
        document.body.appendChild(chart);
        jest.advanceTimersByTime(150);

        const barsBefore = chart.querySelectorAll('rect').length;
        expect(barsBefore).toBeGreaterThan(0);

        data$.next([
            { category: 'Jan', value1: 10 },
            { category: 'Feb', value1: 20 },
            { category: 'Mar', value1: 30 },
        ]);
        jest.advanceTimersByTime(150);

        // The chart really re-rendered, and the host attribute survived it.
        expect(chart.querySelectorAll('rect').length).not.toBe(barsBefore);
        expect(chart.getAttribute('data-testid')).toBe('sales-chart');

        document.body.removeChild(chart);
        data$.complete();
    });
});

describe('Task 6 — money formatting consistency across MoneyColumn, MoneyField and chart y axis', () => {
    it('formats the same amount with identical digits/separators for the same locale', async () => {
        const { MoneyColumnBuilder } = await import('../grid/columns/money-column');
        const { MoneyFieldBuilder } = await import('../money-field/money-field');
        const { resolveValueFormat } = await import('../../utils/number');

        const amount = 1234.5;
        const money = { amount, currencyId: 'EUR' };

        // MoneyColumn
        const column = new MoneyColumnBuilder<{ value: typeof money }>('value').build();
        const columnOutput = column.render({ value: money });

        // MoneyField (built value already syncs synchronously, same as MoneyColumn's precision)
        const { BehaviorSubject, of: ofRx } = await import('rxjs');
        const value$ = new BehaviorSubject<typeof money | null>(money);
        const fieldContainer = new MoneyFieldBuilder()
            .withValue(value$)
            .withPrecision(ofRx(2))
            .withCurrencies(['EUR'])
            .build();
        const fieldInput = fieldContainer.querySelector('input') as HTMLInputElement;

        // Chart y axis 'currency:EUR'
        const chartFormatted = resolveValueFormat('currency:EUR')(amount);

        const stripCurrencySymbol = (s: string) => s.replace(/^[^0-9-]+/, '').trim();

        expect(stripCurrencySymbol(columnOutput)).toBe('1,234.50');
        expect(fieldInput.value).toBe('1,234.50');
        expect(stripCurrencySymbol(chartFormatted)).toBe('1,234.50');
    });
});

describe('Task 7 — ChartLogic grouped/stacked bar scale metadata', () => {
    let logic: ChartLogic<TestItem>;
    beforeEach(() => { logic = new ChartLogic<TestItem>(); });
    afterEach(() => { logic.destroy(); });

    it('gives each grouped slot the full single-bar width instead of dividing it (bug fix)', () => {
        // Regression test: grouped bar series used to shrink as more series were added
        // (barSlot = barWidth / groupedCount). Now each slot keeps the width a lone bar
        // series would get, and the group simply spans more space (barGroupWidth grows).
        const s = makeState(makeItems(3));
        s.charts = [
            { type: 'bar', field: 'value', label: 'a' },
            { type: 'bar', field: 'value', label: 'b' },
        ] as any;
        const scales = logic.calculateScales(s, 400, 300);
        expect(scales.barSlot).toBeCloseTo(scales.barWidth || 0, 5);
        expect(scales.barGroupWidth).toBeCloseTo((scales.barWidth || 0) * 2, 5);
        expect(scales.barSeriesIndex?.get(0)).toBe(0);
        expect(scales.barSeriesIndex?.get(1)).toBe(1);
    });

    it('gives a single bar series the full group width as its slot', () => {
        const s = makeState(makeItems(3));
        s.charts = [{ type: 'bar', field: 'value', label: 'a' }] as any;
        const scales = logic.calculateScales(s, 400, 300);
        expect(scales.barSlot).toBeCloseTo(scales.barWidth || 0, 5);
    });

    it('maps every stacked bar series to the same shared slot (the stacked group renders as one bar)', () => {
        const s = makeState(makeItems(3));
        s.charts = [
            { type: 'bar', field: 'value', label: 'a', isStacked: true },
            { type: 'bar', field: 'value', label: 'b', isStacked: true },
        ] as any;
        const scales = logic.calculateScales(s, 400, 300);
        expect(scales.barSeriesIndex?.get(0)).toBe(0);
        expect(scales.barSeriesIndex?.get(1)).toBe(0);
        // No non-stacked series exist, so the stacked group is the only slot: full group width.
        expect(scales.barSlot).toBeCloseTo(scales.barWidth || 0, 5);
    });

    it('gives a non-stacked series and a stacked group separate slots when mixed', () => {
        const s = makeState(makeItems(3));
        s.charts = [
            { type: 'bar', field: 'value', label: 'a' },
            { type: 'bar', field: 'value', label: 'b', isStacked: true },
            { type: 'bar', field: 'value', label: 'c', isStacked: true },
        ] as any;
        const scales = logic.calculateScales(s, 400, 300);
        // 2 slots total: one for the non-stacked series, one shared by the stacked group.
        // Each keeps the full single-bar width — the group widens, it does not divide.
        expect(scales.barSlot).toBeCloseTo(scales.barWidth || 0, 5);
        expect(scales.barGroupWidth).toBeCloseTo((scales.barWidth || 0) * 2, 5);
        expect(scales.barSeriesIndex?.get(0)).toBe(0); // non-stacked: its own slot
        expect(scales.barSeriesIndex?.get(1)).toBe(1); // stacked group: shared slot
        expect(scales.barSeriesIndex?.get(2)).toBe(1); // stacked group: same shared slot
    });

    it('clamps the group width so many categories with several series never overlap', () => {
        // 20 categories, viewWidth 400: available-per-category = (400-16)/20 = 19.2, so
        // barWidth = min(19.2 * 0.8, 32) = 15.36. Preferred (undivided) group width for 3
        // series would be 3 * 15.36 = 46.08, which does not fit in 19.2 - 4 (gap) = 15.2 —
        // so the clamp must fall back to dividing barWidth evenly among the 3 slots.
        const s = makeState(makeItems(20));
        s.charts = [
            { type: 'bar', field: 'value', label: 'a' },
            { type: 'bar', field: 'value', label: 'b' },
            { type: 'bar', field: 'value', label: 'c' },
        ] as any;
        const scales = logic.calculateScales(s, 400, 300);
        const barWidth = scales.barWidth || 0;
        expect(scales.barSlot).toBeCloseTo(barWidth / 3, 5);
        expect(scales.barGroupWidth).toBeCloseTo(barWidth, 5);

        // The clamped group width must still fit within the space available per category,
        // so adjacent groups never overlap.
        const available = (400 - 16) / 20;
        expect(scales.barGroupWidth || 0).toBeLessThanOrEqual(available + 1e-9);
    });

    it('computes cumulative baselines for stacked bar series, positive and negative independently', () => {
        const data: TestItem[] = [{ category: 'A', value: 0 }];
        const s = makeState(data);
        s.charts = [
            { type: 'bar', field: 'pos', label: 'p1', isStacked: true },
            { type: 'bar', field: 'pos', label: 'p2', isStacked: true },
        ] as any;
        (s.data[0] as any).pos = 10;
        const config1 = s.charts[0];
        const config2 = s.charts[1];
        const scales = logic.calculateScales(s, 400, 300);
        // Same field/value for both configs (10): first baseline 0, second baseline 10.
        expect(scales.barBaselines?.get(config1)?.[0]).toBe(0);
        expect(scales.barBaselines?.get(config2)?.[0]).toBe(10);
    });
});

describe('Task 7 — ChartBuilder.asSparkline()', () => {
    const originalIntersectionObserver = window.IntersectionObserver;

    beforeEach(() => {
        jest.useFakeTimers();
        window.IntersectionObserver = GapTestIntersectionObserver as any;
    });

    afterEach(() => {
        jest.useRealTimers();
        window.IntersectionObserver = originalIntersectionObserver;
    });

    const sparkData = [
        { category: 'Jan', value: 10 },
        { category: 'Feb', value: 15 },
        { category: 'Mar', value: 8 },
    ];

    it('renders no <text> nodes (axes and legend hidden)', () => {
        const builder = new ChartBuilder<any>()
            .withData(of(sparkData))
            .withCategoryField('category')
            .withTitle(of(''))
            .asSparkline();
        builder.addLineChart('value');
        const chart = builder.build();

        expect(chart.querySelectorAll('text').length).toBe(0);
    });

    it('defaults the height to 32px when withHeight was not called', () => {
        const builder = new ChartBuilder<any>()
            .withData(of(sparkData))
            .withCategoryField('category')
            .asSparkline();
        builder.addLineChart('value');
        const chart = builder.build();

        expect(chart.style.height).toBe('32px');
    });

    it('drops the fixed min-height on the chart area in sparkline mode (and keeps it otherwise)', () => {
        // BLOCKING QA finding: ChartStyles.chartArea's `min-h-[200px]` overrides the sparkline's
        // configured 32px height in a real browser (jsdom's layout-less rendering can't catch
        // this — only the class-list assertion below can).
        const sparklineChart = new ChartBuilder<any>()
            .withData(of(sparkData))
            .withCategoryField('category')
            .asSparkline();
        sparklineChart.addLineChart('value');
        const sparklineEl = sparklineChart.build();
        const sparklineArea = sparklineEl.querySelector('.flex-grow') as HTMLElement;
        expect(sparklineArea.className).not.toContain('min-h-[200px]');
        expect(sparklineEl.style.height).toBe('32px');

        const normalChart = new ChartBuilder<any>()
            .withData(of(sparkData))
            .withCategoryField('category');
        normalChart.addLineChart('value');
        const normalEl = normalChart.build();
        const normalArea = normalEl.querySelector('.flex-grow') as HTMLElement;
        expect(normalArea.className).toContain('min-h-[200px]');
    });

    it('gives both the host and the chart area an explicit pixel height in sparkline mode, at the default 32px', () => {
        // BLOCKING QA re-finding: jsdom can't reproduce the real-browser bug (chart area
        // measured 150px — the SVG's intrinsic default — because flex-basis: auto sizes the
        // area to its content, and the SVG has no definite parent height to resolve its own
        // 100% height against). The fix must not depend on measurement: both the host and the
        // chart area get an explicit `style.height`, and the chart area is taken out of flex
        // sizing (`flex: none`) so it cannot expand past that height regardless of its content.
        const builder = new ChartBuilder<any>()
            .withData(of(sparkData))
            .withCategoryField('category')
            .asSparkline();
        builder.addBarChart('value');
        const chart = builder.build();

        expect(chart.style.height).toBe('32px');
        const chartArea = chart.querySelector('.flex-grow') as HTMLElement;
        expect(chartArea.style.height).toBe('32px');
        expect(chartArea.style.flexGrow).toBe('0');
        expect(chartArea.style.flexShrink).toBe('0');
    });

    it('gives both the host and the chart area an explicit pixel height honoring withHeight(64)', () => {
        const builder = new ChartBuilder<any>()
            .withData(of(sparkData))
            .withCategoryField('category')
            .asSparkline()
            .withHeight(64);
        builder.addBarChart('value');
        const chart = builder.build();

        expect(chart.style.height).toBe('64px');
        const chartArea = chart.querySelector('.flex-grow') as HTMLElement;
        expect(chartArea.style.height).toBe('64px');
        expect(chartArea.style.flexGrow).toBe('0');
        expect(chartArea.style.flexShrink).toBe('0');
    });

    it('sets the <svg> height attribute and the viewBox height to the configured sparkline height, not a measured rect', () => {
        const builder32 = new ChartBuilder<any>()
            .withData(of(sparkData))
            .withCategoryField('category')
            .asSparkline();
        builder32.addBarChart('value');
        const chart32 = builder32.build();
        const svg32 = chart32.querySelector('svg')!;
        expect(svg32.getAttribute('height')).toBe('32');
        expect(svg32.getAttribute('viewBox')).toBe('0 0 600 32');

        const builder64 = new ChartBuilder<any>()
            .withData(of(sparkData))
            .withCategoryField('category')
            .asSparkline()
            .withHeight(64);
        builder64.addBarChart('value');
        const chart64 = builder64.build();
        const svg64 = chart64.querySelector('svg')!;
        expect(svg64.getAttribute('height')).toBe('64');
        expect(svg64.getAttribute('viewBox')).toBe('0 0 600 64');
    });

    it('leaves non-sparkline charts on the measured/percentage sizing path (height attribute stays 100%)', () => {
        const builder = new ChartBuilder<any>()
            .withData(of(sparkData))
            .withCategoryField('category');
        builder.addBarChart('value');
        const chart = builder.build();

        const chartArea = chart.querySelector('.flex-grow') as HTMLElement;
        expect(chartArea.style.height).toBe('');
        expect(chartArea.style.flex).toBe('');
        const svg = chart.querySelector('svg')!;
        expect(svg.getAttribute('height')).toBe('100%');
        // jsdom fallback (no real layout): 600x400, unaffected by the sparkline forcedHeight path.
        expect(svg.getAttribute('viewBox')).toBe('0 0 600 400');
    });

    it('keeps an explicit withHeight() regardless of call order relative to asSparkline()', () => {
        const builderBefore = new ChartBuilder<any>()
            .withData(of(sparkData))
            .withCategoryField('category')
            .withHeight(64)
            .asSparkline();
        builderBefore.addLineChart('value');
        expect(builderBefore.build().style.height).toBe('64px');

        const builderAfter = new ChartBuilder<any>()
            .withData(of(sparkData))
            .withCategoryField('category')
            .asSparkline()
            .withHeight(64);
        builderAfter.addLineChart('value');
        expect(builderAfter.build().style.height).toBe('64px');
    });

    it('disables the legend', () => {
        const builder = new ChartBuilder<any>()
            .withData(of(sparkData))
            .withCategoryField('category')
            .asSparkline();
        builder.addLineChart('value').withLabel('V');
        const el = builder.build();

        const legend = el.querySelector('.flex.flex-wrap.gap-4') as HTMLElement;
        expect(legend?.style.display).toBe('none');
    });

    it('keeps padding at 0 even with long category labels that would otherwise trigger axis-rotation padding', () => {
        // Long labels would normally make AxisRenderer.getLabelRotation return -45/-90 and bump
        // bottom padding to 80/100 (chart-viewport.ts render() Step 6) — that bump must not fire
        // in sparkline mode, where padding: 0 is promised regardless of label rotation.
        const longLabelData = [
            { category: 'September Category One', value: 10 },
            { category: 'October Category Two', value: 15 },
            { category: 'November Category Three', value: 8 },
        ];
        const builder = new ChartBuilder<any>()
            .withData(of(longLabelData))
            .withCategoryField('category')
            .asSparkline();
        builder.addBarChart('value');
        const chart = builder.build();

        const svg = chart.querySelector('svg')!;
        // Sparkline mode forces the viewBox height from the configured height (32, the
        // default) rather than a measured chart-area rect — see ChartSvgArea.getViewBox's
        // `forcedHeight` param — so the plot area equals the full SVG only if padding stayed
        // at 0 on every side.
        expect(svg.getAttribute('viewBox')).toBe('0 0 600 32');

        const paddedG = svg.querySelector('g > g');
        expect(paddedG?.getAttribute('transform')).toBe('translate(0, 0)');
    });

    it('does not show tooltip on mousemove when asSparkline is used', () => {
        const sparkData = [
            { category: 'Jan', value: 10 },
            { category: 'Feb', value: 15 },
            { category: 'Mar', value: 8 },
        ];
        const builder = new ChartBuilder<any>()
            .withData(of(sparkData))
            .withCategoryField('category')
            .asSparkline();
        builder.addLineChart('value').withLabel('V');
        const el = builder.build();

        // Attempt to trigger tooltip with mousemove event
        document.body.appendChild(el);
        const svg = el.querySelector('svg')!;
        svg.getBoundingClientRect = () => ({
            width: 500, height: 300, left: 0, top: 0, right: 500, bottom: 300, x: 0, y: 0, toJSON: () => {}
        } as DOMRect);
        svg.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 150, bubbles: true }));

        // Tooltip element may exist in the DOM but should remain hidden (opacity-0 class)
        // because showTooltip is false in sparkline mode
        const tooltip = el.querySelector('.z-50') as HTMLElement;
        expect(tooltip?.classList.contains('opacity-0')).toBe(true);

        document.body.removeChild(el);
    });
});

describe('Task 7 — Grouped bars tooltip hit-testing', () => {
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

    it('tooltip hit-testing resolves the correct category on a grouped bar chart', () => {
        type Row = { category: string; a: number; b: number };
        const data: Row[] = [
            { category: 'Jan', a: 10, b: 20 },
            { category: 'Feb', a: 15, b: 5 },
            { category: 'Mar', a: 8, b: 12 }
        ];

        const builder = new ChartBuilder<Row>()
            .withData(of(data))
            .withCategoryField('category')
            .withTooltip(true);
        builder.addBarChart('a').withLabel('Series A').withColor('red');
        builder.addBarChart('b').withLabel('Series B').withColor('blue');

        const el = builder.build();
        document.body.appendChild(el);

        const svg = el.querySelector('svg')!;
        svg.getBoundingClientRect = () => ({
            width: 500, height: 300, left: 0, top: 0, right: 500, bottom: 300, x: 0, y: 0, toJSON: () => {}
        } as DOMRect);

        // Dispatch mousemove at position for first category (Jan, around x=61 for 3 categories in 500px width)
        svg.dispatchEvent(new MouseEvent('mousemove', { clientX: 61, clientY: 150, bubbles: true }));

        const tooltip = el.querySelector('.z-50') as HTMLElement;
        expect(tooltip).not.toBeNull();
        expect(tooltip.textContent).toContain('Jan');
        expect(tooltip.textContent).toContain('Series A');
        expect(tooltip.textContent).toContain('Series B');
        // Verify the values are shown (10 for a, 20 for b)
        expect(tooltip.textContent).toContain('10');
        expect(tooltip.textContent).toContain('20');

        document.body.removeChild(el);
    });
});

describe('Task 7 — Bar animation reaches final positions', () => {
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

    it('bars reach their final positions when animation completes (advance fake timers)', () => {
        type Row = { category: string; value: number };
        const data: Row[] = [
            { category: 'A', value: 100 },
            { category: 'B', value: 200 },
        ];

        const builder = new ChartBuilder<Row>()
            .withData(of(data))
            .withCategoryField('category')
            .withAnimation(true); // Enable animation
        builder.addBarChart('value').withColor('red');

        const chart = builder.build();

        // Get all bar rects (excluding clipPath elements)
        const rects = Array.from(chart.querySelectorAll('rect')).filter(el => !el.closest('clipPath'));

        // Should have at least 2 bars (one per category)
        expect(rects.length).toBeGreaterThanOrEqual(2);

        // Check that animate elements exist within the chart (SVG animation)
        const animateElements = chart.querySelectorAll('animate');
        expect(animateElements.length).toBeGreaterThan(0);

        // Advance timers to complete all animations
        jest.advanceTimersByTime(1000);

        // After animation completes, bars should have valid positioning
        const rectA = rects[0]!;
        const finalY = parseFloat(rectA.getAttribute('y') || '0');

        // Y position should be a valid number
        expect(isNaN(finalY)).toBe(false);
        expect(finalY).toBeGreaterThanOrEqual(0);
    });

    it('should apply custom classes reactively and replace on new emission', () => {
        const { of: ofRx, BehaviorSubject } = require('rxjs');
        const class$ = new BehaviorSubject('custom-class-1');
        const data: Row[] = [{ category: 'A', value: 10 }];

        const chart = new ChartBuilder<Row>()
            .withData(ofRx(data))
            .withCategoryField('category')
            .withClass(class$);
        chart.addBarChart('value');

        const element = chart.build();

        expect(element.classList.contains('custom-class-1')).toBe(true);

        class$.next('custom-class-2');
        expect(element.classList.contains('custom-class-1')).toBe(false);
        expect(element.classList.contains('custom-class-2')).toBe(true);
    });

    it('should handle multiple space-separated classes in withClass', () => {
        const { of: ofRx, BehaviorSubject } = require('rxjs');
        const class$ = new BehaviorSubject('class-1 class-2');
        const data: Row[] = [{ category: 'A', value: 10 }];

        const chart = new ChartBuilder<Row>()
            .withData(ofRx(data))
            .withCategoryField('category')
            .withClass(class$);
        chart.addBarChart('value');

        const element = chart.build();

        expect(element.classList.contains('class-1')).toBe(true);
        expect(element.classList.contains('class-2')).toBe(true);

        class$.next('class-3');
        expect(element.classList.contains('class-1')).toBe(false);
        expect(element.classList.contains('class-2')).toBe(false);
        expect(element.classList.contains('class-3')).toBe(true);
    });

    it('should preserve custom class through data re-render', () => {
        type Row = { category: string; value: number };
        const { BehaviorSubject } = require('rxjs');
        const data$ = new BehaviorSubject<Row[]>([{ category: 'A', value: 10 }]);
        const class$ = new BehaviorSubject('custom-highlight');

        const chart = new ChartBuilder<Row>()
            .withData(data$)
            .withCategoryField('category')
            .withClass(class$);
        chart.addBarChart('value');

        const element = chart.build();

        expect(element.classList.contains('custom-highlight')).toBe(true);

        // Trigger a re-render by emitting new data
        data$.next([{ category: 'B', value: 20 }]);
        jest.advanceTimersByTime(150);

        // Custom class should survive the re-render
        expect(element.classList.contains('custom-highlight')).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 8 S8a-1 — Chart series default colors use theme tokens
// ─────────────────────────────────────────────────────────────────────────────

describe('Task 8 S8a-1 — Chart series default colors use theme tokens', () => {
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
    const twoSeriesData: Row[] = [
        { category: 'A', a: 10, b: 20 },
        { category: 'B', a: 15, b: 5 }
    ];

    it('renders bar series with default colors using var(--ora-chart-series-n) CSS variables', () => {
        const builder = new ChartBuilder<Row>()
            .withData(of(twoSeriesData))
            .withCategoryField('category')
            .withAnimation(false);

        // Add two series WITHOUT explicit withColor() — should use token defaults
        builder.addBarChart('a').withLabel('Series 1');
        builder.addBarChart('b').withLabel('Series 2');

        const chart = builder.build();
        const rects = Array.from(chart.querySelectorAll('rect')).filter(el => !el.closest('clipPath'));

        // Should have 2 series × 2 categories = 4 rects
        expect(rects.length).toBe(4);

        // First two rects (series 1) should use var(--ora-chart-series-1)
        expect(rects[0].getAttribute('fill')).toContain('var(--ora-chart-series-1)');
        expect(rects[1].getAttribute('fill')).toContain('var(--ora-chart-series-1)');

        // Next two rects (series 2) should use var(--ora-chart-series-2)
        expect(rects[2].getAttribute('fill')).toContain('var(--ora-chart-series-2)');
        expect(rects[3].getAttribute('fill')).toContain('var(--ora-chart-series-2)');
    });

    it('renders line series with default colors using var(--ora-chart-series-n) CSS variables', () => {
        const builder = new ChartBuilder<Row>()
            .withData(of(twoSeriesData))
            .withCategoryField('category')
            .withAnimation(false);

        // Add two line series WITHOUT explicit withColor()
        builder.addLineChart('a').withLabel('Series 1');
        builder.addLineChart('b').withLabel('Series 2');

        const chart = builder.build();
        const paths = Array.from(chart.querySelectorAll('path')).filter(el => !el.closest('clipPath') && el.getAttribute('stroke'));

        // Should have at least 2 line paths (one per series)
        expect(paths.length).toBeGreaterThanOrEqual(2);

        // First path should use var(--ora-chart-series-1)
        expect(paths[0].getAttribute('stroke')).toContain('var(--ora-chart-series-1)');

        // Second path should use var(--ora-chart-series-2)
        expect(paths[1].getAttribute('stroke')).toContain('var(--ora-chart-series-2)');
    });

    it('withColor() on a series overrides the default token, winning with an explicit color', () => {
        const builder = new ChartBuilder<Row>()
            .withData(of(twoSeriesData))
            .withCategoryField('category')
            .withAnimation(false);

        // Series 1: no color (should use token)
        builder.addBarChart('a');
        // Series 2: explicit color (should override token)
        builder.addBarChart('b').withColor('#FF0000');

        const chart = builder.build();
        const rects = Array.from(chart.querySelectorAll('rect')).filter(el => !el.closest('clipPath'));

        expect(rects.length).toBe(4);

        // First series (no override): use token
        expect(rects[0].getAttribute('fill')).toContain('var(--ora-chart-series-1)');
        expect(rects[1].getAttribute('fill')).toContain('var(--ora-chart-series-1)');

        // Second series (with override): literal color wins
        expect(rects[2].getAttribute('fill')).toBe('#FF0000');
        expect(rects[3].getAttribute('fill')).toBe('#FF0000');
    });
});
