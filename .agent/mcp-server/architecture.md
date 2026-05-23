# MCP Server Architecture

The MCP server is intentionally split into a **transport-agnostic core** and **two thin transport adapters**. This lets the same tool set serve a local stdio client (OpenCode) and a hosted HTTP endpoint (Azure Functions) without code duplication or behavioural drift.

## Layered View

```
┌────────────────────────────────────────────────────────────┐
│                     Tool registry                          │
│           src/tools-registry.ts (one source of truth)      │
│           ──────────────────────────────────────            │
│   Each entry: { name, description, zodSchema,              │
│                 jsonSchema, handler }                      │
└──────────────┬─────────────────────────────┬───────────────┘
               │                             │
               ▼                             ▼
   ┌────────────────────────┐    ┌───────────────────────────┐
   │  stdio adapter         │    │  HTTP adapter              │
   │  src/index.ts          │    │  src/http-function.ts      │
   │  ─────────────         │    │  ────────────────────      │
   │  Uses @modelcontext-   │    │  Azure Functions v4        │
   │  protocol/sdk's        │    │  POST → manual JSON-RPC    │
   │  McpServer +           │    │  GET  → discovery payload  │
   │  StdioServerTransport  │    │  OPTIONS → CORS preflight  │
   └────────────────────────┘    └───────────────────────────┘
                                              │
                                              ▼
                                   ┌──────────────────────┐
                                   │  Tool handlers       │
                                   │  src/tools/*.ts      │
                                   └──────────┬───────────┘
                                              │
                                              ▼
                                   ┌──────────────────────┐
                                   │  Data resolution     │
                                   │  src/data-paths.ts   │
                                   │  (bundled vs sibling)│
                                   └──────────────────────┘
```

## The Tool Registry (`src/tools-registry.ts`)

A single `tools: ToolDef[]` array drives both transports. Each entry carries:
- `name` and `description` — surfaced to the agent via `tools/list`.
- `zodSchema` — used by the stdio `McpServer.tool(...)` call for runtime validation.
- `jsonSchema` — emitted in the HTTP `tools/list` response as the inputSchema for each tool.
- `handler(args)` — the actual implementation, returns plain JSON.

The duplication between zod + JSON schema is deliberate and small: we don't ship a zod→JSON schema converter in the api bundle, and the schemas here are simple (one or zero string parameters per tool).

## Stdio adapter (`src/index.ts`)
Iterates the registry and registers each tool with `McpServer` from `@modelcontextprotocol/sdk`. The handler result is wrapped as MCP text content:

```ts
{ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
```

Then `await server.connect(new StdioServerTransport())` — process speaks MCP over stdin/stdout. This is what OpenCode invokes via `.opencode/opencode.json`.

## HTTP adapter (`src/http-function.ts`)
Registers a single Azure Functions HTTP trigger at `/api/mcp` that responds to:

| Method  | Purpose                                                    |
|---------|------------------------------------------------------------|
| `GET`   | Returns server discovery payload (name, version, tools list)|
| `POST`  | JSON-RPC 2.0 — handles `initialize`, `tools/list`, `tools/call`, `notifications/*`, `ping` |
| `OPTIONS` | CORS preflight (Access-Control-Allow-Origin: `*`)        |

### Why hand-rolled JSON-RPC instead of the SDK's StreamableHTTPServerTransport
The SDK's HTTP transport expects Node's `IncomingMessage`/`ServerResponse`. Azure Functions v4 hands you `HttpRequest`/`HttpResponseInit` (fetch-style). Bridging the streams reliably inside the Functions runtime is fragile; for a stateless, request/response tool surface a tiny custom dispatcher is bulletproof and zero-dep — the adapter is ~150 lines and validated against the protocol's bare essentials.

### Statelessness
The HTTP adapter holds no session state. Every POST is treated independently. The `initialize` method returns server info but does not allocate anything — clients that issue multiple requests can interleave freely. This matches the SWA managed-functions model (no warm-state guarantees).

### Batching
The dispatcher accepts both a single JSON-RPC object and a JSON-RPC batch array. Notifications (methods starting with `notifications/`) produce no response and are omitted from the batch reply. If every entry is a notification, the response is `202 Accepted` with no body.

## Data Resolution (`src/data-paths.ts`)

The tool handlers read three external assets:
- The component manifest (`component-manifest.json`)
- Curated component examples (`ora-examples/src/components/*.ts`)
- Storybook stories (`packages/stories/src/*.stories.ts`)
- `.agent/` markdown (architecture guides and per-component guides)

`data-paths.ts` resolves each via a layered lookup:

1. **`MCP_DATA_DIR` env var** — explicit override.
2. **Bundled `./data` or `../data`** relative to the compiled JS — used in deployment, where the staging script vendors everything next to the code.
3. **Monorepo siblings** — used during local dev (`packages/ora-components/dist/component-manifest.json`, `packages/examples/src/components/`, `packages/stories/src/`, `.agent/`).

This means the same compiled code runs identically in the developer's workspace and in the deployed Function — only the data location changes.

## Build & Staging Pipeline

`npm run build` in `packages/mcp-server/` runs:

```
tsc                         # src/**.ts        → dist/**.js
node scripts/stage-api.mjs  # dist/**.js       → api/dist/**.js
                            # ora-components   → api/dist/data/component-manifest.json
                            # examples         → api/dist/data/examples/
                            # stories          → api/dist/data/stories/
                            # .agent           → api/dist/data/agent/
```

The result is a self-contained `api/` folder ready to ship to Azure: `host.json` + `package.json` (declares only `@azure/functions` + `zod` at runtime) + `dist/` (compiled JS + vendored data).

## Why not Express or a Container
Static Web Apps gives us free hosting, automatic HTTPS, PR preview environments, and a globally distributed edge — at no per-request cost up to generous free-tier limits. The constraint (no long-lived process, no streaming session state) maps cleanly to MCP's request/response tool calls, so we accept it rather than reach for App Service or AKS.
