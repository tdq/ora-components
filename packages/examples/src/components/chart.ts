import { ChartBuilder, PanelBuilder, PanelGap, LabelBuilder, LayoutBuilder, LayoutGap, SlotSize } from '@tdq/ora-components';
import { BehaviorSubject, of, timer } from 'rxjs';
import { map } from 'rxjs/operators';

// ─── shared data shapes ──────────────────────────────────────────────────────

interface MonthPoint  { month: string; revenue: number; orders: number }
interface DayPoint    { day: string; users: number }
interface CategoryPoint { category: string; value: number }

const MONTHLY: MonthPoint[] = [
    { month: 'Jan', revenue: 18200, orders: 210 },
    { month: 'Feb', revenue: 15800, orders: 183 },
    { month: 'Mar', revenue: 22400, orders: 258 },
    { month: 'Apr', revenue: 28100, orders: 312 },
    { month: 'May', revenue: 24600, orders: 287 },
    { month: 'Jun', revenue: 31500, orders: 361 },
];

const DAILY: DayPoint[] = [
    { day: 'Mon', users: 3840 },
    { day: 'Tue', users: 4210 },
    { day: 'Wed', users: 4580 },
    { day: 'Thu', users: 5120 },
    { day: 'Fri', users: 4890 },
    { day: 'Sat', users: 2760 },
    { day: 'Sun', users: 2190 },
];

