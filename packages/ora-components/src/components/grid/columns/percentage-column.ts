import { BehaviorSubject, of } from 'rxjs';
import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn, CellEditor } from '../types';
import { NumberFieldBuilder } from '../../number-field/number-field';

export class PercentageColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    constructor(field: string) {
        super(field);
        this._align = 'right';
    }

    override render(item: ITEM): string {
        const value = (item as any)[this._field];
        if (value === undefined || value === null) return '';
        const num = Number(value);
        if (isNaN(num)) return '';
        const scaled = Math.round(num * 10000) / 100;
        return `${parseFloat(scaled.toFixed(2))}%`;
    }

    protected override createEditor(item: ITEM, isGlass: boolean): CellEditor {
        const raw = (item as any)[this._field];
        // Stored as 0.75 = 75%; edit as 75
        const numRaw = raw != null ? Number(raw) : null;
        const displayValue = numRaw != null && !isNaN(numRaw) ? parseFloat((numRaw * 100).toPrecision(12)) : null;
        const value$ = new BehaviorSubject<number | null>(displayValue);
        const builder = new NumberFieldBuilder()
            .withValue(value$)
            .withSuffix(of('%'))
            .withPrecision(of(2))
            .asInlineError();
        if (isGlass) builder.asGlass();
        const element = builder.build();
        return {
            element,
            getValue: () => {
                const v = value$.getValue();
                return v != null ? v / 100 : null;
            },
            focus: () => (element.querySelector('input') as HTMLInputElement | null)?.focus(),
        };
    }

    override build(): GridColumn<ITEM> {
        if (this._editable && !this._minWidth) {
            this._minWidth = '120px';
        }
        return this.createBaseColumn(ColumnType.PERCENTAGE);
    }
}
