# MCP Server Package (`packages/mcp-server`)

The `mcp-server` package is a **Model Context Protocol (MCP) server** that gives LLM coding agents structured, machine-readable knowledge of the `@tdq/ora-components` library — component APIs, usage examples, Storybook stories, and architecture guides.

It ships in two deployable shapes from a single codebase:

| Mode | Transport | Consumer | Entry point |
|------|-----------|----------|-------------|
| **Local** | stdio | OpenCode, Claude Desktop (with stdio bridge), Continue | `dist/index.js` |
| **Remote** | HTTP / JSON-RPC | Cursor, Claude (via `mcp-remote`), any HTTP MCP client | `api/dist/http-function.js` (Azure Functions v4) |

Both modes register **the same tool set** from a single source of truth (`src/tools-registry.ts`), so adding or modifying a tool updates both deployments automatically.

## Core Objectives
1. **Discoverability:** Agents can list, search, and inspect every Aura component without scraping the source.
2. **Working examples:** Every tool returns structured JSON; usage code comes from curated `ora-examples` or real Storybook stories.
3. **Architecture context:** Long-form guides (theme, router, builder pattern, reactive, etc.) are exposed alongside per-component reference.
4. **Zero-friction integration:** A hosted endpoint at `https://mcp.ora-components.com/api/mcp` works with any MCP client over plain JSON-RPC.

## Key Features
- **Eight tools** covering listing, search, full API, usage examples, Storybook stories, component guides, router docs, and architecture guides.
- **Bundled data:** Component manifest, examples, stories, and `.agent` markdown are vendored into the deployment artifact at build time — the server has no runtime monorepo dependency.
- **Dual transport:** stdio for local use; HTTP JSON-RPC for remote / multi-client use.
- **Static landing page:** A polished single-file marketing page at `packages/mcp-server/public/` with live status indicator, copy-ready client configs, and a tool catalogue.

## Directory Structure
- `src/index.ts`: stdio entry point (used by OpenCode locally).
- `src/http-function.ts`: Azure Functions HTTP trigger entry — implements MCP JSON-RPC over POST + a GET discovery endpoint + CORS.
- `src/tools-registry.ts`: Single source of truth — declares every tool with its zod schema, JSON schema, description, and handler.
- `src/tools/`: Individual tool implementations.
- `src/manifest.ts`: Loads the `@tdq/ora-components` component manifest.
- `src/data-paths.ts`: Resolves data sources (bundled `./data` in deployment, monorepo siblings during local dev).
- `api/`: Azure Functions v4 deployment artifact (host.json, package.json, populated `dist/` from the staging script).
- `public/`: Static landing page (`index.html`, `app.js`, `styles.css`, favicon, SWA route config).
- `scripts/stage-api.mjs`: Bundles compiled JS + data files into `api/dist/` for deployment.

## Getting Started for Developers

### Build everything

```bash
# From the monorepo root (Turbo builds component-manifest first)
npm run build --workspace=ora-mcp-server
```

This runs `tsc` and then `node scripts/stage-api.mjs`, which populates `api/dist/` with both compiled code and a self-contained `data/` directory (component manifest, examples, stories, agent docs).

### Run the stdio server locally
```bash
npm run start --workspace=ora-mcp-server
# OpenCode picks this up via .opencode/opencode.json
```

### Run the HTTP server locally
```bash
# Requires Azure Functions Core Tools: npm i -g azure-functions-core-tools@4
cd packages/mcp-server/api
npm install
func start
# Endpoint: http://localhost:7071/api/mcp
```

### Preview the landing page
```bash
npx serve packages/mcp-server/public
# http://localhost:3000 — the live status pulse will show "unavailable"
# unless the Functions host is also running, because the page hard-codes
# https://mcp.ora-components.com/api/mcp as its endpoint.
```

## Deployment

The MCP server is hosted on **Azure Static Web Apps** with its **api** backed by managed Azure Functions. CI/CD is driven by `.github/workflows/azure-static-web-apps-calm-beach-0bfd4e803.yml`.

### CI/CD Pipeline
1. **Install:** `npm ci` at the monorepo root.
2. **Build manifest:** `npm run build --workspace=@tdq/ora-components` produces `component-manifest.json`.
3. **Stage api artifact:** `npm run build --workspace=ora-mcp-server` runs `tsc` + the staging script, producing `packages/mcp-server/api/dist/` with bundled data.
4. **Sanity check:** The workflow verifies `host.json`, `package.json`, `http-function.js`, `data/component-manifest.json`, and `public/index.html` are all present before deploying.
5. **Deploy:** The `Azure/static-web-apps-deploy@v1` action uploads `public/` (landing) and `api/` (functions) with `skip_app_build: true` and `skip_api_build: true` — Oryx does not re-build, since we ship a fully pre-built artifact.

### Why `skip_*_build: true`
The repo is a Turbo monorepo with workspace dependencies. Oryx (Azure's default builder) does not understand workspace symlinks, so running its build inside `api/` would fail. We do the build ourselves with full Turbo context, vendor the data, and hand SWA a ready-to-run folder.

## See Also
- [`architecture.md`](./architecture.md) — transport layer, JSON-RPC dispatch, data resolution model.
- [`tools.md`](./tools.md) — the eight tools, their inputs/outputs, and data sources.
- [`landing-page.md`](./landing-page.md) — the marketing page that ships alongside the api.
- [`deployment.md`](./deployment.md) — the staging script, artifact layout, and SWA configuration.
