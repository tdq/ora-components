import { BehaviorSubject, of, Subject } from 'rxjs';
import '@testing-library/jest-dom';
import { ListBoxBuilder } from './listbox';
import { ListBoxStyle } from './types';
import { GatedObserver } from '../../utils/optimized-pipeline';

beforeAll(() => {
    global.requestAnimationFrame = ((cb: FrameRequestCallback) => { cb(0); return 0; }) as any;
    if (typeof global.ResizeObserver === 'undefined') {
        global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any;
    }
});

// ---- Mock type helpers ----
interface IntersectionObserverMockStatic {
    triggerVisibility(element: Element, isIntersecting: boolean, ratio?: number): void;
    reset(): void;
}

interface GlobalWithIOMock {
    IntersectionObserverMock: IntersectionObserverMockStatic;
}

function getIOMock(): IntersectionObserverMockStatic {
    return (globalThis as unknown as GlobalWithIOMock).IntersectionObserverMock;
}

// ---- Visibility helper ----

/**
 * Attaches el to document.body (if not already attached), fires the
 * IntersectionObserver mock, and advances fake timers past the
 * optimized-pipeline appearDebounceMs (default 20 ms → use 50 ms).
 */
function triggerVisibleAndWait(el: HTMLElement): void {
    if (!document.body.contains(el)) {
        document.body.appendChild(el);
    }
    const ul = el.querySelector('ul[role="listbox"]') as HTMLElement;
    if (ul) {
        Object.defineProperty(ul, 'clientHeight', { value: 1000, configurable: true, writable: true });
        Object.defineProperty(ul, 'scrollTop', { value: 0, configurable: true, writable: true });
    }
    getIOMock().triggerVisibility(el, true);
    jest.advanceTimersByTime(50);
}

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

    beforeEach(() => {
        jest.useFakeTimers();
        getIOMock().reset();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.useRealTimers();
        getIOMock().reset();
    });

    // ── Viewport gating ──────────────────────────────────────────────────────

    describe('viewport gating (optimized pipeline)', () => {

        it('does NOT render items before the container is visible', () => {
            const { el } = buildDefault();
            document.body.appendChild(el);

            // Do NOT trigger visibility — items must not appear
            jest.advanceTimersByTime(200);

            expect(getLiElements(el)).toHaveLength(0);
        });

        it('renders items after triggerVisibility(true) + debounce elapses', () => {
            const { el } = buildDefault();
            triggerVisibleAndWait(el);

            expect(getLiElements(el)).toHaveLength(3);
        });

        it('stops rendering new items when the container leaves the viewport', () => {
            const items$ = new BehaviorSubject<string[]>(FRUITS);
            const value$ = new BehaviorSubject<string | null>(null);
            const el = new ListBoxBuilder<string>()
                .withItems(items$)
                .withValue(value$)
                .build();

            triggerVisibleAndWait(el);
            expect(getLiElements(el)).toHaveLength(3);

            // Hide the container — pipeline switches to EMPTY
            getIOMock().triggerVisibility(el, false);

            // Push a new items array while hidden
            items$.next([...FRUITS, 'Date']);
            jest.advanceTimersByTime(200);

            // DOM must still reflect the last visible render (3 items)
            expect(getLiElements(el)).toHaveLength(3);
        });
    });

    // ── GatedObserver idempotency guard ──────────────────────────────────────

    describe('GatedObserver idempotency guard', () => {

        it('renders items without triggerVisibility when source is already a GatedObserver', () => {
            const value$ = new BehaviorSubject<string | null>(null);
            const el = new ListBoxBuilder<string>()
                .withItems(new GatedObserver(of(FRUITS)))
                .withValue(value$)
                .build();

            // Attach to DOM — no triggerVisibility, no timer advancement needed
            // because the instanceof check bypasses createOptimizedPipeline entirely.
            document.body.appendChild(el);

            expect(getLiElements(el)).toHaveLength(3);
            expect(getLiElements(el)[0].querySelector('span:last-child')!.textContent).toBe('Apple');
            expect(getLiElements(el)[1].querySelector('span:last-child')!.textContent).toBe('Banana');
            expect(getLiElements(el)[2].querySelector('span:last-child')!.textContent).toBe('Cherry');
        });
    });

    // ── withStyle(BORDERLESS) ────────────────────────────────────────────────

    describe('withStyle(BORDERLESS)', () => {

        // Spec 1: panel has no border classes
        it('panel does NOT have rounded-large, border, or border-outline classes', () => {
            const { el } = buildBorderless();
            // Panel style is driven by style$/error$ streams (not gated), so no
            // visibility trigger needed for these structural class assertions.
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

            triggerVisibleAndWait(el);
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

            triggerVisibleAndWait(el);
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
            triggerVisibleAndWait(el);
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
            triggerVisibleAndWait(el);
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
            triggerVisibleAndWait(el);
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

        // Spec 1: standalone listbox is tabbable; externally-driven listbox is removed from tab order
        it('standalone ul[role="listbox"] is tabbable (tabIndex 0)', () => {
            const { el } = buildDefault();
            const ul = getUl(el);
            expect(ul.tabIndex).toBe(0);
        });

        it('ul[role="listbox"] has tabIndex -1 when driven by withFocusedIndex (ComboBox mode)', () => {
            const externalIndex$ = new BehaviorSubject<number>(-1);
            const value$ = new BehaviorSubject<string | null>(null);
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(value$)
                .withFocusedIndex(externalIndex$)
                .build();
            const ul = getUl(el);
            expect(ul.tabIndex).toBe(-1);
        });

        // Spec 2: ArrowDown advances focused index; wraps from last to first
        it('ArrowDown moves focus forward through items', () => {
            const { el } = buildDefault();
            triggerVisibleAndWait(el);
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
            triggerVisibleAndWait(el);
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
            triggerVisibleAndWait(el);
            const ul = getUl(el);

            fireKey(ul, 'End'); // jump to index 2
            fireKey(ul, 'ArrowUp'); // 2 → 1
            expect(getLiElements(el)[1]).toHaveClass('bg-on-surface/12');

            fireKey(ul, 'ArrowUp'); // 1 → 0
            expect(getLiElements(el)[0]).toHaveClass('bg-on-surface/12');
        });

        it('ArrowUp wraps from first item to last', () => {
            const { el } = buildDefault();
            triggerVisibleAndWait(el);
            const ul = getUl(el);

            fireKey(ul, 'Home'); // jump to index 0
            expect(getLiElements(el)[0]).toHaveClass('bg-on-surface/12');

            fireKey(ul, 'ArrowUp'); // wrap to last
            expect(getLiElements(el)[2]).toHaveClass('bg-on-surface/12');
        });

        // Spec 4: Home jumps to index 0
        it('Home jumps focused index to 0', () => {
            const { el } = buildDefault();
            triggerVisibleAndWait(el);
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
            triggerVisibleAndWait(el);
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
            triggerVisibleAndWait(el);
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
            triggerVisibleAndWait(el);
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
            triggerVisibleAndWait(el);
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
            triggerVisibleAndWait(el);
            const event = fireKey(getUl(el), 'ArrowDown');
            expect(event.defaultPrevented).toBe(true);
        });

        it('ArrowUp calls preventDefault()', () => {
            const { el } = buildDefault();
            triggerVisibleAndWait(el);
            const event = fireKey(getUl(el), 'ArrowUp');
            expect(event.defaultPrevented).toBe(true);
        });

        it('Home calls preventDefault()', () => {
            const { el } = buildDefault();
            triggerVisibleAndWait(el);
            const event = fireKey(getUl(el), 'Home');
            expect(event.defaultPrevented).toBe(true);
        });

        it('End calls preventDefault()', () => {
            const { el } = buildDefault();
            triggerVisibleAndWait(el);
            const event = fireKey(getUl(el), 'End');
            expect(event.defaultPrevented).toBe(true);
        });

        it('Enter calls preventDefault()', () => {
            const { el } = buildDefault();
            triggerVisibleAndWait(el);
            const event = fireKey(getUl(el), 'Enter');
            expect(event.defaultPrevented).toBe(true);
        });

        it('unrelated keys do NOT call preventDefault()', () => {
            const { el } = buildDefault();
            triggerVisibleAndWait(el);
            const event = fireKey(getUl(el), 'Tab');
            expect(event.defaultPrevented).toBe(false);
        });

        // Spec 8: Focused item renders with bg-on-surface/12
        it('focused item gets bg-on-surface/12 class', () => {
            const { el } = buildDefault();
            triggerVisibleAndWait(el);
            const ul = getUl(el);

            fireKey(ul, 'ArrowDown'); // focus index 0
            expect(getLiElements(el)[0]).toHaveClass('bg-on-surface/12');
        });

        it('focused item has 4px vertical accent bar', () => {
            const { el } = buildDefault();
            triggerVisibleAndWait(el);
            const ul = getUl(el);

            fireKey(ul, 'ArrowDown'); // focus index 0
            const lis = getLiElements(el);
            const accentBar = lis[0].querySelector('.bg-primary.w-\\[4px\\]');
            expect(accentBar).toBeTruthy();
            expect(accentBar).toHaveClass('absolute', 'left-0', 'top-0', 'bottom-0');
        });

        it('glass mode: focused item uses glass focus background', () => {
            const el = new ListBoxBuilder<string>()
                .withItems(of(['Item 1', 'Item 2']))
                .asGlass()
                .build();
            triggerVisibleAndWait(el);
            const ul = getUl(el);

            fireKey(ul, 'ArrowDown'); // focus index 0
            const lis = getLiElements(el);
            expect(lis[0]).toHaveClass('bg-black/10', 'dark:bg-white/20');
            
            const accentBar = lis[0].querySelector('.bg-primary.w-\\[4px\\]');
            expect(accentBar).toBeTruthy();
        });

        // Spec 9: bg-on-surface/12 is NOT applied when item is focused AND selected
        it('focused AND selected item does NOT get bg-on-surface/12 but DOES get accent bar', () => {
            const value$ = new BehaviorSubject<string | null>('Apple');
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(value$)
                .build();
            triggerVisibleAndWait(el);
            const ul = getUl(el);

            fireKey(ul, 'Home'); // focus index 0 (Apple = selected)
            const lis = getLiElements(el);
            expect(lis[0]).not.toHaveClass('bg-on-surface/12');
            
            const accentBar = lis[0].querySelector('.bg-primary.w-\\[4px\\]');
            expect(accentBar).toBeTruthy();
        });

        it('focused but NOT selected item keeps bg-on-surface/12', () => {
            const value$ = new BehaviorSubject<string | null>('Apple');
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(value$)
                .build();
            triggerVisibleAndWait(el);
            const ul = getUl(el);

            fireKey(ul, 'End'); // focus index 2 (Cherry, not selected)
            expect(getLiElements(el)[2]).toHaveClass('bg-on-surface/12');
        });

        // Spec 10: focusout with relatedTarget outside the list resets focused index
        it('focusout to outside element resets focused index (removes bg-on-surface/12)', () => {
            const { el } = buildDefault();
            triggerVisibleAndWait(el);
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
        });

        it('focusout with null relatedTarget resets focused index', () => {
            const { el } = buildDefault();
            triggerVisibleAndWait(el);
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
            triggerVisibleAndWait(el);
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

            // The direct (ComboBox) rendering path still calls scrollIntoView on the
            // focused <li>. Stub it so jsdom doesn't throw on the unimplemented method.
            const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
            HTMLElement.prototype.scrollIntoView = jest.fn();

            triggerVisibleAndWait(el);
            const lis = getLiElements(el);
            expect(lis[1]).toHaveClass('bg-on-surface/12');
            expect(lis[0]).not.toHaveClass('bg-on-surface/12');

            HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
        });

        it('withFocusedIndex updates focus when observable emits a new index', () => {
            const externalIndex$ = new BehaviorSubject<number>(0);
            const value$ = new BehaviorSubject<string | null>(null);
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(value$)
                .withFocusedIndex(externalIndex$)
                .build();

            // Direct rendering path still calls scrollIntoView — stub for jsdom.
            const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
            HTMLElement.prototype.scrollIntoView = jest.fn();

            triggerVisibleAndWait(el);
            expect(getLiElements(el)[0]).toHaveClass('bg-on-surface/12');

            externalIndex$.next(2);
            expect(getLiElements(el)[2]).toHaveClass('bg-on-surface/12');
            expect(getLiElements(el)[0]).not.toHaveClass('bg-on-surface/12');

            HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
        });

        it('withFocusedIndex -1 removes all focus highlights', () => {
            const externalIndex$ = new BehaviorSubject<number>(1);
            const value$ = new BehaviorSubject<string | null>(null);
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(value$)
                .withFocusedIndex(externalIndex$)
                .build();

            triggerVisibleAndWait(el);
            externalIndex$.next(-1);
            const lis = getLiElements(el);
            lis.forEach(li => expect(li).not.toHaveClass('bg-on-surface/12'));
        });

        // Spec 12: focused item is rendered and highlighted on focus change
        it('focused item is rendered and highlighted when focus changes via keyboard', () => {
            const { el } = buildDefault();
            triggerVisibleAndWait(el);
            const ul = getUl(el);

            fireKey(ul, 'ArrowDown'); // focus index 0

            const lis = getLiElements(el);
            expect(lis[0]).toHaveClass('bg-on-surface/12');
            expect(lis[0].querySelector('.bg-primary.w-\\[4px\\]')).not.toBeNull();
        });

        it('no item is highlighted when focusedIndex resets to -1 via focusout', () => {
            const { el } = buildDefault();
            triggerVisibleAndWait(el);
            const ul = getUl(el);

            fireKey(ul, 'ArrowDown'); // focus index 0
            expect(getLiElements(el)[0]).toHaveClass('bg-on-surface/12');

            const focusOutEvent = new FocusEvent('focusout', { bubbles: true, relatedTarget: null });
            ul.dispatchEvent(focusOutEvent);

            getLiElements(el).forEach(li => expect(li).not.toHaveClass('bg-on-surface/12'));
        });

    });

    // ── Targeted focus/selection updates (no full window rebuild) ────────────

    describe('targeted keyboard-navigation updates', () => {

        it('keeps the same <li> element instances for rows unaffected by a focus change', () => {
            const { el } = buildDefault(); // FRUITS: Apple, Banana, Cherry
            triggerVisibleAndWait(el);
            const ul = getUl(el);
            const before = getLiElements(el);

            fireKey(ul, 'ArrowDown'); // focus -1 -> 0
            const afterFirst = getLiElements(el);
            // Cherry (index 2) is untouched by this transition.
            expect(afterFirst[2]).toBe(before[2]);
            expect(afterFirst[1]).toBe(before[1]);
            expect(afterFirst[0]).toHaveClass('bg-on-surface/12');

            fireKey(ul, 'ArrowDown'); // focus 0 -> 1
            const afterSecond = getLiElements(el);
            // Cherry (index 2) is still untouched — only indices 0 and 1 change.
            expect(afterSecond[2]).toBe(before[2]);
            expect(afterSecond[0]).not.toHaveClass('bg-on-surface/12');
            expect(afterSecond[1]).toHaveClass('bg-on-surface/12');
        });

        it('performs at most 2 <li> (re)creations per ArrowDown keypress at scale', () => {
            const items = Array.from({ length: 10000 }, (_, i) => `Item ${i}`);
            const items$ = new GatedObserver(of(items));
            const value$ = new BehaviorSubject<string | null>(null);
            const el = new ListBoxBuilder<string>().withItems(items$).withValue(value$).build();
            document.body.appendChild(el);
            const ul = getUl(el);
            // Tall enough that the 50-step focus walk below never needs the rendered
            // window to shift/scroll — isolates the cost of the focus patch itself.
            Object.defineProperty(ul, 'clientHeight', { value: 3000, configurable: true, writable: true });
            Object.defineProperty(ul, 'scrollTop', { value: 0, configurable: true, writable: true });
            ul.dispatchEvent(new Event('scroll'));
            // The scroll handler throttles via requestAnimationFrame; flush the fake-timer
            // queue so the window actually widens to the new clientHeight before we start
            // counting — this one-time widening is not part of the per-keypress budget.
            jest.advanceTimersByTime(20);

            const origCreateElement = document.createElement.bind(document);
            let liCreateCount = 0;
            const spy = jest.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
                if (tag === 'li') liCreateCount++;
                return origCreateElement(tag);
            }) as typeof document.createElement);

            for (let i = 0; i < 50; i++) {
                fireKey(ul, 'ArrowDown');
            }

            spy.mockRestore();

            expect(liCreateCount).toBeLessThanOrEqual(100); // <= 2 per keypress across 50 keypresses
        });

        it('performs at most 3 <li> (re)creations per ArrowDown keypress in steady-state scrolling', () => {
            const items = Array.from({ length: 10000 }, (_, i) => `Item ${i}`);
            const items$ = new GatedObserver(of(items));
            const value$ = new BehaviorSubject<string | null>(null);
            const el = new ListBoxBuilder<string>().withItems(items$).withValue(value$).build();
            document.body.appendChild(el);
            const ul = getUl(el);
            // Small viewport (~1 row visible): every ArrowDown pushes the focused row just
            // past the bottom, so scrollToIndex scrolls the window by one row each press —
            // one row evicted off the top, one appended at the bottom.
            Object.defineProperty(ul, 'clientHeight', { value: 44, configurable: true, writable: true });
            Object.defineProperty(ul, 'scrollTop', { value: 0, configurable: true, writable: true });
            ul.dispatchEvent(new Event('scroll'));
            jest.advanceTimersByTime(20);

            const origCreateElement = document.createElement.bind(document);
            let liCreateCount = 0;
            const spy = jest.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
                if (tag === 'li') liCreateCount++;
                return origCreateElement(tag);
            }) as typeof document.createElement);

            const presses = 50;
            for (let i = 0; i < presses; i++) {
                fireKey(ul, 'ArrowDown');
            }

            spy.mockRestore();

            // 2 targeted patches (previous + new focused row) + at most 1 newly-appended
            // row per keypress when the window has to scroll — never a full rebuild.
            expect(liCreateCount).toBeLessThanOrEqual(presses * 3);
        });
    });

    // ── Virtualization ───────────────────────────────────────────────────────

    it('virtualizes: renders only a window for a large dataset', () => {
        const items$ = new GatedObserver(of(Array.from({ length: 1000 }, (_, i) => `Item ${i}`)));
        const el = new ListBoxBuilder<string>().withItems(items$).build();
        document.body.appendChild(el);
        const ul = el.querySelector('ul[role="listbox"]') as HTMLElement;
        Object.defineProperty(ul, 'clientHeight', { value: 200, configurable: true, writable: true });
        Object.defineProperty(ul, 'scrollTop', { value: 0, configurable: true, writable: true });
        // Force viewport to recompute the window with the mocked clientHeight.
        ul.dispatchEvent(new Event('scroll'));
        const options = el.querySelectorAll('li[role="option"]');
        expect(options.length).toBeGreaterThan(0);
        expect(options.length).toBeLessThan(1000);
        expect(options[0].getAttribute('aria-setsize')).toBe('1000');
    });

    it('withFocusedIndex seeded outside the initial window still renders that option (regression: ComboBox aria-activedescendant dangling)', () => {
        // .withFocusedIndex(new BehaviorSubject(500)) over 1000 items: the itemsChanged
        // branch used to call vp.setItems(items) and return without scrolling to the
        // seeded focused index, so the option at index 500 was never rendered and a
        // ComboBox's aria-activedescendant would point at a nonexistent id.
        const externalIndex$ = new BehaviorSubject<number>(500);
        const items$ = new GatedObserver(of(Array.from({ length: 1000 }, (_, i) => `Item ${i}`)));
        const el = new ListBoxBuilder<string>()
            .withItems(items$)
            .withValue(new BehaviorSubject<string | null>(null))
            .withFocusedIndex(externalIndex$)
            .build();

        // Direct rendering path still calls scrollIntoView — stub for jsdom.
        const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
        HTMLElement.prototype.scrollIntoView = jest.fn();

        document.body.appendChild(el);

        const options = Array.from(el.querySelectorAll('li[role="option"]'));
        const option500 = options.find(li => li.getAttribute('aria-posinset') === '501'); // index 500
        expect(option500).toBeDefined();

        HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    });

    it('viewport scrolls focused item into view when it is off-screen', () => {
        const items$ = new GatedObserver(of(Array.from({ length: 20 }, (_, i) => `Item ${i}`)));
        const el = new ListBoxBuilder<string>().withItems(items$).build();
        document.body.appendChild(el);
        const ul = el.querySelector('ul[role="listbox"]') as HTMLElement;
        // clientHeight = 44 means only one row visible at a time.
        Object.defineProperty(ul, 'clientHeight', { value: 44, configurable: true, writable: true });
        Object.defineProperty(ul, 'scrollTop', { value: 0, configurable: true, writable: true });
        ul.dispatchEvent(new Event('scroll'));
        // Pressing End should focus the last item (index 19) and trigger scrollToIndex.
        fireKey(ul as HTMLUListElement, 'End');
        const posinsets = Array.from(el.querySelectorAll('li[role="option"]'))
            .map(li => li.getAttribute('aria-posinset'));
        expect(posinsets).toContain('20'); // last item must be in the rendered window
    });

    // ── OUTLINED style ───────────────────────────────────────────────────────

    describe('withStyle(OUTLINED)', () => {

        it('selected item uses bg-primary-container (outlined selected background)', () => {
            const value$ = new BehaviorSubject<string | null>('Apple');
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(value$)
                .withStyle(of(ListBoxStyle.OUTLINED))
                .build();
            triggerVisibleAndWait(el);
            expect(getLiElements(el)[0]).toHaveClass('bg-primary-container');
        });

        it('selected item uses text-on-primary-container in outlined style', () => {
            const value$ = new BehaviorSubject<string | null>('Apple');
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(value$)
                .withStyle(of(ListBoxStyle.OUTLINED))
                .build();
            triggerVisibleAndWait(el);
            expect(getLiElements(el)[0]).toHaveClass('text-on-primary-container');
        });

        it('unselected items do NOT have bg-primary-container in outlined style', () => {
            const value$ = new BehaviorSubject<string | null>('Apple');
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(value$)
                .withStyle(of(ListBoxStyle.OUTLINED))
                .build();
            triggerVisibleAndWait(el);
            const lis = getLiElements(el);
            expect(lis[1]).not.toHaveClass('bg-primary-container');
            expect(lis[2]).not.toHaveClass('bg-primary-container');
        });
    });

    // ── withCaption ──────────────────────────────────────────────────────────

    describe('withCaption', () => {

        it('renders a label element with the caption text', () => {
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withCaption(of('Pick a fruit'))
                .build();
            document.body.appendChild(el);
            const label = el.querySelector('label');
            expect(label).not.toBeNull();
            expect(label!.textContent).toBe('Pick a fruit');
        });

        it('listbox ul gets aria-labelledby pointing at the caption label', () => {
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withCaption(of('Pick a fruit'))
                .build();
            document.body.appendChild(el);
            const label = el.querySelector('label') as HTMLLabelElement;
            const ul = getUl(el);
            expect(ul.getAttribute('aria-labelledby')).toBe(label.id);
        });

        it('caption label reacts to observable updates', () => {
            const caption$ = new BehaviorSubject<string>('Initial');
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withCaption(caption$)
                .build();
            document.body.appendChild(el);
            const label = el.querySelector('label')!;
            expect(label.textContent).toBe('Initial');
            caption$.next('Updated');
            expect(label.textContent).toBe('Updated');
        });
    });

    // ── withHeight ───────────────────────────────────────────────────────────

    describe('withHeight', () => {

        it('sets the container inline height style to the emitted pixel value', () => {
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withHeight(of(300))
                .build();
            document.body.appendChild(el);
            expect(el.style.height).toBe('300px');
        });

        it('clears the container height when the observable emits undefined', () => {
            const height$ = new BehaviorSubject<number | undefined>(300);
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withHeight(height$ as unknown as import('rxjs').Observable<number>)
                .build();
            document.body.appendChild(el);
            expect(el.style.height).toBe('300px');
            height$.next(undefined);
            expect(el.style.height).toBe('');
        });
    });

    // ── withEnabled / disabled state ─────────────────────────────────────────

    describe('withEnabled', () => {

        it('withEnabled(false) adds opacity-50 and pointer-events-none to the container', () => {
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withEnabled(of(false))
                .build();
            document.body.appendChild(el);
            expect(el).toHaveClass('opacity-50');
            expect(el).toHaveClass('pointer-events-none');
        });

        it('withEnabled(false) sets aria-disabled="true" on the container', () => {
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withEnabled(of(false))
                .build();
            document.body.appendChild(el);
            expect(el.getAttribute('aria-disabled')).toBe('true');
        });

        it('withEnabled(true) removes aria-disabled from the container', () => {
            const enabled$ = new BehaviorSubject<boolean>(false);
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withEnabled(enabled$)
                .build();
            document.body.appendChild(el);
            expect(el.getAttribute('aria-disabled')).toBe('true');
            enabled$.next(true);
            expect(el.getAttribute('aria-disabled')).toBeNull();
            expect(el).not.toHaveClass('opacity-50');
        });
    });

    // ── aria-setsize and aria-posinset correctness ───────────────────────────

    describe('aria-setsize and aria-posinset', () => {

        it('each rendered option has aria-setsize equal to total item count', () => {
            const items$ = new GatedObserver(of(FRUITS));
            const el = new ListBoxBuilder<string>().withItems(items$).build();
            document.body.appendChild(el);
            getLiElements(el).forEach(li => {
                expect(li.getAttribute('aria-setsize')).toBe('3');
            });
        });

        it('each rendered option has aria-posinset equal to 1-based position', () => {
            const items$ = new GatedObserver(of(FRUITS));
            const el = new ListBoxBuilder<string>().withItems(items$).build();
            document.body.appendChild(el);
            const lis = getLiElements(el);
            expect(lis[0].getAttribute('aria-posinset')).toBe('1');
            expect(lis[1].getAttribute('aria-posinset')).toBe('2');
            expect(lis[2].getAttribute('aria-posinset')).toBe('3');
        });

        it('ComboBox mode (withFocusedIndex): options carry aria-setsize and aria-posinset', () => {
            const externalIndex$ = new BehaviorSubject<number>(-1);
            const el = new ListBoxBuilder<string>()
                .withItems(new GatedObserver(of(FRUITS)))
                .withValue(new BehaviorSubject<string | null>(null))
                .withFocusedIndex(externalIndex$)
                .build();
            document.body.appendChild(el);
            const lis = getLiElements(el);
            expect(lis[0].getAttribute('aria-setsize')).toBe('3');
            expect(lis[0].getAttribute('aria-posinset')).toBe('1');
            expect(lis[2].getAttribute('aria-posinset')).toBe('3');
        });
    });

    // ── B11: style change (in-place refresh + measurement invalidation) ───────

    describe('style change', () => {

        it('re-renders rendered options in place with the new style, keeping aria attributes correct', () => {
            const style$ = new BehaviorSubject<ListBoxStyle>(ListBoxStyle.TONAL);
            const value$ = new BehaviorSubject<string | null>('Apple');
            const el = new ListBoxBuilder<string>()
                .withItems(new GatedObserver(of(FRUITS)))
                .withValue(value$)
                .withStyle(style$)
                .build();
            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            expect(getLiElements(el)[0]).toHaveClass('bg-on-secondary-container/20');

            style$.next(ListBoxStyle.OUTLINED);

            const lis = getLiElements(el);
            expect(lis).toHaveLength(3);
            expect(lis[0]).toHaveClass('bg-primary-container');       // OUTLINED selected bg
            expect(lis[0]).not.toHaveClass('bg-on-secondary-container/20');
            // aria state survives the in-place rebuild of every row
            expect(lis.map(li => li.getAttribute('aria-posinset'))).toEqual(['1', '2', '3']);
            expect(lis.every(li => li.getAttribute('aria-setsize') === '3')).toBe(true);
            expect(lis.map(li => li.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
        });

        it('invalidates cached row heights so a style change re-measures instead of reusing heights of evicted rows', () => {
            // Rows measured under the old style scroll out of the window and are never
            // re-measured; without invalidateMeasurements() their stale heights keep
            // inflating prefix/spacer forever after the style (and thus row height) changed.
            let liHeight = 88;
            Object.defineProperty(HTMLLIElement.prototype, 'offsetHeight', {
                configurable: true,
                get() { return liHeight; },
            });
            try {
                const items = Array.from({ length: 200 }, (_, i) => `Item ${i}`);
                const style$ = new BehaviorSubject<ListBoxStyle>(ListBoxStyle.TONAL);
                const el = new ListBoxBuilder<string>()
                    .withItems(new GatedObserver(of(items)))
                    .withValue(new BehaviorSubject<string | null>(null))
                    .withStyle(style$)
                    .build();
                document.body.appendChild(el);
                const ul = getUl(el);
                Object.defineProperty(ul, 'clientHeight', { value: 100, configurable: true, writable: true });
                Object.defineProperty(ul, 'scrollTop', { value: 0, configurable: true, writable: true });
                triggerVisibleAndWait(el);
                Object.defineProperty(ul, 'clientHeight', { value: 100, configurable: true, writable: true });
                ul.dispatchEvent(new Event('scroll'));

                // Scroll away so the rows measured at 88px are evicted.
                (ul as any).scrollTop = 3000;
                ul.dispatchEvent(new Event('scroll'));
                const spacer = ul.querySelector('[aria-hidden="true"]') as HTMLElement;
                expect(parseFloat(spacer.style.height)).toBeGreaterThan(200 * 44);

                // New style renders rows at the 44px estimate height.
                liHeight = 44;
                style$.next(ListBoxStyle.OUTLINED);

                // Every stale 88px measurement must be gone — total is the pure 44px total.
                expect(spacer.style.height).toBe(`${200 * 44}px`);
            } finally {
                delete (HTMLLIElement.prototype as any).offsetHeight;
            }
        });
    });

    // ── B11: targeted selection updates ──────────────────────────────────────

    describe('targeted selection updates', () => {

        interface Grouped { name: string; group: string }
        const GROUPED: Grouped[] = [
            { name: 'Apple', group: 'g1' },
            { name: 'Banana', group: 'g1' },
            { name: 'Cherry', group: 'g2' },
        ];

        function buildGrouped() {
            const value$ = new BehaviorSubject<Grouped | null>(null);
            const el = new ListBoxBuilder<Grouped>()
                .withItems(new GatedObserver(of(GROUPED)))
                .withItemCaptionProvider(i => i.name)
                .withItemIdProvider(i => i.group) // deliberately NOT injective
                .withValue(value$)
                .build();
            document.body.appendChild(el);
            triggerVisibleAndWait(el);
            return { el, value$ };
        }

        it('flips EVERY rendered row whose id matches the newly selected id, not just the first', () => {
            const { el, value$ } = buildGrouped();
            expect(getLiElements(el).map(li => li.getAttribute('aria-selected')))
                .toEqual(['false', 'false', 'false']);

            value$.next(GROUPED[0]); // id 'g1' — matches rows 0 AND 1

            expect(getLiElements(el).map(li => li.getAttribute('aria-selected')))
                .toEqual(['true', 'true', 'false']);
            const lis = getLiElements(el);
            expect(lis[0]).toHaveClass('font-bold');
            expect(lis[1]).toHaveClass('font-bold');
            expect(lis[2]).not.toHaveClass('font-bold');
        });

        it('clears EVERY rendered row that matched the previous id when selection moves away', () => {
            const { el, value$ } = buildGrouped();
            value$.next(GROUPED[0]); // 'g1' -> rows 0,1 selected

            value$.next(GROUPED[2]); // 'g2' -> rows 0,1 must clear, row 2 must select

            expect(getLiElements(el).map(li => li.getAttribute('aria-selected')))
                .toEqual(['false', 'false', 'true']);
        });

        it('keeps aria-posinset/aria-setsize/aria-selected correct after in-place focus and selection patches', () => {
            const { el } = buildDefault();
            triggerVisibleAndWait(el);
            const ul = getUl(el);

            fireKey(ul, 'ArrowDown'); // focus 0
            fireKey(ul, 'ArrowDown'); // focus 1 — patches rows 0 and 1 in place
            fireKey(ul, 'Enter');     // selects Banana — patches the selected row in place

            const lis = getLiElements(el);
            expect(lis.map(li => li.getAttribute('aria-posinset'))).toEqual(['1', '2', '3']);
            expect(lis.map(li => li.getAttribute('aria-setsize'))).toEqual(['3', '3', '3']);
            expect(lis.map(li => li.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
            expect(lis[1]).toHaveClass('font-bold');
        });

        it('keeps rendered <li> elements in ascending DOM order after scrolling down then back up', () => {
            const items = Array.from({ length: 1000 }, (_, i) => `Item ${i}`);
            const el = new ListBoxBuilder<string>()
                .withItems(new GatedObserver(of(items)))
                .withValue(new BehaviorSubject<string | null>(null))
                .build();
            document.body.appendChild(el);
            const ul = getUl(el);
            Object.defineProperty(ul, 'clientHeight', { value: 200, configurable: true, writable: true });
            Object.defineProperty(ul, 'scrollTop', { value: 0, configurable: true, writable: true });
            ul.dispatchEvent(new Event('scroll'));

            (ul as any).scrollTop = 20000;
            ul.dispatchEvent(new Event('scroll'));
            (ul as any).scrollTop = 0;
            ul.dispatchEvent(new Event('scroll'));

            const positions = getLiElements(el).map(li => Number(li.getAttribute('aria-posinset')));
            expect(positions.length).toBeGreaterThan(0);
            expect(positions).toEqual([...positions].sort((a, b) => a - b));
        });
    });
});
