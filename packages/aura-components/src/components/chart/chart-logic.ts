import { BehaviorSubject, Observable, Subscription, combineLatest, map } from 'rxjs';
import { ChartState, IndividualChartConfig, AxisConfig, ChartScales } from './types';

export class ChartLogic<ITEM> {
    private _data$ = new BehaviorSubject<ITEM[]>([]);
    private _categoryField$ = new BehaviorSubject<keyof ITEM | string>('');
    private _charts$ = new BehaviorSubject<IndividualChartConfig<ITEM>[]>([]);
    private _xAxis$ = new BehaviorSubject<AxisConfig>({
        visible: true,
        showGridLines: true,
        showMinorGridLines: false,
        position: 'bottom',
        scaleType: 'category'
    });
    private _yAxis$ = new BehaviorSubject<AxisConfig>({
        visible: true,
        showGridLines: true,
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

    private _dataSubscription?: Subscription;
    private _titleSubscription?: Subscription;

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
        this._width$
    ]).pipe(
        map(([data, categoryField, charts, xAxis, yAxis, secondaryYAxis, title, showLegend, showTooltip, isGlass, animate, height, width]) => ({
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
            width
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
    }

    resetCharts(): void {
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

    public calculateScales(state: ChartState<ITEM>, viewWidth: number, viewHeight: number): ChartScales {
        const categories = state.data.map(d => String(d[state.categoryField as keyof ITEM]));

        // Downsample: never render more points than there are pixels on the X axis
        const MAX_POINTS = Math.max(2, Math.floor(viewWidth));
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

        let xScale;
        let xStep = 0;
        if (N > 1) {
            xStep = (viewWidth - 16 - barWidth) / (N - 1);
            xScale = (index: number) => 8 + barWidth / 2 + index * xStep;
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

                stackedCharts.forEach(c => {
                    const val = Number(item[c.field as keyof ITEM]) || 0;
                    if (val >= 0) stackPos += val;
                    else stackNeg += val;
                });

                if (stackedCharts.length > 0) {
                    min = Math.min(min, stackNeg);
                    max = Math.max(max, stackPos);
                }

                nonStackedCharts.forEach(c => {
                    const val = Number(item[c.field as keyof ITEM]) || 0;
                    min = Math.min(min, val);
                    max = Math.max(max, val);
                });
            });

            const axis = useSecondary ? state.secondaryYAxis : state.yAxis;
            if (axis?.min !== undefined && axis.min !== 'auto') min = axis.min;
            if (axis?.max !== undefined && axis.max !== 'auto') max = axis.max;

            // Padding
            if (min === max) {
                min -= 10;
                max += 10;
            } else {
                const range = max - min;
                max += range * 0.1;
                if (min > 0) min = 0; // Usually start at 0 for charts unless negative values exist
                else min -= range * 0.1;
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

        return { xScale, yScale, yDomain, secondaryYScale, secondaryYDomain, categories: displayCategories, displayData, xStep, barWidth };
    }

    destroy(): void {
        this._dataSubscription?.unsubscribe();
        this._titleSubscription?.unsubscribe();
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
    }
}
