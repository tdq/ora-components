import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';

export class DateColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    withFormat(_format: string): this {
        return this;
    }

    render(item: ITEM): string {
        const value = (item as any)[this._field];
        if (!value) return '';
        const date = new Date(value);
        return date.toLocaleDateString();
    }

    build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.DATE);
    }
}
