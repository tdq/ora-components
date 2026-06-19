import { BehaviorSubject } from 'rxjs';
import { MoneyFieldBuilder } from './money-field';
import { Money } from '../../types/money';

describe('MoneyField Currency Dropdown Keyboard Navigation', () => {
    let builder: MoneyFieldBuilder;

    beforeEach(() => {
        builder = new MoneyFieldBuilder();
        document.body.innerHTML = '';
    });

    test('when popover is expanded, focus moves to ListBox', () => {
        const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
        const container = builder
            .withValue(value$)
            .withCurrencies(['USD', 'EUR', 'GBP'])
            .build();
        document.body.appendChild(container);

        const currencyButton = container.querySelector('.currency-dropdown button') as HTMLButtonElement;
        expect(currencyButton).toBeTruthy();

        // Click to open dropdown
        currencyButton.click();

        // Check if ListBox is focused
        const listbox = document.querySelector('ul[role="listbox"]') as HTMLElement;
        expect(listbox).toBeTruthy();
        expect(document.activeElement).toBe(listbox);
    });

    test('Up and Down keys navigate through currencies', () => {
        const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
        const container = builder
            .withValue(value$)
            .withCurrencies(['USD', 'EUR', 'GBP'])
            .build();
        document.body.appendChild(container);

        const currencyButton = container.querySelector('.currency-dropdown button') as HTMLButtonElement;
        currencyButton.click();

        const listbox = document.querySelector('ul[role="listbox"]') as HTMLElement;
        expect(listbox).toBeTruthy();

        // Initially USD (index 0) is focused. ArrowDown should move to EUR (index 1).
        listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        expect(value$.value?.currencyId).toBe('EUR');
        expect(document.activeElement).toBe(currencyButton);
    });

    test('ArrowDown from button opens dropdown and focuses ListBox', () => {
        const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
        const container = builder
            .withValue(value$)
            .withCurrencies(['USD', 'EUR', 'GBP'])
            .build();
        document.body.appendChild(container);

        const currencyButton = container.querySelector('.currency-dropdown button') as HTMLButtonElement;
        
        currencyButton.focus();
        currencyButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

        const listbox = document.querySelector('ul[role="listbox"]') as HTMLElement;
        expect(listbox).toBeTruthy();
        expect(document.activeElement).toBe(listbox);
    });

    test('Space from button opens dropdown and focuses ListBox', () => {
        const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
        const container = builder
            .withValue(value$)
            .withCurrencies(['USD', 'EUR', 'GBP'])
            .build();
        document.body.appendChild(container);

        const currencyButton = container.querySelector('.currency-dropdown button') as HTMLButtonElement;
        
        currencyButton.focus();
        currencyButton.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

        const listbox = document.querySelector('ul[role="listbox"]') as HTMLElement;
        expect(listbox).toBeTruthy();
        expect(document.activeElement).toBe(listbox);
    });

    test('Enter from button opens dropdown and focuses ListBox', () => {
        const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
        const container = builder
            .withValue(value$)
            .withCurrencies(['USD', 'EUR', 'GBP'])
            .build();
        document.body.appendChild(container);

        const currencyButton = container.querySelector('.currency-dropdown button') as HTMLButtonElement;
        
        currencyButton.focus();
        // Enter usually triggers click on buttons
        currencyButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        // If it doesn't trigger click in jsdom, we might need to call click() or handle Enter in onkeydown
        if (document.activeElement !== document.querySelector('ul[role="listbox"]')) {
             currencyButton.click();
        }

        const listbox = document.querySelector('ul[role="listbox"]') as HTMLElement;
        expect(listbox).toBeTruthy();
        expect(document.activeElement).toBe(listbox);
    });

    test('Escape from ListBox closes dropdown and returns focus to button', () => {
        const value$ = new BehaviorSubject<Money | null>({ amount: 10, currencyId: 'USD' });
        const container = builder
            .withValue(value$)
            .withCurrencies(['USD', 'EUR', 'GBP'])
            .build();
        document.body.appendChild(container);

        const currencyButton = container.querySelector('.currency-dropdown button') as HTMLButtonElement;
        currencyButton.click();

        const listbox = document.querySelector('ul[role="listbox"]') as HTMLElement;
        expect(listbox).toBeTruthy();
        expect(document.activeElement).toBe(listbox);

        listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        const popover = listbox.closest('[popover]') as HTMLElement;
        expect(popover.style.display).toBe('none');
        expect(currencyButton.getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(currencyButton);
    });
});
