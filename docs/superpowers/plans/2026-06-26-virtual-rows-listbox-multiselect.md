# Virtual Rows for ListBox & MultiSelectList Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render only the visible window of rows (plus a buffer) in `ListBoxBuilder` and `MultiSelectListBuilder`, via a shared fixed-height virtualization utility, so large datasets stay fast.

**Architecture:** A new `VirtualRowsViewport<ITEM>` util in `utils/` owns all windowing math and DOM positioning (a spacer drives the scrollbar; rows are absolutely positioned with `translateY`). Both list components delegate to it, supplying a `renderRow` callback. The technique mirrors the existing `grid/grid-viewport.ts`. Virtualization is always-on (no opt-in API).

**Tech Stack:** TypeScript, RxJS, jsdom + ts-jest (Jest), Tailwind utility classes via `clsx` + `tailwind-merge`.

## Global Constraints

- Package under test: `packages/ora-components`. Run tests from there: `cd packages/ora-components && npx jest <file>`.
- Test environment is **jsdom**: `clientHeight`/`scrollTop` are `0` and `ResizeObserver`/`requestAnimationFrame` are not native. Mock them per `packages/ora-components/src/components/grid/grid-viewport.test.ts` (mock `global.requestAnimationFrame` to call synchronously, `global.ResizeObserver` as a capturing stub, and `clientHeight` via `Object.defineProperty`).
- Preserve `createOptimizedPipeline(container, items$)` viewport gating — the util sits downstream of the gate, do not remove it.
- Cleanup is via `registerDestroy(element, cb)` from `core/destroyable-element`; the util exposes `destroy()` which the component wires into `registerDestroy`.
- **Repo commit convention:** do NOT run `git commit` without explicit user approval. The "Commit" steps below mean: `git add` the listed files and prepare the commit message, then pause for the user to approve the actual commit.
- Buffer default: `5` rows. Row-height fallback constants: ListBox `44`, MultiSelectList `44` (auto-measured from first row when `offsetHeight > 0`).

---

### Task 1: `VirtualRowsViewport<ITEM>` shared utility

**Files:**
- Create: `packages/ora-components/src/utils/virtual-rows-viewport.ts`
- Test: `packages/ora-components/src/utils/virtual-rows-viewport.test.ts`

**Interfaces:**
- Consumes: nothing (leaf util).
- Produces:
  ```ts
  interface VirtualRowsConfig<ITEM> {
      scrollEl: HTMLElement;
      rowHeight: number;
      buffer?: number; // default 5
      renderRow: (index: number, item: ITEM) => HTMLElement;
      onEvict?: (el: HTMLElement, index: number) => void;
  }
  class VirtualRowsViewport<ITEM> {
      constructor(config: VirtualRowsConfig<ITEM>);
      setItems(items: ITEM[]): void;
      refresh(): void;
      scrollToIndex(index: number): void;
      getRenderedRow(index: number): HTMLElement | undefined;
      getRenderedRange(): { start: number; end: number };
      destroy(): void;
  }
  ```

- [ ] **Step 1: Write failing tests**

Create `packages/ora-components/src/utils/virtual-rows-viewport.test.ts`:

