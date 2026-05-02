import { PanelBuilder, ChartBuilder, GridBuilder, LabelBuilder, TabsBuilder, Money, registerDestroy } from '@tdq/ora-components';
import { of, timer, Subject, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { KPICardBuilder } from './kpi-card';

interface PLLineItem {
    category: string;
    amount: Money;
    share: string;
}

interface PeriodData {
    label: string;
    revenue: { total: number; items: PLLineItem[] };
    expenses: { total: number; items: PLLineItem[] };
    chartMonths: string[];
    chartRevenue: number[];
    chartExpenses: number[];
}

const PERIODS: PeriodData[] = [
    {
        label: 'This Month',
        revenue: {
            total: 25520,
            items: [
                { category: 'SaaS Subscriptions',   amount: { amount: 18340, currencyId: 'EUR' }, share: '71.9%' },
                { category: 'Professional Services', amount: { amount:  4200, currencyId: 'EUR' }, share: '16.5%' },
                { category: 'Add-ons & Upgrades',    amount: { amount:  2980, currencyId: 'EUR' }, share: '11.7%' },
            ],
        },
        expenses: {
            total: 22720,
            items: [
                { category: 'Payroll',               amount: { amount: 18400, currencyId: 'EUR' }, share: '80.9%' },
                { category: 'Office Rent',            amount: { amount:  2800, currencyId: 'EUR' }, share: '12.3%' },
                { category: 'Marketing',              amount: { amount:  1100, currencyId: 'EUR' }, share:  '4.8%' },
                { category: 'SaaS Tools',             amount: { amount:   420, currencyId: 'EUR' }, share:  '1.8%' },
            ],
        },
        chartMonths: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
        chartRevenue:  [20100, 22800, 18200, 15800, 22400, 25520],
        chartExpenses: [18900, 21200, 17400, 15200, 20100, 22720],
    },
    {
        label: 'This Quarter',
        revenue: {
            total: 62400,
            items: [
                { category: 'SaaS Subscriptions',   amount: { amount: 44800, currencyId: 'EUR' }, share: '71.8%' },
                { category: 'Professional Services', amount: { amount: 11200, currencyId: 'EUR' }, share: '17.9%' },
                { category: 'Add-ons & Upgrades',    amount: { amount:  6400, currencyId: 'EUR' }, share: '10.3%' },
            ],
        },
        expenses: {
            total: 57800,
            items: [
                { category: 'Payroll',               amount: { amount: 46800, currencyId: 'EUR' }, share: '80.9%' },
                { category: 'Office Rent',            amount: { amount:  7200, currencyId: 'EUR' }, share: '12.5%' },
                { category: 'Marketing',              amount: { amount:  2520, currencyId: 'EUR' }, share:  '4.4%' },
                { category: 'SaaS Tools',             amount: { amount:  1280, currencyId: 'EUR' }, share:  '2.2%' },
            ],
        },
        chartMonths: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
        chartRevenue:  [18800, 20100, 22800, 18200, 15800, 22400],
        chartExpenses: [17200, 18900, 21200, 17400, 15200, 20100],
    },
    {
        label: 'YTD',
        revenue: {
            total: 87920,
            items: [
                { category: 'SaaS Subscriptions',   amount: { amount: 63100, currencyId: 'EUR' }, share: '71.8%' },
                { category: 'Professional Services', amount: { amount: 15620, currencyId: 'EUR' }, share: '17.8%' },
                { category: 'Add-ons & Upgrades',    amount: { amount:  9200, currencyId: 'EUR' }, share: '10.5%' },
            ],
        },
        expenses: {
            total: 80520,
            items: [
                { category: 'Payroll',               amount: { amount: 65200, currencyId: 'EUR' }, share: '80.9%' },
                { category: 'Office Rent',            amount: { amount: 10000, currencyId: 'EUR' }, share: '12.4%' },
                { category: 'Marketing',              amount: { amount:  3520, currencyId: 'EUR' }, share:  '4.4%' },
                { category: 'SaaS Tools',             amount: { amount:  1800, currencyId: 'EUR' }, share:  '2.2%' },
            ],
        },
        chartMonths: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
        chartRevenue:  [20100, 22800, 18200, 15800, 22400, 25520],
        chartExpenses: [18900, 21200, 17400, 15200, 20100, 22720],
    },
];

function fmt(amount: number): string {
    return `€${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function createSummaryCards(period: PeriodData): HTMLElement {
    const net = period.revenue.total - period.expenses.total;
    const isProfit = net >= 0;

    const cards = [
        { label: 'Total Revenue',  value: fmt(period.revenue.total),  color: '#10B981' },
        { label: 'Total Expenses', value: fmt(period.expenses.total), color: '#EF4444' },
        { label: 'Net Income',     value: fmt(Math.abs(net)),          color: isProfit ? '#6750A4' : '#EF4444' },
    ];

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 sm:grid-cols-3 gap-px-16 mb-px-24';

    cards.forEach(s => {
        const card = new KPICardBuilder()
            .withLabel(of(s.label))
            .withValue(of(s.value))
            .withValueColor(of(s.color))
            .build();
        grid.appendChild(card);
    });

    return grid;
}

function createRevenueExpensesChart(period: PeriodData): HTMLElement {
    const panel = new PanelBuilder()
        .withContent(new LabelBuilder().withCaption(of('Revenue vs Expenses')))
        .build();
    panel.classList.add('min-h-[300px]', 'flex', 'flex-col', 'mb-px-24');

    type ChartRow = { x: string; revenue: number; expenses: number };
    const BASE: ChartRow[] = period.chartMonths.map((x, i) => ({
        x,
        revenue: period.chartRevenue[i],
        expenses: period.chartExpenses[i],
    }));

    const dataRelay$ = new Subject<ChartRow[]>();
    const sub: Subscription = timer(0, 6000).pipe(
        map(() => BASE.map(d => ({
            x: d.x,
            revenue:  Math.round(d.revenue  * (1 + (Math.random() - 0.5) * 0.04)),
            expenses: Math.round(d.expenses * (1 + (Math.random() - 0.5) * 0.04)),
        })))
    ).subscribe(data => dataRelay$.next(data));

    const chart = new ChartBuilder<ChartRow>()
        .withData(dataRelay$)
        .withCategoryField('x')
        .withLegend(true);
    chart.addAreaChart('revenue').withLabel('Revenue (€)').withColor('#10B981');
    chart.addAreaChart('expenses').withLabel('Expenses (€)').withColor('#EF4444');

    const chartEl = chart.build();
    chartEl.classList.add('flex-1', 'min-h-0');
    panel.appendChild(chartEl);

    registerDestroy(panel, () => {
        sub.unsubscribe();
        dataRelay$.complete();
    });

    return panel;
}

function createBreakdownGrid(title: string, items: PLLineItem[]): HTMLElement {
    const panel = new PanelBuilder()
        .withContent(new LabelBuilder().withCaption(of(title)))
        .build();
    panel.classList.add('flex', 'flex-col');

    const grid = new GridBuilder<PLLineItem>()
        .withItems(of(items));
    const cols = grid.withColumns();
    cols.addTextColumn('category').withHeader('Category').withWidth('1fr');
    cols.addMoneyColumn('amount').withHeader('Amount (€)').withWidth('120px');
    cols.addTextColumn('share').withHeader('Share').withWidth('80px');

    panel.appendChild(grid.build());
    return panel;
}

function buildPeriodContent(period: PeriodData): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col';

    wrapper.appendChild(createSummaryCards(period));
    wrapper.appendChild(createRevenueExpensesChart(period));

    const breakdownRow = document.createElement('div');
    breakdownRow.className = 'grid grid-cols-1 lg:grid-cols-2 gap-px-24';
    breakdownRow.appendChild(createBreakdownGrid('Revenue Breakdown', period.revenue.items));
    breakdownRow.appendChild(createBreakdownGrid('Expense Breakdown', period.expenses.items));
    wrapper.appendChild(breakdownRow);

    return wrapper;
}

export function createPL(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex-1 overflow-y-auto p-px-24';

    const tabs = new TabsBuilder();
    PERIODS.forEach(period => {
        tabs.addTab()
            .withCaption(of(period.label))
            .withContent({ build: () => buildPeriodContent(period) });
    });

    const tabsEl = tabs.build();
    tabsEl.classList.add('flex', 'flex-col');
    container.appendChild(tabsEl);

    return container;
}
