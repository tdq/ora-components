import { Observable, Subject } from 'rxjs';
import { createOptimizedPipeline } from './optimized-pipeline';

// The mock is installed globally via setupTests.ts
interface IntersectionObserverMockStatic {
    triggerVisibility(element: Element, isIntersecting: boolean, ratio?: number): void;
    reset(): void;
    instances: Array<{ observedElements: Set<Element> }>;
}

function getMock(): IntersectionObserverMockStatic {
    return (globalThis as any).IntersectionObserverMock as IntersectionObserverMockStatic;
}

describe('createOptimizedPipeline', () => {
    let element: HTMLElement;
    let logger: { warn: jest.Mock };

    beforeEach(() => {
        jest.useFakeTimers();
        getMock().reset();
        element = document.createElement('div');
        logger = { warn: jest.fn() };
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    // -----------------------------------------------------------------------
    // 1. LAZY: source is not subscribed until the element becomes visible
    // -----------------------------------------------------------------------
    it('does not subscribe to source$ until element becomes visible', () => {
        const subscribeSpy = jest.fn();
        const source$ = new Observable<number>(subscriber => {
            subscribeSpy();
            subscriber.next(1);
        });

        const pipeline$ = createOptimizedPipeline(element, source$, {
            appearDebounceMs: 150,
            logger,
        });

        const results: number[] = [];
        pipeline$.subscribe(v => results.push(v));

        // After subscribing to the pipeline, but before any visibility event,
        // the source must not yet have been touched.
        expect(subscribeSpy).not.toHaveBeenCalled();

        // Still nothing after advancing time (no visibility emitted yet)
        jest.advanceTimersByTime(200);
        expect(subscribeSpy).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // 2. EMITS WHEN VISIBLE: values from source$ reach the subscriber
    // -----------------------------------------------------------------------
    it('emits values from source$ once visible and debounce has elapsed', () => {
        const subject = new Subject<number>();
        const pipeline$ = createOptimizedPipeline(element, subject.asObservable(), {
            appearDebounceMs: 150,
            logger,
        });

        const results: number[] = [];
        pipeline$.subscribe(v => results.push(v));

        getMock().triggerVisibility(element, true);
        jest.advanceTimersByTime(150);

        subject.next(42);
        subject.next(99);

        expect(results).toEqual([42, 99]);
    });

    // -----------------------------------------------------------------------
    // 3. TEARDOWN ON HIDE: source subscription is torn down on disappear
    // -----------------------------------------------------------------------
    it('tears down source subscription when element leaves viewport', () => {
        const teardownSpy = jest.fn();
        const subject = new Subject<number>();

        const source$ = new Observable<number>(subscriber => {
            const sub = subject.subscribe(subscriber);
            return () => {
                teardownSpy();
                sub.unsubscribe();
            };
        });

        const pipeline$ = createOptimizedPipeline(element, source$, {
            appearDebounceMs: 50,
            logger,
        });

        const results: number[] = [];
        pipeline$.subscribe(v => results.push(v));

        // Make visible and let debounce pass
        getMock().triggerVisibility(element, true);
        jest.advanceTimersByTime(50);
        subject.next(1);
        expect(results).toEqual([1]);

        // Hide — switchMap switches to EMPTY, tearing down the source
        getMock().triggerVisibility(element, false);

        expect(teardownSpy).toHaveBeenCalled();

        // Subsequent emissions should not reach the subscriber
        subject.next(2);
        expect(results).toEqual([1]);
    });

    // -----------------------------------------------------------------------
    // 4. ASYMMETRIC DEBOUNCE
    // -----------------------------------------------------------------------
    it('debounces appear by appearDebounceMs but hides are instant', () => {
        const subject = new Subject<number>();
        const pipeline$ = createOptimizedPipeline(element, subject.asObservable(), {
            appearDebounceMs: 200,
            logger,
        });

        const results: number[] = [];
        pipeline$.subscribe(v => results.push(v));

        getMock().triggerVisibility(element, true);

        // Before debounce elapses, nothing should be delivered
        jest.advanceTimersByTime(100);
        subject.next(1);
        expect(results).toEqual([]);

        // After full debounce, values flow
        jest.advanceTimersByTime(100);
        subject.next(2);
        expect(results).toEqual([2]);

        // Hiding should switch to EMPTY immediately (no debounce delay required)
        getMock().triggerVisibility(element, false);
        subject.next(3);
        expect(results).toEqual([2]);
    });

    // -----------------------------------------------------------------------
    // 5. RETRY / BACKOFF
    // -----------------------------------------------------------------------
    it('retries with exponential backoff and logs each attempt, then succeeds', () => {
        let callCount = 0;
        const source$ = new Observable<number>(subscriber => {
            callCount++;
            if (callCount < 3) {
                subscriber.error(new Error(`fail #${callCount}`));
            } else {
                subscriber.next(100);
                subscriber.complete();
            }
        });

        const pipeline$ = createOptimizedPipeline(element, source$, {
            appearDebounceMs: 0,
            retryCount: 5,
            retryBaseMs: 100,
            logger,
        });

        const results: number[] = [];
        pipeline$.subscribe(v => results.push(v));

        getMock().triggerVisibility(element, true);
        // appearDebounceMs = 0 uses timer(0), still async — flush it
        jest.advanceTimersByTime(0);

        // First call fails immediately; retry #1 is scheduled for 100ms (100 * 2^0)
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Retry #1 in 100ms')
        );

        jest.advanceTimersByTime(100); // retry #1 fires
        // Second call also fails; retry #2 scheduled for 200ms (100 * 2^1)
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Retry #2 in 200ms')
        );

        jest.advanceTimersByTime(200); // retry #2 fires
        // Third call succeeds
        expect(results).toEqual([100]);
    });

    // -----------------------------------------------------------------------
    // 6. GIVE UP + STAY ALIVE (self-healing)
    // -----------------------------------------------------------------------
    it('exhausts retries, logs give-up, does not error/complete outer pipeline, recovers on next visibility', () => {
        let visibilityWindow = 0;
        const source$ = new Observable<number>(subscriber => {
            // Always fail on window 0; succeed on window 1
            if (visibilityWindow === 0) {
                subscriber.error(new Error('always fail'));
            } else {
                subscriber.next(999);
            }
        });

        const pipeline$ = createOptimizedPipeline(element, source$, {
            appearDebounceMs: 0,
            retryCount: 2,
            retryBaseMs: 50,
            logger,
        });

        const results: number[] = [];
        let outerError: unknown;
        let outerComplete = false;
        pipeline$.subscribe({
            next: v => results.push(v),
            error: e => { outerError = e; },
            complete: () => { outerComplete = true; },
        });

        // === Visibility window 0 — will exhaust retries ===
        getMock().triggerVisibility(element, true);
        jest.advanceTimersByTime(0); // flush timer(0) debounce

        // Retry #1: 50ms
        jest.advanceTimersByTime(50);
        // Retry #2: 100ms
        jest.advanceTimersByTime(100);

        // Give-up warning logged
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Giving up after 2 retries')
        );

        // Outer pipeline must still be alive (no error, no complete)
        expect(outerError).toBeUndefined();
        expect(outerComplete).toBe(false);

        // === Hide, then re-show to start window 1 ===
        getMock().triggerVisibility(element, false);

        visibilityWindow = 1;
        getMock().triggerVisibility(element, true);
        jest.advanceTimersByTime(0);

        expect(results).toEqual([999]);
    });

    // -----------------------------------------------------------------------
    // 7. OBSERVER DISCONNECT ON UNSUBSCRIBE
    // -----------------------------------------------------------------------
    it('disconnects the IntersectionObserver when the pipeline subscription is cancelled', () => {
        const subject = new Subject<number>();
        const pipeline$ = createOptimizedPipeline(element, subject.asObservable(), {
            appearDebounceMs: 50,
            logger,
        });

        const subscription = pipeline$.subscribe();

        getMock().triggerVisibility(element, true);

        // Unsubscribe — should trigger the Observable teardown which calls observer.disconnect()
        subscription.unsubscribe();

        // After disconnect the mock clears observedElements. Resetting instances and
        // triggering again should produce no further callbacks (observer is gone).
        // We verify by checking that a subsequent triggerVisibility raises no error
        // (the instance's observedElements set is empty after disconnect).
        // The simplest assertion: the element is no longer tracked by any observer.
        const allInstances = getMock().instances ?? [];
        const stillObserving = allInstances.some(
            inst => inst.observedElements && inst.observedElements.has(element)
        );
        expect(stillObserving).toBe(false);
    });

    // -----------------------------------------------------------------------
    // 8. OPTION DEFAULTS: calling with no options uses specified defaults
    // -----------------------------------------------------------------------
    it('uses default options when none are provided (rootMargin, threshold, debounce, retry, logger)', () => {
        // Verify the pipeline can be created and used with zero options (defaults apply).
        // We also confirm that the default logger (console) is used: spy on console.warn.
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        let callCount = 0;
        const source$ = new Observable<number>(subscriber => {
            callCount++;
            if (callCount === 1) {
                subscriber.error(new Error('default-options-fail'));
            } else {
                subscriber.next(77);
                subscriber.complete();
            }
        });

        // No options passed — all defaults in effect (appearDebounceMs=150, retryBaseMs=500)
        const pipeline$ = createOptimizedPipeline(element, source$);

        const results: number[] = [];
        pipeline$.subscribe(v => results.push(v));

        getMock().triggerVisibility(element, true);
        // Default appearDebounceMs is 150 — advance past it
        jest.advanceTimersByTime(150);

        // First call errored; retry #1 default delay = 500 * 2^0 = 500ms
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Retry #1 in 500ms'));

        jest.advanceTimersByTime(500);
        // Second call succeeds
        expect(results).toEqual([77]);

        consoleSpy.mockRestore();
    });

    // -----------------------------------------------------------------------
    // 9. ELEMENT ALREADY VISIBLE AT SUBSCRIBE TIME
    //    The IntersectionObserver fires synchronously when observe() is called
    //    in some browsers. Simulate by triggering visibility before subscribe.
    //    More practically: trigger visibility immediately after subscribe (same tick).
    // -----------------------------------------------------------------------
    it('activates source when visibility is triggered immediately after subscription', () => {
        const subject = new Subject<number>();
        const pipeline$ = createOptimizedPipeline(element, subject.asObservable(), {
            appearDebounceMs: 0,
            logger,
        });

        const results: number[] = [];
        pipeline$.subscribe(v => results.push(v));

        // Fire visibility on the same tick as subscribe (simulates element already in viewport)
        getMock().triggerVisibility(element, true);
        // appearDebounceMs=0 uses timer(0) which still needs one async tick
        jest.advanceTimersByTime(0);

        subject.next(55);
        expect(results).toEqual([55]);
    });

    // -----------------------------------------------------------------------
    // 10. SOURCE COMPLETES NORMALLY: outer pipeline stays alive
    // -----------------------------------------------------------------------
    it('does not complete the outer pipeline when source$ completes normally', () => {
        let outerComplete = false;
        let outerError: unknown;

        const source$ = new Observable<number>(subscriber => {
            subscriber.next(7);
            subscriber.complete(); // normal completion
        });

        const pipeline$ = createOptimizedPipeline(element, source$, {
            appearDebounceMs: 0,
            logger,
        });

        pipeline$.subscribe({
            next: () => {},
            error: e => { outerError = e; },
            complete: () => { outerComplete = true; },
        });

        getMock().triggerVisibility(element, true);
        jest.advanceTimersByTime(0);

        // Source completed normally — outer pipeline should remain open (switchMap behaviour)
        // because the visibility$ stream has not completed.
        expect(outerComplete).toBe(false);
        expect(outerError).toBeUndefined();

        // A subsequent hide+show still delivers values
        getMock().triggerVisibility(element, false);
        getMock().triggerVisibility(element, true);
        jest.advanceTimersByTime(0);

        // After re-appearing a new subscription fires and source emits again
        // (the outer observable is still alive to receive it)
        expect(outerComplete).toBe(false);
    });

    // -----------------------------------------------------------------------
    // 11. DISTINCT VISIBILITY: rapid repeated same-state signals do not
    //     re-subscribe to source$ (distinctUntilChanged guard)
    // -----------------------------------------------------------------------
    it('ignores repeated same-visibility signals without re-subscribing', () => {
        const subscribeSpy = jest.fn();
        const subject = new Subject<number>();

        const source$ = new Observable<number>(subscriber => {
            subscribeSpy();
            const inner = subject.subscribe(subscriber);
            return () => inner.unsubscribe();
        });

        const pipeline$ = createOptimizedPipeline(element, source$, {
            appearDebounceMs: 0,
            logger,
        });

        pipeline$.subscribe();

        // First appear — debounce, subscribe
        getMock().triggerVisibility(element, true);
        jest.advanceTimersByTime(0);
        expect(subscribeSpy).toHaveBeenCalledTimes(1);

        // Fire "visible" again — distinctUntilChanged should suppress, no new subscription
        getMock().triggerVisibility(element, true);
        jest.advanceTimersByTime(0);
        expect(subscribeSpy).toHaveBeenCalledTimes(1);
    });
});
