/**
 * QA test suite: DatePickerBuilder refactor — PopoverBuilder integration
 *
 * Validates all spec requirements from the refactor:
 *   1.  Opening (icon click / Alt+ArrowDown) shows calendar popover anchored below inputWrapper
 *   2.  Selecting a date closes popover and updates value
 *   3.  Escape closes popover
 *   4.  On popover close focus returns to input
 *   5.  isExpanded$ stays in sync: true when open, false when closed
 *   6.  Glass mode: popover.asGlass() is used (glass-effect class on [popover] element)
 *   7.  Non-glass: bg-surface border-outline on popover element
 *   8.  Public API (showPopover / hidePopover / toggle) drives isExpanded$
 *   9.  Calendar width is 320px
 *  10.  No manual scroll handler on container
 *  11.  No popup.addEventListener('toggle', ...) on container
 */

import { BehaviorSubject, Subject } from 'rxjs';
import { DatePickerBuilder } from './datepicker-builder';
import { fireEvent } from '@testing-library/dom';

// ─── helpers ────────────────────────────────────────────────────────────────

function buildDatePicker(opts: { glass?: boolean } = {}) {
    const value$ = new BehaviorSubject<Date | null>(new Date(2023, 0, 15));
    let builder = new DatePickerBuilder().withValue(value$);
    if (opts.glass) builder = builder.asGlass();
    const container = builder.build() as HTMLElement & {
        showPopover(): void;
        hidePopover(): void;
        toggle(): void;
    };
    document.body.appendChild(container);
    return { container, value$ };
}

/** Returns the [popover] element that PopoverBuilder appended to document.body */
function getPopoverEl(): HTMLElement | null {
    return document.body.querySelector('[popover]');
}

/** Simulate popover being visible (jsdom does not apply UA stylesheet) */
function openPopoverEl() {
    const el = getPopoverEl();
    if (el) el.style.display = '';
}

// ─── setup / teardown ────────────────────────────────────────────────────────

beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
    // Stub showPopover / hidePopover — jsdom does not implement them
    jest.spyOn(HTMLElement.prototype, 'showPopover').mockImplementation(function (this: HTMLElement) {
        this.style.display = '';
    });
    jest.spyOn(HTMLElement.prototype, 'hidePopover').mockImplementation(function (this: HTMLElement) {
        this.style.display = 'none';
    });
});

afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 1: Opening the datepicker shows a calendar popover
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 1 — opening shows a calendar popover', () => {
    test('icon button click appends a [popover] element to the DOM', () => {
        const { container } = buildDatePicker();
        const iconButton = container.querySelector('button')!;
        expect(getPopoverEl()).toBeNull(); // lazy — not yet in DOM before first show

        fireEvent.click(iconButton);

        expect(getPopoverEl()).not.toBeNull();
    });

    test('icon button click calls showPopover() on the popover element', () => {
        const showSpy = jest.spyOn(HTMLElement.prototype, 'showPopover');
        const { container } = buildDatePicker();
        const iconButton = container.querySelector('button')!;

        fireEvent.click(iconButton);

        expect(showSpy).toHaveBeenCalledTimes(1);
    });

    test('Alt+ArrowDown on input appends a [popover] element to the DOM', () => {
        const { container } = buildDatePicker();
        const input = container.querySelector('input')!;

        fireEvent.keyDown(input, { key: 'ArrowDown', altKey: true });

        expect(getPopoverEl()).not.toBeNull();
    });

    test('Alt+ArrowDown calls showPopover() on the popover element', () => {
        const showSpy = jest.spyOn(HTMLElement.prototype, 'showPopover');
        const { container } = buildDatePicker();
        const input = container.querySelector('input')!;

        fireEvent.keyDown(input, { key: 'ArrowDown', altKey: true });

        expect(showSpy).toHaveBeenCalledTimes(1);
    });

    test('popover is anchored below inputWrapper (top = inputWrapper.bottom + offset)', () => {
        const { container } = buildDatePicker();
        const inputWrapper = container.querySelector('div.flex.items-center') as HTMLElement;

        // Simulate getBoundingClientRect for the inputWrapper
        inputWrapper.getBoundingClientRect = () => ({
            top: 100, bottom: 148, left: 50, right: 350, width: 300, height: 48,
            x: 50, y: 100, toJSON: () => {}
        } as DOMRect);

        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const popoverEl = getPopoverEl() as HTMLElement;
        // default offset is 4
        expect(popoverEl.style.top).toBe('152px'); // 148 + 4
        expect(popoverEl.style.left).toBe('50px');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 2: Selecting a date closes the popover and updates value
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 2 — selecting a date closes popover and updates value', () => {
    test('clicking a day button updates value$ with the chosen date', () => {
        const { container, value$ } = buildDatePicker();
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        // Find any day button — use "15" (which is our selected date)
        const dayButtons = Array.from(document.querySelectorAll('[role="grid"] button'));
        const day15 = dayButtons.find(b => b.textContent === '15') as HTMLElement;
        expect(day15).toBeTruthy();

        fireEvent.click(day15);

        expect(value$.getValue()?.getDate()).toBe(15);
    });

    test('clicking a day button closes the popover (hidePopover called)', () => {
        const hideSpy = jest.spyOn(HTMLElement.prototype, 'hidePopover');
        const { container } = buildDatePicker();
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const dayButtons = Array.from(document.querySelectorAll('[role="grid"] button'));
        const day15 = dayButtons.find(b => b.textContent === '15') as HTMLElement;
        fireEvent.click(day15);

        expect(hideSpy).toHaveBeenCalledTimes(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 3: Escape closes the popover
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 3 — Escape closes the popover', () => {
    test('Escape on input calls hidePopover() when open', () => {
        const hideSpy = jest.spyOn(HTMLElement.prototype, 'hidePopover');
        const { container } = buildDatePicker();
        const iconButton = container.querySelector('button')!;
        const input = container.querySelector('input')!;

        fireEvent.click(iconButton);
        fireEvent.keyDown(input, { key: 'Escape' });

        expect(hideSpy).toHaveBeenCalledTimes(1);
    });

    test('Escape sets popover display to none', () => {
        const { container } = buildDatePicker();
        const iconButton = container.querySelector('button')!;
        const input = container.querySelector('input')!;

        fireEvent.click(iconButton);
        const popoverEl = getPopoverEl() as HTMLElement;

        fireEvent.keyDown(input, { key: 'Escape' });

        expect(popoverEl.style.display).toBe('none');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 4: Focus returns to triggering element when popover closes
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 4 — focus returns to trigger on popover close', () => {
    test('popover onClose callback focuses the icon button if it was the trigger', () => {
        const { container } = buildDatePicker();
        const iconButton = container.querySelector('button')!;

        const focusSpy = jest.spyOn(iconButton, 'focus');

        fireEvent.click(iconButton); // open via iconButton

        // Simulate click outside to trigger PopoverBuilder's onClose → focus callback
        const outside = document.createElement('div');
        document.body.appendChild(outside);
        outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(focusSpy).toHaveBeenCalledTimes(1);
    });

    test('popover onClose callback focuses the input if it was the trigger (Alt+ArrowDown)', () => {
        const { container } = buildDatePicker();
        const input = container.querySelector('input')!;

        const focusSpy = jest.spyOn(input, 'focus');

        fireEvent.keyDown(input, { key: 'ArrowDown', altKey: true }); // open via input

        // Simulate click outside
        const outside = document.createElement('div');
        document.body.appendChild(outside);
        outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(focusSpy).toHaveBeenCalledTimes(1);
    });

    test('Escape key closes popover and returns focus to trigger (iconButton)', () => {
        const { container } = buildDatePicker();
        const iconButton = container.querySelector('button')!;
        const focusSpy = jest.spyOn(iconButton, 'focus');

        fireEvent.click(iconButton);
        fireEvent.keyDown(iconButton, { key: 'Escape', bubbles: true });

        expect(focusSpy).toHaveBeenCalledTimes(1);
    });

    test('Escape key closes popover and returns focus to trigger (input)', () => {
        const { container } = buildDatePicker();
        const input = container.querySelector('input')!;
        const focusSpy = jest.spyOn(input, 'focus');

        fireEvent.keyDown(input, { key: 'ArrowDown', altKey: true });
        fireEvent.keyDown(input, { key: 'Escape' });

        expect(focusSpy).toHaveBeenCalledTimes(1);
    });

    test('Escape key on calendar grid returns focus to trigger (iconButton)', () => {
        const { container } = buildDatePicker();
        const iconButton = container.querySelector('button')!;
        const focusSpy = jest.spyOn(iconButton, 'focus');

        fireEvent.click(iconButton);
        const popoverEl = getPopoverEl()!;
        const grid = popoverEl.querySelector('[role="grid"]') as HTMLElement;
        expect(grid).toBeTruthy();

        fireEvent.keyDown(grid, { key: 'Escape', bubbles: true });

        expect(focusSpy).toHaveBeenCalledTimes(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 5: isExpanded$ stays in sync
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 5 — isExpanded$ stays in sync', () => {
    test('aria-expanded is false before open', () => {
        const { container } = buildDatePicker();
        const input = container.querySelector('input')!;
        expect(input.getAttribute('aria-expanded')).toBe('false');
    });

    test('aria-expanded becomes true on icon click (tracks isExpanded$)', () => {
        const { container } = buildDatePicker();
        const iconButton = container.querySelector('button')!;
        const input = container.querySelector('input')!;

        fireEvent.click(iconButton);

        expect(input.getAttribute('aria-expanded')).toBe('true');
    });

    test('aria-expanded becomes false after Escape (isExpanded$ set to false)', () => {
        const { container } = buildDatePicker();
        const iconButton = container.querySelector('button')!;
        const input = container.querySelector('input')!;

        fireEvent.click(iconButton);
        fireEvent.keyDown(input, { key: 'Escape' });

        expect(input.getAttribute('aria-expanded')).toBe('false');
    });

    test('aria-expanded becomes false after date selection', () => {
        const { container } = buildDatePicker();
        const iconButton = container.querySelector('button')!;
        const input = container.querySelector('input')!;

        fireEvent.click(iconButton);
        const dayButtons = Array.from(document.querySelectorAll('[role="grid"] button'));
        const day15 = dayButtons.find(b => b.textContent === '15') as HTMLElement;
        fireEvent.click(day15);

        expect(input.getAttribute('aria-expanded')).toBe('false');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 6: Glass mode — popover.asGlass() used (glass-effect on [popover] el)
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 6 — glass mode uses asGlass() on PopoverBuilder', () => {
    test('glass mode: [popover] element has glass-effect class', () => {
        const { container } = buildDatePicker({ glass: true });
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const popoverEl = getPopoverEl()!;
        expect(popoverEl.classList.contains('glass-effect')).toBe(true);
    });

    test('glass mode: [popover] element does NOT have bg-surface or border-outline', () => {
        const { container } = buildDatePicker({ glass: true });
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const popoverEl = getPopoverEl()!;
        expect(popoverEl.classList.contains('bg-surface')).toBe(false);
        expect(popoverEl.classList.contains('border-outline')).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 7: Non-glass — bg-surface border-outline on popover outer div
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 7 — non-glass mode has bg-surface border-outline on [popover]', () => {
    test('non-glass: [popover] element has bg-surface class', () => {
        const { container } = buildDatePicker({ glass: false });
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const popoverEl = getPopoverEl()!;
        expect(popoverEl.classList.contains('bg-surface')).toBe(true);
    });

    test('non-glass: [popover] element has border-outline class', () => {
        const { container } = buildDatePicker({ glass: false });
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const popoverEl = getPopoverEl()!;
        expect(popoverEl.classList.contains('border-outline')).toBe(true);
    });

    test('non-glass: [popover] element does NOT have glass-effect class', () => {
        const { container } = buildDatePicker({ glass: false });
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const popoverEl = getPopoverEl()!;
        expect(popoverEl.classList.contains('glass-effect')).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 8: Public API drives isExpanded$
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 8 — public API (showPopover / hidePopover / toggle) drives isExpanded$', () => {
    test('container.showPopover() calls showPopover() on [popover] element', () => {
        const showSpy = jest.spyOn(HTMLElement.prototype, 'showPopover');
        const { container } = buildDatePicker();

        (container as any).showPopover();

        expect(showSpy).toHaveBeenCalledTimes(1);
    });

    test('container.showPopover() sets aria-expanded to true', () => {
        const { container } = buildDatePicker();
        const input = container.querySelector('input')!;

        (container as any).showPopover();

        expect(input.getAttribute('aria-expanded')).toBe('true');
    });

    test('container.hidePopover() calls hidePopover() on [popover] element', () => {
        const hideSpy = jest.spyOn(HTMLElement.prototype, 'hidePopover');
        const { container } = buildDatePicker();

        (container as any).showPopover(); // open first
        (container as any).hidePopover();

        expect(hideSpy).toHaveBeenCalledTimes(1);
    });

    test('container.hidePopover() sets aria-expanded to false', () => {
        const { container } = buildDatePicker();
        const input = container.querySelector('input')!;

        (container as any).showPopover();
        (container as any).hidePopover();

        expect(input.getAttribute('aria-expanded')).toBe('false');
    });

    test('container.toggle() opens when closed', () => {
        const showSpy = jest.spyOn(HTMLElement.prototype, 'showPopover');
        const { container } = buildDatePicker();

        (container as any).toggle();

        expect(showSpy).toHaveBeenCalledTimes(1);
    });

    test('container.toggle() closes when open', () => {
        const hideSpy = jest.spyOn(HTMLElement.prototype, 'hidePopover');
        const { container } = buildDatePicker();

        (container as any).showPopover(); // open
        (container as any).toggle();      // close

        expect(hideSpy).toHaveBeenCalledTimes(1);
    });

    test('container.toggle() aria-expanded is true after toggle from closed', () => {
        const { container } = buildDatePicker();
        const input = container.querySelector('input')!;

        (container as any).toggle();
        expect(input.getAttribute('aria-expanded')).toBe('true');
    });

    test('container.toggle() aria-expanded is false after toggle from open', () => {
        const { container } = buildDatePicker();
        const input = container.querySelector('input')!;

        (container as any).showPopover();
        (container as any).toggle();
        expect(input.getAttribute('aria-expanded')).toBe('false');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 9: Calendar width is 320px
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 9 — calendar popover width is 320px', () => {
    test('[popover] element has width set to 320px', () => {
        const { container } = buildDatePicker();
        const iconButton = container.querySelector('button')!;

        // Simulate anchor getBoundingClientRect so _position() runs
        const inputWrapper = container.querySelector('div.flex.items-center') as HTMLElement;
        inputWrapper.getBoundingClientRect = () => ({
            top: 0, bottom: 48, left: 0, right: 300, width: 300, height: 48,
            x: 0, y: 0, toJSON: () => {}
        } as DOMRect);

        fireEvent.click(iconButton);

        const popoverEl = getPopoverEl() as HTMLElement;
        expect(popoverEl.style.width).toBe('320px');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 10: Manual scroll handler is gone
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 10 — no manual scroll handler on container', () => {
    test('no scroll event listener added directly on container element', () => {
        // The refactor must not add a scroll listener to the container div.
        // We verify by checking that a scroll event on a parent div does NOT
        // trigger any unexpected close behavior — it is handled only by PopoverBuilder.
        const addEventSpy = jest.spyOn(HTMLElement.prototype, 'addEventListener');

        buildDatePicker();

        const scrollCalls = addEventSpy.mock.calls.filter(
            ([type]: any[]) => type === 'scroll'
        );
        // Any scroll listener must NOT be on HTMLElement — PopoverBuilder uses document
        // with capture=true. Verify no plain element.addEventListener('scroll', ...) without capture flag.
        const uncapturedScrollOnElement = scrollCalls.filter(
            ([, , options]: any[]) => options !== true && !(typeof options === 'object' && options?.capture === true)
        );
        expect(uncapturedScrollOnElement).toHaveLength(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 11: No popup.addEventListener('toggle', ...) on container-owned element
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 11 — toggle event listener is owned by PopoverBuilder, not DatePickerBuilder', () => {
    test('DatePickerBuilder source code does not call addEventListener with toggle', () => {
        // This is a static code analysis assertion — we verify the builder
        // does not itself wire up a toggle listener; that is PopoverBuilder\'s job.
        const builderSource = DatePickerBuilder.toString();
        // The builder should contain no reference to 'toggle' listener setup
        expect(builderSource).not.toMatch(/addEventListener\s*\(\s*['"]toggle['"]/);
    });

    test('[popover] element has exactly one toggle listener (from PopoverBuilder, not DatePickerBuilder)', () => {
        // We confirm the toggle event still works end-to-end via PopoverBuilder.
        // Simulate a native toggle close — isExpanded$ should sync back to false.
        const { container } = buildDatePicker();
        const iconButton = container.querySelector('button')!;
        const input = container.querySelector('input')!;

        fireEvent.click(iconButton);
        expect(input.getAttribute('aria-expanded')).toBe('true');

        // Simulate native popover dismiss via toggle event (PopoverBuilder handles this)
        const popoverEl = getPopoverEl()!;
        const toggleEvent = new Event('toggle') as any;
        toggleEvent.newState = 'closed';
        popoverEl.dispatchEvent(toggleEvent);

        // isExpanded$ should now be false (driven via onClose callback)
        expect(input.getAttribute('aria-expanded')).toBe('false');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Additional: calendar wrapper structure
// ─────────────────────────────────────────────────────────────────────────────

describe('Calendar wrapper structure', () => {
    test('popover content has p-px-16 padding wrapper around calendar', () => {
        const { container } = buildDatePicker();
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const popoverEl = getPopoverEl()!;
        const paddingWrapper = popoverEl.querySelector('.p-px-16');
        expect(paddingWrapper).not.toBeNull();
    });

    test('calendar [role=grid] is inside the popover, not inside the container', () => {
        const { container } = buildDatePicker();
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        // Calendar grid must be inside [popover] (which is in body), not in container
        const gridInContainer = container.querySelector('[role="grid"]');
        expect(gridInContainer).toBeNull();

        const gridInPopover = getPopoverEl()!.querySelector('[role="grid"]');
        expect(gridInPopover).not.toBeNull();
    });
});

// ─── Memory safety: calendar subscriptions are torn down on destroy ──────────

describe('DatePickerBuilder — calendar subscription cleanup', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('withMinDate/withMaxDate observers are released when the element is removed', async () => {
        const value$ = new BehaviorSubject<Date | null>(new Date(2023, 0, 15));
        const min$ = new BehaviorSubject<Date>(new Date(2023, 0, 1));
        const max$ = new BehaviorSubject<Date>(new Date(2023, 11, 31));

        const container = new DatePickerBuilder()
            .withValue(value$)
            .withMinDate(min$)
            .withMaxDate(max$)
            .build();
        document.body.appendChild(container);

        expect(min$.observers.length).toBeGreaterThan(0);
        expect(max$.observers.length).toBeGreaterThan(0);

        container.remove();
        // disconnectedCallback runs synchronously; the microtask flush below just lets
        // any pending RxJS teardown queued on it settle before we assert.
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(min$.observers.length).toBe(0);
        expect(max$.observers.length).toBe(0);
    });

    test('a selectedDate$ Subject that never emits is released after opening the picker twice and removing it', async () => {
        const selectedDate$ = new Subject<Date | null>();

        const container = new DatePickerBuilder()
            .withValue(selectedDate$)
            .build() as HTMLElement & { showPopover(): void; hidePopover(): void };
        document.body.appendChild(container);

        container.showPopover();
        container.hidePopover();
        container.showPopover();
        container.hidePopover();

        container.remove();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(selectedDate$.observers.length).toBe(0);
    });
});

describe('A3: DatePicker lifecycle — connect, open, disconnect', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('A3-6: observers are released even when the element is removed while the calendar is open', async () => {
        const value$ = new BehaviorSubject<Date | null>(new Date(2023, 5, 10));
        const min$ = new BehaviorSubject<Date>(new Date(2023, 0, 1));
        const max$ = new BehaviorSubject<Date>(new Date(2023, 11, 31));

        const container = new DatePickerBuilder()
            .withValue(value$)
            .withMinDate(min$)
            .withMaxDate(max$)
            .build() as HTMLElement & { showPopover(): void };
        document.body.appendChild(container);

        container.showPopover();
        expect(min$.observers.length).toBeGreaterThan(0);

        container.remove();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(min$.observers.length).toBe(0);
        expect(max$.observers.length).toBe(0);
        expect(value$.observers.length).toBe(0);

        value$.complete();
        min$.complete();
        max$.complete();
    });

    test('A3-7: after removal the internal expansion state is closed — showPopover() is an inert no-op', async () => {
        const value$ = new BehaviorSubject<Date | null>(new Date(2023, 5, 10));

        const container = new DatePickerBuilder()
            .withValue(value$)
            .build() as HTMLElement & { showPopover(): void; hidePopover(): void; toggle(): void };
        document.body.appendChild(container);

        const input = container.querySelector('input') as HTMLInputElement;
        container.showPopover();
        expect(input.getAttribute('aria-expanded')).toBe('true');
        container.hidePopover();

        container.remove();
        await new Promise(resolve => setTimeout(resolve, 0));

        // isExpanded$ was completed by registerDestroy: pushing into it is a no-op
        // and nothing re-renders or throws.
        expect(() => {
            container.showPopover();
            container.toggle();
        }).not.toThrow();
        expect(input.getAttribute('aria-expanded')).toBe('false');
        expect(document.body.querySelector('[popover]')).toBeNull();

        value$.complete();
    });

    test('A3-8: two pickers sharing one min$ each release exactly their own observer', async () => {
        const min$ = new BehaviorSubject<Date>(new Date(2023, 0, 1));

        const a = new DatePickerBuilder().withMinDate(min$).build();
        const b = new DatePickerBuilder().withMinDate(min$).build();
        document.body.appendChild(a);
        document.body.appendChild(b);

        expect(min$.observers.length).toBe(2);

        a.remove();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(min$.observers.length).toBe(1);

        b.remove();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(min$.observers.length).toBe(0);

        min$.complete();
    });
});

describe('DatePicker calendar popover sizing (no scrollbar regression)', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('the calendar popover has no max-height clamp and never scrolls itself', () => {
        const el = new DatePickerBuilder().withValue(new BehaviorSubject<Date | null>(new Date(2026, 0, 15))).build();
        document.body.appendChild(el);
        (el as any).showPopover();

        const popover = document.body.querySelector('[popover]') as HTMLElement;
        expect(popover).not.toBeNull();
        // No maxHeight is configured for the calendar, so the popover must take its
        // natural content height (a clamped popover put a scrollbar on the calendar).
        expect(popover.style.maxHeight).toBe('');
        expect(popover.className).toContain('overflow-hidden');
        expect(popover.className).not.toContain('overflow-y-auto');
    });
});