const CATEGORIES: CategoryPoint[] = [
    { category: 'North America', value: 98400 },
    { category: 'Europe',        value: 71200 },
    { category: 'Asia Pacific',  value: 52800 },
    { category: 'Latin America', value: 18600 },
    { category: 'Middle East',   value:  7600 },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

// Wrap a chart in a titled panel so each example is self-labeling.
// Chart height is set via .withHeight() on ChartBuilder — no panel min-h needed.
function chartPanel(title: string, chart: ChartBuilder<any>): PanelBuilder {
    const content = new LayoutBuilder().asVertical().withGap(LayoutGap.LARGE);
    content.addSlot().withSize(SlotSize.FIT).withContent(
        new LabelBuilder().withCaption(of(title))
    );
    content.addSlot().withSize(SlotSize.FULL).withContent(chart);

    return new PanelBuilder()
        .withGap(PanelGap.LARGE)
        .withContent(content);
}

// ─── examples ────────────────────────────────────────────────────────────────

/**
 * Line Chart
 *
 * `.addLineChart(field)` draws a line series over a categorical X axis.
 * `.withCategoryField()` maps the data key used as the X axis.
 *
 * Variants on LineChartBuilder:
 *   `.withWidth(n)`   — stroke width in px (default 2)
 *   `.withCurve()`    — 'linear' | 'smooth' | 'step'
 *   `.withMarkers(true)` — show a dot at each data point
 *   `.asDashed()`     — dashed stroke
 */
export function createLineChartExample(): PanelBuilder {
    const chart = new ChartBuilder<DayPoint>()
        .withData(of(DAILY))
        .withHeight(400)
        .withCategoryField('day');

    chart.addLineChart('users')
        .withLabel('Daily Active Users')
        .withColor('#6366f1')
        .withMarkers(true);

    return chartPanel('Line Chart', chart);
}

/**
 * Bar Chart
 *
 * `.addBarChart(field)` draws vertical bars.
 *
 * Variants on BarChartBuilder:
 *   `.asStacked()`       — stack multiple bar series
 *   `.withBarWidth(0.8)` — bar width as fraction of available slot (0–1)
 */
export function createBarChartExample(): PanelBuilder {
    const chart = new ChartBuilder<CategoryPoint>()
        .withData(of(CATEGORIES))
        .withCategoryField('category')
        .withHeight(400);

    chart.addBarChart('value')
        .withLabel('Revenue by Region (€)')
        .withColor('#0ea5e9');

    return chartPanel('Bar Chart', chart);
}

/**
 * Area Chart
 *
 * `.addAreaChart(field)` draws a filled area below the line.
 * Best for showing volume or cumulative metrics over time.
 *
 * Variants on AreaChartBuilder:
 *   `.withOpacity(0.3)`  — fill opacity (default 0.3)
 *   `.withCurve('smooth')` — smooth the line
 *   `.asStacked()`       — stack multiple area series
 */
export function createAreaChartExample(): PanelBuilder {
    const chart = new ChartBuilder<MonthPoint>()
        .withData(of(MONTHLY))
        .withCategoryField('month')
        .withHeight(400);

    chart.addAreaChart('revenue')
        .withLabel('Monthly Revenue (€)')
        .withColor('#10b981')
        .withOpacity(0.25)
        .withCurve('smooth');

    return chartPanel('Area Chart', chart);
}

/**
 * Multi-Series Chart
 *
 * Add multiple `.addLineChart()` / `.addBarChart()` calls on one ChartBuilder
 * to overlay series. Use `.withLegend(true)` so users can identify each series.
 *
 * All series share the same X axis (category field).
 */
export function createMultiSeriesChartExample(): PanelBuilder {
    const chart = new ChartBuilder<MonthPoint>()
        .withData(of(MONTHLY))
        .withCategoryField('month')
        .withHeight(400)
        .withLegend(true);

    chart.addAreaChart('revenue')
        .withLabel('Revenue (€)')
        .withColor('#6366f1')
        .withOpacity(0.2);

    chart.addLineChart('orders')
        .withLabel('Orders')
        .withColor('#f59e0b')
        .withWidth(2)
        .withMarkers(true);

    return chartPanel('Multi-Series Chart', chart);
}

/**
 * Dual-Axis Chart
 *
 * `.withSecondaryYAxis()` adds a right-side Y axis for series with
 * a different scale (e.g. revenue in thousands vs. order count in hundreds).
 *
 * Call `.asSecondaryAxis()` on individual series to assign them to the right axis.
 */
export function createDualAxisChartExample(): PanelBuilder {
    const chart = new ChartBuilder<MonthPoint>()
        .withData(of(MONTHLY))
        .withCategoryField('month')
        .withHeight(400)
        .withLegend(true);

    chart.withSecondaryYAxis();

    chart.addAreaChart('revenue')
        .withLabel('Revenue (€)')
        .withColor('#6366f1');

    chart.addBarChart('orders')
        .withLabel('Orders')
        .withColor('#f59e0b')
        .asSecondaryAxis();         // plotted against the right Y axis

    return chartPanel('Dual-Axis Chart', chart);
}

/**
 * Axis Configuration
 *
 * `.withXAxis()` and `.withYAxis()` return an AxisBuilder for fine-grained control.
 * Useful when default axis labels are too dense, need formatting, or must be hidden.
 *
 * Key AxisBuilder options:
 *   `.withLabel(str)`         — axis title
 *   `.withTicks(n)`           — number of tick marks
 *   `.withFormat(fn|str)`     — custom tick label formatter
 *   `.withMin(n|'auto')`      — force a minimum value (prevents zero-baseline compression)
 *   `.withMax(n|'auto')`      — force a maximum value
 *   `.withGridLines(false)`   — hide major grid lines
 *   `.withVisible(false)`     — hide the axis entirely
 */
export function createAxisConfigExample(): PanelBuilder {
    const chart = new ChartBuilder<MonthPoint>()
        .withData(of(MONTHLY))
        .withCategoryField('month')
        .withHeight(400);

    chart.addBarChart('revenue')
        .withLabel('Revenue')
        .withColor('#10b981');

    chart.withYAxis()
        .withLabel('EUR')
        .withTicks(4)
        .withFormat((v: number) => `€${(v / 1000).toFixed(0)}k`)
        .withMin(0);

    chart.withXAxis()
        .withLabel('Month')
        .withGridLines(false);

    return chartPanel('Axis Configuration', chart);
}

/**
 * Live / Animated Chart
 *
 * Pass a `BehaviorSubject<T[]>` to `.withData()` and push new data into it
 * to update the chart reactively — no re-renders, just smooth transitions.
 *
 * `.withAnimation(true)` enables built-in data-change animation (default off).
 *
 * Cleanup: call `subject.complete()` when the component is destroyed.
 * Use `registerDestroy(element, cleanup)` to tie cleanup to DOM removal.
 */
export function createLiveChartExample(): PanelBuilder {
    const data$ = new BehaviorSubject<DayPoint[]>(DAILY);

    // Simulates a live feed refreshing every 2 seconds
    timer(0, 2000)
        .pipe(map(() =>
            DAILY.map(d => ({ ...d, users: Math.round(d.users * (0.9 + Math.random() * 0.2)) }))
        ))
        .subscribe(d => data$.next(d));

    const chart = new ChartBuilder<DayPoint>()
        .withData(data$)
        .withCategoryField('day')
        .withHeight(400)
        .withAnimation(true);

    chart.addAreaChart('users')
        .withLabel('Active Users')
        .withColor('#6366f1')
        .withCurve('smooth');

    return chartPanel('Live Chart (BehaviorSubject)', chart);
}

/**
 * Chart with Legend and Tooltip
 *
 * `.withLegend(true)` renders a colour-keyed legend below the chart.
 * `.withTooltip(true)` (default) shows a hover tooltip — pass false to disable.
 *
 * Custom tooltip: call `.withTooltip(renderer)` on individual series to control
 * the tooltip string for that series' data points.
 */
export function createChartLegendTooltipExample(): PanelBuilder {
    const chart = new ChartBuilder<MonthPoint>()
        .withData(of(MONTHLY))
        .withCategoryField('month')
        .withLegend(true)
        .withHeight(400)
        .withTooltip(true);

    chart.addLineChart('revenue')
        .withLabel('Revenue (€)')
        .withColor('#6366f1')
        .withTooltip(d => `€${d.revenue.toLocaleString()} in ${d.month}`);

    chart.addLineChart('orders')
        .withLabel('Orders')
        .withColor('#f59e0b')
        .withMarkers(true);

    return chartPanel('Legend & Tooltip', chart);
}

/**
 * Glass Chart
 *
 * `.asGlass()` applies a frosted translucent surface to the chart container.
 * Combine with a glass PanelBuilder when placing charts over image/gradient backgrounds.
 */
export function createGlassChartExample(): PanelBuilder {
    const chart = new ChartBuilder<DayPoint>()
        .withData(of(DAILY))
        .withCategoryField('day')
        .withHeight(400)
        .asGlass();

    chart.addAreaChart('users')
        .withLabel('Users')
        .withColor('#a78bfa');

    const content = new LayoutBuilder().asVertical().withGap(LayoutGap.LARGE);
    content.addSlot().withSize(SlotSize.FIT).withContent(
        new LabelBuilder().withCaption(of('Glass Chart'))
    );
    content.addSlot().withSize(SlotSize.FULL).withContent(chart);

    return new PanelBuilder()
        .asGlass()
        .withGap(PanelGap.LARGE)
        .withContent(content);
}
