import { ComponentBuilder } from '../../core/component-builder';

export class FieldSupportTextBuilder implements ComponentBuilder {
    private id: string = '';

    withId(id: string): this {
        this.id = id;
        return this;
    }

    build(): HTMLElement {
        const supportText = document.createElement('span');
        supportText.id = this.id;
        supportText.className = 'md-label-small transition-all duration-200 text-error';
        supportText.setAttribute('aria-live', 'polite');
        return supportText;
    }
}
