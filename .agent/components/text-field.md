# TextField

## Description
TextField component allows the user to enter and edit text.
It uses the builder pattern (implements ComponentBuilder) and follows Material Design 3 styling.

### Builder methods
- `withValue(value: Subject<string>): this` - receives a Subject which is both observed and updated by the component. On input change, component calls value.next(newValue).
- `withPlaceholder(placeholder: Observable<string>): this` - sets placeholder text.
- `withEnabled(enabled: Observable<boolean>): this` - sets enabled/disabled state.
- `withStyle(style: Observable<FieldStyle>): this` - sets visual style. FieldStyle is imported from `@/theme`.
- `withError(error: Observable<string>): this` - sets error message. Empty string means no error.
- `withLabel(label: Observable<string>): this` - sets the label above the field.
- `withClass(className: Observable<string>): this` - sets additional CSS class on the input wrapper.
- `withPrefix(text: Observable<HTMLElement | string>): this` - sets non-editable prefix (icon or text).
- `withSuffix(text: Observable<HTMLElement | string>): this` - sets non-editable suffix (icon or text).
- `asGlass(): this` - enables glass effect styling (transparent with blur background).
- `asPassword(): this` - sets input type="password" with a visibility toggle icon.
- `asEmail(): this` - sets input type="email" and enables native email validation.
- `asInlineError(): this` - displays errors as field style change instead of support text below.

### FieldStyle enum (from `@/theme`)
- `TONAL` - filled background style with bottom active indicator
- `OUTLINED` - transparent background with outline border

## Requirements
- In password mode, display "*" symbols instead of actual text.
- Prefix and suffix are non-editable parts of the text field.
- "asPassword" mode adds a suffix icon button (uses `Icons.EYE_OPEN` and `Icons.EYE_CLOSED`) to toggle password visibility.
- All logic must be implemented in `text-field-logic.ts`.
- "as\<Something\>" methods set corresponding boolean fields to true. Logic and styling react to these boolean values.
- "asEmail()" sets input type="email" for native validation but does not auto-set the error observable.
- All Observable/Subject properties use `of()` defaults (e.g. `of('')`, `of(true)`, `of(FieldStyle.TONAL)`).

## Files structure
- `text-field.ts` - contains TextFieldBuilder class. Responsible for describing DOM elements in `build()`. Imports FieldStyle from `@/theme` and re-exports it as `TextFieldStyle` for backward compatibility. Uses `generateFieldId('text-field')` from `component-parts` for sequential ID generation.
- `text-field-logic.ts` - contains `buildTextField(config, elements)` function. Responsible for handling all events, subscriptions, and reactive updates. Uses `FieldStyle` from `@/theme` and `updateAffixContent()` from `component-parts`.
- `text-field-label.ts` - delegates to `FieldLabelBuilder` from `component-parts`.
- `text-field-error.ts` - delegates to `FieldSupportTextBuilder` and `ErrorPopoverBuilder` from `component-parts`.
- `text-field-icon.ts` - delegates to `FieldAffixBuilder` and `updateAffixContent()` from `component-parts`. Contains text-field-specific `createPasswordToggle()`.
- `index.ts` - re-exports from `text-field.ts`.

## Shared dependencies (component-parts)
This component uses the following shared parts from `src/components/component-parts/`:
- `FieldLabelBuilder` - creates the `<label>` element
- `FieldSupportTextBuilder` - creates the error/support text `<span>`
- `ErrorPopoverBuilder` - creates the inline error icon button with popover tooltip
- `FieldAffixBuilder` / `updateAffixContent()` - creates and updates prefix/suffix/icon containers
- `generateFieldId()` - generates sequential IDs with `text-field-` prefix

## Styling
Style according to Material Design 3.
- Error and label use `md-label-small` typography.
- Border is defined as outline so changing its size does not affect the input size. Border size is 1px.
- Height is 48px (`h-[48px]`).
- Reserve space for error text below the field only if not in inline error mode.
- Use Tailwind CSS utilities with standard notation (e.g. `px-4`, `h-[48px]`, `w-6`).

### Inline error state
- On error, set error-colored ring/border on the input wrapper.
- Add error icon on the right inside the text field (using `ErrorPopoverBuilder`).
- Clicking the icon shows a tooltip with error text. Uses `showPopover()` API.
- Tooltip closes after 5 seconds, on clicking outside, or on clicking the error icon again.
- Tooltip has popover shadow (`elevation-2` class).
- Tooltip is positioned to always be visible within the viewport.