# Grid Component

## Description
The Grid component is a high-performance tabular data display component designed for Material Design 3. It utilizes the **Builder pattern**, implementing the `ComponentBuilder` interface, and is optimized for large datasets through **virtual scrolling**. It supports complex features like row actions, multi-selection, and glass styling effects.

The component is highly reactive, utilizing **RxJS** to handle data updates, selection states, and layout changes without full DOM re-renders.

## GridBuilder Methods
The `GridBuilder<ITEM>` class uses a generic type `ITEM` to ensure type safety across columns, actions, and selection state.

### Data & Dimensions
- `withHeight(height: Observable<number>): this`: Sets the fixed height of the grid container.
- `withItems(items: Observable<ITEM[]>): this`: Sets the data source for the grid.
- `withSort(field: keyof ITEM | string, direction: SortDirection): this`: Sets the initial sort configuration.

### Configuration
- `withColumns(): ColumnsBuilder<ITEM>`: Starts the column definition flow. Returns a `ColumnsBuilder`.
- `withToolbar(): ToolbarBuilder`: Adds an optional top toolbar for global actions.
- `withActions(): ActionsBuilder<ITEM>`: Adds per-row action buttons in a dedicated trailing column.
- `asGlass(): this`: Enables translucent glass styling with backdrop blur.
- `asEditable(): this`: Enables visual cues for edit mode (e.g., specific cursors or state layers).
- `asMultiSelect(): this`: Enables row selection via checkboxes and "Select All" functionality in the header.

## Column Configuration

### ColumnsBuilder
Used to add specialized columns to the grid:
- `addTextColumn(field: string)`: Standard text display.
- `addNumberColumn(field: string)`: Numeric data with decimal control.
- `addDateColumn(field: string)`: Date display.
- `addDateTimeColumn(field: string)`: Date and time display.
- `addEnumColumn(field: string)`: Mapped values from a dictionary.
- `addBooleanColumn(field: string)`: Boolean values as text or checkboxes.
- `addPercentageColumn(field: string)`: Percentage display.
- `addButtonColumn(field: string)`: Inline buttons for row-specific actions.
- `addIconColumn(field: string)`: Dynamic icon display based on field values.
- `addMoneyColumn(field: string)`: Currency-formatted numeric data.
- `addCustomColumn()`: Custom rendering logic for complex cell content.

### BaseColumnBuilder (Shared Methods)
All column builders inherit these common methods:
- `withHeader(header: string)`: Sets the display name in the column header.
- `withWidth(width: string)`: Sets CSS width (e.g., `'100px'`, `'2fr'`, `'15%'`).
- `sortable(sortable: boolean)`: Enables the sorting UI for the column.
- `resizable(resizable: boolean)`: Enables column resizing via a handle in the header.
- `withClass(className: string)`: Adds custom CSS classes to all cells in this column.

## Detailed Column Builder Methods

### TextColumnBuilder
- `withPlaceholder(text: string)`: Shows a placeholder string if the cell value is empty or null.

### NumberColumnBuilder
- `withDecimals(decimals: number)`: Sets the number of fixed decimal places (default: 2).

### DateColumnBuilder
- `withFormat(format: string)`: Sets the date display format (currently defaults to `toLocaleDateString()`).

### BooleanColumnBuilder
- `withItemCaptionProvider(provider: (value: boolean) => string)`: Maps `true`/`false` to custom display labels.
- `asCheckbox()`: Renders the boolean value as a readonly checkbox.

### ButtonColumnBuilder
- `withLabel(label: string)`: Sets the text content of the cell button.
- `withClick(click: Subject<ITEM>)`: Subject triggered on button click with the row's item.
- `withStyle(style: ButtonStyle)`: Sets the button style (FILLED, OUTLINED, TONAL, TEXT) matching standalone buttons.

### EnumColumnBuilder
- `withItemCaptionProvider(provider: (item: ITEM) => string)`: Maps raw values to display labels.

### IconColumnBuilder
- `withIconProvider(provider: (item: ITEM) => string)`: Returns icon class string based on the item state.
- `withTooltipProvider(provider: (item: ITEM) => string)`: Adds a native tooltip to the icon.

### MoneyColumnBuilder
- `withCurrency(currency: string)`: Sets the ISO currency code (default: 'USD').

