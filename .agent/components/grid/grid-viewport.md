# Grid Viewport

## Description
The `GridViewport` class handles the virtualization and scroll management for the grid, ensuring only visible rows are rendered to maintain performance.

## Virtualization Logic
- **Row Height**: Fixed at `52px` (as defined in `GridStyles`).
- **Buffer**: Extra rows (default: `5`) are rendered above and below the visible viewport to prevent flickering during scrolls.
- **Rendering Loop**: `renderVisibleRows()` calculates the visible range based on `scrollTop` and `clientHeight` of the viewport element.
- **Dynamic Resizing**: Uses a `ResizeObserver` to automatically trigger `renderVisibleRows()` whenever the viewport's dimensions change. This ensures the correct number of rows is displayed even if the grid's initial size is zero or changes after initialization.

## Components
- **Element**: The main container with `overflow-auto`.
- **Content Element**: A child container with a calculated `height` matching the total items count.
- **Header Sync**: Supports adding a `GridHeader` element into the viewport (before the content) to ensure horizontal scroll synchronization.

## Methods
- `update(rows: GridRowData<ITEM>[], selected: Set<ITEM>)`: Updates the virtualization state with new rows (items or group headers) and selection changes.
- `updateColumns(columns: GridColumn<ITEM>[])`: Propagates column changes to all currently rendered data rows.
- `addHeader(headerElement: HTMLElement)`: Inserts a header element into the viewport.
- `handleScroll()`: Throttled event listener using `requestAnimationFrame`.
- `destroy()`: Disconnects the `ResizeObserver`.
- `clearActiveEditor()`: Clears the tracked active editor references. Called by `GridRow` via the `onEditorClose` callback after a commit or revert.

## Keyboard Navigation Coordination
`GridViewport` is the cross-row navigation coordinator. `GridRow` instances call back into it when navigation leaves the current row:

- **`handleTabToNextRow(rowIndex)`**: Invoked when `Tab` or `Enter` leaves the last editable cell — calls `moveToRow('next', …, 'first', true)`.
- **`handleTabToPreviousRow(rowIndex)`**: Invoked when `Shift+Tab` leaves the first editable cell — calls `moveToRow('prev', …, 'last', true)`.
- **`handleArrowToRowAbove(rowIndex, columnIndex)`**: Invoked on `ArrowUp` — calls `moveToRow('prev', …, columnIndex, false)`.
- **`handleArrowToRowBelow(rowIndex, columnIndex)`**: Invoked on `ArrowDown` — calls `moveToRow('next', …, columnIndex, false)`.
- **`handleEditorActivate(row, cell)`**: Invoked when a cell opens an editor. Commits any previously open editor in a different cell before updating the `activeEditorRow`/`activeEditorCell` references.

### `moveToRow` Algorithm
1. Walks `lastRows` in the requested direction, skipping `GROUP_HEADER` entries.
2. For the first matching `ITEM` row at index `i`:
   - If the row is outside the visible viewport, scrolls to `targetScrollTop - viewportHeight / 2` (centering), calls `renderVisibleRows()`, and schedules `activate` via `requestAnimationFrame`.
   - Otherwise calls `activate` synchronously.
3. `activate` looks up the rendered `GridRow` at index `i`, verifies `row.getItem() === targetItem` (guards against concurrent data changes), then calls `activateFirstEditableCell()`, `activateLastEditableCell()`, or `activateCellAtColumn(columnIndex, openEditor)` as appropriate.

### Active Editor Commit on Eviction
When `renderVisibleRows()` evicts a row that holds the active editor (row index falls outside the render window), it calls `row.commitActiveEditor(activeEditorCell)` before destroying the row, ensuring the in-progress edit is not lost.

## Implementation Details
- **Rendering Storage**: Rendered rows are stored in a `Map<number, GridRow<ITEM> | GridGroupRow>`, where the key is the row index.
- **Mixed Content**: `renderVisibleRows()` inspects the `type` of each `GridRowData` to instantiate and manage either a `GridRow` or a `GridGroupRow`. It handles row recycling by checking the instance type of existing cached rows.
