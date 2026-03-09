# Grid Component

## Description
The Grid component is a high-performance tabular data display component designed for Material Design 3. It utilizes the **Builder pattern**, implementing the `ComponentBuilder` interface, and is optimized for large datasets through **virtual scrolling**. It supports complex features like row actions, multi-selection, and glass styling effects.

The component is highly reactive, utilizing **RxJS** to handle data updates, selection states, and layout changes without full DOM re-renders.

## Architecture
The grid is refactored into modular components to separate concerns and improve maintainability:
- **`GridBuilder`**: Public API and orchestrator.
- **`GridLogic`**: Reactive state management (sorting, selection, data processing).
- **`GridViewport`**: Virtualization engine and scroll management.
- **`GridHeader`**: Header rendering and interaction logic.
- **`GridRow`**: Row and cell rendering implementation.
- **`GridStyles`**: Centralized Tailwind CSS class constants.

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

## Implementation Requirements

### Virtual Scrolling & Horizontal Sync
The grid implements a custom virtualization engine to maintain 60fps even with thousands of rows:
- **Viewport**: The main scrollable container with `overflow-auto`. Managed by `GridViewport`. Uses `requestAnimationFrame` to throttle scroll events and ensure smooth rendering.
- **Content**: A relative-positioned container with its total height calculated as `itemCount * rowHeight`.
- **Header Sync**: The header is placed inside the scrollable viewport to ensure horizontal alignment with rows while remaining `sticky top-0` vertically.
- **Row Positioning**: Visible rows are managed as `GridRow` instances and absolutely positioned within the content container based on their index. Row components cache key interactive elements (checkboxes, action panels) to minimize DOM traversals during state updates.
- **Buffering**: Extra rows (default: 5) are rendered above and below the visible viewport to prevent flickering during fast scrolls.
- **Resize Awareness**: The `GridViewport` utilizes `ResizeObserver` to recalculate visible rows when the grid container's size changes.

### Selection
When `asMultiSelect()` is enabled:
- **State**: Tracked via `GridLogic` using `selectedItems` (a `BehaviorSubject<Set<ITEM>>`).
- **Header**: `GridHeader` renders a checkbox for "Select All" / "Deselect All" logic.
- **Rows**: `GridRow` renders a checkbox and handles selection toggling. To maintain performance, selection updates are optimized to avoid full row re-renders, using cached element references to toggle classes and attributes.

### Sticky Panels
- **Sticky Header**: Managed by `GridHeader`, remains fixed at the top (`sticky top-0`) with a higher z-index (`z-20`). Includes a backdrop blur for high-end visual feedback.
- **Sticky Actions**: Rendered in a dedicated column that is `sticky right-0`. To prevent scroll lag, this panel uses an opaque background (`bg-surface-container-low/80`) and avoids expensive backdrop filters.

### Column Sorting
- **State**: Managed in `GridLogic` (field and direction).
- **Interaction**: `GridHeader` captures clicks and updates `GridLogic`.
- **Visuals**: `GridHeader` displays sort icons based on the current `SortConfig`.

### Performance Mandates
1. **No Layout Thrashing**: Always use `requestAnimationFrame` for scroll-related DOM updates.
2. **Element Caching**: `GridRow` must cache frequently accessed elements (checkboxes, action containers) during creation.
3. **Selective Transitions**: Use `transition-colors` instead of `transition-all` on row containers to keep the compositor efficient.
4. **Filter Restraint**: Limit the use of `backdrop-blur` to static or low-frequency update elements like the primary header. Avoid it on repeated elements like row cells.

## File Structure
- `grid-builder.ts`: Orchestrator that assembles the grid using specialized modules.
- `grid-logic.ts`: Reactive state and data processing logic.
- `grid-viewport.ts`: Virtualization and scrolling implementation.
- `grid-header.ts`: Header rendering and interaction logic.
- `grid-row.ts`: Row and cell rendering implementation.
- `grid-styles.ts`: Centralized Tailwind CSS classes.
- `types.ts`: Shared interfaces, enums (`ColumnType`), and state definitions.
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
Styling is centralized in `grid-styles.ts` and uses Tailwind CSS utilities following MD3 specifications.

### Components
- **Container**: `bg-background`, `border-outline/30`, `dark:border-stone-50/20`, `rounded-lg`.
- **Header**:
    - **Height**: 52px.
    - **Background**: `bg-surface-container-low/80 backdrop-blur`.
    - **Borders**: Interactive resizable borders (grey on hover, primary blue on active/handle hover). Borders are 2px wide and 80% of header height.
    - **Typography**: `font-semibold`, `text-[11px]`, `text-on-surface-variant`, `uppercase`, `tracking-wider`.
- **Rows**:
    - **Height**: 52px.
    - **Background**: Zebra striping (`bg-surface-container-low/20` for odd rows).
    - **Interaction**: `hover:bg-surface-variant/20 transition-all duration-200`. Includes a left accent `hover:border-l-primary`.
- **Cells**:
    - **Padding**: `px-4`.
    - **Alignment**: `flex items-center`.
- **Sticky Actions Column**:
    - **Position**: `sticky right-0 z-10`.
    - **Styling**: `border-l border-outline/10 bg-surface-container-low/80 backdrop-blur-sm`.
