import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { join, dirname } from 'path';

export interface MethodParam {
  name: string;
  type: string;
}

export interface MethodEntry {
  name: string;
  signature: string;
  description?: string;
  params: MethodParam[];
  returnType: string;
}

export interface ComponentEntry {
  name: string;
  componentName: string;
  description: string;
  import: string;
  methods: MethodEntry[];
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

  // Resolve @tdq/ora-components package location
  const require = createRequire(import.meta.url);
  const pkgPath = require.resolve('@tdq/ora-components/package.json');
  const pkgDir = dirname(pkgPath);
  const manifestPath = join(pkgDir, 'dist', 'component-manifest.json');

  _manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ComponentManifest;
  return _manifest;
}
