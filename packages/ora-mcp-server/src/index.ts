import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { tools } from './tools-registry.js';
import { getComponentsVersion } from './data-paths.js';

const server = new McpServer({
  name: '@tdq/ora-components',
  version: getComponentsVersion(),
});

for (const tool of tools) {
  server.tool(
    tool.name,
    tool.description,
    tool.zodSchema,
    async (args: Record<string, unknown>) => ({
      content: [{ type: 'text', text: JSON.stringify(await tool.handler(args), null, 2) }],
    })
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
