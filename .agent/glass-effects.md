# Technical Specification: Glass Effect Implementation

This specification outlines the implementation of the `asGlass()` modifier for `Button` and `TextField` components, consistent with the existing `ComboBox` implementation.

## 1. Visual Design

The "glass effect" is characterized by a semi-transparent background with a backdrop blur and a subtle border to ensure visibility against various backgrounds.

### Glass Effect Classes

#### Light Theme
- **Background**: `bg-white/60`
- **Blur**: `backdrop-blur-xl`
- **Border**: `ring-1 ring-black/10`
- **Label Color**: `text-gray-900`
- **Caption Color**: `text-gray-700`
- **Description Color**: `text-gray-600`

#### Dark Theme
- **Background**: `bg-white/10`
- **Blur**: `backdrop-blur-xl`
- **Border**: `ring-1 ring-white/20`
- **Label Color**: `text-white`
- **Caption Color**: `text-white/80`
- **Description Color**: `text-white/60`

## 1.1. Floating Glass Surfaces (popovers, chart tooltips)

Two cascade traps make a floating glass surface render as an opaque box. Both bite only
overlays, so any new floating glass element has to be checked against them.

1. **Never write an inline `background-color` on a glass element.** An inline style
   outranks `.glass-effect`'s translucent `bg-white/70`, so `backdrop-filter` stays active
   but has nothing to show through. `PopoverBuilder` sets the opaque `--ora-popover-bg`
   only on the non-glass branch (`component-parts/popover.ts`).
2. **A glass overlay nested in a glass host must opt out of the nested-glass rule.**
   `.glass-effect .glass-effect:not([popover]):not(.glass-effect--overlay)` switches the
   inner `backdrop-filter` off so nested *panels* don't stack two blurs. An overlay is only
   DOM-nested in its host — visually it floats above it — so it keeps its blur:
   `[popover]` elements are exempt for free (top layer), everything else adds
   `glass-effect--overlay` (the chart tooltip, `chart/styles.ts`).

Elevation on a glass overlay must be composed with `.glass-effect`'s own 1px ring, since
both live in `box-shadow` and the later value wins outright:

- class-based overlays get `.glass-effect--overlay`, which sets
  `var(--ora-popover-shadow), 0 0 0 1px var(--ora-popover-glass-ring)`;
- `PopoverBuilder` writes that same pair inline (it has to, positioning is inline).

Do **not** put a `shadow-level-*` utility on a glass element: a Tailwind box-shadow utility
replaces the ring and the overlay loses its edge.

## 2. Component Changes

### 2.1. Button (`src/components/button/button.ts`)

#### API Changes
- Add `asGlass()` method to `ButtonBuilder`.
- Add `isGlass$: BehaviorSubject<boolean>` to track the state.

#### Implementation Logic
- The `build()` method should subscribe to both `style$` and `isGlass$`.
- When `isGlass` is enabled:
  - Remove standard background classes (e.g., `bg-primary`, `bg-surface`).
  - Apply glass classes: `bg-white/10 backdrop-blur-md border border-white/20`.
  - Ensure hover/active states still work (e.g., `hover:bg-white/20`).
  - Maintain text color from the selected `ButtonStyle`.

### 2.2. TextField (`src/components/text-field/text-field.ts`)

#### API Changes
- Add `asGlass()` method to `TextFieldBuilder`.
- Add `isGlass$: BehaviorSubject<boolean>` to track the state.

#### Implementation Logic
- The `build()` method should subscribe to both `style$` and `isGlass$`.
- When `isGlass` is enabled:
  - Apply to the `input` element (or a wrapper if needed for consistency with ComboBox).
  - Remove standard background/border classes (e.g., `bg-surface-variant`, `ring-outline`).
  - Apply glass classes: `bg-white/10 backdrop-blur-md border border-white/20`.
  - Ensure focus states are handled (e.g., `focus:bg-white/20` or maintaining the primary ring).

## 3. Tailwind Configuration

No changes to `tailwind.config.mjs` are strictly required as we are using standard Tailwind classes. However, for better maintainability, we could define a "glass" utility if reused frequently.

```javascript
// Optional: tailwind.config.mjs
theme: {
  extend: {
    backgroundColor: {
      'glass': 'rgba(255, 255, 255, 0.1)',
    },
    borderColor: {
      'glass': 'rgba(255, 255, 255, 0.2)',
    }
  }
}
```

## 4. Reference Implementation (ComboBox)

The implementation should follow the pattern established in `src/components/combobox/combobox.ts`:

```typescript
if (isGlass) {
    element.classList.add('bg-white/10', 'backdrop-blur-md', 'border', 'border-white/20');
    // Remove conflicting background classes
}
```

## 5. Verification Plan

- **Storybook**: Update `button.stories.ts` and `text-field.stories.ts` to include "Glass" variants.
- **Visual Check**: Verify the blur effect over a background image or gradient in Storybook.
- **Accessibility**: Ensure text contrast remains sufficient on glass backgrounds.
