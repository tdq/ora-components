import { GridBuilder, TabsBuilder, PanelBuilder, ChartBuilder, LabelBuilder, Money } from '@tdq/ora-components';
import { of } from 'rxjs';
import { renderStatusChip } from './chip-utils';

interface Order {
    id: string;
    customer: string;
    product: string;
    date: string;
    total: Money;
    status: string;
}

const ALL_ORDERS: Order[] = [
    { id: '#ORD-020', customer: 'Alice Johnson',   product: 'Pro Plan — Annual',      date: '2026-04-09', total: { amount: 1190.00, currencyId: 'EUR' }, status: 'Processing' },
    { id: '#ORD-019', customer: 'Kevin Park',       product: 'Enterprise Add-on',      date: '2026-04-09', total: { amount:  299.00, currencyId: 'EUR' }, status: 'Processing' },
    { id: '#ORD-018', customer: 'Rachel Kim',       product: 'Starter Plan — Monthly', date: '2026-04-08', total: { amount:   49.00, currencyId: 'EUR' }, status: 'Shipped'    },
    { id: '#ORD-017', customer: 'Tara Nguyen',      product: 'Pro Plan — Monthly',     date: '2026-04-08', total: { amount:   99.00, currencyId: 'EUR' }, status: 'Shipped'    },
    { id: '#ORD-016', customer: 'George Miller',    product: 'Data Export Module',     date: '2026-04-07', total: { amount:  149.00, currencyId: 'EUR' }, status: 'Delivered'  },
    { id: '#ORD-015', customer: 'Laura Chen',       product: 'Pro Plan — Annual',      date: '2026-04-07', total: { amount: 1190.00, currencyId: 'EUR' }, status: 'Delivered'  },
    { id: '#ORD-014', customer: 'Marcus Lee',       product: 'Starter Plan — Monthly', date: '2026-04-06', total: { amount:   49.00, currencyId: 'EUR' }, status: 'Delivered'  },
    { id: '#ORD-013', customer: 'Oscar Ruiz',       product: 'API Access Pack',        date: '2026-04-06', total: { amount:  199.00, currencyId: 'EUR' }, status: 'Delivered'  },
    { id: '#ORD-012', customer: 'Hannah Abbott',    product: 'Pro Plan — Annual',      date: '2026-04-05', total: { amount: 1190.00, currencyId: 'EUR' }, status: 'Delivered'  },
    { id: '#ORD-011', customer: 'Priya Sharma',     product: 'Data Export Module',     date: '2026-04-05', total: { amount:  149.00, currencyId: 'EUR' }, status: 'Delivered'  },
    { id: '#ORD-010', customer: 'Ethan Hunt',       product: 'Enterprise Plan',        date: '2026-04-04', total: { amount: 2490.00, currencyId: 'EUR' }, status: 'Delivered'  },
    { id: '#ORD-009', customer: 'Diana Prince',     product: 'Pro Plan — Monthly',     date: '2026-04-04', total: { amount:   99.00, currencyId: 'EUR' }, status: 'Cancelled'  },
    { id: '#ORD-008', customer: 'Charlie Brown',    product: 'API Access Pack',        date: '2026-04-03', total: { amount:  199.00, currencyId: 'EUR' }, status: 'Delivered'  },
    { id: '#ORD-007', customer: 'Julia Roberts',    product: 'Starter Plan — Annual',  date: '2026-04-03', total: { amount:  490.00, currencyId: 'EUR' }, status: 'Delivered'  },
    { id: '#ORD-006', customer: 'Ian Wright',       product: 'Pro Plan — Monthly',     date: '2026-04-02', total: { amount:   99.00, currencyId: 'EUR' }, status: 'Cancelled'  },
    { id: '#ORD-005', customer: 'Fiona Gallagher',  product: 'Starter Plan — Monthly', date: '2026-04-02', total: { amount:   49.00, currencyId: 'EUR' }, status: 'Delivered'  },
    { id: '#ORD-004', customer: 'Bob Smith',        product: 'Data Export Module',     date: '2026-04-01', total: { amount:  149.00, currencyId: 'EUR' }, status: 'Delivered'  },
    { id: '#ORD-003', customer: 'Quinn Foster',     product: 'Starter Plan — Monthly', date: '2026-04-01', total: { amount:   49.00, currencyId: 'EUR' }, status: 'Delivered'  },
    { id: '#ORD-002', customer: 'Samuel Torres',    product: 'Pro Plan — Annual',      date: '2026-03-31', total: { amount: 1190.00, currencyId: 'EUR' }, status: 'Delivered'  },
    { id: '#ORD-001', customer: 'Nina Patel',       product: 'Enterprise Add-on',      date: '2026-03-31', total: { amount:  299.00, currencyId: 'EUR' }, status: 'Cancelled'  },
    { id: '#ORD-021', customer: 'Alex Turner',      product: 'Pro Plan — Annual',      date: '2026-03-30', total: { amount: 1190.00, currencyId: 'EUR' }, status: 'Delivered'  },
    { id: '#ORD-022', customer: 'Maya Rodriguez',   product: 'Starter Plan — Monthly', date: '2026-03-30', total: { amount:   49.00, currencyId: 'EUR' }, status: 'Delivered'  },
    { id: '#ORD-023', customer: 'James Wilson',     product: 'API Access Pack',        date: '2026-03-29', total: { amount:  199.00, currencyId: 'EUR' }, status: 'Shipped'    },
    { id: '#ORD-024', customer: 'Sophie Lee',       product: 'Pro Plan — Monthly',     date: '2026-03-29', total: { amount:   99.00, currencyId: 'EUR' }, status: 'Processing'},
    { id: '#ORD-025', customer: 'David Chen',       product: 'Enterprise Plan',        date: '2026-03-28', total: { amount: 2490.00, currencyId: 'EUR' }, status: 'Delivered'  },
    { id: '#ORD-026', customer: 'Emma Johnson',     product: 'Data Export Module',     date: '2026-03-28', total: { amount:  149.00, currencyId: 'EUR' }, status: 'Cancelled'  },
    { id: '#ORD-027', customer: 'Ryan Kim',         product: 'Starter Plan — Annual',  date: '2026-03-27', total: { amount:  490.00, currencyId: 'EUR' }, status: 'Delivered'  },
    { id: '#ORD-028', customer: 'Lisa Wang',        product: 'Pro Plan — Monthly',     date: '2026-03-27', total: { amount:   99.00, currencyId: 'EUR' }, status: 'Processing'},
    { id: '#ORD-029', customer: 'Tom Harris',       product: 'API Access Pack',        date: '2026-03-26', total: { amount:  199.00, currencyId: 'EUR' }, status: 'Shipped'    },
    { id: '#ORD-030', customer: 'Olivia Martinez',  product: 'Enterprise Add-on',      date: '2026-03-26', total: { amount:  299.00, currencyId: 'EUR' }, status: 'Delivered'  },
];

