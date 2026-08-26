# Form

## Description
Form is a custom component which allows to build forms by combining different fields.
It has the folowing methods:
- `withEnabled(enabled: Observable<boolean>): this` - sets enabled state of the whole form.
- `withError(error: Observable<string>): this` - sets error of the whole form.
- `withCaption(caption: Observable<string>): this` - sets label of the form.
- `withDescription(description: Observable<string>): this` - sets description of the form.
- `asGlass(): this` - sets special styling option for form and its fields as transparent with blur background (glass effect). 
- `withToolbar(): ToolbarBuilder` - defines toolbar in the form.
- `withFields(columnsAmount?: number): FieldsBuilder` - defines fields which are displayed in the form.

## FieldsBuilder
Defines which fields should be displayed in the form.
It has the folowing methods:
- `addTextField(column?: number, colspan?: number): TextFieldBuilder` - adds text field component into the form.
- `addNumberField(column?: number, colspan?: number): NumberFieldBuilder` - adds number field component into the form.
- `addComboBoxField(column?: number, colspan?: number): ComboBoxBuilder` - adds dropdown field component into the form.
- `addDatePickerField(column?: number, colspan?: number): DatePickerBuilder` - adds datepicker component into the form.
- `addCheckBox(column?: number, colspan?: number): CheckBoxBuilder` - adds checkbox field component into the form.
- `addPasswordField(column?: number, colspan?: number): TextFieldBuilder` - adds password field into the form.
- `addEmailField(column?: number, colspan?: number): TextFieldBuilder` - adds email field with validation into the form.
- `addMoneyField(column?: number, colspan?: number): MoneyFieldBuilder` - adds money field component into the form.
- `addHeading(column?: number, colspan?: number): LabelBuilder` - adds a heading label into the field grid.
- `addCustom<T extends FormFieldBuilder>(builder: T, column?: number, colspan?: number): T` - adds any `ComponentBuilder` into the field grid, in the same cell container as the built-in fields, and returns it for chaining. The constraint is `FormFieldBuilder` (exported from `form/types.ts`) rather than bare `ComponentBuilder`: `FieldsBuilder.build()` duck-types on `withEnabled` / `asGlass`, and `withEnabled` is called with an `Observable<boolean>`, so the typed gate is what stops a builder with an incompatible `withEnabled(boolean)` from compiling and then silently misbehaving. Both members are optional on `FormFieldBuilder`, so a plain builder still passes.

"column" - defines number of column in which this component should be displayed.
"colspan" - defines amount of columns this component takes (width in columns amount).

Placement maps to CSS grid as: column only -> `grid-column-start: <col>`; colspan only -> `grid-column: span <n>`; both -> the shorthand `grid-column: <col> / span <n>` (the shorthand is required when both are given, otherwise it would reset the start back to `auto`).

## Styling
Style according to Material Design 3
Error and description are small text.
Caption is a big text.
FormBuilder should use LayoutBuilder as a basis.
LayoutBuilder should have large gap.
Form error message should be displayed above toolbar.
Toolbar should be on the bottom of the form.

### Field error state
Fields in error state render a 1px outline border **outside** the input wrapper (`outline-1 outline-offset-1 outline-error`). This is implemented in `text-field-logic.ts` via `getValidationClasses()` and applies to all text-based fields.

### Glass effect
Glass effect applied only for fields and toolbar. **Form itself is not affected by glass effect**.

`FieldsBuilder.build()` calls a field's `asGlass()` **only when the form itself is glass** (`if (this.isGlass && field.builder.asGlass)`). Field builders' `asGlass()` implementations do not all honour a `false` argument — several ignore the parameter and always enable glass — so passing `asGlass(this.isGlass)` unconditionally used to glass the fields of a non-glass form.