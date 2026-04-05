import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';

export class DateTimeColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    override render(item: ITEM): string {
        const value = (item as any)[this._field];
        if (!value) return '';
        const date = new Date(value);
        return date.toLocaleString();
    }

    override build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.DATETIME);
    }
}
