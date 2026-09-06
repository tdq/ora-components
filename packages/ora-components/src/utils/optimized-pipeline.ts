import { Observable, EMPTY, timer, of, Subscriber, NEVER, concat, merge, defer } from 'rxjs';
import { debounce, distinctUntilChanged, switchMap, catchError, retry, share, take, takeUntil, filter } from 'rxjs/operators';

/**
 * A branded Observable marking a stream that has ALREADY been wrapped by
 * createOptimizedPipeline (i.e. is viewport-gated). Callers can `instanceof`-check
 * an incoming source and skip re-gating it. Can also wrap an arbitrary Observable
 * to brand a derived stream as gated (e.g. a filtered view of a gated source).
 *
 * NOTE: the brand only survives as the outermost wrapper. `.pipe()`/`lift` return a
 * plain Observable and drop the brand, so `instanceof GatedObserver` is reliable only
 * on the direct return of createOptimizedPipeline or `new GatedObserver(...)`. If you
 * derive from a gated stream and need the result to read as gated, wrap the final
 * stream in `new GatedObserver(...)` (as ComboBox does with its filtered list).
 */
export class GatedObserver<T> extends Observable<T> {
    constructor(source: Observable<T>) {
        super((subscriber: Subscriber<T>) => source.subscribe(subscriber));
    }
}

export interface PipelineLogger {
    warn(message: string): void;
}

export interface OptimizedPipelineOptions {
    rootMargin?: string;       // default '0px 0px 200px 0px'
    threshold?: number;        // default 0.01
    appearDebounceMs?: number; // default 20
    retryCount?: number;       // default 5
    retryBaseMs?: number;      // default 500
    logger?: PipelineLogger;   // default console
    eagerFirst?: boolean;      // default false — see createOptimizedPipeline doc
}

/**
 * Wraps a raw data stream in a visibility-driven, energy-efficient pipeline.
 *
 * - Lazy: does not subscribe to source$ until the element enters the viewport.
 * - Instant teardown: unsubscribes from source$ the moment the element leaves the viewport.
 * - Self-healing: exponential-backoff retry per visibility window; a new window starts fresh.
 * - Deterministic cleanup: unsubscribing disposes the IntersectionObserver, retry timers, and source.
 * - Idempotent: a source that is already a GatedObserver is returned as-is, so callers can
 *   pass any stream without first checking whether it has been gated upstream.
 * - Graceful fallback: when IntersectionObserver is unavailable (SSR, old runtimes) the
 *   element is treated as always visible and source$ is subscribed synchronously, ungated.
 * - Eager first paint (opt-in via `eagerFirst`, default false): a value emitted before the
 *   element is visible — e.g. a cached/precomputed value — is painted once by the eager
 *   branch (`take(1)` on a `share()`-d source) and is NOT replayed by the gated branch; the
 *   gated branch delivers everything from visibility onward, independent of what the eager
 *   branch already showed. Each visibility window still (re)subscribes source$ from scratch,
 *   same as the non-eager path — `share()` only avoids a *duplicate* concurrent subscription
 *   for the current window, it does not persist state across windows. In the rare case where
 *   the eager `take(1)` completes before the gated branch joins the shared source, a cold
 *   source$ may be subscribed twice for that first window; this is accepted as harmless.
 *   In the IO-less fallback (always visible, see below) the eager branch is skipped entirely —
 *   the gated branch alone already fires synchronously, so adding a second, separate eager
 *   subscription there would only risk delivering the same value twice for no benefit. The eager
 *   branch is torn down (via `takeUntil`) the moment visibility first resolves true, so once the
 *   element is visible only the gated branch remains subscribed — a value source$ emits after
 *   that point is never delivered twice.
 */
