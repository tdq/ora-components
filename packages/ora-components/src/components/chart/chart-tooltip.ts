import { ChartState, ChartScales } from './types';
import { ChartStyles } from './styles';
import { LabelBuilder, LabelSize } from '../label';
import { readValue } from './value-utils';
import { of } from 'rxjs';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
    return twMerge(clsx(inputs));
}

export class ChartTooltip<ITEM> {
    private element: HTMLElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = cn(ChartStyles.tooltip, 'opacity-0');
    }

    getElement(): HTMLElement {
        return this.element;
    }

    show(e: MouseEvent, svg: SVGSVGElement, state: ChartState<ITEM>, padding: { left: number, right: number }, scales: ChartScales): { index: number, xPos: number } | null {
        const rect = svg.getBoundingClientRect();
        const x = e.clientX - rect.left - padding.left;
        
        // Use scales from rendering instead of recalculating
        const data = scales.displayData;
        const N = data.length;
        if (N === 0) {
            this.hide();
            return null;
        }

        const viewWidth = rect.width - padding.left - padding.right;
        
        // Relaxed interaction area: allow finding the closest point if within reasonable bounds
        if (x < -20 || x > viewWidth + 20) {
            this.hide();
            return null;
        }

        const { xScale, xStep, barGroupWidth, barWidth } = scales;

        let index = 0;
        let xPos = viewWidth / 2;

        if (N > 1) {
            const effectiveXStep = xStep || (viewWidth / (N - 1));
            // `barGroupWidth` (the group's actual rendered span once bar series are grouped)
            // mirrors what `ChartLogic.calculateScales` uses for `xScale`'s own edge padding;
            // it equals `barWidth` whenever there's at most one bar slot, and falling back to
            // `barWidth` keeps this working against a hand-built `scales` object that predates
            // the field (see `ChartScales.barGroupWidth`).
            const effectiveBarWidth = barGroupWidth ?? barWidth ?? 0;
            // Calculate index based on the same formula used in logic: xPos = 8 + barGroupWidth/2 + index * xStep
            index = Math.max(0, Math.min(N - 1, Math.round((x - 8 - effectiveBarWidth / 2) / effectiveXStep)));
            xPos = xScale(index);
        }

        const item = data[index];
        if (!item) return null;

        // Apply glass style if needed, preserving current visibility
        const isHidden = this.element.classList.contains('opacity-0');
        this.element.className = cn(
            state.isGlass ? ChartStyles.tooltipGlass : ChartStyles.tooltip,
            isHidden && 'opacity-0'
        );

        const category = String(item[state.categoryField as keyof ITEM]);
        
        while (this.element.firstChild) this.element.removeChild(this.element.firstChild);

        const header = new LabelBuilder()
            .withSize(LabelSize.MEDIUM)
            .withCaption(of(category))
            .withClass(of('font-semibold mb-1 block'))
            .build();
        this.element.appendChild(header);

        state.charts.forEach(chart => {
            const raw = item[chart.field as keyof ITEM];
            let displayVal: unknown;
            if (chart.tooltipRenderer) {
                displayVal = chart.tooltipRenderer(item);
            } else {
                const num = readValue(item, chart.field as string);
                if (num === null) {
                    displayVal = raw;
                } else {
                    // A series marked useSecondaryAxis without a configured secondary axis
                    // (scales.formatSecondary undefined) falls through to the primary format
                    // rather than showing a raw, unformatted number.
                    const format = scales.seriesFormats.get(chart)
                        ?? (chart.useSecondaryAxis ? scales.formatSecondary : undefined)
                        ?? scales.formatPrimary;
                    displayVal = format ? format(num) : num;
                }
            }

            const row = document.createElement('div');
            row.className = 'flex items-center gap-2';
            
            const color = document.createElement('div');
            color.className = 'w-2 h-2 rounded-full';
            color.style.backgroundColor = chart.color || 'currentColor';
            
            const label = new LabelBuilder()
                .withSize(LabelSize.SMALL)
                .withCaption(of(`${chart.label}: ${displayVal}`))
                .build();
            
            row.appendChild(color);
            row.appendChild(label);
            this.element.appendChild(row);
        });

        this.element.classList.remove('opacity-0');
        
        const tooltipRect = this.element.getBoundingClientRect();
        const finalXPos = xPos + padding.left;
        
        let left = finalXPos + 10;
        if (left + tooltipRect.width > rect.width) {
            left = finalXPos - tooltipRect.width - 10;
        }
        this.element.style.left = `${left}px`;
        this.element.style.top = `20px`;

        return { index, xPos };
    }

    hide() {
        this.element.classList.add('opacity-0');
    }
}
