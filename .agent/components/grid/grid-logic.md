# Grid Logic

## Description
The `GridLogic` class manages the reactive state of the grid, including sorting, selection, and item processing. It is decoupled from the UI to ensure testability and clear separation of concerns.

## State Management
Uses RxJS `BehaviorSubject` to track:
- `_items$`: The raw data items.
- `_selectedItems$`: A `Set` of currently selected items.
- `_sortConfig$`: The current `SortConfig` (field and direction).

## Key Observables
- `sortedItems$`: Emits the processed items array, applying the current sort configuration.
- `state$`: A combined observable emitting `GridState<ITEM>`, which includes `items`, `selectedItems`, and `sortConfig`.
- `selectedItems$`: Emits the current set of selected items.
- `sortConfig$`: Emits the current sorting configuration.

## Methods
- `setItems(items$: Observable<ITEM[]>)`: Subscribes to an external items observable and manages the internal subscription.
- `setSort(field: string, direction: SortDirection)`: Updates the sorting configuration.
- `toggleSelection(item: ITEM)`: Toggles an item's presence in the selection set.
- `setSelectedItems(selected: Set<ITEM>)`: Replaces the entire selection set (used for "Select All").
- `destroy()`: Cleans up internal subscriptions.

## Implementation Details
Sorting is performed in-memory within the `sortedItems$` pipe. It handles ascending, descending, and none (original order) directions.
