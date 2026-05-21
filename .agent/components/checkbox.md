# Checkbox

## Description
Checkbox component is a custom element that is used to display a checkbox.
It has the following methods:
- `withCaption(caption: Observable<string>): this` - sets caption of the checkbox. The caption span is only rendered when this is provided.
- `withEnabled(enabled: Observable<boolean>): this` - sets enabled state of the checkbox.
- `withClass(className: Observable<string>): this` - sets class css name of the checkbox.
- `withValue(value: Subject<CheckboxValue>): this` - sets bidirectional value for checkbox. Accepts `boolean | 'intermediate'`.
- `asGlass(isGlass?: boolean): this` - sets special styling option for checkbox and its popup with items as transparent with blur background (glass effect).

## Value Type
`CheckboxValue = boolean | 'intermediate'`

The `withValue` subject is **bidirectional**: subscribing to it drives the visual state, and user clicks push updated values back via `Subject.next()`. No separate change callback is needed.

- `true` — checked state: filled background (`bg-primary`), checkmark icon visible.
- `false` — unchecked state: empty box.
- `'intermediate'` — indeterminate state: filled background (`bg-primary`), dash icon visible (checkmark hidden). Clicking an intermediate checkbox emits `true`.

## Styling
Style according to Material Design 3. Icons are driven by CSS `peer-checked:` and `peer-indeterminate:` Tailwind utilities on sibling elements of the `sr-only peer` input — no inline style overrides.

- **Checked**: `peer-checked:bg-primary peer-checked:border-primary` on the box; `peer-checked:scale-100` on the checkmark icon container.
- **Indeterminate**: `peer-indeterminate:bg-primary peer-indeterminate:border-primary` on the box; `peer-indeterminate:scale-100` on the dash icon container; `peer-indeterminate:scale-0` on the checkmark icon container.

Glass effect applied only for the checkbox clickable part (the box). Uses `Icons.CHECKMARK` for the checked indicator and `Icons.INDETERMINATE` for the indeterminate indicator.

## Memory Management
Subscriptions are cleaned up via `registerDestroy` — when the root `<label>` element is removed from the DOM, all RxJS subscriptions and DOM event listeners are unsubscribed automatically.