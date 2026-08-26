# Modern Professional Financial Theme

All UI must strictly follow these tokens to maintain professional trust, clarity, and data-centric aesthetics.

## 1. Color System

Primary palette: Sapphire Blue & Slate Gray.

### Light Theme

primary: #0F52BA  
onPrimary: #FFFFFF  
primaryContainer: #D1E1F8  
onPrimaryContainer: #001B3D  

secondary: #475569  
onSecondary: #FFFFFF  
secondaryContainer: #F1F5F9  
onSecondaryContainer: #0F172A  

tertiary: #0891B2  
onTertiary: #FFFFFF  
tertiaryContainer: #CFFAFE  
onTertiaryContainer: #083344  

background: #FFFFFF  
onBackground: #0F172A  

surface: #FFFFFF  
onSurface: #0F172A  
surfaceVariant: #E2E8F0  
onSurfaceVariant: #334155  

outline: #94A3B8  
error: #DC2626  
onError: #FFFFFF  

### Dark Theme

primary: #60A5FA  
onPrimary: #002D5F  
primaryContainer: #1E3A8A  
onPrimaryContainer: #DBEAFE  

secondary: #94A3B8  
onSecondary: #0F172A  
secondaryContainer: #1E293B  
onSecondaryContainer: #F1F5F9  

tertiary: #22D3EE  
onTertiary: #083344  
tertiaryContainer: #155E75  
onTertiaryContainer: #CFFAFE  

background: #0F172A  
onBackground: #F8FAFC  

surface: #1E293B  
onSurface: #F8FAFC  
surfaceVariant: #334155  
onSurfaceVariant: #CBD5E1  

outline: #475569  
error: #EF4444  
onError: #450A0A  

## 2. State Layers (Opacity Tokens)

Hover: 0.08
Focus: 0.12
Pressed: 0.12
Dragged: 0.16

State layers must use the foreground color with these opacities.

## 3. Typography (Financial Professional Scale)

Preferred: 'Inter', system-ui, sans-serif

Format: font-size / line-height / font-weight

displayLarge: 57px / 64px / 600
headlineLarge: 32px / 40px / 600
headlineMedium: 28px / 36px / 600
titleLarge: 20px / 28px / 600
titleMedium: 16px / 24px / 600
titleSmall: 14px / 20px / 600

bodyLarge: 16px / 24px / 400
bodyMedium: 14px / 20px / 400

labelLarge: 14px / 20px / 600
labelMedium: 12px / 16px / 600
labelSmall: 11px / 16px / 600

## 4. Shape

small: 4px  
medium: 6px  
large: 12px  
extraLarge: 24px  

Buttons: small  
Cards: medium  
Dialogs: large  

## 5. Spacing (4px Grid)

4, 8, 12, 16, 24, 32, 40, 48

## 6. Elevation

level0: none  
level1: 0 1px 2px 0 rgb(0 0 0 / 0.05)
level2: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
level3: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)

Prefer subtle borders over heavy shadows in financial UIs.

## 7. Component Rules

Minimum touch target: 44px (Compact Professional)

Buttons:
- Primary: Filled Sapphire
- Secondary: Soft Slate
- Tertiary: Ghost/Text

Form Fields (TextField, NumberField, MoneyField, ComboBox):
- Standardized 1px borders for error states to maintain a refined, high-density look without thick borders.

## 8. Accessibility

Minimum contrast: WCAG AA (Target AAA for financial data)
Touch target ≥ 44px
No color-only meaning (use icons for status)

## 9. Glass Effect

Used for overlays and elevated components on top of content.

### Light Theme Glass
- **Background**: white/40 (rgba(255, 255, 255, 0.4))
- **Backdrop Blur**: 12px
- **Border**: sapphire-blue/20
- **Label Color**: #001B3D (Dark Blue)

### Dark Theme Glass
- **Background**: white/10 (rgba(255, 255, 255, 0.1))
- **Backdrop Blur**: 12px
- **Border**: white/20
- **Label Color**: #FFFFFF (White)

## 10. Storybook Dark Theme

In Storybook, the default Sapphire dark palette is overridden by
`packages/stories/.storybook/storybook-theme.css` to use the landing page's
purple/indigo palette (`#141218` background, `#D0BCFF` primary, `#4F378B`
containers). This ensures visual consistency between the landing page demo and
component previews. The override applies only to `[data-theme="dark"]` — the
light theme remains the library default (Sapphire Blue & Slate Gray).

For details on the theme loading chain and manager UI theme, see
[Storybook](storybook.md).

## 10a. Class merging (`cn`)

Every component composes its classes through the shared `cn()` helper in `src/utils/cn.ts` (`clsx` + `tailwind-merge`). Because the library defines **custom Tailwind scales**, a stock `twMerge` mis-groups them, so `cn` uses `extendTailwindMerge` to register:

- `spacing` → the `px-*` scale (`p-px-8`, `gap-px-16`, …), so conflicting paddings actually replace each other;
- `colors` → the M3 token colors;
- `borderRadius` → `rounded-large` and friends;
- explicit `font-size` and `shadow` class groups for `text-body-medium` / `shadow-level-*`. These two cannot be resolved through `extend.theme` in tailwind-merge's config, and without them `text-body-medium` is treated as a *color* class and silently drops `text-on-surface` (and `shadow-level-2` collides with `shadow-none`).

