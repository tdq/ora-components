NumberField component is a component that allows the user to enter and edit numbers.
It has the folowing methods:
- withValue(value: Subject<number>): this - sets value of the number field.
- withPlaceholder(placeholder: Observable<string>): this - sets placeholder of the number field.
- withEnabled(enabled: Observable<boolean>): this - sets enabled state of the number field.
- withStyle(style: Observable<TextFieldStyle>): this - sets style of the number field.
- withError(error: Observable<string>): this - sets error of the text field.
- withLabel(label: Observable<string>): this - sets label of the text field.
- withClass(className: Observable<string>): this - sets class css name of the text field.
- withFormat(format: Observable<string>):this - sets format of number
- withMinValue(min: Observable<number>): this - sets minimum allowed value
- withMaxValue(max: Observable<number>): this - sets maximum allowed value
- asGlass(): this - sets special styling option for textfield and its popup with items as transparent with blur background (glass effect). 

NumberField style is an enum with the following values:
- tonal
- outlined

## Requirements
It should not allow to type anything except what format defines.
Numbers are right aligned but placeholder is on the left.

## Style
Style according to Material Design 3 
Error and label are small text.
Border should be defined as outline so changing its size is not affecting size of the input.
Height is 48px