/**
 * Build-time (well, verify-time) guard: every ` ```ts ` snippet in `QUICKSTART.md` must
 * actually compile against the package's own shipped types (`dist/**\/*.d.ts`) — the
 * bake-off cheat sheet this doc replaces shipped with two errors (`TextFieldBuilder
 * .asOutlined()`, which never existed, and a dialog snippet that told the reader to bypass
 * the toolbar) precisely because nothing ever type-checked it. Run `npm run build` first —
 * this reads `dist/`, it never builds it (same reasoning, and the same "run npm run build
 * first" message, as check-docs-vs-manifest.mjs).
 *
 * Only ` ```ts ` blocks are checked. ` ```js `/` ```bash `/` ```css ` blocks (the Tailwind
 * config bridged through `createRequire`, shell commands, CSS token overrides) are prose
 * illustrations, not type-checked TypeScript, and are left alone.
 *
 * Every checked block is extracted into ONE temporary module rather than one file per
 * block, so a single `tsc --noEmit` invocation covers the whole doc; every block's
 * non-import statements are wrapped in their own function so that two snippets declaring
 * the same local name (`const grid = ...` appears in more than one section of
 * QUICKSTART.md) do not collide as sibling top-level redeclarations — import statements are
 * hoisted to the module's real top level instead (a duplicate import of the same specifier
 * is not a TypeScript error).
 */

import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join, dirname, relative } from 'path';
import { spawnSync } from 'child_process';

const TS_FENCE_RE = /```ts\r?\n([\s\S]*?)```/g;

/** Extract the content of every ` ```ts ` fenced block in the markdown, in order. */
export function extractTsBlocks(markdown) {
    const blocks = [];
    let match;
    while ((match = TS_FENCE_RE.exec(markdown)) !== null) {
        blocks.push(match[1]);
    }
    return blocks;
}

/**
 * Strip every top-level `import ...` line out of one block, returning just the remaining
 * body lines (imports are collected separately by `collectImports` — see its doc comment
 * for why they can't just be concatenated block-by-block).
 */
export function stripImportLines(block) {
    return block.split('\n').filter((line) => !/^\s*import\s/.test(line));
}

/**
 * Merge every block's `import` line into one consolidated statement per module specifier.
 * Two different QUICKSTART.md sections legitimately import overlapping names from
 * `@tdq/ora-components` (e.g. `LayoutBuilder`/`LayoutGap`/`SlotSize` appear in both the
 * "Layout" and "App shell" sections) — concatenating their import lines as-is would
 * redeclare the same top-level binding twice in the generated module (TS2300 "Duplicate
 * identifier"), which is exactly the kind of accidental collision wrapping each block's
 * BODY in its own function (see buildModuleSource) does nothing to prevent, since imports
 * must stay at the real module top level. Recognizes the two import shapes QUICKSTART.md
 * actually uses — `import { A, B } from 'mod';` and the side-effect `import 'mod';` — and
 * falls back to keeping an unrecognized import line verbatim (deduplicated by exact text)
 * rather than dropping it silently.
 */
export function collectImports(blocks) {
    const namedByModule = new Map();
    const sideEffectModules = new Set();
    const verbatim = new Set();

    for (const block of blocks) {
        for (const rawLine of block.split('\n')) {
            const line = rawLine.trim();
            if (!/^import\s/.test(line)) continue;

            const named = line.match(/^import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?$/);
            if (named) {
                const names = named[1].split(',').map((s) => s.trim()).filter(Boolean);
                const set = namedByModule.get(named[2]) ?? new Set();
                for (const n of names) set.add(n);
                namedByModule.set(named[2], set);
                continue;
            }

            const sideEffect = line.match(/^import\s+['"]([^'"]+)['"];?$/);
            if (sideEffect) {
                sideEffectModules.add(sideEffect[1]);
                continue;
            }

            verbatim.add(line);
        }
    }

    const lines = [];
    for (const mod of sideEffectModules) lines.push(`import '${mod}';`);
    for (const [mod, names] of namedByModule) lines.push(`import { ${[...names].join(', ')} } from '${mod}';`);
    lines.push(...verbatim);
    return lines;
}

/**
 * Build the single generated module's source: one consolidated import per module specifier
 * at the real top level (see collectImports), then every block's remaining statements
 * wrapped in `async function quickstartBlock<N>() { … }` (async so a future snippet using
 * `await` needs no other change here) — never called, since the point is type-checking,
 * not execution. The function wrapper is what lets two blocks both declare, say, `const
 * grid = ...` without colliding.
 */
export function buildModuleSource(blocks) {
    const imports = collectImports(blocks);
    const bodies = blocks.map((block, i) => `async function quickstartBlock${i}() {\n${stripImportLines(block).join('\n')}\n}`);
    return `${imports.join('\n')}\n\n${bodies.join('\n\n')}\n`;
}

