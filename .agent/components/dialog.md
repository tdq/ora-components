# Dialog

## Description
Dialog component is a custom popup that is used to display dialog.
It has the following methods:
- `withCaption(caption: Observable<string>): this` - sets caption of the dialog.
- `withDescription(description: Observable<string>): this` - sets description of the dialog.
- `withClass(className: Observable<string>): this` - sets class css name of the dialog.
- `withContent(content: ComponentBuilder): this` - sets content of the dialog.
- `withSize(size: DialogSize): this` - sets size of the dialog.
- `asScrollable(): this` - sets content of the dialog scrollable.
- `withHeight(height: Observable<number>): this` - if defined then limits height of the dialog. Otherwise height is defined by the content.
- `withToolbar(): ToolbarBuilder` - defines toolbar in the dialog.
- `asGlass(): this` - sets special styling option for dialog and its content as transparent with blur background (glass effect). 

DialogSize is an enum with values:
- `SMALL`. 30vw
- `MEDIUM`. 50vw
- `LARGE`. 75vw
- `EXTRA_LARGE`. 90vw

## Requirements
Dialogs are draggable by pressing mouse button on header.
It uses existing components: layout, label
Use HTML <dialog> tag for implementation.
Always display dialog as modal.
On opening dialog must be displayed in center.

## Styling
Style according to Material Design 3 
Description are small text.
Caption is a big text.
Toolbar should be on the bottom of the dialog.
Only content is scrollable.
Dialog drops large shadow.
Dialog border radius is rounded-large.

### Glass effect
Glass effect applied also for toolbar.
Backdrop is totaly transparent.

Light theme:
1. Caption color is `text-gray-700`
2. Description color is `text-gray-600`

Dark theme:
1. Caption color is `text-white/80`
2. Description color is `text-white/60`