export function createTextFieldIconContainer(className: string = ''): HTMLElement {
    const container = document.createElement('div');
    container.className = `flex items-center justify-center text-on-surface-variant ${className}`;
    return container;
}

export function updateIconContent(container: HTMLElement, content: HTMLElement | string | null): void {
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

export function createPasswordToggle(onToggle: (isVisible: boolean) => void, isVisible: boolean): HTMLElement {
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'flex items-center justify-center w-6 h-6 rounded-full hover:bg-black/5 transition-colors focus:outline-none text-on-surface-variant';

    const updateIcon = (visible: boolean) => {
        toggleBtn.innerHTML = visible
            ? '<svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.82l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.74-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.03 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.34-1.2l3.33 3.33.03-.4c0-1.66-1.34-3-3-3l-.4.07z"/></svg>'
            : '<svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
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
