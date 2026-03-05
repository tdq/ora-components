# Enum Column

## Description
The `EnumColumnBuilder` is used to map raw values (like IDs or keys) to user-friendly labels.

## Builder Methods
In addition to [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods) methods:

- `withMapping(mapping: Record<string, string>): this`: Provides the map of raw values to labels.

## Implementation Details
- **Field**: Accesses the specified field on the data item.
- **Rendering**: Looks up the value in the mapping record. If not found, returns the raw value as a string.

## Styling
- **Alignment**: Left-aligned.
