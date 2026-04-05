import { BehaviorSubject, of } from 'rxjs';
import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn, CellEditor } from '../types';
import { CheckboxBuilder } from '../../checkbox/checkbox';

export class BooleanColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _captionProvider: (value: boolean) => string = (v) => v ? 'Yes' : 'No';
    private _isCheckbox: boolean = false;

    withItemCaptionProvider(provider: (value: boolean) => string): this {
        this._captionProvider = provider;
        return this;
    }

    asCheckbox(): this {
        this._isCheckbox = true;
        return this;
    }

    override render(item: ITEM): HTMLElement | string {
        const value = !!(item as any)[this._field];
        if (this._isCheckbox) {
            return new CheckboxBuilder()
                .withValue(new BehaviorSubject(value))
                .withEnabled(of(false))
                .build();
        }
        return this._captionProvider(value);
    }

    protected override createEditor(item: ITEM, isGlass: boolean): CellEditor {
        const value$ = new BehaviorSubject<boolean>(!!(item as any)[this._field]);
        const builder = new CheckboxBuilder().withValue(value$).asGlass(isGlass);
        const element = builder.build();
        return {
            element,
            getValue: () => value$.getValue(),
            focus: () => (element.querySelector('input') as HTMLInputElement | null)?.focus(),
        };
    }

    override build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.BOOLEAN);
    }
}
