import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';

export class NumberColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _decimals: number = 2;

    withDecimals(decimals: number): this {
        this._decimals = decimals;
        return this;
    }

    render(item: ITEM): string {
        const value = (item as any)[this._field];
        if (value === undefined || value === null) return '';
        return Number(value).toFixed(this._decimals);
    }

    build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.NUMBER);
    }
}