function buildOrdersGrid(orders: Order[]): GridBuilder<Order> {
    // Set fixed height for the orders grid (400px)
    const grid = new GridBuilder<Order>().withItems(of(orders)).withHeight(of(400));
    const columns = grid.withColumns();
    columns.addTextColumn('id').withHeader('Order ID').withWidth('110px');
    columns.addTextColumn('customer').withHeader('Customer').withWidth('160px');
    columns.addTextColumn('product').withHeader('Product').withWidth('1fr');
    columns.addTextColumn('date').withHeader('Date').withWidth('120px');
    columns.addMoneyColumn('total').withHeader('Total (€)').withWidth('100px');
    columns.addCustomColumn()
        .withHeader('Status')
        .withWidth('110px')
        .withRenderer((item) => renderStatusChip(item.status));
    return grid;
}

function createSummaryStats(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px-16 mb-px-24';

    const totalRevenue = ALL_ORDERS.reduce((sum, o) => sum + o.total.amount, 0);
    const processing = ALL_ORDERS.filter(o => o.status === 'Processing').length;
    const avgOrderValue = totalRevenue / ALL_ORDERS.length;

    const stats = [
        { label: 'Total Orders',      value: String(ALL_ORDERS.length) },
        { label: 'Total Revenue',     value: `€${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'Avg Order Value',   value: `€${avgOrderValue.toFixed(2)}` },
        { label: 'Processing',        value: String(processing) },
    ];

    for (const stat of stats) {
        const card = document.createElement('div');
        card.className = 'p-px-16 rounded-extra-large border';
        card.style.cssText = 'background: var(--md-sys-color-surface); border-color: rgba(121,116,126,0.1);';

        const label = document.createElement('span');
        label.className = 'text-label-medium text-on-surface-variant';
        label.style.cssText = 'display: block; opacity: 0.6; margin-bottom: 8px;';
        label.textContent = stat.label;

        const value = document.createElement('span');
        value.className = 'text-headline-medium text-on-surface font-bold';
        value.style.cssText = 'display: block; letter-spacing: -0.02em;';
        value.textContent = stat.value;

        card.appendChild(label);
        card.appendChild(value);
        wrapper.appendChild(card);
    }

    return wrapper;
}

function createOrdersCharts(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'grid grid-cols-1 lg:grid-cols-2 gap-px-24 mb-px-24';

    // Chart 1 — Revenue by Day
    const revenueByDate = ALL_ORDERS.reduce<Record<string, number>>((acc, o) => {
        acc[o.date] = (acc[o.date] ?? 0) + o.total.amount;
        return acc;
    }, {});
    const revenueData = Object.entries(revenueByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-10)
        .map(([x, y]) => ({ x, y }));

    const revenuePanel = new PanelBuilder()
        .withContent(new LabelBuilder().withCaption(of('Revenue by Day')))
        .build();
    revenuePanel.classList.add('min-h-[280px]', 'flex', 'flex-col');

    const revenueChart = new ChartBuilder<{ x: string; y: number }>()
        .withData(of(revenueData))
        .withCategoryField('x');
    revenueChart.addBarChart('y').withLabel('Revenue (€)').withColor('#6750A4');

    const revenueChartEl = revenueChart.build();
    revenueChartEl.classList.add('flex-1', 'min-h-0');
    revenuePanel.appendChild(revenueChartEl);

    // Chart 2 — Orders by Status
    const statusCounts = ['Processing', 'Shipped', 'Delivered', 'Cancelled'].map(status => ({
        x: status,
        y: ALL_ORDERS.filter(o => o.status === status).length,
    }));

    const statusPanel = new PanelBuilder()
        .withContent(new LabelBuilder().withCaption(of('Orders by Status')))
        .build();
    statusPanel.classList.add('min-h-[280px]', 'flex', 'flex-col');

    const statusChart = new ChartBuilder<{ x: string; y: number }>()
        .withData(of(statusCounts))
        .withCategoryField('x');
    statusChart.addBarChart('y').withLabel('Orders').withColor('#0EA5E9');

    const statusChartEl = statusChart.build();
    statusChartEl.classList.add('flex-1', 'min-h-0');
    statusPanel.appendChild(statusChartEl);

    wrapper.appendChild(revenuePanel);
    wrapper.appendChild(statusPanel);

    return wrapper;
}

export function createOrders(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex-1 overflow-y-auto p-px-24';

    container.appendChild(createSummaryStats());
    container.appendChild(createOrdersCharts());

    const tabs = new TabsBuilder();

    tabs.addTab()
        .withCaption(of('All'))
        .withContent(buildOrdersGrid(ALL_ORDERS));

    tabs.addTab()
        .withCaption(of('Processing'))
        .withContent(buildOrdersGrid(ALL_ORDERS.filter(o => o.status === 'Processing')));

    tabs.addTab()
        .withCaption(of('Shipped'))
        .withContent(buildOrdersGrid(ALL_ORDERS.filter(o => o.status === 'Shipped')));

    tabs.addTab()
        .withCaption(of('Delivered'))
        .withContent(buildOrdersGrid(ALL_ORDERS.filter(o => o.status === 'Delivered')));

    container.appendChild(tabs.build());

    return container;
}
