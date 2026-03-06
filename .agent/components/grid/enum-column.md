# Enum Column

## Description
The `EnumColumnBuilder` is used to map raw field values (keys) to human-readable display labels.

## Builder Methods
In addition to [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods) methods:

- `withItemCaptionProvider(provider: (item: ITEM) => string): this`: Sets a mapping function that returns the display string for a given data item.

## Implementation Details
- **Field**: Accesses the specified field on the data item.
- **Rendering**: Uses the provided provider function.

## Styling
- **Text**: Typically uses standard cell typography.