/**
 * The generated tsconfig: maps the package specifier and every `@tdq/ora-components/<sub>`
 * entry point straight at the built `.d.ts` files, the same shape a real consumer's bundler
 * resolves at runtime (`dist/<sub>/index.d.ts`) — not the source, so a doc snippet using an
 * API that exists in `src/` but was never exported never passes this check by accident.
 * `moduleResolution: "bundler"` (matching the repo's own root tsconfig.json) tolerates the
 * `.js`-suffixed relative specifiers `scripts/add-nodenext-extensions.mjs` writes into the
 * built `.d.ts` files themselves.
 */
export function buildTsconfig(distDir, tmpDir) {
    const distRel = relative(tmpDir, distDir).split('\\').join('/');
    return {
        compilerOptions: {
            target: 'ESNext',
            module: 'ESNext',
            moduleResolution: 'bundler',
            lib: ['ESNext', 'DOM', 'DOM.Iterable'],
            strict: true,
            skipLibCheck: true,
            noEmit: true,
            types: [],
            baseUrl: tmpDir,
            paths: {
                '@tdq/ora-components': [`${distRel}/index.d.ts`],
                '@tdq/ora-components/*': [`${distRel}/*/index.d.ts`],
            },
        },
        include: ['quickstart.ts', 'ambient.d.ts'],
    };
}

// `@tdq/ora-components/style.css` is a side-effect import with no `.d.ts` counterpart —
// real consumers rely on their bundler's CSS-import support, which tsc itself has no
// equivalent for, so an ambient module declaration stands in for it here exactly the way a
// consumer's own `vite-env.d.ts`/`*.css` ambient declaration would.
const AMBIENT_DTS = "declare module '@tdq/ora-components/style.css';\n";

/**
 * Run `tsc --noEmit` over the generated module against `distDir`'s `.d.ts` files. Returns
 * `{ ok, output }` — `output` is empty on success, the raw `tsc` stdout+stderr (diagnostics)
 * on failure.
 *
 * `packageDir` (not the OS temp dir) is where the scratch directory is created: `rxjs` is a
 * peer dependency resolved through Node's ordinary node_modules walk-up, and TypeScript's
 * `bundler` module resolution follows the same walk-up from the file doing the importing —
 * a directory under `packages/ora-components/` still finds the repo root's hoisted
 * `node_modules/rxjs` this way, whereas a directory under the OS temp dir (outside the repo
 * entirely) would not. The scratch directory is removed in `finally` regardless of outcome.
 */
export function typecheckQuickstart(markdown, distDir, packageDir) {
    const blocks = extractTsBlocks(markdown);
    if (blocks.length === 0) {
        return { ok: false, output: 'check-quickstart: no ```ts fenced blocks found in QUICKSTART.md.' };
    }

    const tmpDir = mkdtempSync(join(packageDir, '.quickstart-check-'));
    try {
        writeFileSync(join(tmpDir, 'quickstart.ts'), buildModuleSource(blocks), 'utf8');
        writeFileSync(join(tmpDir, 'ambient.d.ts'), AMBIENT_DTS, 'utf8');
        writeFileSync(join(tmpDir, 'tsconfig.json'), JSON.stringify(buildTsconfig(distDir, tmpDir), null, 2), 'utf8');

        // Resolved from `packageDir` (a caller-supplied parameter), never `import.meta.url` —
        // this module is transpiled to CommonJS to run under Jest (see jest-mjs-transformer.cjs),
        // and TypeScript's CommonJS output leaves `import.meta` untouched, which throws at
        // runtime under Jest. Same reasoning as every other scripts/*.mjs's main().
        const tscBin = join(packageDir, 'node_modules', '.bin', 'tsc');
        const result = spawnSync(tscBin, ['-p', join(tmpDir, 'tsconfig.json')], { encoding: 'utf8' });

        if (result.status === 0) return { ok: true, output: '' };
        return { ok: false, output: (result.stdout || '') + (result.stderr || '') };
    } finally {
        rmSync(tmpDir, { recursive: true, force: true });
    }
}

// Resolved from process.argv[1] (this script's own path), not import.meta.url: same
// CommonJS-transpile-under-Jest reasoning as every other scripts/*.mjs main() in this repo.
function main(scriptPath) {
    const packageDir = join(dirname(scriptPath), '..');
    const distDir = join(packageDir, 'dist');
    const quickstartPath = join(packageDir, 'QUICKSTART.md');

    let markdown;
    try {
        markdown = readFileSync(quickstartPath, 'utf8');
    } catch (err) {
        console.error(`check-quickstart: could not read ${quickstartPath}.`);
        console.error(err.message);
        process.exit(1);
    }

    const { ok, output } = typecheckQuickstart(markdown, distDir, packageDir);
    if (!ok) {
        console.error('check-quickstart: FAIL — one or more ```ts blocks in QUICKSTART.md do not compile against dist/**/*.d.ts (run `npm run build` first if dist/ is stale):');
        console.error(output);
        process.exit(1);
    }

    console.log('check-quickstart: OK — every ```ts block in QUICKSTART.md compiles against dist/**/*.d.ts.');
}

const invokedDirectly = process.argv[1]?.endsWith('check-quickstart.mjs');
if (invokedDirectly) {
    main(process.argv[1]);
}