```ts
import { VirtualRowsViewport } from './virtual-rows-viewport';

describe('VirtualRowsViewport', () => {
    let resizeCallback: () => void;

    beforeAll(() => {
        global.requestAnimationFrame = (cb: FrameRequestCallback) => { cb(0); return 0; };
        global.ResizeObserver = class {
            constructor(cb: any) { resizeCallback = () => cb([], this as any); }
            observe() {} unobserve() {} disconnect() {}
        } as any;
    });

    const makeScrollEl = (clientHeight: number): HTMLElement => {
        const el = document.createElement('div');
        Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true, writable: true });
        Object.defineProperty(el, 'scrollTop', { value: 0, configurable: true, writable: true });
        document.body.appendChild(el);
        return el;
    };

    const renderRow = (index: number) => {
        const d = document.createElement('div');
        d.dataset.index = String(index);
        d.textContent = `row ${index}`;
        return d;
    };

    afterEach(() => { document.body.innerHTML = ''; });

    it('renders only the visible window plus buffer', () => {
        const scrollEl = makeScrollEl(200); // 200/40 = 5 visible; +buffer 5 => indices 0..9 => 10 rows
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        const rendered = scrollEl.querySelectorAll('[data-index]');
        expect(rendered.length).toBe(10);
        expect(vp.getRenderedRange()).toEqual({ start: 0, end: 9 });
    });

    it('sizes the spacer to total * rowHeight', () => {
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        const spacer = scrollEl.querySelector('[aria-hidden="true"]') as HTMLElement;
        expect(spacer.style.height).toBe('4000px');
    });

    it('positions rows with translateY based on index', () => {
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        const row3 = vp.getRenderedRow(3)!;
        expect(row3.style.transform).toBe('translateY(120px)');
    });

    it('shifts the window and evicts rows on scroll', () => {
        const scrollEl = makeScrollEl(200);
        const evicted: number[] = [];
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow, onEvict: (_e, i) => evicted.push(i) });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        (scrollEl as any).scrollTop = 2000; // index 50
        scrollEl.dispatchEvent(new Event('scroll'));
        expect(vp.getRenderedRow(0)).toBeUndefined();
        expect(evicted).toContain(0);
        const range = vp.getRenderedRange();
        expect(range.start).toBeLessThanOrEqual(50);
        expect(range.end).toBeGreaterThanOrEqual(50);
    });

    it('re-renders the window on ResizeObserver callback', () => {
        const scrollEl = makeScrollEl(0); // height 0 -> only buffer rows
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        const before = scrollEl.querySelectorAll('[data-index]').length;
        (scrollEl as any).clientHeight = 400;
        resizeCallback();
        const after = scrollEl.querySelectorAll('[data-index]').length;
        expect(after).toBeGreaterThan(before);
    });

    it('clears all rows and zeroes the spacer on empty items', () => {
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems([1, 2, 3]);
        vp.setItems([]);
        expect(scrollEl.querySelectorAll('[data-index]').length).toBe(0);
        const spacer = scrollEl.querySelector('[aria-hidden="true"]') as HTMLElement;
        expect(spacer.style.height).toBe('0px');
    });

    it('scrollToIndex sets scrollTop and renders that row', () => {
        const scrollEl = makeScrollEl(200);
        const vp = new VirtualRowsViewport<number>({ scrollEl, rowHeight: 40, renderRow });
        vp.setItems(Array.from({ length: 100 }, (_, i) => i));
        vp.scrollToIndex(80);
        expect(vp.getRenderedRow(80)).toBeDefined();
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd packages/ora-components && npx jest src/utils/virtual-rows-viewport.test.ts`
Expected: FAIL — "Cannot find module './virtual-rows-viewport'".

- [ ] **Step 3: Implement the util**

Create `packages/ora-components/src/utils/virtual-rows-viewport.ts`:

