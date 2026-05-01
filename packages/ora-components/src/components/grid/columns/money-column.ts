import { BehaviorSubject, of } from 'rxjs';
import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn, CellEditor } from '../types';
import { Money } from '../../../types/money';
import { CurrencyRegistry } from '../../../utils/currency-registry';
import { MoneyFieldBuilder } from '../../money-field/money-field';

export class MoneyColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _currencies: string[] = [];
    private _precision: number | undefined = undefined;

    constructor(field: string) {
        super(field);
        this._align = 'right';
    }

    withCurrencies(currencies: string[]): this {
        this._currencies = currencies;
        return this;
    }

    withPrecision(precision: number): this {
        if (typeof precision !== 'number' || isNaN(precision)) {
            return this;
        }
        this._precision = Math.min(20, Math.max(0, Math.round(precision)));
        return this;
    }

    override render(item: ITEM): string {
        const value = (item as any)[this._field] as Money;
        if (!value) return '';

        return CurrencyRegistry.format(value, this._precision);
    }

    protected override createEditor(item: ITEM, isGlass: boolean): CellEditor {
        const money = (item as any)[this._field] as Money;
        const value$ = new BehaviorSubject<Money | null>(money ?? null);
        const step = this._precision !== undefined ? Math.pow(10, -this._precision) : 0.01;
        const builder = new MoneyFieldBuilder()
            .withValue(value$)
            .withCurrencies(this._currencies)
            .withStep(of(step))
            .asInlineError();
        if (this._precision !== undefined) builder.withPrecision(of(this._precision));
        if (isGlass) builder.asGlass();
        const element = builder.build();
        return {
            element,
            getValue: () => value$.getValue(),
            focus: () => (element.querySelector('input') as HTMLInputElement | null)?.focus(),
        };
    }

    override build(): GridColumn<ITEM> {
        this.withSortValue((item: ITEM) => (item as any)[this._field]?.amount);
        if (this._editable && !this._minWidth) {
            this._minWidth = '160px';
        }
        return this.createBaseColumn(ColumnType.MONEY);
    }
}
