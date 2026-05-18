/**
 * Creates a styled action log element.
 * Log entries are prepended (newest first) with a timestamp and message.
 */
export function createActionLog(): { element: HTMLElement; log: (msg: string) => void } {
    const element = document.createElement('div');
    element.className = 'mt-4 p-3 bg-surface-container-low rounded border border-outline/10 text-xs font-mono max-h-32 overflow-y-auto';
    element.innerHTML = '<div class="opacity-50 italic font-sans text-sm">Actions appear here...</div>';

    const log = (msg: string): void => {
        const placeholder = element.querySelector('.italic');
        if (placeholder) placeholder.remove();

        const entry = document.createElement('div');
        entry.className = 'py-1 border-b border-outline/5 last:border-0';
        const now = new Date();
        const timestamp = now.toLocaleTimeString('en-US', { hour12: false });
        entry.innerHTML = `<span class="text-primary font-bold">[${timestamp}]</span> ${msg}`;
        element.prepend(entry);
    };

    return { element, log };
}
