# Reactive state management

## Description
State management uses RxJS throughout the library. Components that subscribe to any observable must tear down the subscription when the component is destroyed.

### Preferred teardown: `createLifecycleBoundary` (new pattern)

For deterministic one-shot cleanup, use `createLifecycleBoundary` from `src/core/lifecycle-boundary.ts`. It creates a hidden `<ora-lifecycle-boundary>` custom element that fires an `onDisconnect` callback exactly once when permanently removed from the DOM:

```typescript
import { createLifecycleBoundary } from '@/core/lifecycle-boundary';
import { Subscription } from 'rxjs';

const sub = new Subscription();
sub.add(someObservable$.subscribe(value => { /* ... */ }));
// ... add more subscriptions ...

const boundary = createLifecycleBoundary();
boundary.onDisconnect = () => sub.unsubscribe();
container.appendChild(boundary);
```

Key properties:
- **One-shot**: DOM moves (remove + re-insert) do not re-trigger teardown.
- **Non-rendering**: `display: none` by default.
- **Independent of `registerDestroy`**: Both APIs may coexist on different elements; do not register the same teardown via both.

### Legacy teardown: `registerDestroy` (from `src/core/destroyable-element.ts`)

Use `registerDestroy` to register a cleanup callback that fires when the host element is removed from the DOM (via `MutationObserver`):

```typescript
import { registerDestroy } from '@/core/destroyable-element';

const sub = this.caption$.subscribe(caption => {
    label.textContent = caption;
});

registerDestroy(label, () => {
    sub.unsubscribe();
});
```

### Viewport-gated lazy subscriptions: `createOptimizedPipeline`

For data streams that should only be active when their host element is visible in the viewport, use `createOptimizedPipeline` from `src/utils/optimized-pipeline.ts`. This is especially useful for off-screen or below-the-fold data-heavy components:

```typescript
import { createOptimizedPipeline } from '@/utils/optimized-pipeline';

const gated$ = createOptimizedPipeline(hostElement, source$);
// subscription to source$ is deferred until hostElement enters the viewport,
// and torn down instantly when it leaves.
```

The pipeline wraps the source with an `IntersectionObserver`:
- **Lazy subscribe**: no subscription until the element is visible.
- **Instant teardown**: unsubscribes immediately on viewport exit.
- **Asymmetric debounce**: `appearDebounceMs` (default 20ms) on appear (guards fast scroll-through), instant on disappear.
- **Self-healing**: exponential-backoff retry (up to 5 attempts) per visibility window.

#### `GatedObserver` and idempotency

`createOptimizedPipeline` returns a `GatedObserver<T>` — a branded `Observable` subclass that marks a stream as "already viewport-gated". The function is **idempotent**: if you pass it a source that is already a `GatedObserver`, it returns that source untouched (no second `IntersectionObserver`, no double subscription). Callers therefore never need to check whether a stream has been gated upstream — just call `createOptimizedPipeline` and the right thing happens:

```typescript
import { createOptimizedPipeline, GatedObserver } from '@/utils/optimized-pipeline';

const gatedA$ = createOptimizedPipeline(host, source$);   // gates source$
const gatedB$ = createOptimizedPipeline(host, gatedA$);   // returns gatedA$ as-is
```

**Branding a derived stream.** When a parent component gates a source and hands a *derived* stream to a child that would otherwise re-gate it, wrap the stream the child receives in `new GatedObserver(...)`. The child's own `createOptimizedPipeline` call then passes it through unchanged. This is how ComboBox/currency-dropdown feed their inner `ListBoxBuilder`: the list lives inside a `display:none`-when-closed popover (which never intersects the viewport), so gating is done once at the always-visible parent container and the filtered list is branded so the ListBox renders eagerly.

```typescript
// Parent gates once at its visible container, then brands the stream for the child:
const gated$ = createOptimizedPipeline(container, items$);
listBoxBuilder.withItems(new GatedObserver(filteredItems$)); // ListBox won't re-gate
```

> The brand only survives as the *outermost* wrapper — `.pipe()`/`lift` return a plain `Observable` and drop it, so `instanceof GatedObserver` is reliable only on the direct return of `createOptimizedPipeline` or `new GatedObserver(...)`. Re-wrap a derived stream if it must read as gated.

## RxJS subscription hygiene rules
1. Prefer passing Observables directly into builder methods — components own their own lifecycle and will unsubscribe on detach.
2. Use `of(...)` for static data — it completes immediately, no cleanup needed.
3. Use `timer(0, interval)` (not `interval()`) for live-updating streams.
4. Any manual `subscribe()` must be paired with either `createLifecycleBoundary` or `registerDestroy`.