# NumberField

## Description
NumberField component allows the user to enter and edit numbers.
It uses the builder pattern (implements ComponentBuilder) and follows Material Design 3 styling.

### Builder methods
- `withValue(value: Subject<number | null>): this` - receives a Subject for the numeric value. Null represents empty.
- `withPlaceholder(placeholder: Observable<string>): this` - sets placeholder text.
- `withEnabled(enabled: Observable<boolean>): this` - sets enabled/disabled state.
- `withStyle(style: Observable<FieldStyle>): this` - sets visual style. FieldStyle is imported from `@/theme`.
- `withError(error: Observable<string>): this` - sets error message. Empty string means no error.
- `withLabel(label: Observable<string>): this` - sets the label above the field.
- `withClass(className: Observable<string>): this` - sets additional CSS class on the container.
- `withPrefix(text: Observable<HTMLElement | string>): this` - sets non-editable prefix (icon or text).
- `withSuffix(text: Observable<HTMLElement | string>): this` - sets non-editable suffix (icon or text).
- `withFormat(format: Observable<string>): this` - sets number format. "integer" disallows decimal points.
- `withPrecision(precision: Observable<number>): this` - sets decimal precision for display formatting.
- `withMinValue(min: Observable<number>): this` - sets minimum allowed value (clamped on blur).
- `withMaxValue(max: Observable<number>): this` - sets maximum allowed value (clamped on blur).
- `withStep(step: Observable<number>): this` - sets step increment for keyboard navigation.
- `withLocale(locale: Observable<string>): this` - sets locale for number formatting via Intl.NumberFormat.
- `asGlass(): this` - enables glass effect styling (transparent with blur background).
- `asInlineError(): this` - displays errors as field style change instead of support text below.

### FieldStyle enum (from `@/theme`)
- `TONAL` - filled background style with bottom active indicator
- `OUTLINED` - transparent background with outline border

## Requirements
- Only allow typing characters that match the format (digits, minus, decimal separator).
- Prefix and suffix are non-editable parts of the number field.
- Numbers are right-aligned but placeholder text is left-aligned.
- All logic must be implemented in `number-field-logic.ts` using the `NumberFieldLogic` class.
- "as\<Something\>" methods set corresponding boolean fields to true. Logic and styling react accordingly.
- On blur: clamp value to min/max range, round to step, and format display.
- All Observable/Subject properties use `of()` defaults (e.g. `of('')`, `of(true)`, `of(FieldStyle.TONAL)`, `of(-Infinity)`, `of(Infinity)`, `of(1)`).
- Uses `formatNumber()` from `@/utils/number` for display formatting.
- Uses `clamp()` and `roundToStep()` from `@/utils/number` for value constraints.

## Keyboard navigation
- ArrowUp: increment by step
- ArrowDown: decrement by step
- PageUp: increment by step × 10
- PageDown: decrement by step × 10
- Home: set to min value (if finite)
- End: set to max value (if finite)

## Accessibility
- Input has `role="spinbutton"`, `inputMode="decimal"`, `type="text"`
- ARIA attributes: `aria-valuemin`, `aria-valuemax`, `aria-valuestep`, `aria-valuenow`, `aria-invalid`, `aria-describedby`
- Label is linked to input via `for`/`id` attributes

## Files structure
- `number-field.ts` - contains NumberFieldBuilder class. Responsible for describing DOM elements in `build()`. Imports FieldStyle from `@/theme` and re-exports it as `NumberFieldStyle` for backward compatibility. Uses `generateFieldId('number-field')` from `component-parts` for sequential ID generation. Creates `NumberFieldState` and passes it along with `activeIndicator` and `footer` elements to `NumberFieldLogic`.
- `number-field-logic.ts` - contains `NumberFieldLogic` class with `init()` and `destroy()` methods. Responsible for handling all events, subscriptions, input filtering, keyboard navigation, blur clamping, and reactive updates. Uses `FieldStyle` from `@/theme`. Manages `activeIndicator` and `footer` elements for consistent styling with TextField.
- `number-field-label.ts` - delegates to `FieldLabelBuilder` from `component-parts`.
- `number-field-error.ts` - delegates to `FieldSupportTextBuilder` and `ErrorPopoverBuilder` from `component-parts`.
- `number-field-icon.ts` - utility for creating icon elements from HTMLElement or string content.
- `index.ts` - re-exports from `number-field.ts`.

## Shared dependencies (component-parts)
This component uses the following shared parts from `src/components/component-parts/`:
- `FieldLabelBuilder` - creates the `<label>` element
- `FieldSupportTextBuilder` - creates the error/support text `<span>`
- `ErrorPopoverBuilder` - creates the inline error icon button with popover tooltip
- `generateFieldId()` - generates sequential IDs with `number-field-` prefix

## Styling
Style according to Material Design 3.
- Error and label use `md-label-small` typography.
- Border is defined as outline so changing its size does not affect the input size. Border size is 1px.
- Height is 48px (`h-[48px]`).
- Reserve space for error text below the field only if not in inline error mode.
- Use Tailwind CSS utilities with standard notation (e.g. `px-4`, `h-[48px]`, `w-6`).

### Inline error state
- On error, set error-colored ring/border on the input wrapper.
- Add error icon in the suffix container (using `ErrorPopoverBuilder` via `createNumberFieldErrorIcon()`).
- Clicking the icon shows a tooltip with error text. Uses `showPopover()` API.
- Tooltip closes after 5 seconds, on clicking outside, or on clicking the error icon again.
- Tooltip has popover shadow (`elevation-2` class).
- Tooltip is positioned to always be visible within the viewport.