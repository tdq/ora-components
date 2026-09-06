# Theming

## Rule: No JavaScript Theme API

All theming goes through CSS custom properties only. There is no JavaScript theme API. Components read their colors, spacing, radii, and shadows from `--ora-*` and `--md-sys-color-*` variables. 

**Global theming** (per-app rebrand): Consumers redefine `--md-sys-color-*` and `--ora-*` variables in their own unlayered app CSS (`:root` and `[data-theme="dark"]`). Because app CSS is unlayered, it outranks the library's `@layer ora-components`, so overrides work without `!important`.

**Per-instance theming** (one component, one style): Every main builder exposes `withClass(Observable<string>)`. Pass a custom class (`of('ledger-grid')`) and scope token overrides to it in app CSS (`.ledger-grid { --ora-grid-header-bg: … }`). The component's internal parts read their tokens from the host element and inherit the overrides.

## ThemeManager Contract

`ThemeManager.applyTheme()` sets only the `data-theme` attribute on `<html>`:

```typescript
document.documentElement.setAttribute('data-theme', themeToApply);
```

The library uses only `[data-theme="dark"]` as the dark theme selector:
- CSS selectors targeting `[data-theme="dark"]` (used in `index-base.css` and components) apply the correct theme.
- The library does not ship `.dark` class selectors. Apps that manage their own `dark` class (e.g., Tailwind's `darkMode: 'class'`) keep full control; the library does not touch or depend on it.

To read the current theme from JavaScript, read the `[data-theme]` attribute, not a class:
```typescript
const currentTheme = document.documentElement.getAttribute('data-theme'); // 'light' or 'dark'
```

## Component Tokens: Complete Reference

### Layout Tokens

| Token | Light | Dark | Affects |
|-------|-------|------|---------|
| `--ora-shadow-bleed` | `12px` | (inherited) | Gutter the `.ora-scroll-bleed` utility (emitted by `LayoutBuilder.asScrollable()` / `SlotBuilder.asScrollable()`) reserves around a scroll container's content so children's `shadow-level-*` shadows and focus rings are not clipped. Padding and negative margin of the same size, so content stays aligned with siblings. |

### Grid Tokens

| Token | Light | Dark | Affects |
|-------|-------|------|---------|
| `--ora-grid-header-bg` | `color-mix(in srgb, var(--md-sys-color-surface-container-low) 30%, transparent)` | (inherited) | Grid header background |
| `--ora-grid-header-fg` | `var(--md-sys-color-on-surface-variant)` | (inherited) | Grid header text and icons |
| `--ora-grid-row-hover-bg` | `color-mix(in srgb, var(--md-sys-color-surface-variant) 20%, transparent)` | (inherited) | Row background on hover |
| `--ora-grid-row-selected-bg` | `color-mix(in srgb, var(--md-sys-color-primary) 10%, transparent)` | (inherited) | Row background when selected |
| `--ora-grid-border` | `color-mix(in srgb, var(--md-sys-color-outline) 20%, transparent)` | (inherited) | Grid borders and dividers |

### Sidebar Tokens

| Token | Light | Dark | Affects |
|-------|-------|------|---------|
| `--ora-sidebar-bg` | `rgba(255, 255, 255, 0.05)` | `rgba(30, 10, 60, 0.88)` | Sidebar rail background |
| `--ora-sidebar-border` | `rgba(255, 255, 255, 0.1)` | `rgba(167, 139, 250, 0.22)` | Sidebar edges and dividers |
| `--ora-sidebar-shadow` | `0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)` | `0 4px 16px rgba(0, 0, 0, 0.35)` | Sidebar elevation shadow |
| `--ora-sidebar-item-active-bg` | `color-mix(in srgb, var(--md-sys-color-primary) 8%, transparent)` | (inherited) | Active sidebar item background |
| `--ora-sidebar-tooltip-bg` | `rgba(255, 255, 255, 0.95)` | `rgba(30, 10, 60, 0.88)` | Tooltip background on hover |
| `--ora-sidebar-tooltip-fg` | `rgba(30, 10, 60, 0.9)` | `#f0e6ff` | Tooltip text color |
| `--ora-sidebar-tooltip-border` | `rgba(30, 10, 60, 0.12)` | `rgba(167, 139, 250, 0.22)` | Tooltip border |
| `--ora-sidebar-tooltip-shadow` | `0 4px 16px rgba(0, 0, 0, 0.12)` | `0 4px 16px rgba(0, 0, 0, 0.35)` | Tooltip elevation shadow |

### Dialog, Popover, and Chart Tokens

| Token | Light | Dark | Affects |
|-------|-------|------|---------|
| `--ora-dialog-bg` | `var(--md-sys-color-surface)` | (inherited) | Dialog background |
| `--ora-dialog-fg` | `var(--md-sys-color-on-surface)` | (inherited) | Dialog text and content |
| `--ora-popover-bg` | `var(--md-sys-color-surface-container-low)` | (inherited) | Popover background |
| `--ora-popover-shadow` | `var(--md-sys-elevation-level2)` | (inherited) | Popover elevation shadow |
| `--ora-popover-radius` | `8px` | (inherited) | Popover corner radius |
| `--ora-popover-glass-ring` | `rgba(0,0,0,0.1)` | `rgba(255,255,255,0.2)` | Edge ring of a glass popover / glass overlay (chart tooltip) |
| `--ora-chart-series-1` | `var(--md-sys-color-primary)` | (inherited) | Chart series 1 color |
| `--ora-chart-series-2` | `var(--md-sys-color-secondary)` | (inherited) | Chart series 2 color |
| `--ora-chart-series-3` | `var(--md-sys-color-tertiary)` | (inherited) | Chart series 3 color |
| `--ora-chart-series-4` | `var(--md-sys-color-error)` | (inherited) | Chart series 4 color |
| `--ora-chart-series-5` | `#6750A4` | (inherited) | Chart series 5 color |
| `--ora-chart-series-6` | `#625B71` | (inherited) | Chart series 6 color |
| `--ora-chart-series-7` | `#7D5260` | (inherited) | Chart series 7 color |
| `--ora-chart-series-8` | `#B3261E` | (inherited) | Chart series 8 color |
| `--ora-chart-grid-line` | `color-mix(in srgb, var(--md-sys-color-on-surface-variant) 100%, transparent)` | (inherited) | Chart grid lines |
| `--ora-chart-grid-line-opacity` | `0.1` | (inherited) | Chart grid line opacity (applied as `stroke-opacity` on every grid line) |
| `--ora-chart-axis-fg` | `var(--md-sys-color-on-surface-variant)` | (inherited) | Chart axis labels and ticks |

### Font and Radius Tokens

| Token | Light | Dark | Affects |
|-------|-------|------|---------|
| `--ora-font-family` | `'Inter', system-ui, -apple-system, sans-serif` | (inherited) | All text in components |
| `--ora-radius-small` | `4px` | (inherited) | Buttons, small toggles |
| `--ora-radius-medium` | `6px` | (inherited) | Form fields, cards |
| `--ora-radius-large` | `12px` | (inherited) | Dialogs, large panels |
| `--ora-radius-extra-large` | `24px` | (inherited) | Expanded containers, popovers |

## Global Theming: Palette Override Recipe

To rebrand globally, override `--md-sys-color-*` and `--ora-*` tokens in unlayered app CSS. Because app CSS is unlayered, it outranks `@layer ora-components`:

```css
/* app.css (unlayered) */
:root {
  --md-sys-color-primary: #0F766E;        /* teal instead of sapphire */
  --md-sys-color-secondary: #0891B2;
  --md-sys-color-tertiary: #65A30D;
  --ora-font-family: "IBM Plex Sans", system-ui, sans-serif;
  --ora-grid-header-bg: color-mix(in srgb, var(--md-sys-color-primary) 8%, transparent);
}

[data-theme="dark"] {
  --md-sys-color-primary: #5EEAD4;        /* light teal for dark mode */
  --md-sys-color-secondary: #22D3EE;
}
```

No `!important` needed. All `--md-sys-color-*` and `--ora-*` tokens throughout the component tree resolve from `:root` or the active `[data-theme]` block.

## Per-Instance Theming: withClass + Scoped Variables

Override the tokens for a single component by passing a class via `withClass()` and scoping token overrides to it in app CSS:

**TypeScript:**
```typescript
const grid = new GridBuilder<Row>()
    .withItems(rows$)
    .withClass(of('ledger-grid'));
```

**CSS:**
```css
.ledger-grid {
  --ora-grid-header-bg: color-mix(in srgb, var(--md-sys-color-tertiary) 12%, transparent);
  --ora-grid-row-hover-bg: color-mix(in srgb, var(--md-sys-color-secondary) 10%, transparent);
}
```

The grid's internal parts (header, rows, borders) read `--ora-grid-*` from the host element and inherit your scoped overrides. No builder options needed; CSS cascades naturally.

See `GridBuilder.withClass()`, `ChartBuilder.withClass()`, `SideBarBuilder.withClass()`, `ChatPanelBuilder.withClass()`, `ChatTriggerBuilder.withClass()`, and `LinkBuilder.withClass()` for builder method signatures.

## How Consumers Style Their Own Tailwind Utilities

The library ships compiled component CSS (`dist/ora-components.css`) with all Material Design 3 tokens and component styles. Consumers manage their own Tailwind configuration.

To restyling components or add app-specific utilities:

1. **Configure your Tailwind to match library tokens:**
   - Set `darkMode: ['selector', '[data-theme="dark"]']` in your Tailwind config
   - Define color tokens as `var(--md-sys-color-*...)` and `var(--ora-*...)` for consistency

2. **Override library tokens globally:**
   In unlayered app CSS (`:root` and `[data-theme="dark"]`):
   ```css
   :root {
     --md-sys-color-primary: #0F766E;  /* your brand color */
     --md-sys-color-secondary: #0891B2;
   }
   
   [data-theme="dark"] {
     --md-sys-color-primary: #5EEAD4;  /* light variant for dark mode */
   }
   ```
   Because app CSS is unlayered, it outranks `@layer ora-components`, so changes take effect without `!important`.

3. **Override per-component tokens:**
   Use `withClass()` and scope token overrides:
   ```css
   .my-grid-class {
     --ora-grid-header-bg: color-mix(in srgb, var(--md-sys-color-tertiary) 12%, transparent);
   }
   ```

4. **Set `corePlugins: { preflight: false }`** in your Tailwind config, since `ora-components.css` includes its own Preflight.

## Build-Time Token Guard: npm run verify

`npm run verify` (or `npm run build`) runs `scripts/check-theme-tokens.mjs`, which scans component source files and built CSS to ensure:
- No literal hex colors (`#rgb`, `#rrggbb`)
- No literal `rgb()`, `rgba()`, `hsl()`, `hsla()` colors
- No literal `font-family` names (only `var()`, system keywords, or quoted names are allowed)
- No `var(--name, #fallback)` with literal color fallbacks

The guard **allows**:
- Custom property definitions (`--my-token: #value` anywhere)
- Token blocks: `:root`, `.dark`, or `[data-theme="..."]` with ONLY custom properties (the detector is permissive to support consumer CSS that may use `.dark`, even though the library itself only ships `[data-theme="dark"]`)
- System font keywords: `system-ui`, `sans-serif`, `serif`, `monospace`, etc.

**To exempt a specific line**, add an inline comment:
```css
.my-class {
  background: #f0f0f0; /* ora-token-exempt: temporary design mockup */
}
```

Exemptions apply to that line and the next. Use sparingly and document the reason.

## Class Merging and Cascade Layers

Every component composes its classes through the shared `cn()` helper in `src/utils/cn.ts` (`clsx` + `tailwind-merge` with custom scale registration). The library defines custom Tailwind scales (`px-*` spacing, M3 token colors, `rounded-large`, `shadow-level-*`) that a stock `twMerge` mis-groups, so `cn` extends it to register these scales. Do not construct a local `cn` inside a component — it will not know the library's scales and will silently drop conflicting classes.

`dist/ora-components.css` is composed in two phases:
1. **Unlayered tokens** (`src/index-base.css`): M3 colors and component tokens (`:root`, `[data-theme]`)
2. **Layered components** (`@layer ora-components { … }` wrapping Tailwind's output from `src/index-layered.css`)

**Key rule:** Consumer app CSS (unlayered) always outranks `@layer ora-components` — that is the point of layering. Set `corePlugins: { preflight: false }` in consuming app Tailwind config to avoid emitting a second Preflight that would override component rules.

## Landing Page and Storybook Themes

The landing page (`packages/ora-landing-page`) and Storybook (`packages/stories`) both import `dist/ora-components.css` from the library and maintain their own Tailwind configs. The landing page overrides the palette in app CSS to use a purple/indigo scheme. Storybook uses the default Sapphire palette (light: `#0F52BA` primary, dark: `#60A5FA`). For details, see [Storybook](./storybook.md).
