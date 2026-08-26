/**
 * EnumColumnBuilder — unit tests
 *
 * Covers:
 *  - render(): falls back to String(field) with no options/captionProvider, derives the
 *    label from withOptions(), and withItemCaptionProvider() wins when both are set.
 *  - withOptions() accepts a static array or a reactive Observable, driving both render()
 *    and the select editor from the same source (#20), subscribing exactly ONCE (no
 *    per-render resubscribe) and resolving correctly even for a non-replaying source.
 *  - createEditor(): builds a ComboBox editor seeded from the options, using the ComboBox's
 *    public B10 withValue()/select()/open() API rather than reaching into its internals;
 *    getValue() falls back to the raw stored value when it isn't among the options.
 *  - GridRow integration: a mouse click on an option (simulated via the B10 select() API)
 *    commits and exits editing immediately, without needing Enter/Tab; Arrow keys typed
 *    inside the ComboBox only move its own highlight and never commit/jump rows; Escape
 *    (before any selection) reverts without committing; no [popover] element is leaked in
 *    document.body after commit or cancel.
 */

import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { EnumColumnBuilder } from './enum-column';
import { GridRow } from '../grid-row';
import { GridColumn } from '../types';
import { ComboBoxBuilder, type ComboBoxElement } from '../../combobox/combobox-builder';

type Option = { value: any; label: string };

beforeAll(() => {
    global.requestAnimationFrame = (cb: FrameRequestCallback) => {
        cb(performance.now());
        return 0;
    };
});

