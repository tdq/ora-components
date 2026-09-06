# Icons

## Description
The `Icons` class is a centralized registry of SVG icons and icon class constants used throughout the library. It ensures visual consistency and simplifies icon management.

## Location
- Source: `src/core/icons.ts`

## Available Icons

### Standard SVGs (Strings)
These constants contain literal SVG strings. They should be used with `innerHTML` or passed to components that support SVG content.

- `Icons.EYE_OPEN`: Eye icon for showing passwords.
- `Icons.EYE_CLOSED`: Strikethrough eye icon for hiding passwords.
- `Icons.CHEVRON_LEFT`: Left-pointing chevron for pagination and calendars.
- `Icons.CHEVRON_RIGHT`: Right-pointing chevron for pagination and calendars.
- `Icons.CHEVRON_DOWN`: Down-pointing chevron for dropdowns.
- `Icons.EXPAND`: Alias for `Icons.CHEVRON_DOWN`.
- `Icons.CALENDAR`: Calendar icon for date pickers.
- `Icons.ERROR`: Warning/Error icon for validation messages.
- `Icons.CHECKMARK`: Checkmark for checkboxes and success states.
- `Icons.INDETERMINATE`: Horizontal bar for the checkbox's indeterminate (mixed) state.
- `Icons.EDIT`: Pencil icon for edit actions in grid rows and toolbars.
- `Icons.DELETE`: Trash-can icon for destructive row and toolbar actions.
- `Icons.CLOSE`: Diagonal cross for dismissing dialogs, panels and the ChatPanel header.
- `Icons.MENU`: Three-line hamburger for menu triggers.
- `Icons.SEND`: Paper-plane for the ChatPanel composer's send button.
- `Icons.SPARKLE`: Four-point sparkle marking assistant surfaces — the ChatPanel header badge, the assistant avatar and the ChatTrigger pill.
- `Icons.PANEL_COLLAPSE`: Left-pointing chevron for the SideBar header's collapse toggle.
- `Icons.PANEL_EXPAND`: Right-pointing chevron shown on the collapsed SideBar brand on hover.
- `Icons.SORT`: Double chevron for an unsorted, sortable grid column header.
- `Icons.SORT_UP`: Upward triangle for an ascending-sorted column header.
- `Icons.SORT_DOWN`: Downward triangle for a descending-sorted column header.

Every constant on `Icons` is an inline SVG string — there are no font-icon classes in the registry.

## Usage Example

### In a Component Builder
```typescript
import { Icons } from '@/core/icons';

new ButtonBuilder()
    .withCaption(of('Search'))
    .withIcon(Icons.EXPAND)
    .build();
```

### Manual Insertion
```typescript
import { Icons } from '@/core/icons';

const element = document.createElement('div');
element.innerHTML = Icons.CALENDAR;
```

### With Class Replacements
If you need to inject custom Tailwind classes into the SVG:
```typescript
element.innerHTML = Icons.ERROR.replace('<svg', '<svg class="w-5 h-5 text-error"');
```
