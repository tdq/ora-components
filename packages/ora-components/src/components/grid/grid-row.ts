import { Subscription, BehaviorSubject, skip } from 'rxjs';
import { GridColumn, GridAction, ColumnType } from './types';
import { GridStyles, getAlignClass, applyColumnWidth } from './grid-styles';
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
    private readonly rowHeight = 52;

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
        private onRequestRowBelow: (rowIndex: number, columnIndex: number) => void = () => {}
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

    private populateRow(row: HTMLElement) {
        this.listenerAbort = new AbortController();
        const { signal } = this.listenerAbort;

        let firstCell: HTMLElement | null = null;

        if (this.isMultiSelect) {
            const checkCell = document.createElement('div');
            checkCell.className = GridStyles.checkboxCell;
            const value$ = new BehaviorSubject<CheckboxValue>(this.isSelected);
            const capturedItem = this.item;
            this.columnSubscriptions.push(
                value$.pipe(skip(1)).subscribe(() => {
                    if (!this.suppressCheckboxEmit) {
                        this.onToggleSelection(capturedItem);
                    }
                })
            );
            const checkboxEl = new CheckboxBuilder()
                .asGlass(this.isGlass)
                .withValue(value$)
                .build();
            
            this.checkboxValue$ = value$;
            checkCell.appendChild(checkboxEl);
            row.appendChild(checkCell);
            firstCell = checkCell;
        }

        this.columns.forEach((col, index) => {
            const cell = document.createElement('div');
            this.populateCell(cell, col, signal);
            row.appendChild(cell);
            if (!firstCell && index === 0) {
                firstCell = cell;
            }
        });

        if (firstCell && this.level > 0) {
            firstCell.style.paddingLeft = `${(this.level * 24) + 16}px`;
        }

        if (this.actions.length > 0) {
            const actionCell = document.createElement('div');
            actionCell.className = cn(
                GridStyles.actionCell,
                this.isSelected ? GridStyles.actionCellSelected : (this.isGlass ? GridStyles.actionCellGlass : GridStyles.actionCellDefault),
                !this.isGlass && 'group-hover:bg-surface-variant/20 dark:group-hover:bg-slate-800/60'
            );
            actionCell.style.width = `${this.actions.length * 40}px`;

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
            row.appendChild(actionCell);
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
        if (col.cellClass) {
            const cls = col.cellClass(this.item);
            cell.className = cn(GridStyles.cell, alignClass, cls);
        } else {
            cell.className = cn(GridStyles.cell, alignClass);
        }
        // Re-apply width
        applyColumnWidth(cell, col);
        // Clear editor content and render display value
        while (cell.firstChild) {
            cell.removeChild(cell.firstChild);
        }
        const content = col.render(this.item);
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

        requestAnimationFrame(() => editor.focus());
    }

    private populateCell(cell: HTMLElement, col: GridColumn<ITEM>, signal: AbortSignal) {
        const abort: AbortController | undefined = (cell as any).__editorAbort;
        if (abort) {
            abort.abort();
            delete (cell as any).__editorAbort;
        }
        while (cell.firstChild) {
            cell.removeChild(cell.firstChild);
        }
        applyColumnWidth(cell, col);

        const alignClass = getAlignClass(col.align);

        if (col.cellClass) {
            const cls = col.cellClass(this.item);
            cell.className = cn(GridStyles.cell, alignClass, cls);
        } else {
            cell.className = cn(GridStyles.cell, alignClass);
        }

        if (this.isEditable && col.editable && col.renderEditor) {
            cell.style.cursor = 'text';
            cell.tabIndex = 0;

            this.showCellDisplay(cell, col);

            cell.addEventListener('click', () => {
                if (!cell.dataset.editing) {
                    this.enterEditMode(cell, col, signal);
                }
            }, { signal });

            cell.addEventListener('keydown', (e) => {
                if (cell.dataset.editing) return;
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.enterEditMode(cell, col, signal);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
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
            }, { signal });
        } else {
            const content = col.render(this.item);
            if (content instanceof HTMLElement) {
                cell.appendChild(content);
            } else {
                cell.textContent = content != null ? String(content) : '';
            }
        }
    }

    private getEditableCells(): HTMLElement[] {
        const cells: HTMLElement[] = [];
        const startIdx = this.isMultiSelect ? 1 : 0;
        this.columns.forEach((col, i) => {
            if (col.editable && col.renderEditor) {
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

    update(item: ITEM, index: number, isSelected: boolean, level: number = 0) {
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
        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
        }
        this.element.className = cn(
            GridStyles.row,
            !this.isGlass && this.index % 2 === 1 && GridStyles.rowOdd,
            this.isGlass && GridStyles.rowGlass,
            this.isEditable && GridStyles.rowEditable,
            this.isSelected && GridStyles.rowSelected
        );
        this.element.style.transform = `translateY(${this.index * this.rowHeight}px)`;
        this.populateRow(this.element);
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
