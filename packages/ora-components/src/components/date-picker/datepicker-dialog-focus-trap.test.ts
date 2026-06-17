import { fireEvent } from '@testing-library/dom';
import { BehaviorSubject } from 'rxjs';
import { DatePickerBuilder } from './datepicker-builder';
import { setupFocusTrap } from '../../core/focus-trap';

// Regression: a datepicker inside a dialog kept its calendar popover in the dialog's
// DOM (display:none) after closing. The focus trap then treated the popover's hidden
// buttons (prev/next month, grid) as focusable; wrapping/recovery onto a hidden element
// dropped focus to <body>, silently breaking the dialog's focus trap.

beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
    // jsdom does not implement the native Popover API.
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

function buildDialogWithDatePicker() {
    const dialog = document.createElement('dialog');

    // A sentinel focusable control that is the dialog's true first focusable element.
    const sentinel = document.createElement('button');
    sentinel.id = 'sentinel';
    dialog.appendChild(sentinel);

    const value$ = new BehaviorSubject<Date | null>(null);
    const dp = new DatePickerBuilder().withValue(value$).build();
    dialog.appendChild(dp);

    document.body.appendChild(dialog);
    setupFocusTrap(dialog);

    return { dialog, dp, sentinel };
}

test('after Escape closes the calendar, focus trap recovery stays inside the dialog', () => {
    const { dialog, dp } = buildDialogWithDatePicker();
    const iconButton = dp.querySelector('button')!;

    // Open via the icon button, then close via Escape on the grid.
    fireEvent.click(iconButton);
    const popoverEl = dialog.querySelector('[popover]') as HTMLElement;
    expect(popoverEl).toBeTruthy();
    expect(popoverEl.querySelectorAll('button').length).toBeGreaterThan(0); // prev/next month buttons

    const grid = popoverEl.querySelector('[role="grid"]') as HTMLElement;
    fireEvent.keyDown(grid, { key: 'Escape', bubbles: true });

    // Popover is now closed but still in the dialog DOM as display:none.
    expect(popoverEl.style.display).toBe('none');

    // Simulate focus escaping to <body>; the trap must recover INTO the dialog,
    // and must never land on a hidden button inside the closed popover.
    document.body.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(popoverEl.contains(document.activeElement)).toBe(false);
});

test('Tab after the calendar closes wraps within the dialog (not onto hidden popover buttons)', () => {
    const { dialog, dp, sentinel } = buildDialogWithDatePicker();
    const iconButton = dp.querySelector('button')!;

    fireEvent.click(iconButton);
    const popoverEl = dialog.querySelector('[popover]') as HTMLElement;
    const grid = popoverEl.querySelector('[role="grid"]') as HTMLElement;
    fireEvent.keyDown(grid, { key: 'Escape', bubbles: true });

    // From the last real control (the icon button), Tab should wrap to the sentinel,
    // not to a hidden prev/next-month button inside the closed popover.
    iconButton.focus();
    iconButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

    expect(document.activeElement).toBe(sentinel);
    expect(popoverEl.contains(document.activeElement)).toBe(false);
});

