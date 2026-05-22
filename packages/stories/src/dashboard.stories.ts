import { BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    ChartBuilder,
    GridBuilder,
    SortDirection,
    PanelBuilder,
    LayoutBuilder,
    LayoutGap,
    SlotSize,
    LabelBuilder,
    ButtonStyle,
    Alignment,
} from '@tdq/ora-components';
import { createActionLog } from './story-helpers/action-log';
import { createButton } from './story-helpers/demo-controls';

export default {
    title: 'Examples/Dashboard',
    tags: ['autodocs', 'enterprise', 'reactive'],
    parameters: {
        layout: 'fullscreen',
    },
};

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

interface MonthlyRevenue {
    month: string;
    revenue: number;
}

interface CategoryRevenue {
    category: string;
    revenue: number;
}

interface TopProduct {
    product: string;
    category: string;
    revenue: number;
    growth: number;
}

interface DashboardKpis {
    revenue: { value: number; change: number };
    orders: { value: number; change: number };
    users: { value: number; change: number };
    conversion: { value: number; change: number };
}

interface DashboardData {
    kpis: DashboardKpis;
    monthlyRevenue: MonthlyRevenue[];
    categoryRevenue: CategoryRevenue[];
    topProducts: TopProduct[];
}

// ---------------------------------------------------------------------------
// Deterministic mock data — all at module scope, never re-created
// ---------------------------------------------------------------------------

const MONTHLY_REVENUE: MonthlyRevenue[] = [
    { month: 'Jan', revenue: 120000 },
    { month: 'Feb', revenue: 135000 },
    { month: 'Mar', revenue: 148000 },
    { month: 'Apr', revenue: 142000 },
    { month: 'May', revenue: 165000 },
    { month: 'Jun', revenue: 137000 },
];

const CATEGORY_REVENUE: CategoryRevenue[] = [
    { category: 'Electronics', revenue: 285000 },
    { category: 'Clothing', revenue: 192000 },
    { category: 'Home & Garden', revenue: 156000 },
    { category: 'Sports', revenue: 124000 },
    { category: 'Books', revenue: 98000 },
];

const TOP_PRODUCTS: TopProduct[] = [
    { product: 'MacBook Pro 16"', category: 'Electronics', revenue: 52400, growth: 12.4 },
    { product: 'Running Shoes Ultra', category: 'Sports', revenue: 38700, growth: 8.7 },
    { product: 'Designer Desk Lamp', category: 'Home & Garden', revenue: 31200, growth: -2.3 },
    { product: 'Cotton T-Shirt Pack', category: 'Clothing', revenue: 28900, growth: 15.1 },
    { product: 'Wireless Headphones', category: 'Electronics', revenue: 26500, growth: 22.8 },
    { product: 'Yoga Mat Premium', category: 'Sports', revenue: 23100, growth: 5.4 },
    { product: 'Leather Wallet', category: 'Clothing', revenue: 19800, growth: -1.2 },
    { product: 'Indoor Plant Set', category: 'Home & Garden', revenue: 17200, growth: 18.9 },
    { product: 'JavaScript Guide', category: 'Books', revenue: 15400, growth: 9.6 },
    { product: 'Board Game Collection', category: 'Books', revenue: 12800, growth: 3.2 },
];

const KPIS: DashboardKpis = {
    revenue: { value: 847, change: 12.5 },
    orders: { value: 2.4, change: 8.3 },
    users: { value: 18.5, change: 15.2 },
    conversion: { value: 3.2, change: -0.4 },
};

// ---------------------------------------------------------------------------
// Shared reactive data source — all derived streams feed from this
// ---------------------------------------------------------------------------

const dashboardData$ = new BehaviorSubject<DashboardData>({
    kpis: KPIS,
    monthlyRevenue: MONTHLY_REVENUE,
    categoryRevenue: CATEGORY_REVENUE,
    topProducts: TOP_PRODUCTS,
});

// Derived KPI display-value streams
const revenueValue$ = dashboardData$.pipe(map(d => `$${d.kpis.revenue.value}K`));
const ordersValue$ = dashboardData$.pipe(map(d => `${d.kpis.orders.value}K`));
const usersValue$ = dashboardData$.pipe(map(d => `${d.kpis.users.value}K`));
const conversionValue$ = dashboardData$.pipe(map(d => `${d.kpis.conversion.value}%`));

// Derived KPI change-indicator streams
const revenueChange$ = dashboardData$.pipe(map(d => `↑ ${d.kpis.revenue.change}%`));
const ordersChange$ = dashboardData$.pipe(map(d => `↑ ${d.kpis.orders.change}%`));
const usersChange$ = dashboardData$.pipe(map(d => `↑ ${d.kpis.users.change}%`));
const conversionChange$ = dashboardData$.pipe(map(d => {
    const v = Math.abs(d.kpis.conversion.change);
    return `↓ ${v}pp`;
}));

// ---------------------------------------------------------------------------
// Helper — create a single KPI card with title, reactive value, change badge
// ---------------------------------------------------------------------------

