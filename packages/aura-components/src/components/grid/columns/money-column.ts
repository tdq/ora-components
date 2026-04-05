import { BehaviorSubject, of } from 'rxjs';
import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn, Money, CellEditor } from '../types';
import { CurrencyRegistry } from '../../../utils/currency-registry';
import { NumberFieldBuilder } from '../../number-field/number-field';

export class MoneyColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    override render(item: ITEM): string {
        const value = (item as any)[this._field] as Money;
        if (!value) return '';

        return CurrencyRegistry.format(value);
    }

    protected override createEditor(item: ITEM, isGlass: boolean): CellEditor {
        const money = (item as any)[this._field] as Money;
        const value$ = new BehaviorSubject<number | null>(money?.amount ?? null);
        const currencySign = money?.currencyId ? CurrencyRegistry.getSymbol(money.currencyId) : '';
        const builder = new NumberFieldBuilder()
            .withValue(value$)
            .withSuffix(of(currencySign))
            .withPrecision(of(2))
            .asInlineError();
        if (isGlass) builder.asGlass();
        const element = builder.build();
        return {
            element,
            getValue: () => {
                const amount = value$.getValue();
                const existing = (item as any)[this._field] as Money;
                if (amount == null) return existing;
                return { currencyId: existing?.currencyId ?? '', amount };
            },
            focus: () => (element.querySelector('input') as HTMLInputElement | null)?.focus(),
        };
    }

    override build(): GridColumn<ITEM> {
        this.withSortValue((item: ITEM) => (item as any)[this._field]?.amount);
        return this.createBaseColumn(ColumnType.MONEY);
    }
}
