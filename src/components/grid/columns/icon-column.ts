import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';

export class IconColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _iconMap: (value: any) => string = () => '';

    withIconMap(map: (value: any) => string): this {
        this._iconMap = map;
        return this;
    }

    render(item: ITEM): HTMLElement {
        const value = (item as any)[this._field];
        const iconClass = this._iconMap(value);
        const icon = document.createElement('i');
        icon.className = iconClass;
        return icon;
    }

    build(): GridColumn<ITEM> {
        return this.createBaseColumn(ColumnType.ICON);
    }
}
