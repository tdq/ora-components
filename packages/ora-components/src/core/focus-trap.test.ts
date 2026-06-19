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

    function buildThreeFieldContainer(): {
        container: HTMLElement;
        first: HTMLInputElement;
        middle: HTMLButtonElement;
        last: HTMLInputElement;
    } {
        const container = document.createElement('div');
        const first = document.createElement('input');
        first.id = 'first';
        // A button in the middle: Safari natively skips buttons on Tab, so the trap
        // must move focus to it explicitly rather than relying on native navigation.
        const middle = document.createElement('button');
        middle.id = 'middle';
        const last = document.createElement('input');
        last.id = 'last';
        container.append(first, middle, last);
        document.body.appendChild(container);
        return { container, first, middle, last };
    }

    it('explicitly advances focus to the next element on Tab (Safari skips buttons natively)', () => {
        const { container, first, middle } = buildThreeFieldContainer();
        setupFocusTrap(container);

        first.focus();
        first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

        expect(document.activeElement).toBe(middle);
    });

    it('explicitly moves focus to the previous element on Shift+Tab', () => {
        const { container, middle, last } = buildThreeFieldContainer();
        setupFocusTrap(container);

        last.focus();
        last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));

        expect(document.activeElement).toBe(middle);
    });

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

    it('skips a disabled element when wrapping focus on Tab', () => {
        const container = document.createElement('div');
        const first = document.createElement('input');
        first.id = 'first';
        const middle = document.createElement('input');
        middle.id = 'middle';
        const lastDisabled = document.createElement('button');
        lastDisabled.id = 'last-disabled';
        lastDisabled.disabled = true;
        // Mirrors ButtonBuilder.build(), which sets tabIndex=0 on every button
        // (including disabled ones) for Safari Tab support.
        lastDisabled.tabIndex = 0;
        container.append(first, middle, lastDisabled);
        document.body.appendChild(container);
        setupFocusTrap(container);

        middle.focus();
        middle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

        // The disabled button can never actually receive focus, so it must not be
        // treated as a stop in the tab sequence; focus should wrap to the first element.
        expect(document.activeElement).toBe(first);
    });

    it('does not let focus escape via the focusin recovery when the first element is disabled', () => {
        const container = document.createElement('div');
        const firstDisabled = document.createElement('button');
        firstDisabled.id = 'first-disabled';
        firstDisabled.disabled = true;
        // Mirrors ButtonBuilder.build(), which sets tabIndex=0 on every button
        // (including disabled ones) for Safari Tab support.
        firstDisabled.tabIndex = 0;
        const second = document.createElement('input');
        second.id = 'second';
        container.append(firstDisabled, second);
        document.body.appendChild(container);
        setupFocusTrap(container);

        const outside = document.createElement('input');
        outside.id = 'outside';
        document.body.appendChild(outside);
        outside.focus();

        expect(document.activeElement).toBe(second);
        expect(document.activeElement).not.toBe(outside);
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
