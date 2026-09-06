import {
    findPreflightRange,
    stripPreflight,
    findViolations,
} from './check-css-globals.mjs';

// A minimal but realistic stand-in for the real Preflight block: license
// comment, some reset rules (including the harmless `body`/`html` ones that
// must NOT trip the guard), and the terminal `[hidden]` rule this module
// anchors on.
const PREFLIGHT =
    '/*! tailwindcss v3.4.19 | MIT License | https://tailwindcss.com*/' +
    '*,:after,:before{box-sizing:border-box}' +
    'html{line-height:1.5}' +
    'body{line-height:inherit}' +
    '[hidden]{display:none}';

function compose(unlayeredPrefix: string, layeredBody: string) {
    return `${unlayeredPrefix}@layer ora-components{${PREFLIGHT}${layeredBody}}`;
}

describe('findPreflightRange', () => {
    it('returns the [start, end) span of the Preflight block', () => {
        const layeredContent = `${PREFLIGHT}.foo{color:red}`;
        const [start, end] = findPreflightRange(layeredContent);
        expect(layeredContent.slice(start, end)).toBe(PREFLIGHT);
        expect(layeredContent.slice(end)).toBe('.foo{color:red}');
    });

    it('throws when the Tailwind license comment is missing', () => {
        expect(() => findPreflightRange('.foo{color:red}')).toThrow(/Preflight comment/);
    });

    it('throws when the terminal [hidden] rule is missing', () => {
        expect(() => findPreflightRange('/*! tailwindcss */.foo{color:red}')).toThrow(/\[hidden\]/);
    });
});

describe('stripPreflight', () => {
    it('scans the unlayered prefix too — a rule planted there is not silently dropped', () => {
        // This is exactly the regression the reviewer caught: a body{display:flex}
        // placed BEFORE the @layer marker (in the unlayered base-token prefix) is
        // worse than one inside the layer, since unlayered rules always win.
        const css = compose(':root{--x:1}body{display:flex}', '.foo{color:red}');
        const stripped = stripPreflight(css);
        expect(stripped).toContain('body{display:flex}');
    });

    it('removes exactly the Preflight block from the layered content', () => {
        const css = compose(':root{--x:1}', '.foo{color:red}');
        const stripped = stripPreflight(css);
        expect(stripped).not.toContain('tailwindcss');
        expect(stripped).not.toContain('[hidden]');
        expect(stripped).toContain(':root{--x:1}');
        expect(stripped).toContain('.foo{color:red}');
    });

    it('throws when the @layer marker is missing or duplicated', () => {
        expect(() => stripPreflight('.a{b:c}')).toThrow(/exactly one/);
        expect(() =>
            stripPreflight('@layer ora-components{.a{b:c}}@layer ora-components{.d{e:f}}'),
        ).toThrow(/exactly one/);
    });

    it('throws when the closing "}" of the @layer block is missing', () => {
        expect(() => stripPreflight('@layer ora-components{.a{b:c')).toThrow(/closing/);
    });

    it('removes no more than the Preflight block — component CSS before it is not swallowed', () => {
        // Bounds the strip span. The composed stylesheet puts the @import-ed
        // component sheets BEFORE Preflight, so a strip that starts too early
        // would silently delete them (and any violation they contain) instead
        // of scanning them. Asserting the exact delta is what fails the day
        // the span grows to cover more than Preflight itself.
        const componentCss = '.fx-delta-up{color:red}.ora-panel{padding:1rem}';
        const prefix = ':root{--x:1}';
        const css = `${prefix}@layer ora-components{${componentCss}${PREFLIGHT}.foo{color:red}}`;
        const stripped = stripPreflight(css);

        // Exact: everything except Preflight (and the @layer wrapper itself) survives.
        expect(stripped).toBe(`${prefix}${componentCss}.foo{color:red}`);
        // …and the removed span is Preflight-sized, not component-CSS-sized.
        const removed = css.length - stripped.length - '@layer ora-components{'.length - '}'.length;
        expect(removed).toBe(PREFLIGHT.length);
    });

    it('does not silently swallow component CSS when the "/*! tailwindcss" banner is hoisted', () => {
        // The reviewer's concern. If the banner comment is ever hoisted to the
        // top of the layered content (PostCSS/Tailwind are free to move a
        // `/*!` comment), findPreflightRange would anchor start at index 0 and
        // end at the real terminal `[hidden]` rule thousands of characters
        // later — so every component rule in between, including a real
        // `body{display:flex}`, would be silently stripped and the guard would
        // report "OK" on a stylesheet that violates its own rule.
        // MAX_PREFLIGHT_SPAN bounds the strip span, so this now throws instead
        // of silently scanning the wrong (empty) text — a loud build failure
        // beats a silent false "OK".
        const banner = '/*! tailwindcss v3.4.19 | MIT License | https://tailwindcss.com*/';
        const preflightRules =
            '*,:after,:before{box-sizing:border-box}' +
            'html{line-height:1.5}body{line-height:inherit}[hidden]{display:none}';
        // Padding so the banner-to-terminal-[hidden] span exceeds
        // MAX_PREFLIGHT_SPAN — a hoisted banner alone isn't enough; it also
        // needs enough real component CSS between it and Preflight's actual
        // rules for the swallowed content to matter.
        const padding = '.ora-padding-rule{color:red}'.repeat(300);
        const hoisted = `${banner}.fx-delta-up{color:red}body{display:flex}${padding}${preflightRules}`;
        const css = `:root{--x:1}@layer ora-components{${hoisted}}`;

        expect(() => stripPreflight(css)).toThrow(/MAX_PREFLIGHT_SPAN/);
    });

    it('accepts a real-sized Preflight — the cap is not set below the shipped block', () => {
        // Guards the other side of MAX_PREFLIGHT_SPAN. The real Preflight is
        // ~2517 chars in dist/ora-components.css today; a cap set too tight
        // would make every build throw. A block just under the cap must pass.
        const bulkyPreflight =
            '/*! tailwindcss v3.4.19 | MIT License | https://tailwindcss.com*/' +
            '*,:after,:before{box-sizing:border-box}'.repeat(100) +
            '[hidden]{display:none}';
        expect(bulkyPreflight.length).toBeGreaterThan(2517); // bigger than what we ship
        expect(bulkyPreflight.length).toBeLessThan(5100); // but inside the cap

        const css = `:root{--x:1}@layer ora-components{.fx{color:red}${bulkyPreflight}.foo{color:red}}`;
        expect(() => stripPreflight(css)).not.toThrow();
        expect(stripPreflight(css)).toBe(':root{--x:1}.fx{color:red}.foo{color:red}');
    });

    it('throws when the Preflight comment appears more than once', () => {
        const duplicated = `${PREFLIGHT}${PREFLIGHT}`;
        expect(() => findPreflightRange(duplicated)).toThrow(/more than one/);
    });

    it('throws when the only "}" in the string sits before the @layer marker', () => {
        // A malformed/truncated file where lastIndexOf('}') would otherwise
        // return a stale brace from earlier in the string.
        expect(() => stripPreflight('.a{b:c}@layer ora-components{.d{e:f')).toThrow(/closing/);
    });
});

