/**
 * CustomColumnBuilder — unit tests
 *
 * Covers:
 *  - withRenderer / render()
 *  - asEditable(focusTarget) wiring: sets editable + focusEditableCell, never renderEditor
 *  - GridRow identity fix (#33): the custom renderer is NOT re-invoked (and the DOM is left
 *    untouched) when populateCell runs again for the same item reference (e.g. on column
 *    resize / updateColumns), but IS re-invoked when the row's item changes.
 *  - GridRow teardown (#32): a registerDestroy callback registered inside custom cell content
 *    fires when the row is destroyed (grid removal path).
 *  - Keyboard chain (#35): a focus-only custom cell is included in getEditableCells() and
 *    Tab/Enter/Arrow land on (and focus) its resolved focus target — resolved fresh on every
 *    activation, never cached.
 */

import { GridRow } from '../grid-row';
import { GridColumn, ColumnType } from '../types';
import { CustomColumnBuilder } from './custom-column';
import { TextColumnBuilder } from './text-column';
import { registerDestroy } from '../../../core/destroyable-element';

beforeAll(() => {
    global.requestAnimationFrame = (cb: FrameRequestCallback) => {
        cb(performance.now());
        return 0;
    };
});

function buildRow<ITEM>(
    item: ITEM,
    columns: GridColumn<ITEM>[],
    opts: {
        isEditable?: boolean;
        onRequestNextRow?: (rowIndex: number) => void;
        onRequestPreviousRow?: (rowIndex: number) => void;
        onRequestRowAbove?: (rowIndex: number, columnIndex: number) => void;
        onRequestRowBelow?: (rowIndex: number, columnIndex: number) => void;
    } = {}
): GridRow<ITEM> {
    return new GridRow(
        item,
        0,
        columns,
        [],
        false,
        false,
        opts.isEditable ?? true,
        () => {},
        0,
        false,
        () => {},
        opts.onRequestNextRow ?? (() => {}),
        opts.onRequestPreviousRow ?? (() => {}),
        () => {},
        () => {},
        opts.onRequestRowAbove ?? (() => {}),
        opts.onRequestRowBelow ?? (() => {})
    );
}

describe('CustomColumnBuilder', () => {
    interface Item { id: number; label: string; }

    it('withRenderer drives render()', () => {
        const col = new CustomColumnBuilder<Item>()
            .withRenderer((item) => `custom:${item.label}`)
            .build();
        expect(col.render({ id: 1, label: 'A' })).toBe('custom:A');
    });

    it('column type is CUSTOM', () => {
        const col = new CustomColumnBuilder<Item>().build();
        expect(col.type).toBe(ColumnType.CUSTOM);
    });

    describe('asEditable(focusTarget)', () => {
        it('does not set focusEditableCell or editable when asEditable() is not called', () => {
            const col = new CustomColumnBuilder<Item>().build();
            expect(col.editable).toBeFalsy();
            expect(col.focusEditableCell).toBeUndefined();
        });

        it('sets editable and focusEditableCell when asEditable() is called', () => {
            const col = new CustomColumnBuilder<Item>().asEditable().build();
            expect(col.editable).toBe(true);
            expect(col.focusEditableCell).toBeInstanceOf(Function);
        });

        it('never sets renderEditor — custom columns use the focus-only chain, not a value editor', () => {
            const col = new CustomColumnBuilder<Item>().asEditable().build();
            expect(col.renderEditor).toBeUndefined();
        });

        it('default focusTarget resolves the first focusable descendant', () => {
            const col = new CustomColumnBuilder<Item>()
                .withRenderer(() => {
                    const wrapper = document.createElement('div');
                    const span = document.createElement('span');
                    span.textContent = 'not focusable';
                    const button = document.createElement('button');
                    button.textContent = 'Edit';
                    wrapper.appendChild(span);
                    wrapper.appendChild(button);
                    return wrapper;
                })
                .asEditable()
                .build();

            const cell = document.createElement('div');
            cell.appendChild(col.render({ id: 1, label: 'A' }) as HTMLElement);
            const target = col.focusEditableCell!(cell);
            expect(target?.tagName).toBe('BUTTON');
        });

        it('a custom focusTarget function is used when provided', () => {
            const col = new CustomColumnBuilder<Item>()
                .withRenderer(() => {
                    const wrapper = document.createElement('div');
                    const input = document.createElement('input');
                    input.className = 'my-target';
                    wrapper.appendChild(input);
                    return wrapper;
                })
                .asEditable((cellEl) => cellEl.querySelector('.my-target'))
                .build();

            const cell = document.createElement('div');
            cell.appendChild(col.render({ id: 1, label: 'A' }) as HTMLElement);
            const target = col.focusEditableCell!(cell);
            expect(target?.classList.contains('my-target')).toBe(true);
        });
    });
});

