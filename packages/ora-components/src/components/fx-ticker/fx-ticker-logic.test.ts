import { Subject } from 'rxjs';
import { FxTickerLogic, FxRate, TickerItem } from './fx-ticker-logic';
import { Money } from '../../types/money';

// Helper: collect synchronous emissions from state$
function collect(logic: FxTickerLogic): TickerItem[][] {
    const results: TickerItem[][] = [];
    logic.state$.subscribe(items => results.push(items));
    return results;
}

describe('FxTickerLogic', () => {
    let data$: Subject<FxRate[]>;
    let logic: FxTickerLogic;

    beforeEach(() => {
        data$ = new Subject<FxRate[]>();
        logic = new FxTickerLogic(data$);
    });

    // -------------------------------------------------------------------------
    // Spec 1: FxRate with number rate → amount = rate, decimals = 4 by default
    // -------------------------------------------------------------------------
    describe('FxRate with number rate', () => {
        it('sets amount equal to the number rate', () => {
            const results = collect(logic);
            data$.next([{ pair: 'EUR/USD', rate: 1.2345 }]);
            expect(results[0][0].amount).toBe(1.2345);
        });

        it('defaults decimals to 4 when rate is a number', () => {
            const results = collect(logic);
            data$.next([{ pair: 'EUR/USD', rate: 1.2345 }]);
            expect(results[0][0].decimals).toBe(4);
        });
    });

    // -------------------------------------------------------------------------
    // Spec 2: FxRate with Money rate → amount = rate.amount, decimals = 2 by default
    // -------------------------------------------------------------------------
    describe('FxRate with Money rate', () => {
        it('sets amount equal to Money.amount', () => {
            const results = collect(logic);
            const money: Money = { amount: 99.75, currencyId: 'USD' };
            data$.next([{ pair: 'AAPL', rate: money }]);
            expect(results[0][0].amount).toBe(99.75);
        });

        it('defaults decimals to 2 when rate is Money', () => {
            const results = collect(logic);
            const money: Money = { amount: 99.75, currencyId: 'USD' };
            data$.next([{ pair: 'AAPL', rate: money }]);
            expect(results[0][0].decimals).toBe(2);
        });
    });

    // -------------------------------------------------------------------------
    // Spec 3: explicit decimals override → used regardless of rate type
    // -------------------------------------------------------------------------
    describe('explicit decimals override', () => {
        it('uses explicit decimals when rate is a number and decimals is provided', () => {
            const results = collect(logic);
            data$.next([{ pair: 'EUR/USD', rate: 1.2345, decimals: 6 }]);
            expect(results[0][0].decimals).toBe(6);
        });

        it('uses explicit decimals when rate is Money and decimals is provided', () => {
            const results = collect(logic);
            const money: Money = { amount: 99.75, currencyId: 'USD' };
            data$.next([{ pair: 'AAPL', rate: money, decimals: 3 }]);
            expect(results[0][0].decimals).toBe(3);
        });

        it('uses explicit decimals of 0 (falsy override) correctly', () => {
            const results = collect(logic);
            data$.next([{ pair: 'EUR/USD', rate: 1.5, decimals: 0 }]);
            expect(results[0][0].decimals).toBe(0);
        });
    });

    // -------------------------------------------------------------------------
    // Spec 4: First emission of a pair → delta = 0, direction = 'flat'
    // -------------------------------------------------------------------------
    describe('first emission of a pair', () => {
        it('delta is 0 on first sighting', () => {
            const results = collect(logic);
            data$.next([{ pair: 'EUR/USD', rate: 1.5 }]);
            expect(results[0][0].delta).toBe(0);
        });

        it('direction is "flat" on first sighting', () => {
            const results = collect(logic);
            data$.next([{ pair: 'EUR/USD', rate: 1.5 }]);
            expect(results[0][0].direction).toBe('flat');
        });
    });

    // -------------------------------------------------------------------------
    // Spec 5: Second emission with higher amount → delta > 0, direction = 'up'
    // -------------------------------------------------------------------------
    describe('second emission with higher amount', () => {
        it('delta is positive', () => {
            const results = collect(logic);
            data$.next([{ pair: 'EUR/USD', rate: 1.2 }]);
            data$.next([{ pair: 'EUR/USD', rate: 1.3 }]);
            expect(results[1][0].delta).toBeCloseTo(0.1, 10);
        });

        it('direction is "up"', () => {
            const results = collect(logic);
            data$.next([{ pair: 'EUR/USD', rate: 1.2 }]);
            data$.next([{ pair: 'EUR/USD', rate: 1.3 }]);
            expect(results[1][0].direction).toBe('up');
        });
    });

    // -------------------------------------------------------------------------
    // Spec 6: Second emission with lower amount → delta < 0, direction = 'down'
    // -------------------------------------------------------------------------
    describe('second emission with lower amount', () => {
        it('delta is negative', () => {
            const results = collect(logic);
            data$.next([{ pair: 'EUR/USD', rate: 1.5 }]);
            data$.next([{ pair: 'EUR/USD', rate: 1.3 }]);
            expect(results[1][0].delta).toBeCloseTo(-0.2, 10);
        });

        it('direction is "down"', () => {
            const results = collect(logic);
            data$.next([{ pair: 'EUR/USD', rate: 1.5 }]);
            data$.next([{ pair: 'EUR/USD', rate: 1.3 }]);
            expect(results[1][0].direction).toBe('down');
        });
    });

    // -------------------------------------------------------------------------
    // Spec 7: Second emission with same amount → delta = 0, direction = 'flat'
    // -------------------------------------------------------------------------
    describe('second emission with same amount', () => {
        it('delta is 0 when number rate is unchanged', () => {
            const results = collect(logic);
            data$.next([{ pair: 'EUR/USD', rate: 1.5 }]);
            data$.next([{ pair: 'EUR/USD', rate: 1.5 }]);
            expect(results[1][0].delta).toBe(0);
        });

        it('direction is "flat" when amount is unchanged', () => {
            const results = collect(logic);
            data$.next([{ pair: 'EUR/USD', rate: 1.5 }]);
            data$.next([{ pair: 'EUR/USD', rate: 1.5 }]);
            expect(results[1][0].direction).toBe('flat');
        });

        it('delta is 0 when only currency changes but amount is the same (Money)', () => {
            const results = collect(logic);
            data$.next([{ pair: 'AAPL', rate: { amount: 100, currencyId: 'USD' } }]);
            data$.next([{ pair: 'AAPL', rate: { amount: 100, currencyId: 'EUR' } }]);
            expect(results[1][0].delta).toBe(0);
            expect(results[1][0].direction).toBe('flat');
        });
    });

    // -------------------------------------------------------------------------
    // Spec 8: Pair disappears then reappears — verify actual behavior
    //
    // IMPLEMENTATION BEHAVIOR: The scan state is built with `const next = new Map(prev)`,
    // meaning all prior pairs are retained in the map even when absent from an emission.
    // A reappearing pair therefore diffs against its last-known amount (maintains history).
    // -------------------------------------------------------------------------
    describe('pair disappears then reappears', () => {
        it('maintains history — reappearing pair diffs against last known amount', () => {
            const results = collect(logic);
            // First sighting: EUR/USD = 1.2
            data$.next([{ pair: 'EUR/USD', rate: 1.2 }]);
            // Disappears
            data$.next([]);
            // Reappears at 1.5
            data$.next([{ pair: 'EUR/USD', rate: 1.5 }]);

            const reappeared = results[2][0];
            // Implementation carries forward the previous amount (1.2), so delta = 0.3 (up)
            expect(reappeared.delta).toBeCloseTo(0.3, 10);
            expect(reappeared.direction).toBe('up');
        });
    });

    // -------------------------------------------------------------------------
    // Spec 9: Reordering pairs between emissions → each diffs against own history
    // -------------------------------------------------------------------------
    describe('reordering pairs between emissions', () => {
        it('each pair diffs correctly against its own prior value after reorder', () => {
            const results = collect(logic);
            data$.next([
                { pair: 'EUR/USD', rate: 1.2 },
                { pair: 'GBP/USD', rate: 1.5 },
            ]);
            // Emit in reversed order with different values
            data$.next([
                { pair: 'GBP/USD', rate: 1.4 },
                { pair: 'EUR/USD', rate: 1.3 },
            ]);

            const emission = results[1];
            const gbp = emission.find(i => i.pair === 'GBP/USD')!;
            const eur = emission.find(i => i.pair === 'EUR/USD')!;

            expect(gbp.delta).toBeCloseTo(-0.1, 10);
            expect(gbp.direction).toBe('down');

            expect(eur.delta).toBeCloseTo(0.1, 10);
            expect(eur.direction).toBe('up');
        });
    });

    // -------------------------------------------------------------------------
    // Spec 10: Mixed number and Money in same emission
    // -------------------------------------------------------------------------
    describe('mixed number and Money in same emission', () => {
        it('processes both number and Money rates correctly in one emission', () => {
            const results = collect(logic);
            data$.next([
                { pair: 'EUR/USD', rate: 1.2345 },
                { pair: 'AAPL', rate: { amount: 150.5, currencyId: 'USD' } },
            ]);

            const emission = results[0];
            const eur = emission.find(i => i.pair === 'EUR/USD')!;
            const aapl = emission.find(i => i.pair === 'AAPL')!;

            expect(eur.amount).toBe(1.2345);
            expect(eur.decimals).toBe(4);
            expect(eur.delta).toBe(0);
            expect(eur.direction).toBe('flat');

            expect(aapl.amount).toBe(150.5);
            expect(aapl.decimals).toBe(2);
            expect(aapl.delta).toBe(0);
            expect(aapl.direction).toBe('flat');
        });
    });

    // -------------------------------------------------------------------------
    // Spec 11: Empty input array → state$ emits []
    // -------------------------------------------------------------------------
    describe('empty input array', () => {
        it('emits an empty array when given an empty array', () => {
            const results = collect(logic);
            data$.next([]);
            expect(results[0]).toEqual([]);
        });

        it('emits an empty array after a non-empty emission', () => {
            const results = collect(logic);
            data$.next([{ pair: 'EUR/USD', rate: 1.5 }]);
            data$.next([]);
            expect(results[1]).toEqual([]);
        });
    });

    // -------------------------------------------------------------------------
    // Spec 12: rate is preserved unchanged on the emitted TickerItem
    // -------------------------------------------------------------------------
    describe('rate preserved on TickerItem', () => {
        it('preserves the original number rate reference on TickerItem', () => {
            const results = collect(logic);
            data$.next([{ pair: 'EUR/USD', rate: 1.2345 }]);
            expect(results[0][0].rate).toBe(1.2345);
        });

        it('preserves the original Money rate object reference on TickerItem', () => {
            const results = collect(logic);
            const money: Money = { amount: 99.75, currencyId: 'USD' };
            data$.next([{ pair: 'AAPL', rate: money }]);
            expect(results[0][0].rate).toBe(money);
        });
    });

    // -------------------------------------------------------------------------
    // Additional: pair field preserved correctly
    // -------------------------------------------------------------------------
    describe('pair field', () => {
        it('preserves the pair string on the emitted TickerItem', () => {
            const results = collect(logic);
            data$.next([{ pair: 'GBP/JPY', rate: 180.5 }]);
            expect(results[0][0].pair).toBe('GBP/JPY');
        });
    });
});
