# Boolean Column

## Description
The `BooleanColumnBuilder` is used to display boolean values in a grid cell. By default, it renders 'Yes' for `true` and 'No' for `false`.

## Builder Methods
In addition to [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods) methods:

- `withItemCaptionProvider(provider: (value: boolean) => string): this`: Maps `true`/`false` values to custom display labels.
- `asCheckbox(): this`: Renders the boolean value as a readonly checkbox.

## Implementation Details
- **Field**: Expects a boolean value from the data item.
- **Rendering**: Uses the provided provider or a `CheckboxBuilder` when `asCheckbox()` is enabled.
- **Internal Component**: When rendering a checkbox, it utilizes the project's standard `CheckboxBuilder` to ensure consistent Material Design 3 styling and interactive feedback.

## Styling
- **Alignment**: Center-aligned.
- **Checkbox**: Uses the styles defined in `CheckboxBuilder`, including MD3 state layers and color tokens.
- **Borders**: Inherits cell borders (`border-r border-border/50`).

## Editing
Built-in editor is **CheckboxBuilder** with `asInlineError()` modifier. It is not displaying any label.
In case if grid has `asGlass()` modifier, the checkbox should be initialized with `asGlass()` modifier.