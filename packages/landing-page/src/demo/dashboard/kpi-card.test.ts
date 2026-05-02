import { Subject, of } from 'rxjs';
import { KPICardBuilder } from './kpi-card';
import { ComponentBuilder } from '@tdq/ora-components';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// Factory helpers matching each demo file's call pattern
// ---------------------------------------------------------------------------

function buildOverviewCard(
    label: string,
    value: string,
    trend: string,
    positive: boolean,
    color: string,
    light: string
): HTMLElement {
    return new KPICardBuilder()
        .withLabel(of(label))
        .withValue(of(value))
        .withTrend(of(trend), of(positive))
        .withAccentColor(of(color), of(light))
        .build();
}

function buildPLCard(
    label: string,
    value: string,
    color: string,
    light: string
): HTMLElement {
    return new KPICardBuilder()
        .withLabel(of(label))
        .withValue(of(value))
        .withValueColor(of(color))
        .withAccentColor(of(color), of(light))
        .build();
}

function buildLedgerCard(
    label: string,
    value: string,
    color: string,
    light: string
): HTMLElement {
    return new KPICardBuilder()
        .withLabel(of(label))
        .withValue(of(value))
        .withAccentColor(of(color), of(light))
        .build();
}

function buildOrdersMinimalCard(label: string, value: string): HTMLElement {
    return new KPICardBuilder()
        .asMinimal()
        .withLabel(of(label))
        .withValue(of(value))
        .build();
}

