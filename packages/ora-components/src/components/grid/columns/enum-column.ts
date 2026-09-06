import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { skip } from 'rxjs/operators';
import { BaseColumnBuilder } from './base-column-builder';
import { ColumnType, GridColumn, CellEditor, CELL_COMMIT_EVENT } from '../types';
// Grid -> ComboBox import: the select editor renders a ComboBox seeded with the column's
// enum options (architect-approved, see #20 in the aura-accounting findings plan).
import { ComboBoxBuilder, ComboBoxElement } from '../../combobox/combobox-builder';

export interface EnumOption {
    value: any;
    label: string;
}

export class EnumColumnBuilder<ITEM> extends BaseColumnBuilder<ITEM> {
    private _captionProvider?: (item: ITEM) => string;
    private _options$: Observable<EnumOption[]> = of([]);

    // Latest snapshot of _options$, kept current by a single long-lived subscription (see
    // ensureOptionsSubscribed()) shared across every GridColumn this builder produces —
    // render() is a builder-level method, not tied to one built instance, so it needs one
    // common source of truth. Reference-counted (see build()/destroy() below) so that
    // destroying ONE built column (e.g. one grid's teardown) doesn't pull the subscription out
    // from under another still-live built column from the SAME builder (a builder may be
    // reused across pivot regenerations or to serve more than one grid).
    private _latestOptions: EnumOption[] = [];
    private _optionsSub?: Subscription;
    private _liveBuiltColumns = 0;

    withItemCaptionProvider(provider: (item: ITEM) => string): this {
        this._captionProvider = provider;
        return this;
    }

    /**
     * Seeds the select editor's choices and, unless withItemCaptionProvider() overrides it,
     * the display caption too — display and options are derived from the same source so they
     * cannot drift. Accepts a static array or a reactive Observable.
     */
    withOptions(options: EnumOption[] | Observable<EnumOption[]>): this {
        this._options$ = Array.isArray(options) ? of(options) : options;
        // A source swapped in after the column already started rendering must not keep the
        // stale subscription (and stale _latestOptions) from the previous _options$ alive.
        this._optionsSub?.unsubscribe();
        this._optionsSub = undefined;
        return this;
    }

    /**
     * Subscribes to _options$ exactly once (lazily, on first render()/createEditor() call) and
     * keeps _latestOptions current for the lifetime of this subscription — a plain array
     * (of(...)) or BehaviorSubject/ReplaySubject resolves immediately; a cold/non-replaying
     * Observable (e.g. a bare Subject) populates _latestOptions on its first emission instead
     * of forever reading back [] the way a subscribe-then-immediately-unsubscribe snapshot
     * would.
     */
    private ensureOptionsSubscribed(): void {
        if (this._optionsSub) return;
        this._optionsSub = this._options$.subscribe(o => { this._latestOptions = o; });
    }

    override render(item: ITEM): string {
        if (this._captionProvider) return this._captionProvider(item);
        this.ensureOptionsSubscribed();
        const raw = (item as any)[this._field];
        const match = this._latestOptions.find(o => o.value === raw);
        return match ? match.label : String(raw);
    }

    protected override createEditor(item: ITEM, isGlass: boolean): CellEditor | null {
        this.ensureOptionsSubscribed();
        const options = this._latestOptions;
        const rawValue = (item as any)[this._field];
        const initial = options.find(o => o.value === rawValue) ?? null;
        const value$: BehaviorSubject<EnumOption | null> = new BehaviorSubject<EnumOption | null>(initial);

        const comboBuilder = new ComboBoxBuilder<EnumOption>()
            .withItems(of(options))
            .withValue(value$)
            .withItemCaptionProvider(o => o.label)
            .withItemIdProvider(o => String(o.value))
            .withAriaLabel(this._header || 'Select value');
        if (isGlass) comboBuilder.asGlass();

        // GridRow.enterEditMode sets width/height: '100%' on editor.element after this
        // returns — no need to set it here (matches the other column editor factories).
        const element = comboBuilder.build() as ComboBoxElement<EnumOption>;

        // Commit-on-select precedent (same as BooleanColumnBuilder's checkbox 'change'):
        // clicking an option in the ComboBox's dropdown never fires a 'keydown' on this editor
        // (the dropdown list is portal'd into document.body and a mouse click doesn't route
        // through any key event), so GridRow's keydown-driven commit (Enter/Tab) can't observe
        // it. Dispatch a namespaced CELL_COMMIT_EVENT from the editor's own root on every
        // value$ change after the initial seed — GridRow listens for it on ENUM columns and
        // commits, covering both mouse selection AND Enter (selectItem() updates value$
        // synchronously for both). A plain 'change' was deliberately NOT used here: the
        // ComboBox's own search <input> also fires native 'change' events (e.g. on blur after
        // typing), which bubble through this same root and must NOT be mistaken for a commit —
        // and a generic 'change' would also leak this internal signal out to any consumer code
        // listening for 'change' on the grid. This subscription is local to value$, which is
        // itself local to this editor SESSION (a fresh BehaviorSubject per createEditor() call,
        // never shared) — same as every other column editor's internal value$ (text-column.ts,
        // money-column.ts, ...), it is never explicitly unsubscribed; the whole self-contained
        // closure (value$, this subscription, element) becomes unreachable and GC-eligible
        // together once GridRow discards the editor session (showCellDisplay/revertEdit).
        value$.pipe(skip(1)).subscribe(() => {
            element.dispatchEvent(new CustomEvent(CELL_COMMIT_EVENT, { bubbles: true }));
        });

        return {
            element,
            // Falls back to the raw stored value only when NOTHING is currently selected (e.g.
            // the item's stored value didn't match any option and nothing was picked since) —
            // a deliberately null-valued option (e.g. { value: null, label: '—' }) must commit
            // null, not silently revert to the old raw value.
            getValue: () => {
                const selected = value$.getValue();
                return selected ? selected.value : rawValue;
            },
            // Uses ComboBox's public B10 open() API rather than reaching into its internals
            // to focus the input directly.
            focus: () => element.open(),
        };
    }

    override build(): GridColumn<ITEM> {
        const col = this.createBaseColumn(ColumnType.ENUM);

        this._liveBuiltColumns++;
        let disposed = false;
        col.destroy = () => {
            if (disposed) return;
            disposed = true;
            this._liveBuiltColumns--;
            // Only tear down the shared options subscription once EVERY built column backed by
            // it has been destroyed — a sibling built column (another live grid, or the
            // survivor of a pivot regeneration) may still depend on it.
            if (this._liveBuiltColumns <= 0) {
                this._optionsSub?.unsubscribe();
                this._optionsSub = undefined;
            }
        };

        return col;
    }
}
