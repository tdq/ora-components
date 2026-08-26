import { Subscription, BehaviorSubject, skip, of } from 'rxjs';
import { GridColumn, GridAction, ColumnType, CELL_COMMIT_EVENT } from './types';
import { GridStyles, getAlignClass, applyColumnWidth, GRID_ROW_HEIGHT } from './grid-styles';
import { CheckboxBuilder } from '../checkbox/checkbox';
import type { CheckboxValue } from '../checkbox/checkbox';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export class GridRow<ITEM> {
    private element: HTMLElement;
    private actionCell?: HTMLElement;
    private checkboxValue$?: BehaviorSubject<CheckboxValue>;
    private suppressCheckboxEmit = false;
    private listenerAbort?: AbortController;
    private columnSubscriptions: Subscription[] = [];

    constructor(
        private item: ITEM,
        private index: number,
        private columns: GridColumn<ITEM>[],
        private actions: GridAction<ITEM>[],
        private isSelected: boolean,
        private isMultiSelect: boolean,
        private isEditable: boolean,
        private onToggleSelection: (item: ITEM) => void,
        private level: number = 0,
        private isGlass: boolean = false,
        private onCommit: (item: ITEM) => void = () => { },
        private onRequestNextRow: (rowIndex: number) => void = () => { },
        private onRequestPreviousRow: (rowIndex: number) => void = () => { },
        private onActivateEditor: (row: GridRow<ITEM>, cell: HTMLElement) => void = () => { },
        private onEditorClose: () => void = () => {},
        private onRequestRowAbove: (rowIndex: number, columnIndex: number) => void = () => {},
        private onRequestRowBelow: (rowIndex: number, columnIndex: number) => void = () => {},
        private readonly rowHeight: number = GRID_ROW_HEIGHT
    ) {
        this.element = this.createRow();
    }

    private createRow(): HTMLElement {
        const row = document.createElement('div');
        row.className = cn(
            GridStyles.row,
            !this.isGlass && this.index % 2 === 1 && GridStyles.rowOdd,
            this.isGlass && GridStyles.rowGlass,
            this.isEditable && GridStyles.rowEditable,
            this.isSelected && GridStyles.rowSelected
        );
        row.style.transform = `translateY(${this.index * this.rowHeight}px)`;
        row.style.height = `${this.rowHeight}px`;

        this.populateRow(row);
        return row;
    }

    private populateRow(row: HTMLElement, reuse: boolean = false) {
        this.listenerAbort = new AbortController();
        const { signal } = this.listenerAbort;

        let firstCell: HTMLElement | null = null;
        let childIdx = 0;

        if (this.isMultiSelect) {
            const checkCell = reuse ? (row.children[childIdx++] as HTMLElement) : document.createElement('div');
            if (!reuse) {
                checkCell.className = GridStyles.checkboxCell;
            }
            
            const value$ = new BehaviorSubject<CheckboxValue>(this.isSelected);
            const capturedItem = this.item;
            this.columnSubscriptions.push(
                value$.pipe(skip(1)).subscribe(() => {
                    if (!this.suppressCheckboxEmit) {
                        this.onToggleSelection(capturedItem);
                    }
                })
            );

            // Re-creating the checkbox is safer as it involves complex RxJS bindings
            // and we want to ensure fresh state.
            while (checkCell.firstChild) {
                checkCell.removeChild(checkCell.firstChild);
            }

            const checkboxEl = new CheckboxBuilder()
                .asGlass(this.isGlass)
                .withValue(value$)
                .withAriaLabel(of('Select row'))
                .build();
            
            this.checkboxValue$ = value$;
            checkCell.appendChild(checkboxEl);
            if (!reuse) row.appendChild(checkCell);
            firstCell = checkCell;
        }

        this.columns.forEach((col, index) => {
            const cell = reuse ? (row.children[childIdx++] as HTMLElement) : document.createElement('div');
            this.populateCell(cell, col, signal);
            if (!reuse) row.appendChild(cell);
            if (!firstCell && index === 0) {
                firstCell = cell;
            }
        });

        if (firstCell && this.level > 0) {
            firstCell.style.paddingLeft = `${(this.level * 24) + 16}px`;
        } else if (firstCell) {
            firstCell.style.paddingLeft = '';
        }

        if (this.actions.length > 0) {
            const actionCell = reuse ? (row.children[childIdx++] as HTMLElement) : document.createElement('div');
            if (!reuse) {
                actionCell.className = cn(
                    GridStyles.actionCell,
                    this.isSelected ? GridStyles.actionCellSelected : (this.isGlass ? GridStyles.actionCellGlass : GridStyles.actionCellDefault),
                    !this.isGlass && 'group-hover:bg-surface-variant/20 dark:group-hover:bg-slate-800/60'
                );
            } else {
                actionCell.className = cn(
                    GridStyles.actionCell,
                    this.isSelected ? GridStyles.actionCellSelected : (this.isGlass ? GridStyles.actionCellGlass : GridStyles.actionCellDefault),
                    !this.isGlass && 'group-hover:bg-surface-variant/20 dark:group-hover:bg-slate-800/60'
                );
            }
            actionCell.style.width = `${this.actions.length * 40}px`;

            // Always recreate action buttons for simplicity and correct state bindings
            while (actionCell.firstChild) {
                actionCell.removeChild(actionCell.firstChild);
            }

            this.actions.forEach((action) => {
                const wrapper = document.createElement('div');
                wrapper.className = GridStyles.tooltipWrapper;

                const btn = document.createElement('button');
                btn.className = GridStyles.actionButton;
                btn.setAttribute('aria-label', action.label);

                const iconWrapper = document.createElement('span');
                iconWrapper.className = 'w-4 h-4 inline-flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:block';
                iconWrapper.innerHTML = action.icon;
                btn.appendChild(iconWrapper);

                const tooltip = document.createElement('div');
                tooltip.className = GridStyles.tooltip;
                tooltip.setAttribute('popover', 'manual');
                tooltip.textContent = action.label;

                btn.addEventListener('mouseenter', () => {
                    const rect = btn.getBoundingClientRect();
                    tooltip.style.left = `${rect.left + rect.width / 2}px`;
                    tooltip.style.top = `${rect.top}px`;
                    if (!tooltip.matches(':popover-open')) {
                        tooltip.showPopover();
                    }
                }, { signal });

                btn.addEventListener('mouseleave', () => {
                    if (tooltip.matches(':popover-open')) {
                        tooltip.hidePopover();
                    }
                }, { signal });

                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    action.onClick(this.item);
                }, { signal });

                if (action.enable) {
                    btn.disabled = !action.enable(this.item);
                }
                if (action.visible) {
                    const visible = action.visible(this.item);
                    wrapper.style.display = visible ? '' : 'none';
                }

                wrapper.appendChild(btn);
                wrapper.appendChild(tooltip);
                actionCell.appendChild(wrapper);
            });

            this.actionCell = actionCell;
            if (!reuse) row.appendChild(actionCell);
        }
    }

    private showCellDisplay(cell: HTMLElement, col: GridColumn<ITEM>) {
        const abort: AbortController | undefined = (cell as any).__editorAbort;
        if (abort) {
            abort.abort();
            delete (cell as any).__editorAbort;
        }
        delete (cell as any).__commitEdit;
        delete cell.dataset.editing;
        // Fully restore cell className (including alignment and cellClass)
        const alignClass = getAlignClass(col.align);
        let targetClass = '';
        if (col.cellClass) {
            const cls = col.cellClass(this.item);
            targetClass = cn(GridStyles.cell, alignClass, cls);
        } else {
            targetClass = cn(GridStyles.cell, alignClass);
        }
        
        if (cell.className !== targetClass) {
            cell.className = targetClass;
        }

        // Re-apply width
        applyColumnWidth(cell, col);

        const content = col.render(this.item);
        (cell as any).__prevContent = content;

        while (cell.firstChild) {
            cell.removeChild(cell.firstChild);
        }
        
        if (content instanceof HTMLElement) {
            cell.appendChild(content);
        } else {
            cell.textContent = content != null ? String(content) : '';
        }
    }

    private enterEditMode(cell: HTMLElement, col: GridColumn<ITEM>, signal: AbortSignal) {
        if (!col.renderEditor) return;
        if (signal.aborted) return;
        this.onActivateEditor(this, cell);
        const editor = col.renderEditor(this.item, this.isGlass);
        if (!editor) return;

        editor.element.style.width = '100%';
        editor.element.style.height = '100%';

        cell.dataset.editing = '1';
        cell.classList.remove('px-4', 'truncate');
        cell.classList.add('overflow-hidden', 'p-0');
        while (cell.firstChild) {
            cell.removeChild(cell.firstChild);
        }
        cell.appendChild(editor.element);

        const originalValue = (this.item as any)[col.field as string];

        const commitEdit = () => {
            (this.item as any)[col.field as string] = editor.getValue();
            this.onCommit(this.item);
            this.showCellDisplay(cell, col);
            cell.focus();
            this.onEditorClose();
        };
        (cell as any).__commitEdit = commitEdit;

        const revertEdit = () => {
            (this.item as any)[col.field as string] = originalValue;
            this.showCellDisplay(cell, col);
            cell.focus();
            this.onEditorClose();
        };

        const editorAbort = new AbortController();
        (cell as any).__editorAbort = editorAbort;
        // Tie editor listeners to the row signal too (handles row destroy while editor is open)
        signal.addEventListener('abort', () => editorAbort.abort(), { signal: editorAbort.signal });

        editor.element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                // advance to next editable cell, same as Tab
                const editableCells = this.getEditableCells();
                const currentIdx = editableCells.indexOf(cell);
                const rowIdx = this.index;
                commitEdit();
                if (currentIdx >= 0 && currentIdx < editableCells.length - 1) {
                    const nextCell = editableCells[currentIdx + 1];
                    if (nextCell.isConnected) {
                        nextCell.click();
                    } else {
                        this.onRequestNextRow(rowIdx);
                    }
                } else {
                    this.onRequestNextRow(rowIdx);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                // Escape double-duty for editors with their own internal popup (e.g. the enum
                // ComboBox editor): the editor's own keydown handler runs first (event target
                // phase, before this bubbled listener) and, if its dropdown is open, the FIRST
                // Escape only closes that dropdown — it does not stop propagation, so the same
                // keypress still reaches us here and reverts/exits the cell immediately. A
                // second, separate Escape to just close the dropdown without leaving the cell
                // is not currently possible. Acceptable for now; splitting "close dropdown" and
                // "exit cell" into two distinct Escape presses is a follow-up.
                revertEdit();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();
                const editableCells = this.getEditableCells();
                const currentIdx = editableCells.indexOf(cell);
                const rowIdx = this.index;
                commitEdit();

                if (e.shiftKey) {
                    // Shift+Tab: move to previous editable cell
                    if (currentIdx > 0) {
                        const prevCell = editableCells[currentIdx - 1];
                        if (prevCell.isConnected) {
                            prevCell.click();
                        } else {
                            this.onRequestPreviousRow(rowIdx);
                        }
                    } else {
                        // First editable column — request previous row's last editable cell
                        this.onRequestPreviousRow(rowIdx);
                    }
                } else {
                    // Tab: move to next editable cell
                    if (currentIdx >= 0 && currentIdx < editableCells.length - 1) {
                        const nextCell = editableCells[currentIdx + 1];
                        if (nextCell.isConnected) {
                            nextCell.click();
                        } else {
                            this.onRequestNextRow(rowIdx);
                        }
                    } else {
                        this.onRequestNextRow(rowIdx);
                    }
                }
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                // Editors that wrap their own interactive widget (e.g. the enum ComboBox) fire
                // Arrow keys on a DESCENDANT of editor.element, not editor.element itself — the
                // wrapped widget's own arrow handling (e.g. moving the ComboBox's dropdown
                // highlight) already ran during the event's target phase and must be the only
                // handler for it. Plain editors (text/number/date/...) return the <input> itself
                // as editor.element, so e.target === editor.element there and this still applies.
                if (e.target !== editor.element) return;
                e.preventDefault();
                e.stopPropagation();
                const editableCells = this.getEditableCells();
                const colIdx = editableCells.indexOf(cell);
                const rowIdx = this.index;
                commitEdit();
                if (e.key === 'ArrowUp') {
                    this.onRequestRowAbove(rowIdx, colIdx);
                } else {
                    this.onRequestRowBelow(rowIdx, colIdx);
                }
            }
        }, { signal: editorAbort.signal });

        if (col.type === ColumnType.BOOLEAN) {
            const input = editor.element.querySelector('input[type="checkbox"]');
            if (input) {
                input.addEventListener('change', () => {
                    commitEdit();
                }, { signal: editorAbort.signal });
            }
        }

        if (col.type === ColumnType.ENUM) {
            // Same commit-on-select precedent as BOOLEAN above: a mouse click on an option in
            // the enum ComboBox's dropdown never fires a 'keydown' on this cell (the dropdown
            // list is portal'd into document.body, and clicking an option doesn't route through
            // any key event) — so Enter/Tab's keydown-driven commitEdit() above can't catch it.
            // EnumColumnBuilder's editor dispatches CELL_COMMIT_EVENT (NOT a plain 'change') on
            // editor.element whenever the selected value changes (click OR Enter). A plain
            // 'change' is deliberately avoided: the ComboBox's own search <input> also fires a
            // native 'change' (e.g. on blur after typing without selecting), which would
            // otherwise be misread as a commit here.
            editor.element.addEventListener(CELL_COMMIT_EVENT, () => {
                commitEdit();
            }, { signal: editorAbort.signal });
        }

        requestAnimationFrame(() => editor.focus());
    }

    private populateCell(cell: HTMLElement, col: GridColumn<ITEM>, signal: AbortSignal) {
        const abort: AbortController | undefined = (cell as any).__editorAbort;
        if (abort) {
            abort.abort();
            delete (cell as any).__editorAbort;
        }

        applyColumnWidth(cell, col);

        const alignClass = getAlignClass(col.align);
        let targetClass = '';
        if (col.cellClass) {
            const cls = col.cellClass(this.item);
            targetClass = cn(GridStyles.cell, alignClass, cls);
        } else {
            targetClass = cn(GridStyles.cell, alignClass);
        }

        if (cell.className !== targetClass) {
            cell.className = targetClass;
        }

        if (this.isEditable && col.editable && col.renderEditor) {
            cell.style.cursor = 'text';
            cell.tabIndex = 0;

            if (!cell.dataset.editing) {
                this.showCellDisplay(cell, col);
            }

            // Always re-add listeners on update because signal/abort might be new
            cell.addEventListener('click', () => {
                if (!cell.dataset.editing) {
                    this.enterEditMode(cell, col, signal);
                }
            }, { signal });

            cell.addEventListener('keydown', (e) => {
                if (cell.dataset.editing) return;
                // A commit-on-change editor (e.g. the enum ComboBox) can commit and exit edit
                // mode SYNCHRONOUSLY while this very keydown is still bubbling — e.g. Enter on
                // a highlighted ComboBox option: the ComboBox's own handler selects the option
                // (committing via 'change', which clears cell.dataset.editing) before this
                // event ever reaches this listener. Without this guard, the check above would
                // then see "not editing" and misread the SAME already-handled Enter as a fresh
                // request to open the editor again. The ComboBox's own handler always calls
                // preventDefault() before committing, so e.defaultPrevented distinguishes an
                // already-handled bubbled key from a genuine fresh one.
                if (e.defaultPrevented) return;
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.enterEditMode(cell, col, signal);
                } else {
                    this.handleCellFocusNavigation(e, cell);
                }
            }, { signal });
        } else if (this.isEditable && col.editable && col.focusEditableCell) {
            // Focus-only cell (e.g. CustomColumnBuilder.asEditable()): wired into the
            // Tab/Enter/Arrow keyboard chain, but no value editor opens and nothing is ever
            // committed. col.focusEditableCell is resolved fresh on every activation — never
            // cached — since the cell's content may be recycled across renders.
            cell.style.cursor = 'pointer';

            this.renderDisplayContent(cell, col);

            // Avoid a double Tab stop: when the resolved focus target is itself natively
            // focusable (default tabIndex >= 0 — a <button>, <a href>, etc.), it is ALREADY
            // reachable by native sequential Tab navigation, so the cell wrapper itself must
            // NOT also be a stop (tabIndex = -1) — otherwise Tab would land on [cell] then
            // [target] as two separate stops. tabIndex = -1 keeps the cell programmatically
            // focusable (cell.focus() below, and our own Tab-chain via cell.click()) without
            // adding it to the natural Tab order. Falls back to tabIndex = 0 (the cell itself
            // is the only stop) when no target is resolved yet, or the target opts out via an
            // explicit tabindex="-1". Re-resolved on every render (content may change).
            const renderedTarget = col.focusEditableCell!(cell);
            cell.tabIndex = (renderedTarget && renderedTarget.tabIndex >= 0) ? -1 : 0;

            cell.addEventListener('click', (e) => {
                // Ignore a click that landed on (and bubbled up from) a DESCENDANT of the cell
                // — e.g. clicking directly on the nested <button> already focused it natively,
                // browser-side, with no help from us needed. Only (re)resolve and refocus when
                // the click targeted the cell wrapper itself (e.g. clicking cell padding, or a
                // programmatic cell.click() from our own Tab-chain).
                if (e.target !== cell && cell.contains(e.target as Node)) return;
                this.focusResolvedTarget(cell, col);
            }, { signal });

            cell.addEventListener('keydown', (e) => {
                // Only handle keys typed while the CELL ITSELF has focus. A key bubbling up
                // from inside the cell's own rendered content (e.g. Arrow keys inside a nested
                // combobox/input, or Enter inside a nested form control) belongs to that
                // content, not to grid row/column navigation.
                if (e.target !== cell) return;
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.focusResolvedTarget(cell, col);
                } else {
                    this.handleCellFocusNavigation(e, cell);
                }
            }, { signal });
        } else {
            this.renderDisplayContent(cell, col);
        }
    }

    /** Resolves col.focusEditableCell fresh (never cached) and focuses it, falling back to the
     *  cell itself when nothing is resolved (keeps focus somewhere sane rather than dropping
     *  it). Shared by the focus-only branch's click and Enter handlers. */
    private focusResolvedTarget(cell: HTMLElement, col: GridColumn<ITEM>): void {
        (col.focusEditableCell!(cell) ?? cell).focus();
    }

    private handleCellFocusNavigation(e: KeyboardEvent, cell: HTMLElement): void {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            e.stopPropagation();
            const editableCells = this.getEditableCells();
            const idx = editableCells.indexOf(cell);
            if (e.key === 'ArrowLeft') {
                if (idx > 0) {
                    editableCells[idx - 1].focus();
                } else {
                    this.onRequestPreviousRow(this.index);
                }
            } else {
                if (idx >= 0 && idx < editableCells.length - 1) {
                    editableCells[idx + 1].focus();
                } else {
                    this.onRequestNextRow(this.index);
                }
            }
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            const editableCells = this.getEditableCells();
            const colIdx = editableCells.indexOf(cell);
            if (colIdx < 0) return;
            if (e.key === 'ArrowUp') {
                this.onRequestRowAbove(this.index, colIdx);
            } else {
                this.onRequestRowBelow(this.index, colIdx);
            }
        }
    }

    /**
     * Renders cell display content for non-editing / focus-only cells. Custom columns
     * (ColumnType.CUSTOM) are keyed by the row's item reference rather than by the rendered
     * element's identity — the renderer creates a fresh element on every call, so comparing
     * `content !== prevContent` would always be true and re-mount on every populateCell call
     * (e.g. on every column resize). Skips the renderer call entirely, and leaves the DOM
     * untouched, when the item hasn't changed.
     */
    private renderDisplayContent(cell: HTMLElement, col: GridColumn<ITEM>): void {
        if (col.type === ColumnType.CUSTOM) {
            if ((cell as any).__prevItem === this.item) return;
            (cell as any).__prevItem = this.item;
            this.mountCellContent(cell, col.render(this.item));
            return;
        }

        const content = col.render(this.item);
        if (content !== (cell as any).__prevContent) {
            (cell as any).__prevContent = content;
            this.mountCellContent(cell, content);
        }
    }

    private mountCellContent(cell: HTMLElement, content: HTMLElement | string): void {
        while (cell.firstChild) {
            cell.removeChild(cell.firstChild);
        }
        if (content instanceof HTMLElement) {
            cell.appendChild(content);
        } else {
            cell.textContent = content != null ? String(content) : '';
        }
    }

    private getEditableCells(): HTMLElement[] {
        const cells: HTMLElement[] = [];
        const startIdx = this.isMultiSelect ? 1 : 0;
        this.columns.forEach((col, i) => {
            if (col.editable && (col.renderEditor || col.focusEditableCell)) {
                const cellEl = this.element.children[startIdx + i] as HTMLElement;
                if (cellEl) cells.push(cellEl);
            }
        });
        return cells;
    }

    public activateFirstEditableCell() {
        const cells = this.getEditableCells();
        if (cells.length > 0) {
            cells[0].click();
        }
    }

    public activateLastEditableCell() {
        const cells = this.getEditableCells();
        if (cells.length > 0) {
            cells[cells.length - 1].click();
        }
    }

    public activateCellAtColumn(columnIndex: number, openEditor: boolean): void {
        const cells = this.getEditableCells();
        const cell = cells[Math.min(Math.max(columnIndex, 0), cells.length - 1)];
        if (!cell) return;
        if (openEditor) {
            cell.click();
        } else {
            cell.focus();
        }
    }

    public commitActiveEditor(cell: HTMLElement) {
        const commit = (cell as any).__commitEdit as (() => void) | undefined;
        if (commit) commit();
    }

    getElement(): HTMLElement {
        return this.element;
    }

    getItem(): ITEM {
        return this.item;
    }

    update(item: ITEM, index: number, isSelected: boolean, level: number = 0, forceRebuild: boolean = false) {
        this.item = item;
        this.index = index;
        this.isSelected = isSelected;
        this.level = level;
        this.actionCell = undefined;
        this.checkboxValue$ = undefined;
        
        this.element.querySelectorAll('[popover]').forEach(el => {
            const htmlEl = el as HTMLElement;
            if (htmlEl.matches(':popover-open')) htmlEl.hidePopover();
        });
        
        this.columnSubscriptions.forEach(s => s.unsubscribe());
        this.columnSubscriptions = [];
        this.listenerAbort?.abort();

        this.element.className = cn(
            GridStyles.row,
            !this.isGlass && this.index % 2 === 1 && GridStyles.rowOdd,
            this.isGlass && GridStyles.rowGlass,
            this.isEditable && GridStyles.rowEditable,
            this.isSelected && GridStyles.rowSelected
        );
        this.element.style.transform = `translateY(${this.index * this.rowHeight}px)`;

        // Reuse existing cells if the structure is compatible
        const expectedChildrenCount = (this.isMultiSelect ? 1 : 0) + this.columns.length + (this.actions.length > 0 ? 1 : 0);
        
        if (!forceRebuild && this.element.children.length === expectedChildrenCount) {
            this.populateRow(this.element, true);
        } else {
            while (this.element.firstChild) {
                this.element.removeChild(this.element.firstChild);
            }
            this.populateRow(this.element, false);
        }
    }

    updateSelection(isSelected: boolean) {
        if (this.isSelected === isSelected) return;
        this.isSelected = isSelected;

        this.suppressCheckboxEmit = true;
        this.checkboxValue$?.next(isSelected);
        this.suppressCheckboxEmit = false;

        if (this.actionCell) {
            this.actionCell.className = cn(
                GridStyles.actionCell,
                this.isSelected ? GridStyles.actionCellSelected : (this.isGlass ? GridStyles.actionCellGlass : GridStyles.actionCellDefault),
                !this.isGlass && 'group-hover:bg-surface-variant/20 dark:group-hover:bg-slate-800/60'
            );
        }

        this.element.className = cn(
            GridStyles.row,
            !this.isGlass && this.index % 2 === 1 && GridStyles.rowOdd,
            this.isGlass && GridStyles.rowGlass,
            this.isEditable && GridStyles.rowEditable,
            this.isSelected && GridStyles.rowSelected
        );
    }

    destroy(): void {
        this.columnSubscriptions.forEach(s => s.unsubscribe());
        this.columnSubscriptions = [];
        this.listenerAbort?.abort();

        // Clear each cell's children so any registerDestroy/lifecycle boundary inside
        // custom-rendered cell content fires (detaching a node from the DOM triggers its
        // disconnect callback immediately, even before the row element itself is removed).
        Array.from(this.element.children).forEach(child => {
            while (child.firstChild) {
                child.removeChild(child.firstChild);
            }
        });
    }

    updateColumns(columns: GridColumn<ITEM>[]) {
        this.columnSubscriptions.forEach(s => s.unsubscribe());
        this.columnSubscriptions = [];
        this.columns = columns;

        const signal = this.listenerAbort?.signal;
        if (!signal) return;

        let cellIndex = this.isMultiSelect ? 1 : 0;
        columns.forEach(col => {
            const cell = this.element.children[cellIndex] as HTMLElement;
            if (cell) {
                this.populateCell(cell, col, signal);
            }
            cellIndex++;
        });
    }
}
