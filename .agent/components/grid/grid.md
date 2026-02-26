# Grid

## Description
Grid component is a custom element that is used for displaying tables with data and other components.
it has the following methods:
- withHeight(height: Observable<number>): this - sets height of the grid
- withColumns(): ColumnsBuilder - defines columns which are displayed in the grid
- asGlass(): this - sets special styling option for grid and its fields as transparent with blur background (glass effect). 
- withToolbar(): ToolbarBuilder - defines toolbar in the grid. [Toolbar](toolbar.md)
- asEditable(): this - enables edit mode
- withEnabled(enabled: Observable<boolean>): this - sets enabled state of the whole grid.
- withActions(): ActionsBuilder - adds side panel with actions for each row. [ActionsBuilder](actions-builder.md)
- asMultiSelect(): this - enables selecting multiple rows
- withItems(items: Observable<ITEM[]>): this - sets items which will be displayed in the grid

## ColumnsBuilder
Defines columns for the grid.
it has the following methods:
- addTextColumn(dtoField: string): [TextColumnBuilder](text-column.md)
- addNumberColumn(dtoField: string): [NumberColumnBuilder](number-column.md)
- addDateColumn(dtoField: string): [DateColumnBuilder](date-column.md)
- addDateTimeColumn(dtoField: string): [DateTimeColumnBuilder](datetime-column.md)
- addEnumColumn(dtoField: string): [EnumColumnBuilder](enum-column.md)
- addBooleanColumn(dtoField: string): [BooleanColumnBuilder](boolean-column.md)
- addPercentageColumn(dtoField: string): [PercentageColumnBuilder](percentage-column.md)
- addButtonColumn(dtoField: string): [ButtonColumnBuilder](button-column.md)
- addCustomColumn(): [CustomColumnBuilder](custom-column.md)
- addIconColumn(dtoField: string): [IconColumnBuilder](icon-column.md)
- addMoneyColumn(dtoField: string): [MoneyColumnBuilder](money-column.md)

## Requirements
Gris should use virtual rows and render only rows which are visible for user. Others should not be as a dom elements.
Grid component should accept generic type ITEM.
```typescript
export class GridBuilder<ITEM> implements ComponentBuilder {
    ...
}
```

## Styling
Style according to Material Design 3 

### Glass effect
