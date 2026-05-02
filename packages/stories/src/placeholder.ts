import { ComponentBuilder } from '@tdq/ora-components';

export class Placeholder implements ComponentBuilder {
    constructor(private text: string, private color: string = '#E5E7EB') { }

    build(): HTMLElement {
        const element = document.createElement('div');
        element.className = 'w-full h-full min-h-[50px] flex items-center justify-center border-2 border-dashed border-gray-400 rounded-lg';
        element.style.backgroundColor = this.color;
        element.innerHTML = `<span class="text-gray-600 font-medium">${this.text}</span>`;
        return element;
    }
}

export function createPlaceholder(text: string, color?: string): Placeholder {
    return new Placeholder(text, color);
}
