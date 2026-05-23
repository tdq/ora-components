import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getManifest } from '../manifest.js';
import { getExamplesDir } from '../data-paths.js';
import { findFirstStorySource } from './get-component-stories.js';

/**
 * Get a usage example for a specific component.
 * Prefers a prepared example from the ora-examples package, falls back to the manifest example.
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
      return {
        name: component.name,
        example: readFileSync(exampleFilePath, 'utf8'),
        source: 'ora-examples',
      };
    }
  }

  const story = findFirstStorySource(component.componentName);
  if (story) {
    return {
      name: component.name,
      example: story.source,
      source: 'storybook',
      file: story.file,
    };
  }

  return {
    name: component.name,
    example: component.example,
    source: 'manifest',
  };
}
