import {
    MoneyKPICardBuilder,
    Money,
    Trend,
    LayoutBuilder,
    LayoutGap,
    ButtonStyle,
    registerDestroy,
} from '@tdq/ora-components';
import { BehaviorSubject, interval, of } from 'rxjs';
import {
    createGlassBackdrop,
    GLASS_GRADIENTS,
    createButton,
    createControlStrip,
    createActionLog,
} from './story-helpers';

export default {
    title: 'Components/MoneyKPICard',
    tags: ['stable', 'reactive', 'glass'],
};

const EUR_CASH: Money = { amount: 2481902.14, currencyId: 'EUR' };
const USD_REVENUE: Money = { amount: 525000, currencyId: 'USD' };
const JPY_SALES: Money = { amount: 8500000, currencyId: 'JPY' };
const GBP_BALANCE: Money = { amount: 34280.50, currencyId: 'GBP' };
const BTC_HOLDINGS: Money = { amount: 2.453, currencyId: 'BTC' };

const TREND_UP: Trend = { value: 0.4, period: 'today' };
const TREND_DOWN: Trend = { value: -1.2, period: 'MoM' };
const TREND_FLAT: Trend = { value: 0, period: 'this week' };
const TREND_BIG_UP: Trend = { value: 22.3, period: 'YoY' };

function deterministicStep(base: number, tick: number): number {
    const x = ((tick + 1) * 9301 + 49297) % 233280;
    return (x / 233280 - 0.5) * 2;
}

function jitterCash(current: Money, tick: number): Money {
    const jitter = deterministicStep(current.amount, tick) * 380;
    const newAmount = Math.round((current.amount + jitter) * 100) / 100;
    return { ...current, amount: newAmount };
}

// 1. Default
export const Default = () => {
    return new MoneyKPICardBuilder()
        .withValue(of(EUR_CASH))
        .build();
};

// 2. Styles
export const Styles = () => {
    const layout = new LayoutBuilder().asVertical().withGap(LayoutGap.LARGE);

    const configs = [
        { label: 'EUR Cash (Default Precision)', money: EUR_CASH, precision: 2, trend: TREND_UP },
        { label: 'USD Revenue (Default Precision)', money: USD_REVENUE, precision: 2, trend: TREND_BIG_UP },
        { label: 'JPY Sales (0 Decimals)', money: JPY_SALES, precision: 0, trend: TREND_FLAT },
        { label: 'GBP Balance (Default Precision)', money: GBP_BALANCE, precision: 2, trend: TREND_DOWN },
        { label: 'BTC Holdings (4 Decimals)', money: BTC_HOLDINGS, precision: 4, trend: TREND_UP },
    ];

    configs.forEach(({ label, money, precision, trend }) => {
        layout.addSlot().withContent(
            new MoneyKPICardBuilder()
                .withValue(of(money))
                .withLabel(of(label))
                .withPrecision(precision)
                .withTrend(of(trend))
        );
    });

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');
    return container;
};

// 3. States
export const States = () => {
    const layout = new LayoutBuilder().asVertical().withGap(LayoutGap.LARGE);

    const trends = [
        { label: 'Trend Up', trend: TREND_UP, money: EUR_CASH },
        { label: 'Trend Down', trend: TREND_DOWN, money: GBP_BALANCE },
        { label: 'Trend Flat', trend: TREND_FLAT, money: USD_REVENUE },
        { label: 'Trend Big Up', trend: TREND_BIG_UP, money: EUR_CASH },
    ];

    trends.forEach(({ label, trend, money }) => {
        layout.addSlot().withContent(
            new MoneyKPICardBuilder()
                .withValue(of(money))
                .withLabel(of(label))
                .withTrend(of(trend))
        );
    });

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');
    return container;
};

