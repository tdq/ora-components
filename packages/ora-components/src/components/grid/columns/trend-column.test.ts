import { TrendColumnBuilder } from './trend-column';
import { Trend } from '../../../types/trend';

describe('TrendColumnBuilder', () => {
    describe('render', () => {
        it('should render a TrendBuilder chip for a positive trend', () => {
            const builder = new TrendColumnBuilder<any>('trend');
            const el = builder.render({
                trend: { value: 14.2, period: 'vs last month' } as Trend,
            });
            expect(el).toBeInstanceOf(HTMLElement);
            expect(el.tagName).toBe('SPAN');
            expect(el.className).toContain('trend-up');
            expect(el.textContent).toContain('▲');
            expect(el.textContent).toContain('+14.2%');
            expect(el.textContent).toContain('vs last month');
        });

        it('should render a chip for a negative trend', () => {
            const builder = new TrendColumnBuilder<any>('trend');
            const el = builder.render({
                trend: { value: -3.1, period: 'vs last qtr' } as Trend,
            });
            expect(el.className).toContain('trend-down');
            expect(el.textContent).toContain('▼');
            expect(el.textContent).toContain('-3.1%');
        });

        it('should render a chip for a flat trend (value 0)', () => {
            const builder = new TrendColumnBuilder<any>('trend');
            const el = builder.render({
                trend: { value: 0, period: 'vs last month' } as Trend,
            });
            expect(el.className).toContain('trend-flat');
            expect(el.textContent).not.toContain('▲');
            expect(el.textContent).not.toContain('▼');
            expect(el.textContent).toContain('+0.0%');
        });

        it('should return an empty span for null value', () => {
            const builder = new TrendColumnBuilder<any>('trend');
            const el = builder.render({ trend: null });
            expect(el).toBeInstanceOf(HTMLSpanElement);
            expect(el.childNodes.length).toBe(0);
        });

        it('should return an empty span for undefined value', () => {
            const builder = new TrendColumnBuilder<any>('trend');
            const el = builder.render({ trend: undefined });
            expect(el).toBeInstanceOf(HTMLSpanElement);
            expect(el.childNodes.length).toBe(0);
        });

        it('should return an empty span for missing field', () => {
            const builder = new TrendColumnBuilder<any>('trend');
            const el = builder.render({});
            expect(el).toBeInstanceOf(HTMLSpanElement);
            expect(el.childNodes.length).toBe(0);
        });

        it('should return an empty span for NaN value', () => {
            const builder = new TrendColumnBuilder<any>('trend');
            const el = builder.render({
                trend: { value: NaN, period: 'vs last month' } as Trend,
            });
            expect(el).toBeInstanceOf(HTMLSpanElement);
            expect(el.childNodes.length).toBe(0);
        });

        it('should use static period from withPeriod', () => {
            const builder = new TrendColumnBuilder<any>('trend')
                .withPeriod('vs last year');
            const el = builder.render({
                trend: { value: 5.0, period: 'original' } as Trend,
            });
            expect(el.textContent).toContain('+5.0%');
            expect(el.textContent).toContain('vs last year');
            expect(el.textContent).not.toContain('original');
        });

        it('should use withTrendProvider for custom extraction', () => {
            const builder = new TrendColumnBuilder<any>('unused')
                .withTrendProvider((item) => ({
                    value: item.change,
                    period: 'vs target',
                }));
            const el = builder.render({ change: -2.5 });
            expect(el.className).toContain('trend-down');
            expect(el.textContent).toContain('-2.5%');
            expect(el.textContent).toContain('vs target');
        });

        it('should apply withPeriod when used with withTrendProvider', () => {
            const builder = new TrendColumnBuilder<any>('unused')
                .withTrendProvider((item) => ({ value: item.change, period: 'original' }))
                .withPeriod('vs last year');
            const el = builder.render({ change: 3.3 });
            expect(el.textContent).toContain('+3.3%');
            expect(el.textContent).toContain('vs last year');
            expect(el.textContent).not.toContain('original');
        });

        it('should return empty span when withTrendProvider returns null', () => {
            const builder = new TrendColumnBuilder<any>('field')
                .withTrendProvider(() => null as any);
            const el = builder.render({});
            expect(el).toBeInstanceOf(HTMLSpanElement);
            expect(el.childNodes.length).toBe(0);
        });

        it('should render value with empty period when period is missing', () => {
            const builder = new TrendColumnBuilder<any>('trend');
            const el = builder.render({
                trend: { value: 5.0, period: '' } as Trend,
            });
            expect(el.textContent).toContain('+5.0%');
        });

        it('should format large values with toFixed(1)', () => {
            const builder = new TrendColumnBuilder<any>('trend');
            const el = builder.render({
                trend: { value: 1024.567, period: 'vs last month' } as Trend,
            });
            expect(el.textContent).toContain('+1024.6%');
        });
    });

    describe('build', () => {
        it('should create a column with type TREND', () => {
            const builder = new TrendColumnBuilder<any>('trend');
            const column = builder.build();
            expect(column.type).toBe('TREND');
        });

        it('should have right alignment by default', () => {
            const builder = new TrendColumnBuilder<any>('trend');
            const column = builder.build();
            expect(column.align).toBe('right');
        });

        it('should allow overriding alignment', () => {
            const builder = new TrendColumnBuilder<any>('trend').withAlign('left');
            const column = builder.build();
            expect(column.align).toBe('left');
        });

        it('should set sortValue to trend.value', () => {
            const builder = new TrendColumnBuilder<any>('trend');
            const column = builder.build();
            expect(column.sortValue).toBeDefined();
            const sorted = column.sortValue!({
                trend: { value: 14.2, period: 'vs last month' } as Trend,
            });
            expect(sorted).toBe(14.2);
        });

        it('should return 0 sortValue for null trend', () => {
            const builder = new TrendColumnBuilder<any>('trend');
            const column = builder.build();
            const sorted = column.sortValue!({});
            expect(sorted).toBe(0);
        });

        it('should preserve user-set sortValue override', () => {
            const customSort = (item: any) => item.custom;
            const builder = new TrendColumnBuilder<any>('trend')
                .withSortValue(customSort);
            const column = builder.build();
            expect(column.sortValue).toBe(customSort);
        });

        it('should not set editable flag when asEditable is no-op', () => {
            const builder = new TrendColumnBuilder<any>('trend').asEditable();
            const column = builder.build();
            expect(column.editable).toBe(false);
            expect(column.renderEditor).toBeUndefined();
        });
    });

    describe('alignment', () => {
        it('should be right-aligned by default', () => {
            const builder = new TrendColumnBuilder<any>('value');
            const column = builder.build();
            expect(column.align).toBe('right');
        });

        it('should allow overriding alignment with withAlign("left")', () => {
            const builder = new TrendColumnBuilder<any>('value').withAlign('left');
            const column = builder.build();
            expect(column.align).toBe('left');
        });

        it('should allow overriding alignment with withAlign("center")', () => {
            const builder = new TrendColumnBuilder<any>('value').withAlign('center');
            const column = builder.build();
            expect(column.align).toBe('center');
        });
    });
});
