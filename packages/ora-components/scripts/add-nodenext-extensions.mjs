/**
 * Node16/NodeNext consumers (tsc `moduleResolution: "nodenext"`, and plain
 * Node ESM) require an explicit extension on every relative specifier — see
 * https://www.typescriptlang.org/docs/handbook/esm-node.html. This library's
 * own build uses `moduleResolution: "bundler"` (tsconfig.json), which lets
 * source files import extensionless, so tsc's declaration emit mirrors that
 * and leaves dist/**\/*.d.ts extensionless too. That is fine for "bundler"
 * consumers but breaks `import`/`export ... from` resolution for nodenext
 * ones — every named export of an extensionless re-export appears missing,
 * because the target module can't be resolved at all.
 *
 * Run last in the `build` script, *after* generate-manifest.mjs: that script
 * regex-parses `export * from './x'` in dist/index.d.ts and expects the
 * bare, extensionless specifier it captures to equal a real dist/<x>
 * directory name — rewriting extensions first breaks that parse.
 *
 * Rewritten files keep their original mtime (see `processFile`): running
 * *after* generate-manifest.mjs means a naive rewrite would leave every
 * touched `.d.ts` newer than `dist/component-manifest.json`, which
 * check-docs-vs-manifest.mjs's freshness check (manifest mtime vs. newest
 * `.d.ts` mtime) reads as "the manifest is stale" on every single build,
 * even though nothing about the manifest-relevant *content* changed.
 */

import { existsSync, readFileSync, writeFileSync, statSync, utimesSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';

const SPECIFIER_RE = /((?:import|export)[^'"]*['"])(\.[^'"]+)(['"])/g;

/**
 * Rewrites every relative import/export specifier in `content` (a `.d.ts`
 * file's text, whose file lives in `dir`) to the NodeNext-compatible
 * `.js`/`/index.js` form, using `exists` to resolve whether the specifier
 * points at a file or a directory-with-index. `exists` is injected (default
 * `existsSync`) so this stays a pure, disk-free function under test.
 */
export function rewriteSpecifiers(content, dir, exists = existsSync) {
    return content.replace(SPECIFIER_RE, (match, before, spec, after) => {
        if (/\.(js|json|css|mjs|cjs)$/.test(spec)) return match;
        const resolved = resolve(dir, spec);
        if (exists(resolved + '.d.ts')) return before + spec + '.js' + after;
        if (exists(join(resolved, 'index.d.ts'))) return before + spec + '/index.js' + after;
        return match;
    });
}

/**
 * Rewrites one `.d.ts` file in place if it needs it, preserving its mtime
 * (see the module doc comment for why). Returns whether it changed.
 */
export function processFile(file) {
    const content = readFileSync(file, 'utf-8');
    const rewritten = rewriteSpecifiers(content, dirname(file));
    if (rewritten === content) return false;

    const { atime, mtime } = statSync(file);
    writeFileSync(file, rewritten);
    utimesSync(file, atime, mtime);
    return true;
}

/** Recursively collect all files under a directory */
export function walk(dir, files = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full, files);
        else files.push(full);
    }
    return files;
}

// Resolved from process.argv[1] (this script's own path), not import.meta.url: TypeScript's
// CommonJS transpile (used to run this .mjs file under Jest — see jest-mjs-transformer.cjs)
// can't represent import.meta, so main() — only ever reached via direct CLI invocation, see
// invokedDirectly below — must not depend on it. Same pattern as generate-manifest.mjs's
// and check-docs-vs-manifest.mjs's main().
function main() {
    const distDir = resolve('dist');

    if (!existsSync(distDir)) {
        console.log('dist/ not found, nothing to extension-rewrite.');
        return;
    }

    let filesChanged = 0;
    for (const file of walk(distDir)) {
        if (!file.endsWith('.d.ts')) continue;
        if (processFile(file)) filesChanged++;
    }

    console.log(`  added NodeNext-compatible extensions to relative specifiers in ${filesChanged} .d.ts file(s)`);
}

const invokedDirectly = process.argv[1]?.endsWith('add-nodenext-extensions.mjs');
if (invokedDirectly) {
    main();
}
