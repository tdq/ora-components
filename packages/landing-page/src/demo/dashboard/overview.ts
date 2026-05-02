import { PanelBuilder, ChartBuilder, GridBuilder, LabelBuilder, Money, LayoutBuilder, LayoutGap, SlotSize, PanelGap, ComponentBuilder } from '@tdq/ora-components';
import { KPICardBuilder } from './kpi-card';
import { of } from 'rxjs';
import { renderStatusChip } from './chip-utils';

export function createOverview(): HTMLElement {
    const container = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE)
        .withClass(of('flex-1 overflow-y-auto p-px-24'));

    container.addSlot().withContent({ build: () => createStatsGrid() });

    const mainLayout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.EXTRA_LARGE);

    mainLayout.addSlot().withContent(createSalesChart());
    mainLayout.addSlot().withContent(createTransactionsGrid());

    container.addSlot().withContent(mainLayout).withSize(SlotSize.FULL);

    return container.build();
}

function createStatsGrid(): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px-16 w-full';

    const stats = [
        { label: 'Total Revenue', value: '€248,592', trend: '+14.2%', positive: true },
        { label: 'Active Users', value: '24,891', trend: '+8.7%', positive: true },
        { label: 'Orders (Apr)', value: '2,847', trend: '-1.4%', positive: false },
        { label: 'Conversion', value: '4.1%', trend: '+0.6%', positive: true },
        { label: 'New Signups', value: '1,284', trend: '+22.3%', positive: true },
        { label: 'MRR', value: '€31,240', trend: '+9.1%', positive: true },
        { label: 'Avg Order Value', value: '€447.30', trend: '+3.8%', positive: true },
        { label: 'Churn Rate', value: '2.4%', trend: '-0.3%', positive: true },
    ];

    stats.forEach(s => {
        const card = new KPICardBuilder()
            .withLabel(of(s.label))
            .withValue(of(s.value))
            .withTrend(of(s.trend), of(s.positive))
            .build();
        grid.appendChild(card);
    });

    return grid;
}

function createSalesChart(): ComponentBuilder {
    const BASE: Array<{ x: string; y: number; orders: number }> = [
        { x: 'Jan', y: 18200, orders: 210 },
        { x: 'Feb', y: 15800, orders: 183 },
        { x: 'Mar', y: 22400, orders: 258 },
        { x: 'Apr', y: 28100, orders: 312 },
        { x: 'May', y: 24600, orders: 287 },
        { x: 'Jun', y: 31500, orders: 361 },
    ];

    const chart = new ChartBuilder<typeof BASE[0]>()
        .withData(of(BASE))
        .withCategoryField('x')
        .withLegend(true);

    chart.withSecondaryYAxis();
    chart.addAreaChart('y').withLabel('Revenue (€)').withColor('#6750A4');
    chart.addBarChart('orders').withLabel('Orders').withColor('#0EA5E9').asSecondaryAxis();

    const chartWrapper = new LayoutBuilder()
        .withClass(of('flex-1 min-h-0'));
    chartWrapper.addSlot().withContent(chart);

    const chartContent = new LayoutBuilder().asVertical();
    chartContent.addSlot().withContent(new LabelBuilder().withCaption(of('Sales Performance')));
    chartContent.addSlot().withContent(chartWrapper);

    const panel = new PanelBuilder()
        .withClass(of('min-h-[400px] flex flex-col'))
        .withGap(PanelGap.LARGE)
        .withContent(chartContent);

    return panel;
}

function createTransactionsGrid(): ComponentBuilder {
    const data$ = of([
        { customer: 'TechNova Corp', amount: { amount: 1190.00, currencyId: 'EUR' }, status: 'Completed', date: '2026-04-09' },
        { customer: 'Kevin Park', amount: { amount: 299.00, currencyId: 'EUR' }, status: 'Pending', date: '2026-04-09' },
        { customer: 'Rachel Kim', amount: { amount: 49.00, currencyId: 'EUR' }, status: 'Completed', date: '2026-04-08' },
        { customer: 'Tara Nguyen', amount: { amount: 99.00, currencyId: 'EUR' }, status: 'Completed', date: '2026-04-08' },
        { customer: 'Cascade Ventures', amount: { amount: 2490.00, currencyId: 'EUR' }, status: 'Completed', date: '2026-04-07' },
        { customer: 'Laura Chen', amount: { amount: 1190.00, currencyId: 'EUR' }, status: 'Completed', date: '2026-04-07' },
        { customer: 'Oscar Ruiz', amount: { amount: 199.00, currencyId: 'EUR' }, status: 'Completed', date: '2026-04-06' },
        { customer: 'Diana Prince', amount: { amount: 99.00, currencyId: 'EUR' }, status: 'Cancelled', date: '2026-04-04' },
    ]);

    const grid = new GridBuilder<{ customer: string; amount: Money; status: string; date: string }>()
        .withItems(data$);
    const columns = grid.withColumns();
    columns.addTextColumn('customer').withHeader('Customer').withWidth('1fr');
    columns.addMoneyColumn('amount').withHeader('Amount (€)').withWidth('110px');
    columns.addCustomColumn()
        .withHeader('Status')
        .withWidth('110px')
        .withRenderer((item) => renderStatusChip(item.status));
    columns.addTextColumn('date').withHeader('Date').withWidth('110px');

    const gridContent = new LayoutBuilder()
        .withClass(of('h-full'))
        .asVertical();
    gridContent.addSlot().withContent(new LabelBuilder().withCaption(of('Recent Transactions')));
    gridContent.addSlot().withContent(grid).withSize(SlotSize.FULL);

    const panel = new PanelBuilder()
        .withClass(of('min-h-[400px]'))
        .withGap(PanelGap.LARGE)
        .withContent(gridContent);

    return panel;
}
