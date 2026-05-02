import { PanelBuilder, ChartBuilder, GridBuilder, LabelBuilder, registerDestroy, Money } from '@tdq/ora-components';
import { KPICardBuilder } from './kpi-card';
import { of, timer, Subject, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { renderStatusChip } from './chip-utils';

export function createOverview(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex-1 overflow-y-auto p-px-24';

    container.appendChild(createStatsGrid());

    const mainGrid = document.createElement('div');
    mainGrid.className = 'grid grid-cols-1 lg:grid-cols-2 gap-px-24 mt-px-24';
    mainGrid.appendChild(createSalesChart());
    mainGrid.appendChild(createTransactionsGrid());

    container.appendChild(mainGrid);

    return container;
}

function createStatsGrid(): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px-16';

    const stats = [
        { label: 'Total Revenue',  value: '€248,592', trend: '+14.2%', positive: true,  color: '#6750A4', colorLight: 'rgba(103,80,164,0.08)' },
        { label: 'Active Users',   value: '24,891',   trend: '+8.7%',  positive: true,  color: '#625B71', colorLight: 'rgba(98,91,113,0.08)'  },
        { label: 'Orders (Apr)',   value: '2,847',    trend: '-1.4%',  positive: false, color: '#7D5260', colorLight: 'rgba(125,82,96,0.08)'  },
        { label: 'Conversion',     value: '4.1%',     trend: '+0.6%',  positive: true,  color: '#6750A4', colorLight: 'rgba(103,80,164,0.08)' },
        { label: 'New Signups',     value: '1,284',    trend: '+22.3%', positive: true,  color: '#0EA5E9', colorLight: 'rgba(14,165,233,0.08)'  },
        { label: 'MRR',             value: '€31,240',  trend: '+9.1%',  positive: true,  color: '#10B981', colorLight: 'rgba(16,185,129,0.08)'  },
        { label: 'Avg Order Value', value: '€447.30',  trend: '+3.8%',  positive: true,  color: '#F59E0B', colorLight: 'rgba(245,158,11,0.08)'  },
        { label: 'Churn Rate',      value: '2.4%',     trend: '-0.3%',  positive: true,  color: '#EC4899', colorLight: 'rgba(236,72,153,0.08)'  },
    ];

    stats.forEach(s => {
        const card = new KPICardBuilder()
            .withLabel(of(s.label))
            .withValue(of(s.value))
            .withTrend(of(s.trend), of(s.positive))
            .withAccentColor(of(s.color), of(s.colorLight))
            .build();
        grid.appendChild(card);
    });

    return grid;
}

function createSalesChart(): HTMLElement {
    const panel = new PanelBuilder()
        .withContent(new LabelBuilder().withCaption(of('Sales Performance')))
        .build();
    panel.classList.add('min-h-[400px]', 'flex', 'flex-col');

    const BASE: Array<{ x: string; y: number; orders: number }> = [
        { x: 'Jan', y: 18200, orders: 210 },
        { x: 'Feb', y: 15800, orders: 183 },
        { x: 'Mar', y: 22400, orders: 258 },
        { x: 'Apr', y: 28100, orders: 312 },
        { x: 'May', y: 24600, orders: 287 },
        { x: 'Jun', y: 31500, orders: 361 },
    ];

    const dataRelay$ = new Subject<typeof BASE>();
    const sub: Subscription = timer(0, 5000).pipe(
        map(() => BASE.map(d => ({
            x: d.x,
            y: d.y + Math.round((Math.random() - 0.5) * 800),
            orders: d.orders + Math.round((Math.random() - 0.5) * 20),
        })))
    ).subscribe(data => dataRelay$.next(data));

    const chart = new ChartBuilder<typeof BASE[0]>()
        .withData(dataRelay$)
        .withCategoryField('x')
        .withLegend(true);
    
    chart.withSecondaryYAxis();  // Configure secondary Y axis
    chart.addAreaChart('y').withLabel('Revenue (€)').withColor('#6750A4');
    chart.addBarChart('orders').withLabel('Orders').withColor('#0EA5E9').asSecondaryAxis(); // Mark as secondary

    const chartEl = chart.build();
    chartEl.classList.add('flex-1', 'min-h-0');
    panel.appendChild(chartEl);

    registerDestroy(panel, () => {
        sub.unsubscribe();
        dataRelay$.complete();
    });

    return panel;
}

function createTransactionsGrid(): HTMLElement {
    const panel = new PanelBuilder()
        .withContent(new LabelBuilder().withCaption(of('Recent Transactions')))
        .build();
    panel.classList.add('min-h-[400px]', 'flex', 'flex-col');

    const data$ = of([
        { customer: 'TechNova Corp',    amount: { amount: 1190.00, currencyId: 'EUR' }, status: 'Completed', date: '2026-04-09' },
        { customer: 'Kevin Park',        amount: { amount:  299.00, currencyId: 'EUR' }, status: 'Pending',   date: '2026-04-09' },
        { customer: 'Rachel Kim',        amount: { amount:   49.00, currencyId: 'EUR' }, status: 'Completed', date: '2026-04-08' },
        { customer: 'Tara Nguyen',       amount: { amount:   99.00, currencyId: 'EUR' }, status: 'Completed', date: '2026-04-08' },
        { customer: 'Cascade Ventures',  amount: { amount: 2490.00, currencyId: 'EUR' }, status: 'Completed', date: '2026-04-07' },
        { customer: 'Laura Chen',        amount: { amount: 1190.00, currencyId: 'EUR' }, status: 'Completed', date: '2026-04-07' },
        { customer: 'Oscar Ruiz',        amount: { amount:  199.00, currencyId: 'EUR' }, status: 'Completed', date: '2026-04-06' },
        { customer: 'Diana Prince',      amount: { amount:   99.00, currencyId: 'EUR' }, status: 'Cancelled', date: '2026-04-04' },
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

    const gridEl = grid.build();
    gridEl.classList.add('flex-1', 'min-h-0');
    panel.appendChild(gridEl);

    return panel;
}
