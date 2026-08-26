import { BehaviorSubject, of } from 'rxjs';
import '@testing-library/jest-dom';
import { MultiSelectListBuilder } from './multi-select-list';
import { MultiSelectListStyle } from './types';
import { GatedObserver } from '../../utils/optimized-pipeline';

beforeAll(() => {
    global.requestAnimationFrame = ((cb: FrameRequestCallback) => { cb(0); return 0; }) as any;
    if (typeof global.ResizeObserver === 'undefined') {
        global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any;
    }
});

interface Item {
    id: number;
    name: string;
}

const ITEMS: Item[] = [
    { id: 1, name: 'Apple' },
    { id: 2, name: 'Banana' },
    { id: 3, name: 'Cherry' },
];

// ---- IntersectionObserver mock helpers ----

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

/**
 * Trigger IntersectionObserver visibility on the element and advance fake
 * timers past the pipeline's appearDebounceMs (default 20ms).
 * Note: the element must already be appended to the DOM before calling this.
 */
function triggerVisibleAndWait(el: HTMLElement): void {
    getIOMock().triggerVisibility(el, true);
    jest.advanceTimersByTime(50);
}

// ---- Build helpers ----

function buildDefault(overrides?: {
    items?: Item[];
    value?: Item[];
}) {
    const items = overrides?.items ?? ITEMS;
    const value = overrides?.value ?? [];
    const value$ = new BehaviorSubject<Item[]>(value);

    const el = new MultiSelectListBuilder<Item>()
        .withItems(of(items))
        .withItemIdProvider(item => item.id)
        .withItemCaptionProvider(item => item.name)
        .withValue(value$)
        .build();

    document.body.appendChild(el);

    const listEl = el.querySelector('div[role="group"]') as HTMLElement;
    Object.defineProperty(listEl, 'clientHeight', { value: 1000, configurable: true, writable: true });
    Object.defineProperty(listEl, 'scrollTop', { value: 0, configurable: true, writable: true });

    triggerVisibleAndWait(el);

    return { el, value$ };
}

function getList(el: HTMLElement): HTMLDivElement {
    return el.querySelector('div[role="group"]') as HTMLDivElement;
}

function getRows(el: HTMLElement): HTMLDivElement[] {
    const children = Array.from(getList(el)?.children ?? []) as HTMLElement[];
    // Filter positively on aria-setsize: only actual item rows carry this attribute.
    // This is clearer than excluding aria-hidden="true" and is future-proof against
    // other internal elements that might be added to the scroll container.
    return children.filter(c => c.hasAttribute('aria-setsize')) as HTMLDivElement[];
}

function getLiElements(el: HTMLElement): HTMLDivElement[] {
    return getRows(el);
}

function getItemInputs(el: HTMLElement): HTMLInputElement[] {
    return getLiElements(el).map(li => li.querySelector('input[type="checkbox"]') as HTMLInputElement);
}

function getHeaderInput(el: HTMLElement): HTMLInputElement {
    return el.querySelector('input[aria-label="Select all"]') as HTMLInputElement;
}

