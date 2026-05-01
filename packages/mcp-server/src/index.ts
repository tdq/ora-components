import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { listComponents } from './tools/list-components.js';
import { getComponentApi } from './tools/get-component-api.js';
import { getUsageExample } from './tools/get-usage-example.js';
import { searchComponents } from './tools/search-components.js';
import { getComponentGuide } from './tools/get-component-guide.js';
import { getRouterDocs } from './tools/get-router-docs.js';
import { getArchitectureGuide } from './tools/get-architecture-guide.js';

const server = new McpServer({
  name: 'ora-components',
  version: '0.1.0',
});

server.tool(
  'list_components',
  'List all available Aura UI components with their descriptions',
  {},
  async () => ({
    content: [{ type: 'text', text: JSON.stringify(listComponents(), null, 2) }],
  })
);

server.tool(
  'get_component_api',
  'Get the full API for a specific Aura component including all available methods',
  { name: z.string().describe('Component name (e.g. "ButtonBuilder" or "button")') },
  async ({ name }) => ({
    content: [{ type: 'text', text: JSON.stringify(getComponentApi(name), null, 2) }],
  })
);

server.tool(
  'get_usage_example',
  'Get a usage code example for a specific Aura component',
  { name: z.string().describe('Component name (e.g. "ButtonBuilder" or "button")') },
  async ({ name }) => ({
    content: [{ type: 'text', text: JSON.stringify(getUsageExample(name), null, 2) }],
  })
);

server.tool(
  'search_components',
  'Search for Aura components by keyword — searches component names, descriptions, and method names',
  { query: z.string().default('').describe('Keyword to search for (e.g. "date", "click", "form"). Leave empty to list all.') },
  async ({ query }) => ({
    content: [{ type: 'text', text: JSON.stringify(searchComponents(query), null, 2) }],
  })
);

server.tool(
  'get_component_guide',
  'Get the full usage guide for a specific Aura component — includes detailed method descriptions, examples, and styling notes',
  { name: z.string().describe('Component name (e.g. "ButtonBuilder" or "button")') },
  async ({ name }) => ({
    content: [{ type: 'text', text: JSON.stringify(getComponentGuide(name), null, 2) }],
  })
);

server.tool(
  'get_router_docs',
  'Get the complete routing documentation — RouterBuilder API, LinkBuilder, navigation, route patterns, and examples',
  {},
  async () => ({
    content: [{ type: 'text', text: JSON.stringify(getRouterDocs(), null, 2) }],
  })
);

server.tool(
  'get_architecture_guide',
  'Get an architecture or pattern guide. Topics: architecture, builder-pattern, reactive, theme, glass-effects, icons, component',
  { topic: z.string().describe('Guide topic: architecture | builder-pattern | reactive | theme | glass-effects | icons | component') },
  async ({ topic }) => ({
    content: [{ type: 'text', text: JSON.stringify(getArchitectureGuide(topic), null, 2) }],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
