import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { tools } from './tools-registry.js';
import { getComponentsVersion } from './data-paths.js';

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: '@tdq/ora-components', version: getComponentsVersion() };

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function errorResponse(id: string | number | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

async function dispatch(request: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  const id = request.id ?? null;

  switch (request.method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        },
      };

    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null; // notifications: no response

    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: tools.map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.jsonSchema,
          })),
        },
      };

    case 'tools/call': {
      const params = request.params ?? {};
      const name = params.name as string;
      const args = (params.arguments as Record<string, unknown>) ?? {};
      const tool = tools.find(t => t.name === name);
      if (!tool) return errorResponse(id, -32602, `Unknown tool: ${name}`);
      try {
        const result = await tool.handler(args);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          },
        };
      } catch (err) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
            isError: true,
          },
        };
      }
    }

    default:
      return errorResponse(id, -32601, `Method not found: ${request.method}`);
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Session-Id',
  'Access-Control-Max-Age': '86400',
};

async function mcpHandler(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === 'OPTIONS') {
    return { status: 204, headers: CORS_HEADERS };
  }
  if (req.method === 'GET') {
    return {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      jsonBody: {
        name: SERVER_INFO.name,
        version: SERVER_INFO.version,
        protocol: 'mcp/json-rpc',
        protocolVersion: PROTOCOL_VERSION,
        endpoint: '/api/mcp',
        tools: tools.map(t => ({ name: t.name, description: t.description })),
      },
    };
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      jsonBody: errorResponse(null, -32700, 'Parse error: invalid JSON'),
    };
  }

  const requests = Array.isArray(body) ? body : [body];
  const responses: JsonRpcResponse[] = [];
  for (const r of requests as JsonRpcRequest[]) {
    if (!r || r.jsonrpc !== '2.0' || typeof r.method !== 'string') {
      responses.push(errorResponse(r?.id ?? null, -32600, 'Invalid Request'));
      continue;
    }
    const res = await dispatch(r);
    if (res) responses.push(res);
  }

  if (responses.length === 0) {
    return { status: 202, headers: CORS_HEADERS };
  }

  return {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    jsonBody: Array.isArray(body) ? responses : responses[0],
  };
}

app.http('mcp', {
  route: 'mcp',
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: mcpHandler,
});
