import { ComponentBuilder, LabelBuilder, registerDestroy } from '@tdq/ora-components';
import { Observable, combineLatest, of, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Legacy hex → token-class mapping. Kept so existing call sites that pass a
 * raw hex (e.g. '#6750A4') still resolve to the theme-aware Tailwind class.
 * Prefer `withValueColorClass('kpi-accent')` in new code.
 */
const HEX_TO_COLOR_NAME: Record<string, string> = {
    '#6750A4': 'kpi-accent',
    '#625B71': 'kpi-muted',
    '#7D5260': 'kpi-rose',
    '#0EA5E9': 'kpi-sky',
    '#10B981': 'kpi-green',
    '#F59E0B': 'kpi-amber',
    '#EC4899': 'kpi-pink',
    '#EF4444': 'kpi-red',
};

export class KPICardBuilder implements ComponentBuilder {
    private label$?: Observable<string>;
    private value$?: Observable<string>;
    private valueColor$?: Observable<string>;
    private valueColorClass$?: Observable<string>;
    private trend$?: Observable<string>;
    private isPositive$?: Observable<boolean>;
    private footerBuilder?: ComponentBuilder;
    private minimal = false;
    private glass = false;
    private panelClass$?: Observable<string>;

    withLabel(label: Observable<string>): this {
        this.label$ = label;
        return this;
    }

    withValue(value: Observable<string>): this {
        this.value$ = value;
        return this;
    }

    withValueColor(color: Observable<string>): this {
        this.valueColor$ = color;
        return this;
    }

    /** Set the value's text color via a Tailwind token class (e.g. 'kpi-accent', 'kpi-green'). */
    withValueColorClass(colorClass: Observable<string>): this {
        this.valueColorClass$ = colorClass;
        return this;
    }

    withTrend(trend: Observable<string>, isPositive: Observable<boolean>): this {
        this.trend$ = trend;
        this.isPositive$ = isPositive;
        return this;
    }

    withFooter(footer: ComponentBuilder): this {
        this.footerBuilder = footer;
        return this;
    }

    asGlass(): this {
        this.glass = true;
        return this;
    }

    withPanelClass(className: Observable<string>): this {
        this.panelClass$ = className;
        return this;
    }

    asMinimal(): this {
        this.minimal = true;
        return this;
    }

    build(): HTMLElement {
        const sub = new Subscription();

        // ---- Container ----
        let baseClass: string;
        if (this.glass) {
            baseClass = 'rounded-large p-px-24 border border-outline-alpha-20 shadow-level-2 relative overflow-hidden glass-effect';
        } else if (this.minimal) {
            baseClass = 'rounded-large p-px-24 bg-surface-variant-alpha-30 shadow-level-2 relative overflow-hidden';
        } else {
            baseClass = 'rounded-large p-px-24 border border-outline-alpha-20 shadow-level-2 relative overflow-hidden bg-surface-variant-alpha-30';
        }

        const body = document.createElement('div');
        body.className = baseClass;

        if (this.panelClass$) {
            sub.add(this.panelClass$.subscribe(cls => {
                body.className = `${baseClass} ${cls}`;
            }));
        }

        // ---- Header row: label (left) + trend (right) ----
        const hasLabel = !!this.label$;
        const hasTrend = !!(this.trend$ && this.isPositive$);
        if (hasLabel || hasTrend) {
            const headerRow = document.createElement('div');
            headerRow.className = 'flex items-center justify-between mb-px-12';

            if (this.label$) {
                headerRow.appendChild(
                    new LabelBuilder()
                        .withCaption(this.label$)
                        .withClass(of('text-label-medium text-on-surface-variant opacity-70 uppercase tracking-wide'))
                        .build()
                );
            }

            if (this.trend$ && this.isPositive$) {
                const trendPill = document.createElement('span');
                sub.add(combineLatest([this.trend$, this.isPositive$]).subscribe(([text, isPositive]) => {
                    const direction = isPositive ? 'up' : 'down';
                    const arrow = direction === 'up' ? '▲' : '▼';
                    trendPill.className = `inline-flex items-center gap-px-4 text-label-small font-semibold px-px-8 py-px-4 rounded-full tabular-nums trend-${direction}`;
                    trendPill.innerHTML = '';
                    const arrowSpan = document.createElement('span');
                    arrowSpan.textContent = arrow;
                    arrowSpan.setAttribute('aria-hidden', 'true');
                    trendPill.appendChild(arrowSpan);
                    trendPill.appendChild(document.createTextNode(` ${text}`));
                }));
                headerRow.appendChild(trendPill);
            }

            body.appendChild(headerRow);
        }

        // ---- Value row ----
        if (this.value$) {
            const valueRow = document.createElement('div');
            valueRow.className = 'flex items-baseline tabular-nums';

            const valueSpan = document.createElement('span');
            valueSpan.className = 'text-on-surface text-4xl font-bold leading-none';

            if (this.valueColorClass$ || this.valueColor$) {
                const colorClass$ = this.valueColorClass$
                    ? this.valueColorClass$.pipe(map(c => `text-${c} text-4xl font-bold leading-none`))
                    : this.valueColor$!.pipe(map(c => `text-${HEX_TO_COLOR_NAME[c] ?? 'on-surface'} text-4xl font-bold leading-none`));

                sub.add(colorClass$.subscribe(cls => {
                    valueSpan.className = cls;
                }));
            }

            sub.add(this.value$.subscribe(val => {
                valueSpan.textContent = val;
            }));

            valueRow.appendChild(valueSpan);
            body.appendChild(valueRow);
        }

        // ---- Footer ----
        if (this.footerBuilder) {
            const footerWrapper = document.createElement('div');
            footerWrapper.className = 'mt-px-12';
            footerWrapper.appendChild(this.footerBuilder.build());
            body.appendChild(footerWrapper);
        }

        registerDestroy(body, () => sub.unsubscribe());
        return body;
    }
}
