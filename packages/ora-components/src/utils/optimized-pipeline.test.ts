import { Observable, Subject, BehaviorSubject, of } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { createOptimizedPipeline, GatedObserver } from './optimized-pipeline';

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

        // No options passed — all defaults in effect (appearDebounceMs=20, retryBaseMs=500)
        const pipeline$ = createOptimizedPipeline(element, source$);

        const results: number[] = [];
        pipeline$.subscribe(v => results.push(v));

        getMock().triggerVisibility(element, true);
        // Default appearDebounceMs is 20 — advance past it
        jest.advanceTimersByTime(20);

        // First call errored; retry #1 default delay = 500 * 2^0 = 500ms
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Retry #1 in 500ms'));

        jest.advanceTimersByTime(500);
        // Second call succeeds
        expect(results).toEqual([77]);

        consoleSpy.mockRestore();
    });

    // -----------------------------------------------------------------------
    // 8b. DEFAULT appearDebounceMs IS EXACTLY 20ms (matches the JSDoc/option comment)
    // -----------------------------------------------------------------------
    it('uses exactly 20ms as the default appear debounce (nothing at 19ms, flowing at 20ms)', () => {
        const subject = new Subject<number>();
        const pipeline$ = createOptimizedPipeline(element, subject.asObservable(), { logger });

        const results: number[] = [];
        const sub = pipeline$.subscribe(v => results.push(v));

        getMock().triggerVisibility(element, true);

        jest.advanceTimersByTime(19);
        subject.next(1);
        expect(results).toEqual([]);

        jest.advanceTimersByTime(1); // total 20ms — debounce fires
        subject.next(2);
        expect(results).toEqual([2]);

        sub.unsubscribe();
        subject.complete();
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
    // 11. GATED OBSERVER: return type branding
    // -----------------------------------------------------------------------
    it('returns a GatedObserver instance (also instanceof Observable)', () => {
        const subject = new Subject<number>();
        const pipeline$ = createOptimizedPipeline(element, subject.asObservable(), { logger });

        expect(pipeline$).toBeInstanceOf(GatedObserver);
        expect(pipeline$).toBeInstanceOf(Observable);
    });

    // -----------------------------------------------------------------------
    // 12. GATED OBSERVER: standalone construction and subscription
    // -----------------------------------------------------------------------
    it('GatedObserver wrapping of(1,2,3) is instanceof GatedObserver and emits all values', () => {
        const gated$ = new GatedObserver(of(1, 2, 3));

        expect(gated$).toBeInstanceOf(GatedObserver);
        expect(gated$).toBeInstanceOf(Observable);

        const results: number[] = [];
        gated$.subscribe(v => results.push(v));

        expect(results).toEqual([1, 2, 3]);
    });

    it('is idempotent: returns an already-gated source untouched without creating a new observer', () => {
        const element = document.createElement('div');
        const alreadyGated$ = new GatedObserver(of(1, 2, 3));

        const ioSpy = jest.spyOn(window, 'IntersectionObserver');
        const result$ = createOptimizedPipeline(element, alreadyGated$);

        // Same instance returned — no re-wrapping.
        expect(result$).toBe(alreadyGated$);

        // No IntersectionObserver is created for an already-gated source until/unless subscribed.
        const results: number[] = [];
        result$.subscribe(v => results.push(v));
        expect(results).toEqual([1, 2, 3]);
        expect(ioSpy).not.toHaveBeenCalled();

        ioSpy.mockRestore();
    });

    // -----------------------------------------------------------------------
    // 13. DISTINCT VISIBILITY: rapid repeated same-state signals do not
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

    // -----------------------------------------------------------------------
    // 14. NO IntersectionObserver (SSR / old runtimes): always visible, synchronous
    // -----------------------------------------------------------------------
    describe('fallback when IntersectionObserver is unavailable', () => {
        let original: any;

        beforeEach(() => {
            original = (globalThis as any).IntersectionObserver;
        });

        afterEach(() => {
            (globalThis as any).IntersectionObserver = original;
        });

        it('renders synchronously without gating when IntersectionObserver is undefined', () => {
            (globalThis as any).IntersectionObserver = undefined;

            const results: number[] = [];
            expect(() => {
                createOptimizedPipeline(element, of(1), { logger }).subscribe(v => results.push(v));
            }).not.toThrow();
            // No timers advanced — delivery must be synchronous
            expect(results).toEqual([1]);
        });

        it('does not throw and renders synchronously when IntersectionObserver is null', () => {
            (globalThis as any).IntersectionObserver = null;

            const results: number[] = [];
            let outerComplete = false;
            let outerError: unknown;
            expect(() => {
                createOptimizedPipeline(element, of(1), { logger }).subscribe({
                    next: v => results.push(v),
                    error: e => { outerError = e; },
                    complete: () => { outerComplete = true; },
                });
            }).not.toThrow();
            expect(results).toEqual([1]);

            // A finite source$ must not complete the outer GatedObserver (NEVER tail).
            expect(outerComplete).toBe(false);
            expect(outerError).toBeUndefined();
        });

        it('does not complete the outer pipeline for a finite source when IntersectionObserver is undefined', () => {
            (globalThis as any).IntersectionObserver = undefined;

            const results: number[] = [];
            let outerComplete = false;
            let outerError: unknown;
            createOptimizedPipeline(element, of(1, 2, 3), { logger }).subscribe({
                next: v => results.push(v),
                error: e => { outerError = e; },
                complete: () => { outerComplete = true; },
            });

            expect(results).toEqual([1, 2, 3]);
            expect(outerComplete).toBe(false);
            expect(outerError).toBeUndefined();
        });

        it('constructs no IntersectionObserver at all in the fallback path', () => {
            (globalThis as any).IntersectionObserver = undefined;

            const subject = new Subject<number>();
            const sub = createOptimizedPipeline(element, subject.asObservable(), { logger }).subscribe();

            expect(getMock().instances).toHaveLength(0);

            sub.unsubscribe();
            subject.complete();
        });

        it('unsubscribing the fallback pipeline tears down the source subscription (no leak)', () => {
            (globalThis as any).IntersectionObserver = undefined;

            const subject = new Subject<number>();
            const teardownSpy = jest.fn();
            const subscribeSpy = jest.fn();

            const source$ = new Observable<number>(subscriber => {
                subscribeSpy();
                const inner = subject.subscribe(subscriber);
                return () => {
                    teardownSpy();
                    inner.unsubscribe();
                };
            });

            const results: number[] = [];
            const subscription = createOptimizedPipeline(element, source$, { logger })
                .subscribe(v => results.push(v));

            // Synchronous subscribe — no timers advanced.
            expect(subscribeSpy).toHaveBeenCalledTimes(1);
            subject.next(1);
            expect(results).toEqual([1]);
            expect(subject.observed).toBe(true);

            subscription.unsubscribe();

            expect(teardownSpy).toHaveBeenCalledTimes(1);
            // The source is fully detached: the Subject has no observers left.
            expect(subject.observed).toBe(false);
            subject.next(2);
            expect(results).toEqual([1]);

            subject.complete();
        });

        it('is cold in the fallback: each subscriber gets its own source subscription and independent teardown', () => {
            (globalThis as any).IntersectionObserver = undefined;

            const subject = new Subject<number>();
            const subscribeSpy = jest.fn();
            const source$ = new Observable<number>(subscriber => {
                subscribeSpy();
                const inner = subject.subscribe(subscriber);
                return () => inner.unsubscribe();
            });

            const pipeline$ = createOptimizedPipeline(element, source$, { logger });

            const a: number[] = [];
            const b: number[] = [];
            const subA = pipeline$.subscribe(v => a.push(v));
            const subB = pipeline$.subscribe(v => b.push(v));

            expect(subscribeSpy).toHaveBeenCalledTimes(2);

            subject.next(1);
            expect(a).toEqual([1]);
            expect(b).toEqual([1]);

            // Tearing down one subscriber must not disturb the other.
            subA.unsubscribe();
            subject.next(2);
            expect(a).toEqual([1]);
            expect(b).toEqual([1, 2]);

            subB.unsubscribe();
            expect(subject.observed).toBe(false);
            subject.complete();
        });

        it('stays idempotent in the fallback: an already-gated source is returned untouched', () => {
            (globalThis as any).IntersectionObserver = undefined;

            const alreadyGated$ = new GatedObserver(of(1, 2, 3));
            let result$: GatedObserver<number>;

            expect(() => {
                result$ = createOptimizedPipeline(element, alreadyGated$, { logger });
            }).not.toThrow();

            expect(result$!).toBe(alreadyGated$);

            const results: number[] = [];
            let completed = false;
            result$!.subscribe({
                next: v => results.push(v),
                complete: () => { completed = true; },
            });

            // Pass-through semantics are unchanged: of(...) still completes.
            expect(results).toEqual([1, 2, 3]);
            expect(completed).toBe(true);
        });

        it('mirrors test 6: exhausts retries but keeps the outer pipeline alive (self-healing)', () => {
            (globalThis as any).IntersectionObserver = undefined;

            let attempts = 0;
            const source$ = new Observable<number>(subscriber => {
                attempts++;
                subscriber.error(new Error('always fail'));
            });

            const pipeline$ = createOptimizedPipeline(element, source$, {
                retryCount: 2,
                retryBaseMs: 50,
                logger,
            });

            let outerError: unknown;
            let outerComplete = false;
            pipeline$.subscribe({
                next: () => {},
                error: e => { outerError = e; },
                complete: () => { outerComplete = true; },
            });

            // Retry #1: 50ms, Retry #2: 100ms
            jest.advanceTimersByTime(50);
            jest.advanceTimersByTime(100);

            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Giving up after 2 retries')
            );
            expect(attempts).toBe(3);
            expect(outerError).toBeUndefined();
            expect(outerComplete).toBe(false);
        });

        it('mirrors test 10: does not complete the outer pipeline when source$ completes normally', () => {
            (globalThis as any).IntersectionObserver = undefined;

            const subject = new Subject<number>();
            const source$ = subject.asObservable();

            const pipeline$ = createOptimizedPipeline(element, source$, { logger });

            const results: number[] = [];
            let outerComplete = false;
            let outerError: unknown;
            pipeline$.subscribe({
                next: v => results.push(v),
                error: e => { outerError = e; },
                complete: () => { outerComplete = true; },
            });

            subject.next(7);
            subject.complete();

            expect(results).toEqual([7]);
            expect(outerComplete).toBe(false);
            expect(outerError).toBeUndefined();

            // Outer pipeline stays alive — nothing further is delivered since source$ completed,
            // but the GatedObserver itself must not have completed or errored.
            expect(outerComplete).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // eagerFirst: deliver source$'s first value synchronously before visibility
    // -----------------------------------------------------------------------
    describe('eagerFirst option', () => {
        it('emits the first value synchronously before any intersection is observed', () => {
            const source$ = of(42);
            const pipeline$ = createOptimizedPipeline(element, source$, { eagerFirst: true, logger });

            const results: number[] = [];
            pipeline$.subscribe(v => results.push(v));

            // No triggerVisibility, no timer advance — must already be there.
            expect(results).toEqual([42]);
        });

        it('delivers the eager value once; the gated branch joining later does not replay it (a cold source may resubscribe)', () => {
            const subscribeSpy = jest.fn();
            let calls = 0;
            // A source that only has a value to give on its very first subscription — models
            // e.g. a cache hit that's exhausted after being read once. Regardless of whether
            // the gated branch triggers a second real subscription when visibility resolves
            // (accepted per the JSDoc), it must not cause the eager value to be re-delivered.
            const source$ = new Observable<number>(subscriber => {
                subscribeSpy();
                calls++;
                if (calls === 1) {
                    subscriber.next(1);
                }
            });

            const pipeline$ = createOptimizedPipeline(element, source$, {
                eagerFirst: true,
                appearDebounceMs: 20,
                logger,
            });

            const results: number[] = [];
            pipeline$.subscribe(v => results.push(v));

            // Eager delivery already happened synchronously.
            expect(results).toEqual([1]);

            // Element becomes visible afterwards — no stale replay of the eager value.
            getMock().triggerVisibility(element, true);
            jest.advanceTimersByTime(20);

            expect(results).toEqual([1]);
        });

        it('delivers exactly once when visibility opens before the source emits its first value (normal slow-network path)', () => {
            const subject = new Subject<number>();
            const pipeline$ = createOptimizedPipeline(element, subject.asObservable(), {
                eagerFirst: true,
                appearDebounceMs: 20,
                logger,
            });

            const results: number[] = [];
            pipeline$.subscribe(v => results.push(v));

            // Visibility resolves true before the source has emitted anything — the eager
            // branch is torn down (via takeUntil(opened$)) right here, so only the gated
            // branch remains subscribed once the element is visible.
            getMock().triggerVisibility(element, true);
            jest.advanceTimersByTime(20);

            expect(results).toEqual([]);

            subject.next(99);

            // Delivered exactly once, via the gated branch only.
            expect(results).toEqual([99]);
        });

        it('re-subscribes and re-delivers a completing source on each new visibility window (eagerFirst: false)', () => {
            let calls = 0;
            const source$ = new Observable<number>(subscriber => {
                calls++;
                subscriber.next(calls);
                subscriber.complete();
            });

            const pipeline$ = createOptimizedPipeline(element, source$, { appearDebounceMs: 20, logger });

            const results: number[] = [];
            pipeline$.subscribe(v => results.push(v));

            getMock().triggerVisibility(element, true);
            jest.advanceTimersByTime(20);
            expect(results).toEqual([1]);

            getMock().triggerVisibility(element, false);
            getMock().triggerVisibility(element, true);
            jest.advanceTimersByTime(20);

            expect(results).toEqual([1, 2]);
            expect(calls).toBe(2);
        });

        it('delivers the eager value once, then re-subscribes a completing source per visibility window with no stale replay (eagerFirst: true)', () => {
            let calls = 0;
            const source$ = new Observable<number>(subscriber => {
                calls++;
                subscriber.next(calls);
                subscriber.complete();
            });

            const pipeline$ = createOptimizedPipeline(element, source$, {
                eagerFirst: true,
                appearDebounceMs: 20,
                logger,
            });

            const results: number[] = [];
            pipeline$.subscribe(v => results.push(v));

            // Eager delivers synchronously before any visibility, from its own subscription.
            expect(results).toEqual([1]);
            expect(calls).toBe(1);

            getMock().triggerVisibility(element, true);
            jest.advanceTimersByTime(20);

            // The gated branch subscribes fresh for this window too (the eager source$
            // execution already completed and reset by the time visibility resolves) —
            // its own new value, not a replay of the eager one.
            expect(results).toEqual([1, 2]);

            getMock().triggerVisibility(element, false);
            getMock().triggerVisibility(element, true);
            jest.advanceTimersByTime(20);

            expect(results).toEqual([1, 2, 3]);
            expect(calls).toBe(3);
        });

        it('leaves existing behaviour unchanged when eagerFirst is false (default)', () => {
            const subject = new Subject<number>();
            const pipeline$ = createOptimizedPipeline(element, subject.asObservable(), {
                appearDebounceMs: 20,
                logger,
            });

            const results: number[] = [];
            pipeline$.subscribe(v => results.push(v));

            // Nothing before visibility, exactly as the default (gated-only) contract requires.
            expect(results).toEqual([]);

            getMock().triggerVisibility(element, true);
            jest.advanceTimersByTime(20);
            subject.next(7);

            expect(results).toEqual([7]);
        });

        it('IO-less fallback with eagerFirst delivers the first value exactly once (no duplication)', () => {
            const original = (globalThis as any).IntersectionObserver;
            (globalThis as any).IntersectionObserver = undefined;
            try {
                const subscribeSpy = jest.fn();
                const source$ = new Observable<number>(subscriber => {
                    subscribeSpy();
                    subscriber.next(5);
                });

                const results: number[] = [];
                createOptimizedPipeline(element, source$, { eagerFirst: true, logger })
                    .subscribe(v => results.push(v));

                expect(results).toEqual([5]);
                expect(subscribeSpy).toHaveBeenCalledTimes(1);
            } finally {
                (globalThis as any).IntersectionObserver = original;
            }
        });

        it('paints only the first pre-visibility value (take(1)), not every value the source emits before opening', () => {
            const subject = new Subject<number>();
            const pipeline$ = createOptimizedPipeline(element, subject.asObservable(), {
                eagerFirst: true,
                appearDebounceMs: 20,
                logger,
            });

            const results: number[] = [];
            const sub = pipeline$.subscribe(v => results.push(v));

            subject.next(1);
            subject.next(2);
            subject.next(3);

            // take(1) — the eager branch paints the first value and then stands down.
            expect(results).toEqual([1]);

            // From visibility onward the gated branch delivers everything.
            getMock().triggerVisibility(element, true);
            jest.advanceTimersByTime(20);
            subject.next(4);
            expect(results).toEqual([1, 4]);

            sub.unsubscribe();
            subject.complete();
        });

        it('tears down the eager branch, the source, and the IntersectionObserver on unsubscribe before visibility', () => {
            const subject = new Subject<number>();
            const teardownSpy = jest.fn();
            const source$ = new Observable<number>(subscriber => {
                const inner = subject.subscribe(subscriber);
                return () => {
                    teardownSpy();
                    inner.unsubscribe();
                };
            });

            const pipeline$ = createOptimizedPipeline(element, source$, {
                eagerFirst: true,
                appearDebounceMs: 20,
                logger,
            });

            const subscription = pipeline$.subscribe();

            // The eager branch holds a live subscription to source$ before visibility.
            expect(subject.observed).toBe(true);

            subscription.unsubscribe();

            expect(teardownSpy).toHaveBeenCalled();
            expect(subject.observed).toBe(false);

            const stillObserving = (getMock().instances ?? []).some(
                inst => inst.observedElements && inst.observedElements.has(element)
            );
            expect(stillObserving).toBe(false);

            subject.complete();
        });

        it('tears down the gated branch, the source, and the IntersectionObserver on unsubscribe after visibility', () => {
            const subject = new Subject<number>();
            const teardownSpy = jest.fn();
            const source$ = new Observable<number>(subscriber => {
                const inner = subject.subscribe(subscriber);
                return () => {
                    teardownSpy();
                    inner.unsubscribe();
                };
            });

            const pipeline$ = createOptimizedPipeline(element, source$, {
                eagerFirst: true,
                appearDebounceMs: 20,
                logger,
            });

            const results: number[] = [];
            const subscription = pipeline$.subscribe(v => results.push(v));

            getMock().triggerVisibility(element, true);
            jest.advanceTimersByTime(20);
            subject.next(1);
            expect(results).toEqual([1]);

            subscription.unsubscribe();

            expect(teardownSpy).toHaveBeenCalled();
            // Both branches gone — the Subject has no observers left at all.
            expect(subject.observed).toBe(false);
            subject.next(2);
            expect(results).toEqual([1]);

            const stillObserving = (getMock().instances ?? []).some(
                inst => inst.observedElements && inst.observedElements.has(element)
            );
            expect(stillObserving).toBe(false);

            subject.complete();
        });

        it('swallows an error raised before visibility; the gated branch still retries with backoff and succeeds', () => {
            let calls = 0;
            const source$ = new Observable<number>(subscriber => {
                calls++;
                if (calls < 3) {
                    subscriber.error(new Error(`fail #${calls}`));
                } else {
                    subscriber.next(123);
                }
            });

            const pipeline$ = createOptimizedPipeline(element, source$, {
                eagerFirst: true,
                appearDebounceMs: 20,
                retryCount: 5,
                retryBaseMs: 100,
                logger,
            });

            const results: number[] = [];
            let outerError: unknown;
            let outerComplete = false;
            const sub = pipeline$.subscribe({
                next: v => results.push(v),
                error: e => { outerError = e; },
                complete: () => { outerComplete = true; },
            });

            // Attempt #1 happened eagerly and failed. The eager branch has no retry —
            // it swallows the error (catchError -> EMPTY) rather than propagating it.
            expect(calls).toBe(1);
            expect(results).toEqual([]);
            expect(outerError).toBeUndefined();
            expect(outerComplete).toBe(false);
            expect(logger.warn).not.toHaveBeenCalled();

            // Resilience is the gated branch's job — it starts fresh at visibility.
            getMock().triggerVisibility(element, true);
            jest.advanceTimersByTime(20);

            expect(calls).toBe(2);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Retry #1 in 100ms')
            );

            jest.advanceTimersByTime(100);

            expect(calls).toBe(3);
            expect(results).toEqual([123]);
            expect(outerError).toBeUndefined();
            expect(outerComplete).toBe(false);

            sub.unsubscribe();
        });

        it('a replaying source (BehaviorSubject) re-delivers its current value when the gated branch joins — downstream distinctUntilChanged absorbs it', () => {
            const value$ = new BehaviorSubject<number>(10);
            const pipeline$ = createOptimizedPipeline(element, value$.asObservable(), {
                eagerFirst: true,
                appearDebounceMs: 20,
                logger,
            });

            const raw: number[] = [];
            const deduped: number[] = [];
            const subA = pipeline$.subscribe(v => raw.push(v));
            const subB = pipeline$.pipe(distinctUntilChanged()).subscribe(v => deduped.push(v));

            expect(raw).toEqual([10]);

            getMock().triggerVisibility(element, true);
            jest.advanceTimersByTime(20);

            // Documented contract: every visibility window re-subscribes source$ from scratch,
            // so a replaying source hands the same value to the gated branch again.
            expect(raw).toEqual([10, 10]);
            // This is why consumers such as money-kpi-card-viewport pipe the gated stream
            // through distinctUntilChanged — the repaint is collapsed.
            expect(deduped).toEqual([10]);

            value$.next(20);
            expect(raw).toEqual([10, 10, 20]);
            expect(deduped).toEqual([10, 20]);

            subA.unsubscribe();
            subB.unsubscribe();
            value$.complete();
        });
    });
});
