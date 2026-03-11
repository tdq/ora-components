import { Observable } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { registerDestroy } from '../../core/destroyable-element';
import { 
    AreaChartBuilder, 
    AreaChartConfig, 
    AxisBuilder, 
    BarChartBuilder, 
    BarChartConfig, 
    ChartState, 
    IndividualChartConfig, 
    LineChartBuilder, 
    LineChartConfig 
} from './types';
import { AxisBuilderImpl } from './builders/axis-builder';
import { AreaChartBuilderImpl, BarChartBuilderImpl, LineChartBuilderImpl } from './builders/chart-type-builders';
import { ChartLogic } from './chart-logic';
import { ChartStyles } from './styles';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
    return twMerge(clsx(inputs));
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export class ChartBuilder<ITEM> implements ComponentBuilder {
    private logic = new ChartLogic<ITEM>();
    private individualBuilders: { build: () => IndividualChartConfig<ITEM> }[] = [];
    private xAxisBuilder = new AxisBuilderImpl('bottom', 'category');
    private yAxisBuilder = new AxisBuilderImpl('left', 'linear');
    private secondaryYAxisBuilder?: AxisBuilderImpl;

    private readonly DEFAULT_COLORS = [
        'var(--md-sys-color-primary)',
        'var(--md-sys-color-secondary)',
        'var(--md-sys-color-tertiary)',
        'var(--md-sys-color-error)',
        '#6750A4',
        '#625B71',
        '#7D5260',
        '#B3261E'
    ];

    withData(data: Observable<ITEM[]>): this {
        this.logic.setData(data);
        return this;
    }

    withCategoryField(field: keyof ITEM | string): this {
        this.logic.setCategoryField(field);
        return this;
    }

    withHeight(height: number): this {
        this.logic.setHeight(height);
        return this;
    }

    withWidth(width: string): this {
        this.logic.setWidth(width);
        return this;
    }

    addLineChart(field: keyof ITEM | string): LineChartBuilder<ITEM> {
        const builder = new LineChartBuilderImpl<ITEM>(field);
        this.individualBuilders.push(builder);
        return builder;
    }

    addBarChart(field: keyof ITEM | string): BarChartBuilder<ITEM> {
        const builder = new BarChartBuilderImpl<ITEM>(field);
        this.individualBuilders.push(builder);
        return builder;
    }

    addAreaChart(field: keyof ITEM | string): AreaChartBuilder<ITEM> {
        const builder = new AreaChartBuilderImpl<ITEM>(field);
        this.individualBuilders.push(builder);
        return builder;
    }

    withXAxis(): AxisBuilder {
        return this.xAxisBuilder;
    }

    withYAxis(): AxisBuilder {
        return this.yAxisBuilder;
    }

    withSecondaryYAxis(): AxisBuilder {
        if (!this.secondaryYAxisBuilder) {
            this.secondaryYAxisBuilder = new AxisBuilderImpl('right', 'linear');
        }
        return this.secondaryYAxisBuilder;
    }

    withTitle(title: Observable<string>): this {
        this.logic.setTitle(title);
        return this;
    }

    withLegend(visible: boolean): this {
        this.logic.setShowLegend(visible);
        return this;
    }

    withTooltip(enabled: boolean): this {
        this.logic.setShowTooltip(enabled);
        return this;
    }

    asGlass(): this {
        this.logic.setIsGlass(true);
        return this;
    }

    build(): HTMLElement {
        const container = document.createElement('div');
        container.className = ChartStyles.container;

        const titleEl = document.createElement('div');
        titleEl.className = ChartStyles.title;
        container.appendChild(titleEl);

        const chartArea = document.createElement('div');
        chartArea.className = ChartStyles.chartArea;
        container.appendChild(chartArea);

        const svg = this.createSvgElement('svg', {
            class: ChartStyles.svg,
            style: 'display: block',
            width: '100%',
            height: '100%',
            preserveAspectRatio: 'xMidYMid meet'
        });
        chartArea.appendChild(svg);

        const defs = this.createSvgElement('defs');
        svg.appendChild(defs);
        
        const mainG = this.createSvgElement('g');
        svg.appendChild(mainG);

        const legendEl = document.createElement('div');
        legendEl.className = ChartStyles.legend;
        container.appendChild(legendEl);

        const tooltipEl = document.createElement('div');
        tooltipEl.className = cn(ChartStyles.tooltip, 'opacity-0');
        chartArea.appendChild(tooltipEl);

        // Finalize configurations
        this.logic.resetCharts();
        this.logic.setXAxis(this.xAxisBuilder.build());
        this.logic.setYAxis(this.yAxisBuilder.build());
        if (this.secondaryYAxisBuilder) {
            this.logic.setSecondaryYAxis(this.secondaryYAxisBuilder.build());
        }
        this.individualBuilders.forEach((b, i) => {
            const config = b.build();
            if (!config.color) {
                config.color = this.DEFAULT_COLORS[i % this.DEFAULT_COLORS.length];
            }
            this.logic.addChart(config);
        });

        let lastState: ChartState<ITEM> | null = null;

        const sub = this.logic.state$.subscribe(state => {
            lastState = state;
            this.render(state, container, titleEl, chartArea, svg, mainG, defs, legendEl, tooltipEl);
        });

        const handleMouseMove = (e: MouseEvent) => {
            if (!lastState || !lastState.showTooltip) return;
            this.updateTooltip(e, svg, lastState, tooltipEl);
        };

        const handleMouseLeave = () => {
            tooltipEl.classList.add('opacity-0');
        };

        svg.addEventListener('mousemove', handleMouseMove);
        svg.addEventListener('mouseleave', handleMouseLeave);

        const resizeObserver = new ResizeObserver(() => {
            if (!lastState) return;
            
            const rect = chartArea.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                this.render(lastState, container, titleEl, chartArea, svg, mainG, defs, legendEl, tooltipEl);
            }
        });
        resizeObserver.observe(chartArea);

        registerDestroy(container, () => {
            sub.unsubscribe();
            this.logic.destroy();
            resizeObserver.disconnect();
            svg.removeEventListener('mousemove', handleMouseMove);
            svg.removeEventListener('mouseleave', handleMouseLeave);
        });

        return container;
    }

    private createSvgElement<K extends keyof SVGElementTagNameMap>(tagName: K, attributes: Record<string, string> = {}): SVGElementTagNameMap[K] {
        const el = document.createElementNS(SVG_NS, tagName);
        for (const [key, value] of Object.entries(attributes)) {
            el.setAttribute(key, value);
        }
        return el;
    }

    private render(
        state: ChartState<ITEM>, 
        container: HTMLElement, 
        titleEl: HTMLElement, 
        chartArea: HTMLElement,
        svg: SVGSVGElement, 
        mainG: SVGGElement,
        defs: SVGDefsElement,
        legendEl: HTMLElement,
        tooltipEl: HTMLElement
    ) {
        container.className = cn(ChartStyles.container, state.isGlass && ChartStyles.glass);
        if (state.height > 0) {
            container.style.height = `${state.height}px`;
        } else {
            container.style.height = '100%';
        }
        container.style.width = state.width;
        titleEl.textContent = state.title || '';
        titleEl.style.display = state.title ? 'block' : 'none';

        // Clear content
        while (mainG.firstChild) mainG.removeChild(mainG.firstChild);
        this.updateFilters(defs, state);

        const padding = { top: 20, right: 40, bottom: 40, left: 60 };
        
        // Use chartArea's client size to determine SVG space
        const rect = chartArea.getBoundingClientRect();
        const width = rect.width || 600; 
        const height = rect.height || 400;

        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

        const viewWidth = width - padding.left - padding.right;
        const viewHeight = height - padding.top - padding.bottom;

        if (viewWidth <= 0 || viewHeight <= 0 || state.data.length === 0) return;

        const { xScale, yScale, yDomain, secondaryYScale, secondaryYDomain, categories } = 
            this.logic.calculateScales(state, viewWidth, viewHeight);

        const g = this.createSvgElement('g', {
            transform: `translate(${padding.left}, ${padding.top})`
        });
        mainG.appendChild(g);

        this.renderAxes(g, state, xScale, yScale, secondaryYScale, viewWidth, viewHeight, categories, yDomain, secondaryYDomain);
        this.renderSeries(g, state, xScale, yScale, secondaryYScale, viewHeight);
        this.renderLegend(legendEl, state);
    }

    private updateFilters(defs: SVGDefsElement, state: ChartState<ITEM>) {
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

    private renderSeries(
        g: SVGGElement, 
        state: ChartState<ITEM>, 
        xScale: any, 
        yScale: any, 
        secondaryYScale: any, 
        viewHeight: number
    ) {
        state.charts.forEach((chart, i) => {
            const scale = chart.useSecondaryAxis && secondaryYScale ? secondaryYScale : yScale;
            const filterId = `shadow-${i}`;
            
            switch (chart.type) {
                case 'line':
                    this.renderLine(g, state, chart, xScale, scale, filterId);
                    break;
                case 'bar':
                    this.renderBars(g, state, chart, xScale, scale, viewHeight, filterId);
                    break;
                case 'area':
                    this.renderArea(g, state, chart, xScale, scale, viewHeight, filterId);
                    break;
            }
        });
    }

    private renderLine(g: SVGGElement, state: ChartState<ITEM>, config: LineChartConfig<ITEM>, xScale: any, yScale: any, filterId: string) {
        const points = state.data.map((d, i) => {
            const x = xScale(i);
            const y = yScale(Number(d[config.field as keyof ITEM]) || 0);
            return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
        }).join(' ');

        const pathAttrs: Record<string, string> = {
            d: points,
            fill: 'none',
            stroke: config.color || 'currentColor',
            'stroke-width': String(config.width || 2),
            filter: `url(#${filterId})`
        };
        if (config.isDashed) pathAttrs['stroke-dasharray'] = '5,5';

        const path = this.createSvgElement('path', pathAttrs);
        g.appendChild(path);

        if (config.showMarkers) {
            state.data.forEach((d, i) => {
                const circle = this.createSvgElement('circle', {
                    cx: String(xScale(i)),
                    cy: String(yScale(Number(d[config.field as keyof ITEM]) || 0)),
                    r: '4',
                    fill: config.color || 'currentColor',
                    filter: `url(#${filterId})`
                });
                g.appendChild(circle);
            });
        }
    }

    private renderBars(g: SVGGElement, state: ChartState<ITEM>, config: BarChartConfig<ITEM>, xScale: any, yScale: any, viewHeight: number, filterId: string) {
        const barWidth = 20; 
        state.data.forEach((d, i) => {
            const val = Number(d[config.field as keyof ITEM]) || 0;
            const y = yScale(val);
            const rect = this.createSvgElement('rect', {
                x: String(xScale(i) - barWidth / 2),
                y: String(y),
                width: String(barWidth),
                height: String(viewHeight - y),
                fill: config.color || 'currentColor',
                rx: '2',
                filter: `url(#${filterId})`
            });
            g.appendChild(rect);
        });
    }

    private renderArea(g: SVGGElement, state: ChartState<ITEM>, config: AreaChartConfig<ITEM>, xScale: any, yScale: any, viewHeight: number, filterId: string) {
        if (state.data.length === 0) return;

        const linePoints = state.data.map((d, i) => {
            const x = xScale(i);
            const y = yScale(Number(d[config.field as keyof ITEM]) || 0);
            return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
        }).join(' ');

        const areaPathData = `${linePoints} L ${xScale(state.data.length - 1)},${viewHeight} L ${xScale(0)},${viewHeight} Z`;
        
        const area = this.createSvgElement('path', {
            d: areaPathData,
            fill: config.color || 'currentColor',
            'fill-opacity': String(config.opacity || 0.3),
            filter: `url(#${filterId})`
        });
        g.appendChild(area);

        const line = this.createSvgElement('path', {
            d: linePoints,
            fill: 'none',
            stroke: config.color || 'currentColor',
            'stroke-width': '2',
            filter: `url(#${filterId})`
        });
        g.appendChild(line);
    }

    private renderAxes(
        g: SVGGElement, 
        state: ChartState<ITEM>, 
        xScale: (i: number) => number, 
        yScale: (v: number) => number,
        secondaryYScale: ((v: number) => number) | undefined,
        viewWidth: number, 
        viewHeight: number,
        categories: string[],
        yDomain: number[],
        secondaryYDomain: number[] | undefined
    ) {
        if (state.xAxis.visible) {
            const xAxisG = this.createSvgElement('g', {
                transform: `translate(0, ${viewHeight})`
            });
            g.appendChild(xAxisG);

            categories.forEach((cat, i) => {
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

                const text = this.createSvgElement('text', {
                    x: String(x),
                    y: '20',
                    'text-anchor': 'middle',
                    class: ChartStyles.axis
                });
                text.textContent = cat;
                xAxisG.appendChild(text);
            });
        }

        if (state.yAxis.visible) {
            this.renderYAxis(g, state.yAxis, yScale, yDomain, viewWidth, viewHeight, false);
        }

        if (state.secondaryYAxis && secondaryYScale && secondaryYDomain) {
            this.renderYAxis(g, state.secondaryYAxis, secondaryYScale, secondaryYDomain, viewWidth, viewHeight, true);
        }
    }

    private renderYAxis(
        g: SVGGElement, 
        config: any, 
        scale: (v: number) => number, 
        domain: number[], 
        viewWidth: number, 
        viewHeight: number,
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

    private renderLegend(container: HTMLElement, state: ChartState<ITEM>) {
        while (container.firstChild) container.removeChild(container.firstChild);
        if (!state.showLegend) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'flex';

        state.charts.forEach(chart => {
            const item = document.createElement('div');
            item.className = ChartStyles.legendItem;
            
            const color = document.createElement('div');
            color.className = ChartStyles.legendColor;
            color.style.backgroundColor = chart.color || 'currentColor';
            
            const label = document.createElement('span');
            label.textContent = chart.label;
            
            item.appendChild(color);
            item.appendChild(label);
            container.appendChild(item);
        });
    }

    private updateTooltip(e: MouseEvent, svg: SVGSVGElement, state: ChartState<ITEM>, tooltipEl: HTMLElement) {
        const rect = svg.getBoundingClientRect();
        const padding = { left: 60, right: 40 };
        const viewWidth = rect.width - padding.left - padding.right;
        
        const x = e.clientX - rect.left - padding.left;
        if (x < -10 || x > viewWidth + 10 || state.data.length === 0) {
            tooltipEl.classList.add('opacity-0');
            return;
        }

        const index = Math.max(0, Math.min(state.data.length - 1, Math.round((x / viewWidth) * (state.data.length - 1))));
        const item = state.data[index];
        if (!item) return;

        const categories = state.data.map(d => String(d[state.categoryField as keyof ITEM]));
        
        let html = `<div class="font-semibold mb-1">${categories[index]}</div>`;
        state.charts.forEach(chart => {
            const val = item[chart.field as keyof ITEM];
            const displayVal = chart.tooltipRenderer ? chart.tooltipRenderer(item) : val;
            html += `<div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full" style="background-color: ${chart.color}"></div>
                <span>${chart.label}: ${displayVal}</span>
            </div>`;
        });

        tooltipEl.innerHTML = html;
        tooltipEl.classList.remove('opacity-0');
        
        const tooltipRect = tooltipEl.getBoundingClientRect();
        const xPos = (index / (state.data.length - 1)) * viewWidth + padding.left;
        
        let left = xPos + 10;
        if (left + tooltipRect.width > rect.width) {
            left = xPos - tooltipRect.width - 10;
        }
        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = `20px`;
    }
}
