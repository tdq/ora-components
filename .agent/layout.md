# Layout Patterns

This guide covers how to compose pages and panels using `LayoutBuilder`, `SlotBuilder`, `SlotSize`, `LayoutGap`, and `Alignment`.
For the full component API see the component guide (`get_component_guide('layout')`).
For runnable code see the examples file (`get_usage_example('layout')`).

---

## Core Concepts

### LayoutBuilder

`LayoutBuilder` is a flex container. It holds `SlotBuilder` children and controls their direction, spacing, and alignment.

```typescript
import { LayoutBuilder, LayoutGap } from '@tdq/ora-components';
import { of } from 'rxjs';

const layout = new LayoutBuilder()
    .asVertical()           // flex-col (default)
    .withGap(LayoutGap.LARGE)
    .withClass(of('p-8'));  // any Tailwind class — accepts Observable<string>
```

`.build()` returns an `HTMLElement`. To embed a layout inside another component, pass it directly to `.withContent()` or `.addSlot().withContent()` — it implements `ComponentBuilder`.

---

## Direction

| Method | Result |
|---|---|
| `.asVertical()` | Stacks slots top-to-bottom (flex-col). Each slot spans full width. Use for pages, modals, card bodies. |
| `.asHorizontal()` | Places slots side-by-side (flex-row). Use for toolbars, stat rows, split views. |

---

## Gap (spacing between slots)

| Value | Size | When to use |
|---|---|---|
| `LayoutGap.NONE` | 0px | Panels provide their own padding; adjacent borders should touch |
| `LayoutGap.SMALL` | 4px | Compact toolbars, chip rows, tight icon groups |
| `LayoutGap.MEDIUM` | 8px | Standard form fields, default for most layouts |
| `LayoutGap.LARGE` | 16px | Card rows, between sections inside a page |
| `LayoutGap.EXTRA_LARGE` | 32px | Page-level section breathing room, hero spacing |

---

## Slot Sizes

`.withSize(SlotSize.X)` controls how much of a horizontal row a slot takes.
Omitting `.withSize()` on a horizontal slot gives it `flex-1` (equal share of space).

| Value | Width | Typical use |
|---|---|---|
| `SlotSize.QUARTER` | 25% | Narrow sidebar, small KPI card |
| `SlotSize.THIRD` | 33% | Three-column grid |
| `SlotSize.HALF` | 50% | Two-column split |
| `SlotSize.TWO_THIRDS` | 66% | Chart with narrow aside panel |
| `SlotSize.THREE_QUARTERS` | 75% | Wide main content + thin sidebar |
| `SlotSize.FULL` | 100% | Slot spans the entire row |
| `SlotSize.FIT` | content | Shrinks to content width (`flex-none`) — use for icons, badges, buttons |

In **vertical** layouts, slot size is ignored (slots are always full width).

---

## Alignment

`.withAlignment(of(Alignment.X))` on a `LayoutBuilder` aligns all slots along the main axis:

| Value | Effect on horizontal layout |
|---|---|
| `Alignment.LEFT` | `justify-start` — slots start at the leading edge (default) |
| `Alignment.CENTER` | `justify-center` — slots cluster in the middle |
| `Alignment.RIGHT` | `justify-end` — slots pushed to the trailing edge |

Override for a single slot with `.withAlignment(of(Alignment.X))` on the `SlotBuilder`.

---

## Slot Visibility

`.withVisible(observable<boolean>)` reactively shows/hides a slot without rebuilding the layout.
The DOM node is kept; only `display` is toggled.

```typescript
import { BehaviorSubject } from 'rxjs';

const visible$ = new BehaviorSubject(true);

layout.addSlot()
    .withVisible(visible$.asObservable())
    .withContent(panel);

// Toggle from anywhere:
visible$.next(false);
```

---

## Common Patterns

### 1. Vertical Page Layout

The default shape for any scrollable page.

```typescript
const page = new LayoutBuilder()
    .asVertical()
    .withGap(LayoutGap.LARGE)
    .withClass(of('flex-1 overflow-y-auto p-px-24'));

page.addSlot().withContent(statsRow);
page.addSlot().withContent(mainContent);
```

### 2. App Shell — Sidebar + Content

