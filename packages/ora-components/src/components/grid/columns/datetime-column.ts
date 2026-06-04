import { BehaviorSubject } from 'rxjs';
import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn, CellEditor } from '../types';
import { DateTimePickerBuilder } from '../../date-time-picker/datetime-picker-builder';

export class DateTimeColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _format: string = '';

    withFormat(format: string): this {
        this._format = format;
        return this;
    }

    override render(item: ITEM): string {
        const value = (item as any)[this._field];
        if (!value) return '';
        const date = new Date(value);
        return date.toLocaleString(undefined, this._format ? { dateStyle: this._format as any } : undefined);
    }

    protected override createEditor(item: ITEM, isGlass: boolean): CellEditor {
        const raw = (item as any)[this._field];
        const date = raw ? new Date(raw) : null;
        const value$ = new BehaviorSubject<Date | null>(date);
        const builder = new DateTimePickerBuilder()
            .withValue(value$);
        if (isGlass) builder.asGlass();
        if (this._format) builder.withFormat(this._format);
        const element = builder.build();
        return {
            element,
            getValue: () => value$.getValue(),
            focus: () => (element.querySelector('input') as HTMLInputElement | null)?.focus(),
        };
    }

    override build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.DATETIME);
    }
}
