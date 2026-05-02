# Router

## Description

The router provides client-side SPA navigation using the browser History API (pushState/replaceState).
It is built into `@tdq/ora-components` with zero external dependencies beyond the existing RxJS peer dependency.

Import from the dedicated entry point:

```typescript
import { RouterBuilder, LinkBuilder } from '@tdq/ora-components/router';
```

Or from the main barrel:

```typescript
import { RouterBuilder, LinkBuilder } from '@tdq/ora-components';
```

---

## RouterBuilder

`RouterBuilder` is the main entry point. It registers routes, builds the outlet element that mounts views, and exposes navigation methods.

```typescript
const router = new RouterBuilder()
    .withFallback('/')       // redirect to this path when no route matches
    .withBase('/app');       // strip this prefix from all paths before matching (optional)
```

### Adding routes

Routes are added via `router.addRoute()`, which returns a `RouteBuilder` (inline builder).
Call `withPattern()` before `withContent()`. Calling `withContent()` finalizes and registers the route.

```typescript
// Sync route
router.addRoute()
    .withPattern('/dashboard')
    .withContent(() => new DashboardBuilder());

// Route with path parameters — use {paramName} syntax
router.addRoute()
    .withPattern('/product/{id}')
    .withContent((params) => new ProductBuilder(params.id));

// Multiple parameters
router.addRoute()
    .withPattern('/users/{userId}/posts/{postId}')
    .withContent((params) => new PostBuilder(params.userId, params.postId));

// Lazy route — async factory, same withContent method
router.addRoute()
    .withPattern('/settings')
    .withContent(async (params) => {
        const { SettingsBuilder } = await import('./settings');
        return new SettingsBuilder(params);
    });

// Lifecycle hooks
router.addRoute()
    .withPattern('/editor')
    .withOnEnter((match) => console.log('entered', match.path))
    .withOnLeave(() => console.log('left editor'))
    .withContent(() => new EditorBuilder());

// Wildcard catch-all (match anything not caught above)
router.addRoute()
    .withPattern('*')
    .withContent(() => new NotFoundBuilder());
```

### Building the outlet

`router.build()` returns an `HTMLElement` that acts as the router outlet.
It fires the initial navigation immediately based on `window.location.pathname`.

```typescript
const outlet = router.build();
document.body.appendChild(outlet);
```

### Route matching priority

Routes are matched in this order regardless of registration order:
1. **Exact static** — `/about` (no parameters, not wildcard)
2. **Parameterized** — `/product/{id}` (first registered wins on ties)
3. **Wildcard** — `*`

If no route matches and `withFallback()` is set, the router calls `replace(fallback)`.

### Navigation

```typescript
router.navigate('/product/42');  // pushState — adds to browser history
router.replace('/login');        // replaceState — replaces current history entry
router.back();                   // window.history.back()
router.forward();                // window.history.forward()
```

Browser back/forward buttons are handled automatically via the `popstate` event.

### Reactive state

```typescript
router.currentRoute$   // Observable<RouteMatch | null>
router.params$         // Observable<RouteParams>  — convenience alias for current params
```

`RouteMatch` shape:

```typescript
interface RouteMatch {
    path: string;                      // matched pathname (base stripped)
    params: Record<string, string>;    // extracted {param} values
    query: Record<string, string>;     // parsed query string (?a=1&b=2)
}
```

### View lifecycle

When a route changes:
1. `onLeave()` is called on the previous route definition (if set)
2. The previous view element is removed from the outlet DOM — this triggers `registerDestroy` cleanup, unsubscribing all RxJS subscriptions in the old view
3. The new route's `withContent` factory is called — awaited if it returns a Promise
4. The new element is appended to the outlet
5. `onEnter(match)` is called on the new route definition (if set)
6. `currentRoute$` emits the new `RouteMatch`

---

## LinkBuilder

`LinkBuilder` creates an `<a>` element that intercepts clicks and calls `router.navigate()` instead of performing a full page reload. It automatically applies an active CSS class when the current route matches its href.

`LinkBuilder` receives the router instance as a constructor argument.

