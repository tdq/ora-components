import { createLifecycleBoundary } from './lifecycle-boundary';

export type DestroyCallback = () => void;

/**
 * Internal storage of destroy callbacks.
 * WeakMap ensures:
 * - no memory leaks
 * - GC works normally
 * - no mutation of DOM nodes
 */
const destroyMap = new WeakMap<HTMLElement, DestroyCallback[]>();

/**
 * Public registration API
 */
export function registerDestroy(
    element: HTMLElement,
    destroy: DestroyCallback
) {
    // Get existing callbacks or create new array
    let callbacks = destroyMap.get(element);

    if (!callbacks) {
        // Create new array and set it
        callbacks = [];
        destroyMap.set(element, callbacks);

        // Add a lifecycle boundary child to trigger cleanup on disconnect.
        //
        // Placement strategy: insert the boundary just BEFORE the current last
        // child (insertBefore(boundary, element.lastChild)).  When the element
        // has no children, lastChild is null and insertBefore(node, null) is
        // equivalent to appendChild — the boundary becomes the only child and
        // real content is appended after it.
        //
        // The guaranteed property is that the boundary is never the LAST child
        // (it sits one step from the end when content already exists), so
        // lastElementChild and :last-child selectors continue to resolve to the
        // real last content element.  Note: when registerDestroy is called on an
        // EMPTY host (lastChild === null) the boundary becomes the first child,
        // so firstElementChild / children[0] are NOT preserved in that case.
        try {
            const boundary = createLifecycleBoundary();
            const setupBoundary = (b: any) => {
                b.onDisconnect = () => {
                    if (element.isConnected) {
                        // The element itself is still connected to the DOM, so the
                        // boundary was removed because the element's children were
                        // cleared/modified.  Re-create and re-insert a new boundary
                        // (before the current last child) to continue observing.
                        try {
                            const newBoundary = createLifecycleBoundary();
                            setupBoundary(newBoundary);
                            element.insertBefore(newBoundary, element.lastChild);
                        } catch (e) {
                            console.warn('registerDestroy: could not re-insert lifecycle boundary into element', element, e);
                        }
                    } else {
                        tryDestroy(element);
                    }
                };
            };
            setupBoundary(boundary);
            element.insertBefore(boundary, element.lastChild);
        } catch (e) {
            // If insertBefore fails (e.g. on a void element), we log it
            console.warn('registerDestroy: could not insert lifecycle boundary into element', element, e);
        }
    }

    // Append to the array (mutates in place)
    // This ensures all callbacks are preserved when called multiple times
    callbacks.push(destroy);
}

/**
 * Executes destroy callback if registered
 */
function tryDestroy(element: HTMLElement) {
    const callbacks = destroyMap.get(element);

    if (callbacks) {
        // Clear the map BEFORE execution to prevent any re-entrancy issues
        destroyMap.delete(element);

        for (const destroy of callbacks) {
            try {
                destroy();
            } catch (e) {
                console.error('Destroy callback error:', e);
            }
        }
    }
}
