# Icon Column

## Description
The `IconColumnBuilder` renders an icon based on a dynamic provider function.

## Builder Methods
In addition to [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods) methods:

- `withIconMap(map: (value: any) => string): this`: A function that takes the field value and returns a CSS class string for the icon element (e.g., `'fas fa-check'`).

## Implementation Details
- **Field**: Accesses the specified field on the data item.
- **Rendering**: Creates an `<i>` element and applies the returned class string.

## Styling
- **Alignment**: Center-aligned.
