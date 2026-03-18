# Grid Row

## Description
The `GridRow` class renders a single row, its cells, selection checkbox, and row actions. It is optimized for efficient rendering within the `GridViewport`.

## Responsibilities
- **Row Rendering**: Renders the absolute-positioned row element using `transform: translateY`.
- **Indentation**: Applies horizontal indentation to the first cell (checkbox or first data column) based on the row's `level` (used when grouping is enabled).
- **Cell Rendering**: Iterates through `GridColumn` objects and calls their `render()` method to populate cells.
- **Selection Handling**: Manages the row-level selection state, updating both the checkbox and the row's background highlight using cached element references.
- **Action Rendering**: Renders per-row action buttons in a dedicated `actionCell`.

## Components
- **Element**: An absolute-positioned flex container (`GridStyles.row`) positioned via `transform: translateY`.
- **Checkbox Cell**: Renders the row-level selection checkbox (cached as `checkbox`).
- **Cell**: Renders individual column content, applying the specified column width.
- **Action Cell**: Renders contextual buttons, pinned to the right (`sticky right-0`, cached as `actionCell`). Width is set inline as `actions.length * 36 + 8` px.

## Methods
- `getElement()`: Returns the row's DOM element.
- `getItem()`: Returns the current row item.
- `update(item: ITEM, index: number, isSelected: boolean, level: number)`: Updates the row with new data, position (via `transform`), and nesting level. Hides any open popovers, aborts all event listeners, clears `innerHTML`, then re-populates the DOM.
- `updateSelection(isSelected: boolean)`: Optimized to update only the selection-related visual states. Uses cached `checkbox` and `actionCell` references to avoid expensive DOM queries. Skips updates if the selection state hasn't changed.
- `updateColumns(columns: GridColumn<ITEM>[])`: Updates cell widths when columns are resized.

## Implementation Details

### Icon Rendering
Each action button contains a `<span>` with `innerHTML = action.icon` — inline SVG injection. There are no `<i>` elements.

### Tooltip (Popover API)
Tooltips use the browser **Popover API** (`popover="manual"`):
- `mouseenter`: calls `getBoundingClientRect()` on the button to compute position, then calls `tooltip.showPopover()` guarded by `!tooltip.matches(':popover-open')`.
- `mouseleave`: calls `tooltip.hidePopover()` guarded by `tooltip.matches(':popover-open')`.

Tooltips render in the browser top layer, which means they escape all overflow clipping and z-index stacking contexts.

### Memory Management
All event listeners (checkbox `change`, action button `mouseenter`/`mouseleave`/`click`) are registered with an `AbortController` via `{ signal }`. On `update()`, `listenerAbort.abort()` bulk-cancels every listener before `innerHTML` is cleared. This prevents listener leaks in the virtualized row pool where rows are recycled across data changes.

### Ghost Tooltip Cleanup
`update()` queries all `[popover]` elements inside the row and calls `hidePopover()` on any that match `:popover-open` before clearing the DOM. This prevents tooltips stranded in the top layer after a row is recycled.

### Performance
- Selection updates are highly optimized. Caching `checkbox` and `actionCell` during `populateRow` means `updateSelection` never calls `querySelector` during scroll-heavy selection changes.
- Positioning uses `transform: translateY` to enable GPU-composited virtualization.
- **State Guard**: `updateSelection` includes `if (this.isSelected === isSelected) return;` to prevent unnecessary DOM manipulations.
