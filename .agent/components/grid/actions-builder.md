# Actions Builder

## Description
The `ActionsBuilder` is used to define a set of contextual actions that appear for each row in the grid. These actions are typically rendered in a dedicated column at the end of the row.

## Builder Methods
- `addAction(label: string, onClick: (item: ITEM) => void): this`: Adds a text-based action button.
- `addIconAction(icon: string, onClick: (item: ITEM) => void): this`: Adds an icon-based action button (e.g., using FontAwesome or Material Icon classes).

## Implementation Details
- **Data Structure**: `GridAction<ITEM>` interface is defined in `types.ts`.
- **Rendering**: Row actions are rendered as buttons within an `actionCell` by the `GridRow` class.
- **Event Handling**: Clicks on row actions are isolated using `e.stopPropagation()` to prevent triggering row selection.
- **Sticky Behavior**: The actions column is pinned to the right (`sticky right-0`). The styling is defined in `GridStyles.actionCell`.

## Styling
- **Default Appearance**: Defined by `GridStyles.actionButton`. Rendered as rounded-full buttons that gain a background on hover.
- **Icon Actions**: Use a class-based icon system (e.g., `<i class="fa fa-edit"></i>`).
- **Container**: The action cell uses `flex-none` with a fixed width (default `w-20`).