describe('GridRow — custom cell identity (#33)', () => {
    interface Item { id: number; label: string; }

    it('does NOT re-invoke the renderer or touch the DOM when the item reference is unchanged', () => {
        const renderer = jest.fn((item: Item) => {
            const span = document.createElement('span');
            span.textContent = item.label;
            return span;
        });
        const col = new CustomColumnBuilder<Item>().withRenderer(renderer).build();
        const item: Item = { id: 1, label: 'A' };

        const row = buildRow(item, [col], { isEditable: false });
        document.body.appendChild(row.getElement());

        expect(renderer).toHaveBeenCalledTimes(1);
        const mountedNode = row.getElement().children[0].firstChild;

        // Re-populate via updateColumns (e.g. triggered by a column resize/visibility
        // change) with the SAME item reference — the renderer must not run again and the
        // mounted node must be left untouched.
        row.updateColumns([col]);
        row.updateColumns([col]);

        expect(renderer).toHaveBeenCalledTimes(1);
        expect(row.getElement().children[0].firstChild).toBe(mountedNode);

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('IS re-invoked when the row is updated with a different item', () => {
        const renderer = jest.fn((item: Item) => {
            const span = document.createElement('span');
            span.textContent = item.label;
            return span;
        });
        const col = new CustomColumnBuilder<Item>().withRenderer(renderer).build();
        const itemA: Item = { id: 1, label: 'A' };
        const itemB: Item = { id: 2, label: 'B' };

        const row = buildRow(itemA, [col], { isEditable: false });
        document.body.appendChild(row.getElement());
        expect(renderer).toHaveBeenCalledTimes(1);

        row.update(itemB, 1, false, 0);

        expect(renderer).toHaveBeenCalledTimes(2);
        expect(renderer).toHaveBeenLastCalledWith(itemB);

        row.destroy();
        document.body.removeChild(row.getElement());
    });
});

describe('GridRow — teardown reaches custom cell content (#32)', () => {
    interface Item { id: number; label: string; }

    it('a registerDestroy callback registered inside custom cell content fires on row.destroy()', () => {
        const onDestroy = jest.fn();
        const col = new CustomColumnBuilder<Item>()
            .withRenderer(() => {
                const wrapper = document.createElement('div');
                registerDestroy(wrapper, onDestroy);
                return wrapper;
            })
            .build();
        const item: Item = { id: 1, label: 'A' };

        const row = buildRow(item, [col], { isEditable: false });
        document.body.appendChild(row.getElement());

        expect(onDestroy).not.toHaveBeenCalled();

        row.destroy();

        expect(onDestroy).toHaveBeenCalledTimes(1);

        document.body.removeChild(row.getElement());
    });

    it('tears the previous content down on ROW RECYCLING (the row is reused for a different item)', () => {
        // The virtual viewport recycles a GridRow for a different item as the user scrolls
        // (GridViewport.renderItemRow -> row.update). The outgoing custom content must be
        // detached — and therefore destroyed — exactly like the whole-grid removal path,
        // otherwise every scroll leaks one live subscription per custom cell.
        const destroyCalls: string[] = [];
        const col = new CustomColumnBuilder<Item>()
            .withRenderer((item) => {
                const wrapper = document.createElement('div');
                wrapper.textContent = item.label;
                registerDestroy(wrapper, () => destroyCalls.push(item.label));
                return wrapper;
            })
            .build();

        const itemA: Item = { id: 1, label: 'A' };
        const itemB: Item = { id: 2, label: 'B' };

        const row = buildRow(itemA, [col], { isEditable: false });
        document.body.appendChild(row.getElement());
        expect(destroyCalls).toEqual([]);

        // Recycle the row for a different item.
        row.update(itemB, 1, false, 0);
        expect(destroyCalls).toEqual(['A']);

        // ...and again: only the now-outgoing B content is torn down.
        const itemC: Item = { id: 3, label: 'C' };
        row.update(itemC, 2, false, 0);
        expect(destroyCalls).toEqual(['A', 'B']);

        row.destroy();
        expect(destroyCalls).toEqual(['A', 'B', 'C']);

        document.body.removeChild(row.getElement());
    });

    it('does NOT tear the content down when the row is re-rendered for the SAME item reference', () => {
        // An unrelated emission (selection change, re-render with the same item) must not
        // destroy/rebuild live custom content — that is what the identity check in
        // renderDisplayContent() protects.
        const onDestroy = jest.fn();
        const renderer = jest.fn((item: Item) => {
            const wrapper = document.createElement('div');
            wrapper.textContent = item.label;
            registerDestroy(wrapper, onDestroy);
            return wrapper;
        });
        const col = new CustomColumnBuilder<Item>().withRenderer(renderer).build();
        const item: Item = { id: 1, label: 'A' };

        const row = buildRow(item, [col], { isEditable: false });
        document.body.appendChild(row.getElement());
        const mounted = row.getElement().children[0].firstChild;

        // Same item reference, new index/selection state (the virtual viewport's normal
        // "row moved / got selected" path).
        row.update(item, 4, true, 0);
        row.updateSelection(false);

        expect(renderer).toHaveBeenCalledTimes(1);
        expect(onDestroy).not.toHaveBeenCalled();
        expect(row.getElement().children[0].firstChild).toBe(mounted);

        row.destroy();
        document.body.removeChild(row.getElement());
    });
});

describe('GridRow — asEditable custom cell in the keyboard chain (#35)', () => {
    interface Item { name: string; note: string; }

    function makeCustomCol(buttonLabel: string) {
        return new CustomColumnBuilder<Item>()
            .withRenderer((item) => {
                const wrapper = document.createElement('div');
                const button = document.createElement('button');
                button.textContent = `${buttonLabel}:${item.note}`;
                wrapper.appendChild(button);
                return wrapper;
            })
            .asEditable()
            .build();
    }

    it('getEditableCells includes the focus-only custom cell alongside a value-editable cell', () => {
        const item: Item = { name: 'A', note: 'n1' };
        const textCol = new TextColumnBuilder<Item>('name').asEditable().build();
        const customCol = makeCustomCol('Open');

        const row = buildRow(item, [textCol, customCol]);
        document.body.appendChild(row.getElement());

        const cells = Array.from(row.getElement().children) as HTMLElement[];
        // The text cell has no natively-focusable content of its own — it stays the Tab stop.
        expect(cells[0].tabIndex).toBe(0);
        // The custom cell's rendered content is a <button> (natively focusable, default
        // tabIndex 0) — the cell wrapper itself must NOT also be a Tab stop (would be a
        // double stop: [cell] then [button]), so it gets tabIndex=-1. It remains
        // programmatically focusable/clickable for our own Tab-chain machinery.
        expect(cells[1].tabIndex).toBe(-1);

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('falls back to tabIndex=0 when no focus target is resolved (nothing natively focusable rendered yet)', () => {
        const item: Item = { name: 'A', note: 'n1' };
        const col = new CustomColumnBuilder<Item>()
            .withRenderer(() => document.createElement('span')) // no focusable descendant
            .asEditable()
            .build();

        const row = buildRow(item, [col]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        expect(cell.tabIndex).toBe(0);

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('a disabled-only cell (default focus target selector excludes it) keeps cell tabIndex 0 and falls back to focusing the cell on click', () => {
        const item: Item = { name: 'A', note: 'n1' };
        const col = new CustomColumnBuilder<Item>()
            .withRenderer(() => {
                const wrapper = document.createElement('div');
                const button = document.createElement('button');
                button.disabled = true;
                button.textContent = 'disabled';
                wrapper.appendChild(button);
                return wrapper;
            })
            .asEditable() // default focusTarget selector — must skip the disabled button
            .build();

        const row = buildRow(item, [col]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        // DEFAULT_FOCUSABLE_SELECTOR excludes :disabled — nothing resolves, so the cell itself
        // stays the (only) Tab stop, same as the "nothing focusable rendered" case.
        expect(cell.tabIndex).toBe(0);

        cell.click();
        expect(document.activeElement).toBe(cell);

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('Tab from the value-editor cell lands focus on the custom cell\'s focus target, not the cell itself', () => {
        const item: Item = { name: 'A', note: 'n1' };
        const textCol = new TextColumnBuilder<Item>('name').asEditable().build();
        const customCol = makeCustomCol('Open');

        const row = buildRow(item, [textCol, customCol]);
        document.body.appendChild(row.getElement());

        const textCell = row.getElement().children[0] as HTMLElement;
        textCell.click(); // enters edit mode on the text cell
        const input = textCell.querySelector('input') as HTMLInputElement;
        expect(input).toBeTruthy();

        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

        const customCell = row.getElement().children[1] as HTMLElement;
        const button = customCell.querySelector('button') as HTMLButtonElement;
        expect(document.activeElement).toBe(button);
        // Activating the custom cell never opens an "editor" — no dataset.editing is set.
        expect(customCell.dataset.editing).toBeUndefined();

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('clicking the custom cell focuses the resolved target directly, fresh on each click (no caching)', () => {
        let renderCount = 0;
        const item: Item = { name: 'A', note: 'n1' };
        const col = new CustomColumnBuilder<Item>()
            .withRenderer((i) => {
                renderCount++;
                const wrapper = document.createElement('div');
                const button = document.createElement('button');
                button.textContent = `${i.note}-${renderCount}`;
                wrapper.appendChild(button);
                return wrapper;
            })
            .asEditable()
            .build();

        const row = buildRow(item, [col]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click();
        const firstButton = cell.querySelector('button');
        expect(document.activeElement).toBe(firstButton);

        // Item changes -> content (and its focusable button) is replaced with a new node.
        const item2: Item = { name: 'B', note: 'n2' };
        row.update(item2, 1, false, 0);
        const cell2 = row.getElement().children[0] as HTMLElement;
        cell2.click();
        const secondButton = cell2.querySelector('button');

        expect(secondButton).not.toBe(firstButton);
        expect(document.activeElement).toBe(secondButton);

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('Enter on the focused custom cell (before activation) focuses the target without opening an editor', () => {
        const item: Item = { name: 'A', note: 'n1' };
        const customCol = makeCustomCol('Open');

        const row = buildRow(item, [customCol]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        const button = cell.querySelector('button');
        expect(document.activeElement).toBe(button);
        expect(cell.dataset.editing).toBeUndefined();

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('a bubbled click already landing on the focused descendant does not steal focus back to a different node', () => {
        const item: Item = { name: 'A', note: 'n1' };
        const col = new CustomColumnBuilder<Item>()
            .withRenderer(() => {
                const wrapper = document.createElement('div');
                const first = document.createElement('button');
                first.textContent = 'first';
                const second = document.createElement('input');
                wrapper.appendChild(first);
                wrapper.appendChild(second);
                return wrapper;
            })
            .asEditable((cellEl) => cellEl.querySelector('input'))
            .build();

        const row = buildRow(item, [col]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        const input = cell.querySelector('input') as HTMLInputElement;
        // The user directly focuses/clicks the nested <input> itself (native focusable
        // behaviour, not our JS) — simulate that click bubbling up to the cell.
        input.focus();
        const bubbledClick = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(bubbledClick, 'target', { value: input, configurable: true });
        cell.dispatchEvent(bubbledClick);

        // Our click handler must NOT re-resolve/refocus the configured target (which would
        // yank focus back to `input` anyway here, but the point is it must not run at all
        // when the click already landed on an already-focused descendant) — activeElement
        // stays exactly where the user put it.
        expect(document.activeElement).toBe(input);

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('a click on an INERT descendant (icon/span) does not hijack focus, and the cell stays the live chain link', () => {
        // Reviewer NIT (1): the click handler bails out for any click whose target is a
        // descendant of the cell — including an inert <span>/icon that can never take focus.
        // In a real browser this is safe: mousedown on non-focusable content moves focus to
        // the nearest focusable ancestor, which here IS the cell (it always carries an
        // explicit tabIndex, 0 or -1, so it is mouse-focusable). jsdom does not implement
        // that native focus-ancestor behaviour, so this test asserts the two halves that ARE
        // ours: (a) our handler must not steal focus elsewhere, and (b) once the cell holds
        // focus, the Tab/Arrow chain is still alive from it.
        const item: Item = { name: 'A', note: 'n1' };
        const onRequestRowBelow = jest.fn();
        const col = new CustomColumnBuilder<Item>()
            .withRenderer(() => {
                const wrapper = document.createElement('div');
                const icon = document.createElement('span');
                icon.textContent = '★'; // inert: not focusable, not the focus target
                const button = document.createElement('button');
                button.textContent = 'Open';
                wrapper.appendChild(icon);
                wrapper.appendChild(button);
                return wrapper;
            })
            .asEditable()
            .build();

        const row = buildRow(item, [col], { onRequestRowBelow });
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        const icon = cell.querySelector('span') as HTMLElement;
        const button = cell.querySelector('button') as HTMLButtonElement;

        // A focusable target exists, so the cell is a programmatic-only stop.
        expect(cell.tabIndex).toBe(-1);

        const bubbledClick = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(bubbledClick, 'target', { value: icon, configurable: true });
        cell.dispatchEvent(bubbledClick);

        // Our handler must not yank focus onto the button behind the user's back.
        expect(document.activeElement).not.toBe(button);

        // The browser's own "focus the nearest focusable ancestor" step, which jsdom omits.
        cell.focus();
        expect(document.activeElement).toBe(cell);

        // Chain is alive from the cell: Arrow navigation still routes through the row.
        cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(onRequestRowBelow).toHaveBeenCalled();

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('re-resolves and refocuses when a real click lands on the cell wrapper itself (not a focused descendant)', () => {
        const item: Item = { name: 'A', note: 'n1' };
        const customCol = makeCustomCol('Open');

        const row = buildRow(item, [customCol]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click(); // .click() targets the cell itself

        const button = cell.querySelector('button');
        expect(document.activeElement).toBe(button);

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('falls back to focusing the cell itself when focusEditableCell resolves to null', () => {
        const item: Item = { name: 'A', note: 'n1' };
        const col = new CustomColumnBuilder<Item>()
            .withRenderer(() => document.createElement('span')) // no focusable descendant
            .asEditable() // default focus target resolver -> finds nothing -> null
            .build();

        const row = buildRow(item, [col]);
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        cell.click();

        expect(document.activeElement).toBe(cell);

        row.destroy();
        document.body.removeChild(row.getElement());
    });

    it('ignores a keydown that bubbled up from inside the cell content instead of the cell itself', () => {
        const item: Item = { name: 'A', note: 'n1' };
        const onRequestRowBelow = jest.fn();
        const col = new CustomColumnBuilder<Item>()
            .withRenderer(() => {
                const wrapper = document.createElement('div');
                const input = document.createElement('input');
                wrapper.appendChild(input);
                return wrapper;
            })
            .asEditable((cellEl) => cellEl.querySelector('input'))
            .build();

        const row = buildRow(item, [col], { onRequestRowBelow });
        document.body.appendChild(row.getElement());

        const cell = row.getElement().children[0] as HTMLElement;
        const input = cell.querySelector('input') as HTMLInputElement;

        // ArrowDown typed while focus is inside the nested <input> — must be left alone for
        // the input's own native behaviour (e.g. cursor movement), not reinterpreted as a
        // request to jump to the row below.
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

        expect(onRequestRowBelow).not.toHaveBeenCalled();

        row.destroy();
        document.body.removeChild(row.getElement());
    });
});
