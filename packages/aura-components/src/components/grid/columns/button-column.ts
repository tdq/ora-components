import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';
import { ButtonStyle, ButtonBuilder } from '../../button/button';
import { Subject, of } from 'rxjs';
import { registerDestroy } from '@/core/destroyable-element';

export class ButtonColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _label: string = 'Action';
    private _click?: Subject<ITEM>;
    private _style: ButtonStyle = ButtonStyle.FILLED;

    withLabel(label: string): this {
        this._label = label;
        return this;
    }

    withClick(click: Subject<ITEM>): this {
        this._click = click;
        return this;
    }

    withStyle(style: ButtonStyle): this {
        this._style = style;
        return this;
    }

    render(item: ITEM): HTMLElement {
        const click$ = new Subject<void>();
        const sub = click$.subscribe(() => {
            if (this._click) {
                this._click.next(item);
            }
        });

        const button = new ButtonBuilder()
            .withCaption(of(this._label))
            .withStyle(of(this._style))
            .withClick(() => click$.next())
            .withClass(of('px-2 py-1 h-8 text-xs')) // Compact size for grid
            .build();
        
        registerDestroy(button, () => sub.unsubscribe());

        return button;
    }

    build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.BUTTON);
    }
}
