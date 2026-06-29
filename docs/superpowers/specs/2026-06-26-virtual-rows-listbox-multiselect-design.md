# Virtual Rows for ListBox & MultiSelectList — Design

**Date:** 2026-06-26
**Improvement:** `tasks/improvements.md` — “**ListBuilder**, **MultiSelectList** Implement virtual rows”
**Components:** `ListBoxBuilder` (`components/listbox`) and `MultiSelectListBuilder` (`components/multi-select-list`)

## Problem

Both builders render **every** item eagerly with a full DOM rebuild on each
items emission:

- `ListBoxBuilder.build()` — `list.innerHTML = ''; items.forEach(... append <li>)`.
- `MultiSelectListBuilder.build()` — `list.innerHTML = ''; items.forEach(...)`,
  plus an `itemElements` map that holds **all** rows so a separate selection
  subscription can patch every checkbox/row background.

For large datasets this creates thousands of DOM nodes, making first render and
selection updates slow. The codebase already solves this for `GridBuilder` via
`grid/grid-viewport.ts` (fixed-height windowing). We bring the same capability
to these two list components.

## Goals

- Render only the visible window of rows (plus a small buffer) for both
  components, regardless of total item count.
- Match the established GridBuilder virtualization technique so the codebase
  stays consistent.
- Preserve all existing behavior: selection, keyboard navigation, select-all
  tri-state, styles (tonal/outlined/borderless/glass), captions, errors,
  height, enabled/disabled, and the `createOptimizedPipeline` viewport gating.

## Non-Goals (Out of Scope)

- Refactoring `grid-viewport.ts` — the grid keeps its own viewport.
- Variable-height rows / per-row measurement — rows here are uniform single-line.
- Horizontal virtualization.
- An opt-in API — virtualization is **always-on** (decided with user).

## Key Decisions

1. **Always-on, automatic** virtualization (no `.withVirtualRows()` flag).
   Matches GridBuilder; cleanest API; best default performance.
2. **Shared utility** `VirtualRowsViewport<ITEM>` in `utils/`. Both components
   delegate to it. The grid is **not** migrated onto it (separate scope/risk).
3. **Fixed-height windowing.** Rows are uniform single-line in both components.
   Row height is auto-measured from the first rendered row, with a per-component
   constant fallback when the measurement is `0` (jsdom / pre-layout).

## Architecture

### New shared util: `utils/virtual-rows-viewport.ts`

Pure windowing/DOM mechanics — **no styling and no business logic**. Mirrors
`grid-viewport.ts`:

- The **caller** supplies the existing scroll element (the `<ul>` in ListBox,
  the list `<div>` in MultiSelectList). The util:
  - sets it `position: relative; overflow-y: auto`;
  - inserts a **spacer** element sized to `total × rowHeight` to drive the
    native scrollbar;
  - positions each rendered row absolutely via
    `transform: translateY(index × rowHeight)`.
- **Config:**
  ```ts
  interface VirtualRowsConfig<ITEM> {
      scrollEl: HTMLElement;
      rowHeight: number;            // fallback constant; auto-measured if possible
      buffer?: number;              // default 5
      renderRow: (index: number, item: ITEM) => HTMLElement;
      onEvict?: (el: HTMLElement, index: number) => void;
  }
  ```
- **Public API:**
  - `setItems(items: ITEM[]): void` — set the dataset and re-evaluate the window.
  - `refresh(): void` — re-render the current window (e.g. after a
    selection/focus/style change) without changing the dataset.
  - `scrollToIndex(index: number): void` — scroll so the row is in view, then
    render it.
  - `getRenderedRow(index: number): HTMLElement | undefined`.
  - `getRenderedRange(): { start: number; end: number }`.
  - `destroy(): void`.
- **Internals:** `Map<index, HTMLElement>`; scroll listener throttled with
  `requestAnimationFrame`; `ResizeObserver` on `scrollEl`; 5-row buffer;
  create-on-demand / remove-on-evict (no recycle pool — YAGNI). Window math:
  `start = max(0, floor(scrollTop / rowHeight) - buffer)`,
  `end = min(count - 1, ceil((scrollTop + clientHeight) / rowHeight) - 1 + buffer)`
  (the `ceil(...) - 1` excludes a row whose top edge sits exactly on the bottom
  viewport boundary, i.e. is not actually visible).
- **Row height:** after the first row renders, read `offsetHeight`; if it is `0`
  (jsdom / not yet laid out), keep the configured constant fallback.

### ListBox integration (`listbox/listbox.ts`)

- Keep the `combineLatest([itemsSource$, currentValue$, style$, focusedIndex$])`
  subscription, but update **captured state variables** (`selectedId`,
  `style`, `focusedIndex`) instead of rebuilding the DOM. Then:
  - on **items** change → `viewport.setItems(items)`;
  - on **selection / style / focus** change → `viewport.refresh()`.
