import { readFileSync, writeFileSync, unlinkSync, renameSync } from 'fs';

/**
 * Concatenate an unlayered base stylesheet with a layered one: base first
 * (untouched — design tokens must stay visible to consumer overrides at any
 * specificity), then the rest wrapped in `@layer <name> { … }` so unlayered
 * consumer rules always outrank it regardless of specificity or source order.
 *
 * Plain string concatenation only — no parsing, no "already wrapped" guard.
 * Idempotency is the caller's job: always regenerate both bundles from
 * source rather than composing on top of a previous composition.
 */
export function composeStylesheet(base, layered, layerName = 'ora-components') {
    return `${base}@layer ${layerName}{${layered}}`;
}

/**
 * The layered bundle is built from src/index-layered.css, which Tailwind/postcss
 * fully inlines (no `@import` survives) and which never declares `@charset`.
 * `@charset`/`@import` are only legal as the first statements of a stylesheet,
 * so if either appears once the bundle is wrapped in `@layer { … }` it is
 * invalid CSS — fail loudly instead of shipping a broken stylesheet.
 *
 * The match is anchored to a statement boundary (start of string, or right
 * after a `}`/`;`) so an unrelated declaration value that merely contains the
 * text "@import" (e.g. `content:"@import"`) can't trip a false alarm.
 */
const IMPORT_OR_CHARSET_AT_STATEMENT_START = /(^|[};])\s*@(?:charset|import)\b/;

export function assertNoImportOrCharset(css, sourceLabel) {
    if (IMPORT_OR_CHARSET_AT_STATEMENT_START.test(css)) {
        throw new Error(
            `${sourceLabel} must not contain @charset or @import — Tailwind should have inlined them.`,
        );
    }
}

/**
 * Literal, must-appear-inside-the-layer sentinels. Kept as named constants
 * (rather than inlined in assertLayeredComposition) so that renaming a token
 * class or theme file produces one clear diff here instead of a silent gap
 * in coverage.
 *
 * - SHADOW_VAR_SENTINEL / SHADOW_UTILITY_SENTINEL: guards the custom-property
 *   regression (Preflight's `--tw-shadow` default and the `.shadow-level-2`
 *   utility that consumes it must share a layer — see assertLayeredComposition).
 * - COMPONENT_SHEET_SENTINELS: one literal string per `@import`ed component
 *   stylesheet in src/index-layered.css, so a dropped/misplaced `@import`
 *   (postcss-import silently drops one that isn't among the first statements
 *   in the file) fails the build instead of shipping CSS with a component
 *   silently unstyled.
 */
const SHADOW_VAR_SENTINEL = '--tw-shadow:0 0 #0000';
const SHADOW_UTILITY_SENTINEL = '.shadow-level-2';
export const COMPONENT_SHEET_SENTINELS = [
    'fx-delta-up', // src/components/fx-ticker/fx-ticker.css
    '.mkp-flash-down', // src/components/money-kpi-card/money-kpi-card.css
    '.trend-up', // src/components/trend/trend.css
    '.ora-sidebar--expanded', // src/components/sidebar/sidebar.css
    '.ora-chat-panel--closed', // src/components/chat/chat.css
];

/**
 * A custom property and every utility that consumes it must live in the same
 * @layer, or the unlayered declaration silently wins (unlayered always beats
 * layered, regardless of specificity) and the utility computes to nothing.
 * This guards the specific regression that bit us: `--tw-shadow` must be
 * declared inside @layer ora-components, in the same layer as the utilities
 * (e.g. `.shadow-level-2`) that read it — never split across the unlayered
 * prefix and the layer. It also guards a dropped `@import`: each component
 * sheet's sentinel selector must show up inside the layer too.
 */
export function assertLayeredComposition(css, layerName = 'ora-components') {
    const marker = `@layer ${layerName}{`;
    const occurrences = css.split(marker).length - 1;
    if (occurrences !== 1) {
        throw new Error(`Expected exactly one "${marker}" in the composed stylesheet, found ${occurrences}.`);
    }

    const layerStart = css.indexOf(marker);
    const prefix = css.slice(0, layerStart);

    if (/\*\s*,\s*:{1,2}(?:before|after)/.test(prefix)) {
        throw new Error(
            'The unlayered prefix must contain only the :root/[data-theme] token contract, ' +
            'but it contains a Preflight reset rule (*,::before,::after). Move @tailwind base into ' +
            'the layered entry so its custom properties share a layer with the utilities that consume them.',
        );
    }

    for (const sentinel of [SHADOW_VAR_SENTINEL, SHADOW_UTILITY_SENTINEL, ...COMPONENT_SHEET_SENTINELS]) {
        const pos = css.indexOf(sentinel);
        if (pos === -1 || pos < layerStart) {
            throw new Error(
                `Expected "${sentinel}" to appear inside @layer ${layerName}{…}, but it is missing or in the unlayered prefix. ` +
                'A dropped @import or a misplaced statement can cause this — check src/index-layered.css.',
            );
        }
    }
}

// CLI: `node scripts/wrap-css-layer.mjs compose <baseFile> <layeredFile> <outFile>`
// Reads the two already-built Tailwind bundles, asserts the layered one is
// self-contained and the composition didn't regress the cascade, writes the
// result to <outFile> atomically, then removes the intermediate bundles.
function runCli(argv) {
    const [subcommand, baseFile, layeredFile, outFile] = argv;
    if (subcommand !== 'compose' || !baseFile || !layeredFile || !outFile) {
        console.error('Usage: node scripts/wrap-css-layer.mjs compose <baseFile> <layeredFile> <outFile>');
        process.exit(1);
    }

    const base = readFileSync(baseFile, 'utf8');
    const layered = readFileSync(layeredFile, 'utf8');
    assertNoImportOrCharset(layered, layeredFile);

    const composed = composeStylesheet(base, layered);
    assertLayeredComposition(composed);

    const tmpFile = `${outFile}.tmp`;
    writeFileSync(tmpFile, composed);
    renameSync(tmpFile, outFile);

    unlinkSync(baseFile);
    unlinkSync(layeredFile);

    console.log(`Composed ${outFile} from ${baseFile} + @layer ora-components{${layeredFile}}`);
}

const invokedDirectly = process.argv[1]?.endsWith('wrap-css-layer.mjs');
if (invokedDirectly) {
    runCli(process.argv.slice(2));
}
