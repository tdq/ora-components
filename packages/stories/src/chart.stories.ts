import { ChartBuilder, ButtonBuilder, LabelBuilder } from '@tdq/ora-components';
import { of, BehaviorSubject } from 'rxjs';
import { createButton, createControlStrip } from './story-helpers';

export default {
    title: 'Components/Chart',
    tags: ['stable', 'glass', 'reactive'],
};

interface DataItem {
    month: string;
    sales: number;
    profit: number;
    orders: number;
}

const data: DataItem[] = [
    { month: 'Jan', sales: 4000, profit: 2400, orders: 400 },
    { month: 'Feb', sales: 3000, profit: 1398, orders: 300 },
    { month: 'Mar', sales: 2000, profit: 9800, orders: 200 },
    { month: 'Apr', sales: 2780, profit: 3908, orders: 278 },
    { month: 'May', sales: 1890, profit: 4800, orders: 189 },
    { month: 'Jun', sales: 2390, profit: 3800, orders: 239 },
    { month: 'Jul', sales: 3490, profit: 4300, orders: 349 },
];

export const BasicLine = () => {
    const builder = new ChartBuilder<DataItem>()
        .withData(of(data))
        .withCategoryField('month')
        .withTitle(of('Monthly Sales Performance'))
        .withHeight(400);

    builder.addLineChart('sales')
        .withLabel('Sales')
        .withColor('var(--md-sys-color-primary)')
        .withMarkers(true);

    return builder.build();
};

export const MultipleLines = () => {
    const builder = new ChartBuilder<DataItem>()
        .withData(of(data))
        .withCategoryField('month')
        .withTitle(of('Sales vs Profit'))
        .withHeight(400);

    builder.addLineChart('sales')
        .withLabel('Sales')
        .withColor('var(--md-sys-color-primary)')
        .withMarkers(true);

    builder.addLineChart('profit')
        .withLabel('Profit')
        .withColor('var(--md-sys-color-secondary)')
        .withMarkers(true)
        .asDashed();

    return builder.build();
};

export const BarChart = () => {
    const builder = new ChartBuilder<DataItem>()
        .withData(of(data))
        .withCategoryField('month')
        .withTitle(of('Orders per Month'))
        .withHeight(400);

    builder.addBarChart('orders')
        .withLabel('Orders')
        .withColor('var(--md-sys-color-tertiary)');

    return builder.build();
};

export const AreaChart = () => {
    const builder = new ChartBuilder<DataItem>()
        .withData(of(data))
        .withCategoryField('month')
        .withTitle(of('Revenue Area'))
        .withHeight(400);

    builder.addAreaChart('sales')
        .withLabel('Revenue')
        .withColor('var(--md-sys-color-primary)')
        .withOpacity(0.2);

    return builder.build();
};

export const CombinedChart = () => {
    const builder = new ChartBuilder<DataItem>()
        .withData(of(data))
        .withCategoryField('month')
        .withTitle(of('Sales and Orders Overview'))
        .withHeight(400);

    builder.addBarChart('sales')
        .withLabel('Sales')
        .withColor('var(--md-sys-color-primary-container)');

    builder.addLineChart('orders')
        .withLabel('Orders')
        .withColor('var(--md-sys-color-error)')
        .withMarkers(true);

    return builder.build();
};

export const SecondaryAxis = () => {
    const builder = new ChartBuilder<DataItem>()
        .withData(of(data))
        .withCategoryField('month')
        .withTitle(of('Sales (Primary) vs Orders (Secondary)'))
        .withHeight(400);

    builder.addLineChart('sales')
        .withLabel('Sales Amount')
        .withColor('var(--md-sys-color-primary)');

    builder.addLineChart('orders')
        .withLabel('Order Count')
        .withColor('var(--md-sys-color-secondary)')
        .asSecondaryAxis();

    builder.withYAxis().withLabel('USD');
    builder.withSecondaryYAxis().withLabel('Units').withGridLines(false);

    return builder.build();
};

