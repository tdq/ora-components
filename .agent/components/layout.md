# Layout

## Description
Layout component is a component which is used for layout of the page. It has the following methods:
- `addSlot(): SlotBuilder` - adds new slot to the layout. It can have one child component.
- `asVertical(): this` - sets layout to vertical.
- `asHorizontal(): this` - sets layout to horizontal.
- `withGap(gap: LayoutGap): this` - sets gap between slots.
- `asScrollable(): this` - makes the layout a vertical scroll container (`overflow-y-auto min-h-0`) with the `.ora-scroll-bleed` gutter, so children's shadows and focus rings are not clipped at its edges. Drops `w-full` (see Gotchas).
- `withClass(className: Observable<string>): this` - sets class css name of the layout.
- `withAlignment(alignment: Observable<Alignment>): this` - sets alignment of the content in the layout.
- `withTestId(id: string): this` - sets `data-testid` on the rendered host element. See [Test ids](../builder-pattern.md#test-ids).

Layout omponent should have full width.

LayoutGap is an enum with values:
- `SMALL`. 4px gap
- `MEDIUM`. 8px gap
- `LARGE`. 16px gap
- `EXTRA_LARGE`. 32px gap

LayoutGap defines the gap between slots. Default value is MEDIUM.

SlotBuilder has the following methods:
- `withContent(content: ComponentBuilder): this` - sets content of the slot.
- `withSize(size: SlotSize): this` - sets size of the slot.
- `withVisible(visible: Observable<boolean>): this` - sets visibility of the slot.
- `withAlignment(alignment: Observable<Alignment>): this` - sets alignment of the content in the slot.
- `withName(name: string): this` - sets the slot's `data-slot` attribute value (see [Slot addressing](#slot-addressing)).
- `asScrollable(): this` - makes the slot a vertical scroll container with the `.ora-scroll-bleed` gutter; pair with `withSize(SlotSize.GROW)` so it fills the remaining height and scrolls.
- `withTestId(id: string): this` - sets `data-testid` on the rendered slot element. See [Test ids](../builder-pattern.md#test-ids).

SlotSize is an enum with values:
- `QUARTER`. 1/4 of available space
- `THIRD`. 1/3 of available space
- `HALF`. 1/2 of available space
- `TWO_THIRDS`. 2/3 of available space
- `THREE_QUARTERS`. 3/4 of available space
- `FULL`. 1 of available space
- `FIT`. content-sized, does not grow or shrink
- `GROW`. takes all remaining space along the layout's **main** axis

Alignment is an enum with values:
- `LEFT`. default alignment on the left
- `RIGHT`. align content to be on the right
- `CENTER`. align content to be in center of the slot

SlotSize defines the size of the slot. Default value is calculated based on the number of slots (min QUARTER, max FULL). 
For vertical layout default slot size is not set (size of content).
Slot size can be shrinked or growed based on available space.

### SlotSize.GROW

`GROW` is the slot that absorbs leftover space so a scrollable child (grid, list, chart) can fill the remaining height instead of overflowing the page. It is **direction-aware**:

- The slot wrapper always gets `flex-1`, plus `min-h-0` in a vertical layout or `min-w-0` in a horizontal one — without the `min-*-0` a flex item refuses to shrink below its content's intrinsic size, which is what makes a nested scroll container push the page instead of scrolling.
- The **container** gets `h-full min-h-0` only when the layout is vertical **and** at least one slot is GROW. It is deliberately not applied to horizontal layouts: there `h-full` is the cross axis and would stretch e.g. a toolbar to the full height of its parent.
- A GROW slot keeps `items-stretch` even when an `Alignment` is set — only the `justify-*` half of the alignment is applied (`JUSTIFY_MAP`), because `items-center` would leave the child at its intrinsic height and defeat the whole point of GROW. Non-GROW slots are unchanged (`ALIGNMENT_MAP` = justify + `items-center`).

### Slot addressing

Every slot wrapper carries a `data-slot` attribute — its `withName(...)` value, or the slot's zero-based index when unnamed. This gives tests, e2e selectors and consumer CSS a stable handle on layout structure without depending on DOM order.

Names are caller-owned: the library never rewrites or suffixes them. Duplicates (two `withName('a')`, or `withName('0')` colliding with slot 0's default) are emitted verbatim and produce a `console.warn` from `build()`.

## Gotchas

- `SlotSize.GROW` fills remaining space along the layout's main axis but requires the parent layout to have `h-full min-h-0` (in vertical mode) or `min-w-0` (in horizontal mode) to prevent the layout itself from growing beyond its parent.
- Any `overflow-*` container clips children's `shadow-level-*` shadows (level-2 bleeds ~10px below, ~5px sideways) and `ring-2 ring-offset-2` focus rings at its edges. Make the scroller with `asScrollable()` (layout or slot) instead of `withClass(of('overflow-y-auto'))`: it adds `.ora-scroll-bleed` — `padding: var(--ora-shadow-bleed)` (12px) plus the same negative margin — so content stays aligned with siblings while the shadow paints into the gutter. The class relies on `width: auto`, so `asScrollable()` omits `w-full`; do not add it back via `withClass`.
- For a flex wrapper that only needs to let a child shrink (not scroll), use `min-h-0` / `min-w-0`, not `overflow-hidden` — the latter clips shadows for nothing.

## Usage

```typescript
// Vertical layout with two slots
const layout = new LayoutBuilder()
    .asVertical()
    .withGap(LayoutGap.MEDIUM);

layout.addSlot().withContent(new LabelBuilder().withCaption(of('Header')));
layout.addSlot().withContent(new LabelBuilder().withCaption(of('Body')));

const element = layout.build();
```

```typescript
// Scrollable page: the layout is the scroll container, with the shadow gutter
const page = new LayoutBuilder()
    .asVertical()
    .withGap(LayoutGap.LARGE)
    .asScrollable()
    .withClass(of('flex-1'));
page.addSlot().withContent(statsRow);   // KPI cards with shadow-level-2 — not clipped
page.addSlot().withContent(mainPanel);

// Fixed header + scrollable body: only the GROW slot scrolls
const shell = new LayoutBuilder().asVertical().withGap(LayoutGap.SMALL);
shell.addSlot().withSize(SlotSize.FIT).withContent(toolbar);
shell.addSlot().withSize(SlotSize.GROW).asScrollable().withContent(list);
```