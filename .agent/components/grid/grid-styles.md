# Grid Styles

## Description
The `GridStyles` object centralizes the Tailwind CSS classes used across all grid modules. This ensures stylistic consistency and simplifies theme management.

## Key Styles
- **`container`**: The main flex container with rounded corners and border.
- **`header`**: Flex container with a background color, bottom border, and higher z-index.
- **`headerCell`**: Column header container. Uses `before` and `after` pseudo-elements for resizable border highlights:
    - **Highlights**: Grey (`bg-outline/20`) when cell is hovered; primary blue when handle is hovered or resizing.
    - **Geometry**: 2px width (`w-0.5`), 80% height (`h-[80%]`), centered (`top-[10%]`).
    - **Targeting**: Controlled via `.resizable-column` (right) and `.prev-resizable` (left) classes.
- **`resizeHandle`**: Absolute-positioned hit area for column resizing.
    - **Z-Index**: `z-40` to remain above header cell highlights.
    - **Visual**: Uses an `after` pseudo-element for the thin (2px) blue indicator line.
- **`viewport`**: Scrollable container with `overflow-auto`.
- **`content`**: Relative-positioned container for absolute-positioned rows.
- **`row`**: Absolute-positioned flex container for row data. Uses `transition-colors` for optimized scrolling performance.
- **`rowOdd`**: Background color for zebra striping on odd rows.
- **`rowSelected`**: Background highlight for selected rows.
- **`cell`**: Flex container with padding and truncation for text content.
- **`actionCell`**: Sticky panel for row-level actions. Pinned to the right with an opaque background (`bg-surface-container-low/80`) to ensure visibility without the overhead of backdrop filters.

## Usage
Modules import `GridStyles` and apply classes using the `cn()` utility (a wrapper for `twMerge` and `clsx`).

## Material Design 3 Consistency
The styles align with MD3 specifications:
- **Surface**: Uses `bg-surface-container-low` for headers and sticky panels.
- **Border**: Uses `border-outline/20` for subtle borders.
- **Selection**: Uses `bg-primary/10` for selection backgrounds.
- **Hover**: Uses `hover:bg-surface-variant/20` for row hover states.
- **Performance**: High-cost filters like `backdrop-blur` are restricted to the primary header (`z-20`) to avoid overdraw and layout thrashing during virtualization. Row transitions are limited to `colors` to prevent layout shifts.
