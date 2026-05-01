import { PivotLogic } from './pivot-logic';
import { AggregationType, PivotConfig } from './types';

describe('PivotLogic', () => {
    const testData = [
        { region: 'North', category: 'A', amount: 100, qty: 1 },
        { region: 'North', category: 'B', amount: 200, qty: 2 },
        { region: 'South', category: 'A', amount: 150, qty: 3 },
        { region: 'South', category: 'B', amount: 250, qty: 4 },
        { region: 'North', category: 'A', amount: 50, qty: 1 },
    ];

    const pivotConfig: PivotConfig = {
        rows: ['category'],
        columns: ['region'],
        values: [
            { field: 'amount', aggregation: AggregationType.SUM, header: 'Revenue' }
        ],
        showGrandTotal: true
    };

    it('should pivot data correctly with SUM aggregation', () => {
        const result = PivotLogic.pivot(testData, pivotConfig);

        expect(result).toHaveLength(2); // Two categories: A and B
        
        const rowA = result.find(r => r.category === 'A');
        const rowB = result.find(r => r.category === 'B');

        // North - A: 100 + 50 = 150
        // South - A: 150
        expect(rowA['pivot_["North"]_Revenue']).toBe(150);
        expect(rowA['pivot_["South"]_Revenue']).toBe(150);
        expect(rowA['total_Revenue']).toBe(300);

        // North - B: 200
        // South - B: 250
        expect(rowB['pivot_["North"]_Revenue']).toBe(200);
        expect(rowB['pivot_["South"]_Revenue']).toBe(250);
        expect(rowB['total_Revenue']).toBe(450);
    });

    it('should support multiple value aggregations', () => {
        const multiValueConfig: PivotConfig = {
            ...pivotConfig,
            values: [
                { field: 'amount', aggregation: AggregationType.SUM, header: 'Revenue' },
                { field: 'qty', aggregation: AggregationType.COUNT, header: 'Orders' }
            ]
        };

        const result = PivotLogic.pivot(testData, multiValueConfig);
        const rowA = result.find(r => r.category === 'A');

        expect(rowA['pivot_["North"]_Revenue']).toBe(150);
        expect(rowA['pivot_["North"]_Orders']).toBe(2); // 2 items in North category A
    });

    it('should generate correct dynamic columns', () => {
        const columns = PivotLogic.getDynamicColumns(testData, pivotConfig);

        // North (Revenue), South (Revenue), Grand Total (Revenue)
        expect(columns).toHaveLength(3);
        expect(columns[0].header).toContain('North');
        expect(columns[0].header).toContain('Revenue');
        expect(columns[2].header).toBe('Grand Total (Revenue)');
    });

    it('should handle empty data', () => {
        const result = PivotLogic.pivot([], pivotConfig);
        expect(result).toEqual([]);
    });

    it('should support multi-field column grouping', () => {
         const multiColConfig: PivotConfig = {
            rows: ['category'],
            columns: ['region', 'category'], // Unusual but valid for test
            values: [{ field: 'amount', aggregation: AggregationType.SUM }]
        };

        const result = PivotLogic.pivot(testData, multiColConfig);
        expect(result.length).toBeGreaterThan(0);
        const keys = Object.keys(result[0]);
        const pivotKeys = keys.filter(k => k.startsWith('pivot_'));
        // Each unique [region, category] pair creates a column
        expect(pivotKeys.length).toBeGreaterThan(0);
    });
});
