Form is a custom component which allows to build forms by combining different fields.
It has the folowing methods:
- withEnabled(enabled: Observable<boolean>): this - sets enabled state of the whole form.
- withError(error: Observable<string>): this - sets error of the whole form.
- withCaption(caption: Observable<string>): this - sets label of the form.
- withDescription(description: Observable<string>): this - sets description of the form.
- asGlass(): this - sets special styling option for form and its fields as transparent with blur background (glass effect). 
- withToolbar(): ToolbarBuilder - defines toolbar in the form.
- withFields(columnsAmount?: number): FieldsBuilder - defines fields which are displayed in the form.

## FieldsBuilder
Defines which fields should be displayed in the form.
It has the folowing methods:
- addTextField(column?: number, colspan?: number): TextFieldBuilder - adds text field component into the form.
- addNumberField(column?: number, colspan?: number): NumberFieldBuilder - adds number field component into the form.
- addComboBoxField(column?: number, colspan?: number): ComboBoxBuilder - adds dropdown field component into the form.
- addDatePickerField(column?: number, colspan?: number): DatePickerBuilder - adds datepicker component into the form.
- addCheckBox(column?: number, colspan?: number): CheckBoxBuilder - adds checkbox field component into the form.

"column" - defines number of column in which this component should be displayed.
"colspan" - defines amount of columns this component takes (width in columns amount).

## Style
Style according to Material Design 3 
Error and description are small text.
Caption is a big text.
FormBuilder should use LayoutBuilder as a basis.
LayoutBuilder should have large gap.
Form error message should be displayed above toolbar.
Toolbar should be on the bottom of the form.
Glass effect applied only for fields and toolbar. Form itself is not affected by glass effect.