function buildPayablesCard(
    label: string,
    value: string,
    color: string,
    light: string,
    footerBuilder: ComponentBuilder
): HTMLElement {
    return new KPICardBuilder()
        .withLabel(of(label))
        .withValue(of(value))
        .withAccentColor(of(color), of(light))
        .withFooter(footerBuilder)
        .build();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KPICardBuilder', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    // ---- Requirement 1: build() returns a valid HTMLElement ----

    it('build() returns an HTMLElement (div with panel classes)', () => {
        const el = new KPICardBuilder().build();
        expect(el).toBeInstanceOf(HTMLElement);
        expect(el.tagName).toBe('DIV');
        // PanelBuilder adds 'w-full', 'rounded-large', etc.
        expect(el.className).toContain('w-full');
        expect(el.className).toContain('rounded-large');
    });

    it('empty builder (no options) still produces a valid element', () => {
        const el = new KPICardBuilder().build();
        expect(el).toBeInstanceOf(HTMLElement);
        expect(el.children.length).toBeGreaterThanOrEqual(0);
    });

    // ---- Requirement 2: all demo call sites work ----

    it('integration: overview.ts pattern (label+value+trend+accentColor)', () => {
        const el = buildOverviewCard(
            'Total Revenue', '€248,592', '+14.2%', true,
            '#6750A4', 'rgba(103,80,164,0.08)'
        );
        expect(el).toBeInstanceOf(HTMLElement);
        expect(el.textContent).toContain('Total Revenue');
        expect(el.textContent).toContain('€248,592');
        expect(el.textContent).toContain('+14.2%');
    });

    it('integration: pl.ts pattern (label+value+valueColor+accentColor)', () => {
        const el = buildPLCard(
            'Total Revenue', '€25,520', '#10B981',
            'rgba(16,185,129,0.08)'
        );
        expect(el).toBeInstanceOf(HTMLElement);
        expect(el.textContent).toContain('Total Revenue');
        expect(el.textContent).toContain('€25,520');
    });

    it('integration: ledger.ts pattern (label+value+accentColor)', () => {
        const el = buildLedgerCard(
            'Total Debits', '€31,742', '#EF4444',
            'rgba(239,68,68,0.08)'
        );
        expect(el).toBeInstanceOf(HTMLElement);
        expect(el.textContent).toContain('Total Debits');
        expect(el.textContent).toContain('€31,742');
    });

    it('integration: orders.ts pattern (minimal+label+value)', () => {
        const el = buildOrdersMinimalCard('Total Orders', '30');
        expect(el).toBeInstanceOf(HTMLElement);
        expect(el.textContent).toContain('Total Orders');
        expect(el.textContent).toContain('30');
    });

    it('integration: payables.ts pattern (label+value+accentColor+footer)', () => {
        const footerBuilder: ComponentBuilder = {
            build: (): HTMLElement => {
                const div = document.createElement('div');
                div.textContent = '3 invoices';
                return div;
            }
        };
        const el = buildPayablesCard(
            'Current', '€1,476.80', '#0EA5E9',
            'rgba(14,165,233,0.08)', footerBuilder
        );
        expect(el).toBeInstanceOf(HTMLElement);
        expect(el.textContent).toContain('Current');
        expect(el.textContent).toContain('€1,476.80');
        expect(el.textContent).toContain('3 invoices');
    });

    // ---- Requirement 5: LabelBuilder.withClass merges via cn() ----

    it('label receives merged text-on-surface-variant class via cn()', () => {
        const el = new KPICardBuilder()
            .withLabel(of('Test Label'))
            .withValue(of('42'))
            .build();

        // Find the label element inside the card
        const label = el.querySelector('span');
        expect(label).not.toBeNull();
        expect(label!.className).toContain('text-on-surface-variant');
        expect(label!.className).toContain('opacity-60');
        // The base LabelBuilder classes should also be present
        expect(label!.className).toContain('transition-all');
    });

    // ---- Requirement 6: PanelBuilder.withClass correctly overrides gap ----

    it('standard mode panel has p-px-24 class (overrides default MEDIUM p-px-8)', () => {
        const el = new KPICardBuilder()
            .withLabel(of('L'))
            .withValue(of('V'))
            .build();

        // twMerge resolves p-px-8 vs p-px-24 — p-px-24 should win
        expect(el.className).toContain('p-px-24');
        expect(el.className).not.toContain('p-px-8');
    });

    it('standard mode panel has rounded-extra-large class', () => {
        const el = new KPICardBuilder()
            .withLabel(of('L'))
            .withValue(of('V'))
            .build();

        expect(el.className).toContain('rounded-extra-large');
    });

    // ---- Requirement 12: Minimal mode uses PanelGap.LARGE ----

    it('minimal mode panel uses p-px-16 (PanelGap.LARGE) not p-px-24', () => {
        const el = buildOrdersMinimalCard('Orders', '10');

        // PanelGap.LARGE = p-px-16
        expect(el.className).toContain('p-px-16');
        // The standard-mode withClass should NOT be applied
        expect(el.className).not.toContain('p-px-24');
        expect(el.className).not.toContain('rounded-extra-large');
    });

    // ---- Requirement 8: text-on-surface only when no valueColor$ ----

    it('value element has text-on-surface class when no valueColor$ is set', () => {
        const el = new KPICardBuilder()
            .withLabel(of('L'))
            .withValue(of('42'))
            .build();

        // Find the value span inside the card
        // Value span has classes: 'text-headline-medium font-bold tracking-[-0.02em]'
        const valueEl = el.querySelector('.text-headline-medium') as HTMLElement;
        expect(valueEl).not.toBeNull();
        expect(valueEl.classList.contains('text-on-surface')).toBe(true);
    });

    it('value element does NOT have text-on-surface when valueColor$ is set', () => {
        const el = buildPLCard('Revenue', '€100', '#10B981', 'rgba(16,185,129,0.08)');

        const valueEl = el.querySelector('.text-headline-medium') as HTMLElement;
        expect(valueEl).not.toBeNull();
        expect(valueEl.classList.contains('text-on-surface')).toBe(false);
    });

    it('value element applies color class from valueColor$ mapped via HEX_TO_COLOR_NAME', () => {
        const el = buildPLCard('Revenue', '€100', '#10B981', 'rgba(16,185,129,0.08)');

        const valueEl = el.querySelector('.text-headline-medium') as HTMLElement;
        expect(valueEl).not.toBeNull();
        // valueColor$ maps hex '#10B981' → 'kpi-green' → class 'text-kpi-green'
        expect(valueEl.classList.contains('text-kpi-green')).toBe(true);
        // Style is NOT set inline (LabelBuilder uses CSS classes)
        expect(valueEl.style.color).toBe('');
    });

    // ---- Requirement 9: trend chip colors & static classes (LabelBuilder refactor) ----

    it('trend chip renders with correct text, color class, background class for positive', () => {
        const el = buildOverviewCard(
            'Test', '100', '+5.2%', true,
            '#6750A4', 'rgba(103,80,164,0.08)'
        );

        const trendEl = el.querySelector('.text-label-small') as HTMLElement;
        expect(trendEl).not.toBeNull();
        expect(trendEl.textContent).toBe('+5.2%');

        // Dynamic theme classes from isPositive=true
        expect(trendEl.classList.contains('text-trend-positive')).toBe(true);
        expect(trendEl.classList.contains('bg-trend-positive-bg')).toBe(true);

        // Negative classes must NOT be present
        expect(trendEl.classList.contains('text-trend-negative')).toBe(false);
        expect(trendEl.classList.contains('bg-trend-negative-bg')).toBe(false);

        // Static classes set via class$
        expect(trendEl.classList.contains('font-semibold')).toBe(true);
        expect(trendEl.classList.contains('px-px-8')).toBe(true);
        expect(trendEl.classList.contains('py-px-4')).toBe(true);
        expect(trendEl.classList.contains('rounded-full')).toBe(true);

        // Base LabelBuilder classes
        expect(trendEl.classList.contains('transition-all')).toBe(true);

        // Style NOT set inline (LabelBuilder does not use style.xxx)
        expect(trendEl.style.color).toBe('');
    });

    it('trend chip renders with correct text, color class, background class for negative', () => {
        const el = buildOverviewCard(
            'Test', '100', '-2.1%', false,
            '#7D5260', 'rgba(125,82,96,0.08)'
        );

        const trendEl = el.querySelector('.text-label-small') as HTMLElement;
        expect(trendEl).not.toBeNull();
        expect(trendEl.textContent).toBe('-2.1%');

        // Dynamic theme classes from isPositive=false
        expect(trendEl.classList.contains('text-trend-negative')).toBe(true);
        expect(trendEl.classList.contains('bg-trend-negative-bg')).toBe(true);

        // Positive classes must NOT be present
        expect(trendEl.classList.contains('text-trend-positive')).toBe(false);
        expect(trendEl.classList.contains('bg-trend-positive-bg')).toBe(false);

        // Static classes set via class$
        expect(trendEl.classList.contains('font-semibold')).toBe(true);
        expect(trendEl.classList.contains('px-px-8')).toBe(true);
        expect(trendEl.classList.contains('py-px-4')).toBe(true);
        expect(trendEl.classList.contains('rounded-full')).toBe(true);

        // Style NOT set inline
        expect(trendEl.style.color).toBe('');
    });

    it('trend chip uses LabelBuilder (span element, no raw DOM manipulation)', () => {
        const el = buildOverviewCard(
            'Test', '100', '+1.0%', true,
            '#6750A4', 'rgba(103,80,164,0.08)'
        );

        const trendEl = el.querySelector('.text-label-small') as HTMLElement;
        expect(trendEl).not.toBeNull();
        // LabelBuilder always creates a span
        expect(trendEl.tagName).toBe('SPAN');
        // Base LabelBuilder class is present
        expect(trendEl.classList.contains('transition-all')).toBe(true);
    });

    it('reactive trend text updates propagate to DOM', () => {
        const trend$ = new Subject<string>();
        const isPositive$ = new Subject<boolean>();

        const el = new KPICardBuilder()
            .withLabel(of('L'))
            .withValue(of('100'))
            .withTrend(trend$, isPositive$)
            .build();

        document.body.appendChild(el);

        trend$.next('+5.2%');
        isPositive$.next(true);

        const trendEl = el.querySelector('.text-label-small') as HTMLElement;
        expect(trendEl).not.toBeNull();
        expect(trendEl.textContent).toBe('+5.2%');

        trend$.next('+8.7%');
        expect(trendEl.textContent).toBe('+8.7%');

        document.body.removeChild(el);
    });

    it('reactive isPositive updates toggle trend chip classes', () => {
        const trend$ = new Subject<string>();
        const isPositive$ = new Subject<boolean>();

        const el = new KPICardBuilder()
            .withLabel(of('L'))
            .withValue(of('100'))
            .withTrend(trend$, isPositive$)
            .build();

        document.body.appendChild(el);

        trend$.next('+5.2%');
        isPositive$.next(true);

        const trendEl = el.querySelector('.text-label-small') as HTMLElement;
        expect(trendEl).not.toBeNull();
        expect(trendEl.classList.contains('text-trend-positive')).toBe(true);
        expect(trendEl.classList.contains('text-trend-negative')).toBe(false);

        isPositive$.next(false);

        expect(trendEl.classList.contains('text-trend-positive')).toBe(false);
        expect(trendEl.classList.contains('text-trend-negative')).toBe(true);

        document.body.removeChild(el);
    });

    // ---- Requirement 10: footer mode order ----

    it('footer mode places value element before footer in DOM', () => {
        const footerBuilder: ComponentBuilder = {
            build: (): HTMLElement => {
                const div = document.createElement('div');
                div.className = 'footer-element';
                div.textContent = 'Footer';
                return div;
            }
        };

        const el = new KPICardBuilder()
            .withLabel(of('Label'))
            .withValue(of('Value'))
            .withFooter(footerBuilder)
            .build();

        // The vertical layout should have: label → value → footer
        const valueEl = el.querySelector('.text-headline-medium') as HTMLElement;
        const footerEl = el.querySelector('.footer-element') as HTMLElement;

        expect(valueEl).not.toBeNull();
        expect(footerEl).not.toBeNull();

        // In DOM order (depth-first), value should come before footer
        const valueIndex = Array.from(el.querySelectorAll('*')).indexOf(valueEl);
        const footerIndex = Array.from(el.querySelectorAll('*')).indexOf(footerEl);
        expect(valueIndex).toBeLessThan(footerIndex);
    });

    // ---- Requirement 7: this capture in arrow functions ----

    it('inline builders correctly capture KPICardBuilder this scope', () => {
        // If `this` were wrong, build() would throw at this.value$! or similar
        expect(() => {
            new KPICardBuilder()
                .withLabel(of('L'))
                .withValue(of('V'))
                .withTrend(of('+1%'), of(true))
                .build();
        }).not.toThrow();
    });

    // ---- Requirement 4: subscription cleanup & reactivity ----

    it('reactive label updates propagate to DOM', () => {
        const label$ = new Subject<string>();
        const el = new KPICardBuilder()
            .withLabel(label$)
            .withValue(of('value'))
            .build();

        // Attach to DOM so registerDestroy works
        document.body.appendChild(el);

        label$.next('Initial Label');
        expect(el.textContent).toContain('Initial Label');

        label$.next('Updated Label');
        expect(el.textContent).toContain('Updated Label');

        document.body.removeChild(el);
    });

    it('reactive value updates propagate to DOM', () => {
        const value$ = new Subject<string>();
        const el = new KPICardBuilder()
            .withLabel(of('L'))
            .withValue(value$)
            .build();

        document.body.appendChild(el);

        value$.next('100');
        const valueEl = el.querySelector('.text-headline-medium') as HTMLElement;
        expect(valueEl.textContent).toBe('100');

        value$.next('200');
        expect(valueEl.textContent).toBe('200');

        document.body.removeChild(el);
    });

    it('reactive value color updates propagate to DOM via class mapping', () => {
        const color$ = new Subject<string>();
        const el = new KPICardBuilder()
            .withLabel(of('L'))
            .withValue(of('42'))
            .withValueColor(color$)
            .build();

        document.body.appendChild(el);

        // '#EF4444' maps to 'kpi-red' → class 'text-kpi-red'
        color$.next('#EF4444');
        const valueEl = el.querySelector('.text-headline-medium') as HTMLElement;
        expect(valueEl.classList.contains('text-kpi-red')).toBe(true);
        expect(valueEl.classList.contains('text-kpi-green')).toBe(false);

        // '#10B981' maps to 'kpi-green' → class 'text-kpi-green'
        color$.next('#10B981');
        expect(valueEl.classList.contains('text-kpi-green')).toBe(true);
        expect(valueEl.classList.contains('text-kpi-red')).toBe(false);

        document.body.removeChild(el);
    });

    // ---- Requirement 3: registerDestroy only on HTMLElement ----

    it('all registerDestroy calls receive HTMLElement — no TypeError during build', () => {
        // Build all 5 demo patterns; TypeError would occur only if
        // registerDestroy were called with a non-HTMLElement.
        expect(() => {
            buildOverviewCard('A', '1', '+1%', true, '#000', 'rgba(0,0,0,0.1)');
            buildPLCard('A', '1', '#000', 'rgba(0,0,0,0.1)');
            buildLedgerCard('A', '1', '#000', 'rgba(0,0,0,0.1)');
            buildOrdersMinimalCard('A', '1');
            buildPayablesCard(
                'A', '1', '#000', 'rgba(0,0,0,0.1)',
                { build: () => document.createElement('div') }
            );
        }).not.toThrow();
    });
});
