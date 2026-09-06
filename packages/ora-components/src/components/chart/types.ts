import { Observable } from 'rxjs';
import { ValueFormat, ValueFormatPreset } from '../../utils/number';

export type { ValueFormat, ValueFormatPreset };

export type ChartType = 'line' | 'bar' | 'area';
export type CurveType = 'smooth' | 'step' | 'linear';
export type ScaleType = 'linear' | 'log' | 'time' | 'category';
export type AxisPosition = 'left' | 'right' | 'top' | 'bottom';

export interface BaseChartConfig<ITEM> {
    field: keyof ITEM | string;
    label: string;
    color?: string;
    color$?: Observable<string>;
    tooltipRenderer?: (item: ITEM) => string;
    useSecondaryAxis?: boolean;
    /** Per-series tooltip value format; overrides the bound axis's `withFormat`. Ticks are unaffected. */
    format?: ValueFormat;
}

export interface LineChartConfig<ITEM> extends BaseChartConfig<ITEM> {
    type: 'line';
    width?: number;
    curve?: CurveType;
    showMarkers?: boolean;
    isDashed?: boolean;
}

export interface BarChartConfig<ITEM> extends BaseChartConfig<ITEM> {
    type: 'bar';
    isStacked?: boolean;
    barWidth?: number;
}

export interface AreaChartConfig<ITEM> extends BaseChartConfig<ITEM> {
    type: 'area';
    curve?: CurveType;
    opacity?: number;
    isStacked?: boolean;
}

export type IndividualChartConfig<ITEM> = 
    | LineChartConfig<ITEM> 
    | BarChartConfig<ITEM> 
    | AreaChartConfig<ITEM>;

export interface AxisConfig {
    label?: string;
    visible: boolean;
    /**
     * `ValueFormat | (string & {})` — string presets (`'money'`, `'currency:EUR'`, …) autocomplete
     * while any other string stays assignable (architect: narrowing to the preset union alone
     * would be a breaking type change for existing consumers passing arbitrary strings).
     */
    format?: ValueFormat | (string & {});
    ticks?: number;
    showGridLines: boolean;
    showMinorGridLines: boolean;
    position: AxisPosition;
    min?: number | 'auto';
    max?: number | 'auto';
    scaleType: ScaleType;
}

export interface ChartState<ITEM> {
    data: ITEM[];
    categoryField: keyof ITEM | string;
    charts: IndividualChartConfig<ITEM>[];
    xAxis: AxisConfig;
    yAxis: AxisConfig;
    secondaryYAxis?: AxisConfig;
    title?: string;
    showLegend: boolean;
    showTooltip: boolean;
    isGlass: boolean;
    animate: boolean;
    height: number;
    width: string;
    /** Locale for value formatting (`withFormat` presets). Defaults to `navigator.language`. */
    locale?: string;
    /** Currency id used by the bare `'currency'` preset. Defaults to `'EUR'`. */
    currency?: string;
    /** Sparkline mode: axes, legend and tooltip are forced off and chart padding is 0. */
    isSparkline: boolean;
}

export interface ChartScales {
    xScale: (index: number) => number;
    yScale: (val: number) => number;
    yDomain: number[];
    secondaryYScale?: (val: number) => number;
    secondaryYDomain?: number[];
    categories: string[];
    displayData: any[];
    xStep?: number;
    /** Width of one category's bar group (kept for tooltip hit-testing compatibility). */
    barWidth?: number;
    /** Width of a single series' bar inside its category group. */
    barSlot?: number;
    /**
     * Total rendered width of the bar group (`barSlot * groupedCount`) — the group's actual
     * on-screen span. Preferably equal to `groupedCount * barWidth` (every slot keeps the width
     * a lone bar series would get) but clamped down — falling back to dividing `barWidth` evenly
     * among the slots, as before this field existed — when that would overlap the neighboring
     * category's group.
     *
     * Drives both `SeriesRenderer.renderBars`'s group centering *and* `xScale`/`xStep`'s edge
     * padding and spacing (in place of `barWidth`) — the rendered group can be wider than a
     * single bar once series are grouped, and the 8px edge padding plus non-overlap between
     * categories must be measured against that real width, not the single-bar one.
     * `barWidth` keeps its original meaning (the width a lone bar series would get) and is
     * unaffected. `ChartTooltip`'s hit-testing formula mirrors `xScale`, so it reads
     * `barGroupWidth` (falling back to `barWidth`) too.
     */
    barGroupWidth?: number;
    /**
     * Chart index (position in `state.charts`) -> slot position inside the group. Every
     * non-stacked bar series gets its own slot; every stacked bar series maps to the same
     * shared slot (the whole stacked group renders as one bar, at one x position).
     */
    barSeriesIndex?: Map<number, number>;
    /**
     * Per stacked-bar-series cumulative baseline value, indexed by display-data position.
     * Positive and negative values stack independently from the zero line. Computed once per
     * state change in `ChartLogic` so `SeriesRenderer` never accumulates cross-series state.
     */
    barBaselines?: Map<IndividualChartConfig<any>, number[]>;
    /** Resolved tick/tooltip formatter for the primary (left) y axis. */
    formatPrimary: (value: number) => string;
    /** Resolved tick/tooltip formatter for the secondary (right) y axis, when one exists. */
    formatSecondary?: (value: number) => string;
    /** Per-series tooltip formatter overrides, keyed by the series config object. */
    seriesFormats: Map<IndividualChartConfig<any>, (value: number) => string>;
}

export interface AxisBuilder {
    withLabel(label: string): this;
    withVisible(visible: boolean): this;
    /** `ValueFormat | (string & {})` — see `AxisConfig.format` for why the plain-`string` escape hatch is kept alongside the preset union. */
    withFormat(format: ValueFormat | (string & {})): this;
    withTicks(amount: number): this;
    withGridLines(visible: boolean): this;
    withMinorGridLines(visible: boolean): this;
    withPosition(position: AxisPosition): this;
    withMin(min: number | 'auto'): this;
    withMax(max: number | 'auto'): this;
    withScaleType(scaleType: ScaleType): this;
    build(): AxisConfig;
}

export interface IndividualChartBuilder<ITEM, CONFIG extends IndividualChartConfig<ITEM>> {
    withLabel(label: string): this;
    withColor(color: string | Observable<string>): this;
    withTooltip(renderer: (item: ITEM) => string): this;
    asSecondaryAxis(): this;
    /** Per-series tooltip value format; overrides the bound axis's `withFormat`. Ticks are unaffected. */
    withFormat(format: ValueFormat): this;
    build(): CONFIG;
}

export interface LineChartBuilder<ITEM> extends IndividualChartBuilder<ITEM, LineChartConfig<ITEM>> {
    withWidth(width: number): this;
    withCurve(curve: CurveType): this;
    withMarkers(visible: boolean): this;
    asDashed(): this;
}

export interface BarChartBuilder<ITEM> extends IndividualChartBuilder<ITEM, BarChartConfig<ITEM>> {
    asStacked(): this;
    withBarWidth(width: number): this;
}

export interface AreaChartBuilder<ITEM> extends IndividualChartBuilder<ITEM, AreaChartConfig<ITEM>> {
    withCurve(curve: CurveType): this;
    withOpacity(opacity: number): this;
    asStacked(): this;
}
