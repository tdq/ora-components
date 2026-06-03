# Storybook

Storybook (`packages/stories/`) is the primary development and documentation
environment for all Aura components. It uses `@storybook/html-vite` with plain
function stories (no CSF3/Meta/StoryObj).

## Quick Reference

| Concern | Convention |
|---------|-----------|
| Story format | Named function export, returns `HTMLElement` |
| Default export | `title`, `tags` array |
| Title hierarchy | `Components/Name`, `Examples/Name`, `System/Name` |
| Required tags | `['autodocs', 'stable']` |
| Optional tags | `'glass'`, `'reactive'`, `'enterprise'` |
| Naming order | P9.2: Default → Styles → States → Interactive → GlassEffect → WithX → FullCoverage |
| Data pattern | Module-scope constants, deterministic generators (no `Math.random()`) |

## Global Decorator

`preview.ts` wraps every story in a decorator that:

1. Applies the selected theme via `applyTheme()` (sets `data-theme` on `<html>`).
2. Creates a wrapper `<div>` whose class depends on the story's layout parameter:
   - **Fullscreen layout** (`parameters.layout: 'fullscreen'`): wrapper gets `min-h-screen` only. The story is responsible for its own background and padding.
   - **Default centered layout**: wrapper gets `min-h-screen bg-surface text-on-surface p-6`. This provides a sensible white/neutral background with padding for individual component stories.

To use the fullscreen override in a story's default export:

```ts
export default {
    title: 'Examples/Dashboard',
    tags: ['autodocs', 'enterprise'],
    parameters: {
        layout: 'fullscreen',
    },
};
```

Without the override, stories render centered with `bg-surface text-on-surface p-6`.

## Viewport Configuration

The Storybook toolbar provides desktop-only viewport presets (no mobile
breakpoints — the library targets desktop enterprise applications):

| Preset | Width × Height |
|--------|---------------|
| `desktop1280` | 1280 × 800 |
| `desktop1440` | 1440 × 900 (default) |
| `desktop1920` | 1920 × 1080 (Full HD) |
| `desktopWide` | 2560 × 1080 (Ultrawide) |

The default viewport is `desktop1440`. All presets are configured in
`preview.ts` under `parameters.viewport.viewports`.

## Story Format

All stories use a plain function export pattern. No `StoryObj`, no `Meta` type
annotation — just a named function that returns an `HTMLElement`:

```ts
export const Default = () => {
    return new ButtonBuilder()
        .withCaption(of('Click Me'))
        .build();
};
```

The default export provides metadata:

```ts
export default {
    title: 'Components/Button',
    tags: ['autodocs', 'stable'],
};
```

MDX docs files (`*.docs.mdx`) import these named exports as `* as Stories` and
reference them via `<Meta of={Stories} />` and `<Canvas of={Stories.Styles} />`.

## Tags

Every story's default export must include a `tags` array. Autodocs generation
relies on `'autodocs'` being present (matching `docs.autodocs: "tag"` in
`main.ts`).

> [!WARNING]
> **Storybook Indexing Conflict Warning:**
> When a component has a custom documentation page (`*.docs.mdx`), do NOT include `'autodocs'` in the `tags` array of its CSF story file (`*.stories.ts`). Doing so causes a Storybook indexing conflict error:
> `Error: You created a component docs page for '...', but also tagged the CSF file with 'autodocs'. This is probably a mistake.`

### Required tags

- **`'autodocs'`** — enables automatic docs page generation for this component. *Only use this tag when there is no custom `*.docs.mdx` documentation file.*
- **`'stable'`** — marks the component as stable/production-ready. Used for filtering.

### Optional tags

- **`'glass'`** — component supports `asGlass()` glass-effect styling.
- **`'reactive'`** — component demonstrates RxJS reactive data binding.
- **`'enterprise'`** — "Examples/" category stories that demonstrate
  multi-component enterprise workflows (dashboards, settings panels, CRUD
  flows).

### Common tag combinations

| Story category | Typical tags |
|---------------|-------------|
| `Components/*` | `['autodocs', 'stable', 'glass', 'reactive']` |
| `Components/*` (no glass) | `['autodocs', 'stable', 'reactive']` |
| `Examples/*` | `['autodocs', 'enterprise', 'reactive']` |
| `Components/*` (layout-only) | `['autodocs', 'stable', 'glass']` |

## Story Naming Sequence

Stories within a component file follow a P9.2-influenced naming order for
consistency across the library. Each story is a named export.

**Standard sequence** (use only what applies to the component):

1. **Default** / **Basic** — minimal configuration, single instance.
2. **Styles** / **Sizes** — all style variants or size variants displayed
   together.
3. **States** — enabled/disabled, checked/unchecked, loading, error states.
4. **Interactive** — reactive data binding with controls the user can interact
   with (toggle buttons, selects, input fields).
5. **GlassEffect** / **Glass** — `asGlass()` variants on a gradient/colored
   background.
6. **WithX** (e.g. `WithIcons`, `WithCustomClass`) — specific feature
   combinations.
7. **FullCoverage** — exercises every column type, every edge case (common for
   Grid, Chart).

Not every component needs all slots. Examples:
- Button: `Styles`, `DynamicStyle`, `Interactive`, `Glass`, `WithIcons`
- Checkbox: `Basic`, `Interactive`, `Indeterminate`, `Glass`
- Grid: `Basic`, `Interactive`, `Glass`, `FullCoverage`

## Category Hierarchy

Story titles use `/` delimiters for hierarchy:

