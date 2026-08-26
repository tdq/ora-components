# Panel

## Description
Panel is a custom component that is used to display a panel (card).
It has the following methods:
- `withGap(gap: PanelGap): this` - sets gap between panel border and content (padding).
- `withClass(className: Observable<string>): this` - sets class css name of the panel.
- `withContent(content: ComponentBuilder): this` - sets content of the panel.
- `asGlass(): this` - sets special styling option for panel as transparent with blur background (glass effect). 

PanelGap is an enum with values:
- `SMALL`. 4px gap
- `MEDIUM`. 8px gap
- `LARGE`. 16px gap
- `EXTRA_LARGE`. 32px gap

## Styling
Style according to Material Design 3.
No shadow.
It should have full width

### Slot addressing
The panel's content element carries `data-slot="body"`, matching the `data-slot` convention used by `LayoutBuilder`. It is set **non-clobbering**: if the content element already has a `data-slot` (the consumer set it, or it is a Layout slot wrapper), the panel leaves it alone. Panel has no header API, so there is no `data-slot="header"`.

### Class merging
Panel composes its classes through the shared `cn()` helper (`utils/cn.ts`), which is `twMerge`-based and now knows the library's custom Tailwind scales — see [theme.md](../theme.md#class-merging-cn).

### Glass styling
No shadow.

## Usage

```typescript
// Panel with content — all configuration before build()
const panel = new PanelBuilder()
    .withGap(PanelGap.LARGE)
    .withContent(new LabelBuilder().withCaption(of('Hello')))
    .build();

// Glass panel with custom class
const glassPanel = new PanelBuilder()
    .asGlass()
    .withGap(PanelGap.SMALL)
    .withContent(/* any ComponentBuilder */)
    .withClass(of('max-w-lg'))
    .build();
```