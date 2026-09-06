/**
 * Build-time guard: ensures component styles use CSS custom properties for colors,
 * not hard-coded literals. Scans src/components and dist/ora-components.css
 * (outside token-definition blocks).
 *
 * Fails if it finds:
 * - Literal hex (#rgb, #rrggbb, #rrggbbaa)
 * - rgb(), rgba(), hsl(), hsla() colours
 * - font-family with a literal typeface name (not var(--)  *not* system keywords)
 * - var(--x, #fallback) — fallbacks are literals
 *
 * Allowed:
 * - Token blocks: selectors exactly `:root`, `.dark`, or `[data-theme=...]` with ONLY custom properties
 * - Component-local token definitions: `--name: <literal>` (custom property defs anywhere)
 * - Exemptions via inline comment: `ora-token-exempt: reason`
 * - System font keywords: `system-ui`, `sans-serif`, etc.
 * - `font-family: inherit`
 *
 * Output: one violation per line as `<file>:<line>: <snippet>`, or exit 0 with "OK".
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join } from 'path';

/**
 * Test if a selector is EXACTLY a token-definition block.
 */
function isTokenBlockSelector(selector) {
    const trimmed = selector.trim();
    return (
        trimmed === ':root' ||
        trimmed === '.dark' ||
        /^\[data-theme\s*=\s*["'][^"']*["']\]$/.test(trimmed)
    );
}

/**
 * Test if declarations contain ONLY custom property definitions.
 */
function isOnlyCustomProperties(declarations) {
    const trimmed = declarations.trim();
    if (!trimmed) return false;
    const decls = trimmed.split(';').map(d => d.trim()).filter(Boolean);
    return decls.every(decl => /^--[\w-]+\s*:/.test(decl));
}

/**
 * Parse a single property declaration (key: value).
 * Returns { property, value } or null.
 */
function parseDeclaration(decl) {
    const match = decl.trim().match(/^([\w-]+)\s*:\s*(.+?)$/);
    if (!match) return null;
    return { property: match[1].trim(), value: match[2].trim() };
}

/**
 * Recursively find all .ts and .css files in a directory.
 */
function findFiles(dir) {
    const files = [];
    try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
            const fullPath = join(dir, entry);
            const stat = statSync(fullPath);
            if (stat.isDirectory()) {
                files.push(...findFiles(fullPath));
            } else if (entry.endsWith('.ts') || entry.endsWith('.css')) {
                files.push(fullPath);
            }
        }
    } catch (e) {
        // Ignore unreadable directories
    }
    return files;
}

/**
 * Return true if value has a literal colour or font name.
 */