// 4. Interactive
export const Interactive = () => {
    const currentMoney$ = new BehaviorSubject<Money>(EUR_CASH);
    const currentTrend$ = new BehaviorSubject<Trend>(TREND_UP);
    const currentPrecision$ = new BehaviorSubject<number>(2);

    const card = new MoneyKPICardBuilder()
        .withValue(currentMoney$)
        .withLabel(of('Reactive Cash Portfolio'))
        .withTrend(currentTrend$)
        .withPrecision(currentPrecision$)
        .withDescription(of('live · interactive control panel'))
        .build();

    const { element: logElement, log } = createActionLog();

    let tick = 0;
    const intervalSub = interval(2000).subscribe(() => {
        const nextMoney = jitterCash(currentMoney$.value, tick++);
        currentMoney$.next(nextMoney);
    });

    const subMoney = currentMoney$.subscribe(money => {
        const prec = currentPrecision$.value;
        log(`Value ticked: ${money.currencyId} ${money.amount.toLocaleString(undefined, { minimumFractionDigits: prec, maximumFractionDigits: prec })}`);
    });

    const subTrend = currentTrend$.subscribe(trend => {
        log(`Trend changed to: ${trend.value > 0 ? '+' : ''}${trend.value}% (${trend.period})`);
    });

    const subPrecision = currentPrecision$.subscribe(prec => {
        log(`Precision changed to: ${prec} decimals`);
    });

    const trendControls = createControlStrip([
        createButton('▲ Up', () => {
            log('Clicked [▲ Up] button');
            currentTrend$.next(TREND_UP);
        }).build(),
        createButton('▼ Down', () => {
            log('Clicked [▼ Down] button');
            currentTrend$.next(TREND_DOWN);
        }).build(),
        createButton('● Flat', () => {
            log('Clicked [● Flat] button');
            currentTrend$.next(TREND_FLAT);
        }).build(),
    ]);

    const formatControls = createControlStrip([
        createButton('0 Decimals', () => {
            log('Clicked [0 Decimals] button');
            currentPrecision$.next(0);
        }).build(),
        createButton('2 Decimals', () => {
            log('Clicked [2 Decimals] button');
            currentPrecision$.next(2);
        }).build(),
        createButton('4 Decimals', () => {
            log('Clicked [4 Decimals] button');
            currentPrecision$.next(4);
        }).build(),
        createButton('Reset Value', () => {
            log('Clicked [Reset Value] button');
            currentMoney$.next(EUR_CASH);
            currentTrend$.next(TREND_UP);
            currentPrecision$.next(2);
            tick = 0;
        }, ButtonStyle.OUTLINED).build(),
    ]);

    const container = document.createElement('div');
    container.className = 'p-4 max-w-md flex flex-col gap-4';

    container.appendChild(card);

    const trendLabel = document.createElement('div');
    trendLabel.className = 'text-xs font-semibold uppercase tracking-wider text-on-surface-variant opacity-70 mt-2';
    trendLabel.textContent = 'Trend Controls';
    container.appendChild(trendLabel);
    container.appendChild(trendControls);

    const formatLabel = document.createElement('div');
    formatLabel.className = 'text-xs font-semibold uppercase tracking-wider text-on-surface-variant opacity-70';
    formatLabel.textContent = 'Formatting & Reset';
    container.appendChild(formatLabel);
    container.appendChild(formatControls);

    const logLabel = document.createElement('div');
    logLabel.className = 'text-xs font-semibold uppercase tracking-wider text-on-surface-variant opacity-70';
    logLabel.textContent = 'Activity Log';
    container.appendChild(logLabel);
    container.appendChild(logElement);

    registerDestroy(container, () => {
        intervalSub.unsubscribe();
        subMoney.unsubscribe();
        subTrend.unsubscribe();
        subPrecision.unsubscribe();
    });

    return container;
};

// 5. GlassEffect
export const GlassEffect = () => {
    const card = new MoneyKPICardBuilder()
        .withValue(of(EUR_CASH))
        .withLabel(of('Cash on Hand'))
        .withTrend(of(TREND_UP))
        .withDescription(of('live · reconciled to the cent'))
        .asGlass()
        .build();

    const backdrop = createGlassBackdrop(GLASS_GRADIENTS.BLUE_PURPLE, 4, 'opacity-60');
    backdrop.className += ' relative min-h-[220px] flex items-center p-8';
    backdrop.appendChild(card);
    return backdrop;
};
GlassEffect.parameters = { layout: 'fullscreen' };

// 6. WithDescription
export const WithDescription = () => {
    return new MoneyKPICardBuilder()
        .withValue(of(EUR_CASH))
        .withLabel(of('Cash on Hand'))
        .withTrend(of(TREND_UP))
        .withDescription(of('live · reconciled to the cent'))
        .build();
};
