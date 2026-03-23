# Label

## Description
Label component is a component which is used to display a label.
It has the following methods:
- `withCaption(caption: Observable<string>): this` - sets caption of the label.
- `withSize(size: LabelSize): this` - sets size of the label.
- `withClass(className: Observable<string>): this` - sets class css name of the label.

LabelSize is an enum with the following values according to Material Design 3:
- `SMALL`
- `MEDIUM`
- `LARGE`
