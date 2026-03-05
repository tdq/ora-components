# Custom Column

## Description
The `CustomColumnBuilder` provides a way to define custom rendering logic for a cell, allowing for complex interactive components or highly specific formatting.

## Builder Methods
In addition to [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods) methods:

- `withRenderer(renderer: (item: ITEM) => HTMLElement | string): this`: Sets the custom rendering function.

## Implementation Details
- **Rendering**: Directly calls the provided renderer with the current data item.

## Styling
- **Flexibility**: The custom renderer is responsible for its own internal styling.
