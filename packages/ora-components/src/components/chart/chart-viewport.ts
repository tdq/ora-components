import { ChartLogic } from './chart-logic';
import { ChartState } from './types';
import { ChartStyles } from './styles';
import { ChartSvgArea } from './chart-svg-area';
import { AxisRenderer } from './axis-renderer';
import { SeriesRenderer } from './series-renderer';
import { readValue } from './value-utils';
import { ChartLegend } from './chart-legend';
import { ChartTooltip } from './chart-tooltip';
import { HIGHLIGHT_RADIUS, DEFAULT_SPARKLINE_HEIGHT } from './constants';
import { LabelBuilder, LabelSize } from '../label';
import { map, Subscription, Observable } from 'rxjs';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { registerDestroy } from '@/core/destroyable-element';

function cn(...inputs: any[]) {
    return twMerge(clsx(inputs));
}

export class ChartViewport<ITEM> {
    private static _idCounter = 0;
    private readonly _clipId: string;

    private element: HTMLElement;
    private titleEl: HTMLElement;
    private chartArea: HTMLElement;
    private svgArea: ChartSvgArea;
    private axisRenderer = new AxisRenderer();
    private seriesRenderer = new SeriesRenderer();
    private legend = new ChartLegend<ITEM>();
    private tooltip = new ChartTooltip<ITEM>();

    private lastState: ChartState<ITEM> | null = null;
    private lastPadding = { top: 20, right: 40, bottom: 40, left: 60 };
    private lastScales: any = null;
    private lastViewHeight = 0;
    private hoverG: SVGGElement | null = null;
    private className$?: Observable<string>;
    private lastEmittedClassName = '';
    private sub: Subscription;

    constructor(private logic: ChartLogic<ITEM>, className$?: Observable<string>) {
        this.className$ = className$;
        ChartViewport._idCounter++;
        this._clipId = `chart-plot-${ChartViewport._idCounter}`;

        this.element = document.createElement('div');
        this.element.className = ChartStyles.container;

        this.titleEl = new LabelBuilder()
            .withSize(LabelSize.LARGE)
            .withCaption(this.logic.state$.pipe(map(s => s.title || '')))
            .build();
        this.titleEl.setAttribute('class', ChartStyles.title);
        this.element.appendChild(this.titleEl);

        this.chartArea = document.createElement('div');
        this.chartArea.className = ChartStyles.chartArea;
        this.element.appendChild(this.chartArea);

        this.svgArea = new ChartSvgArea(() => this.onResize());
        this.chartArea.appendChild(this.svgArea.getElement());

        this.element.appendChild(this.legend.getElement());
        this.chartArea.appendChild(this.tooltip.getElement());

        this.sub = new Subscription();

        // Subscribe to className$ first, so custom classes are set before render() is called
        this.subscribeToClassName();

        this.sub.add(this.logic.state$.subscribe(state => {
            this.lastState = state;
            this.render(state);
        }));

        const svg = this.svgArea.getElement();
        const handleMouseMove = (e: MouseEvent) => {
            if (!this.lastState || !this.lastState.showTooltip || !this.lastScales) return;
            const result = this.tooltip.show(e, svg, this.lastState, this.lastPadding, this.lastScales);
            if (result) {
                this.renderHoverEffects(result.index, result.xPos);
            } else {
                this.clearHoverEffects();
            }
        };

        const handleMouseLeave = () => {
            this.tooltip.hide();
            this.clearHoverEffects();
        };

        svg.addEventListener('mousemove', handleMouseMove);
        svg.addEventListener('mouseleave', handleMouseLeave);

        this.svgArea.observe(this.chartArea);

        registerDestroy(this.element, () => {
            this.sub.unsubscribe();
            this.logic.destroy();
            this.svgArea.destroy();
            svg.removeEventListener('mousemove', handleMouseMove);
            svg.removeEventListener('mouseleave', handleMouseLeave);
        });
    }

    private subscribeToClassName(): void {
        if (!this.className$) return;
        this.sub.add(this.className$.subscribe(className => {
            this.lastEmittedClassName = className;
            // Trigger a re-render to include the updated classes
            if (this.lastState) {
                this.render(this.lastState);
            }
        }));
    }

    getElement(): HTMLElement {
        return this.element;
    }

    private onResize() {
        if (this.lastState) {
            this.render(this.lastState);
        }
    }

