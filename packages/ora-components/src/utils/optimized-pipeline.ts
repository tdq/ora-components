import { Observable, EMPTY, timer, of, Subscriber } from 'rxjs';
import { debounce, distinctUntilChanged, switchMap, catchError, retry } from 'rxjs/operators';

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
    appearDebounceMs?: number; // default 150
    retryCount?: number;       // default 5
    retryBaseMs?: number;      // default 500
    logger?: PipelineLogger;   // default console
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
    } = options;

    // Hand-rolled IntersectionObserver observable. teardown via observer.disconnect()
    // ensures the native observer is always cleaned up on unsubscribe.
    const visibility$ = new Observable<boolean>(subscriber => {
        const observer = new IntersectionObserver(
            (entries: IntersectionObserverEntry[]) => {
                subscriber.next(entries.some(e => e.isIntersecting));
            },
            { rootMargin, threshold }
        );
        observer.observe(element);
        return () => observer.disconnect();
    }).pipe(
        distinctUntilChanged()
    );

    return new GatedObserver(
        visibility$.pipe(
            // Asymmetric debounce: guard fast scrolls on appear, react instantly on disappear.
            debounce((isVisible: boolean) => isVisible ? timer(appearDebounceMs) : of(null)),
            distinctUntilChanged(),
            switchMap((isVisible: boolean) => {
                if (!isVisible) {
                    return EMPTY;
                }

                return source$.pipe(
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
        )
    );
}
