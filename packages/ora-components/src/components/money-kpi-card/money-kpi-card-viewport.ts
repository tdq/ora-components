import { Observable, Subscription, of } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { CurrencyDisplay, MoneyKPICardLogic, MoneyKPIData } from './money-kpi-card-logic';
import { LabelBuilder } from '../label/label';
import { TrendBuilder } from '../trend/trend-builder';
import { createOptimizedPipeline } from '../../utils/optimized-pipeline';
import { Trend } from '../../types/trend';
import { Money } from '../../types/money';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { registerDestroy } from '@/core/destroyable-element';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface MoneyKPICardViewportConfig {
    value$: Observable<Money>;
    precision$: Observable<number>;
    locale$: Observable<string>;
    currencyDisplay$: Observable<CurrencyDisplay>;
    label$?: Observable<string>;
    trend$?: Observable<Trend>;
    description$?: Observable<string>;
    glass: boolean;
    extraClass$?: Observable<string>;
}

const BODY_BASE = 'rounded-large p-px-24 border border-outline-alpha-20 shadow-level-2 relative overflow-hidden';
const BODY_SOLID = 'bg-surface-variant-alpha-30';
const BODY_GLASS = 'glass-effect';

export class MoneyKPICardViewport {
    private readonly config: MoneyKPICardViewportConfig;

    constructor(config: MoneyKPICardViewportConfig) {
        this.config = config;
    }

    build(): HTMLElement {
        const { value$, precision$, locale$, currencyDisplay$, label$, trend$, description$, glass, extraClass$ } = this.config;

        const sub = new Subscription();

        // ---- Header row: label + trend ----
        const headerRow = document.createElement('div');
        headerRow.className = 'flex items-center justify-between mb-px-12';

        if (label$) {
            const label = new LabelBuilder()
                .withCaption(label$)
                .withClass(of('text-label-medium text-on-surface-variant uppercase tracking-wide'))
                .build();
            headerRow.appendChild(label);
        }

        if (trend$) {
            const trendChip = new TrendBuilder().withTrend(trend$).build();
            headerRow.appendChild(trendChip);
        }

        // ---- Value row: symbol + whole . cents ----
        const valueRow = document.createElement('div');
        valueRow.className = 'flex items-baseline tabular-nums';

        const signEl = document.createElement('span');
        signEl.className = 'mkp-sign text-on-surface text-4xl font-bold leading-none';

        const symbolEl = document.createElement('span');
        symbolEl.className = 'mkp-symbol text-on-surface opacity-70 text-2xl font-semibold whitespace-pre';

        const wholeEl = document.createElement('span');
        wholeEl.className = 'mkp-whole text-on-surface text-4xl font-bold leading-none';

        const sepEl = document.createElement('span');
        sepEl.className = 'mkp-sep text-on-surface opacity-70 text-2xl font-semibold';

        const centsEl = document.createElement('span');
        centsEl.className = 'mkp-cents text-on-surface text-2xl font-semibold leading-none inline-block min-w-[2ch] text-left';

        valueRow.appendChild(signEl);
        valueRow.appendChild(symbolEl);
        valueRow.appendChild(wholeEl);
        // sepEl / centsEl are attached only while precision > 0 (see state$ handler)

        // ---- Description row ----
        const descRow = document.createElement('div');
        if (description$) {
            descRow.className = 'mt-px-12 text-label-small text-on-surface-variant mkp-description';
        }

        // ---- Card body ----
        const body = document.createElement('div');
        body.className = cn(BODY_BASE, glass ? BODY_GLASS : BODY_SOLID);

        body.appendChild(headerRow);
        body.appendChild(valueRow);

        // ---- First emission paints eagerly; later updates are viewport-gated ----
        // eagerFirst delivers the first value synchronously via the pipeline's single shared
        // subscription to value$ — no duplicate subscription to a (possibly cold) source.
        const paintedValue$ = createOptimizedPipeline(body, value$, { eagerFirst: true }).pipe(
            distinctUntilChanged((a: Money, b: Money) => a.amount === b.amount && a.currencyId === b.currencyId),
        );

        const logic = new MoneyKPICardLogic(paintedValue$, precision$, locale$, currencyDisplay$);

        if (description$) {
            body.appendChild(descRow);
        }

        // ---- Subscribe to logic state$ ----
        let prevCents = '';

        sub.add(logic.state$.subscribe((data: MoneyKPIData) => {
            const { formatted, direction, precision } = data;

            signEl.textContent = formatted.sign;
            symbolEl.textContent = formatted.symbol;
            wholeEl.textContent = formatted.whole;

            if (precision > 0) {
                sepEl.textContent = formatted.decimalSeparator;
                centsEl.textContent = formatted.cents;
                if (!sepEl.isConnected) valueRow.append(sepEl, centsEl);
            } else {
                sepEl.remove();
                centsEl.remove();
            }

            if (formatted.cents !== prevCents && prevCents !== '') {
                centsEl.classList.remove('mkp-roll-digit');
                requestAnimationFrame(() => {
                    centsEl.classList.add('mkp-roll-digit');
                });
            }
            prevCents = formatted.cents;

            if (direction === 'up') {
                body.classList.remove('mkp-flash-up', 'mkp-flash-down');
                requestAnimationFrame(() => {
                    body.classList.add('mkp-flash-up');
                });
            } else if (direction === 'down') {
                body.classList.remove('mkp-flash-up', 'mkp-flash-down');
                requestAnimationFrame(() => {
                    body.classList.add('mkp-flash-down');
                });
            }
        }));

        // ---- Subscribe to description ----
        if (description$) {
            sub.add(description$.subscribe(text => {
                descRow.textContent = text;
            }));
        }

        // ---- Extra class ----
        if (extraClass$) {
            sub.add(extraClass$.subscribe(cls => {
                body.className = cn(BODY_BASE, glass ? BODY_GLASS : BODY_SOLID, cls);
            }));
        }

        registerDestroy(body, () => sub.unsubscribe());

        return body;
    }
}
