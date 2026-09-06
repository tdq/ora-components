import { rewriteSpecifiers, processFile, walk } from './add-nodenext-extensions.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, statSync, utimesSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('rewriteSpecifiers', () => {
    it('appends .js to a specifier resolving to a sibling file', () => {
        const exists = (p: string) => p.endsWith('layout.d.ts');
        const out = rewriteSpecifiers("export * from './layout';\n", '/dist', exists);
        expect(out).toBe("export * from './layout.js';\n");
    });

    it('appends /index.js to a specifier resolving to a directory', () => {
        const exists = (p: string) => p.endsWith('layout/index.d.ts');
        const out = rewriteSpecifiers("export * from './layout';\n", '/dist', exists);
        expect(out).toBe("export * from './layout/index.js';\n");
    });

    it('leaves specifiers that already have an extension untouched', () => {
        const exists = () => true;
        const out = rewriteSpecifiers("import './style.css';\nexport * from './x.js';\n", '/dist', exists);
        expect(out).toBe("import './style.css';\nexport * from './x.js';\n");
    });

    it('leaves an unresolvable specifier untouched (neither form exists)', () => {
        const exists = () => false;
        const src = "export * from './missing';\n";
        expect(rewriteSpecifiers(src, '/dist', exists)).toBe(src);
    });

    it('rewrites both import and export specifiers, multiple per file', () => {
        const exists = (p: string) => p.endsWith('a.d.ts') || p.endsWith('b.d.ts');
        const src = "import { A } from './a';\nexport * from './b';\n";
        const out = rewriteSpecifiers(src, '/dist', exists);
        expect(out).toBe("import { A } from './a.js';\nexport * from './b.js';\n");
    });
});

describe('processFile / walk — real filesystem', () => {
    let base: string;

    beforeEach(() => {
        base = mkdtempSync(join(tmpdir(), 'nodenext-ext-'));
        mkdirSync(join(base, 'button'), { recursive: true });
        writeFileSync(join(base, 'button', 'index.d.ts'), 'export declare class ButtonBuilder {}\n', 'utf8');
        writeFileSync(join(base, 'index.d.ts'), "export * from './button';\n", 'utf8');
    });

    afterEach(() => {
        rmSync(base, { recursive: true, force: true });
    });

    it('rewrites a file that needs it and reports true', () => {
        const changed = processFile(join(base, 'index.d.ts'));
        expect(changed).toBe(true);
        expect(readFileSync(join(base, 'index.d.ts'), 'utf8')).toBe("export * from './button/index.js';\n");
    });

    it('does not touch a file that needs no rewrite and reports false', () => {
        const before = readFileSync(join(base, 'button', 'index.d.ts'), 'utf8');
        const changed = processFile(join(base, 'button', 'index.d.ts'));
        expect(changed).toBe(false);
        expect(readFileSync(join(base, 'button', 'index.d.ts'), 'utf8')).toBe(before);
    });

    // The regression this guards against: add-nodenext-extensions.mjs runs *after*
    // generate-manifest.mjs writes dist/component-manifest.json. If a rewrite bumped
    // the .d.ts's mtime, check-docs-vs-manifest.mjs's freshness check (manifest mtime
    // vs. newest .d.ts mtime) would read every single build as "manifest is stale",
    // even though nothing manifest-relevant changed.
    it('preserves the file mtime across a rewrite', () => {
        const file = join(base, 'index.d.ts');
        const earlier = new Date(Date.now() - 60_000);
        utimesSync(file, earlier, earlier);
        const mtimeBefore = statSync(file).mtimeMs;

        const changed = processFile(file);

        expect(changed).toBe(true);
        expect(statSync(file).mtimeMs).toBe(mtimeBefore);
    });

    it('is idempotent: a second pass makes no further change and mtime stays put', () => {
        const file = join(base, 'index.d.ts');
        const earlier = new Date(Date.now() - 60_000);
        utimesSync(file, earlier, earlier);

        expect(processFile(file)).toBe(true);
        const contentAfterFirst = readFileSync(file, 'utf8');
        const mtimeAfterFirst = statSync(file).mtimeMs;

        expect(processFile(file)).toBe(false);
        expect(readFileSync(file, 'utf8')).toBe(contentAfterFirst);
        expect(statSync(file).mtimeMs).toBe(mtimeAfterFirst);
    });

    it('walk finds every file recursively', () => {
        const files = walk(base).map((f) => f.replace(base, ''));
        expect(files.sort()).toEqual(['/button/index.d.ts', '/index.d.ts'].sort());
    });
});
