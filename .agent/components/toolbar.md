# Toolbar

## Description
`ToolbarBuilder` builds a row of buttons — a bottom action bar for a [Dialog](dialog.md) (`DialogBuilder.withToolbar()`), a top action bar for a [Grid](grid/grid.md) (`GridBuilder.withToolbar()`), or standalone. It owns button placement and MD3 button styling so callers never build their own button row.

## Methods

- `withPrimaryButton(): ButtonBuilder` — the toolbar's one primary (filled-style) action. Renders right-aligned, after any secondary buttons. Calling it again returns a **new** primary button, replacing the previous one — there is only ever one.
- `addSecondaryButton(): ButtonBuilder` — an outlined-style action. Renders right-aligned, before the primary button, in call order. Can be called multiple times.
- `addTextButton(): ButtonBuilder` — a text-style (no fill, no outline) action. Renders left-aligned, in call order. Typically used for low-emphasis actions (e.g. "Learn more") alongside right-aligned primary/secondary actions.
- `withEnabled(enabled: Observable<boolean>): this` — disables every button in the toolbar together (merged with each button's own `withEnabled`, if any).
- `asGlass(): this` — propagates the glass effect to every button in the toolbar. The toolbar's own background is unaffected — see [Styling](#styling).
- `build(): HTMLElement` — builds and returns the toolbar element. Each of the three `with*`/`add*` methods above returns a `ButtonBuilder`, not the `ToolbarBuilder` itself — configure the returned button directly, then continue composing the toolbar from the original `ToolbarBuilder` reference (see the example below, and [Dialog Actions](dialog.md#actions) for the canonical dialog case).

`ToolbarBuilder` itself has no test-id method and there is no toolbar-level id — see [Test ids](../builder-pattern.md#test-ids). An id goes on the returned `ButtonBuilder` instead, e.g. `ButtonBuilder.withTestId('save')` on the button returned by `withPrimaryButton()`.

## Usage

```typescript
const toolbar = new ToolbarBuilder();
toolbar.addTextButton().withCaption(of('Learn more')).withClick(showHelp);
toolbar.addSecondaryButton().withCaption(of('Cancel')).withClick(cancel);
toolbar.withPrimaryButton().withCaption(of('Save')).withClick(save);

document.body.appendChild(toolbar.build());
```

Each button returned by `withPrimaryButton()` / `addSecondaryButton()` / `addTextButton()` is a full `ButtonBuilder` — see [Button](button.md) for the rest of its API (`withIcon`, `withEnabled`, `withStyle`, `withTestId`, …).

## Styling
Style according to Material Design 3.
Primary and secondary buttons are right-aligned in the toolbar; text buttons are left-aligned.
Glass effect (`asGlass()`) is applied only to the toolbar's buttons — the toolbar's own layout container is not affected.

## Gotchas

- The toolbar is the dialog's (or grid's) action bar; do not build custom button rows in the content instead.
- Toolbar has no test-id API — set test ids on the individual `ButtonBuilder` instances returned by `withPrimaryButton()` / `addSecondaryButton()` / `addTextButton()`.

## Implementation

`ToolbarBuilder` is built on `LayoutBuilder`, not a bespoke container:
- Two internal horizontal `LayoutBuilder` instances — `leftLayout` (text buttons) and `rightLayout` (secondary buttons, then the primary button) — are created only when there is at least one button on that side; a toolbar with buttons on only one side skips the unused layout and its wrapping container entirely.
- Each button sits in its own `SlotSize.FIT` slot so buttons size to their content rather than stretching.
- `withEnabled()` and `asGlass()` are applied per-button at `build()` time (`addButtonToLayout`), not via a container-level attribute — each button independently receives the merged enabled state / glass flag.
