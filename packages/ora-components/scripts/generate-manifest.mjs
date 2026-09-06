import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { docForBuilder } from './doc-map.mjs';

/**
 * Recursively collect every `.d.ts` file reachable from `basePath`:
 *  - `basePath` itself, if it is a file (or `basePath + '.d.ts'`, if `basePath` doesn't
 *    exist as-is — the historical "bare module specifier" case).
 *  - every `.d.ts` file under `basePath`, if it is a directory, including nested
 *    subdirectories such as `dist/chart/builders/` or `dist/grid/columns/` (the layout
 *    `reorganize-types.mjs` produces for a component whose builders span more than one
 *    source file's worth of `.d.ts` output).
 *
 * `readdirSync` results are sorted before recursing so the file (and therefore method/
 * class) order — and the generated manifest's byte content — is deterministic across
 * machines/OSes/filesystem directory-entry ordering, not just across repeated runs on
 * the same machine.
 */
export function collectDtsFiles(basePath) {
  if (!existsSync(basePath)) {
    const withExt = basePath + '.d.ts';
    return existsSync(withExt) ? [withExt] : [];
  }
  const stat = statSync(basePath);
  if (!stat.isDirectory()) return [basePath];

  const files = [];
  for (const entry of readdirSync(basePath).sort()) {
    const full = join(basePath, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectDtsFiles(full));
    } else if (entry.endsWith('.d.ts')) {
      files.push(full);
    }
  }
  return files;
}

/** Read and concatenate every `.d.ts` file under (or at) `basePath` — see collectDtsFiles. */
export function readAllDts(basePath) {
  return collectDtsFiles(basePath)
    .map(f => readFileSync(f, 'utf8'))
    .join('\n');
}

/**
 * Parse params string (the content between the outer parens) into an array of
 * {name, type} objects. Handles generics like Observable<string>, union types,
 * and function-type params like (item: ITEM) => string.
 *
 * Strategy: split on commas that are NOT inside angle brackets or parentheses.
 */
