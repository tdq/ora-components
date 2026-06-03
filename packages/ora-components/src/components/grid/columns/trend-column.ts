import { of } from 'rxjs';
import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';
import { TrendBuilder } from '../../trend/trend-builder';
import { Trend } from '../../../types/trend';

export class TrendColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _trendProvider?: (item: ITEM) => Trend;
    private _period?: string;

    constructor(field: string) {
        super(field);
        this._align = 'right';
    }

    withTrendProvider(provider: (item: ITEM) => Trend): this {
        this._trendProvider = provider;
        return this;
    }

    withPeriod(period: string): this {
        this._period = period;
        return this;
    }

    override asEditable(): this {
        return this;
    }

    private getTrend(item: ITEM): Trend | null {
        if (this._trendProvider) {
            const trend = this._trendProvider(item);
            if (!trend) return null;
            if (this._period !== undefined) {
                return { value: trend.value, period: this._period };
            }
            return trend;
        }
        const trend = (item as any)[this._field] as Trend | undefined;
        if (!trend) return null;
        if (this._period !== undefined) {
            return { value: trend.value, period: this._period };
        }
        return trend;
    }

    override render(item: ITEM): HTMLElement {
        const trend = this.getTrend(item);
        if (
            trend === null ||
            trend.value === null ||
            trend.value === undefined ||
            isNaN(trend.value)
        ) {
            return document.createElement('span');
        }

        const builder = new TrendBuilder().withTrend(of(trend));
        return builder.build();
    }

    override build(): GridColumn<ITEM> {
        if (!this._sortValue) {
            this.withSortValue((item: ITEM) => {
                const trend = this.getTrend(item);
                return trend?.value ?? 0;
            });
        }
        return this.createBaseColumn(ColumnType.TREND);
    }
}
