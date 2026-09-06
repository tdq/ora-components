import { readFileSync } from 'fs';
import { dirname, join } from 'path';

/**
 * Build-time guard: consumers must never be forced to override page-level
 * layout the library ships. `dist/ora-components.css` is composed by
 * scripts/wrap-css-layer.mjs as
 *
 *   <unlayered base tokens><@layer ora-components{ <layered content> }>
 *
 * and the layered content itself is, in source order (src/index-layered.css):
 *
 *   1. the `@import`ed component stylesheets (fx-ticker, trend, ...)
 *   2. `@tailwind base` — Tailwind's Preflight reset
 *   3. `@tailwind components` / `@tailwind utilities` + our own
 *      hand-authored `@layer components { … }` rules and the appended
 *      "Base Layout" rules
 *
 * The unlayered prefix (base tokens) is real, shipped CSS too — a
 * `body{display:flex}` planted there would be *worse* than one inside the
 * @layer block, since unlayered rules always beat layered ones regardless
 * of specificity. So this guard scans the WHOLE stylesheet (prefix +
 * layered content) and skips only the Preflight block, which legitimately
 * declares `html{line-height:1.5;...}` and `body{line-height:inherit}` —
 * expected, and must not trip this guard. Preflight is located precisely
 * (Tailwind's own license comment at the start, its last, very specific
 * `[hidden]` rule at the end — see findPreflightRange below) rather than
 * via a naive "everything inside @layer" scan, which would also flag
 * Preflight's own (harmless) body/html declarations the day someone adds a
 * forbidden property to Preflight upstream.
 *
 * `margin` is deliberately NOT in FORBIDDEN_PROPERTIES: `body { margin: 0 }`
 * is an intentional, permanent reset (removing the default browser body
 * margin is expected of any consumer's page and isn't the "dev-page layout"
 * defect this guard exists to catch — `display`/`place-items`/`align-items`/
 * `justify-content`/`min-width`/`min-height`/`height`/`overflow` on `body`
 * is, because (in any combination) they force a centered, viewport-sized
 * layout onto every consumer, which is what actually broke layouts in the
 * ora-vs-MUI bake-off).
 *
 * This guard is intentionally NOT wired into `build` (user decision) — run
 * it explicitly via `npm run verify`.
 */

const LAYER_MARKER = '@layer ora-components{';
const PREFLIGHT_START = '/*! tailwindcss';
// The last rule Tailwind v3's Preflight emits. Anchored so a future Preflight
// upgrade that changes this text fails the build loudly (rather than silently
// skip nothing, or skip too much) — see findPreflightRange.
const PREFLIGHT_END_NEEDLE = '[hidden]';
// Preflight is ~2517 chars today; 2x is ample headroom for a Tailwind version
// bump without being so loose it hides a real regression. Without this cap,
// a hoisted `/*! tailwindcss` banner (PostCSS/Tailwind are free to move a
// `/*!` comment) makes `start` land near index 0 while the real terminal
// `[hidden]` rule is still thousands of characters later — silently
// swallowing every component rule in between (including a real
// `body{display:flex}`) before the guard ever scans it.
const MAX_PREFLIGHT_SPAN = 5100;

const FORBIDDEN_PROPERTIES = [
    'display',
    'place-items',
    'align-items',
    'justify-content',
    'min-width',
    'min-height',
    'height',
    'overflow',
];

