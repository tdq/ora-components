import { BaseColumnBuilder } from './columns/base-column-builder';
import { GridColumn, ColumnType } from './types';
import { GridRow } from './grid-row';
import { GridViewport } from './grid-viewport';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

interface TestItem {
    id: number;
    name: string;
}

/** Concrete subclass so we can instantiate the abstract BaseColumnBuilder. */
class ConcreteColumnBuilder extends BaseColumnBuilder<TestItem> {
    build(): GridColumn<TestItem> {
        return this.createBaseColumn(ColumnType.TEXT);
    }
    protected render(item: TestItem): string {
        return item.name;
    }
}

function makeColumn(overrides: Partial<GridColumn<TestItem>> = {}): GridColumn<TestItem> {
    return {
        id: 'name',
        field: 'name',
        type: ColumnType.TEXT,
        header: 'Name',
        render: (item) => item.name,
        ...overrides,
    };
}

const ITEM: TestItem = { id: 1, name: 'Item 1' };
const NO_OP = () => {};

function makeRow(
    columns: GridColumn<TestItem>[],
    item: TestItem = ITEM,
    index = 0
): GridRow<TestItem> {
    return new GridRow<TestItem>(item, index, columns, [], false, false, false, NO_OP, 0, false);
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. BaseColumnBuilder.withClass — API & type contract
// ──────────────────────────────────────────────────────────────────────────────

describe('BaseColumnBuilder.withClass', () => {

    it('should accept a provider function and return this for fluent chaining', () => {
        const builder = new ConcreteColumnBuilder('name');
        const provider = (item: TestItem) => item.id === 1 ? 'highlight' : '';
        const result = builder.withClass(provider);
        expect(result).toBe(builder);
    });

    it('should set cellClass on the built GridColumn to the provided function', () => {
        const provider = (item: TestItem) => 'test-class';
        const col = new ConcreteColumnBuilder('name').withClass(provider).build();
        expect(col.cellClass).toBe(provider);
    });

    it('should leave cellClass undefined when withClass is not called', () => {
        const col = new ConcreteColumnBuilder('name').build();
        expect(col.cellClass).toBeUndefined();
    });

    it('last call to withClass wins when called multiple times', () => {
        const first = () => 'first';
        const second = () => 'second';
        const col = new ConcreteColumnBuilder('name')
            .withClass(first)
            .withClass(second)
            .build();
        expect(col.cellClass).toBe(second);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. GridColumn.cellClass type contract
// ──────────────────────────────────────────────────────────────────────────────

describe('GridColumn.cellClass type contract', () => {
    it('should allow a column with no cellClass (optional field)', () => {
        const col = makeColumn();
        expect(col.cellClass).toBeUndefined();
    });

    it('should allow a column with a provider function cellClass', () => {
        const provider = (item: TestItem) => 'danger';
        const col = makeColumn({ cellClass: provider });
        expect(col.cellClass).toBe(provider);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. GridRow — using cellClass provider
// ──────────────────────────────────────────────────────────────────────────────

describe('GridRow cellClass usage', () => {
    it('should apply the class from provider to the cell element', () => {
        const provider = (item: TestItem) => item.id === 1 ? 'text-red-500' : 'text-blue-500';
        const col = makeColumn({ cellClass: provider });
        
        const row = makeRow([col], { id: 1, name: 'Item 1' });
        const cell = row.getElement().children[0] as HTMLElement;
        expect(cell.className).toContain('text-red-500');
        row.destroy();

        const row2 = makeRow([col], { id: 2, name: 'Item 2' });
        const cell2 = row2.getElement().children[0] as HTMLElement;
        expect(cell2.className).toContain('text-blue-500');
        row2.destroy();
    });

    it('should set up correct class when update() is called', () => {
        const provider = (item: TestItem) => `class-${item.id}`;
        const col = makeColumn({ cellClass: provider });
        const row = makeRow([col], { id: 1, name: 'Item 1' });

        const cellBefore = row.getElement().children[0] as HTMLElement;
        expect(cellBefore.className).toContain('class-1');

        row.update({ id: 2, name: 'Item 2' }, 0, false);
        const cellAfter = row.getElement().children[0] as HTMLElement;
        expect(cellAfter.className).toContain('class-2');

        row.destroy();
    });
    it('should reset cell className when cellClass is removed or undefined', () => {
        const provider = () => 'temp-class';
        const colWithClass = makeColumn({ cellClass: provider });
        const row = makeRow([colWithClass]);
        const cell = row.getElement().children[0] as HTMLElement;
        expect(cell.className).toContain('temp-class');

        const colWithoutClass = makeColumn({ cellClass: undefined });
        row.updateColumns([colWithoutClass]);
        expect(cell.className).not.toContain('temp-class');
        // It should still have the base GridStyles.cell class
        expect(cell.className).toContain('px-4 flex items-center'); 

        row.destroy();
    });
});

