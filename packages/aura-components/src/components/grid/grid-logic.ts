import { BehaviorSubject, combineLatest, map, Observable, Subscription } from 'rxjs';
import { SortConfig, SortDirection, GridState, GridRowData, GridGroupHeader, PivotConfig } from './types';
import { PivotLogic } from './pivot-logic';

export class GridLogic<ITEM> {
    private _items$ = new BehaviorSubject<ITEM[]>([]);
    private _selectedItems$ = new BehaviorSubject<Set<ITEM>>(new Set());
    private _sortConfig$ = new BehaviorSubject<SortConfig>({ field: '', direction: SortDirection.NONE });
    private _groupBy$ = new BehaviorSubject<string[]>([]);
    private _pivotConfig$ = new BehaviorSubject<PivotConfig | undefined>(undefined);
    private _expandedGroups$ = new BehaviorSubject<Set<string>>(new Set());
    private _itemsSubscription?: Subscription;
    private _groupBySubscription?: Subscription;
    private _pivotSubscription?: Subscription;

    constructor() {}

    setItems(items$: Observable<ITEM[]>) {
        if (this._itemsSubscription) {
            this._itemsSubscription.unsubscribe();
        }
        this._itemsSubscription = items$.subscribe(items => this._items$.next(items));
    }

    setPivot(pivotConfig$: Observable<PivotConfig | undefined>) {
        if (this._pivotSubscription) {
            this._pivotSubscription.unsubscribe();
        }
        this._pivotSubscription = pivotConfig$.subscribe(config => this._pivotConfig$.next(config));
    }

    setGrouping(groupBy$: Observable<string[]>) {
        if (this._groupBySubscription) {
            this._groupBySubscription.unsubscribe();
        }
        this._groupBySubscription = groupBy$.subscribe(groupBy => this._groupBy$.next(groupBy));
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

    toggleGroup(groupKey: string) {
        const current = new Set(this._expandedGroups$.value);
        if (current.has(groupKey)) {
            current.delete(groupKey);
        } else {
            current.add(groupKey);
        }
        this._expandedGroups$.next(current);
    }

    get sortedItems$(): Observable<ITEM[]> {
        return combineLatest([this._items$, this._sortConfig$, this._pivotConfig$]).pipe(
            map(([items, sort, pivotConfig]) => {
                let processedItems = items;
                if (pivotConfig) {
                    processedItems = PivotLogic.pivot(items, pivotConfig);
                }

                if (!sort.field || sort.direction === SortDirection.NONE) {
                    return processedItems;
                }
                return this.sortItems(processedItems, sort.field, sort.direction);
            })
        );
    }

    private sortItems(items: ITEM[], field: string, direction: SortDirection): ITEM[] {
        return [...items].sort((a, b) => {
            const valA = (a as any)[field];
            const valB = (b as any)[field];
            if (valA === valB) return 0;
            const modifier = direction === SortDirection.ASC ? 1 : -1;
            return valA > valB ? modifier : -modifier;
        });
    }

    get state$(): Observable<GridState<ITEM>> {
        return combineLatest([
            this.sortedItems$,
            this._selectedItems$,
            this._sortConfig$,
            this._groupBy$,
            this._expandedGroups$,
            this._pivotConfig$,
            this._items$
        ]).pipe(
            map(([items, selectedItems, sortConfig, groupBy, expandedGroups, pivotConfig, rawItems]) => {
                const rows = this.processRows(items, groupBy, expandedGroups, sortConfig);
                return {
                    items,
                    rawItems,
                    rows,
                    selectedItems,
                    sortConfig,
                    groupBy,
                    expandedGroups,
                    pivotConfig
                };
            })
        );
    }

    private processRows(
        items: ITEM[],
        groupBy: string[],
        expandedGroups: Set<string>,
        sortConfig: SortConfig
    ): GridRowData<ITEM>[] {
        if (groupBy.length === 0) {
            return items.map((item, index) => ({ type: 'ITEM', data: item, index, level: 0 }));
        }

        const rows: GridRowData<ITEM>[] = [];
        this.groupRecursive(items, groupBy, 0, [], expandedGroups, rows, sortConfig);
        return rows;
    }

    private groupRecursive(
        items: ITEM[],
        groupBy: string[],
        level: number,
        parentKeys: any[],
        expandedGroups: Set<string>,
        result: GridRowData<ITEM>[],
        sortConfig: SortConfig
    ) {
        const field = groupBy[level];
        const groups = new Map<any, ITEM[]>();

        items.forEach(item => {
            const value = (item as any)[field];
            if (!groups.has(value)) {
                groups.set(value, []);
            }
            groups.get(value)!.push(item);
        });

        // Sort group headers by value
        const sortedGroupValues = Array.from(groups.keys()).sort();

        sortedGroupValues.forEach(value => {
            const groupItems = groups.get(value)!;
            const currentKeys = [...parentKeys, value];
            const groupKey = JSON.stringify(currentKeys);
            const isExpanded = expandedGroups.has(groupKey);

            const header: GridGroupHeader = {
                type: 'GROUP_HEADER',
                groupValue: value,
                groupKey,
                field,
                count: groupItems.length,
                isExpanded,
                level
            };

            result.push(header);

            if (isExpanded) {
                if (level < groupBy.length - 1) {
                    this.groupRecursive(groupItems, groupBy, level + 1, currentKeys, expandedGroups, result, sortConfig);
                } else {
                    // Final level, add items
                    // We might want to sort items within group if sortConfig matches
                    const sortedGroupItems = sortConfig.field ? this.sortItems(groupItems, sortConfig.field, sortConfig.direction) : groupItems;
                    sortedGroupItems.forEach((item) => {
                        result.push({
                            type: 'ITEM',
                            data: item,
                            index: result.length, // This index is used for positioning (top = index * height)
                            level: level + 1
                        });
                    });
                }
            }
        });
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
        if (this._groupBySubscription) {
            this._groupBySubscription.unsubscribe();
        }
    }
}
