import { ChartBuilder } from './chart-builder';
import { of } from 'rxjs';
import '@testing-library/jest-dom';

describe('ChartBuilder', () => {
    const testData = [
        { category: 'Jan', value1: 10, value2: 20 },
        { category: 'Feb', value1: 15, value2: 25 },
        { category: 'Mar', value1: 8, value2: 30 }
    ];

    it('should create a chart container', () => {
        const chart = new ChartBuilder()
            .withData(of(testData))
            .withCategoryField('category')
            .build();

        expect(chart).toBeInstanceOf(HTMLDivElement);
        expect(chart.querySelector('svg')).not.toBeNull();
    });

    it('should display title when provided', () => {
        const title = 'Sales Report';
        const chart = new ChartBuilder()
            .withData(of(testData))
            .withCategoryField('category')
            .withTitle(of(title))
            .build();

        const titleEl = chart.querySelector('.text-title-large');
        expect(titleEl?.textContent).toBe(title);
    });

    it('should render line series', () => {
        const chartBuilder = new ChartBuilder<any>()
            .withData(of(testData))
            .withCategoryField('category');
        
        chartBuilder.addLineChart('value1').withLabel('Value 1');
        
        const chart = chartBuilder.build();

        // Check if path exists in SVG (lines use path now)
        const path = chart.querySelector('path');
        expect(path).not.toBeNull();
        expect(path).toHaveAttribute('stroke');
    });

    it('should render bar series', () => {
        const chartBuilder = new ChartBuilder<any>()
            .withData(of(testData))
            .withCategoryField('category');
        
        chartBuilder.addBarChart('value1');
        
        const chart = chartBuilder.build();

        // Check if rects exist in SVG (one per data point)
        const rects = chart.querySelectorAll('rect');
        expect(rects.length).toBe(testData.length);
    });

    it('should render area series', () => {
        const chartBuilder = new ChartBuilder<any>()
            .withData(of(testData))
            .withCategoryField('category');
        
        chartBuilder.addAreaChart('value1');
        
        const chart = chartBuilder.build();

        // Check if path exists in SVG (area fill)
        const paths = chart.querySelectorAll('path');
        expect(paths.length).toBeGreaterThan(0);
    });

    it('should render multiple series', () => {
        const chartBuilder = new ChartBuilder<any>()
            .withData(of(testData))
            .withCategoryField('category');
        
        chartBuilder.addLineChart('value1');
        chartBuilder.addBarChart('value2');
        
        const chart = chartBuilder.build();

        expect(chart.querySelector('path')).not.toBeNull();
        expect(chart.querySelectorAll('rect').length).toBe(testData.length);
    });

    it('should render legend when enabled', () => {
        const chartBuilder = new ChartBuilder<any>()
            .withData(of(testData))
            .withCategoryField('category');
        
        chartBuilder.addLineChart('value1').withLabel('V1');
        chartBuilder.withLegend(true);
        
        const chart = chartBuilder.build();

        const legend = chart.querySelector('.flex.flex-wrap.gap-4');
        expect(legend).not.toBeNull();
        expect(legend?.textContent).toContain('V1');
    });

    it('should apply glass style', () => {
        const chart = new ChartBuilder()
            .withData(of(testData))
            .withCategoryField('category')
            .asGlass()
            .build();

        expect(chart).toHaveClass('backdrop-blur-md');
    });
});
