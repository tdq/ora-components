/**
 * Grid Inline Editing — unit tests
 *
 * Covers:
 *  - BaseColumnBuilder.asEditable() sets editable flag and wires renderEditor
 *  - GridBuilder.asEditable(onCommit) stores callback
 *  - GridRow: click activates editor, Enter (display mode) activates editor,
 *             Enter (editor active) commits, Escape reverts,
 *             Tab commits + moves to next editable cell / next row
 *  - Boolean column: immediate commit on checkbox change
 *  - Glass mode: editors receive isGlass=true
 *  - Per-column editor factories: text, number, percentage, money, date, boolean
 */

import { BehaviorSubject, of } from 'rxjs';
import { GridRow } from './grid-row';
import { GridColumn, ColumnType, CellEditor } from './types';
import { Money } from '../../types/money';
import { TextColumnBuilder } from './columns/text-column';
import { NumberColumnBuilder } from './columns/number-column';
import { PercentageColumnBuilder } from './columns/percentage-column';
import { MoneyColumnBuilder } from './columns/money-column';
import { DateColumnBuilder } from './columns/date-column';
import { BooleanColumnBuilder } from './columns/boolean-column';
import { BaseColumnBuilder } from './columns/base-column-builder';

// ─── helpers ─────────────────────────────────────────────────────────────────

beforeAll(() => {
    global.requestAnimationFrame = (cb: FrameRequestCallback) => {
        cb(performance.now());
        return 0;
    };
});

/**
 * Build a minimal GridColumn with a controllable editor spy so we can
 * independently test GridRow editing logic without real UI builders.
 */
function makeEditableColumn<ITEM>(
    field: keyof ITEM & string,
    type: ColumnType,
    editorFactory: (item: ITEM, isGlass: boolean) => CellEditor | null
): GridColumn<ITEM> {
    return {
        id: field,
        field,
        type,
        header: field,
        editable: true,
        render: (item) => String((item as any)[field] ?? ''),
        renderEditor: editorFactory,
    };
}

function makeTextEditor(initialValue: string): { editor: CellEditor; value$: BehaviorSubject<string> } {
    const value$ = new BehaviorSubject<string>(initialValue);
    const input = document.createElement('input');
    input.value = initialValue;
    input.addEventListener('input', () => value$.next(input.value));
    const editor: CellEditor = {
        element: input,
        getValue: () => value$.getValue(),
        focus: () => input.focus(),
    };
    return { editor, value$ };
}

function makeCheckboxEditor(initialValue: boolean): { editor: CellEditor; checkbox: HTMLInputElement } {
    const value$ = new BehaviorSubject<boolean>(initialValue);
    const wrapper = document.createElement('div');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = initialValue;
    wrapper.appendChild(checkbox);
    const editor: CellEditor = {
        element: wrapper,
        getValue: () => value$.getValue(),
        focus: () => checkbox.focus(),
    };
    // Simulate BehaviorSubject update on change
    checkbox.addEventListener('change', () => value$.next(checkbox.checked));
    return { editor, checkbox };
}

function buildRow<ITEM>(
    item: ITEM,
    columns: GridColumn<ITEM>[],
    opts: {
        isEditable?: boolean;
        isGlass?: boolean;
        onCommit?: (item: ITEM) => void;
        onRequestNextRow?: (rowIndex: number) => void;
        onRequestPreviousRow?: (rowIndex: number) => void;
        onActivateEditor?: (row: GridRow<ITEM>, cell: HTMLElement) => void;
        rowIndex?: number;
    } = {}
): GridRow<ITEM> {
    return new GridRow(
        item,
        opts.rowIndex ?? 0,
        columns,
        [],
        false,
        false,
        opts.isEditable ?? true,
        () => {},
        0,
        opts.isGlass ?? false,
        opts.onCommit ?? (() => {}),
        opts.onRequestNextRow ?? (() => {}),
        opts.onRequestPreviousRow ?? (() => {}),
        opts.onActivateEditor ?? (() => {})
    );
}

// ─── BaseColumnBuilder.asEditable() ──────────────────────────────────────────

describe('BaseColumnBuilder.asEditable()', () => {
    it('sets editable flag to true on the built column', () => {
        const col = new TextColumnBuilder<{ name: string }>('name')
            .asEditable()
            .build();
        expect(col.editable).toBe(true);
    });

    it('does not set editable flag when asEditable() is not called', () => {
        const col = new TextColumnBuilder<{ name: string }>('name').build();
        expect(col.editable).toBeFalsy();
    });

    it('populates renderEditor when asEditable() is called', () => {
        const col = new TextColumnBuilder<{ name: string }>('name')
            .asEditable()
            .build();
        expect(col.renderEditor).toBeInstanceOf(Function);
    });

    it('renderEditor is undefined when asEditable() is not called', () => {
        const col = new TextColumnBuilder<{ name: string }>('name').build();
        expect(col.renderEditor).toBeUndefined();
    });
});

// ─── GridBuilder.asEditable() API ────────────────────────────────────────────

describe('GridBuilder.asEditable(onCommit)', () => {
    it('builds without throwing', () => {
        const { GridBuilder } = require('./grid-builder');
        const onCommit = jest.fn();
        const builder = new GridBuilder<{ id: number; name: string }>()
            .withItems(of([{ id: 1, name: 'Test' }]))
            .withHeight(of(400))
            .asEditable(onCommit);
        builder.withColumns().addTextColumn('name').withHeader('Name').asEditable();
        expect(() => builder.build()).not.toThrow();
    });
});

