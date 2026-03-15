import { getManifest } from '../manifest.js';

export function listComponents() {
  const manifest = getManifest();
  return manifest.components.map(c => ({
    name: c.name,
    componentName: c.componentName,
    description: c.description,
    import: c.import,
  }));
}
