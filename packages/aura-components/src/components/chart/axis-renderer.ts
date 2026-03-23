import { ChartState, AxisConfig, ChartScales } from './types';
import { ChartStyles } from './styles';

const SVG_NS = 'http://www.w3.org/2000/svg';

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

            categories.forEach((cat: string, i: number) => {
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
            this.renderYAxis(g, state.yAxis, yScale, yDomain, viewWidth, false);
        }

        if (state.secondaryYAxis && secondaryYScale && secondaryYDomain) {
            this.renderYAxis(g, state.secondaryYAxis, secondaryYScale, secondaryYDomain, viewWidth, true);
        }
    }

    private renderYAxis(
        g: SVGGElement, 
        config: AxisConfig, 
        scale: (v: number) => number, 
        domain: number[], 
        viewWidth: number, 
        isSecondary: boolean
    ) {
        const attrs: Record<string, string> = {};
        if (isSecondary) {
            attrs.transform = `translate(${viewWidth}, 0)`;
        }
        const yAxisG = this.createSvgElement('g', attrs);
        g.appendChild(yAxisG);

        const ticks = config.ticks || 5;
        const [min, max] = domain;
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

            const text = this.createSvgElement('text', {
                x: isSecondary ? '10' : '-10',
                y: String(y + 4),
                'text-anchor': isSecondary ? 'start' : 'end',
                class: ChartStyles.axis
            });
            text.textContent = typeof config.format === 'function' ? config.format(val) : val.toFixed(0);
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