export const HighDensityPoints = () => {
    const points = 1000;
    const det = (i: number, salt: number): number => {
        const x = ((i + 1) * 9301 + salt * 49297) % 233280;
        return x / 233280;
    };
    const highDensityData = Array.from({ length: points }, (_, i) => ({
        index: i,
        value: Math.sin(i / 20) * 100 + det(i, 1) * 20 + 200,
        trend: i / 2 + det(i, 2) * 50
    }));

    const builder = new ChartBuilder<any>()
        .withData(of(highDensityData))
        .withCategoryField('index')
        .withTitle(of(`High Density Chart (${points} points)`))
        .withHeight(400);

    builder.addLineChart('value')
        .withLabel('Sine Wave + Noise')
        .withColor('var(--md-sys-color-primary)')
        .withMarkers(false);

    builder.addAreaChart('trend')
        .withLabel('Linear Trend')
        .withColor('var(--md-sys-color-secondary)')
        .withOpacity(0.2);

    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4 p-8';

    const info = document.createElement('div');
    info.className = 'text-body-medium text-on-surface-variant mb-4 max-w-2xl';
    info.innerHTML = `
        <p>This chart is displaying <strong>${points}</strong> points in the dataset.</p>
        <p class="mt-2">Based on the current implementation, the chart will automatically downsample points to maintain 
        a maximum density of <code>width / (2 * highlightDiameter)</code>. With a highlight diameter of 12px, 
        it shows 1 point per 24px of width.</p>
    `;
    
    container.appendChild(info);
    const chart = builder.build();
    chart.style.width = '100%';
    container.appendChild(chart);

    return container;
};

export const ReactiveColor = () => {
    const color$ = new BehaviorSubject<string>('var(--md-sys-color-primary)');
    
    const builder = new ChartBuilder<DataItem>()
        .withData(of(data))
        .withCategoryField('month')
        .withTitle(of('Click to Change Line Color'))
        .withHeight(400);

    builder.addLineChart('sales')
        .withLabel('Sales')
        .withColor(color$)
        .withMarkers(true);

    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4 p-8';

    const controls = document.createElement('div');
    controls.className = 'flex flex-wrap gap-2 mb-4';

    const colors = [
        { label: 'Primary', value: 'var(--md-sys-color-primary)' },
        { label: 'Secondary', value: 'var(--md-sys-color-secondary)' },
        { label: 'Tertiary', value: 'var(--md-sys-color-tertiary)' },
        { label: 'Error', value: 'var(--md-sys-color-error)' },
        { label: 'Deep Pink', value: '#e91e63' },
        { label: 'Lime Green', value: '#8bc34a' },
    ];

    colors.forEach(c => {
        const button = new ButtonBuilder()
            .withCaption(of(c.label))
            .withClick(() => {
                color$.next(c.value);
            })
            .build();
        controls.appendChild(button);
    });

    container.appendChild(controls);
    const chart = builder.build();
    chart.style.width = '100%';
    container.appendChild(chart);

    return container;
};

export const GlassEffect = () => {
    const builder = new ChartBuilder<DataItem>()
        .withData(of(data))
        .withCategoryField('month')
        .withTitle(of('Analytics with Glass Effect'))
        .withHeight(400)
        .asGlass();

    builder.addAreaChart('sales')
        .withLabel('Sales')
        .withColor('#fff')
        .withOpacity(0.4);

    builder.addLineChart('profit')
        .withLabel('Profit')
        .withColor('var(--md-sys-color-tertiary)')
        .withMarkers(true);

    const container = document.createElement('div');
    container.className = 'flex-1 p-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center';

    const chart = builder.build();
    chart.style.width = '100%';
    chart.style.maxWidth = '800px';
    container.appendChild(chart);

    return container;
};

export const Empty = () => {
    const builder = new ChartBuilder<DataItem>()
        .withData(of([]))
        .withCategoryField('month')
        .withTitle(of('Monthly Sales Performance'))
        .withHeight(400);

    builder.addLineChart('sales')
        .withLabel('Sales')
        .withColor('var(--md-sys-color-primary)');

    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4 p-8';

    const chartWrap = document.createElement('div');
    chartWrap.className = 'relative';

    const chartEl = builder.build();
    chartEl.style.width = '100%';
    chartWrap.appendChild(chartEl);

    const emptyLabel = new LabelBuilder()
        .withCaption(of('No data available'))
        .withClass(of('absolute inset-0 flex items-center justify-center text-on-surface-variant pointer-events-none'))
        .build();
    chartWrap.appendChild(emptyLabel);

    container.appendChild(chartWrap);
    return container;
};

