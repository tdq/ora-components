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
- **Header Cell**: Renders a single column header with optional sort icons and resize handles. Applies `resizable-column` and `prev-resizable` classes to manage border highlights.

## Methods
- `render(items: ITEM[], selected: Set<ITEM>, sort: SortConfig)`: Re-renders the header state, including sorting icons and checkbox states. It dynamically applies classes to cells based on their (and their neighbor's) resizable status.
- `onSort(field: string, direction: SortDirection)`: Callback for sorting interactions.
- `onSelectAll(checked: boolean)`: Callback for the header checkbox.
- `onColumnsResized(columns: GridColumn<ITEM>[])`: Callback triggered when a column's width is changed.

## Implementation Details
Resizing is handled via a `mousedown`, `mousemove`, and `mouseup` pattern on the `resize-handle` element. 
- **Active State**: During a drag operation, the `active` class is added to the handle, and a temporary background is applied to the cell.
- **Cursor Management**: The `document.body.style.cursor` is set to `col-resize` globally during the drag to ensure visual continuity.
- **Coordination**: Changes are propagated via `onColumnsResized` to sync the viewport's column widths.

## Styling
- **Borders**: Interactive resizable borders (grey on cell hover, primary blue on active/handle hover). Borders are 2px wide and 80% of header height.