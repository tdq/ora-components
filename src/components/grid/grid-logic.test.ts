import { of, firstValueFrom } from 'rxjs';
import { GridLogic } from './grid-logic';
import { SortDirection } from './types';

describe('GridLogic', () => {
    interface TestItem {
        id: number;
        name: string;
    }

    const items: TestItem[] = [
        { id: 1, name: 'B' },
        { id: 2, name: 'A' },
        { id: 3, name: 'C' },
    ];

    let logic: GridLogic<TestItem>;

    beforeEach(() => {
        logic = new GridLogic<TestItem>();
        logic.setItems(of(items));
    });

    afterEach(() => {
        logic.destroy();
    });

    it('should sort items ASC', async () => {
        logic.setSort('name', SortDirection.ASC);
        const sorted = await firstValueFrom(logic.sortedItems$);
        expect(sorted[0].name).toBe('A');
        expect(sorted[1].name).toBe('B');
        expect(sorted[2].name).toBe('C');
    });

    it('should sort items DESC', async () => {
        logic.setSort('name', SortDirection.DESC);
        const sorted = await firstValueFrom(logic.sortedItems$);
        expect(sorted[0].name).toBe('C');
        expect(sorted[1].name).toBe('B');
        expect(sorted[2].name).toBe('A');
    });

    it('should toggle selection', async () => {
        const item = items[0];
        logic.toggleSelection(item);
        let selected = await firstValueFrom(logic.selectedItems$);
        expect(selected.has(item)).toBe(true);

        logic.toggleSelection(item);
        selected = await firstValueFrom(logic.selectedItems$);
        expect(selected.has(item)).toBe(false);
    });

    it('should set multiple selected items', async () => {
        const selectedSet = new Set([items[0], items[2]]);
        logic.setSelectedItems(selectedSet);
        const selected = await firstValueFrom(logic.selectedItems$);
        expect(selected.size).toBe(2);
        expect(selected.has(items[0])).toBe(true);
        expect(selected.has(items[2])).toBe(true);
    });

    it('should provide combined state', async () => {
        logic.setSort('name', SortDirection.ASC);
        logic.toggleSelection(items[0]);
        
        const state = await firstValueFrom(logic.state$);
        expect(state.items[0].name).toBe('A');
        expect(state.selectedItems.has(items[0])).toBe(true);
        expect(state.sortConfig.field).toBe('name');
        expect(state.sortConfig.direction).toBe(SortDirection.ASC);
    });
});
