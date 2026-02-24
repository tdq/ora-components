import { BehaviorSubject } from 'rxjs';
import { DatePickerBuilder } from './datepicker-builder';
import { fireEvent, screen } from '@testing-library/dom';
import { formatDate, parseDate, isValidDate } from './date-utils';

describe('DatePicker Utilities', () => {
    test('isValidDate should validate dates correctly', () => {
        expect(isValidDate(new Date())).toBe(true);
        expect(isValidDate(new Date('invalid'))).toBe(false);
        expect(isValidDate(null)).toBe(false);
    });

    test('formatDate should format dates according to template', () => {
        const date = new Date(2023, 4, 15); // May 15, 2023
        expect(formatDate(date, 'YYYY-MM-DD')).toBe('2023-05-15');
        expect(formatDate(date, 'DD/MM/YYYY')).toBe('15/05/2023');
    });

    test('parseDate should parse strings according to template', () => {
        const format = 'YYYY-MM-DD';
        const date = parseDate('2023-05-15', format);
        expect(date).not.toBeNull();
        expect(date?.getFullYear()).toBe(2023);
        expect(date?.getMonth()).toBe(4);
        expect(date?.getDate()).toBe(15);

        expect(parseDate('invalid', format)).toBeNull();
        expect(parseDate('2023-02-31', format)).toBeNull(); // Invalid date
    });
});

