import { Observable, of, map } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { LayoutBuilder, LayoutGap } from '../layout/layout';
import { LabelBuilder, LabelSize } from '../label/label';
import { ToolbarBuilder } from '../toolbar';
import { FieldsBuilder } from './fields-builder';
import { FORM_STYLES } from './styles';

export class FormBuilder implements ComponentBuilder {
    private enabled$?: Observable<boolean>;
    private error$?: Observable<string>;
    private caption$?: Observable<string>;
    private description$?: Observable<string>;
    private isGlass: boolean = false;

    private toolbarBuilder?: ToolbarBuilder;
    private fieldsBuilder?: FieldsBuilder;

    withEnabled(enabled: Observable<boolean>): this {
        this.enabled$ = enabled;
        return this;
    }

    withError(error: Observable<string>): this {
        this.error$ = error;
        return this;
    }

    withCaption(caption: Observable<string>): this {
        this.caption$ = caption;
        return this;
    }

    withDescription(description: Observable<string>): this {
        this.description$ = description;
        return this;
    }

    asGlass(isGlass: boolean = true): this {
        this.isGlass = isGlass;
        return this;
    }

    withToolbar(): ToolbarBuilder {
        this.toolbarBuilder = new ToolbarBuilder();
        return this.toolbarBuilder;
    }

    withFields(columnsAmount?: number): FieldsBuilder {
        this.fieldsBuilder = new FieldsBuilder(columnsAmount);
        return this.fieldsBuilder;
    }

    build(): HTMLElement {
        // Prepare container classes and reactivity
        const layout = new LayoutBuilder()
            .asVertical()
            .withGap(LayoutGap.EXTRA_LARGE);

        // 1. Header (Caption & Description)
        const headerLayout = new LayoutBuilder()
            .asVertical()
            .withGap(LayoutGap.SMALL)
            .withClass(of(FORM_STYLES.header));

        if (this.caption$) {
            headerLayout.addSlot()
                .withContent(new LabelBuilder()
                    .withCaption(this.caption$)
                    .withClass(of(FORM_STYLES.caption)))
                .withVisible(this.caption$.pipe(map(text => !!text)));
        }

        if (this.description$) {
            headerLayout.addSlot()
                .withContent(new LabelBuilder()
                    .withCaption(this.description$)
                    .withClass(of(FORM_STYLES.description)))
                .withVisible(this.description$.pipe(map(text => !!text)));
        }

        layout.addSlot().withContent(headerLayout);

        // 2. Fields
        if (this.fieldsBuilder) {
            if (this.enabled$) this.fieldsBuilder.withEnabled(this.enabled$);
            this.fieldsBuilder.asGlass(this.isGlass);
            layout.addSlot().withContent(this.fieldsBuilder);
        }

        // 3. Error message
        if (this.error$) {
            layout.addSlot()
                .withContent(new LabelBuilder()
                    .withCaption(this.error$)
                    .withSize(LabelSize.SMALL)
                    .withClass(of(FORM_STYLES.error)))
                .withVisible(this.error$.pipe(map(text => !!text)));
        }

        // 4. Toolbar
        if (this.toolbarBuilder) {
            if (this.enabled$) this.toolbarBuilder.withEnabled(this.enabled$);

            if (this.isGlass) {
                this.toolbarBuilder.asGlass();
            }

            layout.addSlot().withContent(this.toolbarBuilder);
        }

        return layout.build();
    }
}
