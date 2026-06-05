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

        // Add a lifecycle boundary child to trigger cleanup on disconnect
        try {
            const boundary = createLifecycleBoundary();
            const setupBoundary = (b: any) => {
                b.onDisconnect = () => {
                    if (element.isConnected) {
                        // The element itself is still connected to the DOM, so the boundary
                        // was likely removed because the element's children were cleared/modified.
                        // Re-create and append a new boundary to continue observing.
                        try {
                            const newBoundary = createLifecycleBoundary();
                            setupBoundary(newBoundary);
                            element.appendChild(newBoundary);
                        } catch (e) {
                            console.warn('registerDestroy: could not re-append lifecycle boundary to element', element, e);
                        }
                    } else {
                        tryDestroy(element);
                    }
                };
            };
            setupBoundary(boundary);
            element.appendChild(boundary);
        } catch (e) {
            // If appendChild fails (e.g. on a void element), we log it
            // MutationObserver was safer for void elements, but those are rarely targets
            console.warn('registerDestroy: could not append lifecycle boundary to element', element, e);
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