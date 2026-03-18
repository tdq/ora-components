# Actions Builder

## Description
The `ActionsBuilder` is used to define a set of contextual actions that appear for each row in the grid. These actions are rendered in a dedicated column pinned to the right end of the row.

## Builder Methods
- `addAction(icon: string, label: string, onClick: (item: ITEM) => void): this`: Adds an action button and returns `this` for chaining.
  - `icon`: Required SVG string — must be non-empty and start with `<svg`. Use constants from `Icons` (e.g., `Icons.EDIT`, `Icons.DELETE`).
  - `label`: Required non-empty string — used as the tooltip text and button `aria-label`.
  - `onClick`: Callback invoked with the row's `item` when the button is clicked.
- `build(): GridAction<ITEM>[]`: Returns a defensive copy (`[...this.actions]`) of the registered actions.

## Validation
`addAction` throws an `Error` in the following cases:
- `icon` is empty, whitespace-only, or not a string.
- `icon` does not start with `<svg`.
- `label` is empty, whitespace-only, or not a string.

## Usage

```typescript
import { Icons } from '@/core/icons';

grid.withActions()
    .addAction(Icons.EDIT, 'Edit', (item) => edit(item))
    .addAction(Icons.DELETE, 'Delete', (item) => remove(item));
```

## Implementation Details
- **Data Structure**: `GridAction<ITEM>` interface is defined in `types.ts`.
- **Rendering**: Row actions are rendered as buttons within an `actionCell` by the `GridRow` class.
- **Icon rendering**: The icon is set via `<span innerHTML=action.icon>` — inline SVG injection. There are no `<i className=...>` elements.
- **Event Handling**: Clicks on row actions are isolated using `e.stopPropagation()` to prevent triggering row selection.
- **Sticky Behavior**: The actions column is pinned to the right (`sticky right-0`). The styling is defined in `GridStyles.actionCell`.
- **Accessibility**: Each button has `aria-label` set to the action `label`.

## Styling
- **Default Appearance**: Defined by `GridStyles.actionButton`. Rendered as rounded-full buttons that gain a background on hover.
- **Column Width**: Auto-scales based on the number of actions: `actions.length * 36 + 8` px, set as an inline style on the action cell.
- **Tooltip**: Uses the browser **Popover API** (`popover="manual"`). On `mouseenter`, the tooltip is positioned using `getBoundingClientRect()` and shown via `tooltip.showPopover()` (guarded by a `:popover-open` check). On `mouseleave`, `tooltip.hidePopover()` is called (also guarded). Tooltips render in the browser top layer, escaping all overflow and z-index constraints.
- **Performance**: Sticky cells use an opaque background (`bg-surface-container-low/80`) instead of backdrop blur to maintain high frame rates during scroll.
