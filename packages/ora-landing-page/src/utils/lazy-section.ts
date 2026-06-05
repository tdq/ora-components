/**
 * LazySection wraps a section-creator function and returns a placeholder div.
 * The actual section is only built and appended when it enters the viewport.
 */
export function createLazySection(
    builder: () => HTMLElement,
    options: { minHeight?: string; className?: string } = {}
): HTMLElement {
    // If we are in prerender mode, build immediately
    if ((window as any).__PRERENDER_MODE__) {
        return builder();
    }

    const placeholder = document.createElement('div');
    placeholder.className = options.className || 'w-full';
    if (options.minHeight) {
        placeholder.style.minHeight = options.minHeight;
        // Optimization: Skip layout/paint for off-screen sections
        placeholder.style.contentVisibility = 'auto';
        placeholder.style.containIntrinsicSize = `1000px ${options.minHeight}`;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const section = builder();
                    placeholder.replaceWith(section);
                    observer.disconnect();
                }
            });
        },
        { rootMargin: '200px' } // Start loading 200px before it enters
    );

    observer.observe(placeholder);

    return placeholder;
}
