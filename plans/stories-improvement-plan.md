# Stories Improvement Plan

**Scope:** `packages/stories/src/` — all existing story and MDX files  
**Date:** 2026-05-17  
**Goal:** Transform the Storybook from a developer testing sandbox into a credible component catalogue — legible system state, realistic enterprise scenarios, consistent structure, and zero `alert()` calls.

---

## Executive Summary

The current stories provide solid basic coverage but fail on four dimensions that matter for an enterprise component library:

1. **Missing states** — loading, forbidden, and partial states are absent; components appear only in their happy path.
2. **Poor interaction feedback** — `alert()` replaces real action logging in a dozen stories; demo controls use raw DOM instead of the builder API.
3. **Structural inconsistency** — mix of plain function exports, `StoryObj`, and MDX; viewport is not configured for desktop; stories don't fill the preview area.
4. **Thin documentation** — ThemeManager has no doc; no component lists the CSS variables it consumes; ~40% of components lack MDX docs entirely.

The plan is organized into eight priority tiers. P1–P3 fix correctness; P4–P5 fix coverage; P6–P8 add depth.

---

## Inventory: Current State

| File | Stories | MDX Docs | Issues |
|------|---------|---------|--------|
| button.stories.ts | 5 | ✓ (good) | `DynamicStyle` uses raw `<select>`; no Styling section in MDX |
| chart.stories.ts | 8 | ✗ | No empty/loading state, no date axis |
| checkbox.stories.ts | ? | ✓ | No indeterminate state |
| combobox.stories.ts | ? | ✓ | No async options, no group headers |
| date-picker.stories.ts | ? | ✓ | No min/max, no range |
| dialog.stories.ts | 5 | ✗ | `alert()` in ShowDialog; raw DOM controls |
| form-builder.stories.ts | 2 | ✓ | Thin — only Registration + Glass |
| form-examples.stories.ts | 5 | ✗ | Good quality; missing wizard pattern |
| grid.stories.ts | 13 | ✗ | `alert()` in 3 stories; no column chooser; no row click (not supported) |
| grid-grouping.stories.ts | 1 | ✗ | Raw DOM buttons, not ButtonBuilder |
| grid-pivot.stories.ts | 3 | ✗ | Inconsistent story format (StoryObj) |
| label.stories.ts | ? | ✓ | — |
| layout-builder.stories.ts | 6 | ✓ | Placeholder content hides real use |
| listbox.stories.ts | ? | ✓ | — |
| money-field.stories.ts | ? | ✓ | No min/max story |
| multi-select-list.stories.ts | ? | ✓ | — |
| number-field.stories.ts | ? | ✓ | No step/constraint story |
| panel.stories.ts | 3 | ✓ | Placeholder content; no real use case |
| tabs.stories.ts | 4 | ✗ | Minimal content in tab bodies |
| text-field.stories.ts | 7 | ✓ | States demo uses raw checkbox; no Styling section |
| theme-manager.stories.ts | 0 | ✗ | **Empty — convert to MDX documentation** |
| product-management.stories.ts | 1 | ✗ | Good; `confirm()` for delete |
| **toolbar.stories.ts** | — | ✓ doc exists | **File does not exist** |

---

## P1 — Fix Critical Gaps (Broken or Missing)

### 1.1 Create `toolbar.stories.ts`

The MDX documentation file exists (`toolbar.docs.mdx`) but no story file exists. Create `toolbar.stories.ts` with:

- **`Default`** — a toolbar with a primary button and two secondary buttons
- **`WithSearch`** — a toolbar containing a text field acting as a search bar
- **`Reactive`** — primary button caption updates reactively based on a selection count `BehaviorSubject`
- **`Disabled`** — all buttons disabled via observable; label reads "Read-only view"

### 1.2 Convert `theme-manager` to a MDX documentation page

Delete `theme-manager.stories.ts` and create `theming.docs.mdx` — a comprehensive theming guide (not a story file). This document is the authoritative reference for anyone customising the design system. It belongs under the `System/` category.

