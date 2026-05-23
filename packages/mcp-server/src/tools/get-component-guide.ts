import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getManifest } from '../manifest.js';
import { getAgentDir } from '../data-paths.js';

export function getComponentGuide(name: string) {
  const manifest = getManifest();
  const component = manifest.components.find(
    c => c.name.toLowerCase() === name.toLowerCase() ||
         c.componentName.toLowerCase() === name.toLowerCase()
  );
  if (!component) {
    return { error: `Component "${name}" not found. Use list_components to see available components.` };
  }

  const compName = component.componentName;
  const componentsDir = join(getAgentDir(), 'components');
  const flatPath = join(componentsDir, `${compName}.md`);
  const subPath = join(componentsDir, compName, `${compName}.md`);

  let filePath = '';
  if (existsSync(flatPath)) filePath = flatPath;
  else if (existsSync(subPath)) filePath = subPath;

  if (!filePath) {
    return { error: `No guide found for component "${name}". The component exists but has no documentation file.` };
  }

  return {
    name: component.name,
    componentName: compName,
    guide: readFileSync(filePath, 'utf8'),
  };
}
