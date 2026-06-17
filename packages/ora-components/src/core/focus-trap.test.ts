import { setupFocusTrap } from './focus-trap';

describe('setupFocusTrap', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    function buildContainer(): { container: HTMLElement; first: HTMLInputElement; last: HTMLButtonElement } {
        const container = document.createElement('div');
        const first = document.createElement('input');
        first.id = 'first';
        const last = document.createElement('button');
        last.id = 'last';
        container.appendChild(first);
        container.appendChild(last);
        document.body.appendChild(container);
        return { container, first, last };
    }

    it('wraps focus from last to first element on Tab', () => {
        const { container, first, last } = buildContainer();
        setupFocusTrap(container);

        last.focus();
        last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

        expect(document.activeElement).toBe(first);
    });

    it('wraps focus from first to last element on Shift+Tab', () => {
        const { container, first, last } = buildContainer();
        setupFocusTrap(container);

        first.focus();
        first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));

        expect(document.activeElement).toBe(last);
    });

    it('pulls focus back inside when focus escapes to <body> (popover-close scenario)', () => {
        const { container, first } = buildContainer();
        setupFocusTrap(container);

        // Simulate a native popover closing and dropping focus onto <body>:
        // a focusin event whose target is outside the container.
        document.body.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

        expect(document.activeElement).toBe(first);
    });

    it('pulls focus back when a sibling element outside the container is focused', () => {
        const { container, first } = buildContainer();
        setupFocusTrap(container);

        const outside = document.createElement('input');
        outside.id = 'outside';
        document.body.appendChild(outside);

        outside.focus();

        expect(document.activeElement).toBe(first);
    });

    it('does not steal focus when focus moves between elements inside the container', () => {
        const { container, last } = buildContainer();
        setupFocusTrap(container);

        last.focus();

        expect(document.activeElement).toBe(last);
    });

    it('ignores focusable elements inside a display:none subtree (closed popover)', () => {
        const { container, first, last } = buildContainer();

        // Simulate a closed native popover that remains in the DOM (display:none)
        // with its own focusable descendants — e.g. a datepicker calendar after close.
        const closedPopover = document.createElement('div');
        closedPopover.setAttribute('popover', 'manual');
        closedPopover.style.display = 'none';
        const hiddenBtn = document.createElement('button');
        hiddenBtn.id = 'hidden-in-popover';
        closedPopover.appendChild(hiddenBtn);
        container.appendChild(closedPopover);

        setupFocusTrap(container);

        // Tab from the last visible element must wrap to the first VISIBLE element,
        // never to the hidden button inside the closed popover.
        last.focus();
        last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

        expect(document.activeElement).toBe(first);
        expect(document.activeElement).not.toBe(hiddenBtn);
    });

    it('focusin recovery never lands on an element inside a display:none subtree', () => {
        const { container, first } = buildContainer();

        const closedPopover = document.createElement('div');
        closedPopover.style.display = 'none';
        const hiddenBtn = document.createElement('button');
        // Place the hidden button FIRST in DOM order so a naive [0] pick would choose it.
        closedPopover.appendChild(hiddenBtn);
        container.insertBefore(closedPopover, first);

        setupFocusTrap(container);

        // Focus escapes to <body>; recovery must pick the first VISIBLE element.
        document.body.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

        expect(document.activeElement).toBe(first);
        expect(document.activeElement).not.toBe(hiddenBtn);
    });

    it('removes its listeners when the container is destroyed', () => {
        const { container, first } = buildContainer();
        setupFocusTrap(container);

        container.remove();

        const outside = document.createElement('input');
        document.body.appendChild(outside);
        outside.focus();

        // Trap is torn down, so focus is allowed to stay outside.
        expect(document.activeElement).toBe(outside);
        expect(document.activeElement).not.toBe(first);
    });
});
