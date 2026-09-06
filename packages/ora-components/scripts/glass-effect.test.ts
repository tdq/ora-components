/**
 * Glass effect must survive the consuming app's production CSS minifier.
 *
 * Regression for 0.1.8: `.glass-effect` was rewritten from `@apply backdrop-blur-xl`
 * to literal declarations with `backdrop-filter` BEFORE `-webkit-backdrop-filter`.
 * Lightning CSS (Vite's default CSS minifier since v8) folds the prefixed and
 * unprefixed declarations into one logical property and keeps only the LAST one
 * written, so a consuming app's production bundle shipped `-webkit-backdrop-filter`
 * alone — Safari still blurred, Chrome and Firefox rendered a flat panel.
 *
 * This test compiles the real src/index-layered.css the way `build:css` does
 * (Tailwind + autoprefixer, same browserslist), then minifies it exactly like a
 * Vite 8 consumer would, and asserts every glass rule still carries the
 * unprefixed `backdrop-filter` for Chrome/Firefox and the `-webkit-` one for Safari.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
// CommonJS packages loaded through require: under ts-jest's CJS output a default
// import of these resolves to the module namespace, not the callable plugin.
const postcss = require('postcss') as typeof import('postcss');
const tailwindcss = require('tailwindcss') as (config: string) => import('postcss').AcceptedPlugin;
const autoprefixer = require('autoprefixer') as () => import('postcss').AcceptedPlugin;
const { transform: lightningTransform } = require('lightningcss') as typeof import('lightningcss');

const ROOT = join(__dirname, '..');

/** Every rule in `css` whose selector contains `glass-effect` and whose body mentions backdrop-filter. */
function glassBackdropRules(css: string): Array<{ selector: string; body: string }> {
    const rules: Array<{ selector: string; body: string }> = [];
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const re = /([^{}]*glass-effect[^{}]*)\{([^{}]*backdrop-filter[^{}]*)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(withoutComments)) !== null) {
        rules.push({ selector: m[1].trim(), body: m[2] });
    }
    return rules;
}

function declarations(body: string): string[] {
    return body
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => d.split(':')[0].trim());
}

let compiled: string;
let minified: string;

beforeAll(async () => {
    const entry = join(ROOT, 'src/index-layered.css');
    const result = await postcss([
        tailwindcss(join(ROOT, 'tailwind.config.mjs')),
        autoprefixer(),
    ]).process(readFileSync(entry, 'utf8'), { from: entry });
    compiled = result.css;

    // Lightning CSS with the browser set a Vite 8 consumer targets by default
    // (baseline-widely-available). Chrome and Firefox only honour the unprefixed
    // property; Safari 16/17 only the -webkit- one.
    minified = lightningTransform({
        filename: 'ora-components.css',
        code: Buffer.from(compiled),
        minify: true,
        targets: { chrome: 107 << 16, firefox: 104 << 16, safari: 16 << 16, edge: 107 << 16 },
    }).code.toString();
}, 60_000);

describe('.glass-effect backdrop-filter', () => {
    it('compiles .glass-effect with a blur+saturate backdrop-filter', () => {
        const rule = glassBackdropRules(compiled).find(
            (r) => r.selector === '.glass-effect' && r.body.includes('blur('),
        );
        expect(rule).toBeDefined();
        expect(rule!.body).toMatch(/(^|[^-])backdrop-filter:\s*blur\(24px\)\s*saturate\(1\.5\)/);
    });

    it('writes -webkit-backdrop-filter BEFORE backdrop-filter in every glass rule', () => {
        // The two glass rules declared in src/index-layered.css itself. Component sheets
        // pulled in via @import (sidebar.css) are not inlined by the postcss plugin; their
        // source order is covered by wrap-css-layer.test.ts.
        const rules = glassBackdropRules(compiled);
        expect(rules.map((r) => r.selector)).toEqual([
            '.glass-effect',
            '.glass-effect .glass-effect:not([popover]):not(.glass-effect--overlay)',
        ]);

        for (const rule of rules) {
            const props = declarations(rule.body);
            const webkit = props.indexOf('-webkit-backdrop-filter');
            const plain = props.indexOf('backdrop-filter');
            expect({ selector: rule.selector, hasWebkit: webkit !== -1, hasPlain: plain !== -1 }).toEqual({
                selector: rule.selector,
                hasWebkit: true,
                hasPlain: true,
            });
            expect({ selector: rule.selector, webkitFirst: webkit < plain }).toEqual({
                selector: rule.selector,
                webkitFirst: true,
            });
        }
    });

    it('keeps the unprefixed backdrop-filter after a Vite 8 (Lightning CSS) production minify', () => {
        // The exact failure mode of 0.1.8: only the -webkit- form survived, so Chrome and
        // Firefox got no blur. Chrome/Firefox read `backdrop-filter`; Safari reads `-webkit-`.
        const rules = glassBackdropRules(minified);
        expect(rules.length).toBe(2);

        for (const rule of rules) {
            const props = declarations(rule.body);
            expect({ selector: rule.selector, props }).toEqual({
                selector: rule.selector,
                props: expect.arrayContaining(['backdrop-filter', '-webkit-backdrop-filter']),
            });
        }

        const glass = rules.find((r) => r.selector === '.glass-effect' && r.body.includes('blur('));
        expect(glass).toBeDefined();
        expect(glass!.body).toMatch(/(^|[^-])backdrop-filter:\s*blur\(24px\)\s*saturate\(1\.5\)/);
        expect(glass!.body).toMatch(/-webkit-backdrop-filter:\s*blur\(24px\)\s*saturate\(1\.5\)/);
    });

    it('documents the trap: unprefixed-first order is collapsed to -webkit- only by Lightning CSS', () => {
        // Sanity check that the minifier really behaves the way the guard assumes, so a
        // future Lightning CSS upgrade that changes this behaviour is visible here too.
        const out = lightningTransform({
            filename: 'probe.css',
            code: Buffer.from('.a{backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)}'),
            minify: true,
        }).code.toString();
        expect(out).toBe('.a{-webkit-backdrop-filter:blur(24px)}');
    });
});
