/**
 * Helpers for building inline demo controls (button strips) in stories.
 */

import { ButtonBuilder, ButtonStyle } from '@tdq/ora-components';
import { of } from 'rxjs';

/**
 * Create a simple button configured for a demo control strip.
 * The returned `ButtonBuilder` has not been built yet — call `.build()` on it
 * and pass the result to `createControlStrip`.
 */
export function createButton(
    label: string,
    onClick: () => void,
    style: ButtonStyle = ButtonStyle.TONAL,
): ButtonBuilder {
    return new ButtonBuilder()
        .withCaption(of(label))
        .withStyle(of(style))
        .withClick(onClick);
}

/**
 * Wrap an array of already‑built button elements in a flex container with
 * standard gap and margin so they appear as a cohesive control strip.
 */
export function createControlStrip(buttons: HTMLElement[]): HTMLElement {
    const strip = document.createElement('div');
    strip.className = 'flex flex-wrap gap-2 mb-4';
    buttons.forEach(btn => strip.appendChild(btn));
    return strip;
}
