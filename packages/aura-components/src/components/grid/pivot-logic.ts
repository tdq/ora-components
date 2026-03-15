import { AggregationType, PivotConfig } from './types';

export class PivotLogic {
    static pivot<ITEM>(items: ITEM[], config: PivotConfig): any[] {
        if (!config.rows.length || !config.columns.length || !config.values.length) {
            return items;
        }

        const uniqueColumnValues = this.getUniqueColumnValues(items, config.columns);
        const groupedRows = this.groupItemsByRows(items, config.rows);
        
        const pivotedRows: any[] = [];

        groupedRows.forEach((rowItems, rowKey) => {
            const rowData: any = JSON.parse(rowKey);
            const pivotedRow: any = {};
            
            // Add row grouping fields
            config.rows.forEach((field, index) => {
                pivotedRow[field] = rowData[index];
            });

            // Group row items by columns
            const columnGroups = this.groupItemsByRows(rowItems, config.columns);

            uniqueColumnValues.forEach(colValueKey => {
                const colItems = columnGroups.get(colValueKey) || [];
                const colValueData = JSON.parse(colValueKey);

                config.values.forEach(valConfig => {
                    const pivotKey = this.getPivotKey(colValueData, valConfig);
                    pivotedRow[pivotKey] = this.aggregate(colItems, valConfig);
                });
            });

            if (config.showGrandTotal) {
                config.values.forEach(valConfig => {
                    const totalKey = `total_${valConfig.header || valConfig.field}`;
                    pivotedRow[totalKey] = this.aggregate(rowItems, valConfig);
                });
            }

            pivotedRows.push(pivotedRow);
        });

        return pivotedRows;
    }

    private static getUniqueColumnValues<ITEM>(items: ITEM[], columns: string[]): string[] {
        const uniqueValues = new Set<string>();
        items.forEach(item => {
            const values = columns.map(col => (item as any)[col]);
            uniqueValues.add(JSON.stringify(values));
        });
        return Array.from(uniqueValues).sort();
    }

    private static groupItemsByRows<ITEM>(items: ITEM[], rows: string[]): Map<string, ITEM[]> {
        const groups = new Map<string, ITEM[]>();
        items.forEach(item => {
            const rowValues = rows.map(field => (item as any)[field]);
            const rowKey = JSON.stringify(rowValues);
            if (!groups.has(rowKey)) {
                groups.set(rowKey, []);
            }
            groups.get(rowKey)!.push(item);
        });
        return groups;
    }

    private static getPivotKey(colValueData: any[], valConfig: any): string {
        return `pivot_${JSON.stringify(colValueData)}_${valConfig.header || valConfig.field}`;
    }

    private static aggregate<ITEM>(items: ITEM[], config: any): number {
        if (items.length === 0) return 0;

        const values = items.map(item => Number((item as any)[config.field])).filter(v => !isNaN(v));

        switch (config.aggregation) {
            case AggregationType.SUM:
                return values.reduce((sum, v) => sum + v, 0);
            case AggregationType.COUNT:
                return items.length;
            case AggregationType.AVG:
                return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
            case AggregationType.MIN:
                return Math.min(...values);
            case AggregationType.MAX:
                return Math.max(...values);
            default:
                return 0;
        }
    }

    /**
     * Helper to get dynamic columns for GridBuilder
     */
    static getDynamicColumns<ITEM>(items: ITEM[], config: PivotConfig): { id: string, header: string, field: string }[] {
        const uniqueColumnValues = this.getUniqueColumnValues(items, config.columns);
        const dynamicColumns: { id: string, header: string, field: string }[] = [];

        uniqueColumnValues.forEach(colValueKey => {
            const colValueData = JSON.parse(colValueKey);
            const colHeader = colValueData.join(' - ');

            config.values.forEach(valConfig => {
                const pivotKey = this.getPivotKey(colValueData, valConfig);
                const valHeader = valConfig.header || valConfig.field;
                
                dynamicColumns.push({
                    id: pivotKey,
                    header: `${colHeader} (${valHeader})`,
                    field: pivotKey
                });
            });
        });

        if (config.showGrandTotal) {
            config.values.forEach(valConfig => {
                const totalKey = `total_${valConfig.header || valConfig.field}`;
                dynamicColumns.push({
                    id: totalKey,
                    header: `Grand Total (${valConfig.header || valConfig.field})`,
                    field: totalKey
                });
            });
        }

        return dynamicColumns;
    }
}
