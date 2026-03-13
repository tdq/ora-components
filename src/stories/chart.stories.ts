import { ChartBuilder } from '../components/chart/chart-builder';
import { of } from 'rxjs';

export default {
    title: 'Components/Chart',
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
    container.className = 'p-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 min-h-[600px] flex items-center justify-center';

    const chart = builder.build();
    chart.style.width = '100%';
    chart.style.maxWidth = '800px';
    container.appendChild(chart);

    return container;
};
