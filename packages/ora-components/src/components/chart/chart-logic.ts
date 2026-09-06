import { BehaviorSubject, Observable, Subscription, combineLatest, map } from 'rxjs';
import { ChartState, IndividualChartConfig, BarChartConfig, AxisConfig, ChartScales, ValueFormat } from './types';
import { HIGHLIGHT_DIAMETER } from './constants';
import { readValue } from './value-utils';
import { resolveValueFormat, clamp } from '@/utils/number';

function defaultLocale(): string {
    return typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
}

export class ChartLogic<ITEM> {
    private _data$ = new BehaviorSubject<ITEM[]>([]);
    private _categoryField$ = new BehaviorSubject<keyof ITEM | string>('');
    private _charts$ = new BehaviorSubject<IndividualChartConfig<ITEM>[]>([]);
    private _xAxis$ = new BehaviorSubject<AxisConfig>({
        visible: true,
        // Grid lines are opt-in: call withXAxis().withGridLines(true) to draw them.
        showGridLines: false,
        showMinorGridLines: false,
        position: 'bottom',
        scaleType: 'category'
    });
    private _yAxis$ = new BehaviorSubject<AxisConfig>({
        visible: true,
        // Grid lines are opt-in: call withYAxis().withGridLines(true) to draw them.
        showGridLines: false,
        showMinorGridLines: false,
        position: 'left',
        scaleType: 'linear',
        ticks: 5
    });
    private _secondaryYAxis$ = new BehaviorSubject<AxisConfig | undefined>(undefined);
    private _title$ = new BehaviorSubject<string | undefined>(undefined);
    private _showLegend$ = new BehaviorSubject<boolean>(true);
    private _showTooltip$ = new BehaviorSubject<boolean>(true);
    private _isGlass$ = new BehaviorSubject<boolean>(false);
    private _animate$ = new BehaviorSubject<boolean>(true);
    private _height$ = new BehaviorSubject<number>(0);
    private _width$ = new BehaviorSubject<string>('100%');
    private _locale$ = new BehaviorSubject<string>(defaultLocale());
    private _currency$ = new BehaviorSubject<string>('EUR');
    private _sparkline$ = new BehaviorSubject<boolean>(false);

    private _dataSubscription?: Subscription;
    private _titleSubscription?: Subscription;
    private _localeSubscription?: Subscription;
    private _colorSubscriptions: Subscription[] = [];
    private _currencyExplicit = false;
    private _warnedDefaultCurrency = false;

    public readonly state$: Observable<ChartState<ITEM>> = combineLatest([
        this._data$,
        this._categoryField$,
        this._charts$,
        this._xAxis$,
        this._yAxis$,
        this._secondaryYAxis$,
        this._title$,
        this._showLegend$,
        this._showTooltip$,
        this._isGlass$,
        this._animate$,
        this._height$,
        this._width$,
        this._locale$,
        this._currency$,
        this._sparkline$
    ]).pipe(
        map(([data, categoryField, charts, xAxis, yAxis, secondaryYAxis, title, showLegend, showTooltip, isGlass, animate, height, width, locale, currency, isSparkline]) => ({
            data,
            categoryField,
            charts,
            xAxis,
            yAxis,
            secondaryYAxis,
            title,
            showLegend,
            showTooltip,
            isGlass,
            animate,
            height,
            width,
            locale,
            currency,
            isSparkline
        }))
    );

    setData(data$: Observable<ITEM[]>): void {
        this._dataSubscription?.unsubscribe();
        this._dataSubscription = data$.subscribe(data => this._data$.next(data));
    }

    setCategoryField(field: keyof ITEM | string): void {
        this._categoryField$.next(field);
    }

    addChart(config: IndividualChartConfig<ITEM>): void {
        const current = this._charts$.value;
        this._charts$.next([...current, config]);

        if (config.color$) {
            const sub = config.color$.subscribe(c => {
                config.color = c;
                this._charts$.next([...this._charts$.value]);
            });
            this._colorSubscriptions.push(sub);
        }
    }

    resetCharts(): void {
        this._colorSubscriptions.forEach(s => s.unsubscribe());
        this._colorSubscriptions = [];
        this._charts$.next([]);
    }

    setXAxis(config: AxisConfig): void {
        this._xAxis$.next(config);
    }

    setYAxis(config: AxisConfig): void {
        this._yAxis$.next(config);
    }

