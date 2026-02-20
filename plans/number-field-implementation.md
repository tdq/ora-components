# Technical Specification: NumberField Component

## Overview
The `NumberField` component is a Material Design 3 compliant input for numeric values. It supports custom formatting, min/max constraints, and reactive state management using RxJS.

## Component Structure
The component will follow the builder pattern established in `src/components/text-field/text-field.ts`.

### Files to Create/Modify
- `src/components/number-field/number-field.ts`: Core logic and builder.
- `src/components/number-field/index.ts`: Public exports.
- `src/components/number-field/number-field.test.ts`: Unit tests.

## API Specification

### `NumberFieldStyle` Enum
```typescript
export enum NumberFieldStyle {
    TONAL = 'tonal',
    OUTLINED = 'outlined'
}
```

### `NumberFieldBuilder` Methods
- `withValue(value: Subject<number>): this` - Sets the value subject.
- `withPlaceholder(placeholder: Observable<string>): this` - Sets the placeholder text.
- `withEnabled(enabled: Observable<boolean>): this` - Controls the disabled state.
- `withStyle(style: Observable<NumberFieldStyle>): this` - Sets the visual style (tonal or outlined).
- `withError(error: Observable<string>): this` - Displays an error message and applies error styling.
- `withLabel(label: Observable<string>): this` - Sets the floating/top label.
- `withClass(className: Observable<string>): this` - Adds custom CSS classes to the input.
- `withFormat(format: Observable<string>): this` - Defines the numeric format (e.g., decimal places).
- `withMinValue(min: Observable<number>): this` - Sets the minimum allowed value.
- `withMaxValue(max: Observable<number>): this` - Sets the maximum allowed value.
- `withStep(step: Observable<number>): this` - Sets the step value for validation.
- `asGlass(): this` - Applies glass effect styling.

## Implementation Details

### Internal State
- All properties are stored as Observables/Subjects.
- `isGlass$` is a `BehaviorSubject<boolean>` defaulting to `false`.

### DOM Structure
```html
<div class="flex flex-col gap-px-4 w-full">
  <span class="md-label-small text-on-surface-variant px-px-16 hidden">Label</span>
  <input type="text" 
         inputmode="decimal"
         class="px-px-16 py-px-12 w-full outline-none transition-all body-large 
                placeholder:text-on-surface-variant text-on-surface text-right
                disabled:opacity-38 disabled:cursor-not-allowed" />
  <span class="md-label-small text-error px-px-16 hidden">Error Message</span>
</div>
```

### Styling
- Re-use `STYLE_MAP` pattern from `TextField`.
- `TONAL` (mapped to `bg-surface-variant` equivalent to `FILLED` in `TextField`).
- `OUTLINED` (mapped to `ring-1 ring-inset ring-outline`).
- Ensure "Border should be defined as outline so changing its size is not affecting size of the input" by using Tailwind `ring` or `box-shadow` (already done in `TextField`).
- `text-right` alignment as per requirements.

### Event Handling & Validation
1. **Input Filtering (`oninput`)**:
   - Prevent non-numeric characters based on the provided format.
   - If format allows decimals, permit one decimal separator.
   - Update `value$` subject after parsing the input string.
   
2. **Blur Handling (`onblur`)**:
   - Parse the current string value.
   - Clamp the value between `min` and `max`.
   - Ensure the value respects the `step` constraint if provided (value = Math.round(value / step) * step).
   - Re-format the value string (e.g., padding decimals) and update the input element's displayed value.
   - Push the clamped and stepped value back to `value$`.

3. **Value Synchronization**:
   - Subscribe to `value$`. When it changes from outside, update the input value formatted according to `format$`.

### Formatting Logic
The `withFormat` will accept a string. For this implementation:
- If format contains `.`, it defines decimal precision (e.g., `0.00` means 2 decimal places).
- If format is `integer`, it restricts to whole numbers.
- Default to `0.##` (up to 2 decimal places, no trailing zeros unless specified).

## Accessibility
- `role="spinbutton"`
- `aria-valuemin`, `aria-valuemax`, `aria-valuestep` synced with `min$`, `max$`, and `step$`.
- `aria-valuenow` synced with `value$`.
- `aria-invalid` true when `error$` has a value.
- Input `type="text"` with `inputmode="decimal"` for better mobile keyboard support while allowing custom formatting.

## Integration with Existing Patterns
- Implementation must use `registerDestroy` from `@/core/destroyable-element` to clean up RxJS subscriptions.
- Use `cn` (clsx + tailwind-merge) for class management.
- Implementation should mirror `src/components/text-field/text-field.ts` for consistency.
