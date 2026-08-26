import { Observable, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { Money } from '../../types/money';
import { Trend } from '../../types/trend';
import { MoneyKPICardViewport } from './money-kpi-card-viewport';
import { CurrencyDisplay } from './money-kpi-card-logic';

export type { CurrencyDisplay };

const DEFAULTS = {
    precision: 2,
    currencyDisplay: 'symbol' as CurrencyDisplay,
};

export class MoneyKPICardBuilder implements ComponentBuilder {
    private value$?: Observable<Money>;
    private label$?: Observable<string>;
    private trend$?: Observable<Trend>;
    private description$?: Observable<string>;
    private precision$: Observable<number> = of(DEFAULTS.precision);
    private locale$: Observable<string> = of('en-US');
    private currencyDisplay$: Observable<CurrencyDisplay> = of(DEFAULTS.currencyDisplay);
    private extraClass$?: Observable<string>;
    private glass = false;

    withValue(value$: Observable<Money>): this {
        this.value$ = value$;
        return this;
    }

    withLabel(label$: Observable<string>): this {
        this.label$ = label$;
        return this;
    }

    withTrend(trend$: Observable<Trend>): this {
        this.trend$ = trend$;
        return this;
    }

    withDescription(description$: Observable<string>): this {
        this.description$ = description$;
        return this;
    }

    withPrecision(precision: number | Observable<number>): this {
        this.precision$ = typeof precision === 'number' ? of(precision) : precision;
        return this;
    }

    /** BCP 47 locale used for grouping/decimal separators. Defaults to 'en-US'; opt in for another locale. */
    withLocale(locale: string | Observable<string>): this {
        this.locale$ = typeof locale === 'string' ? of(locale) : locale;
        return this;
    }

    /** 'symbol' renders `€442 000`; 'code' renders the ISO code with a space: `EUR 442 000`. */
    withCurrencyDisplay(display: CurrencyDisplay | Observable<CurrencyDisplay>): this {
        this.currencyDisplay$ = typeof display === 'string' ? of(display) : display;
        return this;
    }

    withClass(className$: Observable<string>): this {
        this.extraClass$ = className$;
        return this;
    }

    asGlass(): this {
        this.glass = true;
        return this;
    }

    build(): HTMLElement {
        if (!this.value$) {
            throw new Error('MoneyKPICardBuilder: withValue() is required before build()');
        }

        const viewport = new MoneyKPICardViewport({
            value$: this.value$,
            precision$: this.precision$,
            locale$: this.locale$,
            currencyDisplay$: this.currencyDisplay$,
            label$: this.label$,
            trend$: this.trend$,
            description$: this.description$,
            glass: this.glass,
            extraClass$: this.extraClass$,
        });

        return viewport.build();
    }
}
