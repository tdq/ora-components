import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';

export class EnumColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _captionProvider: (item: ITEM) => string = (item) => String((item as any)[this._field]);

    withItemCaptionProvider(provider: (item: ITEM) => string): this {
        this._captionProvider = provider;
        return this;
    }

    render(item: ITEM): string {
        return this._captionProvider(item);
    }

    build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.ENUM);
    }
}
