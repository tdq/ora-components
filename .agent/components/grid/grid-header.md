# Grid Header

## Description
The `GridHeader` class renders the column headers, handles sorting interactions, and manages column resizing.

## Responsibilities
- **Header Structure**: Renders column titles, sort icons, and resize handles.
- **Selection**: Renders the "Select All" checkbox when multi-select is enabled.
- **Sorting**: Captures clicks on sortable columns and triggers the sorting logic.
- **Resizing**: Implements mouse-based column resizing, updating the grid's layout reactively.

## Components
- **Element**: A flex container (`GridStyles.header`) with `sticky top-0`.
- **Checkbox Cell**: Renders the multi-select checkbox with indeterminate state support.
- **Header Cell**: Renders a single column header with optional sort icons and resize handles.

## Methods
- `render(items: ITEM[], selected: Set<ITEM>, sort: SortConfig)`: Re-renders the header state, including sorting icons and checkbox states.
- `onSort(field: string, direction: SortDirection)`: Callback for sorting interactions.
- `onSelectAll(checked: boolean)`: Callback for the header checkbox.
- `onColumnsResized(columns: GridColumn<ITEM>[])`: Callback triggered when a column's width is changed.

## Implementation Details
Resizing is handled via a `mousedown`, `mousemove`, and `mouseup` pattern on the `resize-handle` element. This directly modifies the `width` property of the `GridColumn` object.
