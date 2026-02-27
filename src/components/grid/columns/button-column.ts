import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';

export class ButtonColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _label: string = 'Action';
    private _onClick: (item: ITEM) => void = () => {};

    withLabel(label: string): this {
        this._label = label;
        return this;
    }

    withOnClick(onClick: (item: ITEM) => void): this {
        this._onClick = onClick;
        return this;
    }

    render(item: ITEM): HTMLElement {
        const button = document.createElement('button');
        button.textContent = this._label;
        button.className = 'px-2 py-1 bg-primary text-white rounded hover:bg-primary/90 text-sm';
        button.onclick = (e) => {
            e.stopPropagation();
            this._onClick(item);
        };
        return button;
    }

    build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.BUTTON);
    }
}