- `renderRow(index, item)` builds the same `<li role="option">` as today,
  reading the latest captured `selectedId` / `focusedIndex` / `style`.
- **Keyboard nav:** on `focusedIndex$` change, call
  `viewport.scrollToIndex(idx)` then `viewport.refresh()`. This replaces
  `list.children[focusedIndex].scrollIntoView(...)`, which is invalid because
  the focused child may not be rendered under virtualization.
- **A11y:** rows remain `li[role="option"]` direct children of the
  `ul[role="listbox"]`; the spacer is `role="presentation"` / `aria-hidden`.
  Each option gets `aria-setsize` (total count) and `aria-posinset` (index + 1)
  so assistive tech announces correct totals despite virtualization.

### MultiSelectList integration (`multi-select-list/multi-select-list.ts`)

- Replace the items rebuild loop with the util. `renderRow(index, item)` builds
  the same checkbox row, reading current selection from `value$.getValue()`.
- The `itemElements` map + `selectionSub` currently patch **every** row. Rework
  so the selection patch iterates only **rendered** rows
  (`viewport.getRenderedRange()` / rendered map) updating
  `input.checked` and the row background. Newly rendered rows pick up the
  current selection inside `renderRow`.
- `updateHeaderState` (select-all tri-state) already computes from the full
  `items` + `selectedIds` set, independent of the DOM → **unchanged**.
- Select-all change handler and per-row checkbox change handler logic →
  **unchanged** (per-row handler closes over `itemId` at render time).
- Same `aria-setsize` / `aria-posinset` additions on rows; spacer
  `role="presentation"` / `aria-hidden`.

## Data Flow (per component)

```
items$ ──(createOptimizedPipeline gate)──> setItems(items)
                                              │
selection/style/focus change ─> refresh() ──> recompute window
                                              │
scroll / ResizeObserver ────────────────────> recompute window
                                              │
                                              └─> renderRow(i, item) for window
                                                  evict rows outside window
```

`createOptimizedPipeline` viewport gating is preserved: items are still only
subscribed once the container enters the viewport; the util sits downstream of
the gate.

## Error Handling / Edge Cases

- **Empty list:** `setItems([])` clears all rendered rows and sets spacer
  height to 0.
- **`clientHeight === 0`** (detached / jsdom): window degenerates to
  `[0, buffer]`; rows appear once `ResizeObserver` reports a real size. Test
  setup mocks `clientHeight` (see Testing).
- **`withHeight` not set:** the list is `h-full` and scrolls within its bounded
  parent (existing behavior). The `ResizeObserver` tracks the resulting
  `clientHeight`.
- **Focused index beyond rendered window** (ListBox): handled by
  `scrollToIndex` before `refresh`.
- **Selection emitted before items** (MultiSelectList): `renderRow` reads
  `value$.getValue()`, so late-rendered rows reflect prior selections — same
  guarantee as today.

## Testing

Mirror the `grid-viewport.test.ts` jsdom setup: mock
`requestAnimationFrame`, `ResizeObserver`, and `clientHeight`
(`Object.defineProperty`).

- **New** `utils/virtual-rows-viewport.test.ts`: window math, buffer, eviction,
  `scrollToIndex`, resize re-render, spacer height, empty list.
- **Update** `listbox.test.ts` and `multi-select-list.test.ts`:
  - Add the jsdom mocks.
  - Mock a **tall** `clientHeight` so the window covers the small test datasets;
    existing `toHaveLength(ITEMS.length)` assertions then remain valid with
    minimal churn.
  - Add explicit virtualization tests: large dataset → only the window renders;
    scrolling shifts the window; `aria-setsize`/`aria-posinset` correctness.
- **Optional:** a large-dataset story in `packages/stories` to demonstrate.

## Risks

- **Behavior change:** only visible rows exist in the DOM. Any consumer relying
  on all rows being present must adapt. Mitigated for tests via the tall
  `clientHeight` mock; `aria-setsize`/`aria-posinset` preserve a11y semantics.
- **Row-height assumption:** if a future style makes rows multi-line, fixed
  windowing misaligns. Mitigated by auto-measuring the first row; a
  `withRowHeight(px)` escape hatch can be added later if needed (deferred).

## Affected Files

- **New:** `packages/ora-components/src/utils/virtual-rows-viewport.ts`
- **New:** `packages/ora-components/src/utils/virtual-rows-viewport.test.ts`
- **Edit:** `packages/ora-components/src/components/listbox/listbox.ts`
- **Edit:** `packages/ora-components/src/components/multi-select-list/multi-select-list.ts`
- **Edit:** `packages/ora-components/src/components/listbox/listbox.test.ts`
- **Edit:** `packages/ora-components/src/components/multi-select-list/multi-select-list.test.ts`
- **Optional:** a large-dataset story under `packages/stories/src`
