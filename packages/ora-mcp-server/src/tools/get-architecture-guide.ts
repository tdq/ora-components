import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getAgentDir } from '../data-paths.js';

const VALID_TOPICS = ['architecture', 'builder-pattern', 'reactive', 'theme', 'glass-effects', 'icons', 'component'];

export function getArchitectureGuide(topic: string) {
  const normalized = topic.toLowerCase().trim();
  if (!VALID_TOPICS.includes(normalized)) {
    return {
      error: `Unknown topic "${topic}". Valid topics: ${VALID_TOPICS.join(', ')}`,
    };
  }

  const filePath = join(getAgentDir(), `${normalized}.md`);
  if (!existsSync(filePath)) {
    return { error: `Guide file for topic "${topic}" not found.` };
  }

  return {
    topic: normalized,
    guide: readFileSync(filePath, 'utf8'),
  };
}