export const Loading = () => {
    const data$ = new BehaviorSubject<DataItem[]>([]);

    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4 p-8';

    const loadingLabel = document.createElement('div');
    loadingLabel.className = 'text-center text-on-surface-variant text-body-medium py-16';
    loadingLabel.textContent = 'Loading chart data...';
    container.appendChild(loadingLabel);

    const builder = new ChartBuilder<DataItem>()
        .withData(data$)
        .withCategoryField('month')
        .withTitle(of('Monthly Sales Performance'))
        .withHeight(400);

    builder.addLineChart('sales')
        .withLabel('Sales')
        .withColor('var(--md-sys-color-primary)')
        .withMarkers(true);

    const chartEl = builder.build();
    chartEl.style.width = '100%';
    container.appendChild(chartEl);

    setTimeout(() => {
        loadingLabel.remove();
        data$.next(data);
    }, 1500);

    return container;
};

export const AxisMinFixed = () => {
    const builder = new ChartBuilder<DataItem>()
        .withData(of(data))
        .withCategoryField('month')
        .withTitle(of('Y Axis: Fixed Min (0)'))
        .withHeight(400);

    builder.addLineChart('sales')
        .withLabel('Sales')
        .withColor('var(--md-sys-color-primary)');

    builder.withYAxis().withMin(0);

    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4 p-8';

    const info = document.createElement('div');
    info.className = 'text-body-medium text-on-surface-variant mb-4 max-w-2xl';
    info.innerHTML = `
        <p><strong>withMin(0)</strong> forces the Y axis to start at 0, anchoring the baseline regardless of the data range.
        Useful for any metric where zero is a meaningful reference point (e.g. showing that sales never dropped to zero).</p>
    `;

    container.appendChild(info);
    const chart = builder.build();
    chart.style.width = '100%';
    container.appendChild(chart);

    return container;
};

export const AxisMaxFixed = () => {
    const builder = new ChartBuilder<DataItem>()
        .withData(of(data))
        .withCategoryField('month')
        .withTitle(of('Y Axis: Fixed Max (5000)'))
        .withHeight(400);

    builder.addLineChart('sales')
        .withLabel('Sales')
        .withColor('var(--md-sys-color-primary)')
        .withMarkers(true);

    builder.withYAxis().withMax(5000);

    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4 p-8';

    const info = document.createElement('div');
    info.className = 'text-body-medium text-on-surface-variant mb-4 max-w-2xl';
    info.innerHTML = `
        <p><strong>withMax(5000)</strong> sets a fixed ceiling for the Y axis, adding headroom above the data maximum.
        Useful when you want to show the data is within a known capacity or budget.</p>
    `;

    container.appendChild(info);
    const chart = builder.build();
    chart.style.width = '100%';
    container.appendChild(chart);

    return container;
};

export const AxisMinMaxRange = () => {
    const builder = new ChartBuilder<DataItem>()
        .withData(of(data))
        .withCategoryField('month')
        .withTitle(of('Y Axis: Constrained Range (2000–4500)'))
        .withHeight(400);

    builder.addLineChart('sales')
        .withLabel('Sales')
        .withColor('var(--md-sys-color-primary)')
        .withMarkers(true);

    builder.addLineChart('profit')
        .withLabel('Profit')
        .withColor('var(--md-sys-color-secondary)')
        .asDashed();

    builder.withYAxis().withMin(2000).withMax(4500);

    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4 p-8';

    const info = document.createElement('div');
    info.className = 'text-body-medium text-on-surface-variant mb-4 max-w-2xl';
    info.innerHTML = `
        <p><strong>withMin(2000) and withMax(4500)</strong> together constrain the visible domain, zooming in on the relevant range.
        Values outside the range are cropped in both directions — the March profit spike at 9800 is clipped at the top,
        and the May sales value of 1890 and February profit of 1398 are clipped at the bottom.</p>
    `;

    container.appendChild(info);
    const chart = builder.build();
    chart.style.width = '100%';
    container.appendChild(chart);

    return container;
};

