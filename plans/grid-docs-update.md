# Plan: Enhance Grid Documentation

## Goal
Update `.agent/components/grid/grid.md` to match the detail level and structure of `.agent/components/text-field.md`, providing a comprehensive guide for developers using or maintaining the Grid component.

## Comparison Summary
- **TextField Documentation**: Includes detailed builder method descriptions, enum details, file structure, shared dependencies, and specific styling requirements (including Tailwind classes).
- **Current Grid Documentation**: Very brief, missing method details, file structure, and implementation specifics for complex features like virtualization and multi-select.

## Proposed Structure for `grid.md`

### 1. Enhanced Description
- Define Grid as a high-performance tabular data display component.
- Mention use of the Builder pattern and implementation of `ComponentBuilder`.
- Highlight key features: virtualization, row actions, multi-select, and glass styling.

### 2. Detailed Builder Methods
Document all methods in `GridBuilder<ITEM>`:
- `withHeight(height: Observable<number>): this` - sets container height.
- `withItems(items: Observable<ITEM[]>): this` - sets the data source.
- `withColumns(): ColumnsBuilder<ITEM>` - starts column definition.
- `withToolbar(): ToolbarBuilder` - adds an optional top toolbar.
- `withActions(): ActionsBuilder<ITEM>` - adds per-row action buttons.
- `asGlass(): this` - enables translucent glass effect.
- `asEditable(): this` - enables edit mode (visual cue).
- `asMultiSelect(): this` - enables row selection checkboxes.

### 3. Column Configuration
- **ColumnsBuilder**: Document all `add<Type>Column` methods.
- **BaseColumnBuilder**: Document common methods for all columns:
    - `withHeader(header: string)` - sets the display name.
    - `withWidth(width: string)` - sets CSS width (e.g., '100px', '2fr').
    - `sortable(sortable: boolean)` - enables sorting UI.

### 4. Implementation Requirements
- **Virtual Scrolling**: Explain the viewport/content/row positioning logic (absolute positioning, buffer rows, scroll event handling).
- **Generics**: Explicitly mention `ITEM` generic type for type-safe data handling.
- **Selection**: Describe how `selectedItems` BehaviorSubject tracks state.
- **Sticky Header**: Mention fixed positioning for headers during scroll.

### 5. File Structure
Map the component parts to their respective files:
- `grid-builder.ts`: Main `GridBuilder` class and core rendering logic.
- `types.ts`: Column types, interfaces, and enums.
- `columns/`: Folder containing column-specific builders.
- `columns/base-column-builder.ts`: Shared logic for all columns.
- `actions-builder.ts`: Logic for row-level actions.

### 6. Shared Dependencies
List internal project dependencies:
- `ComponentBuilder` (core)
- `registerDestroy` (core) for subscription management.
- `ToolbarBuilder` (toolbar component).

### 7. Styling (Material Design 3)
Define specific Tailwind classes and MD3 attributes for grid components:
- **Container**: `bg-background`, `border-border`, `rounded-lg` (8px).
- **Header**:
    - **Height**: 52px (`h-[52px]`).
    - **Background**: `bg-muted/50` (Tonal variant) or `bg-surface-container-low`.
    - **Typography**: `font-medium`, `text-sm`, `text-on-surface-variant`.
    - **Border**: `border-b border-border`.
    - **Interaction**: `hover:text-primary` for sortable headers.
- **Rows**:
    - **Height**: 52px (`h-[52px]`).
    - **Background**: `bg-surface` or `bg-background`.
    - **Interaction**: `hover:bg-muted/30` (State layer) or `hover:bg-surface-container-high`.
    - **Border**: `border-b border-border/50`.
- **Columns/Cells**:
    - **Padding**: `px-4`.
    - **Alignment**: Center-vertically (`flex items-center`).
    - **Truncation**: `truncate` for text content.

### 8. Detailed Column Builder Methods
Document specialized methods for each column type, inspired by standalone component builders (e.g., `ButtonBuilder`, `CheckboxBuilder`):

- **BaseColumnBuilder** (inherited by all):
    - `withHeader(header: string)`: Sets display name.
    - `withWidth(width: string)`: Sets CSS width (px, rem, fr).
    - `sortable(sortable: boolean)`: Enables sorting.
    - `withClass(className: string)`: *Proposed* - Add custom classes to cells in this column.

- **TextColumnBuilder**:
    - `withPlaceholder(text: string)`: *Proposed* - Show placeholder if value is empty.

- **NumberColumnBuilder**:
    - `withDecimals(decimals: number)`: Sets fixed decimal places (default: 2).

- **DateColumnBuilder**:
    - `withFormat(format: string)`: Sets date display format.

- **BooleanColumnBuilder**:
    - `withItemCaptionProvider(provider: (item: boolean) => string)`: Label for `true` or `false`.
    - `asCheckbox()`: *Proposed* - Render as a readonly or editable checkbox.

- **ButtonColumnBuilder**:
    - `withLabel(label: string)`: Sets button text.
    - `withClick(click: Subject<ITEM>)`: Click callback.
    - `withStyle(style: ButtonStyle)`: *Proposed* - Use `FILLED`, `OUTLINED`, `TONAL`, etc. (matching `ButtonBuilder`).

- **EnumColumnBuilder**:
    - `withItemCaptionProvider(provider: (item: ITEM) => string)`: Maps raw values to display labels.

- **IconColumnBuilder**:
    - `withIconProvider(provider: (item: ITEM) => string)`: Returns icon class string based on value.
    - `withTooltipProvider(provider: (item: ITEM) => string)`: *Proposed* - Add native tooltip to icon.

- **MoneyColumnBuilder**:
    - `withCurrency(currency: string)`: Sets ISO currency code (default: 'USD').

### 9. Comparison with Standalone Components
Developers should expect consistency between standalone components and grid columns:
- **Reactive State**: While standalone components use `Observable<T>`, grid columns often use `(item: ITEM) => T` for row-specific logic.
- **Styling**: All columns should support MD3 style variants similar to their standalone counterparts (e.g., `asGlass()`).

## Action Steps
1.  Rewrite `.agent/components/grid/grid.md` following the above structure.
2.  (Optional) Populate individual column `.md` files in `.agent/components/grid/` with relevant details if they remain sparse.
3.  Verify all documentation aligns with the actual implementation in `src/components/grid/`.
