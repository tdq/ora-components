import { ComponentBuilder } from '../../core/component-builder';
import { registerDestroy } from '@/core/destroyable-element';
import { Icons } from '@/core/icons';

export class ErrorPopoverBuilder implements ComponentBuilder {
    private errorText: string = '';

    withError(error: string): this {
        this.errorText = error;
        return this;
    }

    build(): HTMLElement {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'flex items-center justify-center w-6 h-6 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none';
        button.setAttribute('aria-label', `Error: ${this.errorText}`);
        button.innerHTML = Icons.ERROR.replace('<svg', '<svg class="w-5 h-5 text-error"');

        const popover = document.createElement('div');
        popover.setAttribute('popover', 'auto');
        popover.className = 'error-popover bg-error text-on-error md-label-small px-3 py-2 rounded-small elevation-2 max-w-xs transition-opacity duration-200';
        popover.textContent = this.errorText;

        const dialog = button.closest('dialog');
        if (dialog) {
            dialog.appendChild(popover);
        } else {
            document.body.appendChild(popover);
        }

        let timeoutId: ReturnType<typeof setTimeout> | null = null;
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
}
