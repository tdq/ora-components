import { ChartLogic } from './chart-logic';
import { ChartState } from './types';
import { ChartStyles } from './styles';
import { ChartSvgArea } from './chart-svg-area';
import { AxisRenderer } from './axis-renderer';
import { SeriesRenderer } from './series-renderer';
import { ChartLegend } from './chart-legend';
import { ChartTooltip } from './chart-tooltip';
import { LabelBuilder, LabelSize } from '../label';
import { registerDestroy } from '@/core/destroyable-element';
import { map } from 'rxjs';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
    return twMerge(clsx(inputs));
}

export class ChartViewport<ITEM> {
    private element: HTMLElement;
    private titleEl: HTMLElement;
    private chartArea: HTMLElement;
    private svgArea: ChartSvgArea;
    private axisRenderer = new AxisRenderer();
    private seriesRenderer = new SeriesRenderer();
    private legend = new ChartLegend<ITEM>();
    private tooltip = new ChartTooltip<ITEM>();
    
    private lastState: ChartState<ITEM> | null = null;

    constructor(private logic: ChartLogic<ITEM>) {
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

        const sub = this.logic.state$.subscribe(state => {
            this.lastState = state;
            this.render(state);
        });

        const svg = this.svgArea.getElement();
        const handleMouseMove = (e: MouseEvent) => {
            if (!this.lastState || !this.lastState.showTooltip) return;
            this.tooltip.show(e, svg, this.lastState);
        };

        const handleMouseLeave = () => {
            this.tooltip.hide();
        };

        svg.addEventListener('mousemove', handleMouseMove);
        svg.addEventListener('mouseleave', handleMouseLeave);

        this.svgArea.observe(this.chartArea);

        registerDestroy(this.element, () => {
            sub.unsubscribe();
            this.logic.destroy();
            this.svgArea.destroy();
            svg.removeEventListener('mousemove', handleMouseMove);
            svg.removeEventListener('mouseleave', handleMouseLeave);
        });
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
        this.element.className = cn(ChartStyles.container/*, state.isGlass && ChartStyles.glass*/);
        if (state.height > 0) {
            this.element.style.height = `${state.height}px`;
        } else {
            this.element.style.height = '100%';
        }
        this.element.style.width = state.width;

        this.titleEl.classList.toggle('hidden', !state.title);

        this.svgArea.clear();
        this.seriesRenderer.updateFilters(this.svgArea.getDefs(), state);

        if (state.data.length === 0) return;

        const padding = { top: 20, right: 40, bottom: 40, left: 60 };

        // --- Part B: horizontal scroll (post-downsampling) ---
        // Step 1: first pass — compute viewBox with standard padding, no scroll override yet.
        const firstViewBox = this.svgArea.getViewBox(padding, this.chartArea);
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
        const { viewWidth, viewHeight } = this.svgArea.getViewBox(padding, this.chartArea, needsScroll ? totalWidth : undefined);
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
        if (labelRotation !== 0) {
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

        const mainG = this.svgArea.getMainG();
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${finalPadding.left}, ${finalPadding.top})`);
        mainG.appendChild(g);

        this.axisRenderer.render(g, state, finalScales, finalViewWidth, finalViewHeight);
        this.seriesRenderer.render(g, state, finalScales);
        this.legend.render(state);
    }
}
