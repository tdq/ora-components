# Grid Component

## Description
The Grid component is a high-performance tabular data display component designed for Material Design 3. It utilizes the Builder pattern, implementing `ComponentBuilder`, and supports features like virtualization, row actions, multi-select, and glass styling effects. It is highly reactive, utilizing RxJS for state management and data updates.

## Key Features
- **Virtual Scrolling**: High-performance rendering for large datasets by only creating DOM elements for visible rows.
- **Row Actions**: Contextual actions for each data row.
- **Selection**: Support for multi-row selection with a reactive state.
- **Glass Effect**: Translucent styling with backdrop blur for modern UI themes.
- **Toolbar Integration**: Optional header toolbar for global actions.

## GridBuilder Methods

### Data & Dimensions
- `withHeight(height: Observable<number>): this`: Sets the height of the grid container.
- `withItems(items: Observable<ITEM[]>): this`: Sets the data source for the grid.

### Configuration
- `withColumns(): ColumnsBuilder<ITEM>`: Starts the column definition flow.
- `withToolbar(): ToolbarBuilder`: Adds an optional top toolbar to the grid.
- `withActions(): ActionsBuilder<ITEM>`: Adds per-row action buttons in a dedicated column.
- `asGlass(): this`: Enables the translucent glass effect with backdrop blur.
- `asEditable(): this`: Enables edit mode visual cues (e.g., cursor changes).
- `asMultiSelect(): this`: Enables row selection checkboxes.

## Column Configuration

### ColumnsBuilder
Provides methods to add specialized columns to the grid:
- `addTextColumn(field: string)`: Standard text display.
- `addNumberColumn(field: string)`: Numeric data with decimal control.
- `addDateColumn(field: string)`: Date display.
- `addDateTimeColumn(field: string)`: Date and time display.
- `addEnumColumn(field: string)`: Mapped values from a dictionary.
- `addBooleanColumn(field: string)`: True/False text or custom labels.
- `addPercentageColumn(field: string)`: Percentage display.
- `addButtonColumn(field: string)`: Inline button for row-specific actions.
- `addCustomColumn()`: Custom rendering logic for complex cells.
- `addIconColumn(field: string)`: Dynamic icon display based on field value.
- `addMoneyColumn(field: string)`: Currency-formatted numeric data.

### BaseColumnBuilder (Shared Methods)
All columns support the following configuration:
- `withHeader(header: string)`: Sets the display name in the header.
- `withWidth(width: string)`: Sets the CSS width (e.g., `'100px'`, `'2fr'`, `'15%'`).
- `sortable(sortable: boolean)`: Enables the sorting UI for the column.
- `withClass(className: string)`: Adds custom CSS classes to the cells in this column.

## Implementation Requirements

### Virtual Scrolling
The grid implements a custom virtualization engine:
- **Viewport**: A container with `overflow-y-auto` and a fixed or dynamic height.
- **Content**: A relative-positioned container with its total height set to `itemCount * rowHeight`.
- **Row Positioning**: Rows are absolutely positioned within the content container based on their index.
- **Buffering**: Extra rows are rendered above and below the visible area to ensure smooth scrolling.

### Generics
The `GridBuilder<ITEM>` class uses a generic type `ITEM` to ensure type safety across columns, actions, and selection state.

### Selection State
When `asMultiSelect()` is enabled, selection is tracked via a `BehaviorSubject<Set<ITEM>>` within the builder. Changes to selection trigger re-renders to update checkbox states.

### Sticky Header
The header is implemented with `sticky top-0` to remain visible while scrolling through data rows.

## File Structure
- `grid-builder.ts`: Core `GridBuilder` class and virtualization rendering logic.
- `types.ts`: Shared interfaces, enums, and column definitions.
- `columns/`: Sub-directory for specialized column builders.
- `columns/columns-builder.ts`: Entry point for defining the grid's column set.
- `columns/base-column-builder.ts`: Abstract base class with shared column configuration methods.
- `actions-builder.ts`: Logic for defining and rendering per-row action buttons.

## Shared Dependencies
- `ComponentBuilder` (`src/core/`): Standard interface for UI builders.
- `registerDestroy` (`src/core/`): Utility for managing subscription lifecycles.
- `ToolbarBuilder` (`src/components/toolbar/`): Used for the optional grid toolbar.

## Styling (Material Design 3)

### Container
- **Background**: `bg-background`
- **Border**: `border-border`
- **Corners**: `rounded-lg` (8px)

### Header
- **Height**: 52px (`h-[52px]`)
- **Background**: `bg-muted/50` (Tonal) or `bg-white/20` in Glass mode.
- **Typography**: `font-medium`, `text-sm`, `text-on-surface-variant` (implied by `text-foreground`).
- **Interaction**: `hover:text-primary` for sortable columns.

### Rows
- **Height**: 52px (`h-[52px]`)
- **Background**: `bg-surface` or `bg-background`
- **Interaction**: `hover:bg-muted/30` (State layer)
- **Border**: `border-b border-border/50`

### Cells
- **Padding**: `px-4`
- **Alignment**: `flex items-center`
- **Truncation**: `truncate` for text content.

## Detailed Column Builder Methods

### TextColumnBuilder
- `withPlaceholder(placeholder: string)`: Sets a placeholder string to display if the field value is empty.

### NumberColumnBuilder
- `withDecimals(decimals: number)`: Sets the number of fixed decimal places (default: 2).

### DateColumnBuilder
- `withFormat(format: string)`: Sets the date display format (currently uses `toLocaleDateString()`).

### BooleanColumnBuilder
- `withTrueText(text: string)`: Label for `true` values (default: 'Yes').
- `withFalseText(text: string)`: Label for `false` values (default: 'No').
- `asCheckbox()`: Renders the boolean value as a readonly checkbox.

### ButtonColumnBuilder
- `withLabel(label: string)`: Sets the text content of the cell button.
- `withOnClick(onClick: (item: ITEM) => void)`: Callback triggered on button click.
- `withStyle(style: ButtonStyle)`: Sets the button style (FILLED, OUTLINED, TONAL, TEXT).


### EnumColumnBuilder
- `withMapping(mapping: Record<string, string>)`: Maps raw values to display labels.

### IconColumnBuilder
- `withIconMap(map: (value: any) => string)`: Returns the CSS icon class based on the field's value.

### MoneyColumnBuilder
- `withCurrency(currency: string)`: Sets the ISO currency code (default: 'USD').
