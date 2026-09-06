import { getManifest } from '../manifest.js';

export function listComponents() {
  const manifest = getManifest();
  return {
    hint: 'Start with get_quickstart for installation, builder pattern, and core concepts.',
    components: manifest.components.map(c => ({
      name: c.name,
      componentName: c.componentName,
      description: c.description,
      import: c.import,
    })),
  };
}
