# Grid Styles

## Description
The `GridStyles` object centralizes the Tailwind CSS classes used across all grid modules. This ensures stylistic consistency and simplifies theme management.

## Key Styles
- **`container`**: The main flex container with rounded corners and border.
- **`header`**: Flex container with a background color, bottom border, and higher z-index.
- **`viewport`**: Scrollable container with `overflow-auto`.
- **`content`**: Relative-positioned container for absolute-positioned rows.
- **`row`**: Absolute-positioned flex container for row data.
- **`rowOdd`**: Background color for zebra striping on odd rows.
- **`rowSelected`**: Background highlight for selected rows.
- **`cell`**: Flex container with padding and truncation for text content.
- **`actionCell`**: Sticky panel for row-level actions.

## Usage
Modules import `GridStyles` and apply classes using the `cn()` utility (a wrapper for `twMerge` and `clsx`).

## Material Design 3 Consistency
The styles align with MD3 specifications:
- **Surface**: Uses `bg-surface-container-low` for headers.
- **Border**: Uses `border-outline/20` for subtle borders.
- **Selection**: Uses `bg-primary/10` for selection backgrounds.
- **Hover**: Uses `hover:bg-surface-variant/20` for row hover states.