Structure of `theming.docs.mdx`:

#### Overview section
Explain that components are styled through **CSS custom properties** following the Material Design 3 token system. No component-specific CSS classes need to be overridden — all visual customisation happens by redefining tokens on `:root` or a scoped selector.

#### Theme switching section
Document the `ThemeManager` singleton API:

```typescript
import { themeManager } from '@tdq/ora-components';

// Switch theme programmatically
themeManager.setTheme('light');   // force light
themeManager.setTheme('dark');    // force dark
themeManager.setTheme('system'); // follow OS preference (default)

// React to changes
themeManager.theme$.subscribe(theme => console.log('theme changed to', theme));

// Read current value
const current = themeManager.getTheme();
```

Explain that internally the manager toggles `[data-theme="light"]` / `[data-theme="dark"]` on `document.documentElement` and persists the choice in `localStorage`.

#### Token reference table
List all MD3 tokens defined in `index.css` grouped by role:

| Token | Light default | Dark default | Role |
|---|---|---|---|
| `--md-sys-color-primary` | `#0F52BA` | `#D0BCFF` | Primary interactive colour |
| `--md-sys-color-on-primary` | `#FFFFFF` | `#381E72` | Text/icons on primary |
| `--md-sys-color-primary-container` | `#D1E1F8` | `#4F378B` | Container tinted with primary |
| `--md-sys-color-on-primary-container` | `#001B3D` | `#EADDFF` | Content inside primary container |
| `--md-sys-color-secondary` | `#475569` | `#CCC2DC` | Secondary interactive colour |
| `--md-sys-color-secondary-container` | `#F1F5F9` | `#4A4458` | Container tinted with secondary |
| `--md-sys-color-tertiary` | `#0891B2` | `#EFB8C8` | Tertiary accent |
| `--md-sys-color-surface` | `#FFFFFF` | `#141218` | Page / component background |
| `--md-sys-color-surface-variant` | `#E2E8F0` | `#49454F` | Slightly elevated surface |
| `--md-sys-color-surface-container-low` | `#F8FAFC` | `#1D1B20` | Subtle container |
| `--md-sys-color-on-surface` | `#0F172A` | `#E6E1E5` | Primary text |
| `--md-sys-color-on-surface-variant` | `#334155` | `#CAC4D0` | Secondary text / labels |
| `--md-sys-color-outline` | `#94A3B8` | `#938F99` | Borders, dividers |
| `--md-sys-color-error` | `#DC2626` | `#F2B8B5` | Validation errors |
| `--md-sys-shape-small` | `4px` | — | Border radius small (inputs, buttons) |
| `--md-sys-shape-medium` | `6px` | — | Border radius medium (cards) |
| `--md-sys-shape-large` | `12px` | — | Border radius large (panels, dialogs) |
| `--md-sys-spacing-1..8` | `4px…48px` | — | Spacing scale (4px grid) |

#### Custom theme section
Show how to define a brand theme by overriding the token subset:

```css
/* brand-theme.css — apply to :root or a scoped selector */
:root {
    --md-sys-color-primary: #B45309;          /* amber-700 */
    --md-sys-color-on-primary: #FFFFFF;
    --md-sys-color-primary-container: #FDE68A; /* amber-200 */
    --md-sys-color-on-primary-container: #451A03;
    --md-sys-color-secondary: #065F46;
    --md-sys-color-secondary-container: #D1FAE5;
}
```

Then import this file after `index.css` in the application entry point. Components will pick up the overrides immediately with no code changes.

For scoped theming (e.g., a white-labelled sub-section):

```html
<div class="branded-section">
  <!-- all ora-components inside inherit the scoped tokens -->
</div>

<style>
.branded-section {
    --md-sys-color-primary: #7C3AED;
    --md-sys-color-on-primary: #FFFFFF;
}
</style>
```

