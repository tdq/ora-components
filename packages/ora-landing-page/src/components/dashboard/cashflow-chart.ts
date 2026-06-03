import { ChartBuilder, PanelBuilder, LabelBuilder, LayoutBuilder } from '@tdq/ora-components';
import { of } from 'rxjs';

export function buildCashflowChart(): HTMLElement {
    const cashflowData$ = of([
        { month: 'Jan', net: 182, inflow: 612, outflow: 430 },
        { month: 'Feb', net: 198, inflow: 645, outflow: 447 },
        { month: 'Mar', net: 221, inflow: 712, outflow: 491 },
        { month: 'Apr', net: 207, inflow: 681, outflow: 474 },
        { month: 'May', net: 244, inflow: 758, outflow: 514 },
        { month: 'Jun', net: 261, inflow: 798, outflow: 537 },
        { month: 'Jul', net: 252, inflow: 781, outflow: 529 },
        { month: 'Aug', net: 278, inflow: 832, outflow: 554 },
        { month: 'Sep', net: 294, inflow: 866, outflow: 572 },
        { month: 'Oct', net: 312, inflow: 901, outflow: 589 },
        { month: 'Nov', net: 329, inflow: 938, outflow: 609 },
        { month: 'Dec', net: 348, inflow: 977, outflow: 629 },
    ]);

    const chartPanel = new PanelBuilder().asGlass();
    const chartLayout = new LayoutBuilder().asVertical();
    chartLayout.addSlot().withContent(
        new LabelBuilder().withCaption(of('Operating Cashflow — Trailing 12 mo · €k'))
    );
    const chart = new ChartBuilder()
        .withData(cashflowData$ as any)
        .withCategoryField('month')
        .withHeight(300);
    chart.addAreaChart('inflow').withLabel('Inflow').withColor('#10B981');
    chart.addAreaChart('outflow').withLabel('Outflow').withColor('#EF4444');
    chart.addLineChart('net').withLabel('Net').withColor('#6750A4');
    chartLayout.addSlot().withContent(chart);
    chartPanel.withContent(chartLayout);

    const chartWrap = document.createElement('div');
    chartWrap.className = 'relative overflow-hidden rounded-large h-full [&>*]:h-full';
    chartWrap.appendChild(chartPanel.build());
    
    const sweep = document.createElement('div');
    sweep.className = 'absolute top-0 bottom-0 w-px pointer-events-none cursor-sweep';
    sweep.style.cssText = 'left: 0; background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--md-sys-color-primary) 60%, transparent), transparent);';
    chartWrap.appendChild(sweep);

    return chartWrap;
}