Do not construct a local `twMerge`/`cn` inside a component — it will not know these scales.

## 10b. Cascade layers in the built stylesheet

`dist/ora-components.css` is composed from two Tailwind entries:

| Entry | Contents | Layered? |
|---|---|---|
| `src/index-base.css` | M3 design tokens: `:root`, `[data-theme]`, base `body` rules | **no** |
| `src/index-layered.css` | `@tailwind base` (Preflight + the `--tw-*` defaults), `@tailwind components`, `@tailwind utilities`, and the component CSS `@import`s | **yes** — wrapped in `@layer ora-components { … }` |

The post-build step `scripts/wrap-css-layer.mjs` concatenates them (tokens first, then the wrapped bundle) into a single `dist/ora-components.css`; the `./style.css` export is unchanged. Tailwind v3 cannot emit native layers itself, hence the composition step rather than a directive.

Two rules follow from this arrangement, and both were learned the hard way:

1. **A custom property and the utilities that consume it must be in the same layer.** Preflight's `*,::before,::after{--tw-shadow:0 0 #0000;…}` block therefore lives *inside* the layer with `shadow-level-*`. Leaving it outside made every unlayered default win over the layered utility and silently flattened all shadows, rings and transforms. The same trap applies *across* the boundary: a consuming Tailwind app emits its own unlayered defaults block, which beats any `--tw-*` value our layered rules set. So **component classes in `index-layered.css` (e.g. `.glass-effect`) must use literal properties** (`backdrop-filter: blur(24px) saturate(1.5)`, `box-shadow: 0 0 0 1px …`) rather than `@apply backdrop-blur-xl` / `ring-1` / `transform-gpu`, which only work through `var(--tw-…)`. Symptom when this is violated: `backdrop-filter` computes to `none` in the consumer while Storybook (all unlayered) looks fine.
2. **Consumer CSS wins.** Any unlayered rule in a consuming app outranks everything in `@layer ora-components`, including our Preflight — that is the point of layering, and it is what lets an app override component styling without `!important`. Design tokens stay unlayered so they behave as ordinary defaults.
3. **A consuming app must not ship a second, unlayered Preflight.** `style.css` already includes Tailwind's reset inside the layer. If the app's own Tailwind build also emits `@tailwind base` unlayered, its `*,::before,::after{border:0 solid #e5e7eb}` outranks every layered `border:` we set (unlayered always beats layered, regardless of specificity) — the symptom is a component whose computed border is `0px solid rgb(229,231,235)` while the stylesheet plainly says `1px solid …`. Set `corePlugins: { preflight: false }` in the app's Tailwind config (the landing page does). Note Vite does not restart on `tailwind.config` edits — restart the dev server after changing it.

The dev/Storybook entry `src/index.css` imports both files **unlayered** — `@layer name { @tailwind utilities; }` is not valid Tailwind v3 input. The divergence is intentional and documented in the file; `wrap-css-layer.mjs` asserts the emitted composition (single layer, `--tw-shadow` and `.shadow-level-2` both inside it, only token rules before it) so a regression cannot hide behind Storybook.

## 11. Using Theme Colors with Builders

When applying theme colors dynamically via `withClass()`, always use exact
Tailwind class names — never arbitrary `text-[#hex]` values interpolated in
template literals. Tailwind's static scanner cannot resolve those at build time.

**Setup in tailwind.config.mjs:**
```javascript
theme: {
    extend: {
        colors: {
            'accent': '#0F52BA',        // light primary
            'accent-dark': '#60A5FA',   // dark primary
        },
    },
},
safelist: ['text-accent', 'text-accent-dark'],
```

**Builder usage:**
```typescript
const HEX_TO_CLASS: Record<string, string> = {
    '#0F52BA': 'text-accent',
    '#60A5FA': 'text-accent-dark',
};
const class$ = color$.pipe(map(c => HEX_TO_CLASS[c] ?? 'text-on-surface'));
new LabelBuilder().withCaption(of('Value')).withClass(class$);
```

This ensures classes are discoverable by Tailwind's scanner and validated
against the theme configuration.

## 12. Landing Page Theme Toggle

The landing page header includes a custom theme toggle (`packages/landing-page/
src/components/header.ts`, function `createThemeToggle()`) that is **not** part
of the `ora-components` library — it is a vanilla-JS component built
specifically for the landing page demo.

### Behavior

The toggle offers three themes: **light**, **dark**, and **pink**. It interacts
with the shared `ThemeManager` singleton (`ThemeManager.getInstance().setTheme(
name)`), so toggling updates the `data-theme` attribute on `<html>` and
triggers theme-dependent style updates across the page (glass header background,
CTA gradient, accent colors).

### Slide Animation

A white pill indicator slides behind the active theme button via
`transform: translateX()` with a `300ms` CSS transition (`cubic-bezier(0.4, 0,
0.2, 1)`). The indicator moves in `30px` increments — one step per theme,
corresponding to the 28×28px icon buttons laid out side-by-side. The active
button icon receives a theme-aware accent color (`#4f46e5` for light,
`#D0BCFF` for dark, `#FFB3D1` for pink); inactive buttons use the default
`on-surface-variant` color.

### Architecture Note

Because this toggle lives in the landing page package and uses direct DOM
manipulation rather than the Builder API, it is **not reusable** across other
apps. Library consumers should use `ThemeManager` directly or build their own
toggle with the Builder pattern.