describe('DatePickerBuilder', () => {
    let builder: DatePickerBuilder;

    beforeEach(() => {
        builder = new DatePickerBuilder();
        document.body.innerHTML = '';
    });

    test('should render DatePicker with initial value', () => {
        const value$ = new BehaviorSubject<Date | null>(new Date(2023, 0, 1));
        const container = builder
            .withValue(value$)
            .build();
        document.body.appendChild(container);

        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.value).toBe('01-01-2023');
    });

    test('should open calendar on icon click', () => {
        const container = builder.build();
        document.body.appendChild(container);

        const iconButton = container.querySelector('button');
        const popup = container.querySelector('.absolute');
        
        expect(popup).toHaveClass('hidden');
        
        fireEvent.click(iconButton!);
        expect(popup).not.toHaveClass('hidden');
    });

    test('should update value on manual input', () => {
        const value$ = new BehaviorSubject<Date | null>(null);
        const container = builder
            .withValue(value$)
            .build();
        document.body.appendChild(container);

        const input = screen.getByRole('textbox') as HTMLInputElement;
        fireEvent.input(input, { target: { value: '25-12-2023' } });

        const updatedDate = value$.getValue();
        expect(updatedDate).not.toBeNull();
        expect(updatedDate?.getFullYear()).toBe(2023);
        expect(updatedDate?.getMonth()).toBe(11);
        expect(updatedDate?.getDate()).toBe(25);
    });

    test('should select date from calendar', () => {
        const value$ = new BehaviorSubject<Date | null>(null);
        const container = builder
            .withValue(value$)
            .build();
        document.body.appendChild(container);

        // Open calendar
        const iconButton = container.querySelector('button');
        fireEvent.click(iconButton!);

        // Find a day (e.g., 15th)
        const day15 = screen.getByText('15');
        fireEvent.click(day15);

        expect(value$.getValue()).not.toBeNull();
        expect(value$.getValue()?.getDate()).toBe(15);
        
        // Popup should be hidden after selection
        const popup = container.querySelector('.absolute');
        expect(popup).toHaveClass('hidden');
    });

    test('should apply glass styling', () => {
        const container = builder
            .asGlass()
            .build();
        document.body.appendChild(container);

        const wrapper = container.querySelector('.glass-effect');
        expect(wrapper).toBeTruthy();
    });

    test('should display error message', () => {
        const error$ = new BehaviorSubject<string>('Invalid date');
        const container = builder
            .withError(error$)
            .build();
        document.body.appendChild(container);

        expect(screen.getByText('Invalid date')).not.toHaveClass('hidden');
        const wrapper = container.querySelector('.border-error');
        expect(wrapper).toBeTruthy();
    });

    test('should respect min/max dates', () => {
        const minDate = new Date(2023, 0, 10);
        const maxDate = new Date(2023, 0, 20);
        const value$ = new BehaviorSubject<Date | null>(new Date(2023, 0, 15));
        
        const container = builder
            .withValue(value$)
            .withMinDate(new BehaviorSubject(minDate))
            .withMaxDate(new BehaviorSubject(maxDate))
            .build();
        document.body.appendChild(container);

        // Open calendar
        const iconButton = container.querySelector('button');
        fireEvent.click(iconButton!);

        // Day 5 should be disabled
        const day5 = screen.getByText('5') as HTMLButtonElement;
        expect(day5.disabled).toBe(true);

        // Day 15 should be enabled
        const day15 = screen.getByText('15') as HTMLButtonElement;
        expect(day15.disabled).toBe(false);

        // Day 25 should be disabled
        const day25 = screen.getByText('25') as HTMLButtonElement;
        expect(day25.disabled).toBe(true);
    });

    test('should support keyboard navigation', () => {
        const initialDate = new Date(2023, 0, 15);
        const value$ = new BehaviorSubject<Date | null>(initialDate);
        const container = builder
            .withValue(value$)
            .build();
        document.body.appendChild(container);

        // Open calendar
        const iconButton = container.querySelector('button');
        fireEvent.click(iconButton!);

        const grid = screen.getByRole('grid');
        
        // Press ArrowRight to move to Jan 16
        fireEvent.keyDown(grid, { key: 'ArrowRight' });
        // Press Enter to select
        fireEvent.keyDown(grid, { key: 'Enter' });

        const updatedDate = value$.getValue();
        expect(updatedDate?.getFullYear()).toBe(2023);
        expect(updatedDate?.getMonth()).toBe(0);
        expect(updatedDate?.getDate()).toBe(16);
        
        // Popup should be hidden
        const popup = container.querySelector('.absolute');
        expect(popup).toHaveClass('hidden');
    });

    test('should update calendar view when opening after value change', () => {
        const value$ = new BehaviorSubject<Date | null>(new Date(2023, 0, 1)); // Jan 2023
        const container = builder
            .withValue(value$)
            .build();
        document.body.appendChild(container);

        // Change value via input to Dec 2023
        const input = screen.getByRole('textbox') as HTMLInputElement;
        fireEvent.input(input, { target: { value: '25-12-2023' } });

        // Open calendar
        const iconButton = container.querySelector('button');
        fireEvent.click(iconButton!);

        // Calendar should show December 2023
        expect(screen.getByText('December 2023')).toBeTruthy();
    });

    test('should enforce input masking', () => {
        const container = builder.build();
        document.body.appendChild(container);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        // Mock selectionStart/End since JSDOM might not handle it perfectly in all fireEvent scenarios
        input.setSelectionRange(0, 0);

        // Type '1'
        fireEvent.keyPress(input, { key: '1', charCode: 49 });
        // JSDOM keyPress doesn't actually update value by default,
        // but our masking logic might if it's auto-inserting.
        // However, for normal characters, it relies on the browser's default action.
        // In tests, we might need to manually update value to simulate browser behavior.
        
        // Wait, if I want to test the masking logic, I should check if preventDefault was called.
        // But better yet, I can test the auto-insertion.

        // Test auto-insertion of separator
        input.value = '12';
        input.setSelectionRange(2, 2);
        const event = new KeyboardEvent('keypress', { key: '3', cancelable: true });
        input.dispatchEvent(event);

        // If my logic worked, input.value should now be '12-3' because of auto-insertion
        expect(input.value).toBe('12-3');
    });

    test('should block invalid characters', () => {
        const container = builder.build();
        document.body.appendChild(container);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        input.value = '';
        input.setSelectionRange(0, 0);
        
        // 'a' is not allowed where 'D' is expected
        const event = new KeyboardEvent('keypress', { key: 'a', cancelable: true });
        const prevented = !input.dispatchEvent(event);
        expect(prevented).toBe(true);

        // '1' is allowed
        const event2 = new KeyboardEvent('keypress', { key: '1', cancelable: true });
        const prevented2 = !input.dispatchEvent(event2);
        expect(prevented2).toBe(false);
    });
});