// Matches `body`, `html`, `:root`, `#app`, or `#root` as an actual selector
// token — preceded by the start of the selector list, a combinator,
// whitespace, a comma, or an opening paren (so `:where(body)`/`:is(html)`
// count), and followed by anything that isn't part of the same identifier.
// `:root` and `html` are the same element and `:root` is exactly where the
// unlayered design-token block lives; `#root`/`#app` are Vite's/this repo's
// default mount ids. This flags `body.ora-root`, `html body`, and
// `:where(body)`, while sparing `.body`, `tbody`, `#app-root`, etc.
const TARGET_SELECTOR_RE = /(?:^|[\s,>+~(])(body|html|:root|#app|#root)(?![\w-])/g;

/**
 * Locate the Preflight block inside the layered content and return
 * [start, end) so callers can strip it out before scanning for violations.
 * Throws if either boundary can't be found — an unrecognizable structure
 * means this guard can no longer trust its own boundary logic, so it must
 * fail loudly instead of silently scanning (or skipping) the wrong text.
 */
export function findPreflightRange(layeredContent) {
    const start = layeredContent.indexOf(PREFLIGHT_START);
    if (start === -1) {
        throw new Error(
            `Could not find the Tailwind Preflight comment ("${PREFLIGHT_START}") inside the ` +
            '@layer ora-components block. The composed CSS structure has changed — update ' +
            'check-css-globals.mjs\'s boundary logic before trusting its result.',
        );
    }
    if (layeredContent.indexOf(PREFLIGHT_START, start + 1) !== -1) {
        throw new Error(
            `Found more than one "${PREFLIGHT_START}" comment inside the @layer ora-components ` +
            'block. The composed CSS structure has changed — update check-css-globals.mjs\'s ' +
            'boundary logic before trusting its result.',
        );
    }

    const hiddenIdx = layeredContent.indexOf(PREFLIGHT_END_NEEDLE, start);
    if (hiddenIdx === -1) {
        throw new Error(
            `Could not find Preflight's terminal "${PREFLIGHT_END_NEEDLE}" rule after its license ` +
            'comment. Tailwind\'s Preflight output may have changed — update the boundary logic ' +
            'in check-css-globals.mjs before trusting its result.',
        );
    }

    const closingBrace = layeredContent.indexOf('}', hiddenIdx);
    if (closingBrace === -1) {
        throw new Error('Found the Preflight "[hidden]" rule but not its closing "}".');
    }

    const end = closingBrace + 1;
    if (end - start > MAX_PREFLIGHT_SPAN) {
        throw new Error(
            `The span between the Preflight comment and its terminal "${PREFLIGHT_END_NEEDLE}" rule ` +
            `is ${end - start} chars, more than MAX_PREFLIGHT_SPAN (${MAX_PREFLIGHT_SPAN}). The ` +
            'composed CSS structure has changed — update check-css-globals.mjs\'s boundary logic ' +
            'before trusting its result.',
        );
    }

    return [start, end];
}

/**
 * Return the full stylesheet (unlayered prefix + layered content) with only
 * the Tailwind Preflight block removed. The unlayered prefix is NOT
 * discarded — it is real, shipped CSS and must be scanned for violations
 * just like the layered content is.
 */
export function stripPreflight(css) {
    const markerIdx = css.indexOf(LAYER_MARKER);
    const occurrences = css.split(LAYER_MARKER).length - 1;
    if (markerIdx === -1 || occurrences !== 1) {
        throw new Error(
            `Expected exactly one "${LAYER_MARKER}" in the composed stylesheet, found ${occurrences}. ` +
            'This guard relies on the same invariant wrap-css-layer.mjs enforces at build time.',
        );
    }

    const unlayeredPrefix = css.slice(0, markerIdx);

    // Content between the marker and the file's final closing brace (the one
    // that closes the @layer block opened by the marker — composeStylesheet
    // always appends it last, after the layered content). Throw rather than
    // silently scanning garbage if that brace is missing or — a corrupt/
    // truncated file — sits before the marker itself.
    const layerContentStart = markerIdx + LAYER_MARKER.length;
    const layerContentEnd = css.lastIndexOf('}');
    if (layerContentEnd === -1 || layerContentEnd < layerContentStart) {
        throw new Error(
            `Could not find the closing "}" of the "${LAYER_MARKER}" block. The composed ` +
            'stylesheet looks truncated or malformed — update check-css-globals.mjs\'s boundary ' +
            'logic before trusting its result.',
        );
    }
    const layeredContent = css.slice(layerContentStart, layerContentEnd);

    const [preflightStart, preflightEnd] = findPreflightRange(layeredContent);
    const layeredWithoutPreflight = layeredContent.slice(0, preflightStart) + layeredContent.slice(preflightEnd);

    return unlayeredPrefix + layeredWithoutPreflight;
}

/**
 * Extract every simple (non-nested) `selector{declarations}` rule from CSS
 * text. Works on minified, nested (@media/@keyframes) input because the
 * regex only ever matches a brace-free selector immediately followed by a
 * brace-free declaration list — for nested input that means it matches the
 * innermost rules first, leaving at-rule wrappers (`@media (...){`) as inert
 * leftover text that never forms a full match.
 */
function extractRules(css) {
    const rules = [];
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let match;
    while ((match = re.exec(css)) !== null) {
        rules.push({ selector: match[1], declarations: match[2] });
    }
    return rules;
}

/**
 * Find every body/html/:root/#app/#root selector token in a selector list, deduplicated.
 */
function findTargets(selector) {
    const targets = new Set();
    let match;
    TARGET_SELECTOR_RE.lastIndex = 0;
    while ((match = TARGET_SELECTOR_RE.exec(selector)) !== null) {
        targets.add(match[1]);
    }
    return [...targets];
}

/**
 * Scan the (Preflight-stripped) CSS for rules targeting body/html/:root/
 * #app/#root that declare a forbidden property. Returns a list of
 * human-readable violation strings.
 */
export function findViolations(css) {
    const violations = [];
    for (const { selector, declarations } of extractRules(css)) {
        const targets = findTargets(selector);
        if (targets.length === 0) continue;

        for (const decl of declarations.split(';')) {
            const property = decl.split(':')[0]?.trim();
            if (property && FORBIDDEN_PROPERTIES.includes(property)) {
                violations.push(
                    `${targets.join(', ')} { ${property}: ... } — forbidden property in rule "${selector}{${declarations}}"`,
                );
            }
        }
    }
    return violations;
}

// Resolved from process.argv[1] (this script's own path), not import.meta.url:
// TypeScript's CommonJS transpile (used to run this .mjs file under Jest — see
// jest-mjs-transformer.cjs) can't represent import.meta, so main() — only ever
// reached via direct CLI invocation, see invokedDirectly below — must not
// depend on it.
function main(scriptPath) {
    const distPath = join(dirname(scriptPath), '../dist/ora-components.css');
    let css;
    try {
        css = readFileSync(distPath, 'utf8');
    } catch (err) {
        console.error(`check-css-globals: could not read ${distPath} — run the build first.`);
        console.error(err.message);
        process.exit(1);
    }

    const withoutPreflight = stripPreflight(css);
    const violations = findViolations(withoutPreflight);

    if (violations.length > 0) {
        console.error('check-css-globals: forbidden global layout declarations found in dist/ora-components.css:');
        for (const v of violations) {
            console.error(`  - ${v}`);
        }
        console.error(
            '\nThese properties force page-level layout onto every consumer. Move them to a ' +
            'dev-only stylesheet instead of shipping them in the library CSS.',
        );
        process.exit(1);
    }

    console.log('check-css-globals: OK — no forbidden body/html/:root/#app/#root layout declarations in dist/ora-components.css.');
}

const invokedDirectly = process.argv[1]?.endsWith('check-css-globals.mjs');
if (invokedDirectly) {
    main(process.argv[1]);
}
