import { AxisBuilder, AxisConfig, AxisPosition, ScaleType } from '../types';

export class AxisBuilderImpl implements AxisBuilder {
    private config: AxisConfig;

    constructor(defaultPosition: AxisPosition, defaultScaleType: ScaleType) {
        this.config = {
            visible: true,
            showGridLines: true,
            showMinorGridLines: false,
            position: defaultPosition,
            scaleType: defaultScaleType,
            ticks: 5
        };
    }

    withLabel(label: string): this {
        this.config.label = label;
        return this;
    }

    withVisible(visible: boolean): this {
        this.config.visible = visible;
        return this;
    }

    withFormat(format: string | ((value: any) => string)): this {
        this.config.format = format;
        return this;
    }

    withTicks(amount: number): this {
        this.config.ticks = amount;
        return this;
    }

    withGridLines(visible: boolean): this {
        this.config.showGridLines = visible;
        return this;
    }

    withMinorGridLines(visible: boolean): this {
        this.config.showMinorGridLines = visible;
        return this;
    }

    withPosition(position: AxisPosition): this {
        this.config.position = position;
        return this;
    }

    withMin(min: number | 'auto'): this {
        this.config.min = min;
        return this;
    }

    withMax(max: number | 'auto'): this {
        this.config.max = max;
        return this;
    }

    withScaleType(scaleType: ScaleType): this {
        this.config.scaleType = scaleType;
        return this;
    }

    build(): AxisConfig {
        return { ...this.config };
    }
}
