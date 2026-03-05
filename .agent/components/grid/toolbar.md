# Grid Toolbar

## Description
The Grid component supports an optional header toolbar for global actions. It uses the standard `ToolbarBuilder` to define and render buttons.

## Builder Methods
When calling `withToolbar()` on the `GridBuilder`, it returns a `ToolbarBuilder` instance. 

Key methods of `ToolbarBuilder`:
- `withPrimaryButton(): ButtonBuilder`: Adds a primary action button (filled style) to the right side of the toolbar.
- `addSecondaryButton(): ButtonBuilder`: Adds a secondary action button (outlined style) to the right side.
- `addTextButton(): ButtonBuilder`: Adds a text-style button to the left side of the toolbar.

See the full [Toolbar Documentation](../toolbar.md) for more details.

## Implementation Details
- **Rendering**: The toolbar is rendered at the top of the grid container, above the column headers.
- **Glass Effect**: If `asGlass()` is called on the `GridBuilder`, the glass effect is automatically propagated to the toolbar buttons.

## Styling
- **Alignment**: Primary and secondary buttons are right-aligned, while text buttons are left-aligned.
- **Material Design 3**: Follows MD3 button styles and state layers.
