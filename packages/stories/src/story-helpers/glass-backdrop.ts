/**
 * Deterministic glass backdrop for Storybook stories.
 *
 * Produces a div with a gradient background and animated blur circles.
 * All circle positions and sizes are derived from deterministic offsets so
 * the output is stable across renders (no module‑level Math.random()).
 */

/**
 * Deterministic pseudo‑random number in [0, 1).
 */
function deter(offset: number): number {
    const x = ((offset + 1) * 9301 + 49297) % 233280;
    return x / 233280;
}

const CIRCLE_COLORS = [
    '#4F46E5',
    '#7C3AED',
    '#DB2777',
    '#F59E0B',
    '#10B981',
    '#FFFFFF',
    '#A7F3D0',
    '#BAE6FD',
];

/**
 * Gradient stop presets that can be used with `createGlassBackdrop`.
 */
export const GLASS_GRADIENTS = {
    INDIGO_PINK: 'from-indigo-500 via-purple-500 to-pink-500',
    BLUE_PURPLE: 'from-blue-500 to-purple-600',
    BLUE_TEAL: 'from-blue-600 via-teal-500 to-emerald-500',
} as const;

/**
 * Create a glass-backdrop container element.
 *
 * The returned element has class `glass-backdrop absolute inset-0 overflow-hidden`
 * and contains a gradient `<div>` plus a set of animated blur circles.
 *
 * @param gradientClasses  Tailwind gradient utility classes, e.g. `from-indigo-500 via-purple-500 to-pink-500`.
 * @param circleCount      Number of decorative blur circles (default 6).
 * @param opacity          Opacity class for the gradient overlay (default `opacity-50`).
 */
export function createGlassBackdrop(
    gradientClasses: string = 'from-indigo-500 via-purple-500 to-pink-500',
    circleCount: number = 6,
    opacity: string = 'opacity-50',
): HTMLElement {
    const backdrop = document.createElement('div');
    backdrop.className = 'glass-backdrop absolute inset-0 overflow-hidden pointer-events-none';

    // Gradient background
    const gradient = document.createElement('div');
    gradient.className = `absolute inset-0 -z-10 bg-gradient-to-br ${gradientClasses} ${opacity}`;
    backdrop.appendChild(gradient);

    // Deterministic blur circles
    for (let i = 0; i < circleCount; i++) {
        const circle = document.createElement('div');
        const size = deter(i * 3) * 150 + 100;
        circle.className = 'absolute rounded-full opacity-40 blur-2xl animate-pulse';
        circle.style.width = `${size}px`;
        circle.style.height = `${size}px`;
        circle.style.left = `${deter(i * 3 + 1) * 100}%`;
        circle.style.top = `${deter(i * 3 + 2) * 100}%`;
        circle.style.backgroundColor = CIRCLE_COLORS[i % CIRCLE_COLORS.length];
        circle.style.animationDelay = `${deter(i * 3 + 4) * 5}s`;
        circle.style.animationDuration = `${deter(i * 3 + 5) * 5 + 5}s`;
        backdrop.appendChild(circle);
    }

    return backdrop;
}
