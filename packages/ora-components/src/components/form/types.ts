import { Observable } from 'rxjs';
import { TextFieldBuilder } from '../text-field/text-field';
import { NumberFieldBuilder } from '../number-field/number-field';
import { ComboBoxBuilder } from '../combobox';
import { DatePickerBuilder } from '../date-picker';
import { CheckboxBuilder } from '../checkbox';
import { LabelBuilder } from '../label';
import { MoneyFieldBuilder } from '../money-field';
import { ComponentBuilder } from '../../core/component-builder';

export interface FormFieldBuilder extends ComponentBuilder {
    withEnabled?(enabled: Observable<boolean>): any;
    asGlass?(isGlass?: boolean): any;
}

export interface IFieldsBuilder {
    addTextField(column?: number, colspan?: number): TextFieldBuilder;
    addPasswordField(column?: number, colspan?: number): TextFieldBuilder;
    addEmailField(column?: number, colspan?: number): TextFieldBuilder;
    addNumberField(column?: number, colspan?: number): NumberFieldBuilder;
    addMoneyField(column?: number, colspan?: number): MoneyFieldBuilder;
    addComboBoxField(column?: number, colspan?: number): ComboBoxBuilder<any>;
    addDatePickerField(column?: number, colspan?: number): DatePickerBuilder;
    addCheckBox(column?: number, colspan?: number): CheckboxBuilder;
    addHeading(column?: number, colspan?: number): LabelBuilder;
    addCustom<T extends FormFieldBuilder>(builder: T, column?: number, colspan?: number): T;
}
