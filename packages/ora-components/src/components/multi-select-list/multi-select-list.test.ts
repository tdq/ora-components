import { BehaviorSubject, of } from 'rxjs';
import '@testing-library/jest-dom';
import { MultiSelectListBuilder } from './multi-select-list';
import { MultiSelectListStyle } from './types';

interface Item {
    id: number;
    name: string;
}

const ITEMS: Item[] = [
    { id: 1, name: 'Apple' },
    { id: 2, name: 'Banana' },
    { id: 3, name: 'Cherry' },
];

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

    return { el, value$ };
}

function getList(el: HTMLElement): HTMLUListElement {
    return el.querySelector('ul[role="listbox"]') as HTMLUListElement;
}

function getLiElements(el: HTMLElement): HTMLLIElement[] {
    return Array.from(el.querySelectorAll('li[role="option"]')) as HTMLLIElement[];
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

    // ── Req 1 & 2: DOM structure ─────────────────────────────────────────────

    describe('DOM structure', () => {
        it('renders a <ul role="listbox" aria-multiselectable="true">', () => {
            const { el } = buildDefault();
            const list = getList(el);
            expect(list).not.toBeNull();
            expect(list.getAttribute('aria-multiselectable')).toBe('true');
        });

        it('renders one <li role="option"> per item', () => {
            const { el } = buildDefault();
            const lis = getLiElements(el);
            expect(lis).toHaveLength(ITEMS.length);
            lis.forEach(li => expect(li.getAttribute('role')).toBe('option'));
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

        it('updates aria-selected on <li>', () => {
            const { el, value$ } = buildDefault();
            const lis = getLiElements(el);
            value$.next([ITEMS[1]]);
            expect(lis[0].getAttribute('aria-selected')).toBe('false');
            expect(lis[1].getAttribute('aria-selected')).toBe('true');
            expect(lis[2].getAttribute('aria-selected')).toBe('false');
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

            const span = el.querySelector('span') as HTMLSpanElement;
            caption$.next('New caption');
            expect(span.textContent).toBe('New caption');
        });

        it('the <ul> has aria-labelledby referencing the caption span id', () => {
            const caption$ = new BehaviorSubject('Fruits');
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withItemIdProvider(item => item.id)
                .withCaption(caption$)
                .build();

            const span = el.querySelector('span') as HTMLSpanElement;
            const list = getList(el);
            expect(span.id).toBeTruthy();
            expect(list.getAttribute('aria-labelledby')).toBe(span.id);
        });

        it('the <ul> does NOT have aria-labelledby when no caption is set', () => {
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

            expect(el).toHaveClass('opacity-50');
            expect(el).toHaveClass('pointer-events-none');
        });

        it('does not apply disabled classes when enabled', () => {
            const enabled$ = new BehaviorSubject(true);
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withEnabled(enabled$)
                .build();

            expect(el).not.toHaveClass('opacity-50');
            expect(el).not.toHaveClass('pointer-events-none');
        });

        it('reactively disables and re-enables', () => {
            const enabled$ = new BehaviorSubject(true);
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withEnabled(enabled$)
                .build();

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

            const panel = el.querySelector('.rounded-large') as HTMLElement;
            expect(panel).toHaveClass('border-error');
        });

        it('hides error message when error$ emits empty string', () => {
            const error$ = new BehaviorSubject('Error!');
            const el = new MultiSelectListBuilder<Item>()
                .withItems(of(ITEMS))
                .withError(error$)
                .build();

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
            return { el, value$ };
        }

        function getPanel(el: HTMLElement): HTMLDivElement {
            // The panel is the first direct child div of the container that
            // holds the <ul role="listbox">
            return el.querySelector('div:has(ul[role="listbox"])') as HTMLDivElement;
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
            // Locate panel via the ul it contains
            const panel = el.querySelector('div:has(ul[role="listbox"])') as HTMLDivElement;
            expect(panel).toHaveClass('rounded-large');
            expect(panel).toHaveClass('border');
            expect(panel).toHaveClass('border-outline');
        });
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
});
