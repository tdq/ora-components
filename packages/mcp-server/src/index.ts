import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { listComponents } from './tools/list-components.js';
import { getComponentApi } from './tools/get-component-api.js';
import { getUsageExample } from './tools/get-usage-example.js';

const server = new McpServer({
  name: 'aura-components',
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

const transport = new StdioServerTransport();
await server.connect(transport);
