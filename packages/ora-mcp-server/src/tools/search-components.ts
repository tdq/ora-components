import { getManifest } from '../manifest.js';

export function searchComponents(query: string) {
  const manifest = getManifest();
  const q = query.toLowerCase().trim();
  if (!q) return manifest.components.map(c => ({ name: c.name, componentName: c.componentName, description: c.description, import: c.import }));

  const scored = manifest.components.map(component => {
    let score = 0;
    const nameLower = component.name.toLowerCase();
    const compNameLower = component.componentName.toLowerCase();
    const descLower = component.description.toLowerCase();

    if (nameLower === q || compNameLower === q) score += 100;
    else if (nameLower.includes(q) || compNameLower.includes(q)) score += 50;
    if (descLower.includes(q)) score += 20;
    // Check method names
    const methodMatch = component.methods.some(m => m.name.toLowerCase().includes(q));
    if (methodMatch) score += 10;

    return { score, component };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => ({
      name: s.component.name,
      componentName: s.component.componentName,
      description: s.component.description,
      import: s.component.import,
    }));
}