    setSecondaryYAxis(config: AxisConfig): void {
        this._secondaryYAxis$.next(config);
    }

    setTitle(title$: Observable<string>): void {
        this._titleSubscription?.unsubscribe();
        this._titleSubscription = title$.subscribe(title => this._title$.next(title));
    }

    setShowLegend(visible: boolean): void {
        this._showLegend$.next(visible);
    }

    setShowTooltip(enabled: boolean): void {
        this._showTooltip$.next(enabled);
    }

    setIsGlass(isGlass: boolean): void {
        this._isGlass$.next(isGlass);
    }

    setAnimate(enabled: boolean): void {
        this._animate$.next(enabled);
    }

    setHeight(height: number): void {
        this._height$.next(height);
    }

    setWidth(width: string): void {
        this._width$.next(width);
    }

    setLocale(locale$: Observable<string>): void {
        this._localeSubscription?.unsubscribe();
        this._localeSubscription = locale$.subscribe(locale => this._locale$.next(locale));
    }

    setCurrency(currencyId: string): void {
        this._currencyExplicit = true;
        this._currency$.next(currencyId);
    }

    setSparkline(enabled: boolean): void {
        this._sparkline$.next(enabled);
    }

    private sampleIndices(total: number, maxPoints: number): number[] {
        if (maxPoints <= 0) return [];
        if (maxPoints === 1) return [0];
        const indices: number[] = [];
        const step = (total - 1) / (maxPoints - 1);
        for (let i = 0; i < maxPoints - 1; i++) {
            indices.push(Math.round(i * step));
        }
        indices.push(total - 1); // guarantee last point is always included
        return indices;
    }

    private usesBareCurrency(format: ValueFormat | undefined): boolean {
        return format === 'currency';
    }

    /**
     * Per stacked-series cumulative baseline, indexed by display-data position. Positive and
     * negative values accumulate independently from the zero line, in series order — matching
     * `getYDomain`'s stacking. Computed once here so `SeriesRenderer` never accumulates
     * cross-series state while re-entering `renderBars` per series (see `types.ts` doc on
     * `ChartScales.barBaselines`).
     */
    private computeStackedBarBaselines(
        configs: BarChartConfig<ITEM>[],
        displayData: ITEM[]
    ): Map<IndividualChartConfig<ITEM>, number[]> {
        const result = new Map<IndividualChartConfig<ITEM>, number[]>();
        const posAcc = new Array(displayData.length).fill(0);
        const negAcc = new Array(displayData.length).fill(0);

        configs.forEach(config => {
            const field = String(config.field);
            const baselines = new Array(displayData.length).fill(0);

            displayData.forEach((d, i) => {
                const val = readValue(d, field);
                if (val === null) return;
                if (val >= 0) {
                    baselines[i] = posAcc[i];
                    posAcc[i] += val;
                } else {
                    baselines[i] = negAcc[i];
                    negAcc[i] += val;
                }
            });

            result.set(config, baselines);
        });

        return result;
    }

    private resolveFormats(state: ChartState<ITEM>): {
        formatPrimary: (value: number) => string;
        formatSecondary?: (value: number) => string;
        seriesFormats: Map<IndividualChartConfig<ITEM>, (value: number) => string>;
    } {
        if (!this._currencyExplicit && !this._warnedDefaultCurrency) {
            const bareCurrencyUsed =
                this.usesBareCurrency(state.yAxis.format as ValueFormat | undefined) ||
                this.usesBareCurrency(state.secondaryYAxis?.format as ValueFormat | undefined) ||
                state.charts.some(c => this.usesBareCurrency(c.format));
            if (bareCurrencyUsed) {
                this._warnedDefaultCurrency = true;
                console.warn("ChartBuilder: 'currency' format used without withCurrency() — defaulting to 'EUR'.");
            }
        }

        const locale = state.locale ?? defaultLocale();
        const currency = state.currency ?? 'EUR';

        const formatPrimary = resolveValueFormat(state.yAxis.format as ValueFormat | undefined, locale, currency);
        const formatSecondary = state.secondaryYAxis
            ? resolveValueFormat(state.secondaryYAxis.format as ValueFormat | undefined, locale, currency)
            : undefined;

        const seriesFormats = new Map<IndividualChartConfig<ITEM>, (value: number) => string>();
        state.charts.forEach(chart => {
            if (chart.format !== undefined) {
                seriesFormats.set(chart, resolveValueFormat(chart.format, locale, currency));
            }
        });

        return { formatPrimary, formatSecondary, seriesFormats };
    }