export const AxisAutoVsFixed = () => {
    const builderFixed = new ChartBuilder<DataItem>()
        .withData(of(data))
        .withCategoryField('month')
        .withTitle(of('withMin(0) — Fixed baseline'))
        .withHeight(300);

    builderFixed.addLineChart('sales')
        .withLabel('Sales')
        .withColor('var(--md-sys-color-primary)')
        .withMarkers(true);

    builderFixed.withYAxis().withMin(0);

    const builderAuto = new ChartBuilder<DataItem>()
        .withData(of(data))
        .withCategoryField('month')
        .withTitle(of("withMin('auto') — Fits data range"))
        .withHeight(300);

    builderAuto.addLineChart('sales')
        .withLabel('Sales')
        .withColor('var(--md-sys-color-primary)')
        .withMarkers(true);

    builderAuto.withYAxis().withMin('auto');

    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4 p-8';

    const info = document.createElement('div');
    info.className = 'text-body-medium text-on-surface-variant mb-4 max-w-2xl';
    info.innerHTML = `
        <p>Comparing <strong>withMin(0)</strong> (fixed baseline at zero) against <strong>withMin('auto')</strong>
        (domain fitted tightly to the data range of ~1890–4000). The 'auto' value is the default behavior —
        the Y axis starts at the lowest data point, maximising the use of vertical space.</p>
    `;

    container.appendChild(info);

    const chartsRow = document.createElement('div');
    chartsRow.className = 'flex gap-4';

    const chartFixed = builderFixed.build();
    chartFixed.style.flex = '1';
    chartsRow.appendChild(chartFixed);

    const chartAuto = builderAuto.build();
    chartAuto.style.flex = '1';
    chartsRow.appendChild(chartAuto);

    container.appendChild(chartsRow);

    return container;
};

interface GapItem {
    month: string;
    sales: number | null;
    profit: any;
    orders: number | null;
}

// Deliberately messy data: null, undefined, NaN, empty string and a boolean all
// read as *gaps* rather than coercing to 0. Each series should break its line,
// skip its marker/bar, and leave the Y domain untouched by the missing points.
const gapData: GapItem[] = [
    { month: 'Jan', sales: 4000, profit: 2400, orders: 400 },
    { month: 'Feb', sales: null, profit: 1398, orders: 300 },
    { month: 'Mar', sales: 2000, profit: NaN, orders: null },
    { month: 'Apr', sales: 2780, profit: '', orders: 278 },
    { month: 'May', sales: null, profit: 4800, orders: null },
    { month: 'Jun', sales: 2390, profit: undefined, orders: 239 },
    { month: 'Jul', sales: 3490, profit: true as any, orders: 349 },
];

export const MissingValues = () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4';

    const info = document.createElement('div');
    info.className = 'text-body-medium text-on-surface-variant';
    info.innerHTML = `
        <p><strong>Gaps, not zeros.</strong> <code>null</code>, <code>undefined</code>, <code>NaN</code>,
        empty strings and non-numeric values (booleans, arrays) are treated as missing data:
        the line restarts with a fresh <code>M</code> after each gap, no marker or bar is drawn for it,
        and the Y domain is computed from the present values only. A value whose neighbours are both
        gaps is drawn as a small dot so it stays visible.</p>
    `;
    container.appendChild(info);

    const builder = new ChartBuilder<GapItem>()
        .withData(of(gapData))
        .withCategoryField('month')
        .withTitle(of('Series with missing values'))
        .withHeight(400);

    builder.addBarChart('orders')
        .withLabel('Orders (bar — gap = no bar)')
        .withColor('var(--md-sys-color-tertiary)');

    builder.addLineChart('sales')
        .withLabel('Sales (line — gap = broken line)')
        .withColor('var(--md-sys-color-primary)')
        .withMarkers(true);

    builder.addAreaChart('profit')
        .withLabel('Profit (area — gap = separate closed run)')
        .withColor('var(--md-sys-color-secondary)')
        .withOpacity(0.25);

    container.appendChild(builder.build());

    return container;
};

