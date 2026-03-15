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

    describe('Grouping', () => {
        interface GroupItem {
            id: number;
            category: string;
            type: string;
            name: string;
        }

        const groupItems: GroupItem[] = [
            { id: 1, category: 'A', type: 'X', name: 'Item 1' },
            { id: 2, category: 'A', type: 'Y', name: 'Item 2' },
            { id: 3, category: 'B', type: 'X', name: 'Item 3' },
        ];

        let groupLogic: GridLogic<GroupItem>;

        beforeEach(() => {
            groupLogic = new GridLogic<GroupItem>();
            groupLogic.setItems(of(groupItems));
        });

        it('should group items by field', async () => {
            groupLogic.setGrouping(of(['category']));
            const state = await firstValueFrom(groupLogic.state$);
            
            // Should have 2 group headers, items are not visible by default (expandedGroups is empty)
            expect(state.rows.length).toBe(2);
            expect(state.rows[0].type).toBe('GROUP_HEADER');
            expect((state.rows[0] as any).groupValue).toBe('A');
            expect(state.rows[1].type).toBe('GROUP_HEADER');
            expect((state.rows[1] as any).groupValue).toBe('B');
        });

        it('should show items when group is expanded', async () => {
            groupLogic.setGrouping(of(['category']));
            
            // Expand group 'A'
            const groupAKey = JSON.stringify(['A']);
            groupLogic.toggleGroup(groupAKey);
            
            const state = await firstValueFrom(groupLogic.state$);
            
            // Group A (header) + 2 items in A + Group B (header) = 4 rows
            expect(state.rows.length).toBe(4);
            expect(state.rows[0].type).toBe('GROUP_HEADER');
            expect(state.rows[1].type).toBe('ITEM');
            expect(state.rows[2].type).toBe('ITEM');
            expect(state.rows[3].type).toBe('GROUP_HEADER');
            
            expect((state.rows[1] as any).data.category).toBe('A');
            expect((state.rows[2] as any).data.category).toBe('A');
        });

        it('should support multi-level grouping', async () => {
            groupLogic.setGrouping(of(['category', 'type']));
            
            // Expand category 'A'
            groupLogic.toggleGroup(JSON.stringify(['A']));
            // Expand category 'A' -> type 'X'
            groupLogic.toggleGroup(JSON.stringify(['A', 'X']));
            
            const state = await firstValueFrom(groupLogic.state$);
            
            // Rows expected:
            // 0: Group category:A (header)
            // 1: Group type:X (header)
            // 2: Item 1 (data)
            // 3: Group type:Y (header, collapsed)
            // 4: Group category:B (header, collapsed)
            expect(state.rows.length).toBe(5);
            expect(state.rows[0].type).toBe('GROUP_HEADER');
            expect((state.rows[0] as any).level).toBe(0);
            
            expect(state.rows[1].type).toBe('GROUP_HEADER');
            expect((state.rows[1] as any).level).toBe(1);
            expect((state.rows[1] as any).groupValue).toBe('X');
            
            expect(state.rows[2].type).toBe('ITEM');
            expect((state.rows[2] as any).level).toBe(2);
            
            expect(state.rows[3].type).toBe('GROUP_HEADER');
            expect((state.rows[3] as any).groupValue).toBe('Y');
        });
    });
});
