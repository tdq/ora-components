import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';

export class DateColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _format: string = '';

    withFormat(format: string): this {
        this._format = format;
        return this;
    }

    render(item: ITEM): string {
        const value = (item as any)[this._field];
        if (!value) return '';
        const date = new Date(value);
        return date.toLocaleDateString(undefined, this._format ? { dateStyle: this._format as any } : undefined);
    }

    build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.DATE);
    }
}
