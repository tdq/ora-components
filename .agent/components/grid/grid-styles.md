# Grid Styles

## Description
The `GridStyles` object centralizes the Tailwind CSS classes used across all grid modules. This ensures stylistic consistency and simplifies theme management.

## Key Styles
- **`container`**: The main flex container with rounded corners and border.
- **`header`**: Flex container with a solid background (`bg-surface-container-low`) and higher z-index. The header row carries the background; it does **not** paint its own bottom border — the divider is drawn by each header cell so the line follows the column structure.
- **`headerCell`**: Column header container. Transparent background (the header row supplies the fill) and carries the header's bottom border (`border-b border-outline/20 dark:border-stone-50/20`). Has `select-none` to prevent text selection. Uses `before` and `after` pseudo-elements for resizable border highlights:
    - **Highlights**: Grey (`bg-outline/20`) when cell is hovered; primary blue when handle is hovered or resizing.
    - **Geometry**: 2px width (`w-0.5`), 80% height (`h-[80%]`), centered (`top-[10%]`).
    - **Targeting**: Controlled via `.resizable-column` (right) and `.prev-resizable` (left) classes.
- **`resizeHandle`**: Absolute-positioned hit area for column resizing.
    - **Z-Index**: `z-40` to remain above header cell highlights.
    - **Visual**: Uses an `after` pseudo-element for the thin (2px) blue indicator line.
- **`sortIcon`**: Wrapper `<span>` for inline SVG sort icons. Class: `'ml-2 transition-all transform inline-flex w-3 h-3 shrink-0 [&_svg]:w-full [&_svg]:h-full [&_svg]:block'`. The `[&_svg]` selectors size the SVG element to fill the wrapper. Does not use Font Awesome (`'fas'`).
- **`viewport`**: Scrollable container with `overflow-auto`.
- **`content`**: Relative-positioned container for data rows.
- **`row`**: Absolute-positioned flex container for row data. Uses `transform: translateY` and `will-change: transform` for optimized scrolling performance.
- **`rowOdd`**: Background color for zebra striping on odd rows.
- **`rowSelected`**: Background highlight for selected rows.
- **`cell`**: Flex container with padding and truncation for text content.
- **`totalCell`**: Specialized styling for aggregated pivot columns. Bold text with a distinct background (`bg-surface-container-highest/30`).
- **`groupRow`**: Full-width container for group headers. Uses `bg-surface-container-high` for visual distinction. Employs `transform: translateY` and `will-change: transform` for performance.
- **`groupToggle`**: Icon container for expansion chevrons (`w-5 h-5`). Supports 90-degree rotation when expanded.
- **`groupContent`**: Flex container for group label, value, and item count.
- **`actionCell`**: Sticky panel for row-level actions. Pinned to the right with a base translucent fill (`bg-surface-container-low/80`) used as a tint over the row-level background. **No `backdrop-blur`** — applying a backdrop filter to every row's action cell creates per-row composite layers that cause severe scroll lag. **Width is not fixed** — it is set inline by JS as `actions.length * 36 + 8` px to match the number of action buttons. When the row is selected, uses `actionCellSelected` (`bg-primary/10`).
- **`actionCellDefault`**: Single solid background (`bg-background`) applied to every non-selected, non-glass action cell. **Zebra striping has been removed from the action column** — all action cells share this style so the column reads as a uniform sticky panel rather than alternating with row stripes. (Replaces the previous `actionCellOdd` / `actionCellEven` pair.)
- **`actionHeaderCell`**: Sticky header cell that aligns with the action column. Uses a solid background (`bg-surface-container-low`) so it occludes other header cells when the grid scrolls horizontally, plus the header bottom border (`border-b border-outline/20 dark:border-stone-50/20`). No backdrop-blur. **Width is not fixed** — set inline by JS using the same `actionCount * 36 + 8` px formula as `actionCell`.
- **`tooltipWrapper`**: `'relative'` — a simple relative-positioned wrapper that establishes a stacking context for the Popover API tooltip.
- **`tooltip`**: Styling for the popover tooltip element. Uses `fixed` positioning, `bg-neutral-800/90` background, `z-[9999]`, and `−translate-x-1/2 -translate-y-full` to center the tooltip above its anchor button. Visibility is controlled entirely by JS via `showPopover()` / `hidePopover()` — there is no CSS hover trigger.

## Usage
Modules import `GridStyles` and apply classes using the `cn()` utility (a wrapper for `twMerge` and `clsx`).

## Material Design 3 Consistency
The styles align with MD3 specifications:
- **Surface**: Uses `bg-surface-container-low` for headers and sticky panels.
- **Border**: Uses `border-outline/20` for subtle borders.
- **Selection**: Uses `bg-primary/10` for selection backgrounds.
- **Hover**: Uses `hover:bg-surface-variant/20` for row hover states.
- **Performance**: High-cost filters like `backdrop-blur` are restricted to the primary header (`z-20`) to avoid overdraw and layout thrashing during virtualization. **Never apply `backdrop-blur` to per-row elements** (action cells, group rows) — each sticky element with a backdrop filter requires its own composite layer, which causes severe scroll performance degradation. Row transitions are limited to `colors` to prevent layout shifts.
