# Technical Specification: Glass Effect Implementation

This specification outlines the implementation of the `asGlass()` modifier for `Button` and `TextField` components, consistent with the existing `ComboBox` implementation.

## 1. Visual Design

The "glass effect" is characterized by a semi-transparent background with a backdrop blur and a subtle border to ensure visibility against various backgrounds.

### Glass Effect Classes

#### Light Theme
- **Background**: `bg-white/40`
- **Blur**: `backdrop-blur-md`
- **Border**: `border-primary/20`
- **Label Color**: `text-on-primary-container` (Dark Blue)
- **Caption Color**: `text-on-primary-container` (Dark Blue)
- **Description Color**: `text-on-primary-container` (Dark Blue)

#### Dark Theme
- **Background**: `bg-white/10`
- **Blur**: `backdrop-blur-md`
- **Border**: `border-white/20`
- **Label Color**: `text-white` (White)
- **Caption Color**: `text-white` (White)
- **Description Color**: `text-white` (White)

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
