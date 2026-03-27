# Button Column

## Description
The `ButtonColumnBuilder` is used to display an inline action button for each row.

## Builder Methods
In addition to [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods) methods:

- `withLabel(label: string): this`: Sets the text content of the button.
- `withClick(click: ClickListener<ITEM>): this`: Sets the callback triggered when the button is clicked, passing the row's data item.
- `withStyle(style: ButtonStyle): this`: Sets the MD3 style variant (FILLED, OUTLINED, TONAL, TEXT).

## Implementation Details
- **Field**: Not strictly required, as it primarily triggers an action.
- **Rendering**: Creates a standard button element with the configured label and style.

## Styling
- **Size**: Typically `h-8` with horizontal padding.
- **Elevation**: Defaults to flat in grid context.
