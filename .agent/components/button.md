Button component is a custom element that is used to display a button.
It has the following methods:
- withCaption(caption: Observable<string>): this - sets caption of the button.
- withEnabled(enabled: Observable<boolean>): this - sets enabled state of the button.
- withClick(click: Subject<void>): this - sets click event of the button.
- withStyle(style: Observable<ButtonStyle>): this - sets style of the button.
- withClass(className: Observable<string>): this - sets class css name of the button.
- asGlass(): this - sets special styling option for button and its popup with items as transparent with blur background (glass effect). 

Button style is an enum with the following values:
- filled
- elevated
- tonal
- outlined
- text

## Style
Style according to Material Design 3
Glass effect is not applied for text button background because it should not have any background.