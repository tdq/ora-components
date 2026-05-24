import { Observable, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { FxRate, FxTickerLogic, TickerItem } from './fx-ticker-logic';
import { FxTickerViewport } from './fx-ticker-viewport';

const DEFAULTS = {
    label: 'FX · live',
    scrollDuration: 28,
    flashDuration: 600,
    flashUpClass: 'fx-flash-up',
    flashDownClass: 'fx-flash-down',
    direction: 'left' as const,
};

export class FxTickerBuilder implements ComponentBuilder {
    private _data$?: Observable<FxRate[]>;
    private _label$?: Observable<string>;
    private _labelVisible$?: Observable<boolean>;
    private _rateFormatter?: (item: TickerItem) => string;
    private _deltaFormatter?: (item: TickerItem) => string;
    private _scrollDuration$?: Observable<number>;
    private _direction?: 'left' | 'right';
    private _pauseOnHover: boolean = true;
    private _flashDuration?: number;
    private _flashUpClass?: string;
    private _flashDownClass?: string;
    private _extraClass$?: Observable<string>;
    private _announcing: boolean = false;

    withData(data: Observable<FxRate[]>): this {
        this._data$ = data;
        return this;
    }

    withLabel(caption: Observable<string>): this {
        this._label$ = caption;
        return this;
    }

    withLabelVisible(visible: Observable<boolean>): this {
        this._labelVisible$ = visible;
        return this;
    }

    withRateFormatter(fn: (item: TickerItem) => string): this {
        this._rateFormatter = fn;
        return this;
    }

    withDeltaFormatter(fn: (item: TickerItem) => string): this {
        this._deltaFormatter = fn;
        return this;
    }

    withScrollDuration(seconds: Observable<number>): this {
        this._scrollDuration$ = seconds;
        return this;
    }

    withDirection(direction: 'left' | 'right'): this {
        this._direction = direction;
        return this;
    }

    withPauseOnHover(enabled: boolean): this {
        this._pauseOnHover = enabled;
        return this;
    }

    withFlashDuration(ms: number): this {
        this._flashDuration = ms;
        return this;
    }

    withFlashColors(up: string, down: string): this {
        this._flashUpClass = up;
        this._flashDownClass = down;
        return this;
    }

    withClass(className: Observable<string>): this {
        this._extraClass$ = className;
        return this;
    }

    asAnnouncing(): this {
        this._announcing = true;
        return this;
    }

    build(): HTMLElement {
        if (!this._data$) {
            throw new Error('FxTickerBuilder: withData() is required before build()');
        }

        const logic = new FxTickerLogic(this._data$);
        const viewport = new FxTickerViewport({
            logic,
            label$:          this._label$ ?? of(DEFAULTS.label),
            labelVisible$:   this._labelVisible$ ?? of(true),
            rateFormatter:   this._rateFormatter,
            deltaFormatter:  this._deltaFormatter,
            scrollDuration$: this._scrollDuration$ ?? of(DEFAULTS.scrollDuration),
            direction:       this._direction ?? DEFAULTS.direction,
            pauseOnHover:    this._pauseOnHover,
            flashDuration:   this._flashDuration ?? DEFAULTS.flashDuration,
            flashUpClass:    this._flashUpClass ?? DEFAULTS.flashUpClass,
            flashDownClass:  this._flashDownClass ?? DEFAULTS.flashDownClass,
            extraClass$:     this._extraClass$,
            announcing:      this._announcing,
        });

        return viewport.build();
    }
}
