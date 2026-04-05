import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';

export class CustomColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _renderer: (item: ITEM) => HTMLElement | string = () => '';

    constructor() {
        super('custom');
    }

    withRenderer(renderer: (item: ITEM) => HTMLElement | string): this {
        this._renderer = renderer;
        return this;
    }

    override render(item: ITEM): HTMLElement | string {
        return this._renderer(item);
    }

    override build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.CUSTOM);
    }
}
