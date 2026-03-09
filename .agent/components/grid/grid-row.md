# Grid Row

## Description
The `GridRow` class renders a single row, its cells, selection checkbox, and row actions. It is optimized for efficient rendering within the `GridViewport`.

## Responsibilities
- **Row Rendering**: Renders the absolute-positioned row element with the correct `top` position.
- **Cell Rendering**: Iterates through `GridColumn` objects and calls their `render()` method to populate cells.
- **Selection Handling**: Manages the row-level selection state, updating both the checkbox and the row's background highlight.
- **Action Rendering**: Renders per-row action buttons in a dedicated `actionCell`.

## Components
- **Element**: An absolute-positioned flex container (`GridStyles.row`).
- **Checkbox Cell**: Renders the row-level selection checkbox.
- **Cell**: Renders individual column content, applying the specified column width.
- **Action Cell**: Renders contextual buttons, often pinned to the right (`sticky right-0`).

## Methods
- `getElement()`: Returns the row's DOM element.
- `update(item: ITEM, index: number, isSelected: boolean)`: Updates the row with new data or position (reusing the existing element).
- `updateSelection(isSelected: boolean)`: Efficiently updates only the selection-related visual states (checkbox and background).
- `updateColumns(columns: GridColumn<ITEM>[])`: Updates all cells when column widths are resized.

## Implementation Details
Selection updates are separated from full row re-renders to improve scrolling performance when only selection changes occur.
