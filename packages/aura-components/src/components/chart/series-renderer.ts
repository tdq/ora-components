import { ChartState, LineChartConfig, BarChartConfig, AreaChartConfig, ChartScales } from './types';

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
                        this.renderLine(g, state, chart as LineChartConfig<any>, xScale, scale, filterId);
                        break;
                    case 'bar':
                        this.renderBars(g, state, chart as BarChartConfig<any>, xScale, scale, filterId, scales);
                        break;
                    case 'area':
                        this.renderArea(g, state, chart as AreaChartConfig<any>, xScale, scale, filterId);
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

    private renderLine(g: SVGGElement, state: ChartState<any>, config: LineChartConfig<any>, xScale: any, yScale: any, filterId: string) {
        const baselineY = yScale(0);
        const points = state.data.map((d, i) => {
            const x = xScale(i);
            const y = yScale(Number(d[config.field]) || 0);
            return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
        }).join(' ');

        const zeroPoints = state.data.map((_, i) => {
            const x = xScale(i);
            return `${i === 0 ? 'M' : 'L'} ${x},${baselineY}`;
        }).join(' ');

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
            state.data.forEach((d, i) => {
                const x = xScale(i);
                const y = yScale(Number(d[config.field]) || 0);
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
        }
    }

    private renderBars(g: SVGGElement, state: ChartState<any>, config: BarChartConfig<any>, xScale: any, yScale: any, filterId: string, scales: ChartScales) {
        const barWidth = scales.barWidth || 32; 
        const baselineY = yScale(0);

        state.data.forEach((d, i) => {
            const val = Number(d[config.field]) || 0;
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

    private renderArea(g: SVGGElement, state: ChartState<any>, config: AreaChartConfig<any>, xScale: any, yScale: any, filterId: string) {
        if (state.data.length === 0) return;

        const baselineY = yScale(0);
        const linePoints = state.data.map((d, i) => {
            const x = xScale(i);
            const y = yScale(Number(d[config.field]) || 0);
            return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
        }).join(' ');

        const zeroLinePoints = state.data.map((_, i) => {
            const x = xScale(i);
            return `${i === 0 ? 'M' : 'L'} ${x},${baselineY}`;
        }).join(' ');

        const areaPathData = `${linePoints} L ${xScale(state.data.length - 1)},${baselineY} L ${xScale(0)},${baselineY} Z`;
        const zeroAreaPathData = `${zeroLinePoints} L ${xScale(state.data.length - 1)},${baselineY} L ${xScale(0)},${baselineY} Z`;
        
        const area = this.createSvgElement('path', {
            d: state.animate ? zeroAreaPathData : areaPathData,
            fill: config.color || 'currentColor',
            'fill-opacity': String(config.opacity || 0.3),
            filter: `url(#${filterId})`
        });

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

        const line = this.createSvgElement('path', {
            d: state.animate ? zeroLinePoints : linePoints,
            fill: 'none',
            stroke: config.color || 'currentColor',
            'stroke-width': '2',
            filter: `url(#${filterId})`
        });

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
    }

    private createSvgElement<K extends keyof SVGElementTagNameMap>(tagName: K, attributes: Record<string, string> = {}): SVGElementTagNameMap[K] {
        const el = document.createElementNS(SVG_NS, tagName);
        for (const [key, value] of Object.entries(attributes)) {
            el.setAttribute(key, value);
        }
        return el;
    }
}
