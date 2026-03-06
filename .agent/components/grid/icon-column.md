# Icon Column

## Description
The `IconColumnBuilder` renders dynamic icons based on the data item's state or values.

## Builder Methods
In addition to [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods) methods:

- `withIconProvider(provider: (item: ITEM) => string): this`: Sets a function that returns the CSS icon class string (e.g., `'fas fa-check'`) based on the data item.
- `withTooltipProvider(provider: (item: ITEM) => string): this`: Sets a function that returns a native tooltip string for the icon based on the data item.

## Implementation Details
- **Field**: Accesses the specified field on the data item.
- **Rendering**: Creates an `<i>` element with the provided classes.

## Styling
- **Size**: Typically `w-5 h-5`.
- **Alignment**: Centered horizontally within the cell.