```typescript
new LinkBuilder(router)
    .withHref('/dashboard')                    // string or Observable<string>
    .withCaption('Dashboard')                  // string or Observable<string>
    .withExactMatch(false)                     // default false — prefix match
    .withActiveClass('router-link-active')     // default 'active'
    .build();                                  // → HTMLAnchorElement
```

### Active state

- `withExactMatch(false)` (default): active when `currentPath.startsWith(href)`. Use for section links like `/products`.
- `withExactMatch(true)`: active only when `currentPath === href`. Use for root `/` or exact page links.

```typescript
// Home link — only active on exact /
new LinkBuilder(router)
    .withHref('/')
    .withCaption('Home')
    .withExactMatch(true)
    .build();

// Products section — active for /products, /products/1, /products/1/reviews
new LinkBuilder(router)
    .withHref('/products')
    .withCaption('Products')
    .withExactMatch(false)
    .build();
```

### Reactive href and caption

Both `withHref` and `withCaption` accept `Observable<string>` for dynamic values:

```typescript
const productId$ = new BehaviorSubject('42');
const href$ = productId$.pipe(map(id => `/product/${id}`));

new LinkBuilder(router)
    .withHref(href$)
    .withCaption(of('View Product'))
    .build();
```

---

## Full example

```typescript
import { RouterBuilder, LinkBuilder } from '@tdq/ora-components/router';
import { LayoutBuilder } from '@tdq/ora-components/layout';
import { of } from 'rxjs';

const router = new RouterBuilder().withFallback('/');

router.addRoute()
    .withPattern('/')
    .withContent(() => new HomeBuilder());

router.addRoute()
    .withPattern('/product/{id}')
    .withContent((params) => new ProductBuilder(params.id));

router.addRoute()
    .withPattern('/settings')
    .withContent(async () => {
        const { SettingsBuilder } = await import('./pages/settings');
        return new SettingsBuilder();
    });

// Navigation bar
const nav = new LayoutBuilder()
    .asHorizontal()
    .addSlot().withContent(new LinkBuilder(router).withHref('/').withCaption('Home').withExactMatch(true))
    .addSlot().withContent(new LinkBuilder(router).withHref('/settings').withCaption('Settings'));

// Mount
document.body.appendChild(nav.build());
document.body.appendChild(router.build());
```

---

## File structure

```
src/router/
  types.ts           — RouteDefinition, RouteMatch, RouteParams, ContentFactory, RouterOptions
  route-matcher.ts   — pure path matching utility
  route-builder.ts   — RouteBuilder inline builder
  router-builder.ts  — RouterBuilder main class
  link.ts            — LinkBuilder
  index.ts           — barrel export
```

---

## Follow-up / known limitations

### Route guards
There is no `withGuard()` hook yet. To protect routes, call `router.replace('/login')` manually inside `onEnter`:

```typescript
router.addRoute()
    .withPattern('/admin')
    .withOnEnter(() => {
        if (!isAuthenticated()) router.replace('/login');
    })
    .withContent(() => new AdminBuilder());
```

A `withGuard((match) => boolean | Promise<boolean>)` method on `RouteBuilder` would be a clean v2 addition.

### Loading placeholder
During async `withContent` factory resolution, the outlet shows nothing. Add `withLoading(builder: ComponentBuilder)` on `RouterBuilder` to display a spinner or skeleton while the Promise resolves.

### Nested routes
Child routes (e.g. `/settings/profile` rendered inside a `SettingsBuilder` that itself has an outlet) are not supported. Each `RouterBuilder` instance manages one flat outlet. Nested routing would require passing a router instance down to child builders.

### Multiple router instances
Multiple `RouterBuilder` instances can coexist on the same page (e.g. a sidebar router and a main content router), but they all share `window.history` and `popstate`. Each instance independently matches the same URL against its own route list — design route patterns to avoid ambiguity.

### `params$` is router-level
`router.params$` emits the params of the current route. Components that need params should subscribe to `router.currentRoute$` and read `match.params`, or receive params directly via their `withContent` factory argument.
