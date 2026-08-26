import { ChartState, LineChartConfig, BarChartConfig, AreaChartConfig, ChartScales } from './types';
import { readValue } from './value-utils';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ANIM_DEFAULTS: Record<string, string> = {
    dur: '0.5s',
    fill: 'freeze',
    calcMode: 'spline',
    keySplines: '0.4 0 0.2 1',
    // SMIL timelines start at document time 0; a chart mounted later would
    // otherwise see its animation already finished (or never start in a
    // fresh subtree). We start every animate explicitly once connected.
    begin: 'indefinite'
};

// Bound the rAF retry chain used to wait for the series group to be
// connected before calling beginElement() — a detached/never-mounted chart
// must not schedule frames forever.
const MAX_ANIM_RETRIES = 10;

export class SeriesRenderer {
    private _pendingAnimFrame: number | null = null;
    private _animRetries = 0;
    // Sentinel so the very first render() (data reference necessarily
    // differs from `undefined`) is always treated as a data change.
    private _lastData: any = undefined;

    render(
        g: SVGGElement,
        state: ChartState<any>,
        scales: ChartScales
    ) {
        // Any render (including a resize-triggered re-render on the *same*
        // data) rebuilds the SVG subtree from scratch, so a chain scheduled
        // against the previous subtree must never fire against this one.
        this.cancelPendingAnimation();

        // Only a genuine data change re-triggers the entrance animation;
        // a resize (which re-renders the same `state.data` reference) must
        // redraw with final values and no <animate> elements.
        const shouldAnimate = state.animate && state.data !== this._lastData;
        this._lastData = state.data;

        const { xScale, yScale, secondaryYScale } = scales;
        const renderOrder: string[] = ['area', 'bar', 'line'];

        renderOrder.forEach(type => {
            state.charts.forEach((chart, i) => {
                if (chart.type !== type) return;

                const scale = chart.useSecondaryAxis && secondaryYScale ? secondaryYScale : yScale;
                const filterId = `shadow-${i}`;

                switch (chart.type) {
                    case 'line':
                        this.renderLine(g, shouldAnimate, scales, chart as LineChartConfig<any>, xScale, scale, filterId);
                        break;
                    case 'bar':
                        this.renderBars(g, shouldAnimate, scales, chart as BarChartConfig<any>, xScale, scale, filterId);
                        break;
                    case 'area':
                        this.renderArea(g, shouldAnimate, scales, chart as AreaChartConfig<any>, xScale, scale, filterId);
                        break;
                }
            });
        });

        if (shouldAnimate) this.startAnimations(g);
    }

    updateFilters(defs: SVGDefsElement, state: ChartState<any>) {
        while (defs.firstChild) defs.removeChild(defs.firstChild);
        state.charts.forEach((_, i) => {
            const filter = this.createSvgElement('filter', {
                id: `shadow-${i}`,
                x: '-20%',
                y: '-20%',
                width: '140%',
                height: '140%'
            });

            const dropShadow = this.createSvgElement('feDropShadow', {
                dx: '0',
                dy: '2',
                stdDeviation: '2',
                'flood-opacity': '0.3',
                'flood-color': 'black'
            });

            filter.appendChild(dropShadow);
            defs.appendChild(filter);
        });
    }

    /** Cancel any pending "wait for connect" rAF chain and reset the retry count. */
    private cancelPendingAnimation() {
        if (this._pendingAnimFrame !== null && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(this._pendingAnimFrame);
        }
        this._pendingAnimFrame = null;
        this._animRetries = 0;
    }

    /** Tear down any pending animation scheduling — call from the component's destroy callback. */
    destroy() {
        this.cancelPendingAnimation();
    }

    /**
     * Kick off every `<animate begin="indefinite">` under `g`. When the group
     * is not yet in the document, retry on the next animation frame (a chart
     * may be built detached and appended later), bounded so a chart that is
     * never mounted does not schedule frames forever.
     */
    private startAnimations(g: SVGGElement) {
        if (!g.isConnected) {
            if (this._animRetries < MAX_ANIM_RETRIES && typeof requestAnimationFrame === 'function') {
                this._animRetries++;
                this._pendingAnimFrame = requestAnimationFrame(() => {
                    this._pendingAnimFrame = null;
                    this.startAnimations(g);
                });
            }
            return;
        }
        this._pendingAnimFrame = null;
        this._animRetries = 0;
        g.querySelectorAll('animate').forEach((anim: any) => {
            if (typeof anim.beginElement === 'function') {
                try { anim.beginElement(); } catch { /* jsdom / unsupported SMIL */ }
            }
        });
    }

