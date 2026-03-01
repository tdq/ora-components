export function createTextFieldLabel(id: string): HTMLLabelElement {
    const label = document.createElement('label');
    label.htmlFor = id;
    label.className = 'md-label-small text-on-surface-variant px-4 mb-1 transition-all duration-200';
    return label;
}
