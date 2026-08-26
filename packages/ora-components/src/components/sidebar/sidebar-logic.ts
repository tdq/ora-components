import { BehaviorSubject, Subscription, fromEvent } from 'rxjs';

/** Default localStorage key for the persisted expanded flag. */
export const SIDEBAR_STORAGE_KEY = 'ora-sidebar-expanded';

/**
 * Below this width the rail auto-collapses: an expanded 220px sidebar eats a
 * third of a phone/narrow-tablet viewport, so the sidebar gives the width back
 * to the page content and the operator re-expands deliberately if they want it.
 */
const NARROW_QUERY = '(max-width: 959px)';

/**
 * Owns the sidebar's expanded flag when the consumer did not supply their own
 * `Subject` via `SideBarBuilder.withExpanded`. Seeds from `localStorage`,
 * persists every change, and force-collapses on narrow viewports.
 *
 * Port of aura-accounting `components/sidebar/logic.ts` (nav item tables and
 * capability gating dropped — those are application concerns, not library ones).
 */
export interface SidebarLogicOptions {
    /** Value used when storage holds nothing yet. Defaults to `false` (collapsed rail). */
    defaultExpanded?: boolean;
}

export class SidebarLogic {
    readonly expanded$: BehaviorSubject<boolean>;

    private readonly _subscriptions = new Subscription();
    private readonly _defaultExpanded: boolean;

    constructor(
        private readonly storageKey: string = SIDEBAR_STORAGE_KEY,
        options: SidebarLogicOptions = {}
    ) {
        this._defaultExpanded = options.defaultExpanded ?? false;
        this.expanded$ = new BehaviorSubject<boolean>(this._read());
        this._initViewportObserver();
    }

    get isExpanded(): boolean {
        return this.expanded$.getValue();
    }

    toggle(): void {
        this.setExpanded(!this.isExpanded);
    }

    /** A deliberate user toggle: changes the state and persists it. */
    setExpanded(expanded: boolean): void {
        if (expanded === this.isExpanded) return;
        this.expanded$.next(expanded);
        this._write(expanded);
    }

    /**
     * Collapse forced by the viewport, not by the operator. It must NOT reach
     * storage: the narrow window is a transient condition, and persisting it
     * would silently erase a preference the operator set on a wide screen and
     * expects back when they return to one.
     */
    private _collapseForViewport(): void {
        if (!this.isExpanded) return;
        this.expanded$.next(false);
    }

    destroy(): void {
        this._subscriptions.unsubscribe();
        this.expanded$.complete();
    }

    /**
     * A stored value always wins — the operator set it deliberately. The default only
     * applies while the key is absent (first visit, or storage unavailable).
     */
    private _read(): boolean {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored === null ? this._defaultExpanded : stored === 'true';
        } catch {
            return this._defaultExpanded; // private browsing / storage disabled
        }
    }

    private _write(expanded: boolean): void {
        try {
            localStorage.setItem(this.storageKey, String(expanded));
        } catch {
            /* private browsing / storage disabled */
        }
    }

    private _initViewportObserver(): void {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

        const mql = window.matchMedia(NARROW_QUERY);
        const apply = (matches: boolean): void => {
            if (matches) this._collapseForViewport();
        };

        apply(mql.matches);
        this._subscriptions.add(
            fromEvent<MediaQueryListEvent>(mql, 'change').subscribe(e => apply(e.matches))
        );
    }
}