    private animate(target: Element, attributeName: string, from: string, to: string) {
        target.appendChild(this.createSvgElement('animate', { ...ANIM_DEFAULTS, attributeName, from, to }));
    }

    /** Polyline `d` with a fresh `M` after every gap. */
    private linePath(data: any[], field: string, xScale: any, yOf: (v: number) => number): string {
        let restart = true;
        return data.map((d, i) => {
            const v = readValue(d, field);
            if (v === null) { restart = true; return ''; }
            const cmd = restart ? 'M' : 'L';
            restart = false;
            return `${cmd} ${xScale(i)},${yOf(v)}`;
        }).filter(Boolean).join(' ');
    }

    /** Indices whose value is present but both neighbors are gaps (or the series boundary) — invisible as a line segment. */
    private isolatedIndices(data: any[], field: string): number[] {
        const isolated: number[] = [];
        for (let i = 0; i < data.length; i++) {
            if (readValue(data[i], field) === null) continue;
            const prevGap = i === 0 || readValue(data[i - 1], field) === null;
            const nextGap = i === data.length - 1 || readValue(data[i + 1], field) === null;
            if (prevGap && nextGap) isolated.push(i);
        }
        return isolated;
    }

    private renderLine(g: SVGGElement, shouldAnimate: boolean, scales: ChartScales, config: LineChartConfig<any>, xScale: any, yScale: any, filterId: string) {
        const data = scales.displayData;
        const relevantDomain = config.useSecondaryAxis && scales.secondaryYDomain
            ? scales.secondaryYDomain
            : scales.yDomain;
        const baselineY = yScale(Math.max(relevantDomain[0], Math.min(relevantDomain[1], 0)));
        const field = String(config.field);
        const points = this.linePath(data, field, xScale, yScale);
        const zeroPoints = this.linePath(data, field, xScale, () => baselineY);

        const pathAttrs: Record<string, string> = {
            d: points,
            fill: 'none',
            stroke: config.color || 'currentColor',
            'stroke-width': String(config.width || 2),
            filter: `url(#${filterId})`
        };
        if (config.isDashed) pathAttrs['stroke-dasharray'] = '5,5';

        const path = this.createSvgElement('path', pathAttrs);
        if (shouldAnimate) this.animate(path, 'd', zeroPoints, points);
        g.appendChild(path);

        if (config.showMarkers) {
            data.forEach((d: any, i: number) => {
                const v = readValue(d, field);
                if (v === null) return;
                const y = yScale(v);
                const circle = this.createSvgElement('circle', {
                    cx: String(xScale(i)),
                    cy: String(y),
                    r: '4',
                    fill: config.color || 'currentColor',
                    filter: `url(#${filterId})`
                });
                if (shouldAnimate) this.animate(circle, 'cy', String(baselineY), String(y));
                g.appendChild(circle);
            });
        } else {
            // Without markers, a point whose neighbors are both gaps would
            // otherwise never be drawn (a lone `M` produces no visible segment).
            this.isolatedIndices(data, field).forEach(i => {
                const v = readValue(data[i], field)!;
                const y = yScale(v);
                const dot = this.createSvgElement('circle', {
                    cx: String(xScale(i)),
                    cy: String(y),
                    r: '2',
                    fill: config.color || 'currentColor'
                });
                if (shouldAnimate) this.animate(dot, 'cy', String(baselineY), String(y));
                g.appendChild(dot);
            });
        }
    }

