import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';
import { ButtonStyle, ButtonBuilder, ClickListener } from '../../button/button';
import { of } from 'rxjs';

export class ButtonColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _label: string = 'Action';
    private _click?: ClickListener<ITEM>;
    private _style: ButtonStyle = ButtonStyle.FILLED;

    withLabel(label: string): this {
        this._label = label;
        return this;
    }

    withClick(click: ClickListener<ITEM>): this {
        this._click = click;
        return this;
    }

    withStyle(style: ButtonStyle): this {
        this._style = style;
        return this;
    }

    render(item: ITEM): HTMLElement {
        const builder = new ButtonBuilder()
            .withCaption(of(this._label))
            .withStyle(of(this._style))
            .withClass(of('px-2 py-1 h-8 text-xs')) // Compact size for grid

        if(this._click) {
            builder.withClick(() => this._click!(item))
        }

        return builder.build();
    }

    build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.BUTTON);
    }
}
