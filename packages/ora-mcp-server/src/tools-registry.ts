import { z } from 'zod';
import { listComponents } from './tools/list-components.js';
import { getComponentApi } from './tools/get-component-api.js';
import { getUsageExample } from './tools/get-usage-example.js';
import { searchComponents } from './tools/search-components.js';
import { getComponentGuide } from './tools/get-component-guide.js';
import { getComponentStories } from './tools/get-component-stories.js';
import { getRouterDocs } from './tools/get-router-docs.js';
import { getArchitectureGuide } from './tools/get-architecture-guide.js';

export interface ToolDef {
  name: string;
  description: string;
  zodSchema: z.ZodRawShape;
  jsonSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => unknown | Promise<unknown>;
}

const emptyJsonSchema = { type: 'object', properties: {}, additionalProperties: false };

export const tools: ToolDef[] = [
  {
    name: 'list_components',
    description: 'List all available Aura UI components with their descriptions',
    zodSchema: {},
    jsonSchema: emptyJsonSchema,
    handler: () => listComponents(),
  },
  {
    name: 'get_component_api',
    description: 'Get the full API for a specific Aura component including all available methods',
    zodSchema: { name: z.string().describe('Component name (e.g. "ButtonBuilder" or "button")') },
    jsonSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Component name (e.g. "ButtonBuilder" or "button")' } },
      required: ['name'],
    },
    handler: ({ name }) => getComponentApi(String(name)),
  },
  {
    name: 'get_usage_example',
    description: 'Get usage code examples for a specific Aura component. Returns the full examples file and an "exports" array listing every available example function. Components with rich examples (chart, grid, layout, button, label, panel, textfield) have multiple named patterns covering all variants and API options.',
    zodSchema: { name: z.string().describe('Component name (e.g. "ChartBuilder", "chart", "GridBuilder", "grid", "LayoutBuilder", "layout")') },
    jsonSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Component name (e.g. "ChartBuilder", "chart", "GridBuilder", "grid", "LayoutBuilder", "layout")' } },
      required: ['name'],
    },
    handler: ({ name }) => getUsageExample(String(name)),
  },
  {
    name: 'search_components',
    description: 'Search for Aura components by keyword — searches component names, descriptions, and method names',
    zodSchema: { query: z.string().default('').describe('Keyword to search for (e.g. "date", "click", "form"). Leave empty to list all.') },
    jsonSchema: {
      type: 'object',
      properties: { query: { type: 'string', default: '', description: 'Keyword to search for. Leave empty to list all.' } },
    },
    handler: ({ query }) => searchComponents(String(query ?? '')),
  },
  {
    name: 'get_component_guide',
    description: 'Get the full usage guide for a specific Aura component — includes detailed method descriptions, examples, and styling notes',
    zodSchema: { name: z.string().describe('Component name (e.g. "ButtonBuilder" or "button")') },
    jsonSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Component name (e.g. "ButtonBuilder" or "button")' } },
      required: ['name'],
    },
    handler: ({ name }) => getComponentGuide(String(name)),
  },
  {
    name: 'get_component_stories',
    description: 'Get all Storybook stories for a specific Aura component — returns the full source of each .stories.ts file, the list of story names, and any accompanying .docs.mdx.',
    zodSchema: { name: z.string().describe('Component name (e.g. "ButtonBuilder" or "button")') },
    jsonSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Component name (e.g. "ButtonBuilder" or "button")' } },
      required: ['name'],
    },
    handler: ({ name }) => getComponentStories(String(name)),
  },
  {
    name: 'get_router_docs',
    description: 'Get the complete routing documentation — RouterBuilder API, LinkBuilder, navigation, route patterns, and examples',
    zodSchema: {},
    jsonSchema: emptyJsonSchema,
    handler: () => getRouterDocs(),
  },
  {
    name: 'get_architecture_guide',
    description: 'Get an architecture or pattern guide. Topics: architecture, builder-pattern, reactive, theme, glass-effects, icons, component, layout. Use "layout" for LayoutBuilder patterns — SlotSize, LayoutGap, Alignment, nesting, app-shell, chart sizing, and reactive classes.',
    zodSchema: { topic: z.string().describe('Guide topic: architecture | builder-pattern | reactive | theme | glass-effects | icons | component | layout') },
    jsonSchema: {
      type: 'object',
      properties: { topic: { type: 'string', description: 'Guide topic: architecture | builder-pattern | reactive | theme | glass-effects | icons | component | layout' } },
      required: ['topic'],
    },
    handler: ({ topic }) => getArchitectureGuide(String(topic)),
  },
];
