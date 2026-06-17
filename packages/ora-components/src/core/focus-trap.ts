import { registerDestroy } from './destroyable-element';

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Whether `el` is visible, accounting for hidden ancestors between it and the
 * `container`. We must walk the ancestor chain because getComputedStyle reports an
 * element's OWN display, not 'none', when it merely sits inside a display:none
 * subtree. Without this, focusable elements inside a CLOSED native popover (which
 * stays in the DOM as display:none — e.g. a datepicker calendar after it closes)
 * would still be treated as focusable. The trap could then wrap/recover focus onto
 * one of them; focusing a hidden element silently drops focus to <body>, which is
 * outside the container — breaking the trap entirely.
 */
function isVisible(el: HTMLElement, container: HTMLElement): boolean {
    // Walk from the element up to — but NOT including — the container. We deliberately
    // skip the container itself: its visibility is the caller's concern (e.g. a closed
    // <dialog> is display:none by UA stylesheet, yet the trap may be set up before it
    // opens), and checking it would wrongly hide every element.
    let node: HTMLElement | null = el;
    while (node && node !== container) {
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        node = node.parentElement;
    }
    return true;
}

/**
 * Returns the visible, focusable elements within the container, in DOM order.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter(el => isVisible(el, container));
}

/**
 * Traps focus within the given container, allowing circular Tab navigation.
 * @param container The element to trap focus within.
 */
export function setupFocusTrap(container: HTMLElement): void {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        const focusableElements = getFocusableElements(container);

        if (focusableElements.length === 0) {
            e.preventDefault();
            return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement as HTMLElement;

        // If focus is somehow outside the container, wrap it back in
        if (!activeElement || !container.contains(activeElement)) {
            if (e.shiftKey) {
                lastElement.focus();
            } else {
                firstElement.focus();
            }
            e.preventDefault();
            return;
        }

        if (e.shiftKey) {
            // Shift + Tab: wrap from first to last
            // Wrap if we are at or before the first normally focusable element
            const isAtOrBeforeFirst = activeElement === firstElement || 
                                     firstElement.contains(activeElement) ||
                                     activeElement === container ||
                                     (activeElement.compareDocumentPosition(firstElement) & Node.DOCUMENT_POSITION_FOLLOWING);
            
            if (isAtOrBeforeFirst) {
                lastElement.focus();
                e.preventDefault();
            }
        } else {
            // Tab: wrap from last to first
            // Wrap if we are at or after the last normally focusable element
            const isAtOrAfterLast = activeElement === lastElement || 
                                   lastElement.contains(activeElement) ||
                                   (activeElement.compareDocumentPosition(lastElement) & Node.DOCUMENT_POSITION_PRECEDING);
            
            if (isAtOrAfterLast) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    };

    // Defense in depth: if focus escapes the container by means other than Tab
    // (e.g. a native popover closing and dropping focus onto <body>, or a stray
    // programmatic .focus() elsewhere), pull it back inside. Without this, once
    // document.activeElement lands outside the container, keydown events no longer
    // bubble through it and the Tab-wrap logic above can never re-engage.
    const handleFocusIn = (e: FocusEvent) => {
        const target = e.target as Node | null;
        if (!target || container.contains(target)) return;

        const focusableElements = getFocusableElements(container);
        if (focusableElements.length === 0) return;

        focusableElements[0].focus();
    };

    container.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    // Use registerDestroy to clean up the listeners when the container is removed
    registerDestroy(container, () => {
        container.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('focusin', handleFocusIn);
    });
}
