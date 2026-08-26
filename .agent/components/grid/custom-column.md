# Custom Column

## Description
The `CustomColumnBuilder` provides a way to define custom rendering logic for a cell, allowing for complex interactive components or highly specific formatting.

## Builder Methods
In addition to [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods) methods:

- `withRenderer(renderer: (item: ITEM) => HTMLElement | string): this`: Sets the custom rendering function.
- `asEditable(focusTarget?: (cellEl: HTMLElement) => HTMLElement | null): this`: Wires the cell into the grid's Tab/Enter/Arrow keyboard chain **without** opening a value editor — activating the cell just focuses the interactive content the renderer already produced. No `onCommit` fires and no item field is written. `focusTarget` defaults to the first focusable descendant (`button`, `a[href]`, enabled `input`/`select`/`textarea`, `[tabindex]` other than `-1`); disabled controls are excluded because focusing one would silently drop focus.

## Implementation Details
- **Rendering**: Directly calls the provided renderer with the current data item.
- **Renderer identity contract**: the cell caches the item it last rendered (`__prevItem`) and re-invokes the renderer only when the item reference changes. Comparing the renderer's *output* instead — as the cell used to — meant a renderer returning a fresh element each call rebuilt the cell on every row update, destroying focus, selection and any open dropdown inside it. Corollary for consumers: the renderer must be a pure function of the item, and item objects must be replaced (not mutated) when their data changes.
- **Teardown**: `GridRow.destroy()` and row recycling clear custom cell content, so `registerDestroy` / lifecycle-boundary callbacks registered by the renderer actually fire. A custom renderer that subscribes must register its teardown on an element it puts *inside* the cell.
- **`focusTarget` is resolved fresh** on every activation — never cache the returned node, since cell content may be recycled across renders.

## Styling
- **Flexibility**: The custom renderer is responsible for its own internal styling.
