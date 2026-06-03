const PAUSED = 'paused';
const RUNNING = 'running';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function apply(el: HTMLElement, state: typeof PAUSED | typeof RUNNING) {
    el.style.animationPlayState = state;
}

export function controlAnimations(selectors: string[]): void {
    const tracked = new WeakMap<Element, boolean>();

    const observer = new IntersectionObserver(
        (entries) => {
            const hidden = document.hidden || reducedMotion.matches;
            for (const entry of entries) {
                const visible = entry.isIntersecting;
                tracked.set(entry.target, visible);
                apply(entry.target as HTMLElement, visible && !hidden ? RUNNING : PAUSED);
            }
        },
        { rootMargin: '100px' },
    );

    const collect = (): HTMLElement[] => {
        const out: HTMLElement[] = [];
        for (const sel of selectors) {
            document.querySelectorAll<HTMLElement>(sel).forEach((el) => out.push(el));
        }
        return out;
    };

    const observeAll = () => {
        for (const el of collect()) {
            if (!tracked.has(el)) {
                tracked.set(el, false);
                observer.observe(el);
            }
        }
    };

    const refreshAll = () => {
        const hidden = document.hidden || reducedMotion.matches;
        for (const el of collect()) {
            const visible = tracked.get(el) ?? false;
            apply(el, visible && !hidden ? RUNNING : PAUSED);
        }
    };

    observeAll();

    document.addEventListener('visibilitychange', refreshAll);
    reducedMotion.addEventListener('change', refreshAll);

    // Late-mounted elements: re-scan periodically while the page is fresh, then stop.
    let scans = 0;
    const interval = window.setInterval(() => {
        observeAll();
        if (++scans >= 10) window.clearInterval(interval);
    }, 500);
}
