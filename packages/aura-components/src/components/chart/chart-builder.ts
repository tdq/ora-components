import { Observable } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { 
    AreaChartBuilder, 
    AxisBuilder, 
    BarChartBuilder, 
    IndividualChartConfig, 
    LineChartBuilder, 
} from './types';
import { AxisBuilderImpl } from './builders/axis-builder';
import { AreaChartBuilderImpl, BarChartBuilderImpl, LineChartBuilderImpl } from './builders/chart-type-builders';
import { ChartLogic } from './chart-logic';
import { ChartViewport } from './chart-viewport';

export class ChartBuilder<ITEM> implements ComponentBuilder {
    private logic = new ChartLogic<ITEM>();
    private individualBuilders: { build: () => IndividualChartConfig<ITEM> }[] = [];
    private xAxisBuilder = new AxisBuilderImpl('bottom', 'category');
    private yAxisBuilder = new AxisBuilderImpl('left', 'linear');
    private secondaryYAxisBuilder?: AxisBuilderImpl;

    private readonly DEFAULT_COLORS = [
        'var(--md-sys-color-primary)',
        'var(--md-sys-color-secondary)',
        'var(--md-sys-color-tertiary)',
        'var(--md-sys-color-error)',
        '#6750A4',
        '#625B71',
        '#7D5260',
        '#B3261E'
    ];

    withData(data: Observable<ITEM[]>): this {
        this.logic.setData(data);
        return this;
    }

    withCategoryField(field: keyof ITEM | string): this {
        this.logic.setCategoryField(field);
        return this;
    }

    withHeight(height: number): this {
        this.logic.setHeight(height);
        return this;
    }

    withWidth(width: string): this {
        this.logic.setWidth(width);
        return this;
    }

    addLineChart(field: keyof ITEM | string): LineChartBuilder<ITEM> {
        const builder = new LineChartBuilderImpl<ITEM>(field);
        this.individualBuilders.push(builder);
        return builder;
    }

    addBarChart(field: keyof ITEM | string): BarChartBuilder<ITEM> {
        const builder = new BarChartBuilderImpl<ITEM>(field);
        this.individualBuilders.push(builder);
        return builder;
    }

    addAreaChart(field: keyof ITEM | string): AreaChartBuilder<ITEM> {
        const builder = new AreaChartBuilderImpl<ITEM>(field);
        this.individualBuilders.push(builder);
        return builder;
    }

    withXAxis(): AxisBuilder {
        return this.xAxisBuilder;
    }

    withYAxis(): AxisBuilder {
        return this.yAxisBuilder;
    }

    withSecondaryYAxis(): AxisBuilder {
        if (!this.secondaryYAxisBuilder) {
            this.secondaryYAxisBuilder = new AxisBuilderImpl('right', 'linear');
        }
        return this.secondaryYAxisBuilder;
    }

    withTitle(title: Observable<string>): this {
        this.logic.setTitle(title);
        return this;
    }

    withLegend(visible: boolean): this {
        this.logic.setShowLegend(visible);
        return this;
    }

    withTooltip(enabled: boolean): this {
        this.logic.setShowTooltip(enabled);
        return this;
    }

    asGlass(): this {
        this.logic.setIsGlass(true);
        return this;
    }

    withAnimation(enabled: boolean = true): this {
        this.logic.setAnimate(enabled);
        return this;
    }

    build(): HTMLElement {
        // Finalize configurations
        this.logic.resetCharts();
        this.logic.setXAxis(this.xAxisBuilder.build());
        this.logic.setYAxis(this.yAxisBuilder.build());
        if (this.secondaryYAxisBuilder) {
            this.logic.setSecondaryYAxis(this.secondaryYAxisBuilder.build());
        }
        this.individualBuilders.forEach((b, i) => {
            const config = b.build();
            if (!config.color) {
                config.color = this.DEFAULT_COLORS[i % this.DEFAULT_COLORS.length];
            }
            this.logic.addChart(config);
        });

        const viewport = new ChartViewport<ITEM>(this.logic);
        return viewport.getElement();
    }
}
