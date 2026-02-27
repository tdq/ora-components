import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';

export class PercentageColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    render(item: ITEM): string {
        const value = (item as any)[this._field];
        if (value === undefined || value === null) return '';
        return `${(Number(value) * 100).toFixed(0)}%`;
    }

    build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.PERCENTAGE);
    }
}
