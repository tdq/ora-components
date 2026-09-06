import { Subject, of } from 'rxjs';
import { TrendBuilder } from './trend-builder';
import { Trend } from '../../types/trend';

describe('TrendBuilder', () => {
    it('throws when build() is called without withTrend()', () => {
        expect(() => new TrendBuilder().build()).toThrow(
            'TrendBuilder: withTrend() is required before build()'
        );
    });

    it('renders once per trend$ emission (guards against a duplicated internal subscription)', () => {
        const trend$ = new Subject<Trend>();
        const root = new TrendBuilder().withTrend(trend$).build();

        const renderSpy = jest.spyOn(root, 'appendChild');
        trend$.next({ value: 5, period: 'MoM' });

        // Each render call clears innerHTML then appends the arrow span + 2 text nodes (3 appends).
        // A duplicated subscription would double every append.
        expect(renderSpy).toHaveBeenCalledTimes(3);
        expect(root.textContent).toBe('▲+5.0% MoM');
    });

    it('withTestId sets data-testid on the host element', () => {
        const root = new TrendBuilder().withTrend(of({ value: 1, period: 'MoM' })).withTestId('kpi-trend').build();
        expect(root.getAttribute('data-testid')).toBe('kpi-trend');
    });
});