export function parseParams(paramsStr) {
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
 * Extract method entries from a class or interface body string.
 * Each public method line looks like (4-space indent):
 *   withCaption(caption: Observable<string>): ButtonBuilder;
 *
 * Skips private fields, constructor, and underscore-prefixed members. Interface bodies
 * use the same 4-space-indented `name(params): ret;` shape as class bodies in tsc's
 * `.d.ts` output, so this is shared between both declaration kinds.
 */
/**
 * A method belongs in the manifest only if it's part of the builder's public API per
 * `.agent/builder-pattern.md` (`with*`/`add*`/`as*`/`build`), or is one of the small set of
 * documented lifecycle methods that don't follow that naming convention — the `PopupBuilder`
 * pair (`show`/`close`, plus `DialogBuilder`'s own `forceClose`) and `RouterBuilder`'s
 * navigation API (`navigate`/`back`/`forward`/`replace`), all confirmed present in real
 * `.agent/**` docs today (`.agent/components/popover.md`, `.agent/components/dialog.md`,
 * `.agent/router.md` — that last one lives directly under `.agent/`, not under
 * `.agent/components/`; see doc-map.mjs's `'../router.md'` entry). Everything else —
 * `render(item)`, `createEditor(...)`, and other DOM/internal helpers that happen to be
 * public on a builder class for inheritance reasons — must not be published: a consumer of
 * the manifest has no use for them, and check-docs-vs-manifest.mjs would have nothing to
 * ever compare them against since no doc describes them as builder methods.
 */
const BUILDER_API_NAME_RE = /^(?:with|add|as)[A-Z]\w*$/;
const LIFECYCLE_METHOD_NAMES = new Set(['show', 'close', 'destroy', 'forceClose', 'navigate', 'back', 'forward', 'replace']);
function isPublicApiMethodName(name) {
  return name === 'build' || BUILDER_API_NAME_RE.test(name) || LIFECYCLE_METHOD_NAMES.has(name);
}

export function extractMethods(classBody) {
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
    if (!isPublicApiMethodName(methodName)) continue;
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
 * Extract enum declarations from .d.ts content.
 * Parses `export declare enum Name { MEMBER = "VALUE", ... }` blocks
 * and returns an array of { name, values } objects.
 */
export function extractEnums(dtsContent) {
  const enums = [];
  const enumRegex = /export\s+declare\s+enum\s+(\w+)\s*\{([\s\S]*?)\}/g;
  let match;
  while ((match = enumRegex.exec(dtsContent)) !== null) {
    const [, enumName, body] = match;
    // Extract member identifiers (the ^\s*(\w+) part before = or EOL)
    const memberRegex = /^\s*(\w+)/gm;
    const values = [];
    let memberMatch;
    while ((memberMatch = memberRegex.exec(body)) !== null) {
      values.push(memberMatch[1]);
    }
    if (values.length > 0) {
      enums.push({ name: enumName, values });
    }
  }
  return enums;
}

/**
 * Strip a declaration header's own leading type-parameter list (`<...>`, balanced —
 * tracking nested `<>` depth, not a single non-greedy regex, since a constraint like
 * `<ITEM, CONFIG extends IndividualChartConfig<ITEM>>` nests another `<...>` inside it)
 * before `extractExtendsNames` searches for `extends`. Without this, a generic constraint
 * that itself contains the literal word `extends` (TypeScript's `<T extends U>` syntax,
 * unrelated to interface/class inheritance) is indistinguishable from a real `extends`
 * clause — `IndividualChartBuilder<ITEM, CONFIG extends IndividualChartConfig<ITEM>>`
 * would otherwise report `IndividualChartConfig` as a phantom base to merge methods from,
 * even though that interface declares no real inheritance at all. A real `extends` clause,
 * when present, always comes AFTER the type-parameter list closes (e.g. `LineChartBuilder
 * <ITEM> extends IndividualChartBuilder<ITEM, LineChartConfig<ITEM>>`), so stripping the
 * leading list first and searching only what remains finds it correctly either way.
 */
function stripLeadingTypeParams(header) {
  const trimmed = header.replace(/^\s+/, '');
  if (!trimmed.startsWith('<')) return header;

  let depth = 0;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '<') depth++;
    else if (trimmed[i] === '>') {
      depth--;
      if (depth === 0) return trimmed.slice(i + 1);
    }
  }
  // Unbalanced (shouldn't happen for real tsc output) — nothing safe to strip.
  return header;
}

/**
 * Pull every `extends X` (classes: at most one; interfaces: possibly several,
 * comma-separated) base name out of a declaration's header — the text between the
 * declared name and its opening `{`, e.g. ` extends BaseColumnBuilder<ITEM> ` or
 * ` extends A<X>, B<Y> `. Generic type arguments on the base itself are discarded (only
 * the base's own name is needed to look it up in the same file's `declarations` map);
 * an `implements ...` clause (classes only) is ignored — a class's own body already
 * contains the concrete implementation of whatever it implements, so there is nothing to
 * merge in from there, unlike `extends`, where the base's methods live on the base only.
 * The header's own leading type-parameter list is stripped first (see
 * stripLeadingTypeParams) so a generic constraint's own `extends` (TypeScript's `<T
 * extends U>`) is never mistaken for a real inheritance clause.
 */
