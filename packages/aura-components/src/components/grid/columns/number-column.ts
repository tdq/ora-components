import { BehaviorSubject } from 'rxjs';
import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn, CellEditor } from '../types';
import { NumberFieldBuilder } from '../../number-field/number-field';

export class NumberColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _decimals: number = 2;

    withDecimals(decimals: number): this {
        this._decimals = decimals;
        return this;
    }

    override render(item: ITEM): string {
        const value = (item as any)[this._field];
        if (value === undefined || value === null) return '';
        return Number(value).toFixed(this._decimals);
    }

    protected override createEditor(item: ITEM, isGlass: boolean): CellEditor {
        const raw = (item as any)[this._field];
        const value$ = new BehaviorSubject<number | null>(raw != null ? Number(raw) : null);
        const builder = new NumberFieldBuilder()
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
        return this.createBaseColumn(ColumnType.NUMBER);
    }
}
