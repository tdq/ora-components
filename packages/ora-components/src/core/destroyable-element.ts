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
        for (const destroy of callbacks) {
            try {
                destroy();
            } catch (e) {
                console.error('Destroy callback error:', e);
            }
        }
        destroyMap.delete(element);
    }
}

/**
 * Recursively destroy element and its subtree
 */
function destroyRecursively(node: Node) {
    if (!(node instanceof HTMLElement)) return;

    // destroy self
    tryDestroy(node);

    // destroy descendants
    node.querySelectorAll('*').forEach(child => {
        tryDestroy(child as HTMLElement);
    });
}

// Initialize the observer only once
let observerInitialized = false;

/**
 * Initialize the destroy observer (called automatically)
 */
function initializeObserver() {
    if (observerInitialized) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    observerInitialized = true;

    /**
     * Observe DOM removals
     */
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.type !== 'childList') continue;

            mutation.removedNodes.forEach(node => {
                destroyRecursively(node);
            });
        }
    });

    // Observe document.documentElement instead of document.body
    // document.documentElement is always available (the <html> element)
    // and contains the entire document subtree
    // Safety check: if document.documentElement is somehow null, fall back to document
    const target = document.documentElement || document;
    
    observer.observe(target, {
        childList: true,
        subtree: true
    });
}

// Auto-initialize observer in browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    initializeObserver();
}