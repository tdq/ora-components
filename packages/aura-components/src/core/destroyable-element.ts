export type DestroyCallback = () => void;

(function () {
    console.warn('destroyable element observer started');

    /**
     * Internal storage of destroy callbacks.
     * WeakMap ensures:
     * - no memory leaks
     * - GC works normally
     * - no mutation of DOM nodes
     */
    const destroyMap = new WeakMap<HTMLElement, DestroyCallback>();

    /**
     * Public registration API
     */
    function registerDestroy(
        element: HTMLElement,
        destroy: DestroyCallback
    ) {
        destroyMap.set(element, destroy);
    }

    /**
     * Executes destroy callback if registered
     */
    function tryDestroy(element: HTMLElement) {
        const destroy = destroyMap.get(element);

        if (typeof destroy === 'function') {
            try {
                destroy();
            } catch (e) {
                console.error('Destroy callback error:', e);
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

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    /**
     * Expose global API
     * You can rename this if needed.
     */
    (window as any).DestroyLifecycle = {
        register: registerDestroy
    };
})();

export const registerDestroy = (element: HTMLElement, destroy: DestroyCallback) => {
    (window as any).DestroyLifecycle.register(element, destroy);
};