    private render(state: ChartState<ITEM>) {
        // Set base classes + include custom classes from withClass() subscriptions
        this.element.className = cn(
            ChartStyles.container,
            state.isGlass && ChartStyles.glass,
            this.lastEmittedClassName
        );
        // A fixed min-height on the chart area would override the sparkline's configured
        // (default 32px) height in a real browser — jsdom's layout-less rendering can't catch
        // this, only a class-list assertion or a real browser can.
        this.chartArea.className = cn(ChartStyles.chartArea, !state.isSparkline && ChartStyles.chartAreaMinHeight);

        const sparklineHeight = state.height > 0 ? state.height : DEFAULT_SPARKLINE_HEIGHT;

        if (state.height > 0) {
            this.element.style.height = `${state.height}px`;
        } else {
            this.element.style.height = '100%';
        }
        this.element.style.width = state.width;

        // Sparkline mode: give the chart area an explicit, definite height instead of relying
        // on flex-grow (flex-basis: auto sizes to content, and an SVG with no definite parent
        // height falls back to its ~150px intrinsic default — a circular dependency `flex: none`
        // plus a fixed pixel height breaks outright, in every browser, not just via measurement).
        if (state.isSparkline) {
            this.chartArea.style.height = `${sparklineHeight}px`;
            this.chartArea.style.flex = 'none';
        } else {
            this.chartArea.style.height = '';
            this.chartArea.style.flex = '';
        }
        this.svgArea.setPixelHeight(state.isSparkline ? sparklineHeight : null);

        this.titleEl.classList.toggle('hidden', !state.title);

        this.svgArea.clear();
        this.seriesRenderer.updateFilters(this.svgArea.getDefs(), state);

        if (state.data.length === 0) return;

        const padding = state.isSparkline
            ? { top: 0, right: 0, bottom: 0, left: 0 }
            : { top: 20, right: 40, bottom: 40, left: 60 };
        const forcedHeight = state.isSparkline ? sparklineHeight : undefined;

        // --- Part B: horizontal scroll (post-downsampling) ---
        // Step 1: first pass — compute viewBox with standard padding, no scroll override yet.
        const firstViewBox = this.svgArea.getViewBox(padding, this.chartArea, undefined, forcedHeight);
        if (firstViewBox.viewWidth <= 0 || firstViewBox.viewHeight <= 0) return;

        // Step 2: compute initial scales to know the post-downsampling category count.
        // Using pre-scroll viewWidth is fine here — downsampling depends on category density,
        // and the scroll path only activates when categories are genuinely wide, not oversampled.
        const initialScales = this.logic.calculateScales(state, firstViewBox.viewWidth, firstViewBox.viewHeight);

        // Step 3: decide scroll based on post-downsampling category count, not raw data length.
        // This avoids reserving empty space for categories that were collapsed by downsampling.
        const MIN_CATEGORY_WIDTH = 20;
        const containerWidth = firstViewBox.width;
        const minNeededWidth = initialScales.categories.length * MIN_CATEGORY_WIDTH + padding.left + padding.right;
        const totalWidth = Math.max(containerWidth, minNeededWidth);
        const needsScroll = totalWidth > containerWidth;

        if (needsScroll) {
            this.chartArea.style.overflowX = 'auto';
            this.svgArea.getElement().setAttribute('width', String(totalWidth));
        } else {
            this.chartArea.style.overflowX = '';
            this.svgArea.getElement().setAttribute('width', '100%');
        }

        // Step 4: recompute viewBox with the correct total width.
        const { viewWidth, viewHeight } = this.svgArea.getViewBox(padding, this.chartArea, needsScroll ? totalWidth : undefined, forcedHeight);
        if (viewWidth <= 0 || viewHeight <= 0) return;

        // Step 5: compute scales with the correct viewWidth, then check label rotation.
        let finalScales = this.logic.calculateScales(state, viewWidth, viewHeight);
        const effectiveXStep = (finalScales.xStep && finalScales.xStep > 0)
            ? finalScales.xStep
            : (viewWidth / Math.max(finalScales.categories.length - 1, 1));
        const labelRotation = AxisRenderer.getLabelRotation(finalScales.categories, effectiveXStep);

        // Step 6: if rotation needed, adjust bottom padding and recompute with taller chart area.
        // Note: padding.bottom change only affects viewHeight, not viewWidth.
        // xStep and categories are derived from viewWidth only, so labelRotation remains valid.
        let finalPadding = { ...padding };
        let finalViewWidth = viewWidth;
        let finalViewHeight = viewHeight;
        if (labelRotation !== 0 && !state.isSparkline && state.xAxis.visible) {
            // -45°: labels extend diagonally, need ~40px extra; -90°: labels stand upright, need ~60px extra.
            finalPadding = { ...padding, bottom: labelRotation === -90 ? 100 : 80 };
            const { viewWidth: vw2, viewHeight: vh2 } = this.svgArea.getViewBox(
                finalPadding,
                this.chartArea,
                needsScroll ? totalWidth : undefined
            );
            if (vw2 > 0 && vh2 > 0) {
                finalViewWidth = vw2;
                finalViewHeight = vh2;
                // Note: only viewHeight changes between calls (due to bottom padding for rotated labels).
                // Downsampling in calculateScales is xStep-only (based on viewWidth), so categories
                // and labelRotation remain valid — no need to recheck rotation here.
                finalScales = this.logic.calculateScales(state, vw2, vh2);
            }
        }

        this.lastPadding = finalPadding;
        this.lastScales = finalScales;
        this.lastViewHeight = finalViewHeight;

        // Define clip region matching the plot area so series lines don't bleed
        // outside the viewport when withMin/withMax constrain the domain.
        const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clipPath.setAttribute('id', this._clipId);
        const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        clipRect.setAttribute('x', '0');
        clipRect.setAttribute('y', '0');
        clipRect.setAttribute('width', String(finalViewWidth));
        clipRect.setAttribute('height', String(finalViewHeight));
        clipPath.appendChild(clipRect);
        this.svgArea.getDefs().appendChild(clipPath);

        const mainG = this.svgArea.getMainG();
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${finalPadding.left}, ${finalPadding.top})`);
        mainG.appendChild(g);

        // SVG paints in document order, so the axis group is appended FIRST: grid
        // lines, ticks and axis labels sit behind the series, never across them.
        // The axis group is deliberately unclipped — tick labels sit outside the
        // plot area bounds — while the series group is clipped to it.
        const axisG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.appendChild(axisG);

        const seriesG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        seriesG.setAttribute('clip-path', `url(#${this._clipId})`);
        g.appendChild(seriesG);

        this.axisRenderer.render(axisG, state, finalScales, finalViewWidth, finalViewHeight);
        this.seriesRenderer.render(seriesG, state, finalScales);
        this.legend.render(state);

        this.hoverG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.hoverG.setAttribute('transform', `translate(${finalPadding.left}, ${finalPadding.top})`);
        this.hoverG.setAttribute('clip-path', `url(#${this._clipId})`);
        this.hoverG.style.pointerEvents = 'none';
        mainG.appendChild(this.hoverG);
    }

