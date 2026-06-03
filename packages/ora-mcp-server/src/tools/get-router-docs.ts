import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getAgentDir } from '../data-paths.js';

export function getRouterDocs() {
  const filePath = join(getAgentDir(), 'router.md');
  if (!existsSync(filePath)) {
    return { error: 'Router documentation not found.' };
  }
  return {
    docs: readFileSync(filePath, 'utf8'),
  };
}
