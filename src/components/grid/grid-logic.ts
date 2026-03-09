import { BehaviorSubject, combineLatest, map, Observable, Subscription } from 'rxjs';
import { SortConfig, SortDirection, GridState } from './types';

export class GridLogic<ITEM> {
    private _items$ = new BehaviorSubject<ITEM[]>([]);
    private _selectedItems$ = new BehaviorSubject<Set<ITEM>>(new Set());
    private _sortConfig$ = new BehaviorSubject<SortConfig>({ field: '', direction: SortDirection.NONE });
    private _itemsSubscription?: Subscription;

    constructor() {}

    setItems(items$: Observable<ITEM[]>) {
        if (this._itemsSubscription) {
            this._itemsSubscription.unsubscribe();
        }
        this._itemsSubscription = items$.subscribe(items => this._items$.next(items));
    }

    setSort(field: string, direction: SortDirection) {
        this._sortConfig$.next({ field, direction });
    }

    toggleSelection(item: ITEM) {
        const current = new Set(this._selectedItems$.value);
        if (current.has(item)) {
            current.delete(item);
        } else {
            current.add(item);
        }
        this._selectedItems$.next(current);
    }

    setSelectedItems(selected: Set<ITEM>) {
        this._selectedItems$.next(selected);
    }

    get sortedItems$(): Observable<ITEM[]> {
        return combineLatest([this._items$, this._sortConfig$]).pipe(
            map(([items, sort]) => {
                if (!sort.field || sort.direction === SortDirection.NONE) {
                    return items;
                }
                return [...items].sort((a, b) => {
                    const valA = (a as any)[sort.field];
                    const valB = (b as any)[sort.field];
                    if (valA === valB) return 0;
                    const modifier = sort.direction === SortDirection.ASC ? 1 : -1;
                    return valA > valB ? modifier : -modifier;
                });
            })
        );
    }

    get state$(): Observable<GridState<ITEM>> {
        return combineLatest([this.sortedItems$, this._selectedItems$, this._sortConfig$]).pipe(
            map(([items, selectedItems, sortConfig]) => ({
                items,
                selectedItems,
                sortConfig
            }))
        );
    }

    get selectedItems$(): Observable<Set<ITEM>> {
        return this._selectedItems$.asObservable();
    }

    get sortConfig$(): Observable<SortConfig> {
        return this._sortConfig$.asObservable();
    }

    destroy() {
        if (this._itemsSubscription) {
            this._itemsSubscription.unsubscribe();
        }
    }
}
