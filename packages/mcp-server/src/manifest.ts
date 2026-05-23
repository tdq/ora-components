import { readFileSync } from 'fs';
import { getManifestPath } from './data-paths.js';

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

export interface EnumEntry {
  name: string;
  values: string[];
}

export interface ComponentEntry {
  name: string;
  componentName: string;
  description: string;
  import: string;
  methods: MethodEntry[];
  example: string;
  enums?: EnumEntry[];
}

export interface ComponentManifest {
  version: string;
  generatedAt: string;
  components: ComponentEntry[];
}

let _manifest: ComponentManifest | null = null;

export function getManifest(): ComponentManifest {
  if (_manifest) return _manifest;
  _manifest = JSON.parse(readFileSync(getManifestPath(), 'utf8')) as ComponentManifest;
  return _manifest;
}
