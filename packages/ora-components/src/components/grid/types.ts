import { Observable } from 'rxjs';

/**
 * Namespaced commit signal a CellEditor's root element may dispatch to tell GridRow "the value
 * changed, commit and exit editing now" outside the normal keydown-driven path (Enter/Tab) —
 * e.g. a mouse click on an option inside a portal'd dropdown (EnumColumnBuilder's ComboBox
 * editor), which never fires a 'keydown' on the cell. Deliberately not a plain 'change': a
 * wrapped widget's own native 'change' (e.g. the ComboBox's search <input> firing 'change' on
 * blur) must never be mistaken for a commit, and a generic 'change' would leak this internal
 * signal out to a consumer's own 'change' listeners on the grid.
 */
export const CELL_COMMIT_EVENT = 'ora-cell-commit';

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
    MONEY = 'MONEY',
    TREND = 'TREND'
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
    visible$?: Observable<boolean>;
    align?: 'left' | 'center' | 'right';
    cellClass?: (item: ITEM) => string;
    render: (item: ITEM) => HTMLElement | string;
    renderEditor?: (item: ITEM, isGlass: boolean) => CellEditor | null;
    /**
     * Focus-only alternative to renderEditor: wires the cell into the Tab/Enter/Arrow
     * keyboard chain (getEditableCells) without opening a value editor. No commit ever
     * fires and no item field is written — activating the cell just focuses the element
     * this returns. Resolved fresh on every use (never cache the returned node): the cell
     * element may be reused/recycled across renders. Used by CustomColumnBuilder.asEditable().
     */
    focusEditableCell?: (cellEl: HTMLElement) => HTMLElement | null;
    sortValue?: (item: ITEM) => any;
    /**
     * Optional teardown hook for resources the column builder allocated when THIS specific
     * GridColumn instance was built (e.g. EnumColumnBuilder's long-lived options subscription
     * — see enum-column.ts). Not a builder "with"/"as" method: it lives on the built result,
     * one per build() call. GridBuilder calls it for every column on the grid's own teardown, and
     * whenever it swaps out a column set (pivot regeneration/reversion) — for the OUTGOING
     * columns being replaced.
     *
     * Implementations must be idempotent (safe to call more than once) and must not tear down
     * anything shared with OTHER built columns from the same builder instance — a single column
     * builder may be built more than once (e.g. across pivot regenerations, or reused to serve
     * two different grids), so destroy() must only release what this particular built instance
     * is responsible for.
     */
    destroy?(): void;
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
    withVisible(visible$: Observable<boolean>): this;
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
