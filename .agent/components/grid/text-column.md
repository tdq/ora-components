# Text Column

## Description
The `TextColumnBuilder` is the most common column type, used for displaying string data.

## Builder Methods
In addition to [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods) methods:

- `withPlaceholder(placeholder: string): this`: Sets a placeholder string to display if the field value is empty.

## Implementation Details
- **Field**: Accesses the specified field on the data item.
- **Rendering**: Converts the value to a string. Handles `null` or `undefined` by returning an empty string.

## Styling
- **Text Overflow**: Uses `truncate` to handle long text gracefully within the cell.
- **Alignment**: Left-aligned by default.

## Editing
Built-in editor is **TextFieldBuilder** with `asInlineError()` modifier. It is not displaying any label.
In case if grid has `asGlass()` modifier, the text field should be initialized with `asGlass()` modifier.