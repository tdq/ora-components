# ToolBar

## Description
Toolbar is a custom component which allows to build panel with buttons.
It has the folowing methods:
- `withPrimaryButton(): ButtonBuilder` - provides primary button for the toolbar in filled style only. Should always be on the right side.
- `addSecondaryButton(): ButtonBuilder` - provides secondary button for the toolbar in outlined style. Should be on the right side, but before primary button.
- `addTextButton(): ButtonBuilder` - provides button in text style. Should be on the left side.

It should have 2 layouts internally: leftLayout and rightLayout. create both layouts only if there is a need to display buttons on both sides: left and right.
Place text buttons in leftLayout and primary, secondary buttons in rightLayout.

## Styling
Style according to Material Design 3 
ToolbarBuilder should use LayoutBuilder as a basis.
Primary ans secondary buttons should be right aligned in toolbar and text button should be left aligned.
Glass effect applied only for toolbar buttons. **Toolbar itself is not affected by glass effect**.