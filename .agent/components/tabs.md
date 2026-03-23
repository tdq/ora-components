# Tabs

## Description
Tabs component is a custom element that is used to display a button.
It has the following methods:
- `withCaption(caption: Observable<string>): this` - sets label of the tabs.
- `withDescription(description: Observable<string>): this` - sets description of the tabs.
- `asGlass(): this` - sets special styling option for tabs and its contents as transparent with blur background (glass effect).
- `addTab(): TabBuilder` - adds new tab to the tabs. It can have one child component.
- `withClass(className: Observable<string>): this` - sets class css name of the tabs.

TabBuilder has the following methods:
- `withCaption(caption: Observable<string>): this` - sets label of the tab.
- `withContent(content: ComponentBuilder): this` - sets content of the tab.
- `withVisible(visible: Observable<boolean>): this` - sets visibility of the tab.

## Styling
Style according to Material Design 3 
Description are small text.
Caption is a big text.
Panel with tabs buttons are scrollable horizontaly in case if there is not enough space for tabs.
Tabs has minimum width to fits their caption.
Captin and description are displayed on the left from tabs if any of them is defined.

### Glass effect
**Tabs content and panel with tabs have no background**.

Light theme:
1. Caption color is `text-gray-700`
2. Description color is `text-gray-600`

Dark theme:
1. Caption color is `text-white/80`
2. Description color is `text-white/60`