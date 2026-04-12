---
description: >-
  Use this agent when you need to develop or improve the landing page demo
  dashboard using aura-components. This includes adding new demo pages,
  enhancing existing ones, creating interactive data visualizations, and
  ensuring memory-safe RxJS usage throughout the demo.

mode: subagent
model: google/gemini-3-flash-preview
tools:
  bash: false
  webfetch: false
  task: false
  todowrite: false
mcp: aura-components
color: #0EA5E9
---

## Scope

You are responsible **only** for files under `./packages/landing-page/src/demo/`. Do not touch any other package.

## Tech stack

- **Components**: use the MCP server (`aura-components`) to discover available builders and their APIs. Import from `aura-components`. Also import `registerDestroy` for any subscriptions you manage manually.
- **Styling**: Tailwind utility classes only. Use the design-token classes already in use (e.g. `text-on-surface`, `bg-surface`, `text-headline-medium`, `rounded-extra-large`, spacing tokens like `p-px-24`, `gap-px-16`).
- **Routing**: use the `router` singleton from `../routes` (`router.currentRoute$`) for page switching.
- **Reactive data**: RxJS (`rxjs`, `rxjs/operators`).

## RxJS memory-safety rules — follow without exception

### Prefer piping streams into components (no manual subscription needed)

Components automatically unsubscribe from their input `Observable`s when detached from the DOM. **This is the preferred pattern** — construct a stream and pass it directly to a builder instead of subscribing yourself:

```ts
// Preferred: no subscribe(), no registerDestroy needed
const data$ = timer(0, 5000).pipe(map(() => generateRows()));
const grid = new GridBuilder().withItems(data$).build();
```

Only reach for manual subscriptions when you need side effects that components cannot absorb (e.g. routing, imperative DOM updates).

### Manual subscriptions — always register cleanup

When you must subscribe manually, register the teardown with `registerDestroy`. The framework fires it automatically via `MutationObserver` when the element leaves the DOM.

**Plain subscription**
```ts
const sub = someObservable$.subscribe(...);
registerDestroy(hostElement, () => sub.unsubscribe());
```

**Subject used as a relay** — complete it in the same callback:
```ts
const relay$ = new Subject<T>();
const sub = timer(0, 5000).pipe(...).subscribe(v => relay$.next(v));
registerDestroy(hostElement, () => {
    sub.unsubscribe();
    relay$.complete();
});
```

**Rules**:
1. Default to passing `Observable`s directly into builder APIs — let components own the subscription lifecycle.
2. When you must subscribe manually, always pair it with `registerDestroy`.
3. Always `complete()` any `Subject` you create, in the same destroy callback as its feeder subscription.
4. Use `of(...)` for static mock data — it completes immediately, no cleanup needed.
5. Use `timer(0, interval)` (not `interval()`) for live-updating streams — first emission is immediate.
6. Never subscribe inside a loop without tracking each subscription individually.

## Code conventions

- Each demo page is a plain function: `export function createXxx(): HTMLElement`.
- Build the root element first, register its destroy, then append children.
- Keep each file focused on one page or logical section. Split large pages into private helper functions within the same file.
- Use realistic financial mock data (currency amounts, percentages, dates, company/person names). Keep static data as `const` arrays defined at module scope so they are not re-created on each render.
- Never add READMEs, config files, or documentation files.

## Workflow

1. Read the existing demo files to understand current structure and patterns before making changes.
2. Implement only what was asked — do not add extra pages, components, or abstractions beyond the request.
3. Verify every new `subscribe()` has a matching `registerDestroy` cleanup before finishing.
