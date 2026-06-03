export function renderStatusChip(status: string): HTMLElement {
    const chip = document.createElement('span');
    chip.className = 'px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200';
    
    // Apply theme-aware styling based on status
    if (status === 'Completed' || status === 'Delivered' || status === 'Active') {
        // Primary colors (success)
        chip.style.backgroundColor = 'var(--md-sys-color-primary-container)';
        chip.style.color = 'var(--md-sys-color-on-primary-container)';
    } else if (status === 'Pending' || status === 'Processing') {
        // Secondary colors (warning)
        chip.style.backgroundColor = 'var(--md-sys-color-secondary-container)';
        chip.style.color = 'var(--md-sys-color-on-secondary-container)';
    } else if (status === 'Failed' || status === 'Cancelled' || status === 'Inactive') {
        // Error container colors (softer than error)
        chip.style.backgroundColor = 'var(--md-sys-color-error-container, rgba(242, 184, 181, 0.2))';
        chip.style.color = 'var(--md-sys-color-on-error-container, #601410)';
    } else if (status === 'Shipped') {
        // Tertiary colors
        chip.style.backgroundColor = 'var(--md-sys-color-tertiary-container, rgba(103, 80, 164, 0.2))';
        chip.style.color = 'var(--md-sys-color-on-tertiary-container, #6750A4)';
    } else {
        // Default fallback for unknown statuses
        chip.style.backgroundColor = 'var(--md-sys-color-surface-variant)';
        chip.style.color = 'var(--md-sys-color-on-surface-variant)';
    }
    
    chip.textContent = status;
    return chip;
}