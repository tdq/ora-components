import { BehaviorSubject, Observable, map } from 'rxjs';
import { ComponentBuilder } from '../core/component-builder';
import { registerDestroy } from '../core/destroyable-element';
import { RouteBuilder } from './route-builder';
import { matchRoute } from './route-matcher';
import { RouteDefinition, RouteMatch, RouteParams, RouterOptions } from './types';
import { cn } from '@/components/combobox/styles';

export class RouterBuilder implements ComponentBuilder {
    private routes: RouteDefinition[] = [];
    private options: RouterOptions = {};
    private readonly routeSubject = new BehaviorSubject<RouteMatch | null>(null);
    private currentElement: HTMLElement | null = null;
    private currentDefinition: RouteDefinition | null = null;
    private outlet: HTMLElement | null = null;

    // Navigation generation counter. Incremented by navigate() / replace() so that:
    //  - rapid back-to-back navigate() calls (same synchronous turn) can be coalesced,
    //  - a re-navigation triggered synchronously from an onLeave hook can cancel the
    //    in-progress swapView before it calls the factory.
    // swapView reads this value but never writes it; only schedule-side code writes it.
    private pendingNavigationId: number = 0;

    // Coalescing queue for navigate() calls. When two navigate() calls happen in the
    // same synchronous turn only the latest path is processed (earlier factories are
    // never started, so their side-effects never run).
    private latestNavPath: string | null = null;
    private navFlushScheduled = false;

    withFallback(path: string): this {
        this.options.fallback = path;
        return this;
    }

    withBase(base: string): this {
        this.options.base = base.endsWith('/') ? base.slice(0, -1) : base;
        return this;
    }

    addRoute(): RouteBuilder {
        return new RouteBuilder((definition) => this._registerRoute(definition));
    }

    /** @internal */
    _registerRoute(definition: RouteDefinition): void {
        this.routes.push(definition);
    }

    get currentRoute$(): Observable<RouteMatch | null> {
        return this.routeSubject.asObservable();
    }

    get params$(): Observable<RouteParams> {
        return this.routeSubject.pipe(map((r) => r?.params ?? {}));
    }

    navigate(path: string): void {
        window.history.pushState(null, '', this.fullPath(path));
        this.scheduleNavigation(path);
    }

    replace(path: string): void {
        window.history.replaceState(null, '', this.fullPath(path));
        // replace() is processed immediately (not coalesced) and cancels any
        // pending navigate() flush so the replace result is not overwritten.
        this.latestNavPath = null;
        this.handleNavigation(path);
    }

    back(): void {
        window.history.back();
    }

    forward(): void {
        window.history.forward();
    }

    build(): HTMLElement {
        const outlet = document.createElement('div');
        this.outlet = outlet;
        this.outlet.className = cn('w-full', 'h-full');

        const onPopState = () => {
            const pathname = this.stripBase(window.location.pathname);
            this.handleNavigation(pathname);
        };

        window.addEventListener('popstate', onPopState);

        registerDestroy(outlet, () => {
            window.removeEventListener('popstate', onPopState);
            this.routeSubject.complete();
        });

        // Fire initial navigation synchronously so that build() callers only need
        // a single await Promise.resolve() for a sync-factory route to be mounted.
        this.handleNavigation(this.stripBase(window.location.pathname));

        return outlet;
    }

    /**
     * Schedules a navigate() call for deferred processing on the next microtask.
     *
     * When multiple navigate() calls happen in the same synchronous turn (rapid
     * navigation / "race condition"), only the LAST requested path is processed –
     * earlier factories are never started so their side-effects never run.
     *
     * Incrementing pendingNavigationId here (before the microtask runs) also lets
     * swapView detect that a re-navigation was triggered synchronously from within
     * an onLeave hook: after onLeave returns, if navigationId !== pendingNavigationId
     * the current swapView aborts before calling the factory.
     */
    private scheduleNavigation(path: string): void {
        ++this.pendingNavigationId;          // signal "a new navigation is pending"
        this.latestNavPath = path;           // always keep the latest requested path

        if (!this.navFlushScheduled) {
            this.navFlushScheduled = true;
            Promise.resolve().then(() => {
                // Reset the flag first so that re-entrant navigate() calls
                // (e.g. triggered from onLeave) schedule a fresh flush.
                this.navFlushScheduled = false;
                const p = this.latestNavPath;
                this.latestNavPath = null;
                if (p !== null) {
                    this.handleNavigation(p);
                }
            });
        }
        // If a flush is already scheduled, we only need to update latestNavPath
        // (already done above) — the scheduled flush will pick up the latest path.
    }

    private fullPath(path: string): string {
        return this.options.base ? `${this.options.base}${path}` : path;
    }

