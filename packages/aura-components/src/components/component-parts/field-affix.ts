import { ComponentBuilder } from '../../core/component-builder';

export class FieldAffixBuilder implements ComponentBuilder {
    private className: string = '';

    withClass(className: string): this {
        this.className = className;
        return this;
    }

    build(): HTMLElement {
        const container = document.createElement('div');
        container.className = `flex items-center justify-center text-on-surface-variant ${this.className}`;
        return container;
    }
}

export function updateAffixContent(container: HTMLElement, content: HTMLElement | string | null): void {
    container.innerHTML = '';
    if (!content) {
        container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');
    if (typeof content === 'string') {
        container.innerHTML = content;
    } else {
        container.appendChild(content);
    }
}
