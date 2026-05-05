# Storybook Theme Configuration

Storybook applies two independent theme layers: the **component preview theme**
(controls how components render inside the iframe) and the **manager theme**
(controls Storybook's own UI chrome).

## Theme Loading Chain (Component Previews)

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

## Toolbar Theme Switcher

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

## Manager Theme (UI Chrome)

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
