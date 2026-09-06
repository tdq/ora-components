import { ChartState, AxisConfig, ChartScales } from './types';
import { ChartStyles } from './styles';
import { isRecognizedValueFormat, ValueFormat } from '@/utils/number';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * `min + (i/ticks)*(max-min)` is a float division that can land on values like
 * `2962.8599999999997` for an otherwise-clean domain/tick-count combination. This derives, from
 * `step` alone, how many decimal places are needed to show it (and therefore every tick) cleanly.
 *
 * Deliberately avoids `Number#toString`/`toPrecision` + string parsing (the previous
 * implementation): both switch to exponential notation below ~1e-6 (`(5e-7).toString()` ===
 * `"5.000000000000001e-7"`, with no `.` where a naive `indexOf('.')` decimal-count expects one),
 * which silently produced a precision of 0 for small-domain steps like `[0, 0.0000025]` — every
 * tick then rendered as "0". Working entirely in log-space/integer arithmetic sidesteps that.
 */
function getCleanTickPrecision(step: number): number {
    if (!isFinite(step) || step === 0) return 0;
    const abs = Math.abs(step);
    const magnitude = Math.floor(Math.log10(abs));

    // Round to ~10 significant digits (cancels float noise like 1728.3599999999999) by scaling
    // into integer space rather than via toPrecision/toString.
    const SIG_DIGITS = 10;
    const roundingFactor = Math.pow(10, SIG_DIGITS - 1 - magnitude);
    let scaledInt = Math.round(abs * roundingFactor);
    let decimals = SIG_DIGITS - 1 - magnitude;

    // Trim trailing zeros from the scaled integer — each one needs one fewer decimal place
    // (e.g. step=120000 has magnitude 5 but needs 0 decimals, not 4).
    while (decimals > 0 && scaledInt % 10 === 0) {
        scaledInt /= 10;
        decimals--;
    }
    return Math.max(0, Math.min(12, decimals));
}

/**
 * Caps the *default* (no explicit `withFormat`) tick precision so a clean-but-fussy step like
 * `123456.78 / 5 = 24691.356` doesn't render "24,691.356": 0 decimals when the step itself is
 * >= 1 (matching the whole-number ticks a large-magnitude axis showed before per-tick formatting
 * existed), at most 2 decimals for a "normal" fractional step. An explicit `withFormat` (string
 * preset or function) always wins — this only shapes the un-formatted default.
 *
 * Below step = 0.01 the cap is skipped entirely: 2 decimals cannot represent a step that small
 * without rounding every tick to "0" — exactly the bug `getCleanTickPrecision`'s log-space
 * rewrite fixed for domains like `[0, 0.0000025]` — so a genuinely tiny step keeps its full
 * computed precision instead.
 */
function capDefaultTickPrecision(precision: number, step: number, hasExplicitFormat: boolean): number {
    if (hasExplicitFormat) return precision;
    const abs = Math.abs(step);
    if (abs >= 1) return Math.min(precision, 0);
    if (abs >= 0.01) return Math.min(precision, 2);
    return precision;
}

export class AxisRenderer {
    /**
     * Determines whether X-axis labels need rotation and at what angle,
     * based on estimated label width vs available space per category.
     * Returns 0 (no rotation), -45, or -90.
     */
    static getLabelRotation(categories: string[], xStep: number): 0 | -45 | -90 {
        if (categories.length === 0 || xStep <= 0) return 0;
        const CHAR_WIDTH_PX = 7;
        const maxLen = categories.reduce((max, c) => Math.max(max, c.length), 0);
        const estimatedWidth = maxLen * CHAR_WIDTH_PX;

        if (estimatedWidth <= xStep * 0.8) return 0;
        // At 45°, the horizontal footprint of a label shrinks to width * cos(45°) ≈ 0.707.
        // Apply the same 0.8 margin as the horizontal check for consistency.
        if (estimatedWidth * 0.707 <= xStep * 0.8) return -45;
        return -90;
    }