#### Elevation & shape customisation section
Show overriding elevation shadows and border radii for a flatter or rounder look.

#### Live demo
Embed a single Canvas that references an existing story (e.g., a form) — readers can switch Light/Dark from the Storybook toolbar to see the tokens in effect. No standalone story needed.

### 1.3 Replace all `alert()` / `confirm()` calls

Every occurrence where user feedback is demonstrated via browser dialogs must be replaced with an in-story action log panel. Extract into a shared helper `src/story-helpers/action-log.ts`:

```typescript
export const createActionLog = (): { element: HTMLElement; log: (msg: string) => void } => {
    const el = document.createElement('div');
    el.className = 'mt-4 p-3 bg-surface-container-low rounded border border-outline/10 text-xs font-mono max-h-32 overflow-y-auto';
    el.innerHTML = '<div class="opacity-40 italic">Actions appear here...</div>';
    return {
        element: el,
        log: (msg: string) => {
            const entry = document.createElement('div');
            entry.className = 'py-0.5 border-b border-outline/5 last:border-0';
            entry.textContent = `${new Date().toLocaleTimeString()} — ${msg}`;
            el.querySelector('.italic')?.remove();
            el.prepend(entry);
        }
    };
};
```

Files to update: `grid.stories.ts` (WithActions, WithToolbar), `dialog.stories.ts`, `product-management.stories.ts` (deleteProduct confirm).

---

## P2 — Fix Structural Problems

### 2.1 Fix stories not filling the preview area

**Problem:** The Storybook manager theme sets `appPreviewBg: '#141218'`. Stories that return elements without explicit width/height leave the dark chrome showing around them, making the preview look broken.

**Fix:** Update the global decorator in `preview.ts` to give every story a `min-h-screen bg-surface` wrapper so the surface color extends to all edges:

```typescript
// .storybook/preview.ts
export const decorators = [
    (story: () => HTMLElement, context) => {
        applyTheme(context.globals.theme as ThemeValue);
        const wrapper = document.createElement('div');
        wrapper.className = 'min-h-screen bg-surface text-on-surface p-6';
        wrapper.appendChild(story());
        return wrapper;
    },
];
```

Stories that need full-bleed control (glass backgrounds, dashboard layouts) override this by setting `parameters.layout: 'fullscreen'` — in those cases the decorator should not add padding or background. Add a check:

```typescript
const isFullscreen = context.parameters.layout === 'fullscreen';
wrapper.className = isFullscreen
    ? 'min-h-screen'
    : 'min-h-screen bg-surface text-on-surface p-6';
```

This replaces the dozens of manual `container.classList.add('p-4', 'bg-surface')` calls scattered across stories.

### 2.2 Configure desktop viewports

These components target desktop applications. Remove the default Storybook mobile/tablet presets. Configure viewport addon with desktop breakpoints only in `preview.ts`:

```typescript
export const parameters = {
    viewport: {
        viewports: {
            desktop1280: {
                name: 'Desktop 1280',
                styles: { width: '1280px', height: '800px' },
                type: 'desktop',
            },
            desktop1440: {
                name: 'Desktop 1440',
                styles: { width: '1440px', height: '900px' },
                type: 'desktop',
            },
            desktop1920: {
                name: 'Full HD',
                styles: { width: '1920px', height: '1080px' },
                type: 'desktop',
            },
            desktopWide: {
                name: 'Ultrawide 2560',
                styles: { width: '2560px', height: '1080px' },
                type: 'desktop',
            },
        },
        defaultViewport: 'desktop1440',
    },
};
```

Also add `@storybook/addon-viewport` to `main.ts` addons array.

### 2.3 Standardize story format

All stories should use the same export pattern. The pivot stories use `StoryObj`; the rest use plain functions. Adopt **plain function exports** uniformly (they work cleanly with `@storybook/html-vite` and match the existing majority). Convert `grid-pivot.stories.ts` and `tabs.stories.ts` to plain function exports.

