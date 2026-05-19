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
- **Checkbox Cell**: Renders the row-level selection checkbox using `CheckboxBuilder` (cached as `checkbox`). Uses a `BehaviorSubject<CheckboxValue>` with `skip(1)` to react only to user clicks. A `suppressCheckboxEmit` flag prevents `onToggleSelection` from firing during programmatic `updateSelection()` calls.
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

### Inline Cell Editing
When both the grid has `asEditable()` enabled and a column has `col.editable && col.renderEditor` configured (via `asEditable()` on the column builder), the cell is made focusable (`tabIndex=0`, `cursor-text`) and renders a display value at rest. Clicking the cell (or pressing **Enter** while it is focused) calls `enterEditMode`.

**`enterEditMode` lifecycle:**
1. Calls `onActivateEditor(row, cell)` on the viewport — this commits any previously open editor.
2. Calls `col.renderEditor(item, isGlass)` to obtain an `{ element, getValue(), focus() }` editor descriptor.
3. Replaces cell content with the editor element (removes `px-4`/`truncate`, adds `overflow-hidden p-0`).
4. Stores the commit closure in `(cell as any).__commitEdit` for external access.
5. Focuses the editor on the next animation frame via `requestAnimationFrame`.

**Commit** (`commitEdit`): reads `editor.getValue()`, writes the value back onto `item[field]`, calls `onCommit(item)`, then calls `showCellDisplay` to restore the display view and returns focus to the cell.

**Revert** (`revertEdit`): restores the original field value captured before the editor was opened, calls `showCellDisplay`, returns focus to the cell. `onCommit` is **not** called.

**Keyboard bindings** (editor-mode listener attached to `editor.element`):

| Key | Behaviour |
|-----|-----------|
| `Enter` | Commit, advance to the next editable cell in the row or the first editable cell of the next row |
| `Escape` | Revert |
| `Tab` | Commit, move to the next editable cell or the first cell of the next row |
| `Shift+Tab` | Commit, move to the previous editable cell or the last cell of the previous row |
| `ArrowUp` | Commit, move focus to the same column in the row above (no editor opened) |
| `ArrowDown` | Commit, move focus to the same column in the row below (no editor opened) |

**Keyboard bindings** (cell-focus listener, fires when cell is focused but no editor is open):

| Key | Behaviour |
|-----|-----------|
| `Enter` | Open editor |
| `ArrowLeft` | Focus previous editable cell or last editable cell of row above |
| `ArrowRight` | Focus next editable cell or first editable cell of row below |
| `ArrowUp` | Focus same column in row above (no editor opened) |
| `ArrowDown` | Focus same column in row below (no editor opened) |

**Boolean column special case**: a checkbox editor commits immediately on its `change` event.

**Editor cleanup**: a dedicated `AbortController` (`editorAbort`) is created per editor session. Its signal is tied to the row-level `signal` so destroying the row while an editor is open automatically aborts the editor listeners. `showCellDisplay` aborts the editor signal and deletes `__commitEdit` and `__editorAbort` from the cell.

**`getEditableCells()`** returns the ordered list of focusable editable cells for the current row by walking `columns` and offsetting by 1 if multi-select is enabled (to skip the checkbox cell).

### Checkbox Bidirectional Binding
The selection checkbox uses a `BehaviorSubject<CheckboxValue>` passed to `CheckboxBuilder.withValue()`. This subject is bidirectional: the builder subscribes to it for display updates and pushes user click values back via `Subject.next()`.

To prevent feedback loops between user interaction and programmatic selection updates:
- `skip(1)` on the subject's observable ignores the initial seeded value.
- A `suppressCheckboxEmit` boolean flag is set to `true` before calling `value$.next(isSelected)` inside `updateSelection()`, then immediately reset to `false`. The subscription checks this flag before calling `onToggleSelection`.

### Performance
- Selection updates are highly optimized. Caching `checkbox` and `actionCell` during `populateRow` means `updateSelection` never calls `querySelector` during scroll-heavy selection changes.
- Positioning uses `transform: translateY` to enable GPU-composited virtualization.
- **State Guard**: `updateSelection` includes `if (this.isSelected === isSelected) return;` to prevent unnecessary DOM manipulations.
