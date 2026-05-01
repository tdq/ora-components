import { BehaviorSubject, Observable, Subject, Subscription, of } from 'rxjs';
import { CurrencyRegistry } from '@/utils/currency-registry';
import { Icons } from '@/core/icons';
import { registerDestroy } from '@/core/destroyable-element';
import { PopoverBuilder } from '../component-parts/popover';
import { ListBoxBuilder } from '../listbox/listbox';
import { ListBoxStyle } from '../listbox/types';

let dropdownIdCounter = 0;

// Fix 3: Hoisted to module scope — constructed at most once per process lifetime
let currencyDisplayNames: Intl.DisplayNames | null = null;
function getCurrencyDisplayName(currencyId: string): string {
    try {
        if (!currencyDisplayNames) {
            currencyDisplayNames = new Intl.DisplayNames(['en'], { type: 'currency' });
        }
        return currencyDisplayNames.of(currencyId.toUpperCase()) || currencyId;
    } catch {
        return currencyId;
    }
}

interface CurrencyItem {
    id: string;
    label: string;
}

function createChevronIcon(): HTMLElement {
    const icon = document.createElement('span');
    icon.innerHTML = Icons.CHEVRON_DOWN;
    const svg = icon.querySelector('svg');
    if (svg) {
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.style.display = 'block';
    }
    return icon;
}

export function createCurrencyDropdown(
    currencies: string[],
    currencyValue$: Subject<string | null>,
    enabled$: Observable<boolean>,
    isGlass: boolean,
    positionReference?: HTMLElement
): HTMLElement {
    const subscriptions = new Subscription();

    const listId = `currency-listbox-${++dropdownIdCounter}`;
    let isOpen = false;
    let currentCurrency: string | null = null;
    let isPreSelecting = false;

    // Build currency items for ListBox
    const currencyItems: CurrencyItem[] = currencies.map(id => ({
        id,
        label: `${CurrencyRegistry.getSymbol(id)} ${getCurrencyDisplayName(id)}`
    }));

    // Root container
    const container = document.createElement('div');
    container.className = 'currency-dropdown flex items-center h-full';

    // Trigger button
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', listId);
    button.className = [
        'flex', 'items-center', 'gap-1', 'px-1', 'h-full',
        'cursor-pointer', 'bg-transparent', 'border-0', 'outline-none',
        'focus-visible:ring-2', 'focus-visible:ring-primary', 'rounded-sm'
    ].join(' ');

    // Currency symbol span
    const symbolSpan = document.createElement('span');
    symbolSpan.className = isGlass
        ? 'body-large text-gray-900 dark:text-white/80 select-none'
        : 'body-large text-on-surface-variant select-none';

    // Chevron icon
    const chevron = createChevronIcon();
    chevron.className = isGlass ? 'text-gray-900 dark:text-white/80' : 'text-on-surface-variant';

    button.appendChild(symbolSpan);
    button.appendChild(chevron);
    container.appendChild(button);

    // ListBox setup
    const listBoxValue$ = new BehaviorSubject<CurrencyItem | null>(null);

    const listBox = new ListBoxBuilder<CurrencyItem>()
        .withItems(of(currencyItems))
        .withValue(listBoxValue$)
        .withItemCaptionProvider(item => item.label)
        .withItemIdProvider(item => item.id)
        .withStyle(of(ListBoxStyle.BORDERLESS));

    const listBoxEl = listBox.build();

    // Assign the listId to the inner <ul> so aria-controls on the button points to it
    const ul = listBoxEl.querySelector('ul[role="listbox"]') as HTMLUListElement | null;
    if (!ul) throw new Error('ListBoxBuilder did not produce a <ul role="listbox"> element');
    ul.id = listId;

    // PopoverBuilder manages DOM attachment, positioning, and all close events
    const popover = new PopoverBuilder()
        .withAnchor(button)
        .withContent({ build: () => listBoxEl })
        .withWidth('auto')
        .withAlignment('end')
        .withMaxWidth('300px')
        .withOnClose(() => {
            isOpen = false;
            button.setAttribute('aria-expanded', 'false');
            button.removeAttribute('aria-activedescendant');
        });

    if (positionReference) {
        popover.withPositionReference(positionReference);
    }

    if (isGlass) {
        popover.asGlass();
    } else {
        popover.withClass('bg-surface border border-outline');
    }

    function openDropdown() {
        if (isOpen) return;
        isOpen = true;

        // Pre-select the current currency for visual highlight — suppress the selection callback
        const current = currencyItems.find(c => c.id === currentCurrency);
        isPreSelecting = true;
        listBoxValue$.next(current ?? null);
        isPreSelecting = false;

        popover.show();
        button.setAttribute('aria-expanded', 'true');

        // Focus the list so keyboard nav works immediately
        const listEl = listBoxEl.querySelector('ul[role="listbox"]') as HTMLElement;
        listEl?.focus();
    }

    function closeDropdown() {
        if (!isOpen) return;
        popover.close();
        // State reset happens in withOnClose callback
    }

    function toggleDropdown() {
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    }

    // Selection handling: ListBox emits via listBoxValue$ on click or Enter
    subscriptions.add(
        listBoxValue$.subscribe(item => {
            if (item !== null && !isPreSelecting) {
                currencyValue$.next(item.id);
                closeDropdown();
            }
        })
    );

    // Button click
    button.onclick = (e) => {
        e.stopPropagation();
        toggleDropdown();
    };

    // ArrowDown/Up/Space open the dropdown when closed; Escape closes when open.
    // All navigation keys (ArrowDown/Up/Home/End/Enter) are handled by ListBox's <ul> keydown.
    button.onkeydown = (e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ') {
                e.preventDefault();
                openDropdown();
            }
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            closeDropdown();
        }
        // Everything else (ArrowDown/Up/Enter etc.) is handled by ListBox's <ul> keydown
    };

    // Subscribe to currency value changes to update the displayed symbol
    subscriptions.add(
        currencyValue$.subscribe(currencyId => {
            currentCurrency = currencyId;
            if (currencyId) {
                symbolSpan.textContent = CurrencyRegistry.getSymbol(currencyId);
            } else if (currencies.length > 0) {
                symbolSpan.textContent = CurrencyRegistry.getSymbol(currencies[0]);
            }
        })
    );

    // Subscribe to enabled$ to toggle disabled state
    subscriptions.add(
        enabled$.subscribe(enabled => {
            if (enabled) {
                button.classList.remove('opacity-38', 'cursor-not-allowed', 'pointer-events-none');
            } else {
                button.classList.add('opacity-38', 'cursor-not-allowed', 'pointer-events-none');
                if (isOpen) closeDropdown();
            }
        })
    );

    // Initialize symbol display from first currency if no current value
    if (currencies.length > 0) {
        symbolSpan.textContent = CurrencyRegistry.getSymbol(currencies[0]);
    }

    // Cleanup — PopoverBuilder registers its own cleanup on the button element via registerDestroy,
    // so click/scroll/resize listeners and popover DOM removal are handled automatically.
    registerDestroy(container, () => {
        subscriptions.unsubscribe();
        if (isOpen) {
            popover.close();
        }
    });

    return container;
}
