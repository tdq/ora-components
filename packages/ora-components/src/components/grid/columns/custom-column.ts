import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn } from '../types';

// :not(:disabled) excludes disabled controls — they can't receive focus, so resolving one as
// the "focus target" would silently drop focus (see grid-row.ts's focusResolvedTarget() ??
// cell fallback, and the tabIndex computation, which both depend on a truly focusable target).
const DEFAULT_FOCUSABLE_SELECTOR =
    'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), '
    + 'textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export class CustomColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _renderer: (item: ITEM) => HTMLElement | string = () => '';
    private _focusTarget?: (cellEl: HTMLElement) => HTMLElement | null;

    constructor() {
        super('custom');
    }

    withRenderer(renderer: (item: ITEM) => HTMLElement | string): this {
        this._renderer = renderer;
        return this;
    }

    /**
     * Wires this custom cell into the grid's Tab/Enter/Arrow keyboard chain without opening
     * a value editor — a custom cell already renders its own interactive content, so
     * activating it (click/Enter/Tab landing) just focuses that content. No onCommit fires
     * and no item field is written (unlike BaseColumnBuilder.asEditable(), which expects a
     * value editor + commit-on-change flow).
     *
     * @param focusTarget Resolves the focusable element within the rendered cell. Called
     *   fresh on every activation — never cache the returned node, the cell content may be
     *   recycled across renders. Defaults to the first focusable descendant.
     */
    override asEditable(focusTarget?: (cellEl: HTMLElement) => HTMLElement | null): this {
        this._editable = true;
        this._focusTarget = focusTarget
            ?? ((cellEl) => cellEl.querySelector<HTMLElement>(DEFAULT_FOCUSABLE_SELECTOR));
        return this;
    }

    override render(item: ITEM): HTMLElement | string {
        return this._renderer(item);
    }

    override build(): GridColumn<ITEM> {
        const col = this.createBaseColumn(ColumnType.CUSTOM);
        // Custom columns never use the value-editor flow (renderEditor/commit) — only the
        // focus-only chain below. createBaseColumn wires renderEditor generically whenever
        // _editable is true, so clear it here.
        col.renderEditor = undefined;
        if (this._focusTarget) {
            col.focusEditableCell = this._focusTarget;
        }
        return col;
    }
}
