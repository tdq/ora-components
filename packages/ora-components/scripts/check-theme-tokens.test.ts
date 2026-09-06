import {
    isTokenBlockSelector,
    isOnlyCustomProperties,
    parseDeclaration,
    hasLiteralColorOrFont,
    findExemptLines,
    stripPreflightFromDist,
    scanCSS,
    scanFile,
} from './check-theme-tokens.mjs';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('isTokenBlockSelector', () => {
    it('recognizes :root as a token block', () => {
        expect(isTokenBlockSelector(':root')).toBe(true);
    });

    it('recognizes .dark as a token block', () => {
        expect(isTokenBlockSelector('.dark')).toBe(true);
    });

    it('recognizes [data-theme="light"] as a token block', () => {
        expect(isTokenBlockSelector('[data-theme="light"]')).toBe(true);
    });

    it('recognizes [data-theme="dark"] as a token block', () => {
        expect(isTokenBlockSelector('[data-theme="dark"]')).toBe(true);
    });

    it('rejects body as not a token block', () => {
        expect(isTokenBlockSelector('body')).toBe(false);
    });

    it('rejects .my-class as not a token block', () => {
        expect(isTokenBlockSelector('.my-class')).toBe(false);
    });
});

describe('isOnlyCustomProperties', () => {
    it('returns true when all declarations are custom properties', () => {
        expect(isOnlyCustomProperties('--color: red; --size: 12px')).toBe(true);
    });

    it('returns true for a single custom property', () => {
        expect(isOnlyCustomProperties('--primary: #0F52BA')).toBe(true);
    });

    it('returns false when declarations include regular properties', () => {
        expect(isOnlyCustomProperties('color: red; --size: 12px')).toBe(false);
    });

    it('returns false for empty declarations', () => {
        expect(isOnlyCustomProperties('')).toBe(false);
    });
});

describe('parseDeclaration', () => {
    it('parses a valid property declaration', () => {
        const result = parseDeclaration('color: red');
        expect(result?.property).toBe('color');
        expect(result?.value).toBe('red');
    });

    it('parses with whitespace', () => {
        const result = parseDeclaration('  font-family  :  sans-serif  ');
        expect(result?.property).toBe('font-family');
        expect(result?.value).toBe('sans-serif');
    });

    it('returns null for invalid declaration', () => {
        expect(parseDeclaration('invalid')).toBeNull();
    });
});

describe('hasLiteralColorOrFont', () => {
    it('detects hex colour #ff0000', () => {
        expect(hasLiteralColorOrFont('#ff0000', 'color')).toBe(true);
    });

    it('detects rgb() colour', () => {
        expect(hasLiteralColorOrFont('rgb(255, 0, 0)', 'color')).toBe(true);
    });

    it('detects rgba() colour', () => {
        expect(hasLiteralColorOrFont('rgba(255, 0, 0, 0.5)', 'background')).toBe(true);
    });

    it('detects hsl() colour', () => {
        expect(hasLiteralColorOrFont('hsl(0, 100%, 50%)', 'color')).toBe(true);
    });

    it('detects hsla() colour', () => {
        expect(hasLiteralColorOrFont('hsla(0, 100%, 50%, 0.5)', 'color')).toBe(true);
    });

    it('allows var() without fallback', () => {
        expect(hasLiteralColorOrFont('var(--my-color)', 'color')).toBe(false);
    });

    it('allows var() with var() fallback', () => {
        expect(hasLiteralColorOrFont('var(--my-color, var(--fallback))', 'color')).toBe(false);
    });

    it('detects var() with hex fallback as literal', () => {
        expect(hasLiteralColorOrFont('var(--my-color, #ff0000)', 'color')).toBe(true);
    });

    it('detects var() with rgb() fallback as literal', () => {
        expect(hasLiteralColorOrFont('var(--my-color, rgb(255,0,0))', 'color')).toBe(true);
    });

    it('detects font-family literal "Inter"', () => {
        expect(hasLiteralColorOrFont('Inter, system-ui', 'font-family')).toBe(true);
    });

    it('allows font-family var()', () => {
        expect(hasLiteralColorOrFont('var(--ora-font-family)', 'font-family')).toBe(false);
    });

    it('allows font-family inherit', () => {
        expect(hasLiteralColorOrFont('inherit', 'font-family')).toBe(false);
    });

    it('allows font-family system-ui', () => {
        expect(hasLiteralColorOrFont('system-ui, sans-serif', 'font-family')).toBe(false);
    });
});

describe('findExemptLines', () => {
    it('finds exemption comments on a line', () => {
        const content = `line 1
line 2 /* ora-token-exempt: reason */
line 3`;
        const exempt = findExemptLines(content);
        expect(exempt.has(2)).toBe(true); // This line
        expect(exempt.has(3)).toBe(true); // Next line
    });

    it('finds exemption on a preceding line', () => {
        const content = `/* ora-token-exempt: reason */
color: #ff0000;`;
        const exempt = findExemptLines(content);
        expect(exempt.has(1)).toBe(true); // This line (comment line)
        expect(exempt.has(2)).toBe(true); // Next line
    });
});

