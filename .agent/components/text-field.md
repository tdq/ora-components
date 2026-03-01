# TextField

## Description
TextField component is a component that allows the user to enter and edit text.
It has the folowing methods:
- withValue(value: Subject<string>): this - receives a Subject which is both observed and updated by the component. On input change, component must call value.next(newValue).
- withPlaceholder(placeholder: Observable<string>): this - sets placeholder of the text field.
- withEnabled(enabled: Observable<boolean>): this - sets enabled state of the text field.
- withStyle(style: Observable<TextFieldStyle>): this - sets style of the text field.
- withError(error: Observable<string>): this - sets error of the text field.
- withLabel(label: Observable<string>): this - sets label of the text field.
- withClass(className: Observable<string>): this - sets class css name of the text field.
- withPrefix(text: Observable<HTMLElement | string>): this - sets prefix as icon or text.
- withSuffix(text: Observable<HTMLElement | string>): this - sets suffix as icon or text.
- asGlass(): this - sets special styling option for textfield and its popup with items as transparent with blur background (glass effect).
- asPassword(): this - sets special behavior for inputing password. Should set type="password"
- asEmail(): this - sets input type="email" and enables native validation but does not auto-set error observable.
- asInlineError(): this - sets error state displaying as field style change.

TextField style is an enum with the following values:
- tonal
- outlined

## Requirements
At password mode it should display "*" symbols instead of actual text.
Prefix and suffix are not editable parts of text field.
"asPassword" mode should add suffix icon to toggle visibility of typed password.
All logic must be implemented in text-field-logic.ts file in the same folder.
"as<Something>" fields should set corresponding boolean fields values as "true". According to this fields values style, or change component behaviour accordingly.
"asEmail()" should add email validation. It should be implemented in logic and applied to input type="email".

## Files structure
- text-field.ts - contains TextFieldBuilder and responsible for descibing DOM elements.
- text-field-logic.ts - contains logic which TextFieldBuilder is using. Responsible for handling all events and subscriptions.
- text-field-<internal-component>.ts - set of files for internal components, like icons, error message, label.

## Styling
Style according to Material Design 3 
Error and label are small text.
Border should be defined as outline so changing its size is not affecting size of the input.
Height is 48px.
Reserve space for error text only if it is not "as inline error".

### Inline error state
On error set red outline for text field. 
Add error icon on the right inside of text field. 
Clicking this icon shows tooltip with error text close to this icon. Use "showPopover()" method for showing tooltip.
Tooltip should close after 5 seconds or on clicking outside of the tooltip or on clicking the error icon again.