/**
 * Spec compliance tests for IntersectionObserverMock defined in setupTests.ts.
 *
 * Accesses the mock via `(globalThis as any).IntersectionObserverMock` as
 * documented in setupTests.ts.
 */

// The mock is installed by setupFilesAfterEnv (setupTests.ts), so it is already
// on globalThis before any test runs.
const Mock: typeof IntersectionObserver & {
  instances: any[];
  triggerVisibility(element: Element, isIntersecting: boolean, ratio?: number): void;
  reset(): void;
} = (globalThis as any).IntersectionObserverMock;

describe('IntersectionObserverMock — spec compliance', () => {
  let el: HTMLElement;

  beforeEach(() => {
    Mock.reset();
    el = document.createElement('div');
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ── Construction & readonly properties ──────────────────────────────────────

  describe('constructor and readonly properties', () => {
    it('creates an instance that satisfies IntersectionObserver interface', () => {
      const cb = jest.fn();
      const observer = new Mock(cb);
      expect(typeof observer.observe).toBe('function');
      expect(typeof observer.unobserve).toBe('function');
      expect(typeof observer.disconnect).toBe('function');
      expect(typeof observer.takeRecords).toBe('function');
    });

    it('defaults root to null when no options provided', () => {
      const observer = new Mock(jest.fn());
      expect(observer.root).toBeNull();
    });

    it('defaults rootMargin to "0px" when no options provided', () => {
      const observer = new Mock(jest.fn());
      expect(observer.rootMargin).toBe('0px');
    });

    it('defaults thresholds to [0] when no threshold option provided', () => {
      const observer = new Mock(jest.fn());
      expect(observer.thresholds).toEqual([0]);
    });

    it('accepts a custom root element', () => {
      const root = document.createElement('div');
      const observer = new Mock(jest.fn(), { root });
      expect(observer.root).toBe(root);
    });

    it('accepts a custom rootMargin', () => {
      const observer = new Mock(jest.fn(), { rootMargin: '10px 20px' });
      expect(observer.rootMargin).toBe('10px 20px');
    });

    it('wraps a single numeric threshold in an array', () => {
      const observer = new Mock(jest.fn(), { threshold: 0.5 });
      expect(observer.thresholds).toEqual([0.5]);
    });

    it('preserves an array threshold as-is', () => {
      const observer = new Mock(jest.fn(), { threshold: [0, 0.5, 1] });
      expect(observer.thresholds).toEqual([0, 0.5, 1]);
    });
  });

  // ── Static instances registry ────────────────────────────────────────────────

  describe('static instances registry', () => {
    it('registers each new observer in Mock.instances', () => {
      expect(Mock.instances).toHaveLength(0);
      new Mock(jest.fn());
      expect(Mock.instances).toHaveLength(1);
      new Mock(jest.fn());
      expect(Mock.instances).toHaveLength(2);
    });

    it('reset() empties the instances registry', () => {
      new Mock(jest.fn());
      new Mock(jest.fn());
      Mock.reset();
      expect(Mock.instances).toHaveLength(0);
    });

    it('instances are isolated after reset() — new instances only in current test', () => {
      // Simulates the beforeEach/afterEach isolation pattern
      const cb = jest.fn();
      const observer = new Mock(cb);
      observer.observe(el);
      Mock.reset();

      // After reset the old observer is gone; triggerVisibility should not fire cb
      Mock.triggerVisibility(el, true);
      expect(cb).not.toHaveBeenCalled();
    });
  });

  // ── window.IntersectionObserver assignment ───────────────────────────────────

  describe('global assignment', () => {
    it('window.IntersectionObserver is set to the mock (or a pre-existing value)', () => {
      // jsdom does not provide IntersectionObserver, so the mock takes the slot
      expect(window.IntersectionObserver).toBeDefined();
    });

    it('IntersectionObserverMock is reachable via globalThis', () => {
      expect((globalThis as any).IntersectionObserverMock).toBeDefined();
      expect((globalThis as any).IntersectionObserverMock).toBe(Mock);
    });

    it('instances created via window.IntersectionObserver appear in Mock.instances', () => {
      new window.IntersectionObserver(jest.fn());
      expect(Mock.instances).toHaveLength(1);
    });
  });

  // ── observe / unobserve / disconnect ────────────────────────────────────────

  describe('observe / unobserve / disconnect', () => {
    it('observe tracks the element so triggerVisibility fires the callback', () => {
      const cb = jest.fn();
      const observer = new Mock(cb);
      observer.observe(el);
      Mock.triggerVisibility(el, true);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('observing the same element twice does not duplicate callback invocations', () => {
      const cb = jest.fn();
      const observer = new Mock(cb);
      observer.observe(el);
      observer.observe(el); // Set semantics — no duplicate
      Mock.triggerVisibility(el, true);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('unobserve removes element so triggerVisibility no longer fires', () => {
      const cb = jest.fn();
      const observer = new Mock(cb);
      observer.observe(el);
      observer.unobserve(el);
      Mock.triggerVisibility(el, true);
      expect(cb).not.toHaveBeenCalled();
    });

    it('unobserve is a no-op for an element that was never observed', () => {
      const cb = jest.fn();
      const observer = new Mock(cb);
      expect(() => observer.unobserve(el)).not.toThrow();
    });

    it('disconnect clears all observed elements so no further callbacks fire', () => {
      const el2 = document.createElement('span');
      document.body.appendChild(el2);
      const cb = jest.fn();
      const observer = new Mock(cb);
      observer.observe(el);
      observer.observe(el2);
      observer.disconnect();
      Mock.triggerVisibility(el, true);
      Mock.triggerVisibility(el2, true);
      expect(cb).not.toHaveBeenCalled();
    });

    it('after disconnect the observer remains in instances but fires nothing', () => {
      const cb = jest.fn();
      const observer = new Mock(cb);
      observer.observe(el);
      observer.disconnect();
      // The observer is still in instances (disconnect does not remove from registry)
      expect(Mock.instances).toContain(observer);
      Mock.triggerVisibility(el, true);
      expect(cb).not.toHaveBeenCalled();
    });

    it('takeRecords returns an empty array', () => {
      const observer = new Mock(jest.fn());
      observer.observe(el);
      expect(observer.takeRecords()).toEqual([]);
    });
  });

  // ── triggerVisibility callback shape ────────────────────────────────────────

  describe('triggerVisibility — callback invocation shape', () => {
    it('invokes callback with an array of one entry as first argument', () => {
      const cb = jest.fn();
      const observer = new Mock(cb);
      observer.observe(el);
      Mock.triggerVisibility(el, true);
      expect(cb).toHaveBeenCalledTimes(1);
      const [entries] = cb.mock.calls[0];
      expect(Array.isArray(entries)).toBe(true);
      expect(entries).toHaveLength(1);
    });

    it('passes the observer instance as the second callback argument', () => {
      const cb = jest.fn();
      const observer = new Mock(cb);
      observer.observe(el);
      Mock.triggerVisibility(el, true);
      const [, observerArg] = cb.mock.calls[0];
      expect(observerArg).toBe(observer);
    });

    it('entry.target is the observed element', () => {
      const cb = jest.fn();
      const observer = new Mock(cb);
      observer.observe(el);
      Mock.triggerVisibility(el, true);
      expect(cb.mock.calls[0][0][0].target).toBe(el);
    });

    it('entry.isIntersecting reflects the isIntersecting argument', () => {
      const cb = jest.fn();
      const observer = new Mock(cb);
      observer.observe(el);

      Mock.triggerVisibility(el, true);
      expect(cb.mock.calls[0][0][0].isIntersecting).toBe(true);

      cb.mockClear();
      Mock.triggerVisibility(el, false);
      expect(cb.mock.calls[0][0][0].isIntersecting).toBe(false);
    });

    it('entry.intersectionRatio defaults to 1 when isIntersecting=true', () => {
      const cb = jest.fn();
      const observer = new Mock(cb);
      observer.observe(el);
      Mock.triggerVisibility(el, true);
      expect(cb.mock.calls[0][0][0].intersectionRatio).toBe(1);
    });

    it('entry.intersectionRatio defaults to 0 when isIntersecting=false', () => {
      const cb = jest.fn();
      const observer = new Mock(cb);
      observer.observe(el);
      Mock.triggerVisibility(el, false);
      expect(cb.mock.calls[0][0][0].intersectionRatio).toBe(0);
    });

    it('entry.intersectionRatio honours an explicit ratio argument (partial intersection)', () => {
      const cb = jest.fn();
      const observer = new Mock(cb);
      observer.observe(el);
      Mock.triggerVisibility(el, true, 0.42);
      expect(cb.mock.calls[0][0][0].intersectionRatio).toBe(0.42);
    });

    it('entry has boundingClientRect, intersectionRect, rootBounds, and time fields', () => {
      const cb = jest.fn();
      const observer = new Mock(cb);
      observer.observe(el);
      Mock.triggerVisibility(el, true);
      const entry = cb.mock.calls[0][0][0];
      expect(entry).toHaveProperty('boundingClientRect');
      expect(entry).toHaveProperty('intersectionRect');
      expect(entry).toHaveProperty('rootBounds');
      expect(entry).toHaveProperty('time');
    });

    it('intersectionRect is a zero DOMRect when isIntersecting=false', () => {
      const cb = jest.fn();
      const observer = new Mock(cb);
      observer.observe(el);
      Mock.triggerVisibility(el, false);
      const entry = cb.mock.calls[0][0][0];
      // new DOMRect() yields all-zero values
      expect(entry.intersectionRect.width).toBe(0);
      expect(entry.intersectionRect.height).toBe(0);
    });
  });

  // ── Multiple observers on the same element ───────────────────────────────────

  describe('multiple observers watching the same element', () => {
    it('all observing observers fire when triggerVisibility is called', () => {
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      const cb3 = jest.fn();
      const o1 = new Mock(cb1);
      const o2 = new Mock(cb2);
      const o3 = new Mock(cb3);
      o1.observe(el);
      o2.observe(el);
      o3.observe(el);
      Mock.triggerVisibility(el, true);
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
      expect(cb3).toHaveBeenCalledTimes(1);
    });

    it('only observers watching the element fire — others are silent', () => {
      const cbWatching = jest.fn();
      const cbNotWatching = jest.fn();
      const o1 = new Mock(cbWatching);
      const o2 = new Mock(cbNotWatching);
      o1.observe(el);
      // o2 never observes el
      Mock.triggerVisibility(el, true);
      expect(cbWatching).toHaveBeenCalledTimes(1);
      expect(cbNotWatching).not.toHaveBeenCalled();
    });
  });

  // ── triggerVisibility fires nothing for an unobserved element ───────────────

  describe('triggerVisibility on an element no observer is watching', () => {
    it('does not invoke any callback when no observer watches the element', () => {
      const cb = jest.fn();
      const observer = new Mock(cb);
      // deliberately do NOT call observer.observe(el)
      Mock.triggerVisibility(el, true);
      expect(cb).not.toHaveBeenCalled();
    });

    it('does not throw when called with no observers at all', () => {
      expect(() => Mock.triggerVisibility(el, true)).not.toThrow();
    });
  });

  // ── Isolation: reset() between tests prevents cross-test leakage ─────────────

  describe('reset() isolation', () => {
    it('observers created before reset() do not fire after reset()', () => {
      const cb = jest.fn();
      const observer = new Mock(cb);
      observer.observe(el);
      Mock.reset();
      Mock.triggerVisibility(el, true);
      expect(cb).not.toHaveBeenCalled();
    });

    it('observers created after reset() do fire normally', () => {
      new Mock(jest.fn()); // orphan from "previous test"
      Mock.reset();
      const cb = jest.fn();
      const fresh = new Mock(cb);
      fresh.observe(el);
      Mock.triggerVisibility(el, true);
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });
});