| Title prefix | Purpose |
|-------------|---------|
| `Components/Name` | Individual component stories (e.g. `Components/Button`, `Components/Grid`) |
| `Components/Name/SubFeature` | Sub-feature demos (e.g. `Components/Grid/Grouping`, `Components/Grid/Pivot`) |
| `Examples/Name` | Multi-component enterprise workflows (e.g. `Examples/Dashboard`, `Examples/AuditLog`, `Examples/SettingsPanel`, `Examples/ConfirmationPatterns`) |
| `System/Name` | System-level documentation pages (e.g. `System/Theming`) |

## Theming Documentation

The authoritative theming reference lives at `System/Theming`
(`packages/stories/src/theming.docs.mdx`). It covers:

- Material Design 3 token reference (color, shape, spacing, elevation,
  typography)
- Theme switching via `ThemeManager` (`setTheme`, `getTheme`, `theme$`)
- Custom theme creation with `data-theme` selectors
- Scoped theming via class selectors
- Elevation and shape overrides
- A live demo canvas with toolbar theme toggle

The Storybook toolbar theme switcher applies the same mechanism `ThemeManager`
uses at runtime (`data-theme` attribute), so the theming doc is the single
source of truth for consumers.

## Story Helpers Module

`packages/stories/src/story-helpers/` provides reusable utilities for story
authors. See [Story Helpers](story-helpers.md) for the full reference.

Quick overview:

| Module | Export | Purpose |
|--------|--------|---------|
| `action-log` | `createActionLog()` | Styled event log for interactive demos |
| `data-generators` | `generateUsers()`, `generateProducts()`, `generateGroupedProducts()`, `generateFullCoverageData()` | Deterministic mock data |
| `demo-controls` | `createButton()`, `createControlStrip()` | Inline button strips for demo controls |
| `glass-backdrop` | `createGlassBackdrop()`, `GLASS_GRADIENTS` | Gradient background with animated blur circles |

## Theme Configuration (Component Previews)

### Theme Loading Chain

Files are imported in `preview.ts` in this order; later rules override earlier
ones via CSS cascade:

1. **`ora-components/src/index.css`** — Library base. Defines Material Design 3
   tokens for both light (`:root` / `[data-theme="light"]`) and dark
   (`[data-theme="dark"]` / `.dark`). Default palette: Sapphire Blue & Slate
   Gray.

2. **`storybook-layout.css`** — Layout resets only (fullscreen root, no
   centering). No theme tokens.

3. **`storybook-theme.css`** — Overrides `[data-theme="dark"]` tokens to use the
   landing page purple/indigo palette:
   - `--md-sys-color-background`: `#141218`
   - `--md-sys-color-primary`: `#D0BCFF`
   - `--md-sys-color-primary-container`: `#4F378B`
   - `--md-sys-color-surface-container-low`: `#1D1B20`

   Light theme is **not** overridden — it remains the library default.

All files live under `packages/stories/.storybook/`.

### Toolbar Theme Switcher

`preview.ts` registers a global toolbar control via `globalTypes`:

```ts
// preview.ts (excerpt)
export const globalTypes = {
    theme: {
        name: 'Theme',
        defaultValue: 'system',
        toolbar: {
            icon: 'mirror',
            items: [
                { value: 'light', icon: 'sun', title: 'Light' },
                { value: 'dark', icon: 'moon', title: 'Dark' },
                { value: 'system', icon: 'mirror', title: 'System' },
            ],
        },
    },
};
```

The decorator calls `applyTheme()` on every story render, which:

1. Sets `data-theme` attribute on `<html>` (`'dark'` or `'light'`)
2. Toggles the `dark` class on `<html>` for Tailwind `dark:` variants

The `'system'` option resolves via `window.matchMedia('(prefers-color-scheme:
dark)')`.

### How components respond

Components use CSS variables (`var(--md-sys-color-primary)`, etc.) that
reference the `data-theme`-scoped tokens. Because `index.css` defines selectors
for both `[data-theme="dark"]` and `.dark`, components work whether the dark
state is set via attribute or class.

### Manager Theme (UI Chrome)

`manager.ts` themes Storybook's own interface (sidebar, toolbar, panels, docs
sidebar) — **not** the component preview iframe:

```ts
// manager.ts (excerpt)
import { create } from 'storybook/theming/create';
import { addons } from 'storybook/manager-api';

addons.setConfig({
    theme: create({
        base: 'dark',
        brandTitle: 'Ora Components',
        colorPrimary: '#D0BCFF',
        colorSecondary: '#4F378B',
        appBg: '#141218',
        appContentBg: '#141218',
        appPreviewBg: '#141218',
        barBg: '#1D1B20',
        barTextColor: '#E6E1E5',
        barSelectedColor: '#D0BCFF',
        textColor: '#E6E1E5',
        // ...
    }),
});
```

This uses the same landing page purple palette (`#141218`, `#D0BCFF`,
`#4F378B`, `#1D1B20`) to keep the UI chrome visually consistent with the
component preview dark theme.

## Import Paths

| File | Path (from workspace root) |
|------|----------------------------|
| `index.css` | `packages/ora-components/src/index.css` |
| `storybook-layout.css` | `packages/stories/.storybook/storybook-layout.css` |
| `storybook-theme.css` | `packages/stories/.storybook/storybook-theme.css` |
| `preview.ts` | `packages/stories/.storybook/preview.ts` |
| `manager.ts` | `packages/stories/.storybook/manager.ts` |
| `main.ts` | `packages/stories/.storybook/main.ts` |

Alias resolution (for `@tdq/ora-components`) is configured in `main.ts` via
Vite's `resolve.alias`.
