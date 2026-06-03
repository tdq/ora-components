import {
    PanelBuilder,
    FxTickerBuilder,
    FxRate,
    MoneyKPICardBuilder
} from '@tdq/ora-components';
import { BehaviorSubject, interval, of, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { isMobileViewport } from '../../utils/viewport';
import { buildArAgingTile } from './ar-aging-tile';
import { buildCashflowChart } from './cashflow-chart';
import { buildJournalEntries } from './journal-entries';

function randAround(base: number, jitter: number): number {
    return base + (Math.random() - 0.5) * jitter;
}

export interface DashboardDemoResult {
    desktopElement?: HTMLElement;
    mobileElement?: HTMLElement;
}

export function createDashboardDemo(sub: Subscription): DashboardDemoResult {
    const cash$ = new BehaviorSubject<number>(2481902.14);
    sub.add(interval(2000).subscribe(() => {
        const cur = cash$.value;
        cash$.next(Math.round(randAround(cur, 380) * 100) / 100);
    }));

    const cashMoney$ = cash$.pipe(map(amount => ({ amount, currencyId: 'EUR' })));
    const cashKpi = new MoneyKPICardBuilder()
        .withValue(cashMoney$)
        .withLabel(of('Cash on Hand'))
        .withTrend(of({ value: 0.4, period: 'today' }))
        .withDescription(of('live · reconciled to the cent'))
        .asGlass()
        .build();

    if (isMobileViewport()) {
        return {
            mobileElement: cashKpi
        };
    }

    const fxRates$ = new BehaviorSubject<FxRate[]>([
        { pair: 'EUR/USD', rate: 1.0843 },
        { pair: 'EUR/GBP', rate: 0.8521 },
        { pair: 'EUR/JPY', rate: 168.42, decimals: 2 },
        { pair: 'EUR/CHF', rate: 0.9612 },
        { pair: 'EUR/CAD', rate: 1.4855 },
        { pair: 'EUR/AUD', rate: 1.6431 },
    ]);
    sub.add(interval(1500).subscribe(() => {
        const updated = fxRates$.value.map(r => {
            if (Math.random() < 0.55) {
                const jitter = (r.rate as number) > 10 ? 0.18 : 0.0018;
                const newRate = Math.round(randAround(r.rate as number, jitter) * 10000) / 10000;
                return { ...r, rate: newRate };
            }
            return r;
        });
        fxRates$.next(updated);
    }));

    const stack = document.createElement('div');
    stack.className = 'relative space-y-4 min-w-0';

    // 1. FX ticker (top)
    stack.appendChild(
        new PanelBuilder().asGlass().withContent(
            new FxTickerBuilder().withData(fxRates$)
        ).build()
    );

    // 2. Cashflow chart (left) + KPI stack (right)
    const middleRow = document.createElement('div');
    middleRow.className = 'hero-middle-row';
    stack.appendChild(middleRow);

    middleRow.appendChild(buildCashflowChart());

    const kpiStack = document.createElement('div');
    kpiStack.className = 'hero-kpi-stack';
    kpiStack.appendChild(cashKpi);
    kpiStack.appendChild(buildArAgingTile());
    middleRow.appendChild(kpiStack);

    // 3. Journal entries — live grid (full width)
    stack.appendChild(buildJournalEntries(sub));

    return {
        desktopElement: stack,
        mobileElement: cashKpi
    };
}
