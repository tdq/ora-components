# Grid Header

## Description
The `GridHeader` class renders the column headers, handles sorting interactions, and manages column resizing.

## Responsibilities
- **Header Structure**: Renders column titles, sort icons, and resize handles.
- **Selection**: Renders the "Select All" checkbox when multi-select is enabled.
### Sorting
- **Icons**: Displays sort icons (`Icons.SORT`, `Icons.SORT_UP`, `Icons.SORT_DOWN`) as inline SVG strings based on the current `SortConfig`.
- **Interaction**: Captures clicks on sortable columns and triggers the sorting logic.
- **Resizing**: Implements mouse-based column resizing, updating the grid's layout reactively.

## Components
- **Element**: A flex container (`GridStyles.header`) with `sticky top-0`.
- **Checkbox Cell**: Renders the multi-select checkbox with indeterminate state support.
- **Header Cell**: Renders a single column header with optional sort icons and resize handles. Applies `resizable-column` and `prev-resizable` classes to manage border highlights.

## Constructor

```ts
constructor(
    columns: GridColumn<ITEM>[],
    isGlass: boolean,
    isMultiSelect: boolean,
    actionCount: number,
    onSort: (field: string, direction: SortDirection) => void,
    onSelectAll: (checked: boolean) => void,
    onColumnsResized: (columns: GridColumn<ITEM>[]) => void
)
```

- **`actionCount: number`**: The number of row-level action buttons. When `actionCount > 0`, a blank action header cell is appended and its width is set inline as `actionCount * 36 + 8` px. When `0`, no action header cell is rendered.

## Methods
- `render(items: ITEM[], selected: Set<ITEM>, sort: SortConfig)`: Re-renders the header state, including sorting icons and checkbox states. It dynamically applies classes to cells based on their (and their neighbor's) resizable status.
- `onSort(field: string, direction: SortDirection)`: Callback for sorting interactions.
- `onSelectAll(checked: boolean)`: Callback for the header checkbox.
- `onColumnsResized(columns: GridColumn<ITEM>[])`: Callback triggered when a column's width is changed.
- `updateColumns(columns: GridColumn<ITEM>[])`: Replaces the current column definitions. Used when pivoting or dynamic configuration changes occur.

## Implementation Details

### Sort Icon Rendering
Sort icons are rendered as **inline SVG** strings from `Icons.SORT`, `Icons.SORT_UP`, and `Icons.SORT_DOWN`. A `<span>` wrapper element is created, and the SVG string is assigned via `iconWrapper.innerHTML = iconSvg`. State classes (`GridStyles.sortIconActive` / `GridStyles.sortIconInactive`) are applied to the wrapper `<span>`, not to an icon element directly.

### Action Header Cell
When `actionCount > 0`, a header cell matching the sticky action column is appended. Its pixel width is computed and set inline:
```ts
const actionWidth = actionCount * 36 + 8;
actionCell.style.width = `${actionWidth}px`;
```
This keeps the action header aligned with the action cells in data rows, which use the same formula.

### Column Resizing
Resizing is handled via a `mousedown`, `mousemove`, and `mouseup` pattern on the `resize-handle` element.
- **Active State**: During a drag operation, the `active` class is added to the handle, and a temporary background is applied to the cell.
- **Cursor Management**: The `document.body.style.cursor` is set to `col-resize` globally during the drag to ensure visual continuity.
- **Coordination**: Changes are propagated via `onColumnsResized` to sync the viewport's column widths.

## Styling
- **Borders**: Interactive resizable borders (grey on cell hover, primary blue on active/handle hover). Borders are 2px wide and 80% of header height.