## Implementation Requirements

### Virtual Scrolling & Horizontal Sync
The grid implements a custom virtualization engine to maintain 60fps even with thousands of rows:
- **Viewport**: The main scrollable container with `overflow-auto`.
- **Content**: A relative-positioned container with its total height calculated as `itemCount * rowHeight`.
- **Header Sync**: The header is placed inside the scrollable viewport to ensure horizontal alignment with rows while remaining `sticky top-0` vertically.
- **Row Positioning**: Visible rows are absolutely positioned within the content container based on their index.
- **Buffering**: Extra rows (default: 5) are rendered above and below the visible viewport to prevent flickering during fast scrolls.

### Selection
When `asMultiSelect()` is enabled:
- **State**: Tracked via `selectedItems` (a `BehaviorSubject<Set<ITEM>>`).
- **Header**: Includes a `CheckboxBuilder` for "Select All" / "Deselect All" logic, supporting the indeterminate state when only some items are selected.
- **Rows**: Selection triggers a background highlight (`bg-primary/5`) and uses the `CheckboxBuilder` for row-level selection.

### Sticky Panels
- **Sticky Header**: The header remains fixed at the top (`sticky top-0`) during vertical scrolling and has a higher z-index (`z-20`).
- **Sticky Actions**: When actions are defined, they are rendered in a dedicated column that is `sticky right-0`. This panel has a left border (`border-l`) and an opaque background (`bg-background`) to remain visible and legible over scrolled column content.

### Column Sorting
- **State**: The `GridBuilder` maintains a sort configuration (field and direction).
- **Interaction**: Clicking a sortable header toggles the state: `NONE` → `ASC` → `DESC`.
- **Visuals**: Displays sort icons (e.g., `fa-sort-up`/`down`) which are visible on hover or when active.

## File Structure
- `grid-builder.ts`: Main entry point containing `GridBuilder` and virtualization logic.
- `types.ts`: Shared interfaces, enums (`ColumnType`), and type definitions.
- `columns/`: Specialized column builders.
- `columns/base-column-builder.ts`: Abstract base class for all columns.
- `columns/columns-builder.ts`: Orchestrator for defining the grid's column set.
- `actions-builder.ts`: Logic for defining row-level actions.

## Shared Dependencies
- `ComponentBuilder` (`src/core/`): Standard builder interface.
- `registerDestroy` (`src/core/`): RxJS subscription cleanup utility.
- `ToolbarBuilder` (`src/components/toolbar/`): Integration for optional headers.
- `CheckboxBuilder` (`src/components/checkbox/`): Used for multi-select and boolean columns.
- `LabelBuilder` (`src/components/label/`): Used for consistent header and cell typography.

## Styling (Material Design 3)
Styling uses Tailwind CSS utilities following MD3 specifications.

### Components
- **Container**: `bg-background`, `border-border`, `rounded-lg` (8px).
- **Header**:
    - **Height**: 52px (`h-[52px]`).
    - **Background**: `bg-muted/50` (Tonal variant) or `bg-surface-container-low`.
    - **Typography**: `font-medium`, `text-sm`, `text-on-surface-variant` (rendered via `LabelBuilder`).
    - **Borders**: Vertical borders (`border-r border-border/50`) between columns.
- **Rows**:
    - **Height**: 52px (`h-[52px]`).
    - **Background**: `bg-surface` or `bg-background`.
    - **Interaction**: `hover:bg-muted/30` (State layer).
    - **Border**: `border-b border-border/50`.
- **Cells**:
    - **Padding**: `px-4`.
    - **Alignment**: `flex items-center`.
    - **Borders**: Vertical borders (`border-r border-border/50`) align with header borders.
    - **Content**: `truncate` for text.
- **Sticky Actions Column**:
    - **Position**: `sticky right-0 z-10`.
    - **Styling**: `border-l border-border bg-background`.

## Comparison with Standalone Components
Grid columns are designed to provide a consistent experience with standalone components while optimized for row-based rendering:
- **Reactive State**: While standalone components use `Observable<T>`, grid columns often use providers like `(item: ITEM) => T` to handle row-specific logic within the virtualization loop.
- **Consistency**: Stylistic variants like `asGlass()` or `ButtonStyle` are shared between standalone components and their grid counterparts.
