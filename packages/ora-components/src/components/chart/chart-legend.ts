import { ChartState } from './types';
import { ChartStyles } from './styles';
import { LabelBuilder, LabelSize } from '../label';
import { of } from 'rxjs';

export class ChartLegend<ITEM> {
    private element: HTMLElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = ChartStyles.legend;
    }

    getElement(): HTMLElement {
        return this.element;
    }

    render(state: ChartState<ITEM>) {
        while (this.element.firstChild) this.element.removeChild(this.element.firstChild);
        
        if (!state.showLegend) {
            this.element.style.display = 'none';
            return;
        }
        this.element.style.display = 'flex';

        state.charts.forEach(chart => {
            const item = document.createElement('div');
            item.className = ChartStyles.legendItem;
            
            const color = document.createElement('div');
            color.className = ChartStyles.legendColor;
            color.style.backgroundColor = chart.color || 'currentColor';
            
            const label = new LabelBuilder()
                .withSize(LabelSize.MEDIUM)
                .withCaption(of(chart.label))
                .build();
            
            item.appendChild(color);
            item.appendChild(label);
            this.element.appendChild(item);
        });
    }
}
