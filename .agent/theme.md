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

## 10. Using Theme Colors with Builders

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