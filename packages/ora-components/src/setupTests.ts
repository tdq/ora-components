import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);


Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Polyfill for HTMLDialogElement in JSDOM environment
if (typeof window !== 'undefined' && window.HTMLDialogElement && !window.HTMLDialogElement.prototype.showModal) {
  window.HTMLDialogElement.prototype.show = function() {
    this.setAttribute('open', '');
  };
  window.HTMLDialogElement.prototype.showModal = function() {
    this.setAttribute('open', '');
  };
  window.HTMLDialogElement.prototype.close = function() {
    this.removeAttribute('open');
  };
}

// Polyfill for Popover API in JSDOM environment
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.showPopover) {
  HTMLElement.prototype.showPopover = function() {
    this.style.display = 'block';
  };
  HTMLElement.prototype.hidePopover = function() {
    this.style.display = 'none';
  };
}

class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}

window.ResizeObserver = window.ResizeObserver || ResizeObserverMock;

class IntersectionObserverMock implements IntersectionObserver {
  private callback: IntersectionObserverCallback;
  private observedElements: Set<Element>;

  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly thresholds: ReadonlyArray<number>;

  // Static registry of all active instances, for test control
  private static instances: IntersectionObserverMock[] = [];

  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    this.callback = callback;
    this.observedElements = new Set();

    this.root = options.root ?? null;
    this.rootMargin = options.rootMargin ?? '0px';
    this.thresholds = Array.isArray(options.threshold) ? options.threshold : [options.threshold ?? 0];

    IntersectionObserverMock.instances.push(this);
  }

  observe(target: Element): void {
    this.observedElements.add(target);
  }

  unobserve(target: Element): void {
    this.observedElements.delete(target);
  }

  disconnect(): void {
    this.observedElements.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /**
   * Static helper: trigger intersection state for an element across all observers.
   * Tests call this to simulate an element entering/leaving the viewport.
   * The ratio parameter controls the intersectionRatio of the entry; it respects
   * configured thresholds in tests that rely on partial-intersection logic.
   */
  static triggerVisibility(element: Element, isIntersecting: boolean, ratio: number = isIntersecting ? 1 : 0): void {
    for (const observer of this.instances) {
      if (observer.observedElements.has(element)) {
        const entry: IntersectionObserverEntry = {
          target: element,
          isIntersecting,
          intersectionRatio: ratio,
          boundingClientRect: element.getBoundingClientRect(),
          intersectionRect: isIntersecting ? element.getBoundingClientRect() : new DOMRect(),
          rootBounds: null,
          time: Date.now(),
        } as IntersectionObserverEntry;
        observer.callback([entry], observer);
      }
    }
  }

  /**
   * Static helper: reset the instances registry. Call in beforeEach/afterEach to clean up.
   * Clears the instances array to sever references from orphaned observers, preventing
   * them from receiving further triggerVisibility calls after being disconnected.
   */
  static reset(): void {
    this.instances = [];
  }
}

window.IntersectionObserver = window.IntersectionObserver || IntersectionObserverMock;

// Expose the mock class globally for test imports (e.g., IntersectionObserverMock.triggerVisibility(...))
(globalThis as any).IntersectionObserverMock = IntersectionObserverMock;