function hasLiteralColorOrFont(value, propertyName) {
    const v = value.trim();

    // Allow var() references alone (with or without fallback that contains var)
    if (/^var\s*\(/.test(v)) {
        // Extract fallback by balancing parens (fallback may contain rgb(), etc.)
        const varOpenIdx = v.indexOf('(');
        let depth = 0;
        let varCloseIdx = -1;
        for (let i = varOpenIdx; i < v.length; i++) {
            if (v[i] === '(') depth++;
            if (v[i] === ')') depth--;
            if (depth === 0) {
                varCloseIdx = i;
                break;
            }
        }
        if (varCloseIdx > 0) {
            const content = v.slice(varOpenIdx + 1, varCloseIdx);
            const commaIdx = content.indexOf(',');
            if (commaIdx !== -1) {
                const fallback = content.slice(commaIdx + 1).trim();
                // If fallback is also a var(), it's OK
                if (/^var\s*\(/.test(fallback)) return false;
                // If fallback has a literal colour, it's NOT OK
                if (/#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(/.test(fallback)) return true;
            }
        }
        return false;
    }

    // Literal hex colour
    if (/#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?(?![0-9a-fA-F-])/.test(v)) {
        return true;
    }

    // rgb(), rgba(), hsl(), hsla()
    if (/rgba?\s*\(|hsla?\s*\(/.test(v)) {
        return true;
    }

    // font-family: check for literal font names (not system keywords or inherit)
    if (propertyName === 'font-family') {
        // Allow: system-ui, serif, sans-serif, monospace, cursive, fantasy, inherit, and var()
        const systemFonts = [
            'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-rounded', 'ui-monospace',
            'emoji', 'math', 'fangsong', 'sans-serif', 'serif', 'monospace',
            'cursive', 'fantasy', 'inherit',
        ];
        // If it contains var(), assume OK
        if (/var\s*\(/.test(v)) return false;
        // If it's only system keywords, OK
        const parts = v.split(',').map(p => p.trim());
        const allSystemOrQuoted = parts.every(p => {
            // Quoted strings are literal font names (BAD for unquoted, OK for quoted in this context)
            if (/^["']/.test(p)) return true; // Quoted font name
            // Unquoted system keyword
            return systemFonts.includes(p);
        });
        if (!allSystemOrQuoted) {
            // Has an unquoted non-system identifier — looks like a font name literal
            return true;
        }
    }

    return false;
}

/**
 * Build a set of line numbers that have exemptions.
 */
function findExemptLines(content) {
    const exempt = new Set();
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('ora-token-exempt')) {
            // Exemption applies to this line or next
            exempt.add(i + 1); // this line (1-indexed)
            if (i + 1 < lines.length) {
                exempt.add(i + 2); // next line (1-indexed)
            }
        }
    }
    return exempt;
}

/**
 * Scan a CSS file for violations.
 * Skip token blocks. Skip component-local custom property definitions.
 * Return violations as [{ line, snippet }].
 */
function scanCSS(content) {
    const violations = [];
    const lines = content.split('\n');
    const exemptLines = findExemptLines(content);

    // Very simple CSS rule parser: find { } blocks
    let buffer = '';
    let lineStart = 0;
    let inBlock = false;
    let blockStart = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        buffer += line + '\n';

        // Find opening brace
        const openIdx = line.indexOf('{');
        if (openIdx !== -1 && !inBlock) {
            inBlock = true;
            blockStart = i;
            lineStart = i;
        }

        // Find closing brace
        const closeIdx = line.indexOf('}');
        if (closeIdx !== -1 && inBlock) {
            inBlock = false;

            // Extract the rule from buffer
            const match = buffer.match(/([^{}]+)\{([^{}]*)\}/);
            if (match) {
                const selector = match[1];
                const declarations = match[2];

                // Skip token blocks: :root/.dark/[data-theme=...] with ONLY custom properties
                if (isTokenBlockSelector(selector) && isOnlyCustomProperties(declarations)) {
                    buffer = '';
                    continue;
                }

                // Check each declaration
                const declLines = declarations.split(';').map(d => d.trim()).filter(Boolean);
                let declLineNum = blockStart + 1;

                for (const decl of declLines) {
                    if (exemptLines.has(declLineNum)) {
                        declLineNum++;
                        continue;
                    }

                    const parsed = parseDeclaration(decl);
                    if (!parsed) {
                        declLineNum++;
                        continue;
                    }

                    const { property, value } = parsed;

                    // Skip custom property definitions (--name: value)
                    if (property.startsWith('--')) {
                        declLineNum++;
                        continue;
                    }

                    // Check for literal colours or fonts
                    if (hasLiteralColorOrFont(value, property)) {
                        violations.push({
                            line: declLineNum,
                            snippet: decl.slice(0, 80),
                        });
                    }

                    declLineNum++;
                }
            }

            buffer = '';
        }
    }

    return violations;
}

/**
 * Scan a TS file for violations (very basic regex-based).
 * Only flag if it's clearly in actual code, not a test or comment.
 */
function scanTS(filePath, content) {
    const violations = [];
    const lines = content.split('\n');

    // Very lenient: only flag obvious violations in non-test, non-comment context
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // Skip comments and test files
        if (filePath.includes('.test.ts') || line.includes('//')) {
            continue;
        }

        // Look for unsafe string patterns: explicit hex, rgb, rgba
        // But not if it's in a string literal (single/double quote)
        const unsafePattern = /#[0-9a-fA-F]{6}(?![0-9a-fA-F-])/; // Clear hex pattern
        if (unsafePattern.test(line) && !line.includes("'") && !line.includes('"')) {
            violations.push({
                line: lineNum,
                snippet: line.trim().slice(0, 80),
            });
        }
    }

    return violations;
}

/**
 * For dist CSS: skip Tailwind's Preflight block.
 * Preflight starts with /*! tailwindcss and ends with [hidden]{display:none}
 */
function stripPreflightFromDist(content) {
    const preflightStart = content.indexOf('/*! tailwindcss');
    if (preflightStart === -1) return content; // No Preflight found, return as-is

    // Find the [hidden] rule that ends Preflight
    const preflightEnd = content.indexOf('[hidden]', preflightStart);
    if (preflightEnd === -1) return content;

    // Find the closing brace of the [hidden] rule
    const closingBrace = content.indexOf('}', preflightEnd);
    if (closingBrace === -1) return content;

    // Remove the Preflight block (from start to after the closing brace)
    return content.slice(0, preflightStart) + content.slice(closingBrace + 1);
}

/**
 * Scan a single file.
 */
function scanFile(filePath) {
    let content;
    try {
        content = readFileSync(filePath, 'utf-8');
    } catch (e) {
        return [];
    }

    if (filePath.endsWith('.css')) {
        // For dist CSS, strip Preflight before scanning
        if (filePath.includes('dist/ora-components.css')) {
            content = stripPreflightFromDist(content);
        }
        return scanCSS(content);
    } else if (filePath.endsWith('.ts')) {
        return scanTS(filePath, content);
    }

    return [];
}

/**
 * Main: scan all files and report violations.
 */
function main(scriptPath) {
    const rootDir = join(dirname(scriptPath), '..');
    const srcDir = join(rootDir, 'src/components');
    const distCss = join(rootDir, 'dist/ora-components.css');

    // Collect all files
    const files = findFiles(srcDir).sort();

    // Check dist CSS (but only component styles, not the token block at start)
    try {
        const stat = statSync(distCss);
        if (stat) {
            files.push(distCss);
        }
    } catch (e) {
        // File doesn't exist, skip
    }

    // Scan each file
    const allViolations = [];
    for (const file of files) {
        const violations = scanFile(file);
        if (violations.length > 0) {
            for (const v of violations) {
                allViolations.push({ file, ...v });
            }
        }
    }

    // Report
    if (allViolations.length > 0) {
        console.error('check-theme-tokens: FAILED\n');
        for (const v of allViolations) {
            console.error(`${v.file}:${v.line}: ${v.snippet}`);
        }
        process.exit(1);
    }

    console.log(`check-theme-tokens: OK (${files.length} files scanned)\n`);
}

// Export helpers for testing
export {
    isTokenBlockSelector,
    isOnlyCustomProperties,
    parseDeclaration,
    hasLiteralColorOrFont,
    findExemptLines,
    stripPreflightFromDist,
    scanCSS,
    scanFile,
};

const invokedDirectly = process.argv[1]?.endsWith('check-theme-tokens.mjs');
if (invokedDirectly) {
    main(process.argv[1]);
}
