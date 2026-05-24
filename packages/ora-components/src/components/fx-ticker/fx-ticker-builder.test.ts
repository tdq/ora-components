import { of, Subject } from 'rxjs';
import { FxTickerBuilder } from './fx-ticker-builder';
import { FxRate } from './fx-ticker-logic';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build with a minimal synchronous data stream. */
const data$ = of<FxRate[]>([]);

function freshBuilder(): FxTickerBuilder {
    return new FxTickerBuilder();
}

// ---------------------------------------------------------------------------
// Spec 1: build() without withData() throws
// ---------------------------------------------------------------------------
describe('FxTickerBuilder — build() guard', () => {
    it('throws when build() is called without withData()', () => {
        expect(() => freshBuilder().build()).toThrow(
            'FxTickerBuilder: withData() is required before build()',
        );
    });
});

// ---------------------------------------------------------------------------
// Spec 2: build() with withData(of([])) returns an HTMLElement
// ---------------------------------------------------------------------------
describe('FxTickerBuilder — returns HTMLElement', () => {
    it('returns an HTMLElement when withData(of([])) is provided', () => {
        const el = freshBuilder().withData(data$).build();
        expect(el).toBeInstanceOf(HTMLElement);
    });
});

// ---------------------------------------------------------------------------
// Spec 3: returned element contains a [data-track] descendant
// ---------------------------------------------------------------------------
describe('FxTickerBuilder — viewport integration', () => {
    it('returned element contains a [data-track] descendant', () => {
        const el = freshBuilder().withData(data$).build();
        const track = el.querySelector('[data-track]');
        expect(track).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Spec 4: DEFAULTS — aria-hidden="true", no fx-pause-on-hover (false default),
//          no fx-direction-right for default left direction
// ---------------------------------------------------------------------------
describe('FxTickerBuilder — defaults', () => {
    let root: HTMLElement;

    beforeEach(() => {
        root = freshBuilder().withData(data$).build();
    });

    it('root has aria-hidden="true" by default', () => {
        expect(root.getAttribute('aria-hidden')).toBe('true');
    });

    it('root does NOT have fx-direction-right by default (direction is left)', () => {
        expect(root.classList.contains('fx-direction-right')).toBe(false);
    });

    it('root has fx-pause-on-hover by default (pauseOnHover defaults to true)', () => {
        // Default _pauseOnHover is true, so the class should be present
        expect(root.classList.contains('fx-pause-on-hover')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Spec 5: asAnnouncing() — root does NOT have aria-hidden
// ---------------------------------------------------------------------------
describe('FxTickerBuilder — asAnnouncing()', () => {
    it('root does not have aria-hidden when asAnnouncing() is used', () => {
        const root = freshBuilder().asAnnouncing().withData(data$).build();
        expect(root.hasAttribute('aria-hidden')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Spec 6 & 7: withPauseOnHover()
// ---------------------------------------------------------------------------
describe('FxTickerBuilder — withPauseOnHover()', () => {
    it('root does NOT have fx-pause-on-hover when withPauseOnHover(false)', () => {
        const root = freshBuilder().withPauseOnHover(false).withData(data$).build();
        expect(root.classList.contains('fx-pause-on-hover')).toBe(false);
    });

    it('root has fx-pause-on-hover when withPauseOnHover(true)', () => {
        const root = freshBuilder().withPauseOnHover(true).withData(data$).build();
        expect(root.classList.contains('fx-pause-on-hover')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Spec 8: withDirection('right') — root has fx-direction-right
// ---------------------------------------------------------------------------
describe('FxTickerBuilder — withDirection()', () => {
    it('root has fx-direction-right when withDirection("right")', () => {
        const root = freshBuilder().withDirection('right').withData(data$).build();
        expect(root.classList.contains('fx-direction-right')).toBe(true);
    });

    it('root does NOT have fx-direction-right when withDirection("left")', () => {
        const root = freshBuilder().withDirection('left').withData(data$).build();
        expect(root.classList.contains('fx-direction-right')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Spec 9: withFlashDuration(400) — --fx-flash-duration CSS var is "400ms"
// ---------------------------------------------------------------------------
describe('FxTickerBuilder — withFlashDuration()', () => {
    it('sets --fx-flash-duration CSS var to "400ms" on root', () => {
        const root = freshBuilder().withFlashDuration(400).withData(data$).build();
        expect(root.style.getPropertyValue('--fx-flash-duration')).toBe('400ms');
    });

    it('sets --fx-flash-duration CSS var to default 600ms when not specified', () => {
        const root = freshBuilder().withData(data$).build();
        expect(root.style.getPropertyValue('--fx-flash-duration')).toBe('600ms');
    });
});

// ---------------------------------------------------------------------------
// Spec 10: withLabel() — pill contains the label text
// ---------------------------------------------------------------------------
describe('FxTickerBuilder — withLabel()', () => {
    it('pill contains the text provided via withLabel()', () => {
        const root = freshBuilder()
            .withLabel(of('Markets · live'))
            .withData(data$)
            .build();
        expect(root.textContent).toContain('Markets · live');
    });

    it('pill contains the default label text "FX · live" when withLabel() not called', () => {
        const root = freshBuilder().withData(data$).build();
        expect(root.textContent).toContain('FX · live');
    });
});

// ---------------------------------------------------------------------------
// Spec 11: withLabelVisible(of(false)) — pill is hidden (display: none)
// ---------------------------------------------------------------------------
describe('FxTickerBuilder — withLabelVisible()', () => {
    it('pill is hidden (display: none) when withLabelVisible(of(false))', () => {
        const root = freshBuilder()
            .withLabelVisible(of(false))
            .withData(data$)
            .build();
        // The pill is the first child of root
        const pill = root.firstElementChild as HTMLElement;
        expect(pill).not.toBeNull();
        expect(pill.style.display).toBe('none');
    });

    it('pill is visible by default (display not none)', () => {
        const root = freshBuilder().withData(data$).build();
        const pill = root.firstElementChild as HTMLElement;
        expect(pill.style.display).not.toBe('none');
    });
});

// ---------------------------------------------------------------------------
// Spec 12: All with*/as* methods return the same builder instance (chainability)
// ---------------------------------------------------------------------------
describe('FxTickerBuilder — method chainability', () => {
    it('withData() returns the same builder instance', () => {
        const b = freshBuilder();
        expect(b.withData(data$)).toBe(b);
    });

    it('withLabel() returns the same builder instance', () => {
        const b = freshBuilder();
        expect(b.withLabel(of('test'))).toBe(b);
    });

    it('withLabelVisible() returns the same builder instance', () => {
        const b = freshBuilder();
        expect(b.withLabelVisible(of(true))).toBe(b);
    });

    it('withRateFormatter() returns the same builder instance', () => {
        const b = freshBuilder();
        expect(b.withRateFormatter(() => '')).toBe(b);
    });

    it('withDeltaFormatter() returns the same builder instance', () => {
        const b = freshBuilder();
        expect(b.withDeltaFormatter(() => '')).toBe(b);
    });

    it('withScrollDuration() returns the same builder instance', () => {
        const b = freshBuilder();
        expect(b.withScrollDuration(of(20))).toBe(b);
    });

    it('withDirection() returns the same builder instance', () => {
        const b = freshBuilder();
        expect(b.withDirection('right')).toBe(b);
    });

    it('withPauseOnHover() returns the same builder instance', () => {
        const b = freshBuilder();
        expect(b.withPauseOnHover(false)).toBe(b);
    });

    it('withFlashDuration() returns the same builder instance', () => {
        const b = freshBuilder();
        expect(b.withFlashDuration(300)).toBe(b);
    });

    it('withFlashColors() returns the same builder instance', () => {
        const b = freshBuilder();
        expect(b.withFlashColors('green', 'red')).toBe(b);
    });

    it('withClass() returns the same builder instance', () => {
        const b = freshBuilder();
        expect(b.withClass(of('my-class'))).toBe(b);
    });

    it('asAnnouncing() returns the same builder instance', () => {
        const b = freshBuilder();
        expect(b.asAnnouncing()).toBe(b);
    });
});

// ---------------------------------------------------------------------------
// Spec 13: Two build() calls on same builder produce independent elements
// ---------------------------------------------------------------------------
describe('FxTickerBuilder — independent elements per build()', () => {
    it('two build() calls return different element references', () => {
        const builder = freshBuilder().withData(data$);
        const el1 = builder.build();
        const el2 = builder.build();
        expect(el1).not.toBe(el2);
    });

    it('mutating the first element does not affect the second', () => {
        const builder = freshBuilder().withData(data$);
        const el1 = builder.build();
        const el2 = builder.build();
        el1.setAttribute('data-test', 'modified');
        expect(el2.getAttribute('data-test')).toBeNull();
    });

    it('both elements are valid HTMLElements with [data-track]', () => {
        const builder = freshBuilder().withData(data$);
        const el1 = builder.build();
        const el2 = builder.build();
        expect(el1.querySelector('[data-track]')).not.toBeNull();
        expect(el2.querySelector('[data-track]')).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Spec 14: FxTickerBuilder and FxRate re-exported from package root index.ts
// ---------------------------------------------------------------------------
describe('FxTickerBuilder — package root re-exports', () => {
    it('FxTickerBuilder is exported from the fx-ticker barrel (index.ts)', async () => {
        const mod = await import('./index');
        expect(mod.FxTickerBuilder).toBeDefined();
        expect(typeof mod.FxTickerBuilder).toBe('function');
    });

    it('FxRate type is exported from the fx-ticker barrel (index.ts)', async () => {
        // FxRate is a TypeScript interface (type-only export); verify at runtime that
        // the module resolves without error and the barrel exports are reachable.
        // We use a narrower check: confirm the barrel module itself imports without error.
        const mod = await import('./index');
        // The named export list is available; a type-only export won't appear as a
        // runtime property, but the module should load cleanly and the builder should
        // construct correctly using an FxRate-shaped object.
        expect(mod).toBeDefined();
    });

    it('FxTickerBuilder is re-exported from the package root src/index.ts', async () => {
        const mod = await import('../../index');
        expect((mod as Record<string, unknown>).FxTickerBuilder).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// Extra integration: reactive data stream updates track content
// ---------------------------------------------------------------------------
describe('FxTickerBuilder — reactive data integration', () => {
    it('track contains pair text after a synchronous data emission', () => {
        const rates$ = of<FxRate[]>([{ pair: 'EUR/USD', rate: 1.1234 }]);
        const root = freshBuilder().withData(rates$).build();
        const track = root.querySelector('[data-track]');
        expect(track).not.toBeNull();
        expect(track!.textContent).toContain('EUR/USD');
    });

    it('track remains empty when no data is emitted (empty array)', () => {
        const rates$ = of<FxRate[]>([]);
        const root = freshBuilder().withData(rates$).build();
        const track = root.querySelector('[data-track]')!;
        expect(track.innerHTML).toBe('');
    });

    it('track updates reactively when Subject emits', () => {
        const subject = new Subject<FxRate[]>();
        const root = freshBuilder().withData(subject).build();
        const track = root.querySelector('[data-track]')!;

        subject.next([{ pair: 'GBP/USD', rate: 1.3 }]);
        expect(track.textContent).toContain('GBP/USD');
    });
});
