import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '../dist');
const pkgJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

// Read the main index.d.ts to find exported component builders
const indexDts = readFileSync(join(distDir, 'index.d.ts'), 'utf8');

// Extract component exports
const exportMatches = [...indexDts.matchAll(/export \* from ['"]\.\/(.+?)['"]/g)];

/** Read all .d.ts files under a directory path (or just the file itself) */
function readAllDts(basePath) {
  if (!existsSync(basePath)) {
    const withExt = basePath + '.d.ts';
    return existsSync(withExt) ? readFileSync(withExt, 'utf8') : '';
  }
  const stat = statSync(basePath);
  if (!stat.isDirectory()) return readFileSync(basePath, 'utf8');
  return readdirSync(basePath)
    .filter(f => f.endsWith('.d.ts'))
    .map(f => readFileSync(join(basePath, f), 'utf8'))
    .join('\n');
}

const components = [];

for (const [, componentPath] of exportMatches) {
  const raw = readAllDts(join(distDir, componentPath));
  if (!raw) continue;
  // Append sentinel so the lookahead always matches after the last class body
  const content = raw + '\nexport {}';

  // Find exported classes (builders) and extract methods per-class
  const classPattern = /export declare class (\w+)[^{]*\{([\s\S]*?)(?=\nexport|\nclass|\ndeclare|\Z)/g;
  let classMatch;
  while ((classMatch = classPattern.exec(content)) !== null) {
    const [, className, classBody] = classMatch;
    if (!className.endsWith('Builder') && !className.endsWith('Component')) continue;

    // Extract public methods scoped to this class body
    const methodMatches = [...classBody.matchAll(/^\s{4}(\w+)\(/gm)];
    const methods = [...new Set(methodMatches.map(m => m[1]).filter(m => !m.startsWith('_') && m !== 'constructor'))];

    const name = className.replace(/Builder$|Component$/, '').toLowerCase();

    components.push({
      name: className,
      componentName: name,
      description: `Builder for the ${name} component`,
      import: `aura-components/${name}`,
      methods,
      example: `import { ${className} } from 'aura-components/${name}';\n\nconst el = new ${className}().build();\ndocument.body.appendChild(el);`
    });
  }
}

const manifest = {
  version: pkgJson.version,
  generatedAt: new Date().toISOString(),
  components
};

writeFileSync(join(distDir, 'component-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Generated manifest with ${components.length} components`);
