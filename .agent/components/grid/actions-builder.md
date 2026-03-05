# Actions Builder

## Description
The `ActionsBuilder` is used to define a set of contextual actions that appear for each row in the grid. These actions are typically rendered in a dedicated column at the end of the row.

## Builder Methods
- `addAction(label: string, onClick: (item: ITEM) => void): this`: Adds a text-based action button.
- `addIconAction(icon: string, onClick: (item: ITEM) => void): this`: Adds an icon-based action button (e.g., using FontAwesome or Material Icon classes).

## Implementation Details
- **Rendering**: Row actions are rendered as small buttons within an `actionCell`.
- **Event Handling**: Clicks on row actions are isolated to prevent triggering row selection or other row-level events.

## Styling
- **Default Appearance**: Rendered as flat buttons that gain a background on hover (`hover:bg-muted`).
- **Icon Actions**: Use a class-based icon system (e.g., `<i class="fa fa-edit"></i>`).