// ─── GridRow: click activates editor ─────────────────────────────────────────

describe('GridRow — click activates editor', () => {
    interface Item { value: string }

    it('replaces display content with editor element on cell click', () => {
        const item: Item = { value: 'hello' };
        const { editor } = makeTextEditor('hello');
        const col = makeEditableColumn<Item>('value', ColumnType.TEXT, () => editor);
        const row = buildRow(item, [col]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        expect(cell.textContent).toBe('hello');

        cell.click();

        expect(cell.contains(editor.element)).toBe(true);
        expect(cell.dataset.editing).toBe('1');

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('does not re-enter edit mode if cell already editing', () => {
        const item: Item = { value: 'hello' };
        let callCount = 0;
        const col = makeEditableColumn<Item>('value', ColumnType.TEXT, () => {
            callCount++;
            return makeTextEditor('hello').editor;
        });
        const row = buildRow(item, [col]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click(); // first click — enters edit mode
        cell.click(); // second click — should be ignored

        expect(callCount).toBe(1);

        row.destroy();
        document.body.removeChild(row.getElement());
    });
});

// ─── GridRow: Enter key (display mode) activates editor ──────────────────────

describe('GridRow — Enter key in display mode activates editor', () => {
    interface Item { value: string }

    it('activates editor on Enter when cell is in display mode', () => {
        const item: Item = { value: 'world' };
        const { editor } = makeTextEditor('world');
        const col = makeEditableColumn<Item>('value', ColumnType.TEXT, () => editor);
        const row = buildRow(item, [col]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        expect(cell.dataset.editing).toBeUndefined();

        cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        expect(cell.dataset.editing).toBe('1');
        expect(cell.contains(editor.element)).toBe(true);

        row.destroy();
        document.body.removeChild(row.getElement());
    });
});

// ─── GridRow: Enter key (editor active) commits ───────────────────────────────

describe('GridRow — Enter key in editor commits', () => {
    interface Item { value: string }

    it('mutates item field and calls onCommit on Enter', () => {
        const item: Item = { value: 'original' };
        const onCommit = jest.fn();
        const value$ = new BehaviorSubject<string>('original');
        const input = document.createElement('input');
        input.value = 'original';
        const editor: CellEditor = {
            element: input,
            getValue: () => value$.getValue(),
            focus: () => input.focus(),
        };
        const col = makeEditableColumn<Item>('value', ColumnType.TEXT, () => editor);
        const row = buildRow(item, [col], { onCommit });
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click(); // enter edit mode

        // Simulate user typing a new value
        value$.next('updated');

        // Press Enter inside editor
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        expect(item.value).toBe('updated');
        expect(onCommit).toHaveBeenCalledWith(item);

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('returns cell to display mode after Enter commit', () => {
        const item: Item = { value: 'foo' };
        const { editor, value$ } = makeTextEditor('foo');
        const col = makeEditableColumn<Item>('value', ColumnType.TEXT, () => editor);
        const row = buildRow(item, [col]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click();
        value$.next('bar');

        editor.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        // After commit the editing dataset attribute should be gone
        expect(cell.dataset.editing).toBeUndefined();
        // The editor element should no longer be in the cell
        expect(cell.contains(editor.element)).toBe(false);

        row.destroy();
        document.body.removeChild(row.getElement());
    });
});

// ─── GridRow: Escape reverts ──────────────────────────────────────────────────

describe('GridRow — Escape reverts edit', () => {
    interface Item { value: string }

    it('restores original value on Escape and does not call onCommit', () => {
        const item: Item = { value: 'original' };
        const onCommit = jest.fn();
        const value$ = new BehaviorSubject<string>('original');
        const input = document.createElement('input');
        const editor: CellEditor = {
            element: input,
            getValue: () => value$.getValue(),
            focus: () => input.focus(),
        };
        const col = makeEditableColumn<Item>('value', ColumnType.TEXT, () => editor);
        const row = buildRow(item, [col], { onCommit });
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click();

        // Mutate via editor
        value$.next('changed');

        // Press Escape — should revert
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect(item.value).toBe('original');
        expect(onCommit).not.toHaveBeenCalled();

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('returns cell to display mode after Escape', () => {
        const item: Item = { value: 'foo' };
        const { editor } = makeTextEditor('foo');
        const col = makeEditableColumn<Item>('value', ColumnType.TEXT, () => editor);
        const row = buildRow(item, [col]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click();

        editor.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect(cell.dataset.editing).toBeUndefined();
        expect(cell.contains(editor.element)).toBe(false);

        row.destroy();
        document.body.removeChild(row.getElement());
    });
});

// ─── GridRow: Tab commits + moves to next editable cell ──────────────────────

describe('GridRow — Tab key navigation', () => {
    interface Item { a: string; b: string; c: string }

    function makeEditorForField(initial: string) {
        const value$ = new BehaviorSubject<string>(initial);
        const input = document.createElement('input');
        input.value = initial;
        const editor: CellEditor = {
            element: input,
            getValue: () => value$.getValue(),
            focus: () => input.click(), // click simulates entering edit mode on next cell
        };
        return { editor, value$, input };
    }

    it('Tab commits current cell and activates next editable cell in same row', () => {
        const item: Item = { a: 'A', b: 'B', c: 'C' };
        const onCommit = jest.fn();

        const editorA = makeEditorForField('A');
        const editorB = makeEditorForField('B');
        const nonEditorCol: GridColumn<Item> = {
            id: 'c', field: 'c', type: ColumnType.TEXT, header: 'C',
            editable: false,
            render: (i) => i.c,
        };

        const colA = makeEditableColumn<Item>('a', ColumnType.TEXT, () => editorA.editor);
        const colB = makeEditableColumn<Item>('b', ColumnType.TEXT, () => editorB.editor);

        const row = buildRow(item, [colA, colB, nonEditorCol], { onCommit });
        document.body.appendChild(row.getElement());

        const cellA = row.getElement().children[0] as HTMLElement;
        const cellB = row.getElement().children[1] as HTMLElement;

        // Enter edit mode on first cell
        cellA.click();
        editorA.value$.next('A-edited');

        // Press Tab on editor A
        editorA.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

        // A should be committed
        expect(item.a).toBe('A-edited');
        expect(onCommit).toHaveBeenCalledWith(item);
        // Cell A should no longer be editing
        expect(cellA.dataset.editing).toBeUndefined();

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('Tab from last editable cell calls onRequestNextRow', () => {
        const item: Item = { a: 'A', b: 'B', c: 'C' };
        const onRequestNextRow = jest.fn();
        const editorA = makeEditorForField('A');
        const col = makeEditableColumn<Item>('a', ColumnType.TEXT, () => editorA.editor);

        const row = buildRow(item, [col], { onRequestNextRow });
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click();

        editorA.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

        expect(onRequestNextRow).toHaveBeenCalledWith(0);

        row.destroy();
        document.body.removeChild(row.getElement());
    });
});

// ─── GridRow: Boolean column — immediate commit on checkbox change ───────────

describe('GridRow — Boolean column immediate commit', () => {
    interface Item { active: boolean }

    it('commits immediately when checkbox changes, without Enter', () => {
        const item: Item = { active: false };
        const onCommit = jest.fn();

        // Build an editor that looks like a boolean (checkbox-based)
        const { editor, checkbox } = makeCheckboxEditor(false);
        const col: GridColumn<Item> = {
            id: 'active',
            field: 'active',
            type: ColumnType.BOOLEAN, // triggers immediate-commit branch
            header: 'Active',
            editable: true,
            render: (i) => String(i.active),
            renderEditor: () => editor,
        };

        const row = buildRow(item, [col], { onCommit });
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click(); // enter edit mode

        // Simulate checkbox change
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));

        expect(item.active).toBe(true);
        expect(onCommit).toHaveBeenCalledWith(item);

        row.destroy();
        document.body.removeChild(row.getElement());
    });
});

// ─── Glass mode ──────────────────────────────────────────────────────────────

describe('GridRow — glass mode passes isGlass to editor', () => {
    interface Item { value: string }

    it('calls renderEditor with isGlass=true when row is in glass mode', () => {
        const item: Item = { value: 'test' };
        const renderEditor = jest.fn().mockReturnValue(makeTextEditor('test').editor);
        const col: GridColumn<Item> = {
            id: 'value', field: 'value', type: ColumnType.TEXT, header: 'Value',
            editable: true,
            render: (i) => i.value,
            renderEditor,
        };
        const row = buildRow(item, [col], { isGlass: true });
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click();

        expect(renderEditor).toHaveBeenCalledWith(item, true);

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('calls renderEditor with isGlass=false when row is not in glass mode', () => {
        const item: Item = { value: 'test' };
        const renderEditor = jest.fn().mockReturnValue(makeTextEditor('test').editor);
        const col: GridColumn<Item> = {
            id: 'value', field: 'value', type: ColumnType.TEXT, header: 'Value',
            editable: true,
            render: (i) => i.value,
            renderEditor,
        };
        const row = buildRow(item, [col], { isGlass: false });
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click();

        expect(renderEditor).toHaveBeenCalledWith(item, false);

        row.destroy();
        document.body.removeChild(row.getElement());
    });
});

// ─── Column editor factories ──────────────────────────────────────────────────

describe('TextColumnBuilder editor factory', () => {
    interface Item { name: string }

    it('createEditor returns CellEditor with correct initial value', () => {
        const item: Item = { name: 'Alice' };
        const col = new TextColumnBuilder<Item>('name').asEditable().build();
        const editor = col.renderEditor!(item, false)!;
        expect(editor).not.toBeNull();
        expect(editor.getValue()).toBe('Alice');
        expect(editor.element).toBeInstanceOf(HTMLElement);
    });

    it('createEditor returns CellEditor with empty string for null field', () => {
        const item = { name: null as any };
        const col = new TextColumnBuilder<{ name: string }>('name').asEditable().build();
        const editor = col.renderEditor!(item, false)!;
        expect(editor.getValue()).toBe('');
    });

    it('createEditor uses glass style when isGlass=true', () => {
        const item: Item = { name: 'Bob' };
        const col = new TextColumnBuilder<Item>('name').asEditable().build();
        // Should not throw; glass variant is applied internally
        expect(() => col.renderEditor!(item, true)).not.toThrow();
    });
});

describe('NumberColumnBuilder editor factory', () => {
    interface Item { amount: number }

    it('createEditor returns CellEditor with correct initial numeric value', () => {
        const item: Item = { amount: 42 };
        const col = new NumberColumnBuilder<Item>('amount').asEditable().build();
        const editor = col.renderEditor!(item, false)!;
        expect(editor.getValue()).toBe(42);
    });

    it('createEditor returns null value for null field', () => {
        const item = { amount: null as any };
        const col = new NumberColumnBuilder<{ amount: number }>('amount').asEditable().build();
        const editor = col.renderEditor!(item, false)!;
        expect(editor.getValue()).toBeNull();
    });
});

describe('PercentageColumnBuilder editor factory', () => {
    interface Item { rate: number }

    it('createEditor converts stored fraction to display percentage (0.75 → 75)', () => {
        const item: Item = { rate: 0.75 };
        const col = new PercentageColumnBuilder<Item>('rate').asEditable().build();
        const editor = col.renderEditor!(item, false)!;
        // The editor's BehaviorSubject should hold 75 (the display value)
        // getValue() should convert back to fraction
        expect(editor.getValue()).toBeCloseTo(0.75);
    });

    it('createEditor getValue converts display value back to fraction (75 → 0.75)', () => {
        const item: Item = { rate: 0.75 };
        const col = new PercentageColumnBuilder<Item>('rate').asEditable().build();
        const editor = col.renderEditor!(item, false)!;
        // The initial stored value is 0.75, displayed as 75, getValue() returns 0.75
        expect(editor.getValue()).toBeCloseTo(0.75);
    });

    it('render formats fraction as percentage string', () => {
        const builder = new PercentageColumnBuilder<Item>('rate');
        const item: Item = { rate: 0.5 };
        expect(builder.render(item)).toBe('50%');
    });

    it('render returns empty string for null', () => {
        const builder = new PercentageColumnBuilder<{ rate: number }>('rate');
        expect(builder.render({ rate: null as any })).toBe('');
    });
});

describe('MoneyColumnBuilder editor factory', () => {
    interface Item { price: Money }

    it('createEditor initial value matches money amount', () => {
        const item: Item = { price: { amount: 100, currencyId: 'USD' } };
        const col = new MoneyColumnBuilder<Item>('price').asEditable().build();
        const editor = col.renderEditor!(item, false)!;
        // getValue() should return a Money object with same currencyId
        const result = editor.getValue() as { amount: number; currencyId: string };
        expect(result.amount).toBe(100);
        expect(result.currencyId).toBe('USD');
    });

    it('createEditor preserves currencyId when amount changes', () => {
        const item: Item = { price: { amount: 50, currencyId: 'EUR' } };
        const col = new MoneyColumnBuilder<Item>('price').asEditable().build();
        const editor = col.renderEditor!(item, false)!;
        const result = editor.getValue() as { amount: number; currencyId: string };
        expect(result.currencyId).toBe('EUR');
    });

    it('createEditor handles null money gracefully', () => {
        const item = { price: null as any };
        const col = new MoneyColumnBuilder<{ price: any }>('price').asEditable().build();
        // Should not throw
        expect(() => col.renderEditor!(item, false)).not.toThrow();
    });
});

describe('DateColumnBuilder editor factory', () => {
    interface Item { date: string }

    it('createEditor returns a CellEditor with a Date value', () => {
        const item: Item = { date: '2024-01-15' };
        const col = new DateColumnBuilder<Item>('date').asEditable().build();
        const editor = col.renderEditor!(item, false)!;
        const val = editor.getValue() as Date | null;
        expect(val).toBeInstanceOf(Date);
        expect(val!.getFullYear()).toBe(2024);
    });

    it('createEditor returns null for null date field', () => {
        const item = { date: null as any };
        const col = new DateColumnBuilder<{ date: string }>('date').asEditable().build();
        const editor = col.renderEditor!(item, false)!;
        expect(editor.getValue()).toBeNull();
    });
});

describe('BooleanColumnBuilder editor factory', () => {
    interface Item { active: boolean }

    it('createEditor returns CellEditor with correct initial boolean value', () => {
        const item: Item = { active: true };
        const col = new BooleanColumnBuilder<Item>('active').asEditable().build();
        const editor = col.renderEditor!(item, false)!;
        expect(editor.getValue()).toBe(true);
    });

    it('createEditor treats falsy item field as false', () => {
        const item: Item = { active: false };
        const col = new BooleanColumnBuilder<Item>('active').asEditable().build();
        const editor = col.renderEditor!(item, false)!;
        expect(editor.getValue()).toBe(false);
    });
});

// ─── renderEditor is only populated when asEditable() is called ──────────────

describe('renderEditor wiring via createBaseColumn', () => {
    it('renderEditor is defined only when _editable is true', () => {
        const withEdit = new TextColumnBuilder<{ x: string }>('x').asEditable().build();
        const withoutEdit = new TextColumnBuilder<{ x: string }>('x').build();
        expect(withEdit.renderEditor).toBeDefined();
        expect(withoutEdit.renderEditor).toBeUndefined();
    });

    it('renderEditor delegates to createEditor with correct args', () => {
        const item = { x: 'hello' };
        const col = new TextColumnBuilder<{ x: string }>('x').asEditable().build();
        const editor = col.renderEditor!(item, false);
        expect(editor).not.toBeNull();
        expect(editor!.getValue()).toBe('hello');
    });
});

// ─── Non-editable cells should not show editor on click ──────────────────────

describe('GridRow — non-editable cells stay in display mode', () => {
    interface Item { value: string }

    it('clicking a non-editable cell does not activate an editor', () => {
        const item: Item = { value: 'display-only' };
        const col: GridColumn<Item> = {
            id: 'value', field: 'value', type: ColumnType.TEXT, header: 'Value',
            editable: false,
            render: (i) => i.value,
        };
        const row = buildRow(item, [col]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click();

        expect(cell.dataset.editing).toBeUndefined();
        expect(cell.textContent).toBe('display-only');

        row.destroy();
        document.body.removeChild(row.getElement());
    });
});

// ─── Shift+Tab: backward navigation within same row ──────────────────────────

describe('GridRow — Shift+Tab backward navigation (same row)', () => {
    interface Item { a: string; b: string; c: string }

    function makeEditorForField(initial: string) {
        const { BehaviorSubject } = require('rxjs');
        const value$ = new BehaviorSubject<string>(initial);
        const input = document.createElement('input');
        input.value = initial;
        const editor: CellEditor = {
            element: input,
            getValue: () => value$.getValue(),
            focus: () => {},
        };
        return { editor, value$, input };
    }

    it('Shift+Tab commits current cell and activates previous editable cell in same row', () => {
        const item: Item = { a: 'A', b: 'B', c: 'C' };
        const onCommit = jest.fn();
        const editorA = makeEditorForField('A');
        const editorB = makeEditorForField('B');
        const editorC = makeEditorForField('C');

        const colA = makeEditableColumn<Item>('a', ColumnType.TEXT, () => editorA.editor);
        const colB = makeEditableColumn<Item>('b', ColumnType.TEXT, () => editorB.editor);
        const colC = makeEditableColumn<Item>('c', ColumnType.TEXT, () => editorC.editor);

        const row = buildRow(item, [colA, colB, colC], { onCommit });
        document.body.appendChild(row.getElement());

        const cellA = row.getElement().children[0] as HTMLElement;
        const cellB = row.getElement().children[1] as HTMLElement;

        // Enter edit mode on cell B (the middle cell)
        cellB.click();
        expect(cellB.dataset.editing).toBe('1');

        editorB.value$.next('B-edited');

        // Press Shift+Tab on editor B — should commit B and activate A
        editorB.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));

        // B should be committed
        expect(item.b).toBe('B-edited');
        expect(onCommit).toHaveBeenCalledWith(item);
        // Cell B should no longer be editing
        expect(cellB.dataset.editing).toBeUndefined();
        // Cell A should now be in edit mode (activated via click)
        expect(cellA.dataset.editing).toBe('1');

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('Shift+Tab from second editable cell moves to first editable cell', () => {
        const item: Item = { a: 'A', b: 'B', c: 'C' };
        const editorA = makeEditorForField('A');
        const editorB = makeEditorForField('B');

        const colA = makeEditableColumn<Item>('a', ColumnType.TEXT, () => editorA.editor);
        const colB = makeEditableColumn<Item>('b', ColumnType.TEXT, () => editorB.editor);
        const nonEditorCol: GridColumn<Item> = {
            id: 'c', field: 'c', type: ColumnType.TEXT, header: 'C',
            editable: false,
            render: (i) => i.c,
        };

        const row = buildRow(item, [colA, colB, nonEditorCol]);
        document.body.appendChild(row.getElement());

        const cellA = row.getElement().children[0] as HTMLElement;
        const cellB = row.getElement().children[1] as HTMLElement;

        cellB.click();
        editorB.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));

        expect(cellA.dataset.editing).toBe('1');

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('Shift+Tab from first editable cell calls onRequestPreviousRow with row index', () => {
        const item: Item = { a: 'A', b: 'B', c: 'C' };
        const onRequestPreviousRow = jest.fn();
        const editorA = makeEditorForField('A');
        const col = makeEditableColumn<Item>('a', ColumnType.TEXT, () => editorA.editor);

        const row = buildRow(item, [col], { onRequestPreviousRow, rowIndex: 3 });
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click();

        editorA.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));

        expect(onRequestPreviousRow).toHaveBeenCalledWith(3);

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('Shift+Tab commits the current cell value before moving', () => {
        const item: Item = { a: 'A', b: 'B', c: 'C' };
        const onCommit = jest.fn();
        const editorA = makeEditorForField('A');
        const editorB = makeEditorForField('B');

        const colA = makeEditableColumn<Item>('a', ColumnType.TEXT, () => editorA.editor);
        const colB = makeEditableColumn<Item>('b', ColumnType.TEXT, () => editorB.editor);

        const row = buildRow(item, [colA, colB], { onCommit });
        document.body.appendChild(row.getElement());

        const cellB = row.getElement().children[1] as HTMLElement;
        cellB.click();
        editorB.value$.next('new-B');

        editorB.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));

        expect(item.b).toBe('new-B');
        expect(onCommit).toHaveBeenCalledWith(item);

        row.destroy();
        document.body.removeChild(row.getElement());
    });
});

// ─── Click-to-deactivate: onActivateEditor callback ─────────────────────────

describe('GridRow — onActivateEditor callback', () => {
    interface Item { a: string; b: string }

    function makeEditorForField(initial: string) {
        const { BehaviorSubject } = require('rxjs');
        const value$ = new BehaviorSubject<string>(initial);
        const input = document.createElement('input');
        input.value = initial;
        const editor: CellEditor = {
            element: input,
            getValue: () => value$.getValue(),
            focus: () => {},
        };
        return { editor, value$, input };
    }

    it('onActivateEditor is called with the row and cell when entering edit mode', () => {
        const item: Item = { a: 'A', b: 'B' };
        const onActivateEditor = jest.fn();
        const editorA = makeEditorForField('A');
        const col = makeEditableColumn<Item>('a', ColumnType.TEXT, () => editorA.editor);

        const row = buildRow(item, [col], { onActivateEditor });
        document.body.appendChild(row.getElement());

        const cellA = row.getElement().children[0] as HTMLElement;
        cellA.click();

        expect(onActivateEditor).toHaveBeenCalledWith(row, cellA);

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('onActivateEditor is called each time a different cell is clicked', () => {
        const item: Item = { a: 'A', b: 'B' };
        const onActivateEditor = jest.fn();
        const editorA = makeEditorForField('A');
        const editorB = makeEditorForField('B');
        const colA = makeEditableColumn<Item>('a', ColumnType.TEXT, () => editorA.editor);
        const colB = makeEditableColumn<Item>('b', ColumnType.TEXT, () => editorB.editor);

        const row = buildRow(item, [colA, colB], { onActivateEditor });
        document.body.appendChild(row.getElement());

        const cellA = row.getElement().children[0] as HTMLElement;
        const cellB = row.getElement().children[1] as HTMLElement;

        cellA.click();
        expect(onActivateEditor).toHaveBeenCalledTimes(1);
        expect(onActivateEditor).toHaveBeenLastCalledWith(row, cellA);

        // commit A first so B can be clicked (B is not yet editing)
        // We must exit editing on A before B click; simulate commit via Enter
        editorA.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        cellB.click();
        expect(onActivateEditor).toHaveBeenCalledTimes(2);
        expect(onActivateEditor).toHaveBeenLastCalledWith(row, cellB);

        row.destroy();
        document.body.removeChild(row.getElement());
    });
});

// ─── Click-to-deactivate: GridViewport.handleEditorActivate ─────────────────

describe('GridViewport — click-to-deactivate cross-cell editor commit', () => {
    interface Item { a: string; b: string }

    beforeAll(() => {
        global.ResizeObserver = class ResizeObserver {
            observe() {}
            unobserve() {}
            disconnect() {}
        } as any;
    });

    function makeEditableCol(field: keyof Item, editorFactory: () => CellEditor): GridColumn<Item> {
        return {
            id: field,
            field,
            type: ColumnType.TEXT,
            header: field,
            editable: true,
            render: (item) => String((item as any)[field] ?? ''),
            renderEditor: editorFactory,
        };
    }

    function makeInputEditor(initial: string) {
        const { BehaviorSubject } = require('rxjs');
        const value$ = new BehaviorSubject<string>(initial);
        const input = document.createElement('input');
        input.value = initial;
        const editor: CellEditor = {
            element: input,
            getValue: () => value$.getValue(),
            focus: () => {},
        };
        return { editor, value$, input };
    }

    it('clicking a second cell in a different row commits the first row editor', () => {
        const item1: Item = { a: 'A1', b: 'B1' };
        const item2: Item = { a: 'A2', b: 'B2' };
        const onCommit = jest.fn();

        const editorA1 = makeInputEditor('A1');
        const editorA2 = makeInputEditor('A2');

        const colA = makeEditableCol('a', () => editorA1.editor);
        const colB = makeEditableCol('b', () => editorA2.editor);

        const { GridViewport } = require('./grid-viewport');
        const viewport: import('./grid-viewport').GridViewport<Item> = new GridViewport<Item>(
            [colA, colB],
            [],
            false,
            true,
            () => {},
            () => {},
            false,
            onCommit
        );
        Object.defineProperty(viewport.getElement(), 'clientHeight', { value: 500, configurable: true });
        document.body.appendChild(viewport.getElement());

        const rowsData: import('./types').GridRowData<Item>[] = [
            { type: 'ITEM', data: item1, index: 0, level: 0 },
            { type: 'ITEM', data: item2, index: 1, level: 0 },
        ];
        viewport.update(rowsData, new Set());

        // Get row elements from the rows container
        const rowsContainer = viewport.getElement().querySelector('.relative') as HTMLElement;
        const renderedRows = Array.from(rowsContainer.querySelectorAll('.absolute')) as HTMLElement[];
        expect(renderedRows.length).toBeGreaterThanOrEqual(2);

        // Identify row 0 and row 1 by transform
        const row0El = renderedRows.find(r => r.style.transform === 'translateY(0px)')!;
        const row1El = renderedRows.find(r => r.style.transform === 'translateY(52px)')!;
        expect(row0El).toBeTruthy();
        expect(row1El).toBeTruthy();

        // Click cell A of row 0 — enters edit mode
        const cellA1 = row0El.children[0] as HTMLElement;
        cellA1.click();
        expect(cellA1.dataset.editing).toBe('1');

        // Type a new value
        editorA1.value$.next('A1-edited');

        // Click cell A of row 1 — should commit row 0's editor
        const cellA2 = row1El.children[0] as HTMLElement;
        cellA2.click();

        // Row 0 cell A should have been committed
        expect(item1.a).toBe('A1-edited');
        expect(onCommit).toHaveBeenCalledWith(item1);

        // Row 0 cell A should no longer be editing
        expect(cellA1.dataset.editing).toBeUndefined();

        document.body.removeChild(viewport.getElement());
    });

    it('clicking the same cell that is already editing does not re-commit', () => {
        const item: Item = { a: 'A', b: 'B' };
        const onCommit = jest.fn();
        // Track how many times renderEditor is called — it is called once per click into edit mode
        let renderCount = 0;
        const colA = makeEditableCol('a', () => {
            renderCount++;
            return makeInputEditor('A').editor;
        });
        const colB = makeEditableCol('b', () => makeInputEditor('B').editor);

        const { GridViewport } = require('./grid-viewport');
        const viewport = new GridViewport<Item>(
            [colA, colB],
            [],
            false,
            true,
            () => {},
            () => {},
            false,
            onCommit
        );
        Object.defineProperty(viewport.getElement(), 'clientHeight', { value: 500, configurable: true });
        document.body.appendChild(viewport.getElement());

        const rowsData: import('./types').GridRowData<Item>[] = [
            { type: 'ITEM', data: item, index: 0, level: 0 },
        ];
        viewport.update(rowsData, new Set());

        // The content div is '.relative', inside it is the rowsContainer '.absolute.inset-0',
        // and inside that are the actual row elements '.absolute.w-full'
        const allAbsolute = Array.from(
            viewport.getElement().querySelectorAll('.absolute') as NodeListOf<HTMLElement>
        );
        // Row elements have translateY transform; the rowsContainer does not
        const rowEl = allAbsolute.find(el => el.style.transform === 'translateY(0px)')!;
        expect(rowEl).toBeTruthy();
        const cellA = rowEl.children[0] as HTMLElement;

        // Click cell A — enters edit mode (renderEditor called once)
        cellA.click();
        expect(renderCount).toBe(1);
        expect(onCommit).not.toHaveBeenCalled();

        // Click the same cell again — editing guard in populateCell prevents re-entering edit mode
        cellA.click();
        expect(renderCount).toBe(1); // renderEditor not called again
        expect(onCommit).not.toHaveBeenCalled();

        document.body.removeChild(viewport.getElement());
    });
});

// ─── Row eviction commits open editor ────────────────────────────────────────

describe('GridViewport — row eviction commits open editor', () => {
    interface Item { value: string }

    beforeAll(() => {
        global.ResizeObserver = class ResizeObserver {
            observe() {}
            unobserve() {}
            disconnect() {}
        } as any;
    });

    it('scrolling a row out of view while editor is open commits the editor', () => {
        const items: Item[] = Array.from({ length: 50 }, (_, i) => ({ value: `v${i}` }));
        const onCommit = jest.fn();

        let editorForRow0: { value$: any; input: HTMLInputElement } | null = null;

        const col: GridColumn<Item> = {
            id: 'value',
            field: 'value',
            type: ColumnType.TEXT,
            header: 'Value',
            editable: true,
            render: (item) => item.value,
            renderEditor: (item) => {
                const { BehaviorSubject } = require('rxjs');
                const value$ = new BehaviorSubject<string>(item.value);
                const input = document.createElement('input');
                input.value = item.value;
                const editor: CellEditor = {
                    element: input,
                    getValue: () => value$.getValue(),
                    focus: () => {},
                };
                // Capture the editor created for row 0 (first call)
                if (editorForRow0 === null) {
                    editorForRow0 = { value$, input };
                }
                return editor;
            },
        };

        const { GridViewport } = require('./grid-viewport');
        const viewport = new GridViewport<Item>(
            [col],
            [],
            false,
            true,
            () => {},
            () => {},
            false,
            onCommit
        );

        // Set a small viewport so row 0 will go out of view on scroll
        Object.defineProperty(viewport.getElement(), 'clientHeight', { value: 104, configurable: true }); // ~2 rows
        document.body.appendChild(viewport.getElement());

        const rowsData: import('./types').GridRowData<Item>[] = items.map((item, i) => ({
            type: 'ITEM' as const,
            data: item,
            index: i,
            level: 0,
        }));
        viewport.update(rowsData, new Set());

        // Enter edit mode on row 0
        const rowsContainer = viewport.getElement().querySelector('.relative') as HTMLElement;
        const row0El = Array.from(rowsContainer.querySelectorAll('.absolute') as NodeListOf<HTMLElement>)
            .find(r => r.style.transform === 'translateY(0px)')!;
        expect(row0El).toBeTruthy();

        const cell0 = row0El.children[0] as HTMLElement;
        cell0.click();
        expect(cell0.dataset.editing).toBe('1');
        expect(editorForRow0).not.toBeNull();

        // Mutate the value
        editorForRow0!.value$.next('evicted-value');

        // Scroll far down so row 0 leaves the render window
        // buffer = 5, rowHeight = 52; need startIndex > 0
        // scrollTop = 1000 → startIndex = floor(1000/52) - 5 = 19 - 5 = 14 → row 0 is evicted
        Object.defineProperty(viewport.getElement(), 'scrollTop', { value: 1000, configurable: true });
        viewport.getElement().dispatchEvent(new Event('scroll'));

        // The editor should have been committed before the row was destroyed
        expect(onCommit).toHaveBeenCalled();
        const commitCallArg = onCommit.mock.calls[0][0] as Item;
        expect(commitCallArg.value).toBe('evicted-value');

        document.body.removeChild(viewport.getElement());
    });
});

// ─── enterEditMode: editor element fills cell (width/height 100%) ────────────

describe('GridRow — enterEditMode sets editor element size to 100%', () => {
    interface Item { value: string }

    it('editor element has width 100% when cell enters edit mode', () => {
        const item: Item = { value: 'hello' };
        const { editor } = makeTextEditor('hello');
        const col = makeEditableColumn<Item>('value', ColumnType.TEXT, () => editor);
        const row = buildRow(item, [col]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click();

        expect(editor.element.style.width).toBe('100%');

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('editor element has height 100% when cell enters edit mode', () => {
        const item: Item = { value: 'hello' };
        const { editor } = makeTextEditor('hello');
        const col = makeEditableColumn<Item>('value', ColumnType.TEXT, () => editor);
        const row = buildRow(item, [col]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click();

        expect(editor.element.style.height).toBe('100%');

        row.destroy();
        document.body.removeChild(row.getElement());
    });
});

// ─── showCellDisplay restores cell class with alignment and cellClass ─────────

describe('GridRow — showCellDisplay restores cell className', () => {
    interface Item { value: string }

    it('cell class includes alignment class after showCellDisplay (via Enter commit)', () => {
        const item: Item = { value: 'hello' };
        const { editor } = makeTextEditor('hello');
        const col: GridColumn<Item> = {
            id: 'value',
            field: 'value',
            type: ColumnType.TEXT,
            header: 'Value',
            editable: true,
            align: 'right',
            render: (i) => i.value,
            renderEditor: () => editor,
        };
        const row = buildRow(item, [col]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click();

        // Commit via Enter
        editor.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        // The base cell class should be restored including right-alignment classes
        expect(cell.className).toContain('justify-end');
        expect(cell.className).toContain('text-right');

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('cell class includes cellClass result after showCellDisplay (via Escape revert)', () => {
        const item: Item = { value: 'hello' };
        const { editor } = makeTextEditor('hello');
        const col: GridColumn<Item> = {
            id: 'value',
            field: 'value',
            type: ColumnType.TEXT,
            header: 'Value',
            editable: true,
            align: 'left',
            cellClass: () => 'my-custom-class',
            render: (i) => i.value,
            renderEditor: () => editor,
        };
        const row = buildRow(item, [col]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click();

        // Revert via Escape
        editor.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect(cell.className).toContain('my-custom-class');

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('cell class does not contain overflow-hidden or p-0 after showCellDisplay', () => {
        const item: Item = { value: 'hello' };
        const { editor } = makeTextEditor('hello');
        const col = makeEditableColumn<Item>('value', ColumnType.TEXT, () => editor);
        const row = buildRow(item, [col]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click();

        // Verify edit-mode classes were applied
        expect(cell.className).toContain('overflow-hidden');
        expect(cell.className).toContain('p-0');

        // Commit
        editor.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        // Edit-mode classes should be gone; the cell base class (px-4 truncate) restored
        expect(cell.className).not.toContain('overflow-hidden');
        expect(cell.className).not.toContain('p-0');

        row.destroy();
        document.body.removeChild(row.getElement());
    });
});

// ─── showCellDisplay cleans up __commitEdit ───────────────────────────────────

describe('GridRow — showCellDisplay cleans up __commitEdit', () => {
    interface Item { value: string }

    it('__commitEdit is removed from cell after editor commits', () => {
        const item: Item = { value: 'original' };
        const { editor } = makeTextEditor('original');
        const col = makeEditableColumn<Item>('value', ColumnType.TEXT, () => editor);
        const row = buildRow(item, [col]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click();

        // __commitEdit should be set while editing
        expect((cell as any).__commitEdit).toBeInstanceOf(Function);

        // Commit via Enter
        editor.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        // After commit, __commitEdit should be cleaned up
        expect((cell as any).__commitEdit).toBeUndefined();

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('__commitEdit is removed after Escape reverts', () => {
        const item: Item = { value: 'original' };
        const { editor } = makeTextEditor('original');
        const col = makeEditableColumn<Item>('value', ColumnType.TEXT, () => editor);
        const row = buildRow(item, [col]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click();

        expect((cell as any).__commitEdit).toBeInstanceOf(Function);

        editor.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect((cell as any).__commitEdit).toBeUndefined();

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('__commitEdit is removed after Tab navigation', () => {
        const item: Item = { value: 'original' };
        const onRequestNextRow = jest.fn();
        const { editor } = makeTextEditor('original');
        const col = makeEditableColumn<Item>('value', ColumnType.TEXT, () => editor);
        const row = buildRow(item, [col], { onRequestNextRow });
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click();

        expect((cell as any).__commitEdit).toBeInstanceOf(Function);

        editor.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

        expect((cell as any).__commitEdit).toBeUndefined();

        row.destroy();
        document.body.removeChild(row.getElement());
    });
});
