export function createNumberFieldLabel(id: string): HTMLLabelElement {
    const label = document.createElement('label');
    label.htmlFor = id;
    label.className = 'md-label-small text-on-surface-variant px-px-16 mb-px-4 transition-all duration-200 hidden';
    return label;
}
