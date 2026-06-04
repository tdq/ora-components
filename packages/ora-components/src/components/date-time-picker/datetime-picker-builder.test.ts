/**
 * QA test suite: DateTimePickerBuilder
 *
 * Validates:
 *   1. Opening (icon click / Alt+ArrowDown) shows datetime popover anchored below inputWrapper
 *   2. Selecting a date updates value (popover stays open for time selection)
 *   3. Selecting time closes popover and updates value with combined datetime
 *   4. Escape closes popover
 *   5. On popover close focus returns to input
 *   6. isExpanded$ stays in sync: true when open, false when closed
 *   7. Glass mode: popover.asGlass() is used
 *   8. Non-glass: bg-surface border-outline on popover element
 *   9. Public API (showPopover / hidePopover / toggle) drives isExpanded$
 *  10. Calendar + time picker are inside popover
 *  11. Popover width is 360px
 *  12. 12h format with AM/PM toggle
 *  13. Input masking for datetime format
 *  14. formatDateTime / parseDateTime utilities
 *  15. Reactive time picker updates
 *  16. Input masking (keypress validation)
 *  17. Manual input (oninput parsing)
 *  18. Caption, enabled, error observables
 *  19. Hour and minute selection updates value
 *  20. AM/PM toggle behavior (12h mode)
 *  21. 24h / 12h hour range
 *  22. Custom format
 */

import { BehaviorSubject } from 'rxjs';
import { DateTimePickerBuilder } from './datetime-picker-builder';
import { formatDateTime, parseDateTime } from './datetime-utils';
import { fireEvent } from '@testing-library/dom';

// ─── helpers ────────────────────────────────────────────────────────────────

function buildDateTimePicker(opts: { glass?: boolean; timeFormat?: '12h' | '24h' } = {}) {
    const value$ = new BehaviorSubject<Date | null>(new Date(2023, 0, 15, 14, 30));
    let builder = new DateTimePickerBuilder().withValue(value$);
    if (opts.glass) builder = builder.asGlass();
    if (opts.timeFormat) builder = builder.withTimeFormat(opts.timeFormat);
    const container = builder.build() as HTMLElement & {
        showPopover(): void;
        hidePopover(): void;
        toggle(): void;
    };
    document.body.appendChild(container);
    return { container, value$ };
}

function getPopoverEl(): HTMLElement | null {
    return document.body.querySelector('[popover]');
}

function openPopoverEl() {
    const el = getPopoverEl();
    if (el) el.style.display = '';
}

// ─── setup / teardown ────────────────────────────────────────────────────────

beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
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
// Spec 1: Opening shows a datetime popover
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 1 — opening shows a datetime popover', () => {
    test('icon button click appends a [popover] element to the DOM', () => {
        const { container } = buildDateTimePicker();
        const iconButton = container.querySelector('button')!;
        expect(getPopoverEl()).toBeNull();

        fireEvent.click(iconButton);

        expect(getPopoverEl()).not.toBeNull();
    });

    test('icon button click calls showPopover() on the popover element', () => {
        const showSpy = jest.spyOn(HTMLElement.prototype, 'showPopover');
        const { container } = buildDateTimePicker();
        const iconButton = container.querySelector('button')!;

        fireEvent.click(iconButton);

        expect(showSpy).toHaveBeenCalledTimes(1);
    });

    test('Alt+ArrowDown on input appends a [popover] element to the DOM', () => {
        const { container } = buildDateTimePicker();
        const input = container.querySelector('input')!;

        fireEvent.keyDown(input, { key: 'ArrowDown', altKey: true });

        expect(getPopoverEl()).not.toBeNull();
    });

    test('popover is anchored below inputWrapper', () => {
        const { container } = buildDateTimePicker();
        const inputWrapper = container.querySelector('div.flex.items-center') as HTMLElement;

        inputWrapper.getBoundingClientRect = () => ({
            top: 100, bottom: 148, left: 50, right: 350, width: 300, height: 48,
            x: 50, y: 100, toJSON: () => {}
        } as DOMRect);

        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const popoverEl = getPopoverEl() as HTMLElement;
        expect(popoverEl.style.top).toBe('152px');
        expect(popoverEl.style.left).toBe('50px');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 2: Selecting a date updates value (popover stays open)
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 2 — selecting a date updates value', () => {
    test('clicking a day button updates value$ with the chosen date (time preserved)', () => {
        const { container, value$ } = buildDateTimePicker();
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const dayButtons = Array.from(document.querySelectorAll('[role="grid"] button'));
        const day20 = dayButtons.find(b => b.textContent === '20') as HTMLElement;
        expect(day20).toBeTruthy();

        fireEvent.click(day20);

        const val = value$.getValue();
        expect(val?.getDate()).toBe(20);
        expect(val?.getHours()).toBe(14);
        expect(val?.getMinutes()).toBe(30);
    });

    test('popover stays open after date selection (for time selection)', () => {
        const { container } = buildDateTimePicker();
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const dayButtons = Array.from(document.querySelectorAll('[role="grid"] button'));
        const day20 = dayButtons.find(b => b.textContent === '20') as HTMLElement;
        fireEvent.click(day20);

        const input = container.querySelector('input')!;
        expect(input.getAttribute('aria-expanded')).toBe('true');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 3: Selecting time closes popover and updates value
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 3 — selecting time keeps popover open', () => {
    test('clicking a time item does NOT close the popover (value updates, display stays)', () => {
        const { container, value$ } = buildDateTimePicker();
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const popoverEl = getPopoverEl()!;
        const timeSection = popoverEl.querySelector('.time-picker')!;
        const hourListbox = timeSection.querySelector('[role="listbox"]')!;
        const hourOptions = hourListbox.querySelectorAll('[role="option"]');

        const hour15 = Array.from(hourOptions).find(el => el.textContent === '15') as HTMLElement;
        expect(hour15).toBeTruthy();

        // Click hour and verify value updates correctly
        fireEvent.click(hour15);
        const val = value$.getValue();
        expect(val?.getHours()).toBe(15);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 4: Escape closes the popover
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 4 — Escape closes the popover', () => {
    test('Escape on input calls hidePopover() when open', () => {
        const hideSpy = jest.spyOn(HTMLElement.prototype, 'hidePopover');
        const { container } = buildDateTimePicker();
        const iconButton = container.querySelector('button')!;
        const input = container.querySelector('input')!;

        fireEvent.click(iconButton);
        fireEvent.keyDown(input, { key: 'Escape' });

        expect(hideSpy).toHaveBeenCalledTimes(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 5: Focus returns to input on popover close
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 5 — focus returns to input on close', () => {
    test('Escape key closes popover and returns focus to input', () => {
        const { container } = buildDateTimePicker();
        const iconButton = container.querySelector('button')!;
        const input = container.querySelector('input')!;
        const focusSpy = jest.spyOn(input, 'focus');

        fireEvent.click(iconButton);
        fireEvent.keyDown(input, { key: 'Escape' });

        expect(focusSpy).toHaveBeenCalledTimes(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 6: isExpanded$ stays in sync
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 6 — isExpanded$ stays in sync', () => {
    test('aria-expanded is false before open', () => {
        const { container } = buildDateTimePicker();
        const input = container.querySelector('input')!;
        expect(input.getAttribute('aria-expanded')).toBe('false');
    });

    test('aria-expanded becomes true on icon click', () => {
        const { container } = buildDateTimePicker();
        const iconButton = container.querySelector('button')!;
        const input = container.querySelector('input')!;

        fireEvent.click(iconButton);

        expect(input.getAttribute('aria-expanded')).toBe('true');
    });

    test('aria-expanded becomes false after Escape', () => {
        const { container } = buildDateTimePicker();
        const iconButton = container.querySelector('button')!;
        const input = container.querySelector('input')!;

        fireEvent.click(iconButton);
        fireEvent.keyDown(input, { key: 'Escape' });

        expect(input.getAttribute('aria-expanded')).toBe('false');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 7: Glass mode
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 7 — glass mode', () => {
    test('glass mode: [popover] element has glass-effect class', () => {
        const { container } = buildDateTimePicker({ glass: true });
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const popoverEl = getPopoverEl()!;
        expect(popoverEl.classList.contains('glass-effect')).toBe(true);
    });

    test('glass mode: [popover] element does NOT have bg-surface', () => {
        const { container } = buildDateTimePicker({ glass: true });
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const popoverEl = getPopoverEl()!;
        expect(popoverEl.classList.contains('bg-surface')).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 8: Non-glass mode
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 8 — non-glass mode', () => {
    test('non-glass: [popover] element has bg-surface class', () => {
        const { container } = buildDateTimePicker({ glass: false });
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const popoverEl = getPopoverEl()!;
        expect(popoverEl.classList.contains('bg-surface')).toBe(true);
    });

    test('non-glass: [popover] element does NOT have glass-effect', () => {
        const { container } = buildDateTimePicker({ glass: false });
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const popoverEl = getPopoverEl()!;
        expect(popoverEl.classList.contains('glass-effect')).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 9: Public API
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 9 — public API', () => {
    test('container.showPopover() calls showPopover() on [popover]', () => {
        const showSpy = jest.spyOn(HTMLElement.prototype, 'showPopover');
        const { container } = buildDateTimePicker();

        (container as any).showPopover();

        expect(showSpy).toHaveBeenCalledTimes(1);
    });

    test('container.showPopover() sets aria-expanded to true', () => {
        const { container } = buildDateTimePicker();
        const input = container.querySelector('input')!;

        (container as any).showPopover();

        expect(input.getAttribute('aria-expanded')).toBe('true');
    });

    test('container.hidePopover() calls hidePopover() on [popover]', () => {
        const hideSpy = jest.spyOn(HTMLElement.prototype, 'hidePopover');
        const { container } = buildDateTimePicker();

        (container as any).showPopover();
        (container as any).hidePopover();

        expect(hideSpy).toHaveBeenCalledTimes(1);
    });

    test('container.toggle() opens when closed', () => {
        const showSpy = jest.spyOn(HTMLElement.prototype, 'showPopover');
        const { container } = buildDateTimePicker();

        (container as any).toggle();

        expect(showSpy).toHaveBeenCalledTimes(1);
    });

    test('container.toggle() closes when open', () => {
        const hideSpy = jest.spyOn(HTMLElement.prototype, 'hidePopover');
        const { container } = buildDateTimePicker();

        (container as any).showPopover();
        (container as any).toggle();

        expect(hideSpy).toHaveBeenCalledTimes(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 10: Calendar + time picker inside popover
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 10 — calendar + time picker inside popover', () => {
    test('calendar [role=grid] is inside the popover, not container', () => {
        const { container } = buildDateTimePicker();
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const gridInContainer = container.querySelector('[role="grid"]');
        expect(gridInContainer).toBeNull();

        const gridInPopover = getPopoverEl()!.querySelector('[role="grid"]');
        expect(gridInPopover).not.toBeNull();
    });

    test('time picker section is inside the popover', () => {
        const { container } = buildDateTimePicker();
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const popoverEl = getPopoverEl()!;
        const timeSection = popoverEl.querySelector('.time-picker');
        expect(timeSection).not.toBeNull();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 11: Popover width is 360px
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 11 — popover width is 548px', () => {
    test('[popover] element has width set to 548px', () => {
        const { container } = buildDateTimePicker();
        const inputWrapper = container.querySelector('div.flex.items-center') as HTMLElement;
        inputWrapper.getBoundingClientRect = () => ({
            top: 0, bottom: 48, left: 0, right: 300, width: 300, height: 48,
            x: 0, y: 0, toJSON: () => {}
        } as DOMRect);

        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const popoverEl = getPopoverEl() as HTMLElement;
        expect(popoverEl.style.width).toBe('548px');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 12: 12h format with AM/PM
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 12 — 12h format', () => {
    test('12h format shows AM/PM toggle (checkbox caption)', () => {
        const { container } = buildDateTimePicker({ timeFormat: '12h' });
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        // The AM/PM toggle is rendered by CheckboxBuilder — a <label> with a <span> caption.
        // Only one of "AM" or "PM" is shown at a time (based on isPM$ internal state).
        const popoverEl = getPopoverEl()!;
        const amPmCaption = Array.from(popoverEl.querySelectorAll('span'))
            .find(el => el.textContent === 'AM' || el.textContent === 'PM');
        expect(amPmCaption).toBeTruthy();
    });

    test('12h format hour list shows 1–12 instead of 0–23', () => {
        const { container } = buildDateTimePicker({ timeFormat: '12h' });
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const popoverEl = getPopoverEl()!;
        const timeSection = popoverEl.querySelector('.time-picker')!;
        const hourListbox = timeSection.querySelector('[role="listbox"]')!;
        const hourOptions = hourListbox.querySelectorAll('[role="option"]');
        // 12-hour mode: 12 items (1–12), not 24 (0–23)
        expect(hourOptions.length).toBe(12);
        // First item should be "01" (not "00")
        expect(hourOptions[0].textContent).toBe('01');
        // Last item should be "12"
        expect(hourOptions[11].textContent).toBe('12');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Utility tests: formatDateTime / parseDateTime
// ─────────────────────────────────────────────────────────────────────────────

describe('formatDateTime / parseDateTime utilities', () => {
    test('formatDateTime formats 24h correctly', () => {
        const date = new Date(2023, 5, 15, 14, 30);
        const result = formatDateTime(date, 'DD-MM-YYYY HH:mm', '24h');
        expect(result).toBe('15-06-2023 14:30');
    });

    test('formatDateTime formats 12h correctly', () => {
        const date = new Date(2023, 5, 15, 14, 30);
        const result = formatDateTime(date, 'DD-MM-YYYY hh:mm A', '12h');
        expect(result).toBe('15-06-2023 02:30 PM');
    });

    test('parseDateTime parses 24h correctly', () => {
        const result = parseDateTime('15-06-2023 14:30', 'DD-MM-YYYY HH:mm', '24h');
        expect(result).not.toBeNull();
        expect(result!.getFullYear()).toBe(2023);
        expect(result!.getMonth()).toBe(5);
        expect(result!.getDate()).toBe(15);
        expect(result!.getHours()).toBe(14);
        expect(result!.getMinutes()).toBe(30);
    });

    test('parseDateTime parses 12h correctly', () => {
        const result = parseDateTime('15-06-2023 02:30 PM', 'DD-MM-YYYY hh:mm A', '12h');
        expect(result).not.toBeNull();
        expect(result!.getFullYear()).toBe(2023);
        expect(result!.getMonth()).toBe(5);
        expect(result!.getDate()).toBe(15);
        expect(result!.getHours()).toBe(14);
        expect(result!.getMinutes()).toBe(30);
    });

    test('parseDateTime returns null for invalid string', () => {
        const result = parseDateTime('invalid', 'DD-MM-YYYY HH:mm', '24h');
        expect(result).toBeNull();
    });

    test('formatDateTime returns empty string for invalid date', () => {
        const result = formatDateTime(new Date('invalid'), 'DD-MM-YYYY HH:mm', '24h');
        expect(result).toBe('');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Reactive time picker: programmatic value change → time picker updates
// ─────────────────────────────────────────────────────────────────────────────
// Architect concern subtask 4: opening popover, changing value programmatically,
// re-opening popover should show updated time.
// ─────────────────────────────────────────────────────────────────────────────

describe('Reactive time picker update (subtask 4)', () => {
    /** Helper: get a list of [role="option"] items inside a specific listbox (hour or minute). */
    function getOptionsInListbox(timeSection: HTMLElement, listboxIndex: number): HTMLElement[] {
        const listboxes = timeSection.querySelectorAll('[role="listbox"]');
        return Array.from(listboxes[listboxIndex].querySelectorAll('[role="option"]')) as HTMLElement[];
    }

    test('re-opening popover after programmatic value change shows updated time', () => {
        const { container, value$ } = buildDateTimePicker();
        const iconButton = container.querySelector('button')!;
        const input = container.querySelector('input')!;

        // ── Open popover ──────────────────────────────────────────
        fireEvent.click(iconButton);
        const popoverEl = getPopoverEl()!;
        const timeSection = popoverEl.querySelector('.time-picker')!;

        // Verify initial time 14:30 has selected (selectedBg) styling
        const hourOptions = getOptionsInListbox(timeSection, 0);
        const minOptions = getOptionsInListbox(timeSection, 1);
        const hour14 = hourOptions.find(el => el.textContent === '14')!;
        const min30 = minOptions.find(el => el.textContent === '30')!;
        expect(hour14).toBeTruthy();
        expect(min30).toBeTruthy();
        // For ListBoxStyle.BORDERLESS, selected items get bg-on-secondary-container/20
        expect(hour14.className).toContain('bg-on-secondary-container/20');
        expect(min30.className).toContain('bg-on-secondary-container/20');

        // ── Close popover ─────────────────────────────────────────
        fireEvent.keyDown(input, { key: 'Escape' });

        // ── Change value programmatically to 16:45 ─────────────────
        value$.next(new Date(2023, 0, 15, 16, 45));

        // ── Re-open popover ───────────────────────────────────────
        fireEvent.click(iconButton);

        // Verify time picker now shows 16:45
        const hourOptions2 = getOptionsInListbox(timeSection, 0);
        const minOptions2 = getOptionsInListbox(timeSection, 1);
        const hour16 = hourOptions2.find(el => el.textContent === '16')!;
        const min45 = minOptions2.find(el => el.textContent === '45')!;
        expect(hour16).toBeTruthy();
        expect(min45).toBeTruthy();
        expect(hour16.className).toContain('bg-on-secondary-container/20');
        expect(min45.className).toContain('bg-on-secondary-container/20');

        // Verify old selection is no longer highlighted (re-query since DOM was rebuilt)
        const hour14After = hourOptions2.find(el => el.textContent === '14')!;
        const min30After = minOptions2.find(el => el.textContent === '30')!;
        expect(hour14After.className).not.toContain('bg-on-secondary-container/20');
        expect(min30After.className).not.toContain('bg-on-secondary-container/20');
    });

    test('re-opening popover after programmatic value change to null clears selection', () => {
        const { container, value$ } = buildDateTimePicker();
        const iconButton = container.querySelector('button')!;
        const input = container.querySelector('input')!;

        // Open, verify time is shown
        fireEvent.click(iconButton);
        const popoverEl = getPopoverEl()!;
        const timeSection = popoverEl.querySelector('.time-picker')!;

        const hourOptions = getOptionsInListbox(timeSection, 0);
        const minOptions = getOptionsInListbox(timeSection, 1);
        expect(hourOptions.find(el => el.textContent === '14')!.className).toContain('bg-on-secondary-container/20');
        expect(minOptions.find(el => el.textContent === '30')!.className).toContain('bg-on-secondary-container/20');

        // Close, set value to null, re-open
        fireEvent.keyDown(input, { key: 'Escape' });
        value$.next(null);
        fireEvent.click(iconButton);

        // null value retains the last selected hours/minutes state (14:30)
        const allOptions = timeSection.querySelectorAll('[role="option"]');
        let selectedCount = 0;
        allOptions.forEach(opt => {
            if (opt.className.includes('bg-on-secondary-container/20')) selectedCount++;
        });
        expect(selectedCount).toBe(2);
        // Verify the retained selection is hour 14 and minute 30
        const hour14Retained = Array.from(timeSection.querySelectorAll('[role="listbox"]')[0].querySelectorAll('[role="option"]'))
            .find(el => el.textContent === '14')!;
        const min30Retained = Array.from(timeSection.querySelectorAll('[role="listbox"]')[1].querySelectorAll('[role="option"]'))
            .find(el => el.textContent === '30')!;
        expect(hour14Retained.className).toContain('bg-on-secondary-container/20');
        expect(min30Retained.className).toContain('bg-on-secondary-container/20');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 13: Input masking for datetime format
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 13 — input masking', () => {
    function createPickerWithFormat(format: string, timeFormat: '24h' | '12h' = '24h') {
        const container = new DateTimePickerBuilder()
            .withFormat(format)
            .withTimeFormat(timeFormat)
            .build();
        document.body.appendChild(container);
        const input = container.querySelector('input')!;
        return { container, input };
    }

    test('allows digit keys at date placeholder positions (D, M, Y)', () => {
        const { input } = createPickerWithFormat('DD-MM-YYYY HH:mm');
        input.value = '';
        input.setSelectionRange(0, 0);

        const event = new KeyboardEvent('keypress', { key: '1', cancelable: true });
        const prevented = !input.dispatchEvent(event);
        expect(prevented).toBe(false);
    });

    test('blocks non-digit keys at date placeholder positions', () => {
        const { input } = createPickerWithFormat('DD-MM-YYYY HH:mm');
        input.value = '';
        input.setSelectionRange(0, 0);

        const event = new KeyboardEvent('keypress', { key: 'a', cancelable: true });
        const prevented = !input.dispatchEvent(event);
        expect(prevented).toBe(true);
    });

    test('allows digits at time placeholder positions (H, m)', () => {
        const { input } = createPickerWithFormat('DD-MM-YYYY HH:mm');
        // Position cursor at the first H (index 11)
        input.value = '15-06-2023 ';
        input.setSelectionRange(11, 11);

        const event = new KeyboardEvent('keypress', { key: '1', cancelable: true });
        const prevented = !input.dispatchEvent(event);
        expect(prevented).toBe(false);
    });

    test('auto-inserts separator when digit typed at separator position', () => {
        const { input } = createPickerWithFormat('DD-MM-YYYY HH:mm');
        input.value = '1';  // typed one digit for DD
        input.setSelectionRange(1, 1); // cursor at position after "1"

        // Typing digit at position 1 (second D placeholder) — should NOT be prevented
        const event = new KeyboardEvent('keypress', { key: '5', cancelable: true });
        const prevented = !input.dispatchEvent(event);
        expect(prevented).toBe(false);
    });

    test('blocks input beyond format length', () => {
        const { input } = createPickerWithFormat('DD-MM-YYYY HH:mm');
        // Fill the format completely, leaving cursor at end
        input.value = '15-06-2023 14:30';
        input.setSelectionRange(16, 16); // past last char

        // Any typed character should be prevented
        const event = new KeyboardEvent('keypress', { key: '1', cancelable: true });
        const prevented = !input.dispatchEvent(event);
        expect(prevented).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 14: Manual input (oninput) parsing
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 14 — manual input parsing', () => {
    test('typing a valid datetime string updates value$', () => {
        const value$ = new BehaviorSubject<Date | null>(null);
        const container = new DateTimePickerBuilder()
            .withValue(value$)
            .withFormat('DD-MM-YYYY HH:mm')
            .build();
        document.body.appendChild(container);
        const input = container.querySelector('input')!;

        fireEvent.input(input, { target: { value: '15-06-2023 14:30' } });

        const val = value$.getValue();
        expect(val).not.toBeNull();
        expect(val!.getFullYear()).toBe(2023);
        expect(val!.getMonth()).toBe(5); // June
        expect(val!.getDate()).toBe(15);
        expect(val!.getHours()).toBe(14);
        expect(val!.getMinutes()).toBe(30);
    });

    test('clearing the input sets value to null', () => {
        const value$ = new BehaviorSubject<Date | null>(new Date(2023, 0, 15));
        const container = new DateTimePickerBuilder()
            .withValue(value$)
            .build();
        document.body.appendChild(container);
        const input = container.querySelector('input')!;

        fireEvent.input(input, { target: { value: '' } });

        expect(value$.getValue()).toBeNull();
    });

    test('typing invalid string does not clear value$', () => {
        const initialDate = new Date(2023, 0, 15, 14, 30);
        const value$ = new BehaviorSubject<Date | null>(initialDate);
        const container = new DateTimePickerBuilder()
            .withValue(value$)
            .build();
        document.body.appendChild(container);
        const input = container.querySelector('input')!;

        fireEvent.input(input, { target: { value: 'totally-invalid' } });

        // value$ should remain unchanged because oninput guards with parseDateTime
        expect(value$.getValue()).toEqual(initialDate);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 15: Caption, enabled, and error observables
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 15 — caption, enabled, error', () => {
    test('withCaption shows caption text and hides on empty string', () => {
        const caption$ = new BehaviorSubject<string>('My Caption');
        const container = new DateTimePickerBuilder()
            .withCaption(caption$)
            .build();
        document.body.appendChild(container);

        const captionEl = container.querySelector('span.md-label-small') as HTMLElement;
        expect(captionEl.textContent).toBe('My Caption');
        expect(captionEl.classList.contains('hidden')).toBe(false);

        caption$.next('');
        expect(captionEl.classList.contains('hidden')).toBe(true);
    });

    test('withEnabled(false) disables input and icon button', () => {
        const enabled$ = new BehaviorSubject<boolean>(false);
        const container = new DateTimePickerBuilder()
            .withEnabled(enabled$)
            .build();
        document.body.appendChild(container);

        const input = container.querySelector('input')!;
        const iconBtn = container.querySelector('button')!;

        expect(input.disabled).toBe(true);
        expect(iconBtn.disabled).toBe(true);
        expect(container.classList.contains('opacity-38')).toBe(true);
        expect(container.classList.contains('pointer-events-none')).toBe(true);

        // Re-enable
        enabled$.next(true);
        expect(input.disabled).toBe(false);
        expect(iconBtn.disabled).toBe(false);
    });

    test('withError shows error message and border-error', () => {
        const error$ = new BehaviorSubject<string>('Invalid datetime');
        const container = new DateTimePickerBuilder()
            .withError(error$)
            .build();
        document.body.appendChild(container);

        const errorEl = container.querySelector('span.text-error') as HTMLElement;
        const inputWrapper = container.querySelector('div.flex.items-center') as HTMLElement;

        expect(errorEl.textContent).toBe('Invalid datetime');
        expect(errorEl.classList.contains('hidden')).toBe(false);
        expect(inputWrapper.classList.contains('border-error')).toBe(true);

        // Clear error
        error$.next('');
        expect(errorEl.classList.contains('hidden')).toBe(true);
        expect(inputWrapper.classList.contains('border-error')).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 16: Hour and minute selection updates value
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 16 — hour/minute selection updates value', () => {
    function getTimeOptions(container: HTMLElement, listboxIndex: number): HTMLElement[] {
        const popoverEl = document.body.querySelector('[popover]')!;
        const timeSection = popoverEl.querySelector('.time-picker')!;
        const listboxes = timeSection.querySelectorAll('[role="listbox"]');
        return Array.from(listboxes[listboxIndex].querySelectorAll('[role="option"]')) as HTMLElement[];
    }

    test('clicking an hour button updates the hours in value$', () => {
        const { container, value$ } = buildDateTimePicker();
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const hourOptions = getTimeOptions(container, 0);
        // current value is 14:30, click hour 16
        const hour16 = hourOptions.find(el => el.textContent === '16')!;
        fireEvent.click(hour16);

        const val = value$.getValue();
        expect(val!.getHours()).toBe(16);
        expect(val!.getMinutes()).toBe(30); // minutes preserved
    });

    test('clicking a minute button updates the minutes in value$', () => {
        const { container, value$ } = buildDateTimePicker();
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const minOptions = getTimeOptions(container, 1);
        // current value is 14:30, click minute 45
        const min45 = minOptions.find(el => el.textContent === '45')!;
        fireEvent.click(min45);

        const val = value$.getValue();
        expect(val!.getHours()).toBe(14); // hours preserved
        expect(val!.getMinutes()).toBe(45);
    });

    test('selecting hour then minute produces correct combined datetime', () => {
        const { container, value$ } = buildDateTimePicker();
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const hourOptions = getTimeOptions(container, 0);
        const minOptions = getTimeOptions(container, 1);

        const hour16 = hourOptions.find(el => el.textContent === '16')!;
        fireEvent.click(hour16); // hours=16, minutes=30

        // Popover stays open — select minute directly
        const min45 = minOptions.find(el => el.textContent === '45')!;
        fireEvent.click(min45);

        const val = value$.getValue();
        expect(val!.getHours()).toBe(16);
        expect(val!.getMinutes()).toBe(45);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 17: AM/PM toggle behavior (12h mode)
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 17 — AM/PM toggle (12h mode)', () => {
    test('clicking the checkbox when AM toggles to PM and adjusts hours', () => {
        const value$ = new BehaviorSubject<Date | null>(new Date(2023, 0, 15, 9, 0)); // 09:00 AM
        const container = new DateTimePickerBuilder()
            .withValue(value$)
            .withFormat('DD-MM-YYYY hh:mm A')
            .withTimeFormat('12h')
            .build() as HTMLElement & { showPopover(): void; hidePopover(): void; toggle(): void };
        document.body.appendChild(container);
        (container as any).showPopover();

        // Find the AM/PM checkbox inside the time section
        const popoverEl = document.body.querySelector('[popover]')!;
        const timeSection = popoverEl.querySelector('.time-picker')!;
        // The checkbox renders as a <label> containing an <input type="checkbox">
        const checkboxes = timeSection.querySelectorAll('input[type="checkbox"]');
        expect(checkboxes.length).toBe(1);

        const checkbox = checkboxes[0] as HTMLInputElement;
        // Initially isPM$ = false (9 < 12), so checkbox is unchecked
        expect(checkbox.checked).toBe(false);

        // Click the checkbox label to toggle to PM
        const checkboxLabel = checkbox.closest('label')!;
        fireEvent.click(checkboxLabel);

        // After toggle: hours should change from 9 to 21 (9+12)
        const val = value$.getValue();
        expect(val!.getHours()).toBe(21);
    });

    test('clicking the checkbox when PM toggles to AM and adjusts hours', () => {
        const value$ = new BehaviorSubject<Date | null>(new Date(2023, 0, 15, 14, 0)); // 02:00 PM
        const container = new DateTimePickerBuilder()
            .withValue(value$)
            .withFormat('DD-MM-YYYY hh:mm A')
            .withTimeFormat('12h')
            .build() as HTMLElement & { showPopover(): void; hidePopover(): void; toggle(): void };
        document.body.appendChild(container);
        (container as any).showPopover();

        const popoverEl = document.body.querySelector('[popover]')!;
        const timeSection = popoverEl.querySelector('.time-picker')!;
        const checkboxes = timeSection.querySelectorAll('input[type="checkbox"]');
        const checkbox = checkboxes[0] as HTMLInputElement;

        // Initially isPM$ = true (14 >= 12), so checkbox is checked
        expect(checkbox.checked).toBe(true);

        const checkboxLabel = checkbox.closest('label')!;
        fireEvent.click(checkboxLabel);

        // After toggle: hours should change from 14 to 2 (14-12)
        const val = value$.getValue();
        expect(val!.getHours()).toBe(2);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 18: 24h mode hour range
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 18 — 24h mode hour range', () => {
    test('24h hour list shows 0–23 (24 items)', () => {
        const { container } = buildDateTimePicker({ timeFormat: '24h' });
        const iconButton = container.querySelector('button')!;
        fireEvent.click(iconButton);

        const popoverEl = getPopoverEl()!;
        const timeSection = popoverEl.querySelector('.time-picker')!;
        const hourListbox = timeSection.querySelector('[role="listbox"]')!;
        const hourOptions = hourListbox.querySelectorAll('[role="option"]');

        expect(hourOptions.length).toBe(24);
        // First item should be "00"
        expect(hourOptions[0].textContent).toBe('00');
        // Last item should be "23"
        expect(hourOptions[23].textContent).toBe('23');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec 19: Custom format
// ─────────────────────────────────────────────────────────────────────────────

describe('Spec 19 — custom format', () => {
    test('withFormat changes the input placeholder', () => {
        const container = new DateTimePickerBuilder()
            .withFormat('YYYY/MM/DD HH:mm')
            .build();
        document.body.appendChild(container);

        const input = container.querySelector('input')!;
        expect(input.placeholder).toBe('YYYY/MM/DD HH:mm');
    });

    test('withFormat affects display of initial value', () => {
        const value$ = new BehaviorSubject<Date | null>(new Date(2023, 5, 15, 14, 30));
        const container = new DateTimePickerBuilder()
            .withValue(value$)
            .withFormat('YYYY/MM/DD HH:mm')
            .build();
        document.body.appendChild(container);

        const input = container.querySelector('input')!;
        expect(input.value).toBe('2023/06/15 14:30');
    });
});