    public calculateScales(state: ChartState<ITEM>, viewWidth: number, viewHeight: number): ChartScales {
        const categories = state.data.map(d => String(d[state.categoryField as keyof ITEM]));

        // Downsample: max points density = width / (2 * highlightDiameter)
        const MAX_POINTS = Math.max(2, Math.floor(viewWidth / (2 * HIGHLIGHT_DIAMETER)));
        let displayData: ITEM[] = state.data;
        let displayCategories = categories;

        if (categories.length > MAX_POINTS && MAX_POINTS >= 2) {
            const indices = this.sampleIndices(categories.length, MAX_POINTS);
            displayData = indices.map(i => state.data[i]);
            displayCategories = indices.map(i => categories[i]);
        }

        // X Scale (Category) with 8px padding on each side for bars
        const N = displayCategories.length;
        const barWidth = Math.min(((viewWidth - 16) / (N || 1)) * 0.8, 32);

        // Grouped bar placement: every non-stacked bar series gets its own slot, and the
        // *entire* stacked group (if any) gets one more shared slot — so `addBarChart('a')`
        // next to two `asStacked()` series produces 2 slots, not 1 non-stacked slot overlapping
        // a "slot 0" stacked group. Grouping is intentionally computed across both y-axes
        // together (not split primary/secondary): all bar series in a category share one x
        // strip regardless of which y-axis they're scaled against, so splitting the slot count
        // per axis would let a primary-axis bar and a secondary-axis bar occupy the same x
        // range. Stacked *baselines* (the y-value each series accumulates from), by contrast,
        // are inherently axis-scoped and are computed per axis below.
        //
        // Computed here, before `xScale`, because `xScale`'s own edge padding/spacing must be
        // based on the group's actual rendered width (`barGroupWidth` below), not the single-bar
        // `barWidth` — otherwise a widened group (2+ grouped series) would render past the 8px
        // left/right padding, or past the neighboring category's group.
        const nonStackedBars: BarChartConfig<ITEM>[] = [];
        const stackedBars: BarChartConfig<ITEM>[] = [];
        const barSeriesIndex = new Map<number, number>();
        state.charts.forEach((c, idx) => {
            if (c.type !== 'bar') return;
            const barConfig = c as BarChartConfig<ITEM>;
            if (barConfig.isStacked) {
                stackedBars.push(barConfig);
            } else {
                barSeriesIndex.set(idx, nonStackedBars.length);
                nonStackedBars.push(barConfig);
            }
        });
        // The whole stacked group shares one slot, placed after the non-stacked slots.
        if (stackedBars.length > 0) {
            const stackedGroupSlotIndex = nonStackedBars.length;
            state.charts.forEach((c, idx) => {
                if (c.type === 'bar' && (c as BarChartConfig<ITEM>).isStacked) {
                    barSeriesIndex.set(idx, stackedGroupSlotIndex);
                }
            });
        }
        const groupedCount = nonStackedBars.length + (stackedBars.length > 0 ? 1 : 0) || 1;
        // Each grouped slot keeps the width a lone bar series would get (`barWidth`) instead of
        // dividing that width among the group, so adding series to a category no longer makes
        // every bar thinner — the group simply widens (`barGroupWidth = barSlot * groupedCount`).
        //
        // Clamp: the group must still fit within the space available per category, minus a
        // small fixed gap so adjacent groups never touch. When the preferred (undivided) width
        // does not fit, fall back to dividing the available space evenly among the slots — the
        // pre-fix behavior — which by construction never overlaps (`barWidth` is always smaller
        // than the per-category available space; see its `Math.min(..., 32)` cap above).
        const BAR_GROUP_GAP = 4;
        const availablePerCategory = (viewWidth - 16) / (N || 1);
        const maxGroupWidth = clamp(availablePerCategory - BAR_GROUP_GAP, 0);
        let barSlot = barWidth;
        let barGroupWidth = barSlot * groupedCount;
        if (barGroupWidth > maxGroupWidth) {
            barSlot = barWidth / groupedCount;
            barGroupWidth = barWidth;
        }

        // `barGroupWidth` (not `barWidth`) sets the edge padding/spacing so the *rendered*
        // group — which can be wider than a single bar once series are grouped — still gets
        // exactly 8px of padding on each side and never overlaps its neighbor. When there is at
        // most one slot (no bar series, or a single ungrouped one), `barGroupWidth === barWidth`
        // and this is identical to the pre-fix formula.
        let xScale;
        let xStep = 0;
        if (N > 1) {
            xStep = (viewWidth - 16 - barGroupWidth) / (N - 1);
            xScale = (index: number) => 8 + barGroupWidth / 2 + index * xStep;
        } else {
            xScale = (_: number) => viewWidth / 2;
        }

        // Y Scale (Linear)
        const getYDomain = (useSecondary: boolean) => {
            const relevantCharts = state.charts.filter(c => !!c.useSecondaryAxis === useSecondary);
            if (relevantCharts.length === 0) return [0, 100];

            let min = Infinity;
            let max = -Infinity;

            // Handle stacking for bar/area
            const stackedCharts = relevantCharts.filter(c => (c.type === 'bar' || c.type === 'area') && c.isStacked);
            const nonStackedCharts = relevantCharts.filter(c => !((c.type === 'bar' || c.type === 'area') && c.isStacked));

            state.data.forEach(item => {
                let stackPos = 0;
                let stackNeg = 0;
                let hasStackedValue = false;

                stackedCharts.forEach(c => {
                    const val = readValue(item, c.field);
                    if (val === null) return;
                    hasStackedValue = true;
                    if (val >= 0) stackPos += val;
                    else stackNeg += val;
                });

                if (hasStackedValue) {
                    min = Math.min(min, stackNeg);
                    max = Math.max(max, stackPos);
                }

                nonStackedCharts.forEach(c => {
                    const val = readValue(item, c.field);
                    if (val === null) return;
                    min = Math.min(min, val);
                    max = Math.max(max, val);
                });
            });

            // Guard against an all-gap series *before* applying axis overrides,
            // so withMin(0) alone (max still -Infinity) or withMax(500) alone
            // (min still Infinity) each get a sane default for the side the
            // user did not pin, instead of a NaN scale or a discarded override.
            if (min === Infinity) min = 0;
            if (max === -Infinity) max = 100;

            const axis = useSecondary ? state.secondaryYAxis : state.yAxis;
            if (axis?.min !== undefined && axis.min !== 'auto') min = axis.min;
            if (axis?.max !== undefined && axis.max !== 'auto') max = axis.max;

            if (min === max) {
                min -= 10;
                max += 10;
            }

            return [min, max];
        };

        const yDomain = getYDomain(false);
        const yScale = (val: number) => {
            const [min, max] = yDomain;
            return viewHeight - ((val - min) / (max - min)) * viewHeight;
        };

        let secondaryYScale = undefined;
        let secondaryYDomain: number[] | undefined = undefined;
        if (state.secondaryYAxis) {
            secondaryYDomain = getYDomain(true);
            secondaryYScale = (val: number) => {
                const [min, max] = secondaryYDomain!;
                return viewHeight - ((val - min) / (max - min)) * viewHeight;
            };
        }

        const { formatPrimary, formatSecondary, seriesFormats } = this.resolveFormats(state);

        const primaryStacked = stackedBars.filter(c => !c.useSecondaryAxis);
        const secondaryStacked = stackedBars.filter(c => c.useSecondaryAxis);
        const barBaselines = new Map<IndividualChartConfig<ITEM>, number[]>([
            ...this.computeStackedBarBaselines(primaryStacked, displayData),
            ...this.computeStackedBarBaselines(secondaryStacked, displayData)
        ]);

        return {
            xScale, yScale, yDomain, secondaryYScale, secondaryYDomain,
            categories: displayCategories, displayData, xStep, barWidth,
            barSlot, barGroupWidth, barSeriesIndex, barBaselines,
            formatPrimary, formatSecondary, seriesFormats
        };
    }

    destroy(): void {
        this._dataSubscription?.unsubscribe();
        this._titleSubscription?.unsubscribe();
        this._localeSubscription?.unsubscribe();
        this._colorSubscriptions.forEach(s => s.unsubscribe());
        this._data$.complete();
        this._categoryField$.complete();
        this._charts$.complete();
        this._xAxis$.complete();
        this._yAxis$.complete();
        this._secondaryYAxis$.complete();
        this._title$.complete();
        this._showLegend$.complete();
        this._showTooltip$.complete();
        this._isGlass$.complete();
        this._animate$.complete();
        this._height$.complete();
        this._width$.complete();
        this._locale$.complete();
        this._currency$.complete();
        this._sparkline$.complete();
    }
}
