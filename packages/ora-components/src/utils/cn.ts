import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * These lists mirror the `theme.extend` scales in `tailwind.config.mjs` — every custom
 * token tailwind-merge needs to know about so it can tell which classes conflict.
 * `cn.test.ts` (`config parity`) fails if this list and the config drift apart.
 *
 * - `ORA_SPACING`: custom `px-*` spacing scale (`p-px-8`, `gap-px-16`, …) — without this,
 *   tailwind-merge treats `p-px-8` as unknown and never lets `p-0` override it.
 * - `ORA_COLORS`: Material 3 color tokens (`text-on-surface`, `bg-surface`, …).
 * - `ORA_FONT_SIZES`: typescale tokens (`text-body-medium`, `text-title-large`, …). These
 *   share the `text-` prefix with color utilities, so they must be registered as their own
 *   `font-size` class group — otherwise tailwind-merge folds them into `text-color` and the
 *   later `text-*` class silently drops the earlier one, regardless of which scale it's from.
 * - `ORA_BORDER_RADIUS`: `rounded-*` scale.
 * - `ORA_BOX_SHADOW`: `shadow-level-*` scale.
 */
const ORA_SPACING = ['px-4', 'px-8', 'px-12', 'px-16', 'px-24', 'px-32', 'px-40', 'px-48'];

const ORA_COLORS = [
    'primary', 'on-primary', 'primary-container', 'on-primary-container',
    'secondary', 'on-secondary', 'secondary-container', 'on-secondary-container',
    'tertiary', 'on-tertiary', 'tertiary-container', 'on-tertiary-container',
    'error', 'on-error',
    'background', 'on-background',
    'surface', 'on-surface', 'surface-variant', 'on-surface-variant',
    'outline', 'surface-container-low',
];

const ORA_FONT_SIZES = [
    'display-large',
    'headline-large', 'headline-medium',
    'title-large', 'title-medium', 'title-small',
    'body-large', 'body-medium',
    'label-large', 'label-medium', 'label-small',
];

const ORA_BORDER_RADIUS = ['small', 'medium', 'large', 'extra-large'];

const ORA_BOX_SHADOW = ['level-0', 'level-1', 'level-2', 'level-3', 'level-4', 'level-5'];

const twMerge = extendTailwindMerge({
    extend: {
        theme: {
            spacing: ORA_SPACING,
            colors: ORA_COLORS,
            borderRadius: ORA_BORDER_RADIUS,
        },
        // `font-size` and `shadow` don't resolve custom values via `extend.theme` in
        // tailwind-merge's default config (`boxShadow` isn't even a theme key there — `shadow`
        // is a class group, not a theme scale) — see the file comment above.
        classGroups: {
            'font-size': [{ text: ORA_FONT_SIZES }],
            shadow: [{ shadow: ORA_BOX_SHADOW }],
        },
    },
});

/** Merge class names with clsx + tailwind-merge, aware of the ora design token scales. */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

/** Exported for `cn.test.ts` config-parity assertions only — not part of the public API. */
export const __ORA_SCALES_FOR_TESTS__ = {
    spacing: ORA_SPACING,
    colors: ORA_COLORS,
    fontSize: ORA_FONT_SIZES,
    borderRadius: ORA_BORDER_RADIUS,
    boxShadow: ORA_BOX_SHADOW,
};
