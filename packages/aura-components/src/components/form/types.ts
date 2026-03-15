import { TextFieldBuilder } from '../text-field/text-field';
import { NumberFieldBuilder } from '../number-field/number-field';
import { ComboBoxBuilder } from '../combobox';
import { DatePickerBuilder } from '../date-picker';
import { CheckboxBuilder } from '../checkbox';
import { LabelBuilder } from '../label';

export interface IFieldsBuilder {
    addTextField(column?: number, colspan?: number): TextFieldBuilder;
    addPasswordField(column?: number, colspan?: number): TextFieldBuilder;
    addEmailField(column?: number, colspan?: number): TextFieldBuilder;
    addNumberField(column?: number, colspan?: number): NumberFieldBuilder;
    addComboBoxField(column?: number, colspan?: number): ComboBoxBuilder<any>;
    addDatePickerField(column?: number, colspan?: number): DatePickerBuilder;
    addCheckBox(column?: number, colspan?: number): CheckboxBuilder;
    addHeading(column?: number, colspan?: number): LabelBuilder;
}
