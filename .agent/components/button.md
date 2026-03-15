# Button

## Description
Button component is a custom element that is used to display a button.
It has the following methods:
- withCaption(caption: Observable<string>): this - sets caption of the button.
- withIcon(icon: Observable<string> | string): this - sets an icon for the button. Supports SVG strings (e.g., from `Icons` class) or CSS icon classes.
- withEnabled(enabled: Observable<boolean>): this - sets enabled state of the button.
- withClick(click: ClickListener<void>): this - sets click event of the button.
- withStyle(style: Observable<ButtonStyle>): this - sets style of the button.
- withClass(className: Observable<string>): this - sets class css name of the button.
- asGlass(): this - sets special styling option for button as transparent with blur background (glass effect). 

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

### Glass effect
Button styles:
1. Filled button has glass background, border and caption color according to generic glass effect instructions and color theme.
2. Elevated button has glass background, shadow and caption color according to generic glass effect instructions and color theme.
3. Tonal button has glass background and caption color according to generic glass effect instructions and color theme.
4. Outlined button has transparent background, border and caption color according to generic glass effect instructions and color theme.
5. Text button has no background, caption color according to generic glass effect instructions and color theme.