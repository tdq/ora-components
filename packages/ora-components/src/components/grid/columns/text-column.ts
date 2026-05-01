import { BehaviorSubject } from 'rxjs';
import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn, CellEditor } from '../types';
import { TextFieldBuilder } from '../../text-field/text-field';

export class TextColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _placeholder: string = '';

    withPlaceholder(placeholder: string): this {
        this._placeholder = placeholder;
        return this;
    }

    override render(item: ITEM): string {
        const value = (item as any)[this._field];
        if (value !== undefined && value !== null && String(value) !== '') {
            return String(value);
        }
        return this._placeholder;
    }

    protected override createEditor(item: ITEM, isGlass: boolean): CellEditor {
        const value$ = new BehaviorSubject<string>(String((item as any)[this._field] ?? ''));
        const builder = new TextFieldBuilder()
            .withValue(value$)
            .asInlineError();
        if (isGlass) builder.asGlass();
        const element = builder.build();
        return {
            element,
            getValue: () => value$.getValue(),
            focus: () => (element.querySelector('input') as HTMLInputElement | null)?.focus(),
        };
    }

    override build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.TEXT);
    }
}
