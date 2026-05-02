# MultiSelectListBuilder

## Description

MultiSelectListBuilder is a generic component that displays a scrollable list of checkboxes, allowing the user to select multiple items simultaneously. Selection state is owned externally via a `BehaviorSubject<ITEM[]>` and kept in two-way sync with the rendered checked states.

It has the following methods:

- `withCaption(caption: Observable<string>): this` — sets the caption label above the list.
- `withEnabled(enabled: Observable<boolean>): this` — enables or disables the entire component.
- `withStyle(style: Observable<MultiSelectListStyle>): this` — sets the visual style of the panel border.
- `withClass(className: Observable<string>): this` — sets additional CSS class on the root element.
- `withItems(items: Observable<ITEM[]>): this` — sets the source list of items to display.
- `withItemCaptionProvider(provider: (item: ITEM) => string): this` — converts an item to its display label. Defaults to `String(item)`.
- `withItemIdProvider(provider: (item: ITEM) => string | number): this` — produces a unique ID for each item, used for selection comparison. Defaults to `String(item)`.
- `withValue(value: Subject<ITEM[]>): this` — reactive two-way binding for the selected items array. The component reads initial state from the Subject and emits an updated array on every checkbox toggle.
- `withHeight(height: Observable<number>): this` — sets a fixed height (px) on the list panel.
- `withError(error: Observable<string>): this` — shows an error message below the panel and applies error border styling.
- `asGlass(): this` — applies the glass-effect visual style (transparent with blur background).
- `withSelectAll(show: boolean): this` — controls whether the "Select all" header row is rendered. Defaults to `true`. Pass `false` to hide the header and show only the item checkboxes.

## Requirements

`MultiSelectListBuilder` is generic over the item type `ITEM`:

```typescript
export class MultiSelectListBuilder<ITEM> implements ComponentBuilder {
    ...
}
```

The `withValue` Subject must be a `BehaviorSubject<ITEM[]>` so the component can read the current selection synchronously on `build()`. Items are compared by the value returned from `itemIdProvider`, not by object reference.

On every user interaction (checkbox toggle, select-all toggle), the component emits a **new array reference** to the Subject — never mutates the existing array.

The component unsubscribes all RxJS subscriptions when the root element is removed from the DOM, using `registerDestroy`.

### Select All behaviour

The "Select all" header row is shown by default and can be hidden with `.withSelectAll(false)`. When hidden, item checkboxes still function independently — the only difference is the absence of the bulk-toggle control.

When visible, the header row contains a checkbox with the following states:

- **Unchecked** — no items are selected (or all visible items are disabled).
- **Checked** — all enabled items are selected.
- **Indeterminate** — some (but not all) enabled items are selected. Set via `input.indeterminate = true` imperatively (cannot be set via HTML attribute).

Clicking "Select all" when unchecked or indeterminate selects all enabled items. Clicking when checked deselects all enabled items. Disabled items are never included in the toggle but retain their existing checked state in the emitted array.

### Item rendering

Each item row is a `<label>` containing a native `<input type="checkbox">` and a text `<span>`. Checked state is derived from the current `value$` emission on every `combineLatest` cycle — it is never stored as independent local state per row.

## Style

`MultiSelectListStyle` enum:

```typescript
export enum MultiSelectListStyle {
    TONAL = 'tonal',
    OUTLINED = 'outlined',
    BORDERLESS = 'borderless',
}
```

- `TONAL` — panel with border; selected items use `bg-secondary-container`.
- `OUTLINED` — panel with border; selected items use `bg-primary-container`.
- `BORDERLESS` — no panel border or rounding; selected items use `bg-secondary-container` (same as TONAL). Error state re-introduces a border so the error is still visually communicated.

The panel border and border-radius match the `ListBoxBuilder` style (`rounded-large border overflow-hidden`). Item rows use the same padding, typography, and hover/active state layers as `ListBoxBuilder` items. The glass effect applies to the panel container when `asGlass()` is called.

## DOM Structure

```
<div>                                  root container
  <span>Caption</span>                 optional caption (aria-labelledby target)
  <div class="rounded-large border">   panel
    <div class="...header-row...">     optional select-all header (withSelectAll(false) removes this)
      <input type="checkbox" />        select-all checkbox (indeterminate-capable)
      <span>Select all</span>
    </div>
    <ul role="listbox"                 items list
        aria-multiselectable="true">
      <li role="option" aria-selected="...">
        <label>
          <input type="checkbox" />
          <span>Item label</span>
        </label>
      </li>
      ...
    </ul>
  </div>
  <div class="text-error">Error</div>  optional error message
</div>
```

## Usage Example

```typescript
import { BehaviorSubject } from 'rxjs';
import { MultiSelectListBuilder } from '@tdq/ora-components';

interface Role { id: number; name: string; }

const roles: Role[] = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Editor' },
    { id: 3, name: 'Viewer' },
];

const selectedRoles$ = new BehaviorSubject<Role[]>([roles[1]]);

const list = new MultiSelectListBuilder<Role>()
    .withCaption(new BehaviorSubject('Assign roles'))
    .withItems(new BehaviorSubject(roles))
    .withItemIdProvider(role => role.id)
    .withItemCaptionProvider(role => role.name)
    .withValue(selectedRoles$)
    .withError(new BehaviorSubject(''))
    .build();

document.body.appendChild(list);

// React to selection changes externally
selectedRoles$.subscribe(selected => {
    console.log('Selected:', selected.map(r => r.name));
});

// Or drive selection programmatically
selectedRoles$.next([roles[0], roles[2]]);
```

## Accessibility

- The items `<ul>` carries `role="listbox"`, `aria-multiselectable="true"`, and `aria-labelledby` pointing to the caption element (when a caption is set).
- Each `<li>` carries `role="option"` and `aria-selected`.
- Each item `<input type="checkbox">` has an associated `<label>` via wrapping — no explicit `for`/`id` wiring needed.
- The select-all checkbox carries `aria-label="Select all"`. When `.withSelectAll(false)` is used, this element is not rendered.
- Indeterminate state is set via the DOM property `input.indeterminate = true` — this is the only way to trigger the browser's native indeterminate visual; it cannot be set via an HTML attribute.
- When the component is disabled, all inputs receive `disabled` and the root gains `opacity-50 pointer-events-none`.

## File Structure

```
packages/ora-components/src/components/multi-select-list/
├── index.ts
├── multi-select-list.ts
└── types.ts
```