```ts
export interface VirtualRowsConfig<ITEM> {
    /** Scroll container. Will be set position:relative; overflow-y:auto. */
    scrollEl: HTMLElement;
    /** Fixed row height in px; auto-measured from the first row when possible. */
    rowHeight: number;
    /** Extra rows rendered above/below the viewport. Default 5. */
    buffer?: number;
    /** Build a row element for an item at an index. */
    renderRow: (index: number, item: ITEM) => HTMLElement;
    /** Called for each row removed from the DOM (cleanup hook). */
    onEvict?: (el: HTMLElement, index: number) => void;
}

export class VirtualRowsViewport<ITEM> {
    private readonly scrollEl: HTMLElement;
    private readonly spacer: HTMLElement;
    private readonly renderRow: (index: number, item: ITEM) => HTMLElement;
    private readonly onEvict?: (el: HTMLElement, index: number) => void;
    private readonly buffer: number;
    private rowHeight: number;
    private measured = false;

    private items: ITEM[] = [];
    private rendered = new Map<number, HTMLElement>();
    private range = { start: 0, end: -1 };
    private ticking = false;
    private resizeObserver: ResizeObserver | null = null;

    constructor(config: VirtualRowsConfig<ITEM>) {
        this.scrollEl = config.scrollEl;
        this.renderRow = config.renderRow;
        this.onEvict = config.onEvict;
        this.buffer = config.buffer ?? 5;
        this.rowHeight = config.rowHeight;

        this.scrollEl.style.position = 'relative';
        this.scrollEl.style.overflowY = 'auto';

        this.spacer = document.createElement('div');
        this.spacer.setAttribute('aria-hidden', 'true');
        this.spacer.style.width = '1px';
        this.spacer.style.height = '0px';
        this.spacer.style.flexShrink = '0';
        this.scrollEl.appendChild(this.spacer);

        this.scrollEl.addEventListener('scroll', this.onScroll);

        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => this.render());
            this.resizeObserver.observe(this.scrollEl);
        }
    }

    setItems(items: ITEM[]): void {
        this.items = items;
        this.spacer.style.height = `${items.length * this.rowHeight}px`;
        this.render();
    }

    refresh(): void {
        // Force a full re-render of the current window (e.g. selection/style change).
        this.clearRendered();
        this.range = { start: 0, end: -1 };
        this.render();
    }

    scrollToIndex(index: number): void {
        if (index < 0 || index >= this.items.length) return;
        const top = index * this.rowHeight;
        const viewTop = this.scrollEl.scrollTop;
        const viewBottom = viewTop + this.scrollEl.clientHeight;
        if (top < viewTop) {
            this.scrollEl.scrollTop = top;
        } else if (top + this.rowHeight > viewBottom) {
            this.scrollEl.scrollTop = top + this.rowHeight - this.scrollEl.clientHeight;
        }
        this.render();
    }

    getRenderedRow(index: number): HTMLElement | undefined {
        return this.rendered.get(index);
    }

    getRenderedRange(): { start: number; end: number } {
        return { ...this.range };
    }

    destroy(): void {
        this.scrollEl.removeEventListener('scroll', this.onScroll);
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        this.clearRendered();
    }

    private onScroll = () => {
        if (this.ticking) return;
        this.ticking = true;
        requestAnimationFrame(() => {
            this.render();
            this.ticking = false;
        });
    };

    private clearRendered(): void {
        for (const [index, el] of this.rendered.entries()) {
            this.onEvict?.(el, index);
            el.remove();
        }
        this.rendered.clear();
    }

    private measureRowHeight(): void {
        if (this.measured) return;
        const first = this.rendered.values().next().value as HTMLElement | undefined;
        if (first && first.offsetHeight > 0) {
            this.rowHeight = first.offsetHeight;
            this.measured = true;
            this.spacer.style.height = `${this.items.length * this.rowHeight}px`;
        }
    }

    private render(): void {
        const count = this.items.length;
        if (count === 0) {
            this.clearRendered();
            this.range = { start: 0, end: -1 };
            return;
        }

        const scrollTop = this.scrollEl.scrollTop;
        const clientHeight = this.scrollEl.clientHeight;
        const start = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.buffer);
        const end = Math.min(count - 1, Math.floor((scrollTop + clientHeight) / this.rowHeight) + this.buffer);

        // Evict rows outside the new window.
        for (const [index, el] of this.rendered.entries()) {
            if (index < start || index > end) {
                this.onEvict?.(el, index);
                el.remove();
                this.rendered.delete(index);
            }
        }

        // Render rows inside the window that are not yet present.
        for (let i = start; i <= end; i++) {
            if (this.rendered.has(i)) continue;
            const el = this.renderRow(i, this.items[i]);
            el.style.position = 'absolute';
            el.style.left = '0';
            el.style.right = '0';
            el.style.transform = `translateY(${i * this.rowHeight}px)`;
            this.scrollEl.appendChild(el);
            this.rendered.set(i, el);
        }

        this.range = { start, end };
        this.measureRowHeight();
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd packages/ora-components && npx jest src/utils/virtual-rows-viewport.test.ts`
Expected: PASS (all 7 tests).

- [ ] **Step 5: Stage and prepare commit (await user approval per Global Constraints)**

```bash
git add packages/ora-components/src/utils/virtual-rows-viewport.ts packages/ora-components/src/utils/virtual-rows-viewport.test.ts
git commit -m "feat(utils): add VirtualRowsViewport fixed-height windowing util"
```

---

### Task 2: Integrate virtualization into ListBoxBuilder

**Files:**
- Modify: `packages/ora-components/src/components/listbox/listbox.ts`
- Test: `packages/ora-components/src/components/listbox/listbox.test.ts`

**Interfaces:**
- Consumes: `VirtualRowsViewport` from `../../utils/virtual-rows-viewport` (Task 1).
- Produces: no new public API. `ListBoxBuilder` behavior unchanged from the consumer's view; only visible `li[role="option"]` rows exist in the DOM, each carrying `aria-setsize` / `aria-posinset`.

- [ ] **Step 1: Update existing tests for the virtualized DOM + add a virtualization test**

