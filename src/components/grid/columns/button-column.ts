import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';
import { ButtonStyle } from '../../button/button';
import { clsx } from 'clsx';

export class ButtonColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _label: string = 'Action';
    private _onClick: (item: ITEM) => void = () => {};
    private _style: ButtonStyle = ButtonStyle.FILLED;

    withLabel(label: string): this {
        this._label = label;
        return this;
    }

    withOnClick(onClick: (item: ITEM) => void): this {
        this._onClick = onClick;
        return this;
    }

    withStyle(style: ButtonStyle): this {
        this._style = style;
        return this;
    }

    render(item: ITEM): HTMLElement {
        const button = document.createElement('button');
        button.textContent = this._label;
        
        let styleClass = 'bg-primary text-white hover:bg-primary/90';
        if (this._style === ButtonStyle.OUTLINED) {
            styleClass = 'border border-primary text-primary hover:bg-primary/5';
        } else if (this._style === ButtonStyle.TEXT) {
            styleClass = 'text-primary hover:bg-primary/5';
        } else if (this._style === ButtonStyle.TONAL) {
            styleClass = 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/90';
        }

        button.className = clsx('px-2 py-1 rounded text-sm transition-colors', styleClass);
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
