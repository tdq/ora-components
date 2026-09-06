import { readFileSync, existsSync } from 'fs';
import { getQuickstartPath } from '../data-paths.js';

export function getQuickstart() {
  const filePath = getQuickstartPath();
  if (!existsSync(filePath)) {
    return { error: `Quickstart guide not found at ${filePath}` };
  }

  return {
    content: readFileSync(filePath, 'utf8'),
  };
}
