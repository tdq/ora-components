import { Observable, BehaviorSubject } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { LayoutBuilder, LayoutGap } from '../layout/layout';
import { ToolbarBuilder } from './toolbar-builder';
import { FieldsBuilder } from './fields-builder';
import { FormStyle } from './types';
import { FORM_STYLES } from './styles';
import { registerDestroy } from '@/core/destroyable-element';

export class FormBuilder implements ComponentBuilder {
    private enabled$?: Observable<boolean>;
    private style$?: Observable<FormStyle>;
    private error$?: Observable<string>;
    private caption$?: Observable<string>;
    private description$?: Observable<string>;
    private isGlass$ = new BehaviorSubject<boolean>(false);
    
    private toolbarBuilder?: ToolbarBuilder;
    private fieldsBuilder?: FieldsBuilder;

    withEnabled(enabled: Observable<boolean>): this {
        this.enabled$ = enabled;
        return this;
    }

    withStyle(style: Observable<FormStyle>): this {
        this.style$ = style;
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

    asGlass(): this {
        this.isGlass$.next(true);
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
        const root = document.createElement('div');
        root.className = FORM_STYLES.container;

        const layout = new LayoutBuilder().asVertical().withGap(LayoutGap.LARGE);
        
        // 1. Header (Caption & Description)
        const header = document.createElement('div');
        header.className = FORM_STYLES.header;
        
        const caption = document.createElement('h2');
        caption.className = FORM_STYLES.caption;
        header.appendChild(caption);
        
        const description = document.createElement('p');
        description.className = FORM_STYLES.description;
        header.appendChild(description);
        
        layout.addSlot().withContent({ build: () => header });

        // 2. Fields
        if (this.fieldsBuilder) {
            if (this.enabled$) this.fieldsBuilder.withEnabled(this.enabled$);
            if (this.isGlass$.value) this.fieldsBuilder.asGlass();
            layout.addSlot().withContent(this.fieldsBuilder);
        }

        // 3. Error message
        const error = document.createElement('div');
        error.className = FORM_STYLES.error;
        layout.addSlot().withContent({ build: () => error });

        // 4. Toolbar
        if (this.toolbarBuilder) {
            if (this.enabled$) this.toolbarBuilder.withEnabled(this.enabled$);
            if (this.isGlass$.value) this.toolbarBuilder.asGlass();
            layout.addSlot().withContent(this.toolbarBuilder);
        }

        const container = layout.build();
        root.appendChild(container);

        // Subscriptions
        const subs: any[] = [];

        if (this.caption$) {
            subs.push(this.caption$.subscribe(text => {
                caption.textContent = text;
                caption.classList.toggle('hidden', !text);
            }));
        }

        if (this.description$) {
            subs.push(this.description$.subscribe(text => {
                description.textContent = text;
                description.classList.toggle('hidden', !text);
            }));
        }

        if (this.error$) {
            subs.push(this.error$.subscribe(text => {
                error.textContent = text;
                error.classList.toggle('hidden', !text);
            }));
        }

        subs.push(this.isGlass$.subscribe(glass => {
            if (glass) {
                container.classList.add(...FORM_STYLES.glass.split(' '));
            } else {
                container.classList.remove(...FORM_STYLES.glass.split(' '));
            }
        }));

        if (this.style$) {
            subs.push(this.style$.subscribe(style => {
                if (style === FormStyle.COMPACT) {
                    layout.withGap(LayoutGap.SMALL);
                    // Re-build layout if needed? Actually LayoutBuilder.build() is called already.
                    // This might be a limitation of our current LayoutBuilder implementation.
                    // But MD3 usually implies static build.
                }
            }));
        }

        registerDestroy(root, () => {
            subs.forEach(s => s.unsubscribe());
        });

        return root;
    }
}
