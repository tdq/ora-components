# Button Column

## Description
The `ButtonColumnBuilder` renders a clickable button within a grid cell. This is useful for row-level actions that should be prominently displayed.

## Builder Methods
In addition to [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods) methods:

- `withLabel(label: string): this`: Sets the text displayed on the button.
- `withOnClick(onClick: (item: ITEM) => void): this`: Sets the callback function triggered when the button is clicked.
- `withStyle(style: ButtonStyle): this`: Sets the button style (FILLED, OUTLINED, TONAL, TEXT).

## Implementation Details
- **Rendering**: Creates an `HTMLButtonElement` with MD3-inspired styling.
- **Event Handling**: Stops event propagation to prevent triggering row-level clicks.

## Styling
- **Default Classes**: `px-2 py-1 bg-primary text-white rounded hover:bg-primary/90 text-sm`
- **Glass Mode**: Inherits glass effects if the parent grid is in glass mode.
