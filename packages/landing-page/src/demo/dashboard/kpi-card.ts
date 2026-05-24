import { ComponentBuilder, PanelBuilder, PanelGap, LabelBuilder, LayoutBuilder, LabelSize, Alignment } from '@tdq/ora-components';
import { Observable, combineLatest, of } from 'rxjs';
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
        // --- Label element using LabelBuilder ---
        let labelBuilder: LabelBuilder | undefined;
        if (this.label$) {
            labelBuilder = new LabelBuilder()
                .withCaption(this.label$)
                .withClass(of('text-on-surface-variant opacity-60'));
        }

        // --- Value element using LabelBuilder ---
        let valueBuilder: ComponentBuilder | undefined;
        if (this.value$) {
            const class$ = this.valueColorClass$
                ? this.valueColorClass$.pipe(map(c => `text-${c}`))
                : this.valueColor$
                    ? this.valueColor$.pipe(map(c => `text-${HEX_TO_COLOR_NAME[c] ?? 'on-surface'}`))
                    : of('text-on-surface');

            valueBuilder = new LabelBuilder()
                .withCaption(this.value$)
                .withSize(LabelSize.LARGE)
                .withClass(class$);
        }

        // --- Trend chip using LabelBuilder ---
        let trendBuilder: LabelBuilder | undefined;
        if (this.trend$ && this.isPositive$) {
            const class$ = combineLatest([this.trend$, this.isPositive$]).pipe(
                map(([, isPositive]) =>
                    isPositive
                        ? 'text-label-small font-semibold px-px-8 py-px-4 rounded-full text-trend-positive bg-trend-positive-bg'
                        : 'text-label-small font-semibold px-px-8 py-px-4 rounded-full text-trend-negative bg-trend-negative-bg'
                )
            );

            trendBuilder = new LabelBuilder()
                .withCaption(this.trend$)
                .withClass(class$);
        }

        // --- Compose content with LayoutBuilder ---
        const layout = new LayoutBuilder().asVertical();

        if (labelBuilder) {
            layout.addSlot().withContent(labelBuilder);
        }

        if (this.footerBuilder) {
            // Footer mode: value above (if present), footer below
            if (valueBuilder) {
                layout.addSlot().withContent(valueBuilder);
            }
            layout.addSlot().withContent(this.footerBuilder);
        } else if (trendBuilder && valueBuilder) {
            // Trend mode: value (left) + trend chip (right)
            const valueRow = new LayoutBuilder().asHorizontal();
            valueRow.addSlot().withContent(valueBuilder);
            valueRow.addSlot().withContent(trendBuilder).withAlignment(of(Alignment.RIGHT));
            layout.addSlot().withContent(valueRow);
        } else if (valueBuilder) {
            // Plain value (no trend, no footer) — standalone
            layout.addSlot().withContent(valueBuilder);
        }

        // --- Build panel as card container ---
        const panelBuilder = new PanelBuilder();

        if (this.glass) {
            panelBuilder.asGlass();
        }

        if (this.minimal) {
            panelBuilder.withGap(PanelGap.LARGE);
            if (this.panelClass$) {
                panelBuilder.withClass(this.panelClass$);
            }
        } else {
            const classes = this.panelClass$
                ? this.panelClass$.pipe(map(c => `p-px-24 rounded-extra-large ${c}`))
                : of('p-px-24 rounded-extra-large');
            panelBuilder.withClass(classes);
        }

        panelBuilder.withContent(layout);

        return panelBuilder.build();
    }
}
