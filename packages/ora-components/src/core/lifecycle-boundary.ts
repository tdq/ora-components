export const ORA_LIFECYCLE_BOUNDARY_TAG = 'ora-lifecycle-boundary';

/**
 * A custom element that fires an `onDisconnect` callback exactly once when
 * permanently removed from the DOM.
 *
 * **One-shot contract**: `onDisconnect` is nulled before invocation, so DOM
 * moves (remove + re-insert) do NOT re-trigger teardown. Teardown fires once
 * on the first disconnect after which no callback is held.
 *
 * **Non-rendering by default**: `connectedCallback` sets `display:none` so the
 * element is always inert in layout (e.g. never a flex item). Consumers can
 * still override with an explicit inline style after insertion if needed.
 *
 * **Independent of `core/destroyable-element.ts`**: `destroyable-element` uses
 * a MutationObserver-based `registerDestroy` mechanism. Both may fire if a
 * consumer uses both on the same element — do NOT register the same teardown
 * function via both APIs, as it will execute twice.
 */
export class OraLifecycleBoundary extends HTMLElement {
    onDisconnect?: () => void;

    // Use connectedCallback (not constructor) to set style — the spec forbids
    // attribute/style mutations on `this` inside a custom-element constructor
    // (throws NotSupportedError on upgrade). connectedCallback is safe and fires
    // before the element is painted.
    connectedCallback(): void {
        this.style.display = 'none';
    }

    disconnectedCallback(): void {
        const cb = this.onDisconnect;
        if (!cb) return;
        this.onDisconnect = undefined; // one-shot: survives DOM moves, fires exactly once
        try { cb(); } catch (e) { console.error('OraLifecycleBoundary onDisconnect error:', e); }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        [ORA_LIFECYCLE_BOUNDARY_TAG]: OraLifecycleBoundary;
    }
}

/**
 * Idempotent registration — safe to call multiple times.
 */
export function registerLifecycleBoundary(): void {
    if (typeof customElements !== 'undefined' && !customElements.get(ORA_LIFECYCLE_BOUNDARY_TAG)) {
        customElements.define(ORA_LIFECYCLE_BOUNDARY_TAG, OraLifecycleBoundary);
    }
}

/**
 * Creates and returns a registered `ora-lifecycle-boundary` element.
 *
 * @throws {Error} If called outside a DOM environment (e.g. server-side).
 */
export function createLifecycleBoundary(): OraLifecycleBoundary {
    if (typeof document === 'undefined') {
        throw new Error('createLifecycleBoundary() requires a DOM environment');
    }
    registerLifecycleBoundary();
    return document.createElement(ORA_LIFECYCLE_BOUNDARY_TAG);
}

// Auto-register in browser-like environments (mirrors destroyable-element.ts pattern)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    registerLifecycleBoundary();
}