In `packages/ora-components/src/components/listbox/listbox.test.ts`:

(a) Add jsdom mocks at the top of the file (after imports, before `describe`):

```ts
beforeAll(() => {
    global.requestAnimationFrame = ((cb: FrameRequestCallback) => { cb(0); return 0; }) as any;
    if (typeof global.ResizeObserver === 'undefined') {
        global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any;
    }
});
```

(b) In the shared mount/setup helper that attaches the listbox to the DOM, force a tall viewport so the window covers the small test datasets. After the element is appended to `document.body`, find the scroll `ul` and mock its height:

```ts
// after appending the built element to document.body
const ul = el.querySelector('ul[role="listbox"]') as HTMLElement;
Object.defineProperty(ul, 'clientHeight', { value: 1000, configurable: true, writable: true });
Object.defineProperty(ul, 'scrollTop', { value: 0, configurable: true, writable: true });
```

(Apply this in every place a listbox is built and queried for options. The existing `getOptions` helper uses `el.querySelectorAll('li[role="option"]')`, which still works.)

(c) Add a new virtualization test:

```ts
it('virtualizes: renders only a window for a large dataset', () => {
    const items$ = of(Array.from({ length: 1000 }, (_, i) => `Item ${i}`));
    const el = new ListBoxBuilder<string>().withItems(items$).build();
    document.body.appendChild(el);
    const ul = el.querySelector('ul[role="listbox"]') as HTMLElement;
    Object.defineProperty(ul, 'clientHeight', { value: 200, configurable: true, writable: true });
    Object.defineProperty(ul, 'scrollTop', { value: 0, configurable: true, writable: true });
    // re-emit not needed; build subscribed already. Force a window recompute via scroll.
    ul.dispatchEvent(new Event('scroll'));
    const options = el.querySelectorAll('li[role="option"]');
    expect(options.length).toBeGreaterThan(0);
    expect(options.length).toBeLessThan(1000);
    expect(options[0].getAttribute('aria-setsize')).toBe('1000');
});
```

- [ ] **Step 2: Run the listbox tests to confirm the new test fails (and locate any assertions needing the tall-viewport mock)**

Run: `cd packages/ora-components && npx jest src/components/listbox/listbox.test.ts`
Expected: the new virtualization test FAILS (`aria-setsize` not present / all 1000 rendered). If any existing `toHaveLength` assertion now fails, it is missing the tall-viewport mock from Step 1(b) — add it there.

- [ ] **Step 3: Rewire `listbox.ts` to use the viewport**

In `packages/ora-components/src/components/listbox/listbox.ts`:

Add the import near the other imports:

```ts
import { VirtualRowsViewport } from '../../utils/virtual-rows-viewport';
```

Replace the items-rendering block (the `const itemsSub = itemsState$.subscribe(([items, selectedItem, style, focusedIndex]) => { ... })` through its `registerDestroy(container, () => itemsSub.unsubscribe());`) with the viewport-driven version below. Keep `currentItems`, `focusedIndex$`, `itemsSource$`, and `itemsState$` exactly as they are defined above that block.

