import { ChartBuilder, ButtonBuilder, LabelBuilder } from '@tdq/ora-components';
import { of, BehaviorSubject } from 'rxjs';

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
