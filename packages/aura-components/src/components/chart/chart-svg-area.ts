const SVG_NS = 'http://www.w3.org/2000/svg';
import { ChartStyles } from './styles';

export class ChartSvgArea {
    private svg: SVGSVGElement;
    private defs: SVGDefsElement;
    private mainG: SVGGElement;
    private resizeObserver: ResizeObserver | null = null;

    constructor(private onResize: () => void) {
        this.svg = this.createSvgElement('svg', {
            class: ChartStyles.svg,
            style: 'display: block',
            width: '100%',
            height: '100%',
            preserveAspectRatio: 'xMidYMid meet'
        });

        this.defs = this.createSvgElement('defs');
        this.svg.appendChild(this.defs);
        
        this.mainG = this.createSvgElement('g');
        this.svg.appendChild(this.mainG);
    }

    private createSvgElement<K extends keyof SVGElementTagNameMap>(tagName: K, attributes: Record<string, string> = {}): SVGElementTagNameMap[K] {
        const el = document.createElementNS(SVG_NS, tagName);
        for (const [key, value] of Object.entries(attributes)) {
            el.setAttribute(key, value);
        }
        return el;
    }

    getElement(): SVGSVGElement {
        return this.svg;
    }

    getDefs(): SVGDefsElement {
        return this.defs;
    }

    getMainG(): SVGGElement {
        return this.mainG;
    }

    observe(element: HTMLElement) {
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.onResize();
            });
            this.resizeObserver.observe(element);
        }
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }

    clear() {
        while (this.mainG.firstChild) this.mainG.removeChild(this.mainG.firstChild);
    }

    getViewBox(padding: { top: number, right: number, bottom: number, left: number }, chartArea: HTMLElement, totalWidth?: number) {
        const rect = chartArea.getBoundingClientRect();
        const width = totalWidth || rect.width || 600;
        const height = rect.height || 400;

        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

        const viewWidth = width - padding.left - padding.right;
        const viewHeight = height - padding.top - padding.bottom;

        return { width, height, viewWidth, viewHeight };
    }
}
