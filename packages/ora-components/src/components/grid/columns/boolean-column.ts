import { BehaviorSubject, of } from 'rxjs';
import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn, CellEditor } from '../types';
import { CheckboxBuilder, CheckboxValue } from '../../checkbox/checkbox';

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
                .withValue(new BehaviorSubject<CheckboxValue>(value))
                .withEnabled(of(false))
                .build();
        }
        return this._captionProvider(value);
    }

    protected override createEditor(item: ITEM, isGlass: boolean): CellEditor {
        const value$ = new BehaviorSubject<CheckboxValue>(!!(item as any)[this._field]);
        const builder = new CheckboxBuilder().withValue(value$).asGlass(isGlass);
        const checkbox = builder.build();
        const element = document.createElement('div');
        element.className = 'flex items-center justify-center w-full h-full';
        element.appendChild(checkbox);
        return {
            element,
            getValue: () => value$.getValue(),
            focus: () => (checkbox.querySelector('input') as HTMLInputElement | null)?.focus(),
        };
    }

    override build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.BOOLEAN);
    }
}
