# Story Helpers

The `packages/stories/src/story-helpers/` module provides reusable utilities
for writing Aura Storybook stories. Import from the barrel file:

```ts
import { createActionLog, createButton, createControlStrip, createGlassBackdrop, GLASS_GRADIENTS } from './story-helpers';
import { generateUsers, generateProducts } from './story-helpers/data-generators';
```

## Core Principle: Determinism

All helpers produce **deterministic output** — no `Math.random()` at module
scope. This ensures:

- **Stable visual regression snapshots** — the same story always renders the
  same data.
- **No flaky Chromatic diffs** — repeated builds produce pixel-identical
  output.
- **Reproducible demos** — viewers see the same data every time.

Data generators use index-based pseudo-random hashes (`detent()`). Glass
backdrop circle positions use offset-based determinism.

## action-log.ts

### `createActionLog()`

Creates a styled action log panel for interactive stories. Returns an object
with the DOM `element` and a `log()` function.

```ts
const { element: actionLog, log } = createActionLog();

// Wire to button clicks
button.onClick(() => log('Export clicked'));

// Append the log element to your layout
layout.addSlot().withContent({ build: () => actionLog });
```

**Behaviour:**
- Entries are **prepended** (newest first).
- Each entry shows a timestamp `[HH:MM:SS]` and the message.
- The initial placeholder ("Actions appear here...") is removed on first log.
- Styled with a monospace font, bordered container, scrollable at `max-h-32`.
- Classes: `bg-surface-container-low rounded border border-outline/10 text-xs font-mono`.

## data-generators.ts

### Deterministic generation pattern

All generators accept a `count` parameter and return arrays of typed objects.
Every field is derived from the item index using `detent()` helpers, so two
calls with the same `count` produce byte-identical data.

```ts
function detent(index: number, salt: number = 0): number {
    const x = ((index + 1) * 9301 + salt * 49297) % 233280;
    return x / 233280;
}
```

### Available generators

| Function | Returns | Use case |
|----------|---------|----------|
| `generateUsers(count)` | `User[]` | Grid demos with text, number, date, money, boolean, progress columns |
| `generateProducts(count)` | `Product[]` | Basic grid/list demos with money and stock fields |
| `generateGroupedProducts(count)` | `GroupedProduct[]` | Grid‑grouping demonstrations with category/subcategory hierarchy |
| `generateFullCoverageData(count)` | `FullCoverageItem[]` | Grid "full coverage" stories exercising every column type |

### Exported types

```ts
export type { User, Product, GroupedProduct, FullCoverageItem };
```

Import types directly for use in story-local interfaces when you don't need the
full generator:

```ts
import type { Product } from './story-helpers/data-generators';
```

### Anti-patterns

- **Do NOT** use `Math.random()` at module scope. This causes data to change on
  every hot reload or build, breaking visual regression testing.
- **Do NOT** instantiate `BehaviorSubject`s at module scope that depend on
  `Math.random()` — either use deterministic generators or move
  randomness inside a story function.
- **Do NOT** duplicate generator logic in individual stories. If your story
  needs custom data shapes, extend the generators in `data-generators.ts`
  rather than copy-pasting.

## demo-controls.ts

### `createButton(label, onClick, style?)`

Factory for inline demo control buttons. Returns a `ButtonBuilder` (not yet
built — call `.build()` on it).

```ts
const exportBtn = createButton(
    'Export',
    () => log('Export report clicked'),
    ButtonStyle.OUTLINED,
).build();
```

- Defaults to `ButtonStyle.TONAL` if no style is provided.
- Uses `of(label)` for the caption — non-reactive, static label.
- Intended for one-off control buttons, not for the main component under test.

### `createControlStrip(buttons)`

Wraps an array of already-built button elements in a flex container with
standard gap and margin so they appear as a cohesive control strip.

```ts
const strip = createControlStrip([
    createButton('Add', handleAdd).build(),
    createButton('Remove', handleRemove, ButtonStyle.OUTLINED).build(),
]);
layout.addSlot().withContent({ build: () => strip });
```

- Classes: `flex flex-wrap gap-2 mb-4`.
- Returns a plain `<div>`, not a `ComponentBuilder` — wrap with
  `{ build: () => strip }` when adding to a layout slot.

