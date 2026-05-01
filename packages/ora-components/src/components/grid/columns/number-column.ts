import { BehaviorSubject, of } from 'rxjs';
import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn, CellEditor } from '../types';
import { NumberFieldBuilder } from '../../number-field/number-field';

export class NumberColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _decimals: number = 2;

    constructor(field: string) {
        super(field);
        this._align = 'right';
    }

    withDecimals(decimals: number): this {
        if (typeof decimals !== 'number' || isNaN(decimals)) {
            return this;
        }
        this._decimals = Math.min(100, Math.max(0, Math.round(decimals)));
        return this;
    }

    override render(item: ITEM): string {
        const value = (item as any)[this._field];
        if (value === undefined || value === null) return '';
        const num = Number(value);
        if (isNaN(num)) return '';
        return num.toFixed(this._decimals);
    }

    protected override createEditor(item: ITEM, isGlass: boolean): CellEditor {
        const raw = (item as any)[this._field];
        const num = raw != null ? Number(raw) : null;
        const value$ = new BehaviorSubject<number | null>(num !== null && !isNaN(num) ? num : null);
        const builder = new NumberFieldBuilder()
            .withValue(value$)
            .withPrecision(of(this._decimals))
            .withStep(of(Math.pow(10, -this._decimals)))
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
        if (this._editable && !this._minWidth) {
            this._minWidth = '120px';
        }
        return this.createBaseColumn(ColumnType.NUMBER);
    }
}
