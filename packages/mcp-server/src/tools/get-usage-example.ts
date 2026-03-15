import { getManifest } from '../manifest.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { createRequire } from 'module';

/**
 * Get a usage example for a specific component.
 * It first tries to find a prepared example in the aura-examples package.
 * If not found, it falls back to the example in the component manifest.
 */
export function getUsageExample(name: string) {
  const manifest = getManifest();
  const component = manifest.components.find(
    c => c.name.toLowerCase() === name.toLowerCase() ||
         c.componentName.toLowerCase() === name.toLowerCase()
  );

  if (!component) {
    return { error: `Component "${name}" not found. Use list_components to see available components.` };
  }

  // Try to get a prepared example from the aura-examples package
  try {
    const require = createRequire(import.meta.url);
    const examplesPkgPath = require.resolve('aura-examples/package.json');
    const examplesPkgDir = dirname(examplesPkgPath);
    const exampleFilePath = join(examplesPkgDir, 'src', 'components', `${component.componentName.toLowerCase()}.ts`);

    if (existsSync(exampleFilePath)) {
      const example = readFileSync(exampleFilePath, 'utf8');
      return {
        name: component.name,
        example,
        source: 'aura-examples'
      };
    }
  } catch (e) {
    // Fallback if aura-examples is not found or other issues
  }

  // Fallback to manifest example
  return {
    name: component.name,
    example: component.example,
    source: 'manifest'
  };
}
