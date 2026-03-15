import { getManifest } from '../manifest.js';

export function getComponentApi(name: string) {
  const manifest = getManifest();
  const component = manifest.components.find(
    c => c.name.toLowerCase() === name.toLowerCase() ||
         c.componentName.toLowerCase() === name.toLowerCase()
  );
  if (!component) {
    return { error: `Component "${name}" not found. Use list_components to see available components.` };
  }
  return component;
}