```typescript
// Target format
export default { title: 'Components/Grid/Pivot' };

export const BasicPivot = () => {
    const builder = new GridBuilder<any>()...
    return builder.build();
};
```

### 2.4 Create `src/story-helpers/` module

Extract repeated patterns into a shared helper module:

- `action-log.ts` — the action log widget (see P1.3)
- `data-generators.ts` — all mock data generators (currently duplicated across grid/form stories); use deterministic index-based values, not `Math.random()` at module level
- `demo-controls.ts` — wraps ButtonBuilder in a consistent horizontal strip, so demos don't mix raw DOM and builder-constructed buttons
- `glass-backdrop.ts` — the gradient + animated blur-circle background reused across 6 stories; extract into one helper function

### 2.5 Add missing Storybook addons

Update `.storybook/main.ts`:

```typescript
addons: [
    '@storybook/addon-links',
    '@storybook/addon-docs',
    '@storybook/addon-viewport',   // add — for desktop viewport presets
],
```

Note: the `backgrounds` addon is intentionally omitted. Background switching is already handled by the Light/Dark/System global toolbar defined in `preview.ts` and the `bg-surface` decorator wrapper. A separate backgrounds addon would create conflicting controls.

### 2.6 Add missing MDX docs

Create the following documentation files following the quality bar of `button.docs.mdx`. Each file **must** include a `## Styling` section (see P3):

| File to create | Key sections |
|---|---|
| `chart.docs.mdx` | Builder API, chart types, axis config, reactive data, glass effect, downsampling, Styling |
| `dialog.docs.mdx` | Builder API, sizes enum, scrollable variant, glass, nested composition, Styling |
| `grid.docs.mdx` | Builder API, column types, actions (not row click), toolbar, sorting, grouping, pivot, editing, glass, Styling |
| `tabs.docs.mdx` | Builder API, tab visibility, glass effect, scrollable, Styling |
| `panel.docs.mdx` | Builder API, gap enum, glass effect, composition patterns, Styling |

---

## P3 — Add Styling Section to Every MDX Doc

Every component MDX file must include a `## Styling` section that lists the CSS custom properties the component reads. This is the primary customisation surface for teams that want to restyle without forking source.

### Format for Styling sections

```markdown
## Styling

All visual properties are driven by MD3 design tokens. Override them on `:root` or a
scoped parent to restyle this component without touching source.

| CSS variable | Role |
|---|---|
| `--md-sys-color-primary` | Background of `FILLED` and icon/text colour of other styles |
| `--md-sys-color-on-primary` | Label text colour on `FILLED` background |
| `--md-sys-color-secondary-container` | Background of `TONAL` style |
| `--md-sys-color-on-secondary-container` | Label text colour on `TONAL` |
| `--md-sys-color-outline` | Border colour of `OUTLINED` style |
| `--md-sys-color-surface` | Background of `ELEVATED` style |
| `--md-sys-shape-small` | Border radius |
| `--md-sys-spacing-3` | Vertical padding (`py`) |
| `--md-sys-spacing-5` | Horizontal padding (`px`) |

See the [Theming guide](../System/Theming) for token reference and custom theme examples.
```

### Tokens per component (audit)

