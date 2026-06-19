import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getManifest } from '../manifest.js';
import { getExamplesDir } from '../data-paths.js';
import { findFirstStorySource } from './get-component-stories.js';

/** Extract exported function names from a TypeScript source file. */
function extractExports(source: string): string[] {
  const names: string[] = [];
  const re = /^export\s+(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) names.push(m[1]);
  return names;
}

/**
 * Get a usage example for a specific component.
 * Prefers a prepared example from the ora-examples package, falls back to the manifest example.
 * When the examples file exports multiple functions (e.g. chart, grid, layout),
 * the response includes an `exports` array listing available example function names.
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

  const examplesDir = getExamplesDir();
  if (examplesDir) {
    const exampleFilePath = join(examplesDir, `${component.componentName.toLowerCase()}.ts`);
    if (existsSync(exampleFilePath)) {
      const source = readFileSync(exampleFilePath, 'utf8');
      return {
        name: component.name,
        example: source,
        exports: extractExports(source),
        source: 'ora-examples',
      };
    }
  }

  const story = findFirstStorySource(component.componentName);
  if (story) {
    return {
      name: component.name,
      example: story.source,
      exports: extractExports(story.source),
      source: 'storybook',
      file: story.file,
    };
  }

  return {
    name: component.name,
    example: component.example,
    exports: [] as string[],
    source: 'manifest',
  };
}