/**
 * SMIL `<animate begin="indefinite">` timelines are only started once the chart's `<svg>`
 * subtree is actually connected to the document (see series-renderer.ts's connected-check
 * before beginElement()) — a chart built while detached would otherwise never animate. This
 * story defers `builder.build()` and the DOM append until 1500ms after the story itself
 * mounts, simulating a chart created lazily (e.g. inside a tab panel or a dialog opened
 * later). The entry animation still plays correctly once it lands in the document.
 */

interface FormattedItem {
    month: string;
    revenue: number;
    margin: number;
    unitsSold: number;
}

// Realistic monthly SaaS revenue data: revenue in EUR, margin as a fraction (0.184 -> 18.4%).
// See the FormattedAxes JSDoc below for why unitsSold gets its own withFormat('integer').
const formattedData: FormattedItem[] = [
    { month: 'Jan', revenue: 128400, margin: 0.184, unitsSold: 3210 },
    { month: 'Feb', revenue: 119800, margin: 0.171, unitsSold: 2985 },
    { month: 'Mar', revenue: 142650, margin: 0.203, unitsSold: 3524 },
    { month: 'Apr', revenue: 136200, margin: 0.196, unitsSold: 3390 },
    { month: 'May', revenue: 151300, margin: 0.212, unitsSold: 3711 },
    { month: 'Jun', revenue: 148900, margin: 0.208, unitsSold: 3648 },
    { month: 'Jul', revenue: 163750, margin: 0.229, unitsSold: 4002 },
];

/**
 * Demonstrates `withFormat` on both y axes plus a per-series tooltip override:
 * - Primary (left) axis: `withFormat('currency:EUR')` — grouped euro ticks and tooltip.
 * - Secondary (right) axis: `withFormat('percentage')` — the margin series' fraction values
 *   (0.184) render as "18.4%".
 * - The `unitsSold` series stays on the primary axis but carries its own
 *   `withFormat('integer')`, which overrides the axis's currency format in *its own* tooltip
 *   row only — the axis ticks themselves are unaffected.
 * - `withLocale(locale$)` is wired to a `BehaviorSubject<string>` so the two toggle buttons
 *   re-format every tick and tooltip live, with no rebuild.
 */
export const FormattedAxes = () => {
    const locale$ = new BehaviorSubject<string>('en-US');

    const builder = new ChartBuilder<FormattedItem>()
        .withData(of(formattedData))
        .withCategoryField('month')
        .withTitle(of('Monthly Revenue, Margin & Units Sold'))
        .withHeight(400)
        .withLocale(locale$)
        .withCurrency('EUR');

    builder.addBarChart('revenue')
        .withLabel('Revenue')
        .withColor('var(--md-sys-color-primary)');

    builder.addLineChart('unitsSold')
        .withLabel('Units Sold')
        .withColor('var(--md-sys-color-tertiary)')
        .withMarkers(true)
        .withFormat('integer');

    builder.addLineChart('margin')
        .withLabel('Margin')
        .withColor('var(--md-sys-color-secondary)')
        .withMarkers(true)
        .asDashed()
        .asSecondaryAxis()
        .withFormat('percentage');

    builder.withYAxis().withLabel('Revenue / Units').withFormat('currency:EUR');
    builder.withSecondaryYAxis().withLabel('Margin').withFormat('percentage').withGridLines(false);

    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4 p-8';

    const controls = createControlStrip([
        createButton('en-US', () => locale$.next('en-US')).build(),
        createButton('de-DE', () => locale$.next('de-DE')).build(),
    ]);

    container.appendChild(controls);
    const chart = builder.build();
    chart.style.width = '100%';
    container.appendChild(chart);

    return container;
};