| Component | Key tokens consumed |
|---|---|
| **Button** | `--md-sys-color-primary`, `--md-sys-color-on-primary`, `--md-sys-color-secondary-container`, `--md-sys-color-outline`, `--md-sys-color-surface`, `--md-sys-shape-small`, spacing |
| **TextField / NumberField / MoneyField** | `--md-sys-color-surface-variant`, `--md-sys-color-on-surface-variant`, `--md-sys-color-outline`, `--md-sys-color-primary`, `--md-sys-color-error`, `--md-sys-shape-small` |
| **Grid** | `--md-sys-color-surface`, `--md-sys-color-surface-container-low`, `--md-sys-color-surface-variant`, `--md-sys-color-on-surface-variant`, `--md-sys-color-outline`, `--md-sys-color-primary`, `--md-sys-shape-large` |
| **Chart** | `--md-sys-color-primary`, `--md-sys-color-secondary`, `--md-sys-color-tertiary`, `--md-sys-color-surface`, `--md-sys-color-on-surface-variant` |
| **Dialog** | `--md-sys-color-surface`, `--md-sys-color-on-surface`, `--md-sys-color-outline`, `--md-sys-shape-large`, elevation tokens |
| **Tabs** | `--md-sys-color-primary`, `--md-sys-color-surface`, `--md-sys-color-on-surface-variant`, `--md-sys-color-outline` |
| **Panel** | `--md-sys-color-surface`, `--md-sys-color-outline`, `--md-sys-shape-large`, spacing |
| **ComboBox / Listbox** | `--md-sys-color-surface`, `--md-sys-color-surface-variant`, `--md-sys-color-primary`, `--md-sys-color-outline`, `--md-sys-shape-small/medium` |

Add the Styling section to all existing MDX docs (button, checkbox, combobox, date-picker, form, label, layout-builder, listbox, money-field, multi-select-list, number-field, panel, text-field, toolbar) and include it in all newly created docs.

---

## P4 — Standardize State Coverage

Every stateful component must cover these states. Where a state is not applicable, add a brief comment explaining why.

| State | Implementation pattern |
|---|---|
| **Default / Loaded** | Already exists in most cases |
| **Empty** | `of([])` to items; show the empty-state UI |
| **Loading / Async** | `new BehaviorSubject([])`, emit data after `setTimeout(1500)` |
| **Disabled / Forbidden** | `of(false)` to `withEnabled`; visible "Read-only" banner |
| **Error** | Error observable bound; no interaction needed |

### Specific additions needed

**Grid:**
- Add `Loading` story: `BehaviorSubject` emits after 1.5 s; grid shows a skeleton state in the interim
- Add `Forbidden` story: grid renders with columns but all actions hidden; a `LabelBuilder` banner reads "You have view-only access to this data"

**Chart:**
- Add `Empty` story: `of([])` data — shows the no-data placeholder
- Add `Loading` story: data arrives after delay

**Form:**
- Add `GlobalError` story: `withError(of('Submission failed: duplicate email'))` — shows the top-level error banner

**ComboBox / Listbox:**
- Add `Loading` story: options observable emits after 800 ms; loading indicator visible during delay

---

## P5 — Grid Story Improvements

### 5.1 Column chooser demo

Add `ColumnVisibility` story: a grid with 8 columns and a toolbar above with CheckboxBuilder controls per column, each bound to a `withVisible(visible$)`. This demonstrates the "column chooser" pattern at the application layer.

### 5.2 Actions as the interaction model (not row click)

**Grid does not support row click.** The correct interaction primitive is row **actions** — icon buttons that appear in a sticky right column on hover. All stories that need per-row interaction must use `grid.withActions()`, not a click handler on the row.

The `WithActions` story should be updated to use an action log panel (replacing `alert()`) showing which action was triggered on which record.

### 5.3 Server-side pagination simulation

Add `ServerPagination` story:
- `BehaviorSubject<number>` tracks current page
- Grid receives a derived observable slicing the data array for that page
- ButtonBuilder Previous / Next buttons update the page subject
- A `LabelBuilder` shows "Showing 1–25 of 200"
- Grid height stays fixed; only data changes

### 5.4 Inline editing feedback improvement

Improve the `Editable` story's action log: display old value → new value using strikethrough for old and normal weight for new. Makes the reactive contract immediately obvious.

### 5.5 Normalize `grid-pivot.stories.ts`

Convert `BasicPivot`, `MultiValuePivot`, and `RowGroupingPivot` from `StoryObj` format to plain function exports. Add a comment above each story describing the pivot configuration. Keep the title `Components/Grid/Pivot`.

### 5.6 Fix raw DOM in `grid-grouping.stories.ts`

