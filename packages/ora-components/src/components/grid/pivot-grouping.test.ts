import { of } from 'rxjs';
import { GridBuilder } from './grid-builder';
import { AggregationType, SortDirection } from './types';

describe('Grid Pivot and Grouping', () => {
    let container: HTMLElement;

    interface TestItem {
        category: string;
        subcategory: string;
        amount: number;
        region: string;
    }

    const items: TestItem[] = [
        { category: 'A', subcategory: 'A1', region: 'US', amount: 100 },
        { category: 'A', subcategory: 'A1', region: 'EU', amount: 50 },
        { category: 'A', subcategory: 'A2', region: 'US', amount: 30 },
        { category: 'B', subcategory: 'B1', region: 'US', amount: 200 },
    ];

    it('should allow expanding groups in pivot mode', (done) => {
        const grid = new GridBuilder<TestItem>()
            .withItems(of(items))
            .withPivot({
                rows: ['category', 'subcategory'],
                columns: ['region'],
                values: [{ field: 'amount', aggregation: AggregationType.SUM }],
                showGrandTotal: true
            })
            .withGrouping(of(['category']));

        const cols = grid.withColumns();
        cols.addTextColumn('category').withHeader('Category');
        cols.addTextColumn('subcategory').withHeader('Subcategory');

        container = grid.build();
        document.body.appendChild(container);

        // Wait a tick for initial render
        setTimeout(() => {
            // Find group row for 'A'
            const groupRows = container.querySelectorAll('.aura-grid-group-toggle');
            expect(groupRows.length).toBe(2); // Groups for 'A' and 'B'

            const groupA = groupRows[0].closest('.absolute.w-full') as HTMLElement;
            expect(groupA.textContent).toContain('A');

            // Find how many rows we have initially (only 2 group headers)
            let totalRows = container.querySelectorAll('.absolute.w-full').length;
            expect(totalRows).toBe(2);

            // Click to expand group 'A'
            groupA.click();

            // Wait a tick for update
            setTimeout(() => {
                totalRows = container.querySelectorAll('.absolute.w-full').length;
                // Group A, Group B, and items under A.
                // Items under A are pivoted rows: (A, A1) and (A, A2).
                // So total should be 2 groups + 2 items = 4 rows.
                expect(totalRows).toBe(4);
                
                document.body.removeChild(container);
                done();
            }, 50);
        }, 50);
    });
});
