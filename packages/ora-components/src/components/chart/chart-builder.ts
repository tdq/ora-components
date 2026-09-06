import { Observable, of } from 'rxjs';
import { createOptimizedPipeline } from '../../utils/optimized-pipeline';
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
import { applyTestId } from '../../core/test-id';
import { DEFAULT_SPARKLINE_HEIGHT } from './constants';

export class ChartBuilder<ITEM> implements ComponentBuilder {
    private logic = new ChartLogic<ITEM>();
    private rawData$?: Observable<ITEM[]>;
    private individualBuilders: { build: () => IndividualChartConfig<ITEM> }[] = [];
    private xAxisBuilder = new AxisBuilderImpl('bottom', 'category');
    private yAxisBuilder = new AxisBuilderImpl('left', 'linear');
    private secondaryYAxisBuilder?: AxisBuilderImpl;
    private testId?: string;
    private heightExplicit = false;
    private className$?: Observable<string>;

    private readonly DEFAULT_COLORS = [
        'var(--ora-chart-series-1)',
        'var(--ora-chart-series-2)',
        'var(--ora-chart-series-3)',
        'var(--ora-chart-series-4)',
        'var(--ora-chart-series-5)',
        'var(--ora-chart-series-6)',
        'var(--ora-chart-series-7)',
        'var(--ora-chart-series-8)'
    ];

    withData(data: Observable<ITEM[]>): this {
        this.rawData$ = data;
        return this;
    }

    withCategoryField(field: keyof ITEM | string): this {
        this.logic.setCategoryField(field);
        return this;
    }

    withHeight(height: number): this {
        this.heightExplicit = true;
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

    /**
     * Locale used by `withFormat` presets on axes and series. Defaults to `navigator.language` —
     * unlike `MoneyColumn`/`MoneyKPICard`, which default to `'en-US'` — since a chart has no
     * money-specific reason to force an American default; pass an explicit locale to match them.
     */
    withLocale(locale: string | Observable<string>): this {
        this.logic.setLocale(typeof locale === 'string' ? of(locale) : locale);
        return this;
    }

    /** Currency id used by the bare `'currency'` preset. Defaults to `'EUR'`. */
    withCurrency(currencyId: string): this {
        this.logic.setCurrency(currencyId);
        return this;
    }

    /** Sets `data-testid` on the rendered host element. */
    withTestId(id: string): this {
        this.testId = id;
        return this;
    }

    /**
     * Apply custom class names to the host element, merged via `cn()` with base classes.
     * Base classes and runtime state classes (such as loading state) survive every emission.
     *
     * @param className$ Observable of space-separated class names
     */
    withClass(className: Observable<string>): this {
        this.className$ = className;
        return this;
    }

    /**
     * Compact inline mode: hides axes, legend and tooltip, sets padding to 0, and defaults the
     * height to 32px (unless `withHeight` was already called, in which case that value wins
     * regardless of call order).
     */
    asSparkline(): this {
        this.logic.setSparkline(true);
        this.xAxisBuilder.withVisible(false);
        this.yAxisBuilder.withVisible(false);
        this.logic.setShowLegend(false);
        this.logic.setShowTooltip(false);
        if (!this.heightExplicit) {
            this.logic.setHeight(DEFAULT_SPARKLINE_HEIGHT);
        }
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

        const viewport = new ChartViewport<ITEM>(this.logic, this.className$);
        const element = viewport.getElement();

        if (this.rawData$) {
            const optimized$ = createOptimizedPipeline(element, this.rawData$);
            this.logic.setData(optimized$);
        }

        applyTestId(element, this.testId);

        return element;
    }
}