Replace the three raw `<button>` elements in `MultiLevelGrouping` with `ButtonBuilder` instances.

---

## P6 — Field & Form Story Improvements

### 6.1 Checkbox — indeterminate state

Add `Indeterminate` story: a "Select all" checkbox whose state is derived from a list of child checkboxes. Partial selection → indeterminate. Demonstrates the three-state pattern common in grid-adjacent filter UIs.

### 6.2 ComboBox — async options

Add `AsyncOptions` story: options observable emits after 800 ms. Loading indicator is visible during the delay. After load, user can select normally.

### 6.3 DatePicker — constraints

Add `WithConstraints` story: `minDate` and `maxDate` are set. Dates outside range are rendered disabled in the calendar. Demonstrates the booking-style validation contract.

### 6.4 NumberField / MoneyField — bounds

Add `StepAndBounds` story: number field with `min=0`, `max=100`, `step=5`. Controls respect bounds. Shows field-level prevention of invalid entries.

### 6.5 Multi-step form (wizard)

Add `MultiStepWizard` story to `form-examples.stories.ts`:
- Three steps: Personal → Address → Confirm
- Each step is a `FormBuilder` inside a `PanelBuilder`
- Back / Next / Submit buttons disable when the current step has validation errors
- A step indicator (three labeled nodes) shows current position
- Final step shows a read-only summary of all values before submission

---

## P7 — New Real-World Examples

### 7.1 Dashboard layout (`dashboard.stories.ts`)

Full-screen enterprise dashboard composing Grid, Chart, Toolbar, Panel, and Layout:

```
┌─────────────────────────────────────────────────────────┐
│  Toolbar: "Analytics Dashboard"   [Export] [Date Range] │
├──────────┬──────────┬──────────┬───────────────────────-│
│ KPI Card │ KPI Card │ KPI Card │ KPI Card               │
│ Revenue  │ Orders   │ Users    │ Conversion             │
├──────────┴──────────┴──────────┴────────────────────────┤
│  Area Chart: Revenue over time (6 months)               │
├─────────────────────────┬──────────────────────────────-│
│  Bar Chart: By category │  Grid: Top products (sorted)  │
└─────────────────────────┴────────────────────────────────┘
```

All data is reactive. KPI cards derive from the same dataset as the chart and grid. Uses `parameters.layout: 'fullscreen'`.

### 7.2 Audit log view (`audit-log.stories.ts`)

Immutable scrollable grid showing a change history:

- Columns: Timestamp, User, Entity, Action (enum: Created / Updated / Deleted), Field, Old Value, New Value
- No edit/delete actions — read-only, with a tooltip on the action column header: "This log is immutable"
- Color-coded Action column via `addCustomColumn`: Created = green badge, Updated = blue badge, Deleted = red badge
- 500 rows, sortable by timestamp
- Export button in toolbar
- Demonstrates the audit-friendly grid pattern for regulated domains

### 7.3 Confirmation patterns (`confirmation-patterns.stories.ts`)

Three stories showing distinct confirmation UX levels:

- **`SoftDelete`** — clicking Delete in the actions column moves the row to "pending" state with a 5-second Undo window before actual removal
- **`HardDelete`** — clicking Delete opens a Dialog requiring the user to type the record name; confirm button activates only when the typed value matches
- **`BulkAction`** — multi-select grid with a toolbar showing "N items selected · [Archive] [Delete]"; bulk delete opens a summary dialog listing all affected names

### 7.4 Settings panel (`settings-panel.stories.ts`)

Tabbed settings view inside a Panel:

- **Profile tab**: name, email, phone fields
- **Notifications tab**: checkboxes for Email, Push, SMS; save button with action log feedback
- **Security tab**: current / new / confirm password; strength indicator using a LabelBuilder
- **Appearance tab**: buttons calling `themeManager.setTheme()` to switch live within the story

---

## P8 — Documentation Improvements

### 8.1 Add "When to use" sections

