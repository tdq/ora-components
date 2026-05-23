import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * When the server runs in a bundled/deployed context (Azure Functions),
 * data is colocated next to the compiled code under ./data.
 * When running from the monorepo, fall back to the workspace siblings.
 */
function resolveDataDir(): string | null {
  const envDir = process.env.MCP_DATA_DIR;
  if (envDir && existsSync(envDir)) return envDir;
  const bundled = join(__dirname, 'data');
  if (existsSync(bundled)) return bundled;
  const bundledNested = join(__dirname, '..', 'data');
  if (existsSync(bundledNested)) return bundledNested;
  return null;
}

const DATA_DIR = resolveDataDir();

export function getManifestPath(): string {
  if (DATA_DIR) {
    const p = join(DATA_DIR, 'component-manifest.json');
    if (existsSync(p)) return p;
  }
  // Monorepo fallback
  const require = createRequire(import.meta.url);
  const pkgPath = require.resolve('@tdq/ora-components/package.json');
  return join(dirname(pkgPath), 'dist', 'component-manifest.json');
}

export function getComponentsVersion(): string {
  // Deployed: read version from the bundled component manifest
  if (DATA_DIR) {
    const manifestPath = join(DATA_DIR, 'component-manifest.json');
    if (existsSync(manifestPath)) {
      try {
        const { version } = JSON.parse(readFileSync(manifestPath, 'utf8'));
        if (version) return version as string;
      } catch { /* fall through */ }
    }
  }
  // Monorepo: read directly from @tdq/ora-components package.json
  const require = createRequire(import.meta.url);
  const pkgPath = require.resolve('@tdq/ora-components/package.json');
  const { version } = JSON.parse(readFileSync(pkgPath, 'utf8'));
  return version as string;
}

export function getAgentDir(): string {
  if (DATA_DIR) {
    const p = join(DATA_DIR, 'agent');
    if (existsSync(p)) return p;
  }
  // Monorepo fallback: src/tools -> ../../../../.agent
  return join(__dirname, '..', '..', '..', '..', '.agent');
}

export function getExamplesDir(): string | null {
  if (DATA_DIR) {
    const p = join(DATA_DIR, 'examples');
    if (existsSync(p)) return p;
  }
  try {
    const require = createRequire(import.meta.url);
    const pkgPath = require.resolve('ora-examples/package.json');
    return join(dirname(pkgPath), 'src', 'components');
  } catch {
    return null;
  }
}

export function getStoriesDir(): string | null {
  if (DATA_DIR) {
    const p = join(DATA_DIR, 'stories');
    if (existsSync(p)) return p;
  }
  // Monorepo fallback: src/tools -> ../../../../packages/stories/src
  const monorepoSrc = join(__dirname, '..', '..', '..', '..', 'packages', 'stories', 'src');
  if (existsSync(monorepoSrc)) return monorepoSrc;
  return null;
}
