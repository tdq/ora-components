import { Observable, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { Money } from '../../types/money';
import { Trend } from '../../types/trend';
import { MoneyKPICardLogic } from './money-kpi-card-logic';
import { MoneyKPICardViewport } from './money-kpi-card-viewport';

const DEFAULTS = {
    precision: 2,
};

export class MoneyKPICardBuilder implements ComponentBuilder {
    private value$?: Observable<Money>;
    private label$?: Observable<string>;
    private trend$?: Observable<Trend>;
    private description$?: Observable<string>;
    private precision$: Observable<number> = of(DEFAULTS.precision);
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

        const logic = new MoneyKPICardLogic(this.value$, this.precision$);
        const viewport = new MoneyKPICardViewport({
            logic,
            label$: this.label$,
            trend$: this.trend$,
            description$: this.description$,
            glass: this.glass,
            extraClass$: this.extraClass$,
        });

        return viewport.build();
    }
}