export function createOptimizedPipeline<T>(
    element: HTMLElement,
    source$: Observable<T>,
    options: OptimizedPipelineOptions = {}
): GatedObserver<T> {
    // Already gated upstream — don't wrap it again (no second IntersectionObserver/subscription).
    if (source$ instanceof GatedObserver) {
        return source$;
    }

    const {
        rootMargin = '0px 0px 200px 0px',
        threshold = 0.01,
        appearDebounceMs = 20,
        retryCount = 5,
        retryBaseMs = 500,
        logger = console,
        eagerFirst = false,
    } = options;

    // Hand-rolled IntersectionObserver observable. teardown via observer.disconnect()
    // ensures the native observer is always cleaned up on unsubscribe.
    const observedVisibility = (): Observable<boolean> => new Observable<boolean>(subscriber => {
        const observer = new IntersectionObserver(
            (entries: IntersectionObserverEntry[]) => {
                subscriber.next(entries.some(e => e.isIntersecting));
            },
            { rootMargin, threshold }
        );
        observer.observe(element);
        return () => observer.disconnect();
    }).pipe(
        distinctUntilChanged(),
        // Asymmetric debounce: guard fast scrolls on appear, react instantly on disappear.
        debounce((isVisible: boolean) => isVisible ? timer(appearDebounceMs) : of(null)),
        distinctUntilChanged()
    );

    // Everything below is rebuilt fresh inside `defer` for every external subscription to the
    // returned pipeline, so the pipeline stays cold: each subscriber gets its own
    // IntersectionObserver and (per visibility window) its own source$ execution, wholly
    // independent of any other subscriber.
    return new GatedObserver(
        defer(() => {
            // Without IntersectionObserver (SSR, old runtimes) the element is always visible and
            // the source is subscribed synchronously, with no debounce. Must never complete —
            // switchMap would otherwise complete the whole GatedObserver once the inner stream
            // ends (retries exhausted, or a finite source$), breaking the self-healing contract.
            const hasObserver = typeof IntersectionObserver === 'function';
            const visibility$ = hasObserver ? observedVisibility() : concat(of(true), NEVER);

            // The default (non-eager) path reads source$ directly, unwrapped — a finite source
            // completing inside a visibility window is re-subscribed fresh on the next window,
            // exactly as before eagerFirst existed. With eagerFirst on, share() (plain, non-
            // replaying, default resetOnRefCountZero) lets the eager take(1) below and the gated
            // chain pull from a single concurrent subscription instead of two, without caching
            // or replaying anything across visibility windows.
            const src$ = eagerFirst ? source$.pipe(share()) : source$;

            // Multicast visibility only when eagerFirst needs a second (independent) look at it
            // below (`opened$`) — the default path keeps a single subscriber to visibility$, so
            // no sharing overhead is added there.
            const vis$ = eagerFirst ? visibility$.pipe(share()) : visibility$;

            const gated$ = vis$.pipe(
                switchMap((isVisible: boolean) => {
                    if (!isVisible) {
                        return EMPTY;
                    }

                    return src$.pipe(
                        retry({
                            count: retryCount,
                            delay: (_err: unknown, attempt: number) => {
                                const delayMs = retryBaseMs * Math.pow(2, attempt - 1);
                                logger.warn(`[UI Pipeline] Network failure. Retry #${attempt} in ${delayMs}ms`);
                                return timer(delayMs);
                            },
                        }),
                        catchError((err: unknown) => {
                            logger.warn(`[UI Pipeline] Giving up after ${retryCount} retries: ${err}`);
                            return EMPTY;
                        })
                    );
                })
            );

            // In the IO-less fallback, visibility is already synchronous and always-true, so
            // gated$ alone delivers the first value immediately — a separate eager$ branch
            // would add nothing but a risk of delivering the same value twice.
            if (!eagerFirst || !hasObserver) {
                return gated$;
            }

            // Cancel the eager path the moment visibility first resolves true, even if source$'s
            // first value hasn't arrived yet — the gated branch takes over from there, so a
            // value source$ emits after that point is delivered exactly once, via gated$ only.
            const opened$ = vis$.pipe(filter(Boolean), take(1));

            // Paint the first value immediately, before visibility is known. Errors here are
            // swallowed rather than propagated — resilience (retry/backoff) is the gated
            // branch's job; a failed eager attempt should not error the whole pipeline.
            const eager$ = src$.pipe(take(1), catchError(() => EMPTY), takeUntil(opened$));

            // eager$ first, so takeUntil subscribes to opened$ (and therefore vis$) before
            // gated$ does. On open, the eager branch tears down first and the gated branch
            // subscribes fresh — at worst a second cold subscription, already accepted above.
            return merge(eager$, gated$);
        })
    );
}
