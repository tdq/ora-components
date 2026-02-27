import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';

export class MoneyColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _currency: string = 'USD';

    withCurrency(currency: string): this {
        this._currency = currency;
        return this;
    }

    render(item: ITEM): string {
        const value = (item as any)[this._field];
        if (value === undefined || value === null) return '';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: this._currency }).format(Number(value));
    }

    build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.MONEY);
    }
}