describe('EnumColumnBuilder', () => {
    interface Item { status: string; }

    const options: Option[] = [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
    ];

    describe('render', () => {
        it('falls back to String(field) when neither withOptions nor withItemCaptionProvider is set', () => {
            const col = new EnumColumnBuilder<Item>('status').build();
            expect(col.render({ status: 'ACTIVE' })).toBe('ACTIVE');
        });

        it('uses the withOptions label for the current field value', () => {
            const col = new EnumColumnBuilder<Item>('status').withOptions(options).build();
            expect(col.render({ status: 'ACTIVE' })).toBe('Active');
            expect(col.render({ status: 'INACTIVE' })).toBe('Inactive');
        });

        it('withItemCaptionProvider wins over withOptions', () => {
            const col = new EnumColumnBuilder<Item>('status')
                .withOptions(options)
                .withItemCaptionProvider((item) => `custom:${item.status}`)
                .build();
            expect(col.render({ status: 'ACTIVE' })).toBe('custom:ACTIVE');
        });

        it('accepts a reactive Observable of options and reads its latest value', () => {
            const options$ = new BehaviorSubject<Option[]>([{ value: 'A', label: 'Alpha' }]);
            const col = new EnumColumnBuilder<Item>('status').withOptions(options$).build();

            expect(col.render({ status: 'A' } as any)).toBe('Alpha');

            options$.next([{ value: 'A', label: 'Alpha!' }]);
            expect(col.render({ status: 'A' } as any)).toBe('Alpha!');
        });
    });

    describe('withOptions() subscription lifecycle', () => {
        it('subscribes to the options Observable exactly once across multiple render() calls', () => {
            let subscribeCount = 0;
            const options$ = new Observable<Option[]>(subscriber => {
                subscribeCount++;
                subscriber.next(options);
            });
            const col = new EnumColumnBuilder<Item>('status').withOptions(options$).build();

            col.render({ status: 'ACTIVE' });
            col.render({ status: 'INACTIVE' });
            col.render({ status: 'ACTIVE' });

            expect(subscribeCount).toBe(1);
        });

        it('resolves a non-replaying Observable (bare Subject) once it emits, without needing a fresh subscribe per call', () => {
            const options$ = new Subject<Option[]>();
            const col = new EnumColumnBuilder<Item>('status').withOptions(options$).build();

            // Nothing has emitted yet at the time of this first render() call.
            expect(col.render({ status: 'A' } as any)).toBe('A');

            options$.next([{ value: 'A', label: 'Alpha' }]);

            // The SAME long-lived subscription (established on the first render() call above)
            // is what makes this next value visible — not a fresh subscribe here.
            expect(col.render({ status: 'A' } as any)).toBe('Alpha');
        });

        it('a new withOptions() call replaces the source and drops the previous subscription', () => {
            const first$ = new BehaviorSubject<Option[]>([{ value: 'A', label: 'First-A' }]);
            const col = new EnumColumnBuilder<Item>('status').withOptions(first$);
            expect(col.render({ status: 'A' } as any)).toBe('First-A');

            col.withOptions([{ value: 'A', label: 'Second-A' }]);
            expect(col.render({ status: 'A' } as any)).toBe('Second-A');

            // The old source updating afterwards must not leak back into this column.
            first$.next([{ value: 'A', label: 'First-A-updated' }]);
            expect(col.render({ status: 'A' } as any)).toBe('Second-A');
        });
    });

    describe('built column destroy() — options subscription teardown (architect option b)', () => {
        function trackedOptions$(): { options$: Observable<Option[]>; torn: () => boolean } {
            let torn = false;
            const options$ = new Observable<Option[]>(subscriber => {
                subscriber.next(options);
                return () => { torn = true; };
            });
            return { options$, torn: () => torn };
        }

        it('releases the options subscription when the (only) built column is destroyed', () => {
            const { options$, torn } = trackedOptions$();
            const builder = new EnumColumnBuilder<Item>('status').withOptions(options$);
            const col = builder.build();

            col.render({ status: 'ACTIVE' }); // triggers the lazy subscribe
            expect(torn()).toBe(false);

            col.destroy?.();

            expect(torn()).toBe(true);
        });

        it('is a no-op if the subscription was never established (destroy before any render/createEditor call)', () => {
            const { options$, torn } = trackedOptions$();
            const builder = new EnumColumnBuilder<Item>('status').withOptions(options$);
            const col = builder.build();

            expect(() => col.destroy?.()).not.toThrow();
            expect(torn()).toBe(false);
        });

        it('double-destroy is safe: calling destroy() twice does not throw or misbehave', () => {
            const { options$, torn } = trackedOptions$();
            const builder = new EnumColumnBuilder<Item>('status').withOptions(options$);
            const col = builder.build();
            col.render({ status: 'ACTIVE' });

            expect(() => {
                col.destroy?.();
                col.destroy?.();
            }).not.toThrow();
            expect(torn()).toBe(true);
        });

        it('a builder that produced two built columns (e.g. serving two grids) keeps the shared subscription alive until BOTH are destroyed', () => {
            const { options$, torn } = trackedOptions$();
            const builder = new EnumColumnBuilder<Item>('status').withOptions(options$);
            const colA = builder.build();
            const colB = builder.build();

            colA.render({ status: 'ACTIVE' }); // subscribes once, shared by both built columns

            colA.destroy?.();
            expect(torn()).toBe(false); // colB may still be in use elsewhere

            colB.destroy?.();
            expect(torn()).toBe(true); // last reference gone
        });
    });

    describe('createEditor', () => {
        it('renders a ComboBox editor exposing the B10 element API (select/open)', () => {
            const col = new EnumColumnBuilder<Item>('status').withOptions(options).asEditable().build();
            const editor = col.renderEditor!({ status: 'ACTIVE' }, false)!;

            expect(editor).not.toBeNull();
            expect(editor.element).toBeInstanceOf(HTMLElement);
            expect(typeof (editor.element as any).select).toBe('function');
            expect(typeof (editor.element as any).open).toBe('function');
        });

        it('getValue() initially returns the item\'s current field value', () => {
            const col = new EnumColumnBuilder<Item>('status').withOptions(options).asEditable().build();
            const editor = col.renderEditor!({ status: 'INACTIVE' }, false)!;
            expect(editor.getValue()).toBe('INACTIVE');
        });

        it('getValue() falls back to the raw stored value when it is not among the options', () => {
            const col = new EnumColumnBuilder<Item>('status').withOptions(options).asEditable().build();
            const editor = col.renderEditor!({ status: 'LEGACY_UNKNOWN_VALUE' }, false)!;
            expect(editor.getValue()).toBe('LEGACY_UNKNOWN_VALUE');
        });

        it('selecting an option via the B10 select() API updates getValue()', () => {
            const col = new EnumColumnBuilder<Item>('status').withOptions(options).asEditable().build();
            const editor = col.renderEditor!({ status: 'ACTIVE' }, false)!;
            const combo = editor.element as unknown as ComboBoxElement<Option>;

            combo.select(options[1]);

            expect(editor.getValue()).toBe('INACTIVE');
        });

        it('selecting a deliberately null-valued option commits null, not the previous raw value', () => {
            const optionsWithNull: Option[] = [
                { value: 'ACTIVE', label: 'Active' },
                { value: null, label: '—' },
            ];
            const col = new EnumColumnBuilder<Item>('status').withOptions(optionsWithNull).asEditable().build();
            const editor = col.renderEditor!({ status: 'ACTIVE' }, false)!;
            const combo = editor.element as unknown as ComboBoxElement<Option>;

            combo.select(optionsWithNull[1]);

            expect(editor.getValue()).toBeNull();
        });
    });

    describe('GridRow integration — commit and cancel', () => {
        function buildRow(
            item: Item,
            col: GridColumn<Item>,
            onCommit: (i: Item) => void,
            onRequestRowAbove: (rowIndex: number, columnIndex: number) => void = () => {},
            onRequestRowBelow: (rowIndex: number, columnIndex: number) => void = () => {}
        ): GridRow<Item> {
            return new GridRow<Item>(
                item,
                0,
                [col],
                [],
                false,
                false,
                true,
                () => {},
                0,
                false,
                onCommit,
                () => {},
                () => {},
                () => {},
                () => {},
                onRequestRowAbove,
                onRequestRowBelow
            );
        }

        it('a mouse click on an option (select()) commits immediately and exits editing — no Enter/Tab needed', () => {
            const onCommit = jest.fn();
            const col = new EnumColumnBuilder<Item>('status').withOptions(options).asEditable().build();
            const item: Item = { status: 'ACTIVE' };
            const row = buildRow(item, col, onCommit);
            document.body.appendChild(row.getElement());

            const cell = row.getElement().children[0] as HTMLElement;
            cell.click(); // enters edit mode -> mounts the ComboBox editor
            expect(cell.dataset.editing).toBe('1');

            const editorEl = cell.firstElementChild as unknown as ComboBoxElement<Option>;
            editorEl.select(options[1]); // simulates clicking the "Inactive" option

            expect(item.status).toBe('INACTIVE');
            expect(onCommit).toHaveBeenCalledWith(item);
            expect(cell.dataset.editing).toBeUndefined();

            row.destroy();
            document.body.removeChild(row.getElement());
        });

        it('a native "change" event bubbling from the search input (e.g. on blur) does NOT commit — only the namespaced CELL_COMMIT_EVENT does', () => {
            const onCommit = jest.fn();
            const col = new EnumColumnBuilder<Item>('status').withOptions(options).asEditable().build();
            const item: Item = { status: 'ACTIVE' };
            const row = buildRow(item, col, onCommit);
            document.body.appendChild(row.getElement());

            const cell = row.getElement().children[0] as HTMLElement;
            cell.click(); // enters edit mode -> mounts the ComboBox editor
            expect(cell.dataset.editing).toBe('1');

            const input = cell.querySelector('input') as HTMLInputElement;
            expect(input).toBeTruthy();

            // Simulate the ComboBox's own search <input> firing a plain, native 'change' (e.g.
            // typing then blurring without selecting anything) — this must never be mistaken
            // for a commit signal.
            input.dispatchEvent(new Event('change', { bubbles: true }));

            expect(onCommit).not.toHaveBeenCalled();
            expect(item.status).toBe('ACTIVE');
            // Still mid-edit — a bare 'change' must not have exited the cell either.
            expect(cell.dataset.editing).toBe('1');

            row.destroy();
            document.body.removeChild(row.getElement());
        });

        it('ArrowDown/ArrowUp typed inside the open ComboBox only move its own highlight — no commit, no row jump', () => {
            const onCommit = jest.fn();
            const onRequestRowAbove = jest.fn();
            const onRequestRowBelow = jest.fn();
            const col = new EnumColumnBuilder<Item>('status').withOptions(options).asEditable().build();
            const item: Item = { status: 'ACTIVE' };
            const row = buildRow(item, col, onCommit, onRequestRowAbove, onRequestRowBelow);
            document.body.appendChild(row.getElement());

            const cell = row.getElement().children[0] as HTMLElement;
            cell.click();
            expect(cell.dataset.editing).toBe('1');

            const input = cell.querySelector('input') as HTMLInputElement;
            expect(input).toBeTruthy();

            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));

            expect(onRequestRowAbove).not.toHaveBeenCalled();
            expect(onRequestRowBelow).not.toHaveBeenCalled();
            expect(onCommit).not.toHaveBeenCalled();
            expect(item.status).toBe('ACTIVE');
            // Still mid-edit — arrows inside the dropdown must not have exited the cell.
            expect(cell.dataset.editing).toBe('1');

            row.destroy();
            document.body.removeChild(row.getElement());
        });

        it('pressing Enter on the highlighted option commits via the same change path as a click', () => {
            // The ComboBox's own item list is viewport-gated (createOptimizedPipeline on its
            // own root container — here, editor.element itself) — real ArrowDown/Enter
            // selection needs `currentItems` populated, which requires making that container
            // "visible" via the IntersectionObserver mock, same as combobox.test.ts.
            jest.useFakeTimers();
            try {
                const onCommit = jest.fn();
                const col = new EnumColumnBuilder<Item>('status').withOptions(options).asEditable().build();
                const item: Item = { status: 'ACTIVE' };
                const row = buildRow(item, col, onCommit);
                document.body.appendChild(row.getElement());

                const cell = row.getElement().children[0] as HTMLElement;
                cell.click();
                const editorEl = cell.firstElementChild as HTMLElement;
                (globalThis as any).IntersectionObserverMock.triggerVisibility(editorEl, true);
                jest.advanceTimersByTime(50);

                const input = cell.querySelector('input') as HTMLInputElement;

                // The options list only became available via triggerVisibility() ABOVE, i.e.
                // after open() already ran with an empty list — so focusedIndex starts at -1
                // (never resynced to the current value once real items arrived). The first
                // ArrowDown lands on index 0 (ACTIVE, the current value); the second moves the
                // highlight to index 1 (INACTIVE) — then Enter selects it.
                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

                expect(item.status).toBe('INACTIVE');
                expect(onCommit).toHaveBeenCalledWith(item);
                expect(cell.dataset.editing).toBeUndefined();

                row.destroy();
                document.body.removeChild(row.getElement());
            } finally {
                jest.useRealTimers();
            }
        });

        it('Escape (before any selection) reverts to the original value and does not commit', () => {
            const onCommit = jest.fn();
            const col = new EnumColumnBuilder<Item>('status').withOptions(options).asEditable().build();
            const item: Item = { status: 'ACTIVE' };
            const row = buildRow(item, col, onCommit);
            document.body.appendChild(row.getElement());

            const cell = row.getElement().children[0] as HTMLElement;
            cell.click();
            expect(cell.dataset.editing).toBe('1');

            const input = cell.querySelector('input') as HTMLInputElement;
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

            expect(item.status).toBe('ACTIVE');
            expect(onCommit).not.toHaveBeenCalled();
            expect(cell.dataset.editing).toBeUndefined();

            row.destroy();
            document.body.removeChild(row.getElement());
        });

        it('no [popover] element remains in document.body after commit', () => {
            const col = new EnumColumnBuilder<Item>('status').withOptions(options).asEditable().build();
            const item: Item = { status: 'ACTIVE' };
            const row = buildRow(item, col, () => {});
            document.body.appendChild(row.getElement());

            const cell = row.getElement().children[0] as HTMLElement;
            cell.click(); // opens the ComboBox -> its popover is built and appended to body
            expect(document.body.querySelectorAll('[popover]').length).toBeGreaterThan(0);

            const editorEl = cell.firstElementChild as unknown as ComboBoxElement<Option>;
            editorEl.select(options[1]); // commits and exits -> anchor disconnects -> popover cleans up

            expect(document.body.querySelectorAll('[popover]').length).toBe(0);

            row.destroy();
            document.body.removeChild(row.getElement());
        });

        it('the editor session\'s value$ accumulates no observers across repeated open/close cycles', () => {
            // Reviewer NIT (2): createEditor()'s value$ BehaviorSubject is never completed.
            // That is only safe if (a) each editor SESSION gets its own value$ (so nothing
            // accumulates on a long-lived subject) and (b) closing the editor releases the
            // ComboBox's own subscription to it, leaving at most the builder's internal
            // commit-dispatcher — a closure that becomes unreachable with the session.
            const captured: BehaviorSubject<Option | null>[] = [];
            const originalWithValue = ComboBoxBuilder.prototype.withValue;
            const spy = jest
                .spyOn(ComboBoxBuilder.prototype, 'withValue')
                .mockImplementation(function (this: any, v: any) {
                    captured.push(v);
                    return originalWithValue.call(this, v);
                } as any);

            try {
                const col = new EnumColumnBuilder<Item>('status').withOptions(options).asEditable().build();
                const item: Item = { status: 'ACTIVE' };
                const row = buildRow(item, col, () => {});
                document.body.appendChild(row.getElement());
                const cell = row.getElement().children[0] as HTMLElement;

                const observerCountsAfterClose: number[] = [];
                for (let i = 0; i < 3; i++) {
                    cell.click(); // open a fresh editor session
                    const input = cell.querySelector('input') as HTMLInputElement;
                    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
                    observerCountsAfterClose.push(captured[i].observers.length);
                }

                // A brand-new value$ per session — nothing is reused across sessions.
                expect(new Set(captured).size).toBe(3);

                // Each closed session holds at most the one internal commit-dispatcher
                // subscription, and that number does not grow from session to session.
                observerCountsAfterClose.forEach(count => expect(count).toBeLessThanOrEqual(1));
                expect(observerCountsAfterClose[2]).toBe(observerCountsAfterClose[0]);

                // The first session's subject must not have gained observers because later
                // sessions opened (i.e. no shared/leaking subscription chain).
                expect(captured[0].observers.length).toBe(observerCountsAfterClose[0]);

                row.destroy();
                document.body.removeChild(row.getElement());
            } finally {
                spy.mockRestore();
            }
        });

        it('a stale editor element left over from a closed session can no longer commit into the row', () => {
            // Corollary of NIT (2): value$ stays alive (never completed) after the session
            // closes, so if anything still held the old ComboBox it could still emit. The
            // cell-side listener is torn down with the session's AbortController, so such a
            // late signal must be inert.
            const onCommit = jest.fn();
            const col = new EnumColumnBuilder<Item>('status').withOptions(options).asEditable().build();
            const item: Item = { status: 'ACTIVE' };
            const row = buildRow(item, col, onCommit);
            document.body.appendChild(row.getElement());

            const cell = row.getElement().children[0] as HTMLElement;
            cell.click();
            const staleEditor = cell.firstElementChild as unknown as ComboBoxElement<Option>;

            const input = cell.querySelector('input') as HTMLInputElement;
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
            expect(cell.dataset.editing).toBeUndefined();

            // Late selection on the detached editor from the closed session.
            staleEditor.select(options[1]);

            expect(item.status).toBe('ACTIVE');
            expect(onCommit).not.toHaveBeenCalled();
            expect(cell.dataset.editing).toBeUndefined();

            row.destroy();
            document.body.removeChild(row.getElement());
        });

        it('no [popover] element remains in document.body after Escape cancel', () => {
            const col = new EnumColumnBuilder<Item>('status').withOptions(options).asEditable().build();
            const item: Item = { status: 'ACTIVE' };
            const row = buildRow(item, col, () => {});
            document.body.appendChild(row.getElement());

            const cell = row.getElement().children[0] as HTMLElement;
            cell.click();
            expect(document.body.querySelectorAll('[popover]').length).toBeGreaterThan(0);

            const input = cell.querySelector('input') as HTMLInputElement;
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

            expect(document.body.querySelectorAll('[popover]').length).toBe(0);

            row.destroy();
            document.body.removeChild(row.getElement());
        });
    });
});
