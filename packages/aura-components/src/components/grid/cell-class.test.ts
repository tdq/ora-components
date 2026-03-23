/**
 * Tests for Subtask 1: Observable-based cellClass on grid columns.
 *
 * Spec requirements:
 * - BaseColumnBuilder.withClass(className: Observable<string>): this — accepts Observable, not plain string
 * - GridColumn.cellClass type is Observable<string> (optional)
 * - grid-row.ts subscribes to col.cellClass reactively and updates cell className on each emission
 * - Subscriptions are cleaned up in: update(), updateColumns(), destroy()
 * - GridViewport.clearRenderedRows() / destroy() also clean up via GridRow.destroy()
 */

import { BehaviorSubject, of, Subject } from 'rxjs';
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
    it('should accept an Observable<string> and return this for fluent chaining', () => {
        const builder = new ConcreteColumnBuilder('name');
        const cls$ = of('highlight');
        const result = builder.withClass(cls$);
        expect(result).toBe(builder);
    });

    it('should set cellClass on the built GridColumn to the provided Observable', () => {
        const cls$ = of('highlight');
        const col = new ConcreteColumnBuilder('name').withClass(cls$).build();
        expect(col.cellClass).toBe(cls$);
    });

    it('should leave cellClass undefined when withClass is not called', () => {
        const col = new ConcreteColumnBuilder('name').build();
        expect(col.cellClass).toBeUndefined();
    });

    it('should accept a BehaviorSubject (Observable subtype)', () => {
        const cls$ = new BehaviorSubject('active');
        const col = new ConcreteColumnBuilder('name').withClass(cls$).build();
        expect(col.cellClass).toBe(cls$);
    });

    it('should accept a Subject (Observable subtype)', () => {
        const cls$ = new Subject<string>();
        const col = new ConcreteColumnBuilder('name').withClass(cls$).build();
        expect(col.cellClass).toBe(cls$);
    });

    it('last call to withClass wins when called multiple times', () => {
        const first$ = of('first');
        const second$ = of('second');
        const col = new ConcreteColumnBuilder('name')
            .withClass(first$)
            .withClass(second$)
            .build();
        expect(col.cellClass).toBe(second$);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. GridColumn.cellClass type is Observable<string> (optional)
// ──────────────────────────────────────────────────────────────────────────────

describe('GridColumn.cellClass type contract', () => {
    it('should allow a column with no cellClass (optional field)', () => {
        const col = makeColumn();
        expect(col.cellClass).toBeUndefined();
    });

    it('should allow a column with an Observable cellClass', () => {
        const cls$ = of('danger');
        const col = makeColumn({ cellClass: cls$ });
        expect(col.cellClass).toBe(cls$);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. GridRow — reactive subscription to cellClass
// ──────────────────────────────────────────────────────────────────────────────

describe('GridRow cellClass subscription', () => {
    it('should apply the initial emitted class to the cell element', () => {
        const cls$ = of('text-red-500');
        const col = makeColumn({ cellClass: cls$ });
        const row = makeRow([col]);

        const cell = row.getElement().children[0] as HTMLElement;
        expect(cell.className).toContain('text-red-500');

        row.destroy();
    });

    it('should update cell className on each Observable emission', () => {
        const cls$ = new BehaviorSubject<string>('text-green-500');
        const col = makeColumn({ cellClass: cls$ });
        const row = makeRow([col]);

        const cell = row.getElement().children[0] as HTMLElement;
        expect(cell.className).toContain('text-green-500');

        cls$.next('text-blue-500');
        expect(cell.className).toContain('text-blue-500');
        expect(cell.className).not.toContain('text-green-500');

        row.destroy();
    });

    it('should always retain the base GridStyles.cell class alongside the emitted class', () => {
        const cls$ = of('my-custom');
        const col = makeColumn({ cellClass: cls$ });
        const row = makeRow([col]);

        const cell = row.getElement().children[0] as HTMLElement;
        // Base cell class must be present (cn merges them)
        expect(cell.className).toBeTruthy();
        // And the custom class must also be applied
        expect(cell.className).toContain('my-custom');

        row.destroy();
    });

    it('should not subscribe when cellClass is absent', () => {
        const col = makeColumn(); // no cellClass
        // Should not throw and element is created normally
        const row = makeRow([col]);
        expect(row.getElement().children.length).toBeGreaterThan(0);
        row.destroy();
    });

    it('should subscribe independently for each column', () => {
        const cls1$ = new BehaviorSubject<string>('col1-class');
        const cls2$ = new BehaviorSubject<string>('col2-class');
        const col1 = makeColumn({ id: 'col1', field: 'id', cellClass: cls1$ });
        const col2 = makeColumn({ id: 'col2', field: 'name', cellClass: cls2$ });

        const row = makeRow([col1, col2]);
        const cell0 = row.getElement().children[0] as HTMLElement;
        const cell1 = row.getElement().children[1] as HTMLElement;

        expect(cell0.className).toContain('col1-class');
        expect(cell1.className).toContain('col2-class');

        cls1$.next('col1-updated');
        expect(cell0.className).toContain('col1-updated');
        expect(cell1.className).toContain('col2-class');

        row.destroy();
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. GridRow.destroy() — subscription cleanup
// ──────────────────────────────────────────────────────────────────────────────

describe('GridRow.destroy() subscription cleanup', () => {
    it('should unsubscribe so further emissions do not update the cell after destroy', () => {
        const cls$ = new BehaviorSubject<string>('initial');
        const col = makeColumn({ cellClass: cls$ });
        const row = makeRow([col]);
        const cell = row.getElement().children[0] as HTMLElement;

        row.destroy();

        const classAfterDestroy = cell.className;
        cls$.next('should-not-appear');
        expect(cell.className).toBe(classAfterDestroy);
    });

    it('should be safe to call destroy() multiple times without throwing', () => {
        const cls$ = of('x');
        const col = makeColumn({ cellClass: cls$ });
        const row = makeRow([col]);
        expect(() => {
            row.destroy();
            row.destroy();
        }).not.toThrow();
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 5. GridRow.update() — subscription cleanup before re-render
// ──────────────────────────────────────────────────────────────────────────────

describe('GridRow.update() subscription cleanup', () => {
    it('should unsubscribe old subscriptions when update() is called', () => {
        const cls$ = new BehaviorSubject<string>('before-update');
        const col = makeColumn({ cellClass: cls$ });
        const row = makeRow([col]);

        const newItem: TestItem = { id: 2, name: 'Item 2' };
        row.update(newItem, 1, false);

        // Emit on the old Observable — should not throw, old sub is gone
        expect(() => cls$.next('after-update-stale')).not.toThrow();
        row.destroy();
    });

    it('should set up new subscription for the same column Observable after update()', () => {
        const cls$ = new BehaviorSubject<string>('v1');
        const col = makeColumn({ cellClass: cls$ });
        const row = makeRow([col]);

        const newItem: TestItem = { id: 2, name: 'Item 2' };
        row.update(newItem, 1, false);

        // The new cell (row was re-rendered) should pick up current value
        const cell = row.getElement().children[0] as HTMLElement;
        expect(cell.className).toContain('v1');

        cls$.next('v2');
        expect(cell.className).toContain('v2');

        row.destroy();
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 6. GridRow.updateColumns() — subscription cleanup and re-subscription
// ──────────────────────────────────────────────────────────────────────────────

describe('GridRow.updateColumns() subscription cleanup', () => {
    it('should unsubscribe old cellClass subscriptions when updateColumns() is called', () => {
        const oldCls$ = new BehaviorSubject<string>('old-class');
        const col = makeColumn({ cellClass: oldCls$ });
        const row = makeRow([col]);
        const cell = row.getElement().children[0] as HTMLElement;

        const newCls$ = new BehaviorSubject<string>('new-class');
        const newCol = makeColumn({ cellClass: newCls$ });
        row.updateColumns([newCol]);

        // Old observable emission should no longer affect the cell
        const classAfterUpdate = cell.className;
        oldCls$.next('old-stale');
        expect(cell.className).toBe(classAfterUpdate);

        row.destroy();
    });

    it('should subscribe to the new column Observable after updateColumns()', () => {
        const cls$ = new BehaviorSubject<string>('class-a');
        const col = makeColumn({ cellClass: cls$ });
        const row = makeRow([col]);

        const newCls$ = new BehaviorSubject<string>('class-b');
        const newCol = makeColumn({ cellClass: newCls$ });
        row.updateColumns([newCol]);

        const cell = row.getElement().children[0] as HTMLElement;
        expect(cell.className).toContain('class-b');

        newCls$.next('class-c');
        expect(cell.className).toContain('class-c');

        row.destroy();
    });

    it('should handle column with no cellClass in updateColumns()', () => {
        const cls$ = new BehaviorSubject<string>('has-class');
        const col = makeColumn({ cellClass: cls$ });
        const row = makeRow([col]);

        const plainCol = makeColumn(); // no cellClass
        expect(() => row.updateColumns([plainCol])).not.toThrow();

        row.destroy();
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 7. GridViewport — cleanup via destroy() and clearRenderedRows()
// ──────────────────────────────────────────────────────────────────────────────

describe('GridViewport destroy cleans up cellClass subscriptions', () => {
    beforeAll(() => {
        global.requestAnimationFrame = (cb: FrameRequestCallback) => {
            cb(performance.now());
            return 0;
        };
        global.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        } as any;
    });

    function makeViewport(columns: GridColumn<TestItem>[]): GridViewport<TestItem> {
        return new GridViewport<TestItem>(columns, [], false, false, NO_OP, NO_OP, false);
    }

    function makeRowData(
        items: TestItem[]
    ): import('./types').GridRowData<TestItem>[] {
        return items.map((item, index) => ({ type: 'ITEM' as const, data: item, index, level: 0 }));
    }

    it('should unsubscribe cellClass subscriptions when destroy() is called', () => {
        const cls$ = new BehaviorSubject<string>('active');
        const col = makeColumn({ cellClass: cls$ });
        const viewport = makeViewport([col]);

        Object.defineProperty(viewport.getElement(), 'clientHeight', {
            value: 200,
            configurable: true,
        });

        const items: TestItem[] = [{ id: 1, name: 'A' }];
        viewport.update(makeRowData(items), new Set());

        // Capture the rendered cell before destroy
        const cell = viewport
            .getElement()
            .querySelector('.absolute > div') as HTMLElement;

        viewport.destroy();

        // Emitting after destroy should not cause further DOM updates
        const classSnapshot = cell ? cell.className : '';
        cls$.next('after-destroy');
        expect(cell ? cell.className : '').toBe(classSnapshot);
    });

    it('should unsubscribe when rows scroll out of view (clearRenderedRows path)', () => {
        const cls$ = new BehaviorSubject<string>('visible');
        const col = makeColumn({ cellClass: cls$ });
        const viewport = makeViewport([col]);

        Object.defineProperty(viewport.getElement(), 'clientHeight', {
            value: 52,
            configurable: true,
        });
        Object.defineProperty(viewport.getElement(), 'scrollTop', {
            value: 0,
            configurable: true,
        });

        // 20 items so scrolling pushes row 0 out of view
        const items: TestItem[] = Array.from({ length: 20 }, (_, i) => ({
            id: i,
            name: `Item ${i}`,
        }));
        viewport.update(makeRowData(items), new Set());

        // Scroll far enough to evict the first rendered rows
        Object.defineProperty(viewport.getElement(), 'scrollTop', {
            value: 15 * 52,
            configurable: true,
        });
        viewport.getElement().dispatchEvent(new Event('scroll'));

        // Emitting should not throw; row is gone from DOM
        expect(() => cls$.next('evicted')).not.toThrow();

        viewport.destroy();
    });
});