```ts
// Captured latest state read by renderRow.
let selectedId: string | number | null = null;
let currentStyle = ListBoxStyle.TONAL;
let currentFocusedIndex = -1;

const buildOption = (index: number, item: ITEM): HTMLElement => {
    const id = this.itemIdProvider(item);
    const isSelected = selectedId === id;
    const isFocused = currentFocusedIndex === index;
    const caption = this.itemCaptionProvider(item);
    const style = currentStyle;

    const li = document.createElement('li');
    li.role = 'option';
    li.setAttribute('aria-selected', String(isSelected));
    li.setAttribute('aria-setsize', String(currentItems.length));
    li.setAttribute('aria-posinset', String(index + 1));

    const isTonal = (style === ListBoxStyle.TONAL || style === ListBoxStyle.BORDERLESS) && !this.isGlass;
    const isOutlined = style === ListBoxStyle.OUTLINED && !this.isGlass;

    let itemTextColor: string;
    let selectedBg: string;
    let hoverBg: string;
    let focusBg: string;

    if (this.isGlass) {
        itemTextColor = '';
        selectedBg = 'bg-white/40';
        hoverBg = 'hover:bg-black/5 dark:hover:bg-white/10';
        focusBg = 'bg-black/10 dark:bg-white/20';
    } else {
        itemTextColor = (isSelected && isOutlined)
            ? 'text-on-primary-container'
            : (isTonal ? 'text-on-secondary-container' : 'text-on-surface');
        selectedBg = isTonal ? 'bg-on-secondary-container/20' : 'bg-primary-container';
        hoverBg = 'hover:bg-on-surface/8';
        focusBg = 'bg-on-surface/12';
    }

    li.className = cn(
        'px-px-16 py-px-12 cursor-pointer body-large transition-colors overflow-hidden group',
        itemTextColor,
        isSelected && 'font-bold',
        isSelected && selectedBg,
        !isSelected && hoverBg,
        isFocused && !isSelected && focusBg
    );

    if (isFocused) {
        const focusIndicator = document.createElement('div');
        focusIndicator.className = 'absolute left-0 top-0 bottom-0 w-[4px] bg-primary z-20';
        li.appendChild(focusIndicator);
    }

    const stateLayer = document.createElement('div');
    stateLayer.className = cn(
        'absolute inset-0 pointer-events-none transition-colors',
        'active:bg-current active:opacity-15'
    );
    li.appendChild(stateLayer);

    const content = document.createElement('span');
    content.className = 'relative z-10';
    content.textContent = caption;
    li.appendChild(content);

    li.onclick = () => {
        if (this.value$) {
            this.value$.next(item);
        }
    };

    return li;
};

const viewport = new VirtualRowsViewport<ITEM>({
    scrollEl: list,
    rowHeight: 44,
    renderRow: buildOption,
});
registerDestroy(container, () => viewport.destroy());

const itemsSub = itemsState$.subscribe(([items, selectedItem, style, focusedIndex]) => {
    const itemsChanged = items !== currentItems;
    currentItems = items;
    selectedId = selectedItem ? this.itemIdProvider(selectedItem) : null;
    currentStyle = style;
    const focusChanged = focusedIndex !== currentFocusedIndex;
    currentFocusedIndex = focusedIndex;

    if (itemsChanged) {
        viewport.setItems(items);
    } else {
        viewport.refresh();
    }

    if (focusChanged && focusedIndex >= 0) {
        viewport.scrollToIndex(focusedIndex);
    }
});
registerDestroy(container, () => itemsSub.unsubscribe());
```