// Simulate a checkbox change as the browser would
function toggle(input: HTMLInputElement, checked: boolean) {
    input.checked = checked;
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('MultiSelectListBuilder', () => {
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

    describe('viewport gating', () => {
        it('does NOT render item <li> elements before visibility is triggered', () => {
            const value$ = new BehaviorSubject<Item[]>([]);
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withItemCaptionProvider(item => item.name)
                .withValue(value$)
                .build();

            document.body.appendChild(el);
            // Advance timers without triggering visibility
            jest.advanceTimersByTime(50);

            const lis = getLiElements(el);
            expect(lis).toHaveLength(0);
        });

        it('renders item <li> elements after triggerVisibility(true) + timer advance', () => {
            const value$ = new BehaviorSubject<Item[]>([]);
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withItemCaptionProvider(item => item.name)
                .withValue(value$)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            const lis = getLiElements(el);
            expect(lis).toHaveLength(ITEMS.length);
        });

        it('selection patch (value$.next) still works after items rendered via visibility', () => {
            const value$ = new BehaviorSubject<Item[]>([]);
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withItemCaptionProvider(item => item.name)
                .withValue(value$)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            // Patch selection without triggering a re-render
            value$.next([ITEMS[0], ITEMS[2]]);

            const inputs = getItemInputs(el);
            expect(inputs[0].checked).toBe(true);
            expect(inputs[1].checked).toBe(false);
            expect(inputs[2].checked).toBe(true);
        });

        it('select-all works after items rendered via visibility', () => {
            const value$ = new BehaviorSubject<Item[]>([]);
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withItemCaptionProvider(item => item.name)
                .withValue(value$)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            const header = getHeaderInput(el);
            toggle(header, true);
            expect(value$.getValue()).toHaveLength(ITEMS.length);
        });

        it('GatedObserver idempotency guard: renders items immediately when source is already a GatedObserver (no triggerVisibility)', () => {
            // When items$ is already branded as GatedObserver the instanceof check
            // in multi-select-list bypasses createOptimizedPipeline entirely — no
            // IntersectionObserver is created and items render synchronously.
            const value$ = new BehaviorSubject<Item[]>([]);
            const gatedItems$ = new GatedObserver(of(ITEMS));

            const el = new MultiSelectListBuilder<Item>()
                .withItems(gatedItems$)
                .withItemIdProvider(item => item.id)
                .withItemCaptionProvider(item => item.name)
                .withValue(value$)
                .build();

            document.body.appendChild(el);
            // No triggerVisibility and no timer advance — items must already be rendered
            // because the GatedObserver path skips the viewport gate.
            const lis = getLiElements(el);
            expect(lis).toHaveLength(ITEMS.length);
            expect(lis[0].textContent).toContain('Apple');
            expect(lis[1].textContent).toContain('Banana');
            expect(lis[2].textContent).toContain('Cherry');
        });

        it('selections set via value$.next() BEFORE visibility are reflected correctly after items render', () => {
            // This covers the skip(1)/getValue() handoff: value$ is mutated before
            // the gated items$ emits, so the items-render subscription must read
            // value$.getValue() (not the skip(1) patch stream) to pick up the
            // pre-visibility selection.
            const value$ = new BehaviorSubject<Item[]>([]);
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withItemCaptionProvider(item => item.name)
                .withValue(value$)
                .build();

            document.body.appendChild(el);
            // Emit a selection BEFORE the element becomes visible (items not yet rendered)
            value$.next([ITEMS[0], ITEMS[2]]);

            // Verify items have not been rendered yet (gate is still closed)
            expect(getLiElements(el)).toHaveLength(0);

            // Now open the gate — items render; they must pick up the pre-visibility selection
            triggerVisibleAndWait(el);

            const inputs = getItemInputs(el);
            expect(inputs[0].checked).toBe(true);   // Apple — was pre-selected
            expect(inputs[1].checked).toBe(false);  // Banana — not selected
            expect(inputs[2].checked).toBe(true);   // Cherry — was pre-selected

            // Header should be indeterminate (2 of 3 selected)
            const header = getHeaderInput(el);
            expect(header.indeterminate).toBe(true);
            expect(header.checked).toBe(false);
        });
    });

    // ── Req 1 & 2: DOM structure ─────────────────────────────────────────────

    describe('DOM structure', () => {
        it('renders a <div role="group"> labelled for the checkbox group', () => {
            const { el } = buildDefault();
            const list = getList(el);
            expect(list).not.toBeNull();
            expect(list.getAttribute('aria-label') || list.getAttribute('aria-labelledby')).toBeTruthy();
        });

        it('renders one item element per item', () => {
            const { el } = buildDefault();
            const lis = getLiElements(el);
            expect(lis).toHaveLength(ITEMS.length);
        });

        it('each <li> contains a <label> wrapping an <input type="checkbox">', () => {
            const { el } = buildDefault();
            getLiElements(el).forEach(li => {
                const label = li.querySelector('label') as HTMLLabelElement;
                expect(label).not.toBeNull();
                const input = label.querySelector('input[type="checkbox"]') as HTMLInputElement;
                expect(input).not.toBeNull();
            });
        });
    });

    // ── Req 3: Initial checked state from BehaviorSubject ────────────────────

    describe('initial checked state', () => {
        it('items matching the initial value$ are checked', () => {
            const { el } = buildDefault({ value: [ITEMS[0], ITEMS[2]] });
            const inputs = getItemInputs(el);
            expect(inputs[0].checked).toBe(true);
            expect(inputs[1].checked).toBe(false);
            expect(inputs[2].checked).toBe(true);
        });

        it('items not in value$ are unchecked', () => {
            const { el } = buildDefault({ value: [] });
            getItemInputs(el).forEach(input => expect(input.checked).toBe(false));
        });
    });

    // ── Req 16: itemIdProvider used for comparison ───────────────────────────

    describe('itemIdProvider for equality', () => {
        it('uses itemIdProvider, not object reference equality', () => {
            // Pass a new object instance with same id — should still be checked
            const differentRef: Item = { id: 1, name: 'Apple' };
            const value$ = new BehaviorSubject<Item[]>([differentRef]);

            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withItemCaptionProvider(item => item.name)
                .withValue(value$)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            const inputs = getItemInputs(el);
            expect(inputs[0].checked).toBe(true);  // id 1 matched
            expect(inputs[1].checked).toBe(false);
            expect(inputs[2].checked).toBe(false);
        });
    });

    // ── Req 4: Toggling emits new array ─────────────────────────────────────

    describe('item toggle emits to value$', () => {
        it('checking an item adds it to value$', () => {
            const { el, value$ } = buildDefault();
            const inputs = getItemInputs(el);
            toggle(inputs[1], true);
            expect(value$.getValue()).toHaveLength(1);
            expect(value$.getValue()[0].id).toBe(2);
        });

        it('unchecking an item removes it from value$', () => {
            const { el, value$ } = buildDefault({ value: [ITEMS[0], ITEMS[1]] });
            const inputs = getItemInputs(el);
            toggle(inputs[0], false);
            const ids = value$.getValue().map(i => i.id);
            expect(ids).not.toContain(1);
            expect(ids).toContain(2);
        });

        it('toggling multiple items accumulates correctly', () => {
            const { el, value$ } = buildDefault();
            const inputs = getItemInputs(el);
            toggle(inputs[0], true);
            toggle(inputs[2], true);
            expect(value$.getValue().map(i => i.id).sort()).toEqual([1, 3]);
        });
    });

    // ── Req 5: External value$.next() patches DOM without rebuild ────────────

    describe('external value$.next() patches DOM in-place', () => {
        it('updates input.checked for affected items', () => {
            const { el, value$ } = buildDefault();
            const inputs = getItemInputs(el);
            value$.next([ITEMS[0], ITEMS[2]]);
            expect(inputs[0].checked).toBe(true);
            expect(inputs[1].checked).toBe(false);
            expect(inputs[2].checked).toBe(true);
        });

        it('updates checkbox checked state on selection change', () => {
            const { el, value$ } = buildDefault();
            const inputs = getItemInputs(el);
            value$.next([ITEMS[1]]);
            expect(inputs[0].checked).toBe(false);
            expect(inputs[1].checked).toBe(true);
            expect(inputs[2].checked).toBe(false);
        });

        it('does not rebuild the DOM (same <li> references)', () => {
            const { el, value$ } = buildDefault();
            const lisBefore = getLiElements(el);
            value$.next([ITEMS[0]]);
            const lisAfter = getLiElements(el);
            expect(lisAfter[0]).toBe(lisBefore[0]);
            expect(lisAfter[1]).toBe(lisBefore[1]);
        });
    });

    // ── Req 6: "Select all" header checkbox ─────────────────────────────────

    describe('Select all header checkbox', () => {
        it('exists with aria-label="Select all"', () => {
            const { el } = buildDefault();
            const header = getHeaderInput(el);
            expect(header).not.toBeNull();
            expect(header.getAttribute('aria-label')).toBe('Select all');
        });
    });

    // ── Req 7, 8, 9: Header checkbox states ─────────────────────────────────

    describe('header checkbox state', () => {
        it('is unchecked and not indeterminate when nothing is selected', () => {
            const { el } = buildDefault({ value: [] });
            const header = getHeaderInput(el);
            expect(header.checked).toBe(false);
            expect(header.indeterminate).toBe(false);
        });

        it('is checked (not indeterminate) when all items are selected', () => {
            const { el } = buildDefault({ value: ITEMS });
            const header = getHeaderInput(el);
            expect(header.checked).toBe(true);
            expect(header.indeterminate).toBe(false);
        });

        it('is indeterminate when some (but not all) items are selected', () => {
            const { el } = buildDefault({ value: [ITEMS[0]] });
            const header = getHeaderInput(el);
            expect(header.indeterminate).toBe(true);
            expect(header.checked).toBe(false);
        });

        it('updates to indeterminate state after external value$.next()', () => {
            const { el, value$ } = buildDefault();
            const header = getHeaderInput(el);
            value$.next([ITEMS[1]]);
            expect(header.indeterminate).toBe(true);
        });

        it('updates to fully-checked after value$.next() with all items', () => {
            const { el, value$ } = buildDefault();
            const header = getHeaderInput(el);
            value$.next(ITEMS);
            expect(header.checked).toBe(true);
            expect(header.indeterminate).toBe(false);
        });
    });

    // ── Req 10: Click header when indeterminate/unchecked → select all ───────

    describe('header click: select all when unchecked or indeterminate', () => {
        it('clicking header when unchecked selects all items', () => {
            const { el, value$ } = buildDefault({ value: [] });
            const header = getHeaderInput(el);
            toggle(header, true);
            expect(value$.getValue()).toHaveLength(ITEMS.length);
        });

        it('clicking header when indeterminate selects all items', () => {
            const { el, value$ } = buildDefault({ value: [ITEMS[0]] });
            const header = getHeaderInput(el);
            // Simulate browser behavior: user clicks indeterminate → checked
            toggle(header, true);
            expect(value$.getValue()).toHaveLength(ITEMS.length);
        });
    });

    // ── Req 11: Click header when fully checked → deselect all ───────────────

    describe('header click: deselect all when fully checked', () => {
        it('clicking header when fully checked deselects all items', () => {
            const { el, value$ } = buildDefault({ value: ITEMS });
            const header = getHeaderInput(el);
            toggle(header, false);
            expect(value$.getValue()).toHaveLength(0);
        });
    });

    // ── Req 12: withCaption ──────────────────────────────────────────────────

    describe('withCaption', () => {
        it('sets a <span> with the caption text', () => {
            const caption$ = new BehaviorSubject('Fruit options');
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withCaption(caption$)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            const span = el.querySelector('span') as HTMLSpanElement;
            expect(span).not.toBeNull();
            expect(span.textContent).toBe('Fruit options');
        });

        it('updates <span> text when caption$ emits', () => {
            const caption$ = new BehaviorSubject('Old caption');
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withCaption(caption$)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            const span = el.querySelector('span') as HTMLSpanElement;
            caption$.next('New caption');
            expect(span.textContent).toBe('New caption');
        });

        it('the items group has aria-labelledby referencing the caption span id', () => {
            const caption$ = new BehaviorSubject('Fruits');
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withCaption(caption$)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            const span = el.querySelector('span') as HTMLSpanElement;
            const list = getList(el);
            expect(span.id).toBeTruthy();
            expect(list.getAttribute('aria-labelledby')).toBe(span.id);
        });

        it('the items group does NOT have aria-labelledby when no caption is set', () => {
            const { el } = buildDefault();
            const list = getList(el);
            expect(list.getAttribute('aria-labelledby')).toBeNull();
        });
    });

    // ── Req 13: withEnabled(false) ───────────────────────────────────────────

    describe('withEnabled', () => {
        it('applies opacity-50 and pointer-events-none when disabled', () => {
            const enabled$ = new BehaviorSubject(false);
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withEnabled(enabled$)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            expect(el).toHaveClass('opacity-50');
            expect(el).toHaveClass('pointer-events-none');
        });

        it('does not apply disabled classes when enabled', () => {
            const enabled$ = new BehaviorSubject(true);
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withEnabled(enabled$)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            expect(el).not.toHaveClass('opacity-50');
            expect(el).not.toHaveClass('pointer-events-none');
        });

        it('reactively disables and re-enables', () => {
            const enabled$ = new BehaviorSubject(true);
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withEnabled(enabled$)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            enabled$.next(false);
            expect(el).toHaveClass('opacity-50');

            enabled$.next(true);
            expect(el).not.toHaveClass('opacity-50');
        });
    });

    // ── Req 14: withError ────────────────────────────────────────────────────

    describe('withError', () => {
        it('shows an error message <div> when error$ emits', () => {
            const error$ = new BehaviorSubject('Required field');
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withError(error$)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            const errorDiv = el.querySelector('div.text-error') as HTMLDivElement;
            expect(errorDiv).not.toBeNull();
            expect(errorDiv.textContent).toBe('Required field');
        });

        it('applies border-error to the panel when error is present', () => {
            const error$ = new BehaviorSubject('Some error');
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withError(error$)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            const panel = el.querySelector('.rounded-large') as HTMLElement;
            expect(panel).toHaveClass('border-error');
        });

        it('hides error message when error$ emits empty string', () => {
            const error$ = new BehaviorSubject('Error!');
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withError(error$)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            const errorDiv = el.querySelector('div.text-error') as HTMLDivElement;
            error$.next('');
            expect(errorDiv.style.display).toBe('none');
        });

        it('removes border-error when error clears', () => {
            const error$ = new BehaviorSubject('Error!');
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withError(error$)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            const panel = el.querySelector('.rounded-large') as HTMLElement;
            error$.next('');
            expect(panel).not.toHaveClass('border-error');
        });
    });

    // ── withSelectAll feature ────────────────────────────────────────────────

    describe('withSelectAll', () => {

        // Spec 1: default behaviour — header row is rendered
        it('renders the "Select all" header row by default (no withSelectAll call)', () => {
            const { el } = buildDefault();
            const header = getHeaderInput(el);
            expect(header).not.toBeNull();
            expect(header.getAttribute('aria-label')).toBe('Select all');
        });

        // Spec 5: .withSelectAll(true) behaves identically to the default
        it('.withSelectAll(true) renders the "Select all" header row', () => {
            const value$ = new BehaviorSubject<Item[]>([]);
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withItemCaptionProvider(item => item.name)
                .withValue(value$)
                .withSelectAll(true)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            const header = getHeaderInput(el);
            expect(header).not.toBeNull();
            expect(header.getAttribute('aria-label')).toBe('Select all');
        });

        // Spec 2: .withSelectAll(false) — no "Select all" element in DOM
        it('.withSelectAll(false) removes the "Select all" element from the DOM', () => {
            const value$ = new BehaviorSubject<Item[]>([]);
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withItemCaptionProvider(item => item.name)
                .withValue(value$)
                .withSelectAll(false)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            const header = el.querySelector('[aria-label="Select all"]');
            expect(header).toBeNull();
        });

        // Spec 3: .withSelectAll(false) — item checkboxes still toggle value$
        it('.withSelectAll(false) — checking an item adds it to value$', () => {
            const value$ = new BehaviorSubject<Item[]>([]);
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withItemCaptionProvider(item => item.name)
                .withValue(value$)
                .withSelectAll(false)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            const inputs = getItemInputs(el);
            toggle(inputs[0], true);
            expect(value$.getValue()).toHaveLength(1);
            expect(value$.getValue()[0].id).toBe(1);
        });

        it('.withSelectAll(false) — unchecking an item removes it from value$', () => {
            const value$ = new BehaviorSubject<Item[]>([ITEMS[0], ITEMS[1]]);
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withItemCaptionProvider(item => item.name)
                .withValue(value$)
                .withSelectAll(false)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            const inputs = getItemInputs(el);
            toggle(inputs[0], false);
            const ids = value$.getValue().map(i => i.id);
            expect(ids).not.toContain(1);
            expect(ids).toContain(2);
        });

        // Spec 4: .withSelectAll(false) — selecting all items does NOT trigger
        //         a select-all side-effect (value$ should contain exactly what
        //         was individually toggled, not a full-list replacement)
        it('.withSelectAll(false) — manually selecting all items emits individual selections without select-all side-effect', () => {
            const value$ = new BehaviorSubject<Item[]>([]);
            const nextSpy = jest.spyOn(value$, 'next');

            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withItemCaptionProvider(item => item.name)
                .withValue(value$)
                .withSelectAll(false)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            const inputs = getItemInputs(el);
            toggle(inputs[0], true);
            toggle(inputs[1], true);
            toggle(inputs[2], true);

            // value$ should have been called exactly 3 times (one per checkbox),
            // never with the entire ITEMS array in a single bulk emission that
            // would indicate a select-all code path was triggered.
            expect(nextSpy).toHaveBeenCalledTimes(3);

            // Final state must equal all items selected
            const ids = value$.getValue().map(i => i.id).sort();
            expect(ids).toEqual([1, 2, 3]);

            // No single call should have emitted all 3 items at once from the start
            // (which would be the select-all side-effect); each call should have
            // grown the selection by exactly one item.
            const callArgs = nextSpy.mock.calls.map(call => call[0].map((i: Item) => i.id).sort());
            expect(callArgs[0]).toEqual([1]);
            expect(callArgs[1]).toEqual([1, 2]);
            expect(callArgs[2]).toEqual([1, 2, 3]);

            nextSpy.mockRestore();
        });

        // Spec 3 continued: external value$.next() still patches DOM correctly
        it('.withSelectAll(false) — external value$.next() updates item checked states', () => {
            const value$ = new BehaviorSubject<Item[]>([]);
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withItemCaptionProvider(item => item.name)
                .withValue(value$)
                .withSelectAll(false)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            value$.next([ITEMS[0], ITEMS[2]]);
            const inputs = getItemInputs(el);
            expect(inputs[0].checked).toBe(true);
            expect(inputs[1].checked).toBe(false);
            expect(inputs[2].checked).toBe(true);
        });
    });

    // ── MultiSelectListStyle.BORDERLESS ─────────────────────────────────────

    describe('withStyle(BORDERLESS)', () => {

        function buildBorderless(error$?: BehaviorSubject<string>) {
            const value$ = new BehaviorSubject<Item[]>([]);
            const builder = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withItemCaptionProvider(item => item.name)
                .withValue(value$)
                .withStyle(of(MultiSelectListStyle.BORDERLESS));
            if (error$) builder.withError(error$);
            const el = builder.build();
            document.body.appendChild(el);
            triggerVisibleAndWait(el);
            return { el, value$ };
        }

        function getPanel(el: HTMLElement): HTMLDivElement {
            // The panel is the first direct child div of the container that
            // holds the items div[role="group"]
            return el.querySelector('div:has(> div[role="group"])') as HTMLDivElement;
        }

        // Spec 1: no border classes on the panel
        it('panel does NOT have rounded-large, border, or border-outline classes', () => {
            const { el } = buildBorderless();
            const panel = getPanel(el);
            expect(panel).not.toHaveClass('rounded-large');
            expect(panel).not.toHaveClass('border');
            expect(panel).not.toHaveClass('border-outline');
        });

        // Spec 2: selected items use bg-secondary-container (same as TONAL)
        it('selected items use bg-secondary-container', () => {
            const value$ = new BehaviorSubject<Item[]>([ITEMS[0]]);
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withItemCaptionProvider(item => item.name)
                .withValue(value$)
                .withStyle(of(MultiSelectListStyle.BORDERLESS))
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            const lis = getLiElements(el);
            const selectedLabel = lis[0].querySelector('label') as HTMLLabelElement;
            expect(selectedLabel).toHaveClass('bg-secondary-container');
        });

        // Spec 2 continued: unselected items do NOT have bg-secondary-container
        it('unselected items do NOT have bg-secondary-container', () => {
            const value$ = new BehaviorSubject<Item[]>([ITEMS[0]]);
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withItemCaptionProvider(item => item.name)
                .withValue(value$)
                .withStyle(of(MultiSelectListStyle.BORDERLESS))
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            const lis = getLiElements(el);
            const unselectedLabel = lis[1].querySelector('label') as HTMLLabelElement;
            expect(unselectedLabel).not.toHaveClass('bg-secondary-container');
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

    // ── Regression: default TONAL style retains border classes ───────────────

    describe('default style (TONAL) regression', () => {
        it('panel still has rounded-large border border-outline with default TONAL style', () => {
            const { el } = buildDefault();
            // Locate panel via the items group it contains
            const panel = el.querySelector('div:has(> div[role="group"])') as HTMLDivElement;
            expect(panel).toHaveClass('rounded-large');
            expect(panel).toHaveClass('border');
            expect(panel).toHaveClass('border-outline');
        });
    });

    // ── Virtualization ───────────────────────────────────────────────────────

    it('virtualizes: renders only a window for a large dataset', () => {
        const items$ = of(Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` })));
        const el = new MultiSelectListBuilder<{ id: number; name: string }>()
            .withItems(items$)
            .withItemIdProvider(i => i.id)
            .withItemCaptionProvider(i => i.name)
            .build();
        document.body.appendChild(el);
        const listEl = el.querySelector('div[role="group"]') as HTMLElement;
        Object.defineProperty(listEl, 'clientHeight', { value: 200, configurable: true, writable: true });
        Object.defineProperty(listEl, 'scrollTop', { value: 0, configurable: true, writable: true });
        triggerVisibleAndWait(el);

        // Initial render: only a small window (far fewer than 1000 rows)
        const rowsBefore = getRows(el);
        expect(rowsBefore.length).toBeGreaterThan(0);
        expect(rowsBefore.length).toBeLessThan(1000);
        expect(rowsBefore[0].getAttribute('aria-setsize')).toBe('1000');
        expect(rowsBefore[0].getAttribute('aria-posinset')).toBe('1');

        // Scroll down — the viewport window should shift
        (listEl as any).scrollTop = 440; // 10 × 44 px row heights
        listEl.dispatchEvent(new Event('scroll'));
        jest.advanceTimersByTime(17); // fire the pending RAF callback

        const rowsAfter = getRows(el);
        expect(rowsAfter.length).toBeGreaterThan(0);
        expect(rowsAfter.length).toBeLessThan(1000);
        // After scrolling, first rendered row is no longer item 0
        expect(Number(rowsAfter[0].getAttribute('aria-posinset'))).toBeGreaterThan(1);
    });

    it('re-rendered rows reflect selection updated while they were evicted', () => {
        // MINOR 3: exercises buildRow reading currentSelectedIds on re-entry after
        // a value$.next() that fired while the row was outside the render window.
        const itemsArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }));
        const value$ = new BehaviorSubject<{ id: number; name: string }[]>([]);
        const el = new MultiSelectListBuilder<{ id: number; name: string }>()
            .withItems(of(itemsArray))
            .withItemIdProvider(i => i.id)
            .withItemCaptionProvider(i => i.name)
            .withValue(value$)
            .build();
        document.body.appendChild(el);
        const listEl = el.querySelector('div[role="group"]') as HTMLElement;
        Object.defineProperty(listEl, 'clientHeight', { value: 200, configurable: true, writable: true });
        Object.defineProperty(listEl, 'scrollTop', { value: 0, configurable: true, writable: true });
        triggerVisibleAndWait(el);

        // Row 0 should start unchecked
        const initialRow0 = getRows(el).find(r => r.getAttribute('aria-posinset') === '1')!;
        expect(initialRow0.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(false);

        // Scroll far enough to evict row 0
        (listEl as any).scrollTop = 2000;
        listEl.dispatchEvent(new Event('scroll'));
        jest.advanceTimersByTime(17);

        // Select item 0 while its row is evicted from the DOM
        value$.next([itemsArray[0]]);

        // Scroll back to top — buildRow must re-render row 0 with isSelected = true
        (listEl as any).scrollTop = 0;
        listEl.dispatchEvent(new Event('scroll'));
        jest.advanceTimersByTime(17);

        const row0 = getRows(el).find(r => r.getAttribute('aria-posinset') === '1')!;
        expect(row0).toBeDefined();
        expect(row0.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(true);
    });

    // ── Req 15: Memory cleanup via registerDestroy ───────────────────────────

    describe('memory cleanup on DOM removal', () => {
        it('unsubscribes subscriptions when element is removed from DOM', () => {
            const value$ = new BehaviorSubject<Item[]>([]);
            const items$ = new BehaviorSubject<Item[]>(ITEMS);

            const el = new MultiSelectListBuilder<Item>()
                .withItems(items$)
                .withItemIdProvider(item => item.id)
                .withValue(value$)
                .build();

            document.body.appendChild(el);
            triggerVisibleAndWait(el);

            // Confirm reactive binding works while in DOM
            value$.next([ITEMS[0]]);
            const inputsBefore = getItemInputs(el);
            expect(inputsBefore[0].checked).toBe(true);

            // Remove from DOM — should trigger destroy callbacks
            document.body.removeChild(el);

            // Allow MutationObserver microtask to fire
            // After removal subscriptions should be torn down;
            // further emissions should not cause errors or updates
            expect(() => {
                value$.next([ITEMS[1], ITEMS[2]]);
                items$.next([...ITEMS, { id: 4, name: 'Date' }]);
            }).not.toThrow();
        });
    });

    // ── B11: style change invalidates cached row measurements ────────────────

    it('a style change re-measures rows instead of reusing heights measured under the old style', () => {
        // Rows measured under the old style get evicted by scrolling and are never
        // re-measured. Without viewport.invalidateMeasurements() in the style branch,
        // their stale heights keep inflating the prefix/spacer after the style (and thus
        // the rendered row height) changed.
        let rowHeight = 88;
        Object.defineProperty(HTMLDivElement.prototype, 'offsetHeight', {
            configurable: true,
            get(this: HTMLDivElement) {
                return this.hasAttribute('aria-setsize') ? rowHeight : 0;
            },
        });
        try {
            const itemsArray = Array.from({ length: 200 }, (_, i) => ({ id: i, name: `Item ${i}` }));
            const style$ = new BehaviorSubject<MultiSelectListStyle>(MultiSelectListStyle.TONAL);
            const el = new MultiSelectListBuilder<{ id: number; name: string }>()
                .withItems(of(itemsArray))
                .withItemIdProvider(i => i.id)
                .withItemCaptionProvider(i => i.name)
                .withValue(new BehaviorSubject<{ id: number; name: string }[]>([]))
                .withStyle(style$)
                .build();
            document.body.appendChild(el);
            const listEl = getList(el);
            Object.defineProperty(listEl, 'clientHeight', { value: 100, configurable: true, writable: true });
            Object.defineProperty(listEl, 'scrollTop', { value: 0, configurable: true, writable: true });
            triggerVisibleAndWait(el);

            // Scroll away so the rows measured at 88px are evicted from the window.
            (listEl as any).scrollTop = 3000;
            listEl.dispatchEvent(new Event('scroll'));
            jest.advanceTimersByTime(17);

            const spacer = listEl.querySelector('[aria-hidden="true"]') as HTMLElement;
            expect(parseFloat(spacer.style.height)).toBeGreaterThan(200 * 44);

            // Under the new style rows render at the 44px estimate height.
            rowHeight = 44;
            style$.next(MultiSelectListStyle.BORDERLESS);

            // Heights are re-derived from the new style — no 88px leftovers anywhere.
            expect(spacer.style.height).toBe(`${200 * 44}px`);
        } finally {
            delete (HTMLDivElement.prototype as any).offsetHeight;
        }
    });
});
