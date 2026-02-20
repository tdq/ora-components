TextField component is a component that allows the user to enter and edit text.
It has the folowing methods:
- withValue(value: Subject<string>): this - sets value of the text field.
- withPlaceholder(placeholder: Observable<string>): this - sets placeholder of the text field.
- withEnabled(enabled: Observable<boolean>): this - sets enabled state of the text field.
- withStyle(style: Observable<TextFieldStyle>): this - sets style of the text field.
- withError(error: Observable<string>): this - sets error of the text field.
- withLabel(label: Observable<string>): this - sets label of the text field.
- withClass(className: Observable<string>): this - sets class css name of the text field.
- asGlass(): this - sets special styling option for textfield and its popup with items as transparent with blur background (glass effect). 

TextField style is an enum with the following values:
- tonal
- outlined

## Style
Style according to Material Design 3 
Error and label are small text.
Border should be defined as outline so changing its size is not affecting size of the input.