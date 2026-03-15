import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';

export class TextColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _placeholder: string = '';

    withPlaceholder(placeholder: string): this {
        this._placeholder = placeholder;
        return this;
    }

    render(item: ITEM): string {
        const value = (item as any)[this._field];
        if (value !== undefined && value !== null && String(value) !== '') {
            return String(value);
        }
        return this._placeholder;
    }

    build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.TEXT);
    }
}
