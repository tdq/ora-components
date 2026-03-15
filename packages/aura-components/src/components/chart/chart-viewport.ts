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
        this.element.className = cn(ChartStyles.container, state.isGlass && ChartStyles.glass);
        if (state.height > 0) {
            this.element.style.height = `${state.height}px`;
        } else {
            this.element.style.height = '100%';
        }
        this.element.style.width = state.width;

        this.titleEl.classList.toggle('hidden', !state.title);

        this.svgArea.clear();
        this.seriesRenderer.updateFilters(this.svgArea.getDefs(), state);

        const padding = { top: 20, right: 40, bottom: 40, left: 60 };
        const { viewWidth, viewHeight } = this.svgArea.getViewBox(padding, this.chartArea);

        if (viewWidth <= 0 || viewHeight <= 0 || state.data.length === 0) return;

        const scales = this.logic.calculateScales(state, viewWidth, viewHeight);

        const mainG = this.svgArea.getMainG();
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${padding.left}, ${padding.top})`);
        mainG.appendChild(g);

        this.axisRenderer.render(g, state, scales, viewWidth, viewHeight);
        this.seriesRenderer.render(g, state, scales);
        this.legend.render(state);
    }
}
