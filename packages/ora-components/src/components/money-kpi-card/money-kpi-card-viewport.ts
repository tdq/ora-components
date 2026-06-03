import { Observable, Subscription, of } from 'rxjs';
import { MoneyKPICardLogic, MoneyKPIData } from './money-kpi-card-logic';
import { LabelBuilder } from '../label/label';
import { TrendBuilder } from '../trend/trend-builder';
import { registerDestroy } from '../../core/destroyable-element';
import { Trend } from '../../types/trend';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface MoneyKPICardViewportConfig {
    logic: MoneyKPICardLogic;
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
        const { logic, label$, trend$, description$, glass, extraClass$ } = this.config;
        const sub = new Subscription();

        // ---- Header row: label + trend ----
        const headerRow = document.createElement('div');
        headerRow.className = 'flex items-center justify-between mb-px-12';

        if (label$) {
            const label = new LabelBuilder()
                .withCaption(label$)
                .withClass(of('text-label-medium text-on-surface-variant opacity-70 uppercase tracking-wide'))
                .build();
            headerRow.appendChild(label);
        }

        if (trend$) {
            const trendChip = new TrendBuilder().withTrend(trend$).build();
            headerRow.appendChild(trendChip);
        }

        // ---- Value row: symbol + whole . cents ----
        const valueRow = document.createElement('div');
        valueRow.className = 'flex items-baseline gap-1 tabular-nums';

        const symbolEl = document.createElement('span');
        symbolEl.className = 'text-on-surface opacity-70 text-2xl font-semibold';

        const wholeEl = document.createElement('span');
        wholeEl.className = 'text-on-surface text-4xl font-bold leading-none';

        const sepEl = document.createElement('span');
        sepEl.className = 'text-on-surface opacity-70 text-2xl font-semibold';
        sepEl.textContent = '.';

        const centsEl = document.createElement('span');
        centsEl.className = 'text-on-surface text-2xl font-semibold leading-none inline-block min-w-[2ch] text-left';

        valueRow.appendChild(symbolEl);
        valueRow.appendChild(wholeEl);
        valueRow.appendChild(sepEl);
        valueRow.appendChild(centsEl);

        // ---- Description row ----
        const descRow = document.createElement('div');
        if (description$) {
            descRow.className = 'mt-px-12 text-label-small text-on-surface-variant opacity-60 mkp-description';
        }

        // ---- Card body ----
        const body = document.createElement('div');
        body.className = cn(BODY_BASE, glass ? BODY_GLASS : BODY_SOLID);

        body.appendChild(headerRow);
        body.appendChild(valueRow);

        if (description$) {
            body.appendChild(descRow);
        }

        // ---- Subscribe to logic state$ ----
        let prevCents = '';

        sub.add(logic.state$.subscribe((data: MoneyKPIData) => {
            const { formatted, direction } = data;

            symbolEl.textContent = formatted.symbol + ' ';
            wholeEl.textContent = formatted.whole;
            centsEl.textContent = formatted.cents;

            if (formatted.cents !== prevCents && prevCents !== '') {
                centsEl.classList.remove('mkp-roll-digit');
                void centsEl.offsetWidth;
                centsEl.classList.add('mkp-roll-digit');
            }
            prevCents = formatted.cents;

            if (direction === 'up') {
                body.classList.remove('mkp-flash-up', 'mkp-flash-down');
                void body.offsetWidth;
                body.classList.add('mkp-flash-up');
            } else if (direction === 'down') {
                body.classList.remove('mkp-flash-up', 'mkp-flash-down');
                void body.offsetWidth;
                body.classList.add('mkp-flash-down');
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
