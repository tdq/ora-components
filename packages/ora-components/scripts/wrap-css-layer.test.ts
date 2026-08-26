import { readFileSync } from 'fs';
import { join } from 'path';

import {
    composeStylesheet,
    assertNoImportOrCharset,
    assertLayeredComposition,
    COMPONENT_SHEET_SENTINELS,
} from './wrap-css-layer.mjs';

describe('composeStylesheet', () => {
    it('puts base first, unlayered, then wraps the layered bundle', () => {
        expect(composeStylesheet('.base{a:b}', '.comp{c:d}')).toBe(
            '.base{a:b}@layer ora-components{.comp{c:d}}',
        );
    });

    it('uses a custom layer name', () => {
        expect(composeStylesheet('.base{a:b}', '.comp{c:d}', 'ui')).toBe(
            '.base{a:b}@layer ui{.comp{c:d}}',
        );
    });

    it('is a plain concatenation — no parsing, no double-wrap guard', () => {
        const once = composeStylesheet('.base{a:b}', '.comp{c:d}');
        // Composing again from the same two source bundles reproduces the same
        // output; idempotency comes from always regenerating from source, not
        // from detecting an existing wrapper.
        expect(composeStylesheet('.base{a:b}', '.comp{c:d}')).toBe(once);
    });

    it('handles empty inputs without special-casing', () => {
        expect(composeStylesheet('', '')).toBe('@layer ora-components{}');
        expect(composeStylesheet('.base{a:b}', '')).toBe('.base{a:b}@layer ora-components{}');
    });
});

describe('assertNoImportOrCharset', () => {
    it('does not throw for a self-contained bundle', () => {
        expect(() => assertNoImportOrCharset('.a{b:c}', 'layered.css')).not.toThrow();
    });

    it('throws when an @import survived', () => {
        expect(() => assertNoImportOrCharset('@import "x.css";.a{b:c}', 'layered.css')).toThrow(
            /layered\.css/,
        );
    });

    it('throws when an @charset survived', () => {
        expect(() => assertNoImportOrCharset('@charset "UTF-8";.a{b:c}', 'layered.css')).toThrow(
            /layered\.css/,
        );
    });

    it('throws when @import follows a prior statement', () => {
        expect(() => assertNoImportOrCharset('.a{b:c}@import "y.css";', 'layered.css')).toThrow(
            /layered\.css/,
        );
    });

    it('does not false-alarm on a declaration value that merely contains the text "@import"', () => {
        expect(() => assertNoImportOrCharset('.a{content:"@import"}', 'layered.css')).not.toThrow();
    });
});

describe('assertLayeredComposition', () => {
    // A realistic composed bundle: unlayered :root prefix, single layer holding
    // Preflight, the shadow utility, and one sentinel selector per @import'd
    // component sheet (fx-ticker, money-kpi-card, trend, sidebar, chat).
    const validComposition =
        ':root{--md-sys-color-primary:#0F52BA}' +
        '@layer ora-components{' +
        '*,::before,::after{--tw-shadow:0 0 #0000}' +
        '.shadow-level-2{box-shadow:var(--tw-shadow)}' +
        '.fx-delta-up{color:green}' +
        '.mkp-flash-down{color:red}' +
        '.trend-up{color:green}' +
        '.ora-sidebar--expanded{width:220px}' +
        '.ora-chat-panel--closed{display:none}' +
        '}';

    it('passes for a fully-populated, correctly ordered composition', () => {
        expect(() => assertLayeredComposition(validComposition)).not.toThrow();
    });

    it('throws when the layer marker is missing or duplicated', () => {
        expect(() => assertLayeredComposition('.a{b:c}')).toThrow(/exactly one/);
        expect(() =>
            assertLayeredComposition('@layer ora-components{.a{b:c}}@layer ora-components{.d{e:f}}'),
        ).toThrow(/exactly one/);
    });

    it('throws when a Preflight reset rule leaks into the unlayered prefix', () => {
        const regressed = validComposition.replace(
            '@layer ora-components{*,::before,::after',
            '*,:after,:before{--tw-shadow:0 0 #0000}}@layer ora-components{a',
        );
        expect(() => assertLayeredComposition(regressed)).toThrow(/Preflight/);
    });

    it('throws when --tw-shadow default or .shadow-level-2 is missing from the layer', () => {
        expect(() =>
            assertLayeredComposition('.a{b:c}@layer ora-components{.shadow-level-2{box-shadow:none}}'),
        ).toThrow(/--tw-shadow:0 0 #0000/);
        expect(() =>
            assertLayeredComposition('.a{b:c}@layer ora-components{--tw-shadow:0 0 #0000;}'),
        ).toThrow(/\.shadow-level-2/);
    });

    it('throws when a component sheet sentinel is missing from the layer (dropped @import)', () => {
        // fx-ticker's sentinel absent — simulates postcss-import silently
        // dropping an @import that no longer precedes every other statement.
        const missingFxTicker = validComposition.replace('.fx-delta-up{color:green}', '');
        expect(() => assertLayeredComposition(missingFxTicker)).toThrow(/fx-delta-up/);

        const missingMoneyKpiCard = validComposition.replace('.mkp-flash-down{color:red}', '');
        expect(() => assertLayeredComposition(missingMoneyKpiCard)).toThrow(/mkp-flash-down/);

        const missingTrend = validComposition.replace('.trend-up{color:green}', '');
        expect(() => assertLayeredComposition(missingTrend)).toThrow(/trend-up/);
    });

    it('rejects a sentinel that only appears in the unlayered prefix, even if the text ' +
        'also happens to precede the layer', () => {
        // fx-ticker's sentinel duplicated ahead of the layer but removed from
        // inside it: indexOf finds the unlayered copy first, which must still
        // fail the "inside the layer" check (pos < layerStart).
        const layerCopyDropped =
            '.fx-delta-up{color:green}' + validComposition.replace('.fx-delta-up{color:green}', '');
        expect(() => assertLayeredComposition(layerCopyDropped)).toThrow(/fx-delta-up/);
    });
});

describe('COMPONENT_SHEET_SENTINELS vs src/index-layered.css', () => {
    const layeredEntry = readFileSync(join(__dirname, '../src/index-layered.css'), 'utf8');
    // Comments are the only thing allowed to precede an @import, so strip them
    // before reasoning about statement order.
    const withoutComments = layeredEntry.replace(/\/\*[\s\S]*?\*\//g, '');
    const importLines = withoutComments
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('@import'));

    it('has exactly one sentinel per @import\'ed component stylesheet', () => {
        // Adding an @import without a matching sentinel would let a silently
        // dropped import ship unnoticed; this keeps the two lists in lockstep.
        expect(importLines.length).toBeGreaterThan(0);
        expect(COMPONENT_SHEET_SENTINELS).toHaveLength(importLines.length);
    });

    it('keeps every @import ahead of the first non-@import statement', () => {
        // postcss-import silently DROPS an @import that follows another
        // statement — no error, just missing component CSS in dist.
        const statements = withoutComments
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
        const lastImport = statements.map((s) => s.startsWith('@import')).lastIndexOf(true);
        const firstOther = statements.findIndex((s) => !s.startsWith('@import'));
        expect(firstOther).toBeGreaterThan(lastImport);
    });
});
