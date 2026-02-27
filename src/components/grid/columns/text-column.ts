import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';

export class TextColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    render(item: ITEM): string {
        const value = (item as any)[this._field];
        return value !== undefined && value !== null ? String(value) : '';
    }

    build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.TEXT);
    }
}
