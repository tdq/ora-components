import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { getManifest } from '../manifest.js';
import { getStoriesDir } from '../data-paths.js';

const STORY_EXT = '.stories.ts';

function listStoryFiles(dir: string): string[] {
  try {
    return readdirSync(dir).filter(f => f.endsWith(STORY_EXT));
  } catch {
    return [];
  }
}

function extractStoryNames(source: string): string[] {
  // Storybook CSF: each named export is a story (excluding `default`).
  const out: string[] = [];
  const re = /export\s+const\s+([A-Z][A-Za-z0-9_]*)\s*[:=]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) out.push(m[1]);
  return out;
}

function extractDocsMdx(dir: string, base: string): string | null {
  const mdx = join(dir, `${base}.docs.mdx`);
  if (existsSync(mdx) && statSync(mdx).isFile()) {
    return readFileSync(mdx, 'utf8');
  }
  return null;
}

export function getComponentStories(name: string) {
  const manifest = getManifest();
  const component = manifest.components.find(
    c => c.name.toLowerCase() === name.toLowerCase() ||
         c.componentName.toLowerCase() === name.toLowerCase()
  );
  if (!component) {
    return { error: `Component "${name}" not found. Use list_components to see available components.` };
  }

  const storiesDir = getStoriesDir();
  if (!storiesDir) {
    return { error: 'Storybook stories are not bundled with this MCP server.' };
  }

  const compLower = component.componentName.toLowerCase();
  const files = listStoryFiles(storiesDir).filter(f => {
    const base = f.slice(0, -STORY_EXT.length);
    return base === compLower || base.startsWith(`${compLower}-`);
  });

  if (files.length === 0) {
    return {
      name: component.name,
      componentName: component.componentName,
      stories: [],
      message: `No Storybook stories found for "${name}".`,
    };
  }

  const stories = files.map(file => {
    const base = file.slice(0, -STORY_EXT.length);
    const source = readFileSync(join(storiesDir, file), 'utf8');
    return {
      file,
      storyNames: extractStoryNames(source),
      docs: extractDocsMdx(storiesDir, base),
      source,
    };
  });

  return {
    name: component.name,
    componentName: component.componentName,
    stories,
  };
}

/** Lightweight lookup used by get_usage_example as a fallback. */
export function findFirstStorySource(componentName: string): { file: string; source: string } | null {
  const storiesDir = getStoriesDir();
  if (!storiesDir) return null;
  const lc = componentName.toLowerCase();
  const candidates = listStoryFiles(storiesDir).filter(f => {
    const base = f.slice(0, -STORY_EXT.length);
    return base === lc || base.startsWith(`${lc}-`);
  });
  if (candidates.length === 0) return null;
  // Prefer the exact-match file
  const exact = candidates.find(f => f === `${lc}${STORY_EXT}`);
  const file = exact ?? candidates[0];
  return { file, source: readFileSync(join(storiesDir, file), 'utf8') };
}
