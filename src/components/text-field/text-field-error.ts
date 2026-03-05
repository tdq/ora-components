import { registerDestroy } from '@/core/destroyable-element';

export function createTextFieldSupportText(id: string): HTMLElement {
    const supportText = document.createElement('span');
    supportText.id = id;
    supportText.className = 'md-label-small transition-all duration-200 text-error';
    supportText.setAttribute('aria-live', 'polite');
    return supportText;
}

export function createTextFieldError(errorText: string): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'flex items-center justify-center w-6 h-6 rounded-full hover:bg-black/5 transition-colors focus:outline-none';
    button.setAttribute('aria-label', `Error: ${errorText}`);
    button.innerHTML = `
        <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current text-error">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
    `;

    const popover = document.createElement('div');
    popover.setAttribute('popover', 'auto');
    popover.className = 'error-popover bg-error text-on-error md-label-small px-3 py-2 rounded-small elevation-2 max-w-xs transition-opacity duration-200';
    popover.textContent = errorText;
    document.body.appendChild(popover);

    let timeoutId: any = null;
    let isVisible = false;

    const closePopover = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        if ((popover as any).hidePopover) {
            (popover as any).hidePopover();
        } else {
            popover.style.display = 'none';
        }
        isVisible = false;
    };

    const showPopover = () => {
        const rect = button.getBoundingClientRect();
        popover.style.position = 'absolute';
        popover.style.margin = '0';

        // Initial horizontal center relative to button
        const leftBase = rect.left + rect.width / 2;
        const topBase = rect.top - 8;

        popover.style.left = `${leftBase + window.scrollX}px`;
        popover.style.top = `${topBase + window.scrollY}px`;
        popover.style.transform = 'translate(-50%, -100%)';

        if ((popover as any).showPopover) {
            (popover as any).showPopover();
        } else {
            popover.style.display = 'block';
        }

        // Viewport boundary check
        const popoverRect = popover.getBoundingClientRect();
        const padding = 8;
        let finalLeft = leftBase + window.scrollX;

        if (popoverRect.left < padding) {
            finalLeft += (padding - popoverRect.left);
        } else if (popoverRect.right > window.innerWidth - padding) {
            finalLeft -= (popoverRect.right - (window.innerWidth - padding));
        }

        popover.style.left = `${finalLeft}px`;
        isVisible = true;

        // Auto-close after 5 seconds
        timeoutId = setTimeout(closePopover, 5000);
    };

    button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isVisible) {
            closePopover();
        } else {
            showPopover();
        }
    };

    // Listen for open/close events to keep isVisible in sync (e.g. click outside)
    popover.addEventListener('toggle', (event: any) => {
        isVisible = event.newState === 'open';
        if (event.newState === 'closed' && timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    });

    registerDestroy(button, () => popover.remove());

    return button;
}
