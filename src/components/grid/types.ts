import { Observable } from 'rxjs';
import { ComponentBuilder } from '@/core/component-builder';

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

export interface GridColumn<ITEM> {
    id: string;
    field: keyof ITEM | string;
    type: ColumnType;
    header: string;
    width?: string;
    sortable?: boolean;
    filterable?: boolean;
    render: (item: ITEM) => HTMLElement | string;
}

export interface ColumnBuilder<ITEM> {
    withHeader(header: string): this;
    withWidth(width: string): this;
    sortable(sortable: boolean): this;
    build(): GridColumn<ITEM>;
}
