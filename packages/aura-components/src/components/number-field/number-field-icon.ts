export function createNumberFieldIcon(content: HTMLElement | string): HTMLElement {
    if (content instanceof HTMLElement) return content;

    const span = document.createElement('span');
    span.className = 'body-large text-on-surface-variant select-none';
    span.textContent = content;
    return span;
}
