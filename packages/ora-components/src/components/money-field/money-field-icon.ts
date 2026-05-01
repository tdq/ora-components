export function createMoneyFieldIcon(content: HTMLElement | string): HTMLElement {
    const container = document.createElement('span');
    container.className = 'flex items-center justify-center w-6 h-6';
    
    if (content instanceof HTMLElement) {
        container.appendChild(content);
    } else {
        const span = document.createElement('span');
        span.className = 'material-symbols-outlined text-on-surface-variant';
        span.textContent = content;
        container.appendChild(span);
    }
    
    return container;
}