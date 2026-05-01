import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '../dist');
const agentDir = join(__dirname, '../../../.agent');
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

/**
 * Parse params string (the content between the outer parens) into an array of
 * {name, type} objects. Handles generics like Observable<string>, union types,
 * and function-type params like (item: ITEM) => string.
 *
 * Strategy: split on commas that are NOT inside angle brackets or parentheses.
 */
function parseParams(paramsStr) {
  if (!paramsStr || !paramsStr.trim()) return [];

  // Split on top-level commas (not inside <> or ())
  const parts = [];
  let angleDepth = 0, parenDepth = 0, current = '';
  for (const ch of paramsStr) {
    if (ch === '<') angleDepth++;
    else if (ch === '>') angleDepth--;
    else if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth--;
    else if (ch === ',' && angleDepth === 0 && parenDepth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());

  return parts
    .filter(p => p.length > 0)
    .map(p => {
      // Split on the first colon that is not inside brackets
      // e.g. "caption: Observable<string>" → name="caption", type="Observable<string>"
      // e.g. "provider: (item: ITEM) => string" → name="provider", type="(item: ITEM) => string"
      let colonIdx = -1;
      let aD = 0, pD = 0;
      for (let i = 0; i < p.length; i++) {
        const c = p[i];
        if (c === '<') aD++;
        else if (c === '>') aD--;
        else if (c === '(') pD++;
        else if (c === ')') pD--;
        else if (c === ':' && aD === 0 && pD === 0) { colonIdx = i; break; }
      }

      if (colonIdx === -1) {
        // No colon found — treat the whole thing as a name with unknown type
        return { name: p.replace(/\?$/, '').trim(), type: 'unknown' };
      }

      const name = p.slice(0, colonIdx).replace(/\?$/, '').trim();
      const type = p.slice(colonIdx + 1).trim();
      return { name, type };
    })
    .filter(p => p.name.length > 0 && !p.name.startsWith('_'));
}

/**
 * Extract method entries from a class body string.
 * Each public method line looks like (4-space indent):
 *   withCaption(caption: Observable<string>): ButtonBuilder;
 *
 * Skips private fields, constructor, and underscore-prefixed members.
 */
function extractMethods(classBody) {
  const methods = [];
  const seen = new Set();
  const lines = classBody.split('\n');

  for (const line of lines) {
    // Must start with exactly 4 spaces and not be a private/protected member
    if (!/^ {4}\w/.test(line)) continue;
    if (/^ {4}private |^ {4}protected /.test(line)) continue;
    // Must contain ( to be a method (may have generic type params before open paren)
    if (!line.includes('(')) continue;

    // Extract name - handles optional generic type params after method name
    const nameMatch = line.match(/^ {4}(\w+)(?:<[^(]*>)?\(/);
    if (!nameMatch) continue;

    const methodName = nameMatch[1];
    if (methodName === 'constructor' || methodName.startsWith('_')) continue;
    if (seen.has(methodName)) continue;
    seen.add(methodName);

    // Extract the full signature: trim leading whitespace and trailing ; and spaces
    const signature = line.replace(/^\s+/, '').replace(/;?\s*$/, '');

    // Extract params: content between the outermost ( and the matching )
    // Walk the signature char-by-char to find the outermost param span
    let parenOpen = -1;
    let parenClose = -1;
    let d = 0;
    for (let i = 0; i < signature.length; i++) {
      if (signature[i] === '(') {
        if (d === 0) parenOpen = i;
        d++;
      } else if (signature[i] === ')') {
        d--;
        if (d === 0) { parenClose = i; break; }
      }
    }

    const paramsStr = parenOpen !== -1 && parenClose !== -1
      ? signature.slice(parenOpen + 1, parenClose)
      : '';
    const params = parseParams(paramsStr);

    // Extract return type: everything after ): (with optional space) to end of signature
    let returnType = '';
    if (parenClose !== -1) {
      const afterParen = signature.slice(parenClose + 1).trim();
      // afterParen is like ": ButtonBuilder" or ": Observable<string>"
      if (afterParen.startsWith(':')) {
        returnType = afterParen.slice(1).trim();
      }
    }

    methods.push({ name: methodName, signature, params, returnType });
  }

  return methods;
}

/**
 * Load and parse the .agent/components/{componentName}.md file.
 * Returns { description, methodDescriptions } where methodDescriptions is a
 * Map<string, string> from method name to description text.
 */
function loadAgentDoc(componentName) {
  const agentComponentsDir = join(agentDir, 'components');
  const flatPath = join(agentComponentsDir, `${componentName}.md`);
  const subPath = join(agentComponentsDir, componentName, `${componentName}.md`);

  let content = '';
  if (existsSync(flatPath)) {
    content = readFileSync(flatPath, 'utf8');
  } else if (existsSync(subPath)) {
    content = readFileSync(subPath, 'utf8');
  } else {
    return null;
  }

  const text = content;
  const lines = text.split('\n');

  // --- Extract component description ---
  // Find the ## Description section and grab text before first bullet or code block
  let inDescription = false;
  const descLines = [];

  for (const line of lines) {
    if (/^## Description/.test(line)) {
      inDescription = true;
      continue;
    }
    if (inDescription) {
      // Stop at next heading, code fence, or empty line after content
      if (/^#/.test(line) || /^```/.test(line)) break;
      // Stop at the first bullet line (method list starts)
      if (/^- \w/.test(line)) break;
      descLines.push(line);
    }
  }

  // Join and trim — take only the first non-empty paragraph
  let descText = descLines.join('\n').trim();
  // Remove the "It has the following methods:" boilerplate if present
  const methodsIdx = descText.search(/It has the following methods:/i);
  if (methodsIdx !== -1) {
    descText = descText.slice(0, methodsIdx).trim();
  }
  // If there are multiple paragraphs, take just the first
  const description = descText.split(/\n\n/)[0].replace(/\n/g, ' ').trim();

  // --- Extract method descriptions ---
  // Match lines like: - methodName(...): type - description text
  const methodDescriptions = new Map();

  for (const line of lines) {
    // Must be a bullet that starts with a method name (word chars followed by `(`)
    const bulletMatch = line.match(/^- (\w+)\(/);
    if (!bulletMatch) continue;

    const methodName = bulletMatch[1];
    // Find the last " - " in the line and take everything after it as the description
    const lastDashIdx = line.lastIndexOf(' - ');
    if (lastDashIdx !== -1) {
      const desc = line.slice(lastDashIdx + 3).trim();
      if (desc.length > 0 && !methodDescriptions.has(methodName)) {
        methodDescriptions.set(methodName, desc);
      }
    }
  }

  return { description, methodDescriptions };
}

const components = [];

for (const [, componentPath] of exportMatches) {
  const raw = readAllDts(join(distDir, componentPath));
  if (!raw) continue;
  // Append sentinel so the lookahead always matches after the last class body
  const content = raw + '\nexport {}';

  // Find exported classes (builders) and extract methods per-class
  const classPattern = /export declare class (\w+)[^{]*\{([\s\S]*?)(?=\nexport|\nclass|\ndeclare)/g;
  let classMatch;
  while ((classMatch = classPattern.exec(content)) !== null) {
    const [, className, classBody] = classMatch;
    if (!className.endsWith('Builder') && !className.endsWith('Component')) continue;

    const methods = extractMethods(classBody);
    const componentName = className.replace(/Builder$|Component$/, '').toLowerCase();

    // Load agent doc and enrich with descriptions
    const agentDoc = loadAgentDoc(componentName);
    const description = agentDoc?.description || `Builder for the ${componentName} component`;
    const methodDescriptions = agentDoc?.methodDescriptions || new Map();

    const enrichedMethods = methods.map(m => ({
      name: m.name,
      signature: m.signature,
      description: methodDescriptions.get(m.name),
      params: m.params,
      returnType: m.returnType,
    }));

    components.push({
      name: className,
      componentName,
      description,
      import: `ora-components/${componentName}`,
      methods: enrichedMethods,
      example: `import { ${className} } from 'ora-components/${componentName}';\n\nconst el = new ${className}().build();\ndocument.body.appendChild(el);`
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
