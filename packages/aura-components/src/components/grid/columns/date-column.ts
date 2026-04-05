import { BehaviorSubject } from 'rxjs';
import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn, CellEditor } from '../types';
import { DatePickerBuilder } from '../../date-picker/datepicker-builder';

export class DateColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _format: string = '';

    withFormat(format: string): this {
        this._format = format;
        return this;
    }

    override render(item: ITEM): string {
        const value = (item as any)[this._field];
        if (!value) return '';
        const date = new Date(value);
        return date.toLocaleDateString(undefined, this._format ? { dateStyle: this._format as any } : undefined);
    }

    protected override createEditor(item: ITEM, isGlass: boolean): CellEditor {
        const raw = (item as any)[this._field];
        const date = raw ? new Date(raw) : null;
        const value$ = new BehaviorSubject<Date | null>(date);
        const builder = new DatePickerBuilder()
            .withValue(value$);
        if (isGlass) builder.asGlass();
        const element = builder.build();
        return {
            element,
            getValue: () => value$.getValue(),
            focus: () => (element.querySelector('input') as HTMLInputElement | null)?.focus(),
        };
    }

    override build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.DATE);
    }
}
