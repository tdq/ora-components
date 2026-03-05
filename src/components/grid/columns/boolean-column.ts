import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';

export class BooleanColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _trueText: string = 'Yes';
    private _falseText: string = 'No';
    private _isCheckbox: boolean = false;

    withTrueText(text: string): this {
        this._trueText = text;
        return this;
    }

    withFalseText(text: string): this {
        this._falseText = text;
        return this;
    }

    asCheckbox(): this {
        this._isCheckbox = true;
        return this;
    }

    render(item: ITEM): HTMLElement | string {
        const value = (item as any)[this._field];
        if (this._isCheckbox) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = !!value;
            checkbox.disabled = true; // Default to readonly in grid unless specified otherwise
            checkbox.className = 'w-4 h-4 rounded border-outline accent-primary cursor-default';
            return checkbox;
        }
        return value ? this._trueText : this._falseText;
    }

    build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.BOOLEAN);
    }
}
