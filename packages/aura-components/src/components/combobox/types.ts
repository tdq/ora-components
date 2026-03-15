export enum ComboBoxStyle {
    TONAL = 'tonal',
    OUTLINED = 'outlined'
}

export interface ComboBoxConfig<ITEM> {
    placeholder?: string;
    itemIdProvider: (item: ITEM) => string | number;
}
