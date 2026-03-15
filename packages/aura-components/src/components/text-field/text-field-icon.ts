import { FieldAffixBuilder, updateAffixContent } from '../component-parts';
import { Icons } from '@/core/icons';

export function createTextFieldIconContainer(className: string = ''): HTMLElement {
    return new FieldAffixBuilder()
        .withClass(className)
        .build();
}

export function updateIconContent(container: HTMLElement, content: HTMLElement | string | null): void {
    updateAffixContent(container, content);
}

export function createPasswordToggle(onToggle: (isVisible: boolean) => void, isVisible: boolean): HTMLElement {
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'flex items-center justify-center w-6 h-6 rounded-full hover:bg-black/5 transition-colors focus:outline-none text-on-surface-variant';

    const updateIcon = (visible: boolean) => {
        const iconHtml = visible ? Icons.EYE_CLOSED : Icons.EYE_OPEN;
        toggleBtn.innerHTML = iconHtml.replace('<svg', '<svg class="w-5 h-5"');
    };

    updateIcon(isVisible);

    toggleBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        isVisible = !isVisible;
        updateIcon(isVisible);
        onToggle(isVisible);
    };

    return toggleBtn;
}