export const IsolatedPoints = () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4';

    const info = document.createElement('div');
    info.className = 'text-body-medium text-on-surface-variant';
    info.innerHTML = `
        <p><strong>Isolated points.</strong> A value surrounded by gaps produces no line segment,
        so it would be invisible. The renderer emits a small <code>r=2</code> dot for it on both
        line and area series.</p>
    `;
    container.appendChild(info);

    const sparse: any[] = [
        { month: 'Jan', sales: null },
        { month: 'Feb', sales: 3200 },
        { month: 'Mar', sales: null },
        { month: 'Apr', sales: null },
        { month: 'May', sales: 1500 },
        { month: 'Jun', sales: 1800 },
        { month: 'Jul', sales: null },
    ];

    const builder = new ChartBuilder<any>()
        .withData(of(sparse))
        .withCategoryField('month')
        .withTitle(of('Isolated points get a dot'))
        .withHeight(400);

    builder.addLineChart('sales')
        .withLabel('Sales')
        .withColor('var(--md-sys-color-primary)');

    container.appendChild(builder.build());

    return container;
};

interface BarSeriesItem {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
}

const barSeriesData: BarSeriesItem[] = [
    { month: 'Jan', revenue: 128400, expenses: 85600, profit: 42800 },
    { month: 'Feb', revenue: 119800, expenses: 81200, profit: 38600 },
    { month: 'Mar', revenue: 142650, expenses: 89450, profit: 53200 },
    { month: 'Apr', revenue: 136200, expenses: 88700, profit: 47500 },
    { month: 'May', revenue: 151300, expenses: 92700, profit: 58600 },
    { month: 'Jun', revenue: 148900, expenses: 90800, profit: 58100 },
    { month: 'Jul', revenue: 163750, expenses: 96250, profit: 67500 },
];

export const GroupedBars = () => {
    const builder = new ChartBuilder<BarSeriesItem>()
        .withData(of(barSeriesData))
        .withCategoryField('month')
        .withTitle(of('Monthly Revenue, Expenses & Profit'))
        .withHeight(400)
        .withCurrency('EUR');

    builder.addBarChart('revenue')
        .withLabel('Revenue')
        .withColor('var(--md-sys-color-primary)')
        .withBarWidth(0.25);

    builder.addBarChart('expenses')
        .withLabel('Expenses')
        .withColor('var(--md-sys-color-error)')
        .withBarWidth(0.25);

    builder.addBarChart('profit')
        .withLabel('Profit')
        .withColor('var(--md-sys-color-tertiary)')
        .withBarWidth(0.25);

    builder.withYAxis().withFormat('currency:EUR');

    return builder.build();
};

interface StackedBarItem {
    quarter: string;
    q1: number;
    q2: number;
    q3: number;
}

const stackedBarData: StackedBarItem[] = [
    { quarter: '2024 Q1', q1: 12500, q2: 8300, q3: -2100 },
    { quarter: '2024 Q2', q1: 14200, q2: 9700, q3: -1800 },
    { quarter: '2024 Q3', q1: 15800, q2: 11200, q3: -3200 },
    { quarter: '2024 Q4', q1: 18900, q2: 13500, q3: -2500 },
];

export const StackedBars = () => {
    const builder = new ChartBuilder<StackedBarItem>()
        .withData(of(stackedBarData))
        .withCategoryField('quarter')
        .withTitle(of('Stacked Revenue Components with Adjustments'))
        .withHeight(400)
        .withCurrency('EUR');

    builder.addBarChart('q1')
        .withLabel('Primary Revenue')
        .withColor('var(--md-sys-color-primary)')
        .asStacked();

    builder.addBarChart('q2')
        .withLabel('Secondary Revenue')
        .withColor('var(--md-sys-color-secondary)')
        .asStacked();

    builder.addBarChart('q3')
        .withLabel('Adjustments')
        .withColor('var(--md-sys-color-error)')
        .asStacked();

    builder.withYAxis().withFormat('currency:EUR');

    return builder.build();
};

interface MixedBarItem {
    month: string;
    revenue: number;
    productA: number;
    productB: number;
}

const mixedBarData: MixedBarItem[] = [
    { month: 'Jan', revenue: 128400, productA: 76300, productB: 52100 },
    { month: 'Feb', revenue: 119800, productA: 71200, productB: 48600 },
    { month: 'Mar', revenue: 142650, productA: 85100, productB: 57550 },
    { month: 'Apr', revenue: 136200, productA: 81300, productB: 54900 },
    { month: 'May', revenue: 151300, productA: 90300, productB: 61000 },
    { month: 'Jun', revenue: 148900, productA: 88900, productB: 60000 },
    { month: 'Jul', revenue: 163750, productA: 97600, productB: 66150 },
];

