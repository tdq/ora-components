import { BehaviorSubject, of, Subject } from 'rxjs';
import '@testing-library/jest-dom';
import { ListBoxBuilder } from './listbox';
import { ListBoxStyle } from './types';

const FRUITS = ['Apple', 'Banana', 'Cherry'];

function buildBorderless(error$?: BehaviorSubject<string>) {
    const value$ = new BehaviorSubject<string | null>(null);
    const builder = new ListBoxBuilder<string>()
        .withItems(of(FRUITS))
        .withValue(value$)
        .withStyle(of(ListBoxStyle.BORDERLESS));
    if (error$) builder.withError(error$);
    const el = builder.build();
    return { el, value$ };
}

function buildDefault() {
    const value$ = new BehaviorSubject<string | null>(null);
    const el = new ListBoxBuilder<string>()
        .withItems(of(FRUITS))
        .withValue(value$)
        .build();
    return { el, value$ };
}

function getUl(el: HTMLElement): HTMLUListElement {
    return el.querySelector('ul[role="listbox"]') as HTMLUListElement;
}

function getPanel(el: HTMLElement): HTMLDivElement {
    return el.querySelector('div:has(ul[role="listbox"])') as HTMLDivElement;
}

function getLiElements(el: HTMLElement): HTMLLIElement[] {
    return Array.from(el.querySelectorAll('li[role="option"]')) as HTMLLIElement[];
}

function fireKey(ul: HTMLUListElement, key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    ul.dispatchEvent(event);
    return event;
}

