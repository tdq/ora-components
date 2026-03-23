# Panel

## Description
Panel is a custom component that is used to display a panel (card).
It has the following methods:
- `withGap(gap: PanelGap): this` - sets gap between panel border and content (padding).
- `withClass(className: Observable<string>): this` - sets class css name of the panel.
- `withContent(content: ComponentBuilder): this` - sets content of the panel.
- `asGlass(): this` - sets special styling option for panel as transparent with blur background (glass effect). 

PanelGap is an enum with values:
- `SMALL`. 4px gap
- `MEDIUM`. 8px gap
- `LARGE`. 16px gap
- `EXTRA_LARGE`. 32px gap

## Styling
Style according to Material Design 3.
No shadow.
It should have full width

### Glass styling
No shadow.