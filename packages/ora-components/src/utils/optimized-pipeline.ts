import { Observable, EMPTY, timer, of } from 'rxjs';
import { debounce, distinctUntilChanged, switchMap, catchError, retry } from 'rxjs/operators';

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
 */
export function createOptimizedPipeline<T>(
    element: HTMLElement,
    source$: Observable<T>,
    options: OptimizedPipelineOptions = {}
): Observable<T> {
    const {
        rootMargin = '0px 0px 200px 0px',
        threshold = 0.01,
        appearDebounceMs = 150,
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

    return visibility$.pipe(
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
    );
}