describe('stripPreflight + findViolations (end to end)', () => {
    it('reports violations from BOTH the unlayered prefix and the layered content', () => {
        const css = compose(
            ':root{--x:1}body{display:flex}',
            '.foo{color:red}#app{min-height:100vh}',
        );
        const violations = findViolations(stripPreflight(css));
        expect(violations).toHaveLength(2);
        expect(violations.some((v) => v.includes('display'))).toBe(true);
        expect(violations.some((v) => v.includes('min-height'))).toBe(true);
    });

    it('does NOT report a forbidden declaration that lives inside the Preflight range', () => {
        // Proves the strip actually happens: an upstream Preflight that one day
        // ships `html{overflow:hidden}` is Tailwind's business, not a library
        // defect, and must not trip the guard.
        const preflightWithForbidden =
            '/*! tailwindcss v3.4.19 | MIT License | https://tailwindcss.com*/' +
            'html{line-height:1.5;overflow:hidden}' +
            'body{display:flow-root}' +
            '[hidden]{display:none}';
        const css = `:root{--x:1}@layer ora-components{${preflightWithForbidden}.foo{color:red}}`;

        // Unstripped, those declarations WOULD be flagged …
        expect(findViolations(css).length).toBeGreaterThan(0);
        // … but the guard strips Preflight first, so it reports nothing.
        expect(findViolations(stripPreflight(css))).toEqual([]);
    });
});

describe('findViolations', () => {
    it('flags a bare body/html/#app rule declaring a forbidden property', () => {
        const violations = findViolations('body{display:flex;margin:0}');
        expect(violations).toHaveLength(1);
        expect(violations[0]).toContain('display');
    });

    it('does not flag Preflight-style harmless body/html declarations', () => {
        expect(findViolations('body{line-height:inherit}html{line-height:1.5}')).toEqual([]);
    });

    it('never flags margin — body{margin:0} is an intentional, permanent reset', () => {
        expect(findViolations('body{margin:0}html{margin:0}#app{margin:0}')).toEqual([]);
    });

    it('does not flag selectors that merely contain "body"/"html" as a class or tag substring', () => {
        expect(findViolations('.body-wrapper{display:flex}')).toEqual([]);
        expect(findViolations('.body{display:flex}')).toEqual([]);
        expect(findViolations('tbody{display:flex}')).toEqual([]);
        expect(findViolations('#app-root{display:flex}')).toEqual([]);
    });

    it('flags a compound element+class selector like body.ora-root', () => {
        const violations = findViolations('body.ora-root{min-height:100vh}');
        expect(violations).toHaveLength(1);
        expect(violations[0]).toContain('min-height');
    });

    it('flags a descendant compound selector like html body', () => {
        const violations = findViolations('html body{display:flex}');
        expect(violations).toHaveLength(1);
        expect(violations[0]).toContain('display');
    });

    it('flags each target in a comma-separated selector list independently', () => {
        const violations = findViolations('body,#app{place-items:center}');
        expect(violations).toHaveLength(1);
        expect(violations[0]).toContain('body');
        expect(violations[0]).toContain('#app');
    });

    it('flags :root — it is the same element as html, and exactly where the unlayered token block lives', () => {
        const violations = findViolations(':root{min-height:100vh;display:flex}');
        expect(violations).toHaveLength(2);
        expect(violations.some((v) => v.includes('display'))).toBe(true);
        expect(violations.some((v) => v.includes('min-height'))).toBe(true);
    });

    it('flags #root — Vite\'s default mount id — while sparing #app-root', () => {
        expect(findViolations('#root{display:flex}')).toHaveLength(1);
        expect(findViolations('#app-root{display:flex}')).toEqual([]);
    });

    it('flags a target wrapped in :where()/:is()', () => {
        const violations = findViolations(':where(body){display:flex}');
        expect(violations).toHaveLength(1);
        expect(violations[0]).toContain('display');
    });

    it('flags the longhand centering/sizing properties, not just the shorthand ones', () => {
        expect(findViolations('body{align-items:center}')).toHaveLength(1);
        expect(findViolations('body{justify-content:center}')).toHaveLength(1);
        expect(findViolations('body{height:100vh}')).toHaveLength(1);
        expect(findViolations('body{overflow:hidden}')).toHaveLength(1);
    });
});