export function extractExtendsNames(header) {
  const withoutTypeParams = stripLeadingTypeParams(header);
  const m = withoutTypeParams.match(/\bextends\s+([^{]*?)(?:\bimplements\b|$)/);
  if (!m) return [];

  const names = [];
  let depth = 0, current = '';
  for (const ch of m[1]) {
    if (ch === '<') depth++;
    else if (ch === '>') depth--;
    else if (ch === ',' && depth === 0) {
      names.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) names.push(current.trim());

  return names.map(n => n.match(/^\w+/)?.[0]).filter(Boolean);
}

/**
 * Extract every exported `class` and `interface` declaration from a `.d.ts` content blob,
 * keyed by declared name, as `{ body, kind, extends, abstract }`. Classes are matched by
 * `export declare class Name ... { ... }` or `export declare abstract class Name ... { ... }`
 * (the latter needed so a base like `BaseColumnBuilder` — `export declare abstract class
 * BaseColumnBuilder<ITEM> { ... }`, the grid column base every concrete `*ColumnBuilder`
 * extends — is resolvable by `mergeMethods` below at all; `abstract: true` is then what
 * `buildComponents` uses to still exclude it from becoming a manifest entry of its own, the
 * same exclusion it got for free before this change simply by never being matched);
 * interfaces by `export interface Name ... { ... }` or `export declare interface Name ...
 * { ... }` — inline builders are exported as interfaces by design
 * (`.agent/builder-pattern.md`), with their `...Impl` class kept private to the module, so
 * the interface form must be scanned too or every inline builder (`AxisBuilder`, grid
 * `*ColumnBuilder`s, `SlotBuilder`, etc.) is invisible to the manifest. Each pattern's
 * lookahead terminator includes both `\nclass` and `\ninterface` (not just its own kind) —
 * a class body immediately followed by an interface declaration (or vice versa), which
 * happens throughout this codebase, must not swallow the next declaration's text as part of
 * the current one's body.
 *
 * `extends` is resolved by `mergeMethods` below, against this same map, so a subclass like
 * `TextColumnBuilder extends BaseColumnBuilder` sees its base's public methods too.
 *
 * When a name is declared as both (not the case in this codebase today, but possible in
 * principle — e.g. a class implementing a same-named interface reexported for typing),
 * the class wins: it always has the fuller, concrete method list.
 */
export function extractDeclarations(dtsContent) {
  // Append sentinel so the lookahead always matches after the last body, even at EOF.
  const content = dtsContent + '\nexport {}';

  // Classes first, so a name collision (not seen in this codebase today, but possible in
  // principle) resolves to the class per the dedupe rule above: once `declarations` has a
  // name, neither pattern overwrites it.
  const patterns = [
    ['class', /export declare (abstract )?class (\w+)([^{]*)\{([\s\S]*?)(?=\nexport|\nclass|\ninterface|\ndeclare)/g],
    ['interface', /export (?:declare )?interface (\w+)([^{]*)\{([\s\S]*?)(?=\nexport|\ninterface|\nclass|\ndeclare)/g],
  ];

  const declarations = new Map();
  for (const [kind, pattern] of patterns) {
    let m;
    while ((m = pattern.exec(content)) !== null) {
      const [name, header, body] = kind === 'class' ? [m[2], m[3], m[4]] : [m[1], m[2], m[3]];
      const abstract = kind === 'class' && !!m[1];
      if (!declarations.has(name)) declarations.set(name, { body, kind, extends: extractExtendsNames(header), abstract });
    }
  }
  return declarations;
}

/**
 * A declaration's full public method list: its own (`extractMethods(decl.body)`) plus
 * every base's (recursively, through `decl.extends`), found within the same `declarations`
 * map — i.e. the same component's `.d.ts` set, e.g. `TextColumnBuilder extends
 * BaseColumnBuilder` both live under `dist/grid/**`, or `LineChartBuilder extends
 * IndividualChartBuilder` both under `dist/chart/**`. A base outside that set (nothing in
 * this codebase reaches for one) simply isn't found and contributes nothing — `extends`
 * across component directories isn't a pattern this codebase uses.
 *
 * The subclass's own method wins on a name collision with a base's (a subclass commonly
 * narrows a base method's signature, e.g. `LineChartBuilder`'s own `withCurve` overriding
 * one it also inherits transitively). `cache` memoizes per name within one `buildComponents`
 * call — several sibling classes share the same base (every grid `*ColumnBuilder` extends
 * `BaseColumnBuilder`), so without it the base's chain would be walked once per sibling.
 * `visiting` guards against a cyclical `extends` chain (not possible via valid TypeScript,
 * but this operates on regex-extracted text, not compiled types) — a name already being
 * resolved contributes no further methods rather than looping forever.
 */
export function mergeMethods(name, declarations, cache = new Map(), visiting = new Set()) {
  if (cache.has(name)) return cache.get(name);
  if (visiting.has(name)) return [];
  const decl = declarations.get(name);
  if (!decl) return [];

  visiting.add(name);
  const own = extractMethods(decl.body);
  const seen = new Set(own.map(m => m.name));
  const merged = [...own];
  for (const baseName of decl.extends) {
    for (const baseMethod of mergeMethods(baseName, declarations, cache, visiting)) {
      if (seen.has(baseMethod.name)) continue;
      seen.add(baseMethod.name);
      merged.push(baseMethod);
    }
  }
  visiting.delete(name);
  cache.set(name, merged);
  return merged;
}

/**
 * Resolve the `.agent/components/**` doc file for a builder, trying (in order):
 *  1. `doc-map.mjs`'s explicit `docForBuilder(className)` — the authoritative source for
 *     every builder that lives one or more directories deep (`AxisBuilder` ->
 *     `chart/axis-builder.md`, `TextColumnBuilder` -> `grid/text-column.md`), where the
 *     naive "lowercase the class name" guess below can never be right.
 *  2. `<componentName>.md` — the flat-file convention most top-level components use
 *     (`ButtonBuilder` -> `button.md`).
 *  3. `<componentName>/<componentName>.md` — the subdirectory convention.
 * Returns `null` if none exist.
 */
export function resolveAgentDocPath(agentComponentsDir, componentName, className) {
  const mapped = className ? docForBuilder(className) : null;
  if (mapped) {
    const mappedPath = join(agentComponentsDir, mapped);
    if (existsSync(mappedPath)) return mappedPath;
  }
  const flatPath = join(agentComponentsDir, `${componentName}.md`);
  if (existsSync(flatPath)) return flatPath;
  const subPath = join(agentComponentsDir, componentName, `${componentName}.md`);
  if (existsSync(subPath)) return subPath;
  return null;
}

/**
 * Extract every top-level `- ` bullet under a doc's `## Gotchas` heading (the bake-off
 * behaviour notes: things a builder does that its own naming doesn't make obvious — e.g.
 * "GridBuilder.asEditable(onCommit) mutates the item in place"), stopping at the next
 * heading or end of file. A doc with no `## Gotchas` section yields `[]`, never `undefined`,
 * so callers can test length without a null check.
 */
export function parseGotchas(lines) {
  const notes = [];
  let inGotchas = false;
  for (const line of lines) {
    if (/^## Gotchas/.test(line)) {
      inGotchas = true;
      continue;
    }
    if (!inGotchas) continue;
    if (/^#/.test(line)) break;
    if (/^- /.test(line)) notes.push(line.slice(2).trim());
  }
  return notes;
}

/**
 * Parse a `.agent/components/{componentName}.md` file's content into
 * { description, methodDescriptions, notes }, where methodDescriptions is a
 * Map<string, string> from method name to description text and notes is the array of
 * `## Gotchas` bullets (see parseGotchas) — surfaced on the manifest entry as `notes[]`
 * so `get_component_api` (the MCP tool) can hand a consumer the behaviour traps a bake-off
 * agent hit without reading this file directly.
 */
export function parseAgentDoc(content) {
  const lines = content.split('\n');

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
    // Must be a bullet that starts with a method name (word chars followed by `(`).
    // The signature is usually wrapped in backticks: `- \`withFoo(x): this\` - does foo.`
    const bulletMatch = line.match(/^- (`?)(\w+)\(/);
    if (!bulletMatch) continue;

    const [, tick, methodName] = bulletMatch;

    // With a backticked signature the description starts after the closing backtick;
    // without one, fall back to the last " - " in the line.
    let desc;
    if (tick) {
      const closingTick = line.indexOf('`', 3);
      if (closingTick === -1) continue;
      desc = line.slice(closingTick + 1).replace(/^\s*[-–—:]\s*/, '').trim();
    } else {
      const lastDashIdx = line.lastIndexOf(' - ');
      if (lastDashIdx === -1) continue;
      desc = line.slice(lastDashIdx + 3).trim();
    }

    if (desc.length > 0 && !methodDescriptions.has(methodName)) {
      methodDescriptions.set(methodName, desc);
    }
  }

  const notes = parseGotchas(lines);

  return { description, methodDescriptions, notes };
}

/**
 * Load and parse the agent doc for a builder. `className` (when provided) is resolved
 * through `doc-map.mjs` first; see resolveAgentDocPath. `cache` (optional) is a
 * `Map<path, ParsedDoc>` shared across a batch of calls — several doc files document more
 * than one builder (`chart/individual-charts.md` alone covers three), so without a cache
 * `buildComponents` would `readFileSync` + re-parse the same markdown once per builder it
 * documents.
 */
export function loadAgentDoc(agentComponentsDir, componentName, className, cache) {
  const path = resolveAgentDocPath(agentComponentsDir, componentName, className);
  if (!path) return null;
  if (cache?.has(path)) return cache.get(path);
  const parsed = parseAgentDoc(readFileSync(path, 'utf8'));
  cache?.set(path, parsed);
  return parsed;
}

/** Grid `*ColumnBuilder` classes — see the `inline: true` note in main() below. */
const COLUMN_BUILDER_RE = /^\w+ColumnBuilder$/;

/**
 * Interface declarations named `*Builder`/`*Component` come in two flavours that both end
 * up in a `.d.ts` file: real inline builders (`.agent/builder-pattern.md`'s "module
 * exports only the interface" pattern — `AxisBuilder`, `SlotBuilder`,
 * `SidebarItemBuilder`, every `LineChartBuilder`/`BarChartBuilder`/`AreaChartBuilder`),
 * and internal base/marker contracts another class implements but nothing instantiates
 * directly — `ComponentBuilder`/`PopupBuilder` themselves (the base interfaces every
 * builder implements, per builder-pattern.md's own example), `ColumnBuilder<ITEM>` (the
 * grid column base every concrete `*ColumnBuilder` class implements),
 * `IndividualChartBuilder<ITEM, CONFIG>` (the base the three chart-type interfaces
 * extend), `FormFieldBuilder` (a marker every form-compatible field builder implements),
 * `IFieldsBuilder` (the interface the already-manifested `FieldsBuilder` class
 * implements — listing both would be a redundant twin of the same API surface). None of
 * these six ship a `.agent/components/**` doc naming them, while every real inline
 * builder does (see `doc-map.mjs`) — so an interface declaration only becomes a manifest
 * entry when `doc-map.mjs` documents it by name. Class declarations are unrestricted, as
 * before, so an undocumented new class-based builder still surfaces (and gets picked up
 * by `check-docs-vs-manifest.mjs`'s WARN, which is what should catch missing docs going
 * forward).
 */
function isRealInterfaceBuilder(className) {
  return docForBuilder(className) !== null;
}

/**
 * Hand-written examples for builders where showing a realistic chain (composing another
 * builder, using an `as*`/`with*` beyond the bare constructor) is more useful than the
 * generic one-liner. Keyed by class name so adding a third is a one-line addition rather
 * than another `if`/`else if` branch.
 */
const CUSTOM_EXAMPLES = {
  LabelBuilder: `import { LabelBuilder } from '@tdq/ora-components/label';

const el = new LabelBuilder()
    .withCaption(of('Hello'))
    .withClass(of('text-headline-medium font-bold'))
    .build();
document.body.appendChild(el);`,
  PanelBuilder: `import { PanelBuilder } from '@tdq/ora-components/panel';
import { LabelBuilder } from '@tdq/ora-components/label';

const el = new PanelBuilder()
    .asGlass()
    .withClass(of('max-w-lg'))
    .withContent(new LabelBuilder().withCaption(of('Hello')))
    .build();
document.body.appendChild(el);`,
};

/**
 * Build the manifest's `components` array from the package's exported `.d.ts` files.
 * `exportMatches` is `[, componentPath][]` from `index.d.ts`'s `export * from './x'`
 * lines; `distDir`/`agentDir` are the resolved `dist/` and `.agent/` directories;
 * `markColumnBuildersInline` controls whether grid `*ColumnBuilder` entries get an
 * `inline: true` flag (see main()).
 *
 * Returns `{ components, skippedInterfaces }`: `skippedInterfaces` lists every
 * interface-kind declaration named `*Builder`/`*Component` that was excluded because
 * `doc-map.mjs` doesn't document it (see `isRealInterfaceBuilder`) — a real, new inline
 * builder that ships without a doc first looks identical, at this layer, to one of the
 * known base/marker interfaces (`ComponentBuilder`, `ColumnBuilder<ITEM>`, etc.), so rather
 * than silently dropping either kind, `main()` prints this list as a WARN.
 */
export function buildComponents(exportMatches, distDir, agentDir, markColumnBuildersInline) {
  const agentComponentsDir = join(agentDir, 'components');
  const components = [];
  const skippedInterfaces = [];
  const docCache = new Map();

  for (const [, componentPath] of exportMatches) {
    const raw = readAllDts(join(distDir, componentPath));
    if (!raw) continue;
    // Extract enums from this component's .d.ts content. Every builder under this
    // componentPath shares the SAME enums (e.g. every grid *ColumnBuilder would otherwise
    // each carry an identical copy of the grid's enums) — attached once, to the first
    // manifest entry actually produced for this path, rather than duplicated onto every
    // one of them (`enumsAttached` below tracks that).
    const enums = extractEnums(raw);
    let enumsAttached = false;

    const declarations = extractDeclarations(raw);
    const methodsCache = new Map();
    for (const [className, { kind, abstract }] of declarations) {
      if (!className.endsWith('Builder') && !className.endsWith('Component')) continue;
      // An abstract base (e.g. BaseColumnBuilder) is never instantiated directly — it
      // stays in `declarations` purely so mergeMethods can resolve it for concrete
      // subclasses, but is not itself a manifest entry (same exclusion it got for free
      // before extractDeclarations started matching "abstract class" at all).
      if (abstract) continue;
      if (kind === 'interface' && !isRealInterfaceBuilder(className)) {
        skippedInterfaces.push(className);
        continue;
      }

      const methods = mergeMethods(className, declarations, methodsCache);
      const componentName = className.replace(/Builder$|Component$/, '').toLowerCase();

      // Load agent doc and enrich with descriptions (cached — several docs cover more
      // than one builder, see loadAgentDoc's doc comment).
      const agentDoc = loadAgentDoc(agentComponentsDir, componentName, className, docCache);
      const description = agentDoc?.description || `Builder for the ${componentName} component`;
      const methodDescriptions = agentDoc?.methodDescriptions || new Map();
      // `## Gotchas` bullets from the matching doc, e.g. "GridBuilder.asEditable(onCommit)
      // mutates the item in place; immutable stores must rebuild the array in onCommit" —
      // omitted (not an empty array) when the doc has no such section, so a manifest reader
      // can tell "documented, no gotchas" apart from "notes[] absent" the same way `enums`
      // already does.
      const notes = agentDoc?.notes && agentDoc.notes.length > 0 ? agentDoc.notes : undefined;

      const enrichedMethods = methods.map(m => ({
        name: m.name,
        signature: m.signature,
        description: methodDescriptions.get(m.name),
        params: m.params,
        returnType: m.returnType,
      }));

      // `componentPath` (the parent entry point, e.g. 'chart', 'grid') is used for the
      // generic example's import — not a per-builder guess — so a nested builder's import
      // always matches a real package.json `exports` key: AxisBuilder/LineChartBuilder/etc.
      // import from '@tdq/ora-components/chart', every grid *ColumnBuilder from '.../grid'.
      const example = CUSTOM_EXAMPLES[className] ?? `import { ${className} } from '@tdq/ora-components/${componentPath}';

const el = new ${className}().build();
document.body.appendChild(el);`;

      const attachEnums = !enumsAttached && enums.length > 0;
      if (attachEnums) enumsAttached = true;

      const entry = {
        name: className,
        componentName,
        description,
        import: `@tdq/ora-components/${componentPath}`,
        methods: enrichedMethods,
        example,
        enums: attachEnums ? enums : undefined,
        notes,
      };
      if (markColumnBuildersInline && COLUMN_BUILDER_RE.test(className)) {
        entry.inline = true;
      }
      components.push(entry);
    }
  }

  return { components, skippedInterfaces };
}

/**
 * `componentPath` slugs whose generated imports already had no matching `package.json`
 * "exports" key before this subtask touched the generator — each one has simply never been
 * added as an `exports` entry (money-field, fx-ticker, money-kpi-card, trend, steps,
 * multi-select-list, component-parts). Keyed by componentPath (the `exports` slug itself),
 * not by builder class name: every builder that imports from a given componentPath shares
 * the same fate (e.g. `component-parts` alone covers `ErrorPopoverBuilder`,
 * `FieldAffixBuilder`, `FieldLabelBuilder`, `FieldSupportTextBuilder`, `PopoverBuilder`),
 * so a per-class list would just be this same handful of paths spelled out five times over
 * — and would silently stop covering a NEW builder later added under one of these
 * directories, which a path-keyed list still catches correctly. Fixing any of these means
 * editing `package.json`'s `exports` map or renaming component directories — neither
 * authorized by this subtask's Files list. `main()` treats a mismatch against this
 * allowlist as a WARN (pre-existing, out of scope); anything NOT in it is a real regression
 * and fails the build — see `validateImportsAgainstExports`.
 */
const KNOWN_LEGACY_IMPORT_MISMATCH_PATHS = new Set([
  'money-field',
  'fx-ticker',
  'money-kpi-card',
  'trend',
  'steps',
  'multi-select-list',
  'component-parts',
]);

/**
 * Every `component.import` must be `@tdq/ora-components/<key>` where `<key>` is a real
 * `package.json` `exports` key (minus its leading `./`) — never a path `exports` doesn't
 * serve. Returns `{ errors, regressions }`: `errors` is every mismatch (human-readable
 * strings); `regressions` is the subset whose import path is NOT in
 * `KNOWN_LEGACY_IMPORT_MISMATCH_PATHS` — a mismatch on a componentPath nobody has already
 * accepted as legacy drift, which `main()` treats as fatal.
 */
export function validateImportsAgainstExports(components, pkgExports) {
  const validKeys = new Set(
    Object.keys(pkgExports)
      .map(k => k.replace(/^\.\/?/, ''))
      .filter(k => k && k !== 'package.json' && k !== 'style.css'),
  );

  const errors = [];
  const regressions = [];
  const prefix = '@tdq/ora-components/';
  for (const c of components) {
    let error = null;
    let key = null;
    if (!c.import.startsWith(prefix)) {
      error = `${c.name}: import "${c.import}" is not an @tdq/ora-components/* specifier`;
    } else {
      key = c.import.slice(prefix.length);
      if (!validKeys.has(key)) {
        error = `${c.name}: import "${c.import}" has no matching package.json "exports" entry`;
      }
    }
    if (!error) continue;
    errors.push(error);
    if (!(key && KNOWN_LEGACY_IMPORT_MISMATCH_PATHS.has(key))) regressions.push(error);
  }
  return { errors, regressions };
}

/**
 * Strip a trailing `.js` (flat module) or `/index.js` (directory module) from a relative
 * specifier captured out of `dist/index.d.ts`'s `export * from '...'` lines, so
 * `buildComponents`'s `join(distDir, componentPath)` always resolves to the real component
 * directory regardless of whether `scripts/add-nodenext-extensions.mjs` has already run.
 * `package.json`'s `build` script always runs `generate-manifest.mjs` before
 * `add-nodenext-extensions.mjs` (extensions must be added last — see that script's own doc
 * comment), so `dist/index.d.ts` is normally still extensionless when this runs; but
 * re-running `generate-manifest.mjs` standalone against an already-built `dist/` (a
 * legitimate thing to do while iterating locally) sees the already-extensioned form
 * (`export * from './button/index.js'`) — without stripping it, `componentPath` becomes
 * `'button/index.js'`, which resolves to the compiled JS bundle rather than the `.d.ts`
 * directory, so `readAllDts` reads bundled JS text (no `export declare class`/`interface`
 * to match) and the manifest silently regenerates with (near) zero components.
 */
export function stripJsExtension(specifier) {
  return specifier.replace(/(?:\/index)?\.js$/, '');
}

// Resolved from process.argv[1] (this script's own path), not import.meta.url: TypeScript's
// CommonJS transpile (used to run this .mjs file under Jest — see jest-mjs-transformer.cjs)
// can't represent import.meta, so main() — only ever reached via direct CLI invocation, see
// invokedDirectly below — must not depend on it. Same pattern as check-docs-vs-manifest.mjs's
// main().
export function main(scriptPath) {
  const distDir = join(dirname(scriptPath), '../dist');
  const agentDir = join(dirname(scriptPath), '../../../.agent');
  const pkgJson = JSON.parse(readFileSync(join(dirname(scriptPath), '../package.json'), 'utf8'));

  const indexDts = readFileSync(join(distDir, 'index.d.ts'), 'utf8');
  const exportMatches = [...indexDts.matchAll(/export \* from ['"]\.\/(.+?)['"]/g)]
    .map(([full, specifier]) => [full, stripJsExtension(specifier)]);

  // Column builders inflate `list_components`'s payload (one entry per column type) far
  // more than they add value to that "what components exist" overview — `get_component_api`
  // (per-component, opt-in) is where their full method lists belong. Measured on the
  // 2026-09-03 build: enabling nested/interface discovery grows the component count from 38
  // to 60 and the (name+componentName+description+import)-only `list_components` payload
  // from ~9.2KB to ~19.5KB — a ~113% increase, well over the ~30% threshold — so grid
  // `*ColumnBuilder`s are flagged `inline: true` (still present in the full manifest that
  // `get_component_api` reads) so a future MCP-server change can summarise or filter them
  // out of `list_components` without another manifest-generator change.
  const { components, skippedInterfaces } = buildComponents(exportMatches, distDir, agentDir, true);

  if (skippedInterfaces.length > 0) {
    console.warn('generate-manifest: WARN — interface declaration(s) named *Builder/*Component with no doc-map.mjs entry, excluded from the manifest (a real new inline builder needs a doc-map.mjs entry to be published; a base/marker interface like ComponentBuilder never gets one — see isRealInterfaceBuilder):');
    for (const name of skippedInterfaces) console.warn(`  - ${name}`);
  }

  // Pre-existing legacy mismatches (see KNOWN_LEGACY_IMPORT_MISMATCH_PATHS) are a loud WARN,
  // not a build failure — fixing them means editing package.json's "exports" map or
  // renaming component directories, neither in scope here. Anything else — a regression —
  // fails the build: the nested/interface builders this subtask adds (AxisBuilder/Line/
  // Bar/AreaChartBuilder, every grid *ColumnBuilder, sidebar/layout inline interfaces) all
  // resolve cleanly because they reuse the parent `componentPath` rather than guessing (see
  // buildComponents' `example` comment), so a new mismatch here means a real bug in this
  // generator, not more legacy drift. scripts/generate-manifest.test.ts additionally pins
  // the newly-added builders' imports as passing this exact check.
  const { errors: importErrors, regressions } = validateImportsAgainstExports(components, pkgJson.exports ?? {});
  if (importErrors.length > 0) {
    console.warn('generate-manifest: WARN — component import(s) with no matching package.json "exports" entry (pre-existing, out of scope — see KNOWN_LEGACY_IMPORT_MISMATCH_PATHS):');
    for (const e of importErrors) console.warn(`  - ${e}`);
  }
  if (regressions.length > 0) {
    console.error('generate-manifest: FAIL — component import(s) with no matching package.json "exports" entry, and NOT a known pre-existing mismatch:');
    for (const e of regressions) console.error(`  - ${e}`);
    process.exit(1);
  }

  const manifest = {
    version: pkgJson.version,
    generatedAt: new Date().toISOString(),
    components,
  };

  writeFileSync(join(distDir, 'component-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Generated manifest with ${components.length} components`);
}

const invokedDirectly = process.argv[1]?.endsWith('generate-manifest.mjs');
if (invokedDirectly) {
  main(process.argv[1]);
}
