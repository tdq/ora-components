# Enum Column

## Description
The `EnumColumnBuilder` is used to map raw field values (keys) to human-readable display labels.

## Builder Methods
In addition to [BaseColumnBuilder](grid.md#basecolumnbuilder-shared-methods) methods:

- `withItemCaptionProvider(provider: (item: ITEM) => string): this`: Sets a mapping function that returns the display string for a given data item. When set, it wins over the `withOptions` labels for display.
- `withOptions(options: EnumOption[] | Observable<EnumOption[]>): this`: Supplies the allowed `{ value, label }` pairs. They drive **both** the rendered label and the inline editor, so display text and editable choices cannot drift apart.

```typescript
export interface EnumOption {
    value: string | number;
    label: string;
}
```

## Implementation Details
- **Field**: Accesses the specified field on the data item.
- **Rendering**: Uses the caption provider when set, otherwise the matching option's `label`.
- **Inline editor**: with `withOptions` set, `createEditor` returns a `CellEditor` backed by a `ComboBoxBuilder<EnumOption>` — previously the enum column inherited the base class's `null` editor, so an "editable" enum column silently had no editor. The editor drives the ComboBox through its public `withValue(Observable | Subject)` binding and the `ComboBoxElement` API (`select` / `open` / `close`) rather than reaching into the built element, and dispatches `CELL_COMMIT_EVENT` (`'ora-cell-commit'`) from its root on selection so the row commits.
- **Teardown**: an `Observable` passed to `withOptions` is subscribed by the column, so the built `GridColumn` exposes `destroy()` and the grid calls it on teardown and on column replacement. See [Column teardown](grid.md#column-teardown).

## Styling
- **Text**: Typically uses standard cell typography.
