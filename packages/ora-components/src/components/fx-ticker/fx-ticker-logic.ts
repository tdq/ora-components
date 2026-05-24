import { Observable } from 'rxjs';
import { map, scan } from 'rxjs/operators';
import { Money } from '../../types/money';

// Public — will be re-exported via index.ts later
export interface FxRate {
    pair: string;         // diff key, e.g. 'EUR/USD' or 'AAPL'
    rate: number | Money; // plain number OR Money ({ amount, currencyId })
    decimals?: number;    // formatting hint; default 4 for number, 2 for Money
}

// Internal — used by Viewport
export interface TickerItem {
    pair: string;
    rate: number | Money;  // preserved from input for formatters
    amount: number;        // normalised numeric value (Money.amount or rate)
    decimals: number;      // resolved: item.decimals ?? (Money ? 2 : 4)
    delta: number;         // amount - previousAmount; 0 on first sighting
    direction: 'up' | 'down' | 'flat';
}

interface ScanState {
    prev: Map<string, number>;
    items: TickerItem[];
}

export class FxTickerLogic {
    readonly state$: Observable<TickerItem[]>;

    constructor(data$: Observable<FxRate[]>) {
        this.state$ = data$.pipe(
            scan(({ prev }: ScanState, rates: FxRate[]): ScanState => {
                const next = new Map(prev);

                const items: TickerItem[] = rates.map((r: FxRate): TickerItem => {
                    const isMoney = typeof r.rate !== 'number';
                    const amount = isMoney ? (r.rate as Money).amount : (r.rate as number);
                    const decimals = r.decimals ?? (isMoney ? 2 : 4);
                    const previousAmount = prev.get(r.pair);
                    const delta = previousAmount !== undefined ? amount - previousAmount : 0;
                    const direction: 'up' | 'down' | 'flat' =
                        delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

                    next.set(r.pair, amount);

                    return {
                        pair: r.pair,
                        rate: r.rate,
                        amount,
                        decimals,
                        delta,
                        direction,
                    };
                });

                return { prev: next, items };
            }, { prev: new Map<string, number>(), items: [] as TickerItem[] }),
            map(({ items }: ScanState) => items),
        );
    }
}
