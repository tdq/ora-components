import { Observable, BehaviorSubject } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { TextFieldBuilder } from '../text-field/text-field';
import { NumberFieldBuilder } from '../number-field/number-field';
import { ComboBoxBuilder } from '../combobox';
import { DatePickerBuilder } from '../date-picker';
import { CheckboxBuilder } from '../checkbox';
import { LabelBuilder, LabelSize } from '../label';
import { IFieldsBuilder } from './types';
import { FORM_STYLES } from './styles';

interface FieldConfig {
    builder: ComponentBuilder & { withEnabled?(enabled: Observable<boolean>): any; asGlass?(): any };
    column?: number;
    colspan?: number;
}

export class FieldsBuilder implements IFieldsBuilder {
    private fields: FieldConfig[] = [];
    private columnsAmount = 1;
    private enabled$?: Observable<boolean>;
    private isGlass$ = new BehaviorSubject<boolean>(false);

    constructor(columnsAmount: number = 1) {
        this.columnsAmount = columnsAmount;
    }

    addTextField(column?: number, colspan?: number): TextFieldBuilder {
        const builder = new TextFieldBuilder();
        this.fields.push({ builder, column, colspan });
        return builder;
    }

    addNumberField(column?: number, colspan?: number): NumberFieldBuilder {
        const builder = new NumberFieldBuilder();
        this.fields.push({ builder, column, colspan });
        return builder;
    }

    addComboBoxField(column?: number, colspan?: number): ComboBoxBuilder<any> {
        const builder = new ComboBoxBuilder();
        this.fields.push({ builder, column, colspan });
        return builder;
    }

    addDatePickerField(column?: number, colspan?: number): DatePickerBuilder {
        const builder = new DatePickerBuilder();
        this.fields.push({ builder, column, colspan });
        return builder;
    }

    addCheckBox(column?: number, colspan?: number): CheckboxBuilder {
        const builder = new CheckboxBuilder();
        this.fields.push({ builder, column, colspan });
        return builder;
    }

    addHeading(column?: number, colspan?: number): LabelBuilder {
        const builder = new LabelBuilder().withSize(LabelSize.MEDIUM);
        this.fields.push({ builder, column, colspan });
        return builder;
    }

    withEnabled(enabled: Observable<boolean>): this {
        this.enabled$ = enabled;
        return this;
    }

    asGlass(): this {
        this.isGlass$.next(true);
        return this;
    }

    build(): HTMLElement {
        const container = document.createElement('div');
        container.className = FORM_STYLES.fields;
        container.style.display = 'grid';
        container.style.gridTemplateColumns = `repeat(${this.columnsAmount}, 1fr)`;
        container.style.gap = '1rem'; // Large gap

        this.fields.forEach(field => {
            if (this.enabled$ && field.builder.withEnabled) {
                field.builder.withEnabled(this.enabled$);
            }
            if (this.isGlass$.value && field.builder.asGlass) {
                field.builder.asGlass();
            }

            const fieldEl = field.builder.build();
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
