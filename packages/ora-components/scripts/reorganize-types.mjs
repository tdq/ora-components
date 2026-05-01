/**
 * Moves TypeScript declarations out of dist/components/ so they sit
 * next to their JS counterparts.
 *
 * Before:  dist/components/button/index.d.ts   dist/button/index.js
 * After:   dist/button/index.d.ts              dist/button/index.js
 *
 * All relative imports in every .d.ts file are rewritten to reflect
 * the new file locations (using path resolution, not fragile string
 * replacement).
 */

import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const componentsDir = path.join(distDir, 'components');

// Maps source component dir name → output dir name (must match Vite entry names)
const componentMapping = {
    'button':          'button',
    'chart':           'chart',
    'checkbox':        'checkbox',
    'combobox':        'combobox',
    'component-parts': 'component-parts',
    'date-picker':     'datepicker',
    'dialog':          'dialog',
    'form':            'form',
    'grid':            'grid',
    'label':           'label',
    'layout':          'layout',
    'listbox':         'listbox',
    'number-field':    'numberfield',
    'panel':           'panel',
    'tabs':            'tabs',
    'text-field':      'textfield',
    'toolbar':         'toolbar',
};

/** Maps an absolute path under dist/components/ to its new location under dist/ */
function remapAbsPath(absPath) {
    const rel = path.relative(distDir, absPath);
    const parts = rel.split(path.sep);
    if (parts[0] !== 'components') return absPath;
    const targetName = componentMapping[parts[1]] ?? parts[1];
    return path.join(distDir, targetName, ...parts.slice(2));
}

/** Rewrites relative import/export specifiers in a .d.ts file */
function rewriteImports(content, originalFile, newFile) {
    return content.replace(
        /((?:import|export)[^'"]*['"])(\.[^'"]+)(['"])/g,
        (match, before, importPath, after) => {
            const resolved = path.resolve(path.dirname(originalFile), importPath);
            const remapped = remapAbsPath(resolved);
            let relative = path.relative(path.dirname(newFile), remapped).replace(/\\/g, '/');
            if (!relative.startsWith('.')) relative = './' + relative;
            return before + relative + after;
        }
    );
}

/** Recursively collect all files under a directory */
function walk(dir, files = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, files);
        else files.push(full);
    }
    return files;
}

if (!fs.existsSync(componentsDir)) {
    console.log('dist/components/ not found, nothing to reorganize.');
    process.exit(0);
}

for (const srcFile of walk(componentsDir)) {
    const destFile = remapAbsPath(srcFile);
    fs.mkdirSync(path.dirname(destFile), { recursive: true });

    if (srcFile.endsWith('.d.ts')) {
        let content = fs.readFileSync(srcFile, 'utf-8');
        content = rewriteImports(content, srcFile, destFile);
        fs.writeFileSync(destFile, content);
    } else {
        fs.copyFileSync(srcFile, destFile);
    }

    console.log(`  ${path.relative(distDir, srcFile)} → ${path.relative(distDir, destFile)}`);
}

fs.rmSync(componentsDir, { recursive: true });
console.log('  removed dist/components/');

// Rewrite any root-level .d.ts files that still reference ./components/
for (const entry of fs.readdirSync(distDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.d.ts')) continue;
    const filePath = path.join(distDir, entry.name);
    const original = fs.readFileSync(filePath, 'utf-8');
    const rewritten = rewriteImports(original, filePath, filePath);
    if (rewritten !== original) {
        fs.writeFileSync(filePath, rewritten);
        console.log(`  rewrote imports in ${entry.name}`);
    }
}
