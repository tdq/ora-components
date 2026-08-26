import { Observable, combineLatest } from 'rxjs';
import { map, scan, startWith } from 'rxjs/operators';
import { Money } from '../../types/money';
import { CurrencyRegistry } from '../../utils/currency-registry';

export type CurrencyDisplay = 'symbol' | 'code';

export interface MoneyKPIData {
    money: Money;
    previousMoney: Money | null;
    direction: 'up' | 'down' | 'flat';
    precision: number;
    formatted: {
        sign: string;             // '\u2212' for negative amounts, '' otherwise
        symbol: string;           // '€' or 'EUR ' depending on currencyDisplay
        whole: string;            // '2.481.902' grouped per locale
        decimalSeparator: string; // ',' or '.' per locale
        cents: string;
        full: string;
    };
}

interface LocaleSeparators {
    group: string;
    decimal: string;
}

const separatorCache = new Map<string, LocaleSeparators>();

/** Grouping/decimal separators for a locale, resolved once via Intl.NumberFormat parts. */
function getLocaleSeparators(locale: string): LocaleSeparators {
    let seps = separatorCache.get(locale);
    if (!seps) {
        let parts: Intl.NumberFormatPart[];
        try {
            parts = new Intl.NumberFormat(locale).formatToParts(1234567.8);
        } catch {
            parts = new Intl.NumberFormat('en-US').formatToParts(1234567.8);
        }
        seps = {
            group: parts.find(p => p.type === 'group')?.value ?? ',',
            decimal: parts.find(p => p.type === 'decimal')?.value ?? '.',
        };
        separatorCache.set(locale, seps);
    }
    return seps;
}

/** Math-based grouping of a non-negative integer (no string parsing of Intl output). */
function groupInteger(intPart: number, group: string): string {
    // Number.prototype.toString switches to exponential notation at 1e21 (e.g. "1e+21").
    // toLocaleString with grouping disabled always returns plain digits, even past that
    // threshold, so grouping stays a pure regex pass over digit characters.
    const digits = intPart.toLocaleString('en-US', { useGrouping: false });
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, group);
}

interface ScanState {
    prev: Money | null;
    money: Money;
    precision: number;
    locale: string;
    display: CurrencyDisplay;
}

const INITIAL_MONEY: Money = { amount: 0, currencyId: '' };

export class MoneyKPICardLogic {
    readonly state$: Observable<MoneyKPIData>;

    constructor(
        value$: Observable<Money>,
        precision$: Observable<number>,
        locale$: Observable<string>,
        currencyDisplay$: Observable<CurrencyDisplay>,
    ) {
        // combineLatest (not withLatestFrom) so a locale/precision/currencyDisplay change
        // re-renders the last known value on its own, without waiting for a new money
        // emission. The startWith defaults keep this from blocking on a not-yet-emitted
        // Subject passed to withLocale/withCurrencyDisplay/withPrecision.
        this.state$ = combineLatest([
            value$,
            precision$.pipe(startWith(2)),
            locale$.pipe(startWith('en-US')),
            currencyDisplay$.pipe(startWith<CurrencyDisplay>('symbol')),
        ]).pipe(
            scan<[Money, number, string, CurrencyDisplay], ScanState>(
                (acc, [money, precision, locale, display]) => ({ prev: acc.money, money, precision, locale, display }),
                { prev: null, money: INITIAL_MONEY, precision: 2, locale: 'en-US', display: 'symbol' },
            ),
            map((state: ScanState): MoneyKPIData => {
                const { prev, money, precision, locale, display } = state;

                const direction: 'up' | 'down' | 'flat' =
                    prev !== null
                        ? money.amount > prev.amount ? 'up'
                        : money.amount < prev.amount ? 'down'
                        : 'flat'
                        : 'flat';

                const seps = getLocaleSeparators(locale);
                const factor = Math.pow(10, precision);
                const abs = Math.abs(money.amount);
                const rounded = Math.round(abs * factor) / factor;
                const intPart = Math.floor(rounded);
                const centsRaw = Math.round((rounded - intPart) * factor);
                const cents = precision > 0 ? centsRaw.toString().padStart(precision, '0') : '';
                const isNegative = money.amount < 0 && rounded > 0;

                return {
                    money,
                    previousMoney: prev,
                    direction,
                    precision,
                    formatted: {
                        sign: isNegative ? '\u2212' : '',
                        symbol: display === 'code'
                            ? `${money.currencyId.toUpperCase()} `
                            : CurrencyRegistry.getSymbol(money.currencyId),
                        whole: groupInteger(intPart, seps.group),
                        decimalSeparator: seps.decimal,
                        cents,
                        full: CurrencyRegistry.format(money, precision, locale),
                    },
                };
            }),
        );
    }
}
