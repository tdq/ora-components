import { Observable } from 'rxjs';
import { map, scan, withLatestFrom } from 'rxjs/operators';
import { Money } from '../../types/money';
import { CurrencyRegistry } from '../../utils/currency-registry';

export interface MoneyKPIData {
    money: Money;
    previousMoney: Money | null;
    direction: 'up' | 'down' | 'flat';
    formatted: {
        symbol: string;
        whole: string;
        cents: string;
        full: string;
    };
}

interface ScanState {
    prev: Money | null;
    money: Money;
    precision: number;
}

const INITIAL_MONEY: Money = { amount: 0, currencyId: '' };

export class MoneyKPICardLogic {
    readonly state$: Observable<MoneyKPIData>;

    constructor(value$: Observable<Money>, precision$: Observable<number>) {
        this.state$ = value$.pipe(
            withLatestFrom(precision$),
            scan<[Money, number], ScanState>(
                (acc: ScanState, [money, precision]: [Money, number]): ScanState => ({
                    prev: acc.money,
                    money,
                    precision,
                }),
                { prev: null, money: INITIAL_MONEY, precision: 2 },
            ),
            map((state: ScanState): MoneyKPIData => {
                const { prev, money, precision } = state;

                const direction: 'up' | 'down' | 'flat' =
                    prev !== null
                        ? money.amount > prev.amount ? 'up'
                        : money.amount < prev.amount ? 'down'
                        : 'flat'
                        : 'flat';

                const abs = Math.abs(money.amount);
                const intPart = Math.floor(abs);
                const whole = intPart.toLocaleString('en-US');

                const factor = Math.pow(10, precision);
                const rounded = Math.round(abs * factor) / factor;
                const roundedInt = Math.floor(rounded);
                const centsRaw = Math.round((rounded - roundedInt) * factor);
                const cents = centsRaw.toString().padStart(precision, '0');

                return {
                    money,
                    previousMoney: prev,
                    direction,
                    formatted: {
                        symbol: CurrencyRegistry.getSymbol(money.currencyId),
                        whole,
                        cents,
                        full: CurrencyRegistry.format(money, precision),
                    },
                };
            }),
        );
    }
}
