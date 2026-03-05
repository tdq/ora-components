# NumberField

## Description
NumberField component is a component that allows the user to enter and edit numbers.
It has the folowing methods:
- withValue(value: Subject<number>): this - sets value of the number field.
- withPlaceholder(placeholder: Observable<string>): this - sets placeholder of the number field.
- withEnabled(enabled: Observable<boolean>): this - sets enabled state of the number field.
- withStyle(style: Observable<TextFieldStyle>): this - sets style of the number field.
- withError(error: Observable<string>): this - sets error of the number field.
- withLabel(label: Observable<string>): this - sets label of the number field.
- withClass(className: Observable<string>): this - sets class css name of the number field.
- withPrefix(text: Observable<HTMLElement | string>): this - sets prefix as icon or text.
- withSuffix(text: Observable<HTMLElement | string>): this - sets suffix as icon or text.
- withFormat(format: Observable<string>):this - sets format of number
- withMinValue(min: Observable<number>): this - sets minimum allowed value
- withMaxValue(max: Observable<number>): this - sets maximum allowed value
- asGlass(): this - sets special styling option for number field and its popup with items as transparent with blur background (glass effect).
- asInlineError(): this - sets error state displaying as field style change.

NumberField style is an enum with the following values:
- tonal
- outlined

## Requirements
It should not allow to type anything except what format defines.
Prefix and suffix are not editable parts of number field.
Numbers are right aligned but placeholder is on the left.
All logic must be implemented in number-field-logic.ts file in the same folder.
"as<Something>" fields should set corresponding boolean fields values as "true". According to this fields values style, or change component behaviour accordingly.

## Files structure
- number-field.ts - contains NumberFieldBuilder and responsible for descibing DOM elements.
- number-field-logic.ts - contains logic which NumberFieldBuilder is using. Responsible for handling all events and subscriptions.
- number-field-<internal-component>.ts - set of files for internal components, like icons, error message, label.

## Styling
Style according to Material Design 3 
Error and label are small text.
Border should be defined as outline so changing its size is not affecting size of the input.
Height is 48px
Reserve space for error text only if it is not "as inline error".

### Inline error state
- On error set red outline for text field. 
- Add error icon on the right inside of text field. 
- Clicking this icon shows tooltip with error text close to this icon. Use "showPopover()" method for showing tooltip.
- Tooltip should close after 5 seconds or on clicking outside of the tooltip or on clicking the error icon again.
- Tooltip should have popover shadow.
- Tooltip should be positioned in the way it is always visible for user.