    private clearHoverEffects() {
        if (this.hoverG) {
            while (this.hoverG.firstChild) this.hoverG.removeChild(this.hoverG.firstChild);
        }
    }

    private renderHoverEffects(index: number, xPos: number) {
        if (!this.hoverG || !this.lastState || !this.lastScales) return;
        this.clearHoverEffects();

        const { yScale, secondaryYScale, displayData } = this.lastScales;
        const item = displayData[index];
        if (!item) return;

        const hoverG = this.hoverG;

        // Render vertical dashed line (from bottom axis to the top)
        const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        vLine.setAttribute('x1', String(xPos));
        vLine.setAttribute('y1', '0');
        vLine.setAttribute('x2', String(xPos));
        vLine.setAttribute('y2', String(this.lastViewHeight));
        vLine.setAttribute('class', ChartStyles.hoverLine);
        vLine.setAttribute('stroke', 'var(--md-sys-color-on-surface-variant)');
        vLine.setAttribute('stroke-opacity', '0.5');
        vLine.setAttribute('stroke-width', '1');
        vLine.setAttribute('stroke-dasharray', '4,4');
        hoverG.appendChild(vLine);

        // Render highlights for each chart
        this.lastState.charts.forEach(chart => {
            if (chart.type === 'bar') return;

            const val = readValue(item, chart.field);
            if (val === null) return; // gap: no ring/dot, tooltip already omits this series

            const scale = chart.useSecondaryAxis && secondaryYScale ? secondaryYScale : yScale;
            const y = scale(val);

            // Ring highlight
            const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            ring.setAttribute('cx', String(xPos));
            ring.setAttribute('cy', String(y));
            ring.setAttribute('r', String(HIGHLIGHT_RADIUS));
            ring.setAttribute('class', ChartStyles.hoverRing);
            ring.style.stroke = chart.color || 'currentColor';
            hoverG.appendChild(ring);
            
            // Solid point (to cover the line and look better)
            const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            point.setAttribute('cx', String(xPos));
            point.setAttribute('cy', String(y));
            point.setAttribute('r', '4');
            point.style.fill = chart.color || 'currentColor';
            hoverG.appendChild(point);
        });
    }
}
