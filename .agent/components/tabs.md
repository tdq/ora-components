# Tabs

## Description
Tabs component is a custom element that organises content into separate views with a horizontal navigation bar.
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

### Focus State Styling
To ensure keyboard visibility, tabs use the following focus styling:
- **Outline**: `outline-2` (2px) using the `primary` theme color.
- **Trigger**: Visible only when focused via keyboard (`focus-visible`).
- **Offset**: `outline-offset-[-2px]` to keep the focus ring inside the button boundaries, preventing layout shifts and ensuring it doesn't overlap with the bottom border indicator.

## Accessibility & Keyboard Navigation
Tabs follow WAI-ARIA best practices for the [Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).

### ARIA Roles
- **Container for buttons**: `role="tablist"`
- **Tab buttons**: `role="tab"`, `aria-selected`, `aria-controls`
- **Content area**: `role="tabpanel"`, `aria-labelledby`

### Keyboard Shortcuts
- `ArrowRight` / `ArrowLeft`: Move focus between visible tabs and automatically activate the focused tab (wrapping around).
- `Home` / `End`: Jump to and activate the first / last visible tab.
- `Tab`: Only the active tab button is in the tab order (`tabindex="0"`). Pressing `Tab` from the active tab moves focus into the current tab panel.
- `Space` / `Enter`: If a tab is focused manually, it can be activated with these keys (though focus navigation automatically activates them).