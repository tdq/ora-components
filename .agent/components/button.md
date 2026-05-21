# Button

## Description
Button component is a custom element that is used to display a button.
It has the following methods:
- `withCaption(caption: Observable<string>): this` - sets caption of the button.
- `withIcon(icon: Observable<string> | string): this` - sets an icon for the button. Supports SVG strings (e.g., from `Icons` class) or CSS icon classes.
- `withEnabled(enabled: Observable<boolean>): this` - sets enabled state of the button.
- `withClick(click: ClickListener<void>): this` - sets click event of the button.
- `withStyle(style: Observable<ButtonStyle>): this` - sets style of the button.
- `withClass(className: Observable<string>): this` - sets class css name of the button.
- `asGlass(): this` - sets special styling option for button as transparent with blur background (glass effect). 

```typescript
export type ClickListener<TYPE> = (value: TYPE) => void
```

Button style is an enum with the following values:
- filled
- elevated
- tonal
- outlined
- text

## Styling
Style according to Material Design 3

### Height
Button has a fixed height of **46px** (`h-[46px]`). This is enforced in `BASE_CLASSES` and cannot be overridden by parent flex containers (prevents stretching when placed inside layouts with `align-items: stretch`). Icon-only buttons use `aspect-square` to produce a 46×46px square.

### Icon-only layout
When `withCaption` is **not called**, the caption `<span>` is never inserted into the DOM. This ensures the icon is the sole flex child and `justify-center` / `items-center` place it exactly in the centre of the button with no gap artefacts. Padding is removed (`px-px-24` dropped) and `aspect-square` makes the button a 46×46px square.

### Text Selection
Button caption text has `select-none` — it is not user-selectable to prevent accidental text highlights on click.

### Glass effect
Button styles:
1. Filled button has glass background, border and caption color according to generic glass effect instructions and color theme.
2. Elevated button has glass background, shadow and caption color according to generic glass effect instructions and color theme.
3. Tonal button has glass background and caption color according to generic glass effect instructions and color theme.
4. Outlined button has transparent background, border and caption color according to generic glass effect instructions and color theme.
5. Text button has no background, caption color according to generic glass effect instructions and color theme.