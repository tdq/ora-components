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
        .filter(el => isVisible(el, container))
        // A disabled button/input/select/textarea can never actually receive focus —
        // calling .focus() on it is a silent no-op in real browsers. Filtering this in
        // JS (rather than adding :not(:disabled) to the selector) is required because
        // these elements also get an explicit tabindex="0" (for Safari Tab support),
        // so they'd still match the `[tabindex]` branch of FOCUSABLE_SELECTOR even with
        // :not(:disabled) on their own branch. Treating them as a stop in the tab
        // sequence breaks both the wrap-around and the focusin recovery, letting focus
        // get stuck or escape the container entirely.
        .filter(el => !(el as HTMLButtonElement | HTMLInputElement).disabled);
}

/**
 * Traps focus within the given container, allowing circular Tab navigation.
 * @param container The element to trap focus within.
 */
export function setupFocusTrap(container: HTMLElement): void {
    // We drive Tab navigation entirely ourselves rather than letting the browser
    // move focus and only correcting at the boundaries. Safari's default keyboard
    // navigation only tabs between form fields and SKIPS <button>/<a> elements
    // (unless macOS "Full Keyboard Access" is enabled). Relying on native Tab there
    // makes toolbar buttons unreachable and, because the trap's "last element" is
    // often a button that Safari never focuses, the boundary wrap never engages and
    // focus escapes the dialog. Computing the next/previous focusable ourselves and
    // always calling preventDefault makes navigation deterministic across browsers.
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        const focusableElements = getFocusableElements(container);

        if (focusableElements.length === 0) {
            e.preventDefault();
            return;
        }

        e.preventDefault();

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement as HTMLElement | null;

        // If focus is outside the container (or on the container itself), enter at
        // the appropriate end.
        if (!activeElement || !container.contains(activeElement)) {
            (e.shiftKey ? lastElement : firstElement).focus();
            return;
        }

        // Find where we currently are. The active element may be a focusable element
        // itself, or a descendant of one (e.g. focus inside a composite widget), so
        // fall back to the nearest ancestor that is in the focusable list.
        let currentIndex = focusableElements.indexOf(activeElement);
        if (currentIndex === -1) {
            currentIndex = focusableElements.findIndex(el => el.contains(activeElement));
        }

        // Unknown position (e.g. focus on the container itself): enter at the end
        // matching the direction.
        if (currentIndex === -1) {
            (e.shiftKey ? lastElement : firstElement).focus();
            return;
        }

        if (e.shiftKey) {
            const prev = currentIndex === 0 ? lastElement : focusableElements[currentIndex - 1];
            prev.focus();
        } else {
            const next = currentIndex === focusableElements.length - 1 ? firstElement : focusableElements[currentIndex + 1];
            next.focus();
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
