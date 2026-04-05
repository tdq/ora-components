import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';

export class IconColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _iconProvider: (item: ITEM) => string = () => '';
    private _tooltipProvider?: (item: ITEM) => string;

    withIconProvider(provider: (item: ITEM) => string): this {
        this._iconProvider = provider;
        return this;
    }

    withTooltipProvider(provider: (item: ITEM) => string): this {
        this._tooltipProvider = provider;
        return this;
    }

    override render(item: ITEM): HTMLElement {
        const iconClass = this._iconProvider(item);
        const icon = document.createElement('i');
        icon.className = iconClass;

        if (this._tooltipProvider) {
            icon.title = this._tooltipProvider(item);
        }

        return icon;
    }

    override build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.ICON);
    }
}
