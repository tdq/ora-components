export enum ColumnType {
    TEXT = 'TEXT',
    NUMBER = 'NUMBER',
    DATE = 'DATE',
    DATETIME = 'DATETIME',
    ENUM = 'ENUM',
    BOOLEAN = 'BOOLEAN',
    PERCENTAGE = 'PERCENTAGE',
    BUTTON = 'BUTTON',
    CUSTOM = 'CUSTOM',
    ICON = 'ICON',
    MONEY = 'MONEY'
}

export enum SortDirection {
    NONE = 'NONE',
    ASC = 'ASC',
    DESC = 'DESC'
}

export interface SortConfig {
    field: string;
    direction: SortDirection;
}

export interface GridColumn<ITEM> {
    id: string;
    field: keyof ITEM | string;
    type: ColumnType;
    header: string;
    width?: string;
    sortable?: boolean;
    filterable?: boolean;
    resizable?: boolean;
    cellClass?: string;
    render: (item: ITEM) => HTMLElement | string;
}

export interface GridAction<ITEM> {
    label: string;
    icon?: string;
    onClick: (item: ITEM) => void;
}

export interface GridState<ITEM> {
    items: ITEM[];
    selectedItems: Set<ITEM>;
    sortConfig: SortConfig;
}

export interface ColumnBuilder<ITEM> {
    withHeader(header: string): this;
    withWidth(width: string): this;
    sortable(sortable: boolean): this;
    resizable(resizable: boolean): this;
    withClass(className: string): this;
    build(): GridColumn<ITEM>;
}