Current docs describe the API but not when to prefer one option over another. Add a concise block:

```markdown
## When to use

Use `ButtonStyle.FILLED` for the single primary action on a screen.
Use `ButtonStyle.OUTLINED` for secondary actions that need visual weight.
Use `ButtonStyle.TEXT` for tertiary or dismissive actions (Cancel, Learn more).
Never place two FILLED buttons side by side — use FILLED + OUTLINED.
```

### 8.2 Add keyboard navigation tables

For ComboBox, DatePicker, Dialog, Tabs, Grid, MultiSelectList — add a Keyboard section:

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Move between focusable elements |
| `Enter` / `Space` | Activate / select |
| `Escape` | Close dialog / clear selection |
| `Arrow keys` | Navigate list / calendar |

### 8.3 Cross-link related components

Add **Related components** footer to docs that commonly compose together:
- Button ↔ Toolbar, Dialog
- TextField ↔ Form, NumberField, MoneyField
- Grid ↔ Toolbar, Dialog, Panel
- Tabs ↔ Dialog, Panel

---

## P9 — Story Organization & Naming

### 9.1 Category hierarchy

Enforce three top-level categories:

| Category | Contents |
|---|---|
| `Components/` | Atomic and composite components; one MDX-linked story file per component |
| `Examples/` | Multi-component realistic scenarios |
| `System/` | Theming guide (MDX only), design token reference |

Grid sub-stories: `Components/Grid/Grouping`, `Components/Grid/Pivot`.

### 9.2 Story naming sequence

Every component story set should follow this order:

1. `Default` — minimal, no configuration
2. `Styles` / `Variants` — visual variants side by side
3. `States` — enabled, disabled, error, empty, loading
4. `Interactive` — reactive BehaviorSubject-driven demo
5. `GlassEffect` — glass variant (uses Storybook Light/Dark toolbar, no hardcoded gradient div)
6. `WithIcons` / `WithActions` / `WithToolbar` — feature-specific additions
7. `FullCoverage` — all options (grid only)

### 9.3 Story tags

```typescript
export default {
    title: 'Components/Button',
    tags: ['autodocs', 'stable'],
};
```

Tags: `stable`, `experimental`, `glass`, `reactive`, `enterprise`.

---

## Implementation Order

| Phase | Items | Effort |
|---|---|---|
| **Week 1** | P1 (toolbar.stories.ts, theming.docs.mdx, remove alert/confirm) | Medium |
| **Week 2** | P2 (viewport fix, desktop breakpoints, story format, helpers module, addons) | Medium |
| **Week 3** | P3 (Styling sections in all MDX docs, token audit per component) | Medium |
| **Week 4** | P4 (state coverage), P5 (grid improvements) | Medium |
| **Week 5** | P6 (field/form improvements), P7.1 (dashboard) | Large |
| **Week 6** | P7.2–7.4 (audit log, confirmations, settings), P8–P9 | Medium |

---

## Success Criteria

A story set is considered complete when it satisfies all of the following:

- [ ] No `alert()`, `confirm()`, or `prompt()` calls — all actions log to an in-story action log panel
- [ ] No raw `document.createElement('button')` in demo controls — use ButtonBuilder
- [ ] All random data uses deterministic generation (index-based, not `Math.random()` at module scope)
- [ ] Five states covered: default, empty, loading, error, disabled
- [ ] MDX doc present with: usage snippet, builder API table, When to use, Keyboard, Styling (CSS variable table), Related components
- [ ] Glass variant story relies on the Storybook Light/Dark toolbar — no hardcoded gradient wrapper div
- [ ] Story exports follow the naming sequence in P9.2
- [ ] Story has a `tags` array in its default export
- [ ] Grid stories demonstrate actions as the row interaction model — no row click (not supported)
- [ ] Viewport defaults to Desktop 1440; no mobile breakpoints defined
- [ ] Stories fill the preview area — no dark chrome showing around small components
