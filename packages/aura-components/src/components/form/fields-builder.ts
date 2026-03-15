import { Observable } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { TextFieldBuilder } from '../text-field/text-field';
import { NumberFieldBuilder } from '../number-field/number-field';
import { ComboBoxBuilder } from '../combobox';
import { DatePickerBuilder } from '../date-picker';
import { CheckboxBuilder } from '../checkbox';
import { LabelBuilder, LabelSize } from '../label';
import { IFieldsBuilder } from './types';
import { FORM_STYLES } from './styles';

interface FormFieldBuilder extends ComponentBuilder {
    withEnabled?(enabled: Observable<boolean>): any;
    asGlass?(isGlass: boolean): any;
}

interface FieldConfig {
    builder: FormFieldBuilder;
    column?: number;
    colspan?: number;
}

export class FieldsBuilder implements IFieldsBuilder {
    private fields: FieldConfig[] = [];
    private columnsAmount = 1;
    private enabled$?: Observable<boolean>;
    private isGlass: boolean = false;

    constructor(columnsAmount: number = 1) {
        this.columnsAmount = columnsAmount;
    }

    addTextField(column?: number, colspan?: number): TextFieldBuilder {
        return this.addField(new TextFieldBuilder(), column, colspan);
    }

    addPasswordField(column?: number, colspan?: number): TextFieldBuilder {
        return this.addField(new TextFieldBuilder().asPassword(), column, colspan);
    }

    addEmailField(column?: number, colspan?: number): TextFieldBuilder {
        return this.addField(new TextFieldBuilder().asEmail(), column, colspan);
    }

    addNumberField(column?: number, colspan?: number): NumberFieldBuilder {
        return this.addField(new NumberFieldBuilder(), column, colspan);
    }

    addComboBoxField(column?: number, colspan?: number): ComboBoxBuilder<any> {
        return this.addField(new ComboBoxBuilder(), column, colspan);
    }

    addDatePickerField(column?: number, colspan?: number): DatePickerBuilder {
        return this.addField(new DatePickerBuilder(), column, colspan);
    }

    addCheckBox(column?: number, colspan?: number): CheckboxBuilder {
        return this.addField(new CheckboxBuilder(), column, colspan);
    }

    addHeading(column?: number, colspan?: number): LabelBuilder {
        return this.addField(new LabelBuilder().withSize(LabelSize.MEDIUM), column, colspan);
    }

    private addField<T extends FormFieldBuilder>(builder: T, column?: number, colspan?: number): T {
        this.fields.push({ builder, column, colspan });
        return builder;
    }

    withEnabled(enabled: Observable<boolean>): this {
        this.enabled$ = enabled;
        return this;
    }

    asGlass(isGlass: boolean = true): this {
        this.isGlass = isGlass;
        return this;
    }

    build(): HTMLElement {
        const container = document.createElement('div');
        container.className = FORM_STYLES.fields;

        // Dynamic grid columns based on columnsAmount
        container.style.gridTemplateColumns = `repeat(${this.columnsAmount}, 1fr)`;

        this.fields.forEach(field => {
            // Apply common properties to fields that support them
            if (this.enabled$ && field.builder.withEnabled) {
                field.builder.withEnabled(this.enabled$);
            }
            if (field.builder.asGlass) {
                field.builder.asGlass(this.isGlass);
            }

            const fieldEl = field.builder.build();

            // Handle grid positioning
            if (field.column) {
                fieldEl.style.gridColumnStart = `${field.column}`;
            }
            if (field.colspan) {
                fieldEl.style.gridColumn = `span ${field.colspan}`;
            }

            container.appendChild(fieldEl);
        });

        return container;
    }
}