describe('ListBoxBuilder', () => {

    // ── withStyle(BORDERLESS) ────────────────────────────────────────────────

    describe('withStyle(BORDERLESS)', () => {

        // Spec 1: panel has no border classes
        it('panel does NOT have rounded-large, border, or border-outline classes', () => {
            const { el } = buildBorderless();
            const panel = getPanel(el);
            expect(panel).not.toHaveClass('rounded-large');
            expect(panel).not.toHaveClass('border');
            expect(panel).not.toHaveClass('border-outline');
        });

        // Spec 2: selected item uses bg-on-secondary-container/20 (tonal background)
        it('selected item uses bg-on-secondary-container/20', () => {
            const value$ = new BehaviorSubject<string | null>('Apple');
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(value$)
                .withStyle(of(ListBoxStyle.BORDERLESS))
                .build();

            const lis = getLiElements(el);
            expect(lis[0]).toHaveClass('bg-on-secondary-container/20');
        });

        // Spec 2 continued: unselected items do NOT have selected background
        it('unselected items do NOT have bg-on-secondary-container/20', () => {
            const value$ = new BehaviorSubject<string | null>('Apple');
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(value$)
                .withStyle(of(ListBoxStyle.BORDERLESS))
                .build();

            const lis = getLiElements(el);
            expect(lis[1]).not.toHaveClass('bg-on-secondary-container/20');
            expect(lis[2]).not.toHaveClass('bg-on-secondary-container/20');
        });

        // Spec 3: error re-introduces border
        it('panel gets rounded-large border border-error when withError emits a non-empty string', () => {
            const error$ = new BehaviorSubject('required');
            const { el } = buildBorderless(error$);
            const panel = getPanel(el);
            expect(panel).toHaveClass('rounded-large');
            expect(panel).toHaveClass('border');
            expect(panel).toHaveClass('border-error');
        });

        // Spec 4: clearing the error removes the border again
        it('border is removed again when error clears to empty string', () => {
            const error$ = new BehaviorSubject('required');
            const { el } = buildBorderless(error$);
            const panel = getPanel(el);

            // Sanity: border present while error is active
            expect(panel).toHaveClass('border');

            error$.next('');
            expect(panel).not.toHaveClass('rounded-large');
            expect(panel).not.toHaveClass('border');
            expect(panel).not.toHaveClass('border-error');
        });
    });

    // ── Glass effect ─────────────────────────────────────────────────────────

    describe('glass effect (asGlass)', () => {

        // Spec 1: BORDERLESS + glass — container must NOT have glass-effect class
        it('BORDERLESS + glass: inner container does NOT have glass-effect class', () => {
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(new BehaviorSubject<string | null>(null))
                .withStyle(of(ListBoxStyle.BORDERLESS))
                .asGlass()
                .build();
            const panel = getPanel(el);
            expect(panel).not.toHaveClass('glass-effect');
        });

        // Spec 1: TONAL + glass — container DOES have glass-effect class
        it('TONAL + glass: inner container DOES have glass-effect class', () => {
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(new BehaviorSubject<string | null>(null))
                .withStyle(of(ListBoxStyle.TONAL))
                .asGlass()
                .build();
            const panel = getPanel(el);
            expect(panel).toHaveClass('glass-effect');
        });

        // Spec 1: BORDERLESS + glass — selected item uses glass color (bg-white/40)
        it('BORDERLESS + glass: selected item uses bg-white/40 (glass selected color)', () => {
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(new BehaviorSubject<string | null>('Apple'))
                .withStyle(of(ListBoxStyle.BORDERLESS))
                .asGlass()
                .build();
            const lis = getLiElements(el);
            expect(lis[0]).toHaveClass('bg-white/40');
        });

        // Spec 1: BORDERLESS + glass — unselected items use hover:bg-black/5
        it('BORDERLESS + glass: unselected items have hover:bg-black/5 class', () => {
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(new BehaviorSubject<string | null>('Apple'))
                .withStyle(of(ListBoxStyle.BORDERLESS))
                .asGlass()
                .build();
            const lis = getLiElements(el);
            // Banana and Cherry are unselected — they get hover:bg-black/5
            expect(lis[1]).toHaveClass('hover:bg-black/5');
            expect(lis[2]).toHaveClass('hover:bg-black/5');
        });

        // Spec 1: BORDERLESS + glass — selected item does NOT have the standard tonal selected bg
        it('BORDERLESS + glass: selected item does NOT have bg-on-secondary-container/20', () => {
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(new BehaviorSubject<string | null>('Apple'))
                .withStyle(of(ListBoxStyle.BORDERLESS))
                .asGlass()
                .build();
            const lis = getLiElements(el);
            expect(lis[0]).not.toHaveClass('bg-on-secondary-container/20');
        });
    });

    // ── Regression: default TONAL style retains border classes ───────────────

    describe('default style (TONAL) regression', () => {
        it('panel still has rounded-large border border-outline with default TONAL style', () => {
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .build();
            const panel = getPanel(el);
            expect(panel).toHaveClass('rounded-large');
            expect(panel).toHaveClass('border');
            expect(panel).toHaveClass('border-outline');
        });
    });

    // ── Keyboard navigation ──────────────────────────────────────────────────

    describe('keyboard navigation', () => {

        // Spec 1: ul[role="listbox"] has tabindex="-1"
        it('ul[role="listbox"] has tabIndex -1', () => {
            const { el } = buildDefault();
            const ul = getUl(el);
            expect(ul.tabIndex).toBe(-1);
        });

        // Spec 2: ArrowDown advances focused index; wraps from last to first
        it('ArrowDown moves focus forward through items', () => {
            const { el } = buildDefault();
            const ul = getUl(el);

            fireKey(ul, 'ArrowDown'); // -1 → 0
            expect(getLiElements(el)[0]).toHaveClass('bg-on-surface/12');

            fireKey(ul, 'ArrowDown'); // 0 → 1
            expect(getLiElements(el)[1]).toHaveClass('bg-on-surface/12');

            fireKey(ul, 'ArrowDown'); // 1 → 2
            expect(getLiElements(el)[2]).toHaveClass('bg-on-surface/12');
        });

        it('ArrowDown wraps from last item to first', () => {
            const { el } = buildDefault();
            const ul = getUl(el);

            // Navigate to last item (index 2)
            fireKey(ul, 'End');
            expect(getLiElements(el)[2]).toHaveClass('bg-on-surface/12');

            // Wrap around
            fireKey(ul, 'ArrowDown');
            expect(getLiElements(el)[0]).toHaveClass('bg-on-surface/12');
        });

        // Spec 3: ArrowUp moves focus backward; wraps from first to last
        it('ArrowUp moves focus backward through items', () => {
            const { el } = buildDefault();
            const ul = getUl(el);

            fireKey(ul, 'End'); // jump to index 2
            fireKey(ul, 'ArrowUp'); // 2 → 1
            expect(getLiElements(el)[1]).toHaveClass('bg-on-surface/12');

            fireKey(ul, 'ArrowUp'); // 1 → 0
            expect(getLiElements(el)[0]).toHaveClass('bg-on-surface/12');
        });

        it('ArrowUp wraps from first item to last', () => {
            const { el } = buildDefault();
            const ul = getUl(el);

            fireKey(ul, 'Home'); // jump to index 0
            expect(getLiElements(el)[0]).toHaveClass('bg-on-surface/12');

            fireKey(ul, 'ArrowUp'); // wrap to last
            expect(getLiElements(el)[2]).toHaveClass('bg-on-surface/12');
        });

        // Spec 4: Home jumps to index 0
        it('Home jumps focused index to 0', () => {
            const { el } = buildDefault();
            const ul = getUl(el);

            fireKey(ul, 'End'); // go to last first
            fireKey(ul, 'Home');
            const lis = getLiElements(el);
            expect(lis[0]).toHaveClass('bg-on-surface/12');
            expect(lis[1]).not.toHaveClass('bg-on-surface/12');
            expect(lis[2]).not.toHaveClass('bg-on-surface/12');
        });

        // Spec 5: End jumps to last index
        it('End jumps focused index to last item', () => {
            const { el } = buildDefault();
            const ul = getUl(el);

            fireKey(ul, 'End');
            const lis = getLiElements(el);
            expect(lis[2]).toHaveClass('bg-on-surface/12');
            expect(lis[0]).not.toHaveClass('bg-on-surface/12');
            expect(lis[1]).not.toHaveClass('bg-on-surface/12');
        });

        // Spec 6: Enter selects focused item via value$.next
        it('Enter calls value$.next with the focused item', () => {
            const { el, value$ } = buildDefault();
            const ul = getUl(el);

            const emitted: (string | null)[] = [];
            value$.subscribe(v => emitted.push(v));

            fireKey(ul, 'ArrowDown'); // focus index 0 (Apple)
            fireKey(ul, 'Enter');

            // value$ is a BehaviorSubject seeded with null; the next emission is 'Apple'
            expect(emitted).toContain('Apple');
        });

        it('Enter on second focused item emits that item', () => {
            const { el, value$ } = buildDefault();
            const ul = getUl(el);

            const emitted: (string | null)[] = [];
            value$.subscribe(v => emitted.push(v));

            fireKey(ul, 'ArrowDown'); // index 0
            fireKey(ul, 'ArrowDown'); // index 1
            fireKey(ul, 'Enter');

            expect(emitted).toContain('Banana');
        });

        it('Enter with no focused item (index -1) does not emit', () => {
            const { el, value$ } = buildDefault();
            const ul = getUl(el);

            const nexts: (string | null)[] = [];
            // Subscribe after build; BehaviorSubject replays current value (null)
            value$.subscribe(v => nexts.push(v));
            const countBefore = nexts.length;

            fireKey(ul, 'Enter'); // index still -1

            expect(nexts.length).toBe(countBefore);
        });

        // Spec 7: Navigation keys call preventDefault()
        it('ArrowDown calls preventDefault()', () => {
            const { el } = buildDefault();
            const event = fireKey(getUl(el), 'ArrowDown');
            expect(event.defaultPrevented).toBe(true);
        });

        it('ArrowUp calls preventDefault()', () => {
            const { el } = buildDefault();
            const event = fireKey(getUl(el), 'ArrowUp');
            expect(event.defaultPrevented).toBe(true);
        });

        it('Home calls preventDefault()', () => {
            const { el } = buildDefault();
            const event = fireKey(getUl(el), 'Home');
            expect(event.defaultPrevented).toBe(true);
        });

        it('End calls preventDefault()', () => {
            const { el } = buildDefault();
            const event = fireKey(getUl(el), 'End');
            expect(event.defaultPrevented).toBe(true);
        });

        it('Enter calls preventDefault()', () => {
            const { el } = buildDefault();
            const event = fireKey(getUl(el), 'Enter');
            expect(event.defaultPrevented).toBe(true);
        });

        it('unrelated keys do NOT call preventDefault()', () => {
            const { el } = buildDefault();
            const event = fireKey(getUl(el), 'Tab');
            expect(event.defaultPrevented).toBe(false);
        });

        // Spec 8: Focused item renders with bg-on-surface/12
        it('focused item gets bg-on-surface/12 class', () => {
            const { el } = buildDefault();
            const ul = getUl(el);

            fireKey(ul, 'ArrowDown'); // focus index 0
            expect(getLiElements(el)[0]).toHaveClass('bg-on-surface/12');
        });

        // Spec 9: bg-on-surface/12 is NOT applied when item is focused AND selected
        it('focused AND selected item does NOT get bg-on-surface/12', () => {
            const value$ = new BehaviorSubject<string | null>('Apple');
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(value$)
                .build();
            const ul = getUl(el);

            fireKey(ul, 'Home'); // focus index 0 (Apple = selected)
            const lis = getLiElements(el);
            expect(lis[0]).not.toHaveClass('bg-on-surface/12');
        });

        it('focused but NOT selected item keeps bg-on-surface/12', () => {
            const value$ = new BehaviorSubject<string | null>('Apple');
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(value$)
                .build();
            const ul = getUl(el);

            fireKey(ul, 'End'); // focus index 2 (Cherry, not selected)
            expect(getLiElements(el)[2]).toHaveClass('bg-on-surface/12');
        });

        // Spec 10: focusout with relatedTarget outside the list resets focused index
        it('focusout to outside element resets focused index (removes bg-on-surface/12)', () => {
            const { el } = buildDefault();
            const ul = getUl(el);

            fireKey(ul, 'ArrowDown'); // index 0 highlighted
            expect(getLiElements(el)[0]).toHaveClass('bg-on-surface/12');

            const outsideEl = document.createElement('button');
            document.body.appendChild(outsideEl);

            const focusOutEvent = new FocusEvent('focusout', {
                bubbles: true,
                relatedTarget: outsideEl,
            });
            ul.dispatchEvent(focusOutEvent);

            expect(getLiElements(el)[0]).not.toHaveClass('bg-on-surface/12');

            document.body.removeChild(outsideEl);
        });

        it('focusout with null relatedTarget resets focused index', () => {
            const { el } = buildDefault();
            const ul = getUl(el);

            fireKey(ul, 'ArrowDown');
            expect(getLiElements(el)[0]).toHaveClass('bg-on-surface/12');

            const focusOutEvent = new FocusEvent('focusout', {
                bubbles: true,
                relatedTarget: null,
            });
            ul.dispatchEvent(focusOutEvent);

            expect(getLiElements(el)[0]).not.toHaveClass('bg-on-surface/12');
        });

        it('focusout to a child element inside the list does NOT reset focused index', () => {
            const { el } = buildDefault();
            const ul = getUl(el);

            fireKey(ul, 'ArrowDown'); // focus index 0
            const firstLi = getLiElements(el)[0];
            expect(firstLi).toHaveClass('bg-on-surface/12');

            // relatedTarget is inside the ul — should not reset
            const focusOutEvent = new FocusEvent('focusout', {
                bubbles: true,
                relatedTarget: firstLi,
            });
            ul.dispatchEvent(focusOutEvent);

            expect(getLiElements(el)[0]).toHaveClass('bg-on-surface/12');
        });

        // Spec 11: withFocusedIndex — external observable drives focused index
        it('withFocusedIndex drives focused index from external observable', () => {
            const externalIndex$ = new BehaviorSubject<number>(1);
            const value$ = new BehaviorSubject<string | null>(null);
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(value$)
                .withFocusedIndex(externalIndex$)
                .build();

            const lis = getLiElements(el);
            expect(lis[1]).toHaveClass('bg-on-surface/12');
            expect(lis[0]).not.toHaveClass('bg-on-surface/12');
        });

        it('withFocusedIndex updates focus when observable emits a new index', () => {
            const externalIndex$ = new BehaviorSubject<number>(0);
            const value$ = new BehaviorSubject<string | null>(null);
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(value$)
                .withFocusedIndex(externalIndex$)
                .build();

            expect(getLiElements(el)[0]).toHaveClass('bg-on-surface/12');

            externalIndex$.next(2);
            expect(getLiElements(el)[2]).toHaveClass('bg-on-surface/12');
            expect(getLiElements(el)[0]).not.toHaveClass('bg-on-surface/12');
        });

        it('withFocusedIndex -1 removes all focus highlights', () => {
            const externalIndex$ = new BehaviorSubject<number>(1);
            const value$ = new BehaviorSubject<string | null>(null);
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(value$)
                .withFocusedIndex(externalIndex$)
                .build();

            externalIndex$.next(-1);
            const lis = getLiElements(el);
            lis.forEach(li => expect(li).not.toHaveClass('bg-on-surface/12'));
        });

        // Spec 12: focused li is scrolled into view on focus change
        it('focused item has scrollIntoView called on focus change', () => {
            const { el } = buildDefault();
            const ul = getUl(el);

            // Attach to DOM so scrollIntoView is accessible
            document.body.appendChild(el);

            // Patch scrollIntoView on all li elements after navigation triggers a re-render
            let scrolledEl: Element | null = null;
            const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
            HTMLElement.prototype.scrollIntoView = function (this: HTMLElement) {
                scrolledEl = this;
            };

            fireKey(ul, 'ArrowDown'); // focus index 0

            expect(scrolledEl).not.toBeNull();
            expect(scrolledEl).toBe(getLiElements(el)[0]);

            HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
            document.body.removeChild(el);
        });

        it('scrollIntoView is not called when focusedIndex is -1', () => {
            const { el } = buildDefault();
            const ul = getUl(el);
            document.body.appendChild(el);

            let scrollCalled = false;
            const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
            HTMLElement.prototype.scrollIntoView = function () {
                scrollCalled = true;
            };

            // Dispatch ArrowDown to go to index 0, then reset via focusout
            fireKey(ul, 'ArrowDown');
            scrollCalled = false; // reset after first navigation

            const focusOutEvent = new FocusEvent('focusout', { bubbles: true, relatedTarget: null });
            ul.dispatchEvent(focusOutEvent);

            // After reset to -1, the re-render should NOT call scrollIntoView
            expect(scrollCalled).toBe(false);

            HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
            document.body.removeChild(el);
        });

    });
});
