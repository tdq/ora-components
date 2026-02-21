# Plan: TextField Component Improvements

This plan outlines the enhancements for the `TextField` component to align it with Material Design 3 (MD3) standards, improve code quality, and add missing features.

## 1. Architectural Improvements

### Reactive Class & Attribute Management
- **Centralized Stream**: Consolidate all reactive state (style, error, enabled, glass, etc.) into a single `combineLatest` stream.
- **Pure Functional Styles**: Deriving all classes and attributes within this stream ensures the visual state is always a pure function of the component's properties.
- **Consistent Subscription**: Use a single RxJS `Subscription` object to manage all subscriptions and ensure clean disposal in `registerDestroy`.

### Validation Logic
- **Decoupling**: Move validation logic (like email regex) to a separate utility file.
- **Standard Validators**: Implement a set of standard validators (required, minLength, maxLength, pattern, email).

### Component Structure
- **Container Refactor**: Ensure the container correctly handles leading/trailing slots for icons and prefix/suffix text.
- **Input Wrapper**: Introduce a wrapper around the `<input>` to manage the MD3 "filled" bottom line and focus states.

## 2. New Features

### Icons and Slots
- `withLeadingIcon(icon: Observable<HTMLElement | string>)`: Add support for leading icons.
- `withTrailingIcon(icon: Observable<HTMLElement | string>)`: Add support for trailing icons (e.g., clear button, password toggle).
- `withPrefix(text: Observable<string>)`: Add prefix text support.
- `withSuffix(text: Observable<string>)`: Add suffix text support.

### Helper and Error Text
- `withHelperText(text: Observable<string>)`: Add support for persistent helper text below the field.
- **Priority Logic**: Error text should override helper text when present.

### Character Counter
- `withCharacterCounter(enabled: boolean = true)`: Show current/max character count if `maxLength` attribute is set.

### Password Visibility Toggle
- `withPasswordToggle()`: Helper to automatically add a trailing icon that toggles between `type="password"` and `type="text"`.

### Variants
- **Dense Variant**: Add a `dense$` property to reduce padding and font size for compact layouts.

## 3. Accessibility (A11y)

- **Aria Attributes**:
    - Ensure `aria-describedby` links to both helper text and error text correctly.
    - Add `aria-required` when the field is required.
    - Ensure leading/trailing icons are `aria-hidden="true"` if decorative.
- **Labeling**: Maintain the `<label>` association with `htmlFor`.
- **Keyboard Navigation**: Ensure custom toggles (like password visibility) are keyboard-accessible.

## 4. Styling & MD3 Alignment

- **Tonal (Filled) Style**: 
    - Add the "active indicator" (bottom border) that expands on focus.
    - Ensure correct background color (`surface-variant`).
- **Outlined Style**: 
    - Ensure correct border color and focus thickness.
- **State Layers**: Add hover and focus state layers to the input container.
- **Glass Effect**: Refine glass styles to be consistent with the design system while maintaining readability.
- **Transitions**: Smoothly animate the label, bottom line, and error message appearance.

## 5. Implementation Checklist

### Phase 1: Refactoring & Cleanup
- [ ] Create `Subscription` manager for all internal observers.
- [ ] Move validation logic to `src/utils/validators.ts` (if it doesn't exist).
- [ ] Refactor `build()` to use a single `visualState$` stream for all DOM updates.
- [ ] Extract `BASE_INPUT_CLASSES` and `STYLE_MAP` updates.

### Phase 2: Core Enhancements
- [ ] Implement `withHelperText` and update `aria-describedby` logic.
- [ ] Add `withName`, `withRequired`, `withReadOnly`, `withAutocomplete` (Verify/Refine existing).
- [ ] Implement `dense` variant support.

### Phase 3: Slots & Icons
- [ ] Update DOM structure to support leading/trailing icon slots.
- [ ] Implement `withLeadingIcon` and `withTrailingIcon`.
- [ ] Implement `withPrefix` and `withSuffix`.
- [ ] Implement `withPasswordToggle`.

### Phase 4: MD3 Styling & Polish
- [ ] Update `TONAL` style with active indicator (bottom border).
- [ ] Update `OUTLINED` style.
- [ ] Refine glass effect styles.
- [ ] Add transitions for focus and error states.

### Phase 5: Character Counter & Final Validation
- [ ] Implement character counter logic.
- [ ] Ensure `withEmailValidation` uses the new utility.

### Phase 6: Testing
- [ ] Update `text-field.test.ts` to cover new features (icons, helper text, dense variant).
- [ ] Add accessibility tests (ARIA attributes).
- [ ] Verify reactive updates for all new properties.