function createKpiCard(
    title: string,
    value$: any,
    change$: any,
    isUp: boolean,
): PanelBuilder {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.SMALL)
        .withClass(of('p-4'));

    const titleLabel = new LabelBuilder()
        .withCaption(of(title))
        .withClass(of('text-sm text-on-surface-variant uppercase tracking-wider font-medium'));

    const valueLabel = new LabelBuilder()
        .withCaption(value$)
        .withClass(of('text-headline-large font-bold tracking-tight'));

    const changeLabel = new LabelBuilder()
        .withCaption(change$)
        .withClass(of(
            isUp
                ? 'text-green-600 font-medium text-sm'
                : 'text-red-600 font-medium text-sm',
        ));

    layout.addSlot().withContent(titleLabel);
    layout.addSlot().withContent(valueLabel);
    layout.addSlot().withContent(changeLabel);

    return new PanelBuilder().withContent(layout);
}

// ---------------------------------------------------------------------------
// Page component — single export, plain function
// ---------------------------------------------------------------------------

export const Dashboard = () => {
    const { element: actionLog, log } = createActionLog();

    // --- Header ---
    const titleLabel = new LabelBuilder()
        .withCaption(of('Analytics Dashboard'))
        .withClass(of('text-headline-medium font-bold'));

    const dateLabel = new LabelBuilder()
        .withCaption(of('Q2 2026'))
        .withClass(of('text-sm text-on-surface-variant'));

    const exportBtn = createButton(
        'Export',
        () => log('Export report clicked'),
        ButtonStyle.OUTLINED,
    );

    const header = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.MEDIUM);

    const titleGroup = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.MEDIUM)
        .withAlignment(of(Alignment.LEFT));

    titleGroup.addSlot().withSize(SlotSize.FIT).withContent(titleLabel);
    titleGroup.addSlot().withSize(SlotSize.FIT).withContent(dateLabel);

    header.addSlot().withContent(titleGroup);

    header.addSlot()
        .withSize(SlotSize.FIT)
        .withAlignment(of(Alignment.RIGHT))
        .withContent(exportBtn);

    // --- KPI Cards Row ---
    const kpiRow = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.MEDIUM);

    const kpiCards = [
        createKpiCard('Revenue', revenueValue$, revenueChange$, true),
        createKpiCard('Orders', ordersValue$, ordersChange$, true),
        createKpiCard('Users', usersValue$, usersChange$, true),
        createKpiCard('Conversion', conversionValue$, conversionChange$, false),
    ];

    kpiCards.forEach(card => {
        kpiRow.addSlot()
            .withSize(SlotSize.QUARTER)
            .withContent(card);
    });

    // --- Area Chart: Revenue over Time (6 months) ---
    const areaChart = new ChartBuilder<MonthlyRevenue>()
        .withData(dashboardData$.pipe(map(d => d.monthlyRevenue)))
        .withCategoryField('month')
        .withTitle(of('Revenue over Time'))
        .withHeight(280)
        .asGlass()
        .withLegend(true)
        .withTooltip(true);

    areaChart.addAreaChart('revenue')
        .withLabel('Revenue')
        .withColor('var(--md-sys-color-primary)')
        .withOpacity(0.25);

    // --- Bar Chart: Revenue by Category ---
    const barChart = new ChartBuilder<CategoryRevenue>()
        .withData(dashboardData$.pipe(map(d => d.categoryRevenue)))
        .withCategoryField('category')
        .withTitle(of('Revenue by Category'))
        .withHeight(300)
        .withLegend(false)
        .withTooltip(true);

    barChart.addBarChart('revenue')
        .withLabel('Revenue')
        .withColor('var(--md-sys-color-secondary)');

    // --- Grid: Top 10 Products ---
    const grid = new GridBuilder<TopProduct>()
        .withItems(dashboardData$.pipe(map(d => d.topProducts)))
        .withHeight(of(300))
        .withSort('revenue', SortDirection.DESC);

    const columns = grid.withColumns();
    columns.addTextColumn('product').withHeader('Product');
    columns.addTextColumn('category').withHeader('Category');
    columns.addNumberColumn('revenue').withHeader('Revenue');
    columns.addNumberColumn('growth').withHeader('Growth');

    // --- Bottom Split: Bar Chart + Grid ---
    const bottomSplit = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.MEDIUM);

    bottomSplit.addSlot()
        .withSize(SlotSize.HALF)
        .withContent(barChart);

    bottomSplit.addSlot()
        .withSize(SlotSize.HALF)
        .withContent(grid);

    // --- Page-level Layout (full-screen vertical stack) ---
    const pageLayout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE)
        .withClass(of('w-full bg-surface p-6 overflow-auto'));

    pageLayout.addSlot().withContent(header);
    pageLayout.addSlot().withContent(kpiRow);
    pageLayout.addSlot().withContent(areaChart);
    pageLayout.addSlot().withContent(bottomSplit);
    pageLayout.addSlot().withContent({ build: () => actionLog });

    return pageLayout.build();
};
