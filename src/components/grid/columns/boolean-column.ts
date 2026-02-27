import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';

export class BooleanColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _trueText: string = 'Yes';
    private _falseText: string = 'No';

    withTrueText(text: string): this {
        this._trueText = text;
        return this;
    }

    withFalseText(text: string): this {
        this._falseText = text;
        return this;
    }

    render(item: ITEM): string {
        const value = (item as any)[this._field];
        return value ? this._trueText : this._falseText;
    }

    build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.BOOLEAN);
    }
}
