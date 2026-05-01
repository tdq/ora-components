import { Observable } from 'rxjs';

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
    format?: string | ((value: any) => string);
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
    barWidth?: number;
}

export interface AxisBuilder {
    withLabel(label: string): this;
    withVisible(visible: boolean): this;
    withFormat(format: string | ((value: any) => string)): this;
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