    private renderBars(g: SVGGElement, shouldAnimate: boolean, scales: ChartScales, config: BarChartConfig<any>, xScale: any, yScale: any, filterId: string) {
        const data = scales.displayData;
        const barWidth = scales.barWidth || 32;
        const relevantDomain = config.useSecondaryAxis && scales.secondaryYDomain
            ? scales.secondaryYDomain
            : scales.yDomain;
        const baselineY = yScale(Math.max(relevantDomain[0], Math.min(relevantDomain[1], 0)));
        const field = String(config.field);

        data.forEach((d: any, i: number) => {
            const val = readValue(d, field);
            if (val === null) return;
            const valY = yScale(val);
            const y = Math.min(baselineY, valY);
            const height = Math.max(0.5, Math.abs(baselineY - valY));

            const rect = this.createSvgElement('rect', {
                x: String(xScale(i) - barWidth / 2),
                y: String(y),
                width: String(barWidth),
                height: String(height),
                fill: config.color || 'currentColor',
                rx: '2',
                filter: `url(#${filterId})`
            });

            if (shouldAnimate) {
                this.animate(rect, 'y', String(baselineY), String(y));
                this.animate(rect, 'height', '0', String(height));
            }

            g.appendChild(rect);
        });
    }

    /** Area `d`: one closed sub-path per contiguous run of non-gap points. */
    private areaPath(data: any[], field: string, xScale: any, yOf: (v: number) => number, baselineY: number): string {
        const parts: string[] = [];
        let run: string[] = [];
        let runStart = -1;
        let runEnd = -1;
        const flush = () => {
            if (run.length === 0) return;
            parts.push(`${run.join(' ')} L ${xScale(runEnd)},${baselineY} L ${xScale(runStart)},${baselineY} Z`);
            run = [];
        };
        data.forEach((d, i) => {
            const v = readValue(d, field);
            if (v === null) { flush(); return; }
            if (run.length === 0) runStart = i;
            runEnd = i;
            run.push(`${run.length === 0 ? 'M' : 'L'} ${xScale(i)},${yOf(v)}`);
        });
        flush();
        return parts.join(' ');
    }

    private renderArea(g: SVGGElement, shouldAnimate: boolean, scales: ChartScales, config: AreaChartConfig<any>, xScale: any, yScale: any, filterId: string) {
        const data = scales.displayData;
        if (data.length === 0) return;

        const relevantDomain = config.useSecondaryAxis && scales.secondaryYDomain
            ? scales.secondaryYDomain
            : scales.yDomain;
        const baselineY = yScale(relevantDomain[0]);
        const field = String(config.field);
        const linePoints = this.linePath(data, field, xScale, yScale);
        const zeroLinePoints = this.linePath(data, field, xScale, () => baselineY);
        const areaPathData = this.areaPath(data, field, xScale, yScale, baselineY);
        const zeroAreaPathData = this.areaPath(data, field, xScale, () => baselineY, baselineY);

        const area = this.createSvgElement('path', {
            d: areaPathData,
            fill: config.color || 'currentColor',
            'fill-opacity': String(config.opacity || 0.3),
            filter: `url(#${filterId})`
        });
        if (shouldAnimate) this.animate(area, 'd', zeroAreaPathData, areaPathData);
        g.appendChild(area);

        // No filter on the top line: it would double-shadow with the area's own filter.
        const line = this.createSvgElement('path', {
            d: linePoints,
            fill: 'none',
            stroke: config.color || 'currentColor',
            'stroke-width': '2'
        });
        if (shouldAnimate) this.animate(line, 'd', zeroLinePoints, linePoints);
        g.appendChild(line);

        // The area's own top line has no marker option — an isolated point
        // between two gaps still needs a visible dot.
        this.isolatedIndices(data, field).forEach(i => {
            const v = readValue(data[i], field)!;
            const y = yScale(v);
            const dot = this.createSvgElement('circle', {
                cx: String(xScale(i)),
                cy: String(y),
                r: '2',
                fill: config.color || 'currentColor'
            });
            if (shouldAnimate) this.animate(dot, 'cy', String(baselineY), String(y));
            g.appendChild(dot);
        });
    }

    private createSvgElement<K extends keyof SVGElementTagNameMap>(tagName: K, attributes: Record<string, string> = {}): SVGElementTagNameMap[K] {
        const el = document.createElementNS(SVG_NS, tagName);
        for (const [key, value] of Object.entries(attributes)) {
            el.setAttribute(key, value);
        }
        return el;
    }
}
