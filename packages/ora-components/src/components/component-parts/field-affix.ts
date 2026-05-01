import { Observable, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { registerDestroy } from '../../core/destroyable-element';

export class FieldAffixBuilder implements ComponentBuilder {
    private className$: Observable<string> = of('');

    withClass(className: Observable<string>): this {
        this.className$ = className;
        return this;
    }

    build(): HTMLElement {
        const container = document.createElement('div');
        container.className = `flex items-center justify-center text-on-surface-variant`;

        const sub = this.className$.subscribe(cls => {
            container.className = `flex items-center justify-center text-on-surface-variant${cls ? ' ' + cls : ''}`;
        });

        registerDestroy(container, () => sub.unsubscribe());
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
