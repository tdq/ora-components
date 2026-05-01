import { Observable } from 'rxjs';
import { 
    AreaChartBuilder, 
    AreaChartConfig, 
    BarChartBuilder, 
    BarChartConfig, 
    CurveType, 
    LineChartBuilder, 
    LineChartConfig 
} from '../types';

abstract class IndividualChartBuilderImpl<ITEM, CONFIG extends { field: keyof ITEM | string; label: string; color?: string; color$?: Observable<string>; tooltipRenderer?: (item: ITEM) => string; useSecondaryAxis?: boolean }> {
    protected config: CONFIG;

    constructor(field: keyof ITEM | string) {
        this.config = {
            field,
            label: String(field),
        } as CONFIG;
    }

    withLabel(label: string): this {
        this.config.label = label;
        return this;
    }

    withColor(color: string | Observable<string>): this {
        if (typeof color === 'string') {
            this.config.color = color;
            this.config.color$ = undefined;
        } else {
            this.config.color$ = color;
        }
        return this;
    }

    withTooltip(renderer: (item: ITEM) => string): this {
        this.config.tooltipRenderer = renderer;
        return this;
    }

    asSecondaryAxis(): this {
        this.config.useSecondaryAxis = true;
        return this;
    }

    build(): CONFIG {
        return { ...this.config };
    }
}

export class LineChartBuilderImpl<ITEM> 
    extends IndividualChartBuilderImpl<ITEM, LineChartConfig<ITEM>> 
    implements LineChartBuilder<ITEM> 
{
    constructor(field: keyof ITEM | string) {
        super(field);
        this.config.type = 'line';
        this.config.width = 2;
        this.config.curve = 'linear';
        this.config.showMarkers = false;
        this.config.isDashed = false;
    }

    withWidth(width: number): this {
        this.config.width = width;
        return this;
    }

    withCurve(curve: CurveType): this {
        this.config.curve = curve;
        return this;
    }

    withMarkers(visible: boolean): this {
        this.config.showMarkers = visible;
        return this;
    }

    asDashed(): this {
        this.config.isDashed = true;
        return this;
    }
}

export class BarChartBuilderImpl<ITEM> 
    extends IndividualChartBuilderImpl<ITEM, BarChartConfig<ITEM>> 
    implements BarChartBuilder<ITEM> 
{
    constructor(field: keyof ITEM | string) {
        super(field);
        this.config.type = 'bar';
        this.config.isStacked = false;
        this.config.barWidth = 0.8;
    }

    asStacked(): this {
        this.config.isStacked = true;
        return this;
    }

    withBarWidth(width: number): this {
        this.config.barWidth = width;
        return this;
    }
}

export class AreaChartBuilderImpl<ITEM> 
    extends IndividualChartBuilderImpl<ITEM, AreaChartConfig<ITEM>> 
    implements AreaChartBuilder<ITEM> 
{
    constructor(field: keyof ITEM | string) {
        super(field);
        this.config.type = 'area';
        this.config.curve = 'linear';
        this.config.opacity = 0.3;
        this.config.isStacked = false;
    }

    withCurve(curve: CurveType): this {
        this.config.curve = curve;
        return this;
    }

    withOpacity(opacity: number): this {
        this.config.opacity = opacity;
        return this;
    }

    asStacked(): this {
        this.config.isStacked = true;
        return this;
    }
}