Note: `li` is now absolutely positioned by the viewport (it sets `position:absolute`), so the `relative` class was removed from `li.className` above (the viewport's inline `position:absolute` governs it). The focus indicator and state layer remain `absolute` relative to the `li`.

- [ ] **Step 4: Run the listbox tests to verify they pass**

Run: `cd packages/ora-components && npx jest src/components/listbox/listbox.test.ts`
Expected: PASS, including the new virtualization test. If keyboard-nav tests that asserted `scrollIntoView` calls now fail, update them to assert the focused option becomes rendered (`getOptions(el).some(li => li.querySelector('.bg-primary'))`) instead of spying on `scrollIntoView` — the viewport uses `scrollTop`, not `scrollIntoView`.

- [ ] **Step 5: Run the full package test suite to catch regressions**

Run: `cd packages/ora-components && npx jest`
Expected: PASS.

- [ ] **Step 6: Stage and prepare commit (await user approval)**

```bash
git add packages/ora-components/src/components/listbox/listbox.ts packages/ora-components/src/components/listbox/listbox.test.ts
git commit -m "feat(listbox): virtualize option rows via VirtualRowsViewport"
```

---

### Task 3: Integrate virtualization into MultiSelectListBuilder

**Files:**
- Modify: `packages/ora-components/src/components/multi-select-list/multi-select-list.ts`
- Test: `packages/ora-components/src/components/multi-select-list/multi-select-list.test.ts`

**Interfaces:**
- Consumes: `VirtualRowsViewport` from `../../utils/virtual-rows-viewport` (Task 1).
- Produces: no new public API. Only visible checkbox rows exist in the DOM; select-all tri-state and selection patching operate on the rendered window. Rows carry `aria-setsize` / `aria-posinset`.

- [ ] **Step 1: Update existing tests for the virtualized DOM + add a virtualization test**

In `packages/ora-components/src/components/multi-select-list/multi-select-list.test.ts`:

(a) Add jsdom mocks at the top (after imports, before `describe`):

```ts
beforeAll(() => {
    global.requestAnimationFrame = ((cb: FrameRequestCallback) => { cb(0); return 0; }) as any;
    if (typeof global.ResizeObserver === 'undefined') {
        global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any;
    }
});
```

(b) Where the component is mounted, mock a tall viewport on the list element so the window covers the small test datasets. The list is the `div[role="group"]`:

```ts
// after appending the built element to document.body
const listEl = el.querySelector('div[role="group"]') as HTMLElement;
Object.defineProperty(listEl, 'clientHeight', { value: 1000, configurable: true, writable: true });
Object.defineProperty(listEl, 'scrollTop', { value: 0, configurable: true, writable: true });
```

Note: the `getRows` helper currently does `Array.from(getList(el)?.children ?? [])`. The list now also contains the viewport spacer (`div[aria-hidden="true"]`). Update `getRows` to exclude it:

```ts
function getRows(el: HTMLElement): HTMLDivElement[] {
    const children = Array.from(getList(el)?.children ?? []) as HTMLElement[];
    return children.filter(c => c.getAttribute('aria-hidden') !== 'true') as HTMLDivElement[];
}
```

(c) Add a virtualization test:

```ts
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
    listEl.dispatchEvent(new Event('scroll'));
    const rows = getRows(el);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(1000);
    expect(rows[0].getAttribute('aria-setsize')).toBe('1000');
});
```

- [ ] **Step 2: Run the tests to confirm the new one fails**

Run: `cd packages/ora-components && npx jest src/components/multi-select-list/multi-select-list.test.ts`
Expected: the new virtualization test FAILS. If existing `toHaveLength(ITEMS.length)` assertions fail, they need the tall-viewport mock from Step 1(b) and the updated `getRows` helper from Step 1(b).

- [ ] **Step 3: Rewire `multi-select-list.ts` to use the viewport**

In `packages/ora-components/src/components/multi-select-list/multi-select-list.ts`:

Add the import near the other imports:

```ts
import { VirtualRowsViewport } from '../../utils/virtual-rows-viewport';
```

Replace the `itemsRenderSub` block (from `const itemsRenderSub = combineLatest([gatedItems$, this.style$]).subscribe(...)` through its `registerDestroy(container, () => itemsRenderSub.unsubscribe());`) with the version below. Keep `currentItems`, `currentStyle`, `itemElements`, and `updateHeaderState` declared above as-is.

```ts
const buildRow = (index: number, item: ITEM): HTMLElement => {
    const isTonal = (currentStyle === MultiSelectListStyle.TONAL || currentStyle === MultiSelectListStyle.BORDERLESS) && !this.isGlass;
    const itemId = this.itemIdProvider(item);
    const isSelected = new Set(this.value$.getValue().map(i => this.itemIdProvider(i))).has(itemId);
    const caption = this.itemCaptionProvider(item);

    const li = document.createElement('div');
    li.setAttribute('aria-setsize', String(currentItems.length));
    li.setAttribute('aria-posinset', String(index + 1));

    const itemLabel = document.createElement('label');
    itemLabel.className = cn(
        'flex items-center gap-px-8 px-px-16 py-px-12 cursor-pointer select-none',
        'transition-colors relative overflow-hidden group',
        getRowBg(isSelected, isTonal)
    );

    const itemCheckContainer = document.createElement('div');
    itemCheckContainer.className = 'relative flex items-center justify-center w-[18px] h-[18px] flex-shrink-0';

    const itemInput = document.createElement('input');
    itemInput.type = 'checkbox';
    itemInput.className = 'sr-only peer';
    itemInput.checked = isSelected;

    const itemBox = document.createElement('div');
    itemBox.className = cn(
        'w-full h-full rounded-small transition-all relative',
        'peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2',
        'peer-checked:bg-primary peer-checked:border-primary',
        'peer-disabled:opacity-38 peer-disabled:cursor-not-allowed',
        this.isGlass ? 'glass-effect' : 'border-2 border-outline'
    );

    const itemIconContainer = document.createElement('div');
    itemIconContainer.className = 'absolute inset-0 w-full h-full text-on-primary scale-0 transition-transform peer-checked:scale-100 flex items-center justify-center';
    itemIconContainer.innerHTML = Icons.CHECKMARK;

    const itemStateLayer = document.createElement('div');
    itemStateLayer.className = cn(
        'absolute -inset-px-8 rounded-full bg-primary opacity-0',
        'group-hover:opacity-[var(--md-sys-state-hover-opacity,0.08)]',
        'peer-active:opacity-[var(--md-sys-state-pressed-opacity,0.12)]'
    );

    itemCheckContainer.appendChild(itemInput);
    itemCheckContainer.appendChild(itemBox);
    itemCheckContainer.appendChild(itemIconContainer);
    itemCheckContainer.appendChild(itemStateLayer);

    const itemCaption = document.createElement('span');
    itemCaption.className = cn('md-label-large', !this.isGlass && 'text-on-surface');
    itemCaption.textContent = caption;

    itemInput.addEventListener('change', () => {
        const latestSelectedIds = new Set(this.value$.getValue().map((i: ITEM) => this.itemIdProvider(i)));
        if (itemInput.checked) {
            latestSelectedIds.add(itemId);
        } else {
            latestSelectedIds.delete(itemId);
        }
        const newSelection = currentItems.filter(i => latestSelectedIds.has(this.itemIdProvider(i)));
        this.value$.next(newSelection);
    });

    itemLabel.appendChild(itemCheckContainer);
    itemLabel.appendChild(itemCaption);
    li.appendChild(itemLabel);

    itemElements.set(itemId, { input: itemInput, li: li as HTMLDivElement, label: itemLabel });
    return li;
};

const viewport = new VirtualRowsViewport<ITEM>({
    scrollEl: list,
    rowHeight: 44,
    renderRow: buildRow,
    onEvict: (el) => {
        // Drop the evicted row from itemElements so selection patches skip it.
        for (const [id, refs] of itemElements.entries()) {
            if (refs.li === el) { itemElements.delete(id); break; }
        }
    },
});
registerDestroy(container, () => viewport.destroy());

const itemsRenderSub = combineLatest([gatedItems$, this.style$]).subscribe(([items, style]) => {
    const itemsChanged = items !== currentItems;
    currentItems = items;
    currentStyle = style;
    itemElements.clear();

    if (itemsChanged) {
        viewport.setItems(items);
    } else {
        viewport.refresh();
    }

    const selectedIds = new Set(this.value$.getValue().map(i => this.itemIdProvider(i)));
    updateHeaderState(selectedIds, items);
});
registerDestroy(container, () => itemsRenderSub.unsubscribe());
```

The existing `selectionSub` (the `this.value$.pipe(skip(1)).subscribe(...)` block) already iterates `itemElements` — which now holds only rendered rows — so it works unchanged. Leave it as-is.

- [ ] **Step 4: Run the multi-select tests to verify they pass**

Run: `cd packages/ora-components && npx jest src/components/multi-select-list/multi-select-list.test.ts`
Expected: PASS, including the new virtualization test.

- [ ] **Step 5: Run the full package test suite to catch regressions**

Run: `cd packages/ora-components && npx jest`
Expected: PASS.

- [ ] **Step 6: Stage and prepare commit (await user approval)**

```bash
git add packages/ora-components/src/components/multi-select-list/multi-select-list.ts packages/ora-components/src/components/multi-select-list/multi-select-list.test.ts
git commit -m "feat(multi-select-list): virtualize rows via VirtualRowsViewport"
```

---

### Task 4: Mark the improvement done

**Files:**
- Modify: `tasks/improvements.md`

- [ ] **Step 1: Check the box**

Change the line:
```
[ ] **ListBuilder**, **MultiSelectList** Implement virtual rows
```
to:
```
[x] **ListBuilder**, **MultiSelectList** Implement virtual rows
```

- [ ] **Step 2: Stage and prepare commit (await user approval)**

```bash
git add tasks/improvements.md
git commit -m "docs: mark virtual rows improvement done"
```

---

## Notes for the implementer

- **Why `refresh()` does a full window rebuild:** ListBox selection/focus and MSL style changes alter row appearance. Rather than diff, we clear and re-render the (small) visible window — simple and correct. MSL's lightweight per-checkbox `selectionSub` patch still avoids a rebuild on pure selection changes.
- **Spacer caveat:** the spacer is a child of the scroll element with `aria-hidden="true"`. Any code that enumerates list children (tests, future features) must skip it — see the `getRows` helper update in Task 3.
- **A11y:** `aria-setsize`/`aria-posinset` keep screen-reader totals correct even though only a window is in the DOM.
- **If `withRowHeight` is ever needed:** add a builder method that overrides the `rowHeight: 44` constant passed to the viewport. Deferred (YAGNI).
