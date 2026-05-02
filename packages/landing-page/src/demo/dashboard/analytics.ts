import { PanelBuilder, ChartBuilder, LabelBuilder, registerDestroy } from '@tdq/ora-components';
import { of, timer, Subject, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

export function createAnalytics(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex-1 overflow-y-auto p-px-24';

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 lg:grid-cols-2 gap-px-24';

    grid.appendChild(createRevenueChart());
    grid.appendChild(createUsersChart());
    grid.appendChild(createDeviceChart());
    grid.appendChild(createRegionalChart());
    grid.appendChild(createSessionChart());
    grid.appendChild(createConversionChart());

    container.appendChild(grid);

    return container;
}

function buildChartPanel(title: string): HTMLElement {
    const panel = new PanelBuilder()
        .withContent(new LabelBuilder().withCaption(of(title)))
        .build();
    panel.classList.add('min-h-[350px]', 'flex', 'flex-col');
    return panel;
}

function createRevenueChart(): HTMLElement {
    const panel = buildChartPanel('Monthly Revenue');

    // Realistic seasonal SaaS revenue pattern (Jan–Dec)
    const BASE = [18200, 15800, 22400, 28100, 24600, 31500, 29800, 33200, 36700, 34100, 38500, 42300];
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dataRelay$ = new Subject<Array<{ x: string; y: number }>>();
    const sub: Subscription = timer(0, 4000).pipe(
        map(() => MONTHS.map((x, i) => ({ x, y: BASE[i] + Math.round((Math.random() - 0.5) * 500) })))
    ).subscribe(data => dataRelay$.next(data));

    const chart = new ChartBuilder<{ x: string; y: number }>()
        .withData(dataRelay$)
        .withCategoryField('x');
    chart.addAreaChart('y').withLabel('Revenue (€)').withColor('#6750A4');

    const chartEl = chart.build();
    chartEl.classList.add('flex-1', 'min-h-0');
    panel.appendChild(chartEl);

    registerDestroy(panel, () => {
        sub.unsubscribe();
        dataRelay$.complete();
    });

    return panel;
}

function createUsersChart(): HTMLElement {
    const panel = buildChartPanel('Daily Active Users');

    const data$ = of([
        { x: 'Mon', y: 3840 },
        { x: 'Tue', y: 4210 },
        { x: 'Wed', y: 4580 },
        { x: 'Thu', y: 5120 },
        { x: 'Fri', y: 4890 },
        { x: 'Sat', y: 2760 },
        { x: 'Sun', y: 2190 },
    ]);

    const chart = new ChartBuilder<{ x: string; y: number }>()
        .withData(data$)
        .withCategoryField('x');
    chart.addBarChart('y').withLabel('Users').withColor('#0EA5E9');

    const chartEl = chart.build();
    chartEl.classList.add('flex-1', 'min-h-0');
    panel.appendChild(chartEl);

    return panel;
}

function createDeviceChart(): HTMLElement {
    const panel = buildChartPanel('Traffic by Device');

    const data$ = of([
        { x: 'Desktop', y: 52 },
        { x: 'Mobile',  y: 33 },
        { x: 'Tablet',  y: 11 },
        { x: 'Other',   y:  4 },
    ]);

    const chart = new ChartBuilder<{ x: string; y: number }>()
        .withData(data$)
        .withCategoryField('x');
    chart.addBarChart('y').withLabel('Share (%)').withColor('#10B981');

    const chartEl = chart.build();
    chartEl.classList.add('flex-1', 'min-h-0');
    panel.appendChild(chartEl);

    return panel;
}

function createRegionalChart(): HTMLElement {
    const panel = buildChartPanel('Revenue by Region');

    const data$ = of([
        { x: 'North America', y: 98400 },
        { x: 'Europe',        y: 71200 },
        { x: 'Asia Pacific',  y: 52800 },
        { x: 'Latin America', y: 18600 },
        { x: 'Middle East',   y:  7600 },
    ]);

    const chart = new ChartBuilder<{ x: string; y: number }>()
        .withData(data$)
        .withCategoryField('x');
    chart.addBarChart('y').withLabel('Revenue (€)').withColor('#F59E0B');

    const chartEl = chart.build();
    chartEl.classList.add('flex-1', 'min-h-0');
    panel.appendChild(chartEl);

    return panel;
}

function createSessionChart(): HTMLElement {
    const panel = buildChartPanel('Avg Session Duration (min)');

    const data$ = of([
        { x: 'Mon', y: 6.8 },
        { x: 'Tue', y: 7.4 },
        { x: 'Wed', y: 7.1 },
        { x: 'Thu', y: 8.2 },
        { x: 'Fri', y: 9.0 },
        { x: 'Sat', y: 11.3 },
        { x: 'Sun', y: 9.6 },
    ]);

    const chart = new ChartBuilder<{ x: string; y: number }>()
        .withData(data$)
        .withCategoryField('x');
    chart.addLineChart('y').withLabel('Minutes').withColor('#EC4899');

    const chartEl = chart.build();
    chartEl.classList.add('flex-1', 'min-h-0');
    panel.appendChild(chartEl);

    return panel;
}

function createConversionChart(): HTMLElement {
    const panel = buildChartPanel('Conversion Funnel');

    const data$ = of([
        { x: 'Visits',    y: 48200 },
        { x: 'Sign-ups',  y: 12400 },
        { x: 'Trials',    y:  4100 },
        { x: 'Paid',      y:  1980 },
    ]);

    const chart = new ChartBuilder<{ x: string; y: number }>()
        .withData(data$)
        .withCategoryField('x');
    chart.addBarChart('y').withLabel('Users').withColor('#8B5CF6');

    const chartEl = chart.build();
    chartEl.classList.add('flex-1', 'min-h-0');
    panel.appendChild(chartEl);

    return panel;
}
