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
    private pendingNavigationId: number = 0;

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
        this.handleNavigation(path);
    }

    replace(path: string): void {
        window.history.replaceState(null, '', this.fullPath(path));
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

        // Fire initial navigation
        this.handleNavigation(this.stripBase(window.location.pathname));

        return outlet;
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
        // Increment navigation ID to track this navigation
        const navigationId = ++this.pendingNavigationId;
        
        // onLeave for old route
        try {
            this.currentDefinition?.onLeave?.();
        } catch (error) {
            console.error('Route onLeave hook failed:', error);
        }

        // Remove old element (triggers registerDestroy cleanup on it)
        if (this.currentElement && this.outlet) {
            this.outlet.removeChild(this.currentElement);
        }
        this.currentElement = null;
        this.currentDefinition = null;

        // Resolve builder — may be sync or async
        let factoryPromise: Promise<ComponentBuilder>;
        try {
            factoryPromise = Promise.resolve(definition.factory(match.params));
        } catch (error) {
            // Factory threw synchronously
            if (navigationId === this.pendingNavigationId) {
                console.error('Failed to load route component:', error);
            }
            return;
        }

        factoryPromise.then((builder) => {
            // Check if this promise is for the current navigation
            // If a newer navigation has started (navigationId < pendingNavigationId),
            // this promise is stale and should be ignored
            if (navigationId !== this.pendingNavigationId) {
                return;
            }

            const el = builder.build();

            if (this.outlet) {
                this.outlet.appendChild(el);
            }

            this.currentElement = el;
            this.currentDefinition = definition;
            this.routeSubject.next(match);

            try {
                definition.onEnter?.(match);
            } catch (hookError) {
                console.error('Route onEnter hook failed:', hookError);
            }
        }).catch((error) => {
            // Only log error if this is still the current navigation
            if (navigationId === this.pendingNavigationId) {
                console.error('Failed to load route component:', error);
            }
        });
    }
}
