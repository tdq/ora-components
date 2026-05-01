import { ColumnBuilder, GridColumn } from '../types';
import { TextColumnBuilder } from './text-column';
import { NumberColumnBuilder } from './number-column';
import { DateColumnBuilder } from './date-column';
import { DateTimeColumnBuilder } from './datetime-column';
import { EnumColumnBuilder } from './enum-column';
import { BooleanColumnBuilder } from './boolean-column';
import { PercentageColumnBuilder } from './percentage-column';
import { ButtonColumnBuilder } from './button-column';
import { CustomColumnBuilder } from './custom-column';
import { IconColumnBuilder } from './icon-column';
import { MoneyColumnBuilder } from './money-column';

export class ColumnsBuilder<ITEM> {
    private builders: ColumnBuilder<ITEM>[] = [];

    addTextColumn(dtoField: string): TextColumnBuilder<ITEM> {
        const builder = new TextColumnBuilder<ITEM>(dtoField);
        this.builders.push(builder);
        return builder;
    }

    addNumberColumn(dtoField: string): NumberColumnBuilder<ITEM> {
        const builder = new NumberColumnBuilder<ITEM>(dtoField);
        this.builders.push(builder);
        return builder;
    }

    addDateColumn(dtoField: string): DateColumnBuilder<ITEM> {
        const builder = new DateColumnBuilder<ITEM>(dtoField);
        this.builders.push(builder);
        return builder;
    }

    addDateTimeColumn(dtoField: string): DateTimeColumnBuilder<ITEM> {
        const builder = new DateTimeColumnBuilder<ITEM>(dtoField);
        this.builders.push(builder);
        return builder;
    }

    addEnumColumn(dtoField: string): EnumColumnBuilder<ITEM> {
        const builder = new EnumColumnBuilder<ITEM>(dtoField);
        this.builders.push(builder);
        return builder;
    }

    addBooleanColumn(dtoField: string): BooleanColumnBuilder<ITEM> {
        const builder = new BooleanColumnBuilder<ITEM>(dtoField);
        this.builders.push(builder);
        return builder;
    }

    addPercentageColumn(dtoField: string): PercentageColumnBuilder<ITEM> {
        const builder = new PercentageColumnBuilder<ITEM>(dtoField);
        this.builders.push(builder);
        return builder;
    }

    addButtonColumn(dtoField: string): ButtonColumnBuilder<ITEM> {
        const builder = new ButtonColumnBuilder<ITEM>(dtoField);
        this.builders.push(builder);
        return builder;
    }

    addCustomColumn(): CustomColumnBuilder<ITEM> {
        const builder = new CustomColumnBuilder<ITEM>();
        this.builders.push(builder);
        return builder;
    }

    addIconColumn(dtoField: string): IconColumnBuilder<ITEM> {
        const builder = new IconColumnBuilder<ITEM>(dtoField);
        this.builders.push(builder);
        return builder;
    }

    /**
     * Adds a column for displaying monetary values.
     * @param dtoField The field in the data item containing a Money object { amount: number, currencyId: string }.
     */
    addMoneyColumn(dtoField: string): MoneyColumnBuilder<ITEM> {
        const builder = new MoneyColumnBuilder<ITEM>(dtoField);
        this.builders.push(builder);
        return builder;
    }

    build(): GridColumn<ITEM>[] {
        return this.builders.map(builder => builder.build());
    }
}
