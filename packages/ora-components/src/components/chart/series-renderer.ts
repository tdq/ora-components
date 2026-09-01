import { ChartState, LineChartConfig, BarChartConfig, AreaChartConfig, ChartScales } from './types';
import { readValue } from './value-utils';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class SeriesRenderer {
    render(
        g: SVGGElement, 
        state: ChartState<any>, 
        scales: ChartScales
    ) {
        const { xScale, yScale, secondaryYScale } = scales;
        const renderOrder: string[] = ['area', 'bar', 'line'];

        renderOrder.forEach(type => {
            state.charts.forEach((chart, i) => {
                if (chart.type !== type) return;

                const scale = chart.useSecondaryAxis && secondaryYScale ? secondaryYScale : yScale;
                const filterId = `shadow-${i}`;
                
                switch (chart.type) {
                    case 'line':
                        this.renderLine(g, state, scales, chart as LineChartConfig<any>, xScale, scale, filterId);
                        break;
                    case 'bar':
                        this.renderBars(g, state, scales, chart as BarChartConfig<any>, xScale, scale, filterId);
                        break;
                    case 'area':
                        this.renderArea(g, state, scales, chart as AreaChartConfig<any>, xScale, scale, filterId);
                        break;
                }
            });
        });
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

    /** Polyline `d` with a fresh `M` after every gap (null/NaN values produce no segment). */
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

    private renderLine(g: SVGGElement, state: ChartState<any>, scales: ChartScales, config: LineChartConfig<any>, xScale: any, yScale: any, filterId: string) {
        const data = scales.displayData;
        const relevantDomain = config.useSecondaryAxis && scales.secondaryYDomain
            ? scales.secondaryYDomain
            : scales.yDomain;
        const baselineY = yScale(Math.max(relevantDomain[0], Math.min(relevantDomain[1], 0)));
        const field = String(config.field);
        // Gap-aware paths; the zero path uses the same generator so `from`/`to`
        // keep an identical command structure and SMIL can interpolate them.
        const points = this.linePath(data, field, xScale, yScale);
        const zeroPoints = this.linePath(data, field, xScale, () => baselineY);

        const pathAttrs: Record<string, string> = {
            d: state.animate ? zeroPoints : points,
            fill: 'none',
            stroke: config.color || 'currentColor',
            'stroke-width': String(config.width || 2),
            filter: `url(#${filterId})`
        };
        if (config.isDashed) pathAttrs['stroke-dasharray'] = '5,5';

        const path = this.createSvgElement('path', pathAttrs);
        if (state.animate) {
            const anim = this.createSvgElement('animate', {
                attributeName: 'd',
                from: zeroPoints,
                to: points,
                dur: '0.5s',
                fill: 'freeze',
                calcMode: 'spline',
                keySplines: '0.4 0 0.2 1'
            });
            path.appendChild(anim);
        }
        g.appendChild(path);

        if (config.showMarkers) {
            data.forEach((d: any, i: number) => {
                const v = readValue(d, field);
                if (v === null) return; // gap: no marker
                const x = xScale(i);
                const y = yScale(v);
                const circle = this.createSvgElement('circle', {
                    cx: String(x),
                    cy: String(state.animate ? baselineY : y),
                    r: '4',
                    fill: config.color || 'currentColor',
                    filter: `url(#${filterId})`
                });

                if (state.animate) {
                    const anim = this.createSvgElement('animate', {
                        attributeName: 'cy',
                        from: String(baselineY),
                        to: String(y),
                        dur: '0.5s',
                        fill: 'freeze',
                        calcMode: 'spline',
                        keySplines: '0.4 0 0.2 1'
                    });
                    circle.appendChild(anim);
                }
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
                    cy: String(state.animate ? baselineY : y),
                    r: '2',
                    fill: config.color || 'currentColor'
                });
                if (state.animate) {
                    const anim = this.createSvgElement('animate', {
                        attributeName: 'cy',
                        from: String(baselineY),
                        to: String(y),
                        dur: '0.5s',
                        fill: 'freeze',
                        calcMode: 'spline',
                        keySplines: '0.4 0 0.2 1'
                    });
                    dot.appendChild(anim);
                }
                g.appendChild(dot);
            });
        }
    }

    private renderBars(g: SVGGElement, state: ChartState<any>, scales: ChartScales, config: BarChartConfig<any>, xScale: any, yScale: any, filterId: string) {
        const data = scales.displayData;
        const barWidth = scales.barWidth || 32;
        const relevantDomain = config.useSecondaryAxis && scales.secondaryYDomain
            ? scales.secondaryYDomain
            : scales.yDomain;
        const baselineY = yScale(Math.max(relevantDomain[0], Math.min(relevantDomain[1], 0)));
        const field = String(config.field);

        data.forEach((d: any, i: number) => {
            const val = readValue(d, field);
            if (val === null) return; // gap: no bar
            const valY = yScale(val);
            const y = Math.min(baselineY, valY);
            const height = Math.max(0.5, Math.abs(baselineY - valY));

            const rect = this.createSvgElement('rect', {
                x: String(xScale(i) - barWidth / 2),
                y: String(state.animate ? baselineY : y),
                width: String(barWidth),
                height: String(state.animate ? 0 : height),
                fill: config.color || 'currentColor',
                rx: '2',
                filter: `url(#${filterId})`
            });

            if (state.animate) {
                const animY = this.createSvgElement('animate', {
                    attributeName: 'y',
                    from: String(baselineY),
                    to: String(y),
                    dur: '0.5s',
                    fill: 'freeze',
                    calcMode: 'spline',
                    keySplines: '0.4 0 0.2 1'
                });
                const animHeight = this.createSvgElement('animate', {
                    attributeName: 'height',
                    from: '0',
                    to: String(height),
                    dur: '0.5s',
                    fill: 'freeze',
                    calcMode: 'spline',
                    keySplines: '0.4 0 0.2 1'
                });
                rect.appendChild(animY);
                rect.appendChild(animHeight);
            }

            g.appendChild(rect);
        });
    }

    private renderArea(g: SVGGElement, state: ChartState<any>, scales: ChartScales, config: AreaChartConfig<any>, xScale: any, yScale: any, filterId: string) {
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
        
        const areaAttrs: Record<string, string> = {
            d: state.animate ? zeroAreaPathData : areaPathData,
            fill: config.color || 'currentColor',
            'fill-opacity': String(config.opacity || 0.3),
            filter: `url(#${filterId})`
        };

        const area = this.createSvgElement('path', areaAttrs);
        if (state.animate) {
            const anim = this.createSvgElement('animate', {
                attributeName: 'd',
                from: zeroAreaPathData,
                to: areaPathData,
                dur: '0.5s',
                fill: 'freeze',
                calcMode: 'spline',
                keySplines: '0.4 0 0.2 1'
            });
            area.appendChild(anim);
        }
        g.appendChild(area);

        const lineAttrs: Record<string, string> = {
            d: state.animate ? zeroLinePoints : linePoints,
            fill: 'none',
            stroke: config.color || 'currentColor',
            'stroke-width': '2'
            // We omit filter here for the top line of the area chart 
            // to avoid double-shadowing with the area's own filter.
        };

        const line = this.createSvgElement('path', lineAttrs);
        if (state.animate) {
            const anim = this.createSvgElement('animate', {
                attributeName: 'd',
                from: zeroLinePoints,
                to: linePoints,
                dur: '0.5s',
                fill: 'freeze',
                calcMode: 'spline',
                keySplines: '0.4 0 0.2 1'
            });
            line.appendChild(anim);
        }
        g.appendChild(line);

        // The area's own top line has no marker option — an isolated point
        // between two gaps still needs a visible dot.
        this.isolatedIndices(data, field).forEach(i => {
            const v = readValue(data[i], field)!;
            const y = yScale(v);
            const dot = this.createSvgElement('circle', {
                cx: String(xScale(i)),
                cy: String(state.animate ? baselineY : y),
                r: '2',
                fill: config.color || 'currentColor'
            });
            if (state.animate) {
                const anim = this.createSvgElement('animate', {
                    attributeName: 'cy',
                    from: String(baselineY),
                    to: String(y),
                    dur: '0.5s',
                    fill: 'freeze',
                    calcMode: 'spline',
                    keySplines: '0.4 0 0.2 1'
                });
                dot.appendChild(anim);
            }
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
