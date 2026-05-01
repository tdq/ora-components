
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

export interface CellEditor {
    element: HTMLElement;
    getValue: () => any;
    focus(): void;
}

export interface GridColumn<ITEM> {
    id: string;
    field: keyof ITEM | string;
    type: ColumnType;
    header: string;
    width?: string;
    minWidth?: string;
    sortable?: boolean;
    filterable?: boolean;
    resizable?: boolean;
    editable?: boolean;
    align?: 'left' | 'center' | 'right';
    cellClass?: (item: ITEM) => string;
    render: (item: ITEM) => HTMLElement | string;
    renderEditor?: (item: ITEM, isGlass: boolean) => CellEditor | null;
    sortValue?: (item: ITEM) => any;
}

export interface GridAction<ITEM> {
    label: string;
    icon: string;
    onClick: (item: ITEM) => void;
    enable?: (item: ITEM) => boolean;
    visible?: (item: ITEM) => boolean;
}

export interface GridGroupHeader {
    type: 'GROUP_HEADER';
    groupValue: any;
    groupKey: string;
    field: string;
    count: number;
    isExpanded: boolean;
    level: number;
}

export type GridRowData<ITEM> = 
    | { type: 'ITEM'; data: ITEM; index: number; level: number } 
    | GridGroupHeader;

export interface GridState<ITEM> {
    items: ITEM[];
    rawItems: ITEM[];
    rows: GridRowData<ITEM>[];
    selectedItems: Set<ITEM>;
    sortConfig: SortConfig;
    groupBy: string[];
    expandedGroups: Set<string>;
    pivotConfig?: PivotConfig;
}

export interface ColumnBuilder<ITEM> {
    withHeader(header: string): this;
    withWidth(width: string): this;
    withMinWidth(minWidth: string): this;
    asSortable(sortable?: boolean): this;
    asResizable(resizable?: boolean): this;
    asEditable(): this;
    withAlign(align: 'left' | 'center' | 'right'): this;
    withClass(classProvider: (item: ITEM) => string): this;
    withSortValue(provider: (item: ITEM) => any): this;
    build(): GridColumn<ITEM>;
}

export enum AggregationType {
    SUM = 'SUM',
    COUNT = 'COUNT',
    AVG = 'AVG',
    MIN = 'MIN',
    MAX = 'MAX'
}

export interface PivotValueConfig {
    field: string;
    aggregation: AggregationType;
    header?: string;
}

export interface PivotConfig {
    rows: string[];
    columns: string[];
    values: PivotValueConfig[];
    showGrandTotal?: boolean;
}
