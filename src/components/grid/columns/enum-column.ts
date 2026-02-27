import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';

export class EnumColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _mapping: Record<string, string> = {};

    withMapping(mapping: Record<string, string>): this {
        this._mapping = mapping;
        return this;
    }

    render(item: ITEM): string {
        const value = (item as any)[this._field];
        return this._mapping[String(value)] || String(value);
    }

    build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.ENUM);
    }
}