```typescript
const shell = new LayoutBuilder()
    .asHorizontal()
    .withGap(LayoutGap.NONE)
    .withClass(of('h-screen w-full'));

// Sidebar: FIT = width set by its own content/class; never grows
shell.addSlot()
    .withSize(SlotSize.FIT)
    .withContent(sidebarLayout);

// Main content: FULL = takes every remaining pixel
shell.addSlot()
    .withSize(SlotSize.FULL)
    .withContent(mainLayout);
```

### 3. KPI Card Row

Four equal cards — omit `.withSize()` so each shares space equally.

```typescript
const kpiRow = new LayoutBuilder()
    .asHorizontal()
    .withGap(LayoutGap.MEDIUM);

[revenueCard, usersCard, ordersCard, conversionCard].forEach(card =>
    kpiRow.addSlot().withContent(card)
);
```

### 4. Chart + Aside Split

```typescript
const mainRow = new LayoutBuilder()
    .asHorizontal()
    .withGap(LayoutGap.LARGE);

mainRow.addSlot().withSize(SlotSize.TWO_THIRDS).withContent(chartPanel);
mainRow.addSlot().withSize(SlotSize.THIRD).withContent(activityPanel);
```

### 5. Header Row — Title + Actions

Title grows to fill space; action buttons stay at their natural width.

```typescript
const header = new LayoutBuilder()
    .asHorizontal()
    .withGap(LayoutGap.MEDIUM);

header.addSlot().withContent(titleLabel);                          // flex-1
header.addSlot().withSize(SlotSize.FIT).withContent(addButton);   // natural width
header.addSlot().withSize(SlotSize.FIT).withContent(exportButton);
```

### 6. Nesting Layouts

Layouts compose recursively — any `LayoutBuilder` can be passed as `.withContent()` to a slot.

```typescript
const page = new LayoutBuilder().asVertical().withGap(LayoutGap.LARGE);

// First row: 4 KPI cards
const kpiRow = new LayoutBuilder().asHorizontal().withGap(LayoutGap.MEDIUM);
kpiRow.addSlot().withContent(card1);
kpiRow.addSlot().withContent(card2);
kpiRow.addSlot().withContent(card3);
kpiRow.addSlot().withContent(card4);

// Second row: chart left, feed right
const bodyRow = new LayoutBuilder().asHorizontal().withGap(LayoutGap.LARGE);
bodyRow.addSlot().withSize(SlotSize.TWO_THIRDS).withContent(chartPanel);
bodyRow.addSlot().withSize(SlotSize.THIRD).withContent(feedPanel);

page.addSlot().withContent(kpiRow);
page.addSlot().withContent(bodyRow);
```

---

## PanelBuilder + LayoutBuilder Together

`PanelBuilder` provides a surface card; `LayoutBuilder` provides structure inside it.
Use `LayoutBuilder` as the content of a `PanelBuilder`, never the reverse.

```typescript
import { PanelBuilder, PanelGap } from '@tdq/ora-components';

const content = new LayoutBuilder().asVertical().withGap(LayoutGap.LARGE);
content.addSlot().withContent(titleLabel);
content.addSlot().withContent(bodyText);

const panel = new PanelBuilder()
    .withGap(PanelGap.LARGE)
    .withContent(content);
```

`PanelGap` controls padding inside the panel (separate from `LayoutGap` between slots):

| Value | Padding |
|---|---|
| `PanelGap.SMALL` | Compact — data tables, dense forms |
| `PanelGap.MEDIUM` | Default |
| `PanelGap.LARGE` | Spacious — KPI tiles, feature cards |
| `PanelGap.EXTRA_LARGE` | Hero cards |

---

## Chart Panels — Height

Use `.withHeight(px)` on `ChartBuilder` to set the chart's pixel height. No special panel sizing is needed.

```typescript
const chart = new ChartBuilder<Point>()
    .withData(data$)
    .withCategoryField('month')
    .withHeight(400);   // explicit height in px

chart.addAreaChart('revenue').withLabel('Revenue');

const panel = new PanelBuilder()
    .withGap(PanelGap.LARGE)
    .withContent(chart);
```

Omit `.withHeight()` (default `0`) to have the chart fill its container's height via `100%`.

---

## Reactive Classes

`.withClass(observable<string>)` on both `LayoutBuilder` and `PanelBuilder` lets classes respond to state:

```typescript
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

const isCompact$ = new BehaviorSubject(false);
const cls$ = isCompact$.pipe(map(c => c ? 'p-2' : 'p-6'));

const panel = new PanelBuilder()
    .withClass(cls$)
    .withContent(content);
```
