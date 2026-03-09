# Grid Viewport

## Description
The `GridViewport` class handles the virtualization and scroll management for the grid, ensuring only visible rows are rendered to maintain performance.

## Virtualization Logic
- **Row Height**: Fixed at `52px` (as defined in `GridStyles`).
- **Buffer**: Extra rows (default: `5`) are rendered above and below the visible viewport to prevent flickering during scrolls.
- **Rendering Loop**: `renderVisibleRows()` calculates the visible range based on `scrollTop` and `clientHeight` of the viewport element.

## Components
- **Element**: The main container with `overflow-auto`.
- **Content Element**: A child container with a calculated `height` matching the total items count.
- **Header Sync**: Supports adding a `GridHeader` element into the viewport (before the content) to ensure horizontal scroll synchronization.

## Methods
- `update(items: ITEM[], selected: Set<ITEM>)`: Updates the virtualization state with new items or selection changes.
- `updateColumns(columns: GridColumn<ITEM>[])`: Propagates column changes (like resizing) to all currently rendered rows.
- `addHeader(headerElement: HTMLElement)`: Inserts a header element into the viewport.
- `handleScroll()`: Event listener that triggers re-calculation and rendering of visible rows.

## Implementation Details
Rendered rows are stored in a `Map<number, GridRow<ITEM>>`, where the key is the row index. This allows reusing row components when their position remains constant but data changes.
