#!/usr/bin/env node
/**
 * Stage the Azure Functions deployment artifact.
 *
 * Inputs:
 *   - dist/                                       (compiled TS from this package)
 *   - ../ora-components/dist/component-manifest.json
 *   - ../ora-examples/src/components/*.ts
 *   - ../../.agent/**\/*.md                       (architecture + component guides)
 *
 * Outputs:
 *   - api/dist/                                   (compiled JS)
 *   - api/dist/data/component-manifest.json
 *   - api/dist/data/examples/*.ts
 *   - api/dist/data/agent/**\/*.md
 *
 * The Function host (api/package.json -> main = "dist/http-function.js") loads
 * dist/http-function.js, which transitively imports tools-registry and the
 * data readers. Those readers locate data via the bundled ./data folder.
 */
import { cp, mkdir, rm, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');
const MONOREPO_ROOT = resolve(PKG_ROOT, '..', '..');
const SRC_DIST = join(PKG_ROOT, 'dist');
const API_DIST = join(PKG_ROOT, 'api', 'dist');
const DATA_DIR = join(API_DIST, 'data');

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function ensure(p) { await mkdir(p, { recursive: true }); }

async function copyDir(src, dest) {
  if (!(await exists(src))) {
    console.warn(`[stage-api] skip (missing): ${src}`);
    return;
  }
  await ensure(dirname(dest));
  await cp(src, dest, { recursive: true });
}

async function main() {
  if (!(await exists(SRC_DIST))) {
    throw new Error(`Expected compiled output at ${SRC_DIST}. Run tsc first.`);
  }

  // Wipe + recreate api/dist
  if (existsSync(API_DIST)) await rm(API_DIST, { recursive: true, force: true });
  await ensure(API_DIST);

  // 1) Copy compiled JS
  await copyDir(SRC_DIST, API_DIST);

  // 2) Copy component manifest
  const manifestSrc = join(MONOREPO_ROOT, 'packages', 'ora-components', 'dist', 'component-manifest.json');
  await ensure(DATA_DIR);
  if (await exists(manifestSrc)) {
    await cp(manifestSrc, join(DATA_DIR, 'component-manifest.json'));
  } else {
    console.warn(`[stage-api] WARN: component manifest not found at ${manifestSrc}`);
  }

  // 3) Copy ora-examples sources
  const examplesSrc = join(MONOREPO_ROOT, 'packages', 'examples', 'src', 'components');
  await copyDir(examplesSrc, join(DATA_DIR, 'examples'));

  // 3b) Copy Storybook stories (.stories.ts + .docs.mdx + helpers)
  const storiesSrc = join(MONOREPO_ROOT, 'packages', 'stories', 'src');
  if (await exists(storiesSrc)) {
    const target = join(DATA_DIR, 'stories');
    await ensure(target);
    // Selective: only stories, docs, and helpers — skip node_modules, configs, etc.
    const { readdir, copyFile } = await import('node:fs/promises');
    const entries = await readdir(storiesSrc, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = join(storiesSrc, entry.name);
      const dstPath = join(target, entry.name);
      if (entry.isDirectory() && entry.name === 'story-helpers') {
        await cp(srcPath, dstPath, { recursive: true });
      } else if (entry.isFile() && (entry.name.endsWith('.stories.ts') || entry.name.endsWith('.docs.mdx') || entry.name === 'placeholder.ts')) {
        await copyFile(srcPath, dstPath);
      }
    }
  } else {
    console.warn(`[stage-api] WARN: stories source not found at ${storiesSrc}`);
  }

  // 4) Copy .agent docs (architecture + component guides)
  const agentSrc = join(MONOREPO_ROOT, '.agent');
  await copyDir(agentSrc, join(DATA_DIR, 'agent'));

  // 5) Emit a small manifest for traceability
  await writeFile(join(API_DIST, 'staged-at.json'), JSON.stringify({
    stagedAt: new Date().toISOString(),
    monorepoRoot: MONOREPO_ROOT,
  }, null, 2));

  console.log(`[stage-api] OK -> ${API_DIST}`);
}

main().catch(err => {
  console.error('[stage-api] FAILED:', err);
  process.exit(1);
});