describe('stripPreflightFromDist', () => {
    it('removes the Preflight block from dist CSS', () => {
        const preflight = '/*! tailwindcss v3.4.19 | MIT License */*,::before,::after{box-sizing:border-box}[hidden]{display:none}';
        const css = `:root{--x:1}@layer ora-components{${preflight}.foo{color:red}}`;
        const stripped = stripPreflightFromDist(css);
        expect(stripped).toContain(':root{--x:1}');
        expect(stripped).toContain('.foo{color:red}');
        expect(stripped).not.toContain('tailwindcss');
    });

    it('returns CSS unchanged if no Preflight found', () => {
        const css = ':root{--x:1}.foo{color:red}';
        expect(stripPreflightFromDist(css)).toBe(css);
    });
});

describe('scanCSS', () => {
    it('fails for literal hex colour in a component style', () => {
        const css = `.my-component {
  background-color: #ff0000;
}`;
        const violations = scanCSS(css);
        expect(violations.length).toBeGreaterThan(0);
    });

    it('passes for a token block with only custom properties', () => {
        const css = `:root {
  --md-sys-color-primary: #0F52BA;
  --md-sys-color-secondary: #475569;
}`;
        const violations = scanCSS(css);
        expect(violations.length).toBe(0);
    });

    it('passes for component-local custom property definition', () => {
        const css = `.trend {
  --trend-up: #10B981;
  color: var(--trend-up);
}`;
        const violations = scanCSS(css);
        expect(violations.length).toBe(0);
    });

    it('fails for var() with hex fallback', () => {
        const css = `.my-component {
  color: var(--my-color, #ff0000);
}`;
        const violations = scanCSS(css);
        expect(violations.length).toBeGreaterThan(0);
    });

    it('passes for literal with ora-token-exempt comment', () => {
        const css = `/* ora-token-exempt: design choice */
.my-component {
  background-color: #ff0000;
}`;
        const violations = scanCSS(css);
        // The exemption should apply to the next line
        expect(violations.length).toBe(0);
    });

    it('fails for font-family with literal font name', () => {
        const css = `.my-component {
  font-family: Inter, system-ui;
}`;
        const violations = scanCSS(css);
        expect(violations.length).toBeGreaterThan(0);
    });

    it('passes for font-family using CSS variable', () => {
        const css = `.my-component {
  font-family: var(--ora-font-family);
}`;
        const violations = scanCSS(css);
        expect(violations.length).toBe(0);
    });

    it('passes for .dark token block', () => {
        const css = `.dark {
  --md-sys-color-primary: #60A5FA;
  --md-sys-color-on-primary: #002D5F;
}`;
        const violations = scanCSS(css);
        expect(violations.length).toBe(0);
    });

    it('passes for [data-theme="dark"] token block', () => {
        const css = `[data-theme="dark"] {
  --md-sys-color-primary: #60A5FA;
}`;
        const violations = scanCSS(css);
        expect(violations.length).toBe(0);
    });

    it('returns violations in deterministic order (by line number)', () => {
        const css = `.component1 { color: #ff0000; }
.component2 { background: rgb(255, 0, 0); }
.component3 { border-color: #00ff00; }`;
        const violations = scanCSS(css);
        expect(violations.length).toBeGreaterThan(0);
        // Check that line numbers are in order
        for (let i = 1; i < violations.length; i++) {
            expect(violations[i].line).toBeGreaterThanOrEqual(violations[i - 1].line);
        }
    });
});

describe('scanFile', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = mkdtempSync(join(tmpdir(), 'check-theme-tokens-'));
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true });
    });

    it('scans CSS files for violations', () => {
        const cssFile = join(tempDir, 'test.css');
        writeFileSync(cssFile, '.component { color: #ff0000; }');
        const violations = scanFile(cssFile);
        expect(violations.length).toBeGreaterThan(0);
    });

    it('scans TS files (test files are skipped)', () => {
        const tsFile = join(tempDir, 'test.ts');
        writeFileSync(tsFile, 'const x = #ff0000;');
        const violations = scanFile(tsFile);
        // TS files are not scanned aggressively, only obvious patterns
        expect(Array.isArray(violations)).toBe(true);
    });

    it('handles missing files gracefully', () => {
        const violations = scanFile(join(tempDir, 'nonexistent.css'));
        expect(violations.length).toBe(0);
    });
});

describe('dist CSS scanning skips Preflight block', () => {
    it('does not flag Tailwind Preflight declarations', () => {
        const preflight = '/*! tailwindcss v3.4.19 | MIT License */*,::before,::after{box-sizing:border-box}border: 0 solid #e5e7eb[hidden]{display:none}';
        const css = `:root{--x:1}@layer ora-components{${preflight}.component{color:red}}`;
        const stripped = stripPreflightFromDist(css);
        const violations = scanCSS(stripped);
        // Should not find violations in Preflight
        expect(violations.length).toBe(0);
    });
});