export const MixedGroupedAndStacked = () => {
    const builder = new ChartBuilder<MixedBarItem>()
        .withData(of(mixedBarData))
        .withCategoryField('month')
        .withTitle(of('Total Revenue vs Stacked Product Mix'))
        .withHeight(400)
        .withCurrency('EUR');

    builder.addBarChart('revenue')
        .withLabel('Total Revenue')
        .withColor('var(--md-sys-color-primary)')
        .withBarWidth(0.3);

    builder.addBarChart('productA')
        .withLabel('Product A')
        .withColor('var(--md-sys-color-secondary)')
        .withBarWidth(0.35)
        .asStacked();

    builder.addBarChart('productB')
        .withLabel('Product B')
        .withColor('var(--md-sys-color-tertiary)')
        .withBarWidth(0.35)
        .asStacked();

    builder.withYAxis().withFormat('currency:EUR');

    return builder.build();
};

interface SparklineItem {
    day: string;
    value: number;
}

const sparklineData: SparklineItem[] = [
    { day: 'Mon', value: 4200 },
    { day: 'Tue', value: 3800 },
    { day: 'Wed', value: 5100 },
    { day: 'Thu', value: 4600 },
    { day: 'Fri', value: 6200 },
    { day: 'Sat', value: 5800 },
    { day: 'Sun', value: 4900 },
];

export const Sparkline = () => {
    const data$ = new BehaviorSubject<SparklineItem[]>(sparklineData);

    const container = document.createElement('div');
    container.className = 'flex flex-col gap-8 p-8';

    const info = document.createElement('div');
    info.className = 'text-body-medium text-on-surface-variant';
    info.innerHTML = `
        <p><strong>Sparklines</strong> are compact inline charts (default 32px height) that show trends at a glance without axes, legend, or tooltip.
        Use them in tables, KPI cards, or inline within text. The <code>asSparkline()</code> method hides all chrome and sets a minimal height.</p>
    `;
    container.appendChild(info);

    // Default sparkline at 32px
    const sparklineDefault = new ChartBuilder<SparklineItem>()
        .withData(data$)
        .withCategoryField('day')
        .asSparkline();

    sparklineDefault.addLineChart('value')
        .withLabel('Daily Revenue')
        .withColor('var(--md-sys-color-primary)')
        .withMarkers(false);

    const defaultContainer = document.createElement('div');
    defaultContainer.className = 'flex items-center gap-4';

    const defaultLabel = document.createElement('span');
    defaultLabel.className = 'text-label-small text-on-surface-variant w-24';
    defaultLabel.textContent = 'Default (32px):';
    defaultContainer.appendChild(defaultLabel);

    const defaultChart = sparklineDefault.build();
    defaultChart.style.flex = '1';
    defaultContainer.appendChild(defaultChart);

    container.appendChild(defaultContainer);

    // Custom sparkline at 64px with area fill
    const sparklineCustom = new ChartBuilder<SparklineItem>()
        .withData(data$)
        .withCategoryField('day')
        .asSparkline()
        .withHeight(64);

    sparklineCustom.addAreaChart('value')
        .withLabel('Daily Revenue')
        .withColor('var(--md-sys-color-secondary)')
        .withOpacity(0.3);

    const customContainer = document.createElement('div');
    customContainer.className = 'flex items-center gap-4';

    const customLabel = document.createElement('span');
    customLabel.className = 'text-label-small text-on-surface-variant w-24';
    customLabel.textContent = 'Custom (64px):';
    customContainer.appendChild(customLabel);

    const customChart = sparklineCustom.build();
    customChart.style.flex = '1';
    customContainer.appendChild(customChart);

    container.appendChild(customContainer);

    // Control strip for reactive updates
    const controls = createControlStrip([
        createButton('Load New Data', () => {
            const newData: SparklineItem[] = Array.from({ length: 7 }, (_, i) => ({
                day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
                value: 3000 + Math.random() * 3000,
            }));
            data$.next(newData);
        }).build(),
    ]);
    container.appendChild(controls);

    return container;
};
