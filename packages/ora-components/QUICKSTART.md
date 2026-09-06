# Quickstart

Everything here is a compiling snippet checked against the built `.d.ts` files
(`npm run build && node scripts/check-quickstart.mjs`). Import from `@tdq/ora-components`
unless a sub-path is shown.

## Install

```bash
npm install @tdq/ora-components rxjs
```

Import the stylesheet once, at your app's entry point:

```ts
import '@tdq/ora-components/style.css';
```

Theming is CSS variables plus `withClass` — there is no Tailwind preset to install. Rebrand
globally by redeclaring `--md-sys-color-*`/`--ora-*` tokens in your own unlayered app CSS on
`:root` and `[data-theme="dark"]`; because app CSS is unlayered, it outranks the library's
`@layer ora-components` with no `!important`. Restyle one instance by passing your own class
through `withClass` and scoping token overrides — or your own Tailwind utilities — to it. See
[Theming](#theming) below for the full contract. Consumers keep their own Tailwind config; the
library only ships its component CSS.

## Builder grammar

Every component is a class with `with*`/`add*`/`as*` configuration methods that return
`this`, finished by `build()`. Configure fully, call `build()` last, then **never** touch the
returned `HTMLElement` (`classList.add`, `style.x =`, `appendChild`, `setAttribute`) — every
visual property has a builder method instead.

```ts
import { ButtonBuilder, Icons } from '@tdq/ora-components';
import { of } from 'rxjs';

function save(): void {}

const saveButton = new ButtonBuilder()
    .withCaption(of('Save'))
    .asGlass()
    .withIcon(Icons.CHECKMARK)
    .withClick(save)
    .build();
```

## Layout: `SlotSize.GROW` vs `FULL`

`FULL` (`basis-full`) gives every such slot a fixed, equal share of the main axis. `GROW`
(`flex-1` + `min-h-0`/`min-w-0`) takes whatever space is left after fixed/`FIT` siblings and
lets a scrollable child (a grid, a chart, a router outlet) shrink instead of overflowing the
page. Use `GROW` for the one slot that should absorb the rest of the layout. Make the slot (or
layout) that scrolls with `asScrollable()` instead of an `overflow-y-auto` class: it reserves a
`--ora-shadow-bleed` gutter so card shadows and focus rings are not clipped at the edge.

```ts
import { LayoutBuilder, LayoutGap, SlotSize, LabelBuilder } from '@tdq/ora-components';
import { of } from 'rxjs';

const page = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);
page.addSlot().withSize(SlotSize.FIT).withContent(new LabelBuilder().withCaption(of('Header')));
page.addSlot().withSize(SlotSize.GROW).asScrollable().withContent(new LabelBuilder().withCaption(of('Content fills the rest and scrolls')));
```

## App shell: Router + SideBar

```ts
import { RouterBuilder, SideBarBuilder, LayoutBuilder, LayoutGap, SlotSize, Icons } from '@tdq/ora-components';
import { of } from 'rxjs';

const router = new RouterBuilder().withFallback('/ledger');
router.addRoute()
    .withPattern('/ledger')
    .withContent(() => ({ build: () => document.createElement('section') }));

const sidebar = new SideBarBuilder().withRouter(router).withCaption(of('Northwind')).asGlass();
sidebar.addItem().withIcon(Icons.MENU).withCaption(of('Ledger')).withHref('/ledger');

const shell = new LayoutBuilder().asHorizontal().withGap(LayoutGap.NONE);
shell.addSlot().withSize(SlotSize.FIT).withContent(sidebar);   // rail sizes itself via CSS
shell.addSlot().withSize(SlotSize.GROW).withContent(router);   // outlet absorbs the rest

document.body.appendChild(shell.build());
```

## Grid

Columns are typed against the item shape; the grid sizes itself to `height: 100%` of its
**parent** unless you call `withHeight()`/`withAutoHeight()` — give it a parent with a real
height (a `GROW` slot, or an explicit CSS height), not a `FULL`/auto-height container.

```ts
import { GridBuilder } from '@tdq/ora-components';
import { of } from 'rxjs';

interface Invoice { id: string; customer: string; amount: number }

const grid = new GridBuilder<Invoice>();
const columns = grid.withColumns();
columns.addTextColumn('customer').withHeader('Customer').asSortable();
columns.addNumberColumn('amount').withHeader('Amount').withWidth('120px');
grid.withItems(of<Invoice[]>([{ id: '1', customer: 'Acme', amount: 500 }]));

document.body.appendChild(grid.build());
```

## Form fields

```ts
import { TextFieldBuilder, MoneyFieldBuilder } from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';

const name$ = new BehaviorSubject('');
const amount$ = new BehaviorSubject<{ amount: number; currencyId: string } | null>({ amount: 1250.5, currencyId: 'USD' });

const nameField = new TextFieldBuilder().withLabel(of('Customer')).withValue(name$).build();

// MoneyField always groups thousands (renders "1,250.50") — not configurable per instance,
// so the same amount reads identically here, in a grid MoneyColumn and in MoneyKPICard.
const amountField = new MoneyFieldBuilder()
    .withLabel(of('Amount'))
    .withCurrencies(['USD', 'EUR'])
    .withValue(amount$)
    .build();
```

## Dialog: actions go in the toolbar

Never build a button row in the dialog's content — actions belong in `withToolbar()`, which
stays pinned under scrolling content.

```ts
import { DialogBuilder, LabelBuilder } from '@tdq/ora-components';
import { of } from 'rxjs';

const dialog = new DialogBuilder()
    .withCaption(of('New entry'))
    .withContent(new LabelBuilder().withCaption(of('Form goes here')));
dialog.withToolbar().addSecondaryButton().withCaption(of('Cancel')).withClick(() => dialog.close());
dialog.withToolbar().withPrimaryButton().withCaption(of('Save')).withClick(() => dialog.close());
dialog.show(); // builds + appends to document.body + showModal() — call this last
```

## Chart

`withFormat` on an axis formats both its ticks and the tooltip values of every series bound
to it; a series' own `withFormat` overrides the tooltip only. Non-stacked bar series on one
category split the group width into slots; `asStacked()` bars accumulate from a shared
baseline instead.

```ts
import { ChartBuilder } from '@tdq/ora-components';
import { of } from 'rxjs';

interface Sample { month: string; revenue: number; cost: number }
const rows: Sample[] = [
    { month: 'Jan', revenue: 12000, cost: 8000 },
    { month: 'Feb', revenue: 15000, cost: 9000 },
];

const chart = new ChartBuilder<Sample>().withData(of(rows)).withCategoryField('month');
chart.withYAxis().withFormat('currency:EUR');
chart.addBarChart('revenue').withLabel('Revenue').asStacked();
chart.addBarChart('cost').withLabel('Cost').asStacked();
document.body.appendChild(chart.build());

// Compact KPI-tile mode: hides axes/legend/tooltip, defaults height to 32px.
const spark = new ChartBuilder<Sample>().withData(of(rows)).withCategoryField('month').asSparkline();
spark.addLineChart('revenue');
document.body.appendChild(spark.build());
```

## `withTestId`

Every main builder exposes `withTestId(id: string)`, applied to that builder's one primary
element inside `build()` — a static string, never `Observable`. A sub-part reachable only
through another builder (a dialog's toolbar button, a form's field) gets its id on *that*
builder, not the parent:

```ts
import { DialogBuilder } from '@tdq/ora-components';
import { of } from 'rxjs';

const confirmDialog = new DialogBuilder().withCaption(of('Delete invoice?')).withTestId('delete-dialog');
confirmDialog.withToolbar().withPrimaryButton().withCaption(of('Delete')).withTestId('confirm-delete');
```

## Theming

Global rebrand is CSS only — redeclare `--md-sys-color-*`/`--ora-*` tokens in your own
(unlayered) stylesheet; there is no JS theme API beyond `ThemeManager`'s `data-theme`
attribute. Per-instance theming is `withClass()` plus scoped token overrides — the only
per-component hook:

```ts
import { GridBuilder } from '@tdq/ora-components';
import { of } from 'rxjs';

interface Row { id: string }
const ledgerGrid = new GridBuilder<Row>().withClass(of('ledger-grid'));
```

```css
:root { --md-sys-color-primary: #0F766E; }
.ledger-grid { --ora-grid-header-bg: color-mix(in srgb, var(--md-sys-color-primary) 8%, transparent); }
```

## Teardown

Components built through this library tear themselves down: `registerDestroy`/the internal
lifecycle boundary unsubscribes every stream a builder itself subscribed to (`withItems`,
`withData`, etc.) the moment the built element leaves the DOM. **Never** manually
`.subscribe()`/`.unsubscribe()` a builder's own inputs. The one thing you still own: any
`Subject`/`BehaviorSubject` **you** created and handed to a builder (`chatOpen$`, a grid's
`withRowsSelected` subject) — complete it yourself when your app tears down, since the
builder never completes a subject it didn't create.
