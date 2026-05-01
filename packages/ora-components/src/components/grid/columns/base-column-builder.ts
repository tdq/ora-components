import { ColumnBuilder, GridColumn, ColumnType, CellEditor } from '../types';

export abstract class BaseColumnBuilder<ITEM> implements ColumnBuilder<ITEM> {
    protected _header: string = '';
    protected _width: string = '1fr';
    protected _sortable: boolean = false;
    protected _resizable: boolean = false;
    protected _editable: boolean = false;
    protected _align: 'left' | 'center' | 'right' = 'left';
    protected _field: string;
    protected _cellClass?: (item: ITEM) => string;
    protected _sortValue?: (item: ITEM) => any;
    protected _minWidth?: string;

    constructor(field: string) {
        this._field = field;
        this._header = field; // Default header to field name
    }

    withHeader(header: string): this {
        this._header = header;
        return this;
    }

    withWidth(width: string): this {
        this._width = width;
        return this;
    }

    withMinWidth(minWidth: string): this {
        this._minWidth = minWidth;
        return this;
    }

    asSortable(sortable: boolean = true): this {
        this._sortable = sortable;
        return this;
    }

    asResizable(resizable: boolean = true): this {
        this._resizable = resizable;
        return this;
    }

    asEditable(): this {
        this._editable = true;
        return this;
    }

    withAlign(align: 'left' | 'center' | 'right'): this {
        this._align = align;
        return this;
    }

    withClass(classProvider: (item: ITEM) => string): this {
        this._cellClass = classProvider;
        return this;
    }

    withSortValue(provider: (item: ITEM) => any): this {
        this._sortValue = provider;
        return this;
    }

    abstract build(): GridColumn<ITEM>;

    protected createEditor(_item: ITEM, _isGlass: boolean): CellEditor | null {
        return null;
    }

    protected createBaseColumn(type: ColumnType): GridColumn<ITEM> {
        return {
            id: this._field,
            field: this._field,
            type: type,
            header: this._header,
            width: this._width,
            minWidth: this._minWidth,
            sortable: this._sortable,
            resizable: this._resizable,
            editable: this._editable,
            align: this._align,
            cellClass: this._cellClass,
            render: (item: ITEM) => this.render(item),
            renderEditor: this._editable ? (item, isGlass) => this.createEditor(item, isGlass) : undefined,
            sortValue: this._sortValue
        };
    }

    protected abstract render(item: ITEM): HTMLElement | string;
}
