import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { join, dirname } from 'path';

export interface ComponentEntry {
  name: string;
  componentName: string;
  description: string;
  import: string;
  methods: string[];
  example: string;
}

export interface ComponentManifest {
  version: string;
  generatedAt: string;
  components: ComponentEntry[];
}

let _manifest: ComponentManifest | null = null;

export function getManifest(): ComponentManifest {
  if (_manifest) return _manifest;

  // Resolve aura-components package location
  const require = createRequire(import.meta.url);
  const pkgPath = require.resolve('aura-components/package.json');
  const pkgDir = dirname(pkgPath);
  const manifestPath = join(pkgDir, 'dist', 'component-manifest.json');

  _manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ComponentManifest;
  return _manifest;
}