## glass-backdrop.ts

### `createGlassBackdrop(gradientClasses?, circleCount?, opacity?)`

Creates a glass-effect backdrop container for stories that need a decorative
gradient background. Returns a `<div>` with animated blur circles.

```ts
const backdrop = createGlassBackdrop(
    GLASS_GRADIENTS.INDIGO_PINK, // 'from-indigo-500 via-purple-500 to-pink-500'
    6,                           // 6 blur circles
    'opacity-50',                // 50% opacity on the gradient
);

// Wrap your component with the backdrop
const wrapper = document.createElement('div');
wrapper.className = 'relative min-h-screen';
wrapper.appendChild(backdrop);
wrapper.appendChild(myComponent);
return wrapper;
```

**Parameters:**
- `gradientClasses` — Tailwind gradient utility classes (default:
  `GLASS_GRADIENTS.INDIGO_PINK`).
- `circleCount` — Number of decorative blur circles (default: `6`).
- `opacity` — Opacity class for the gradient overlay (default: `'opacity-50'`).

### `GLASS_GRADIENTS`

Predefined gradient presets:

| Constant | Value |
|----------|-------|
| `INDIGO_PINK` | `'from-indigo-500 via-purple-500 to-pink-500'` |
| `BLUE_PURPLE` | `'from-blue-500 to-purple-600'` |
| `BLUE_TEAL` | `'from-blue-600 via-teal-500 to-emerald-500'` |

### Deterministic circles

Circle positions, sizes, colors, and animation delays are all derived from
offset-based deterministic offsets. No `Math.random()` — stable across renders:

- Size: `deter(i * 3) * 150 + 100` (100–250px)
- Left position: `deter(i * 3 + 1) * 100%`
- Top position: `deter(i * 3 + 2) * 100%`
- Color: cycled from `CIRCLE_COLORS` array by index
- Animation delay/duration: deterministic to avoid all circles pulsing in sync

## app-shell.ts

The shared application-shell scaffold for the `SideBar` and `ChatPanel` stories: both need the
same rail + content + docked-assistant composition and the same nav icon set, so it lives here
once instead of being copy-pasted into two story files. Everything is deterministic — fixed
copy, fixed figures, a per-shell counter for message ids.

| Export | Kind | Purpose |
|--------|------|---------|
| `createAppShell()` | `(): HTMLElement` | The full shell: `SideBarBuilder` rail + page content with a `ChatTriggerBuilder` in its header + a docked `ChatPanelBuilder`, composed in one horizontal `LayoutBuilder`. The trigger and the panel share one `BehaviorSubject<boolean>`; the shell completes the subjects it owns in `registerDestroy`. |
| `createShell(...children)` | `(...children: HTMLElement[]): HTMLElement` | A height-constrained, rounded flex row to drop a rail (and friends) into. `.ora-sidebar` and `.ora-chat-panel-wrapper` are `height: 100%` and would collapse to nothing in an auto-height canvas. |
| `addNavRows(sidebar, rows?)` | `(sidebar: SideBarBuilder, rows?) => void` | Appends `[icon, caption]` pairs as inert demo rows. Defaults to `NAV_ROWS`. |
| `NAV_ICONS` | `Record<string, string>` | Inline 24×24 stroke SVGs for the accounting nav (`DASHBOARD`, `LEDGER`, `INVOICES`, `PAYROLL`, `REPORTS`, `SETTINGS`, `SIGN_OUT`). The library's `Icons` covers chrome only, and adding domain glyphs to it is out of scope for a story. |
| `NAV_ROWS` | `readonly (readonly [icon, caption])[]` | The five nav rows the sidebar and shell stories share. |
| `SHELL_HEIGHT_PX` | `number` (560) | Shell height — tall enough to show the nav, a divider and the footer. |

## Usage in LayoutBuilder slots

When adding helper-created elements to LayoutBuilder slots, wrap plain
`HTMLElement` returns with a build-object pattern:

```ts
// Correct — wraps the raw element
layout.addSlot().withContent({ build: () => actionLog });

// Also correct — createControlStrip returns HTMLDivElement
layout.addSlot().withContent({ build: () => createControlStrip([btn1, btn2]) });
```