    private stripBase(pathname: string): string {
        if (this.options.base && pathname.startsWith(this.options.base)) {
            return pathname.slice(this.options.base.length) || '/';
        }
        return pathname;
    }

    private handleNavigation(pathname: string): void {
        const result = matchRoute(pathname, this.routes, window.location.search);

        if (!result) {
            if (this.options.fallback && pathname !== this.options.fallback) {
                this.replace(this.options.fallback);
            }
            return;
        }

        this.swapView(result.match, result.definition);
    }

    private swapView(match: RouteMatch, definition: RouteDefinition): void {
        // Capture the current navigation generation.  swapView never increments
        // pendingNavigationId – only navigate() / scheduleNavigation() does that.
        // This means two invariants hold:
        //   1. If onLeave calls navigate() synchronously, pendingNavigationId will
        //      be greater than navigationId by the time we check below, and we can
        //      abort before calling the factory.
        //   2. The async factory .then() guard (navigationId !== pendingNavigationId)
        //      still works: any subsequent navigate() increments pendingNavigationId,
        //      making stale factory resolutions a no-op.
        const navigationId = this.pendingNavigationId;

        // Same-view navigation: if the new route shares the content factory
        // with the current one, treat the mounted element as a shell and let
        // its own subscribers (e.g. nested outlets) react to the new match
        // instead of tearing it down and rebuilding.
        if (
            this.currentElement &&
            this.currentDefinition &&
            this.currentDefinition.factory === definition.factory
        ) {
            this.currentDefinition = definition;
            this.routeSubject.next(match);
            try {
                definition.onEnter?.(match);
            } catch (hookError) {
                console.error('Route onEnter hook failed:', hookError);
            }
            return;
        }

        const oldDefinition = this.currentDefinition;
        const oldElement = this.currentElement;

        this.currentElement = null;
        this.currentDefinition = null;

        // onLeave for old route — may synchronously call navigate(), incrementing
        // pendingNavigationId and scheduling a fresh flush.
        try {
            oldDefinition?.onLeave?.();
        } catch (error) {
            console.error('Route onLeave hook failed:', error);
        }

        // Remove old element (triggers registerDestroy cleanup on it)
        if (oldElement && this.outlet) {
            this.outlet.removeChild(oldElement);
        }

        // If onLeave triggered a re-navigation, pendingNavigationId will have been
        // incremented.  Abort now so the superseding navigation (scheduled as a new
        // microtask flush) is the one that calls the factory and mounts an element.
        if (navigationId !== this.pendingNavigationId) {
            return;
        }

        // Record the in-flight definition eagerly so that if a subsequent swapView
        // runs before the factory resolves (e.g. another navigate() fires), it can
        // call oldDefinition.onLeave() and correctly remove the old element guard.
        // currentElement stays null until the element is actually appended (M2: the
        // same-view fast-path guards on `this.currentElement &&`, so a non-null
        // currentDefinition with a null currentElement will always fall through to
        // the cross-view path — no inconsistent fast-path branch is reachable).
        this.currentDefinition = definition;

        // Resolve builder — may be sync or async.
        let factoryPromise: Promise<ComponentBuilder>;
        try {
            factoryPromise = Promise.resolve(definition.factory(match.params));
        } catch (error) {
            // Factory threw synchronously — undo the eager definition assignment so
            // the router is not left pointing at a definition with no element.
            this.currentDefinition = null;
            if (navigationId === this.pendingNavigationId) {
                console.error('Failed to load route component:', error);
            }
            return;
        }

        factoryPromise.then((builder) => {
            // Check if this promise is for the current navigation.
            // If a newer navigation has started (navigationId < pendingNavigationId),
            // this promise is stale and should be ignored.
            if (navigationId !== this.pendingNavigationId) {
                return;
            }

            const el = builder.build();

            if (this.outlet) {
                this.outlet.appendChild(el);
            }

            // Set currentElement once the element is mounted (M2: currentDefinition
            // was already set eagerly above; setting currentElement here completes
            // the pair so they are consistent for any code that runs after mount).
            this.currentElement = el;

            // Emit route and fire onEnter AFTER the element is mounted (M1 fix):
            // consumers that observe currentRoute$ or receive onEnter can rely on
            // the route's element already existing in the outlet.
            this.routeSubject.next(match);
            try {
                definition.onEnter?.(match);
            } catch (hookError) {
                console.error('Route onEnter hook failed:', hookError);
            }
        }).catch((error) => {
            // Symmetric with the sync-throw branch: if this navigation is still
            // current, reset currentDefinition so the router is not left pointing
            // at a failed definition with no mounted element.  If a newer navigation
            // has already started we leave its state untouched.
            if (navigationId === this.pendingNavigationId) {
                this.currentDefinition = null;
                console.error('Failed to load route component:', error);
            }
        });
    }
}
