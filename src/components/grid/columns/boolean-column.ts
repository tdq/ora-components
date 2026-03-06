import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';
import { CheckboxBuilder } from '../../checkbox/checkbox';
import { of, BehaviorSubject } from 'rxjs';

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

    render(item: ITEM): HTMLElement | string {
        const value = !!(item as any)[this._field];
        if (this._isCheckbox) {
            return new CheckboxBuilder()
                .withValue(new BehaviorSubject(value))
                .withEnabled(of(false))
                .build();
        }
        return this._captionProvider(value);
    }

    build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.BOOLEAN);
    }
}