    render(
        g: SVGGElement,
        state: ChartState<any>,
        scales: ChartScales,
        viewWidth: number,
        viewHeight: number
    ) {
        const { xScale, yScale, secondaryYScale, categories, yDomain, secondaryYDomain, xStep } = scales;

        if (state.xAxis.visible) {
            const xAxisG = this.createSvgElement('g', {
                transform: `translate(0, ${viewHeight})`
            });
            g.appendChild(xAxisG);

            const effectiveXStep = (xStep && xStep > 0) ? xStep : (viewWidth / Math.max(categories.length - 1, 1));
            const rotation = AxisRenderer.getLabelRotation(categories, effectiveXStep);

            // Tick density: if ticks is specified, only render every Nth label
            const tickStep = (state.xAxis.ticks && state.xAxis.ticks > 0) 
                ? Math.ceil(categories.length / state.xAxis.ticks) 
                : 1;

            categories.forEach((cat: string, i: number) => {
                if (i % tickStep !== 0) return;
                
                const x = xScale(i);
                if (state.xAxis.showGridLines) {
                    const line = this.createSvgElement('line', {
                        x1: String(x),
                        y1: '0',
                        x2: String(x),
                        y2: String(-viewHeight),
                        class: ChartStyles.gridLine
                    });
                    xAxisG.appendChild(line);
                }

                let textAttrs: Record<string, string>;
                if (rotation === -45) {
                    textAttrs = {
                        x: String(x),
                        y: '20',
                        'text-anchor': 'end',
                        transform: `rotate(-45, ${x}, 20)`,
                        class: ChartStyles.axis
                    };
                } else if (rotation === -90) {
                    textAttrs = {
                        x: String(x),
                        y: '8',
                        'text-anchor': 'end',
                        transform: `rotate(-90, ${x}, 8)`,
                        class: ChartStyles.axis
                    };
                } else {
                    textAttrs = {
                        x: String(x),
                        y: '20',
                        'text-anchor': 'middle',
                        class: ChartStyles.axis
                    };
                }

                const text = this.createSvgElement('text', textAttrs);
                text.textContent = cat;
                xAxisG.appendChild(text);
            });
        }

        if (state.yAxis.visible) {
            this.renderYAxis(g, state.yAxis, yScale, yDomain, viewWidth, false, scales.formatPrimary);
        }

        if (state.secondaryYAxis && secondaryYScale && secondaryYDomain) {
            // formatSecondary is only optional on ChartScales because it's absent when there's no
            // secondary axis at all; this branch's guard establishes it's always set here.
            this.renderYAxis(g, state.secondaryYAxis, secondaryYScale, secondaryYDomain, viewWidth, true, scales.formatSecondary!);
        }
    }

    private renderYAxis(
        g: SVGGElement,
        config: AxisConfig,
        scale: (v: number) => number,
        domain: number[],
        viewWidth: number,
        isSecondary: boolean,
        format: (value: number) => string
    ) {
        const attrs: Record<string, string> = {};
        if (isSecondary) {
            attrs.transform = `translate(${viewWidth}, 0)`;
        }
        const yAxisG = this.createSvgElement('g', attrs);
        g.appendChild(yAxisG);

        const ticks = config.ticks || 5;
        const [min, max] = domain;
        const rawStep = (max - min) / ticks;
        // Not a bare `config.format !== undefined` check: an unrecognized legacy format
        // string (e.g. '$0,0') is `!== undefined` too, but resolveValueFormat silently falls
        // back to the 'number' preset for it — that fallback must still get the default cap.
        const hasExplicitFormat = isRecognizedValueFormat(config.format as ValueFormat | undefined);
        const tickPrecision = capDefaultTickPrecision(getCleanTickPrecision(rawStep), rawStep, hasExplicitFormat);
        for (let i = 0; i <= ticks; i++) {
            const val = min + (i / ticks) * (max - min);
            const y = scale(val);

            if (config.showGridLines && !isSecondary) {
                const line = this.createSvgElement('line', {
                    x1: '0',
                    y1: String(y),
                    x2: String(viewWidth),
                    y2: String(y),
                    class: ChartStyles.gridLine
                });
                yAxisG.appendChild(line);
            }

            // The scale position above uses the raw val (exact placement); the label uses a
            // value cleaned of float noise so it doesn't print e.g. "2,962.8599999999997".
            let displayVal = parseFloat(val.toFixed(tickPrecision));
            // A domain straddling zero can produce a raw tick that rounds to negative zero
            // (e.g. -0.3999999999996362 -> (-0.4).toFixed(0) === "-0"); both toFixed and
            // Intl.NumberFormat render that as a literal "-0", so normalise it to plain 0.
            if (Object.is(displayVal, -0)) displayVal = 0;

            const text = this.createSvgElement('text', {
                x: isSecondary ? '10' : '-10',
                y: String(y + 4),
                'text-anchor': isSecondary ? 'start' : 'end',
                class: ChartStyles.axis
            });
            text.textContent = format(displayVal);
            yAxisG.appendChild(text);
        }
    }

    private createSvgElement<K extends keyof SVGElementTagNameMap>(tagName: K, attributes: Record<string, string> = {}): SVGElementTagNameMap[K] {
        const el = document.createElementNS(SVG_NS, tagName);
        for (const [key, value] of Object.entries(attributes)) {
            el.setAttribute(key, value);
        }
        return el;
    }
}
