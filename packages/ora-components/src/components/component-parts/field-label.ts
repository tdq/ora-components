import { ComponentBuilder } from '../../core/component-builder';

export class FieldLabelBuilder implements ComponentBuilder {
    private id: string = '';

    withId(id: string): this {
        this.id = id;
        return this;
    }

    build(): HTMLLabelElement {
        const label = document.createElement('label');
        label.htmlFor = this.id;
        label.className = 'md-label-small text-on-surface-variant px-4 mb-1 transition-all duration-200';
        return label;
    }
}
