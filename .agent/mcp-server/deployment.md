# MCP Server Deployment

The MCP server is deployed to **Azure Static Web Apps** (`https://mcp.ora-components.com`) with managed Azure Functions backing the api. CI/CD lives in `.github/workflows/azure-static-web-apps-calm-beach-0bfd4e803.yml`.

## Deployment Artifact

We ship a **pre-built** artifact and tell Azure not to rebuild it (`skip_app_build: true`, `skip_api_build: true`). This is necessary because the repo is a Turbo monorepo with workspace dependencies — Oryx (SWA's default builder) does not understand workspace symlinks.

```
packages/mcp-server/
├── public/                       ← app_location (uploaded as-is)
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── favicon.svg / favicon.ico
│   └── staticwebapp.config.json
│
└── api/                          ← api_location
    ├── host.json                 ← Functions v4 + extension bundle
    ├── package.json              ← runtime deps only: @azure/functions, zod
    └── dist/                     ← produced by the staging script
        ├── http-function.js      ← entry (package.json `main`)
        ├── tools-registry.js
        ├── data-paths.js
        ├── manifest.js
        ├── tools/*.js
        └── data/
            ├── component-manifest.json
            ├── examples/*.ts
            ├── stories/*.stories.ts + *.docs.mdx + story-helpers/
            └── agent/**/*.md
```

## Staging script (`scripts/stage-api.mjs`)

Run after `tsc`. Produces a self-contained `api/dist/`:

1. **Wipes** `api/dist/` and recreates it.
2. **Copies compiled JS** from `dist/` → `api/dist/`.
3. **Vendors data:**
   - `packages/ora-components/dist/component-manifest.json` → `api/dist/data/component-manifest.json`
   - `packages/examples/src/components/` → `api/dist/data/examples/`
   - `packages/stories/src/` (selective: `*.stories.ts`, `*.docs.mdx`, `story-helpers/`, `placeholder.ts`) → `api/dist/data/stories/`
   - `.agent/` (recursive) → `api/dist/data/agent/`
4. **Writes** `staged-at.json` with a timestamp for traceability.

Missing source folders log a warning rather than failing the build — useful for partial monorepo checkouts but worth checking in CI logs after every deploy.

## CI/CD Workflow

`.github/workflows/azure-static-web-apps-calm-beach-0bfd4e803.yml` — triggers on push and PR events targeting `master`. Concurrency cancellation is enabled so in-flight runs on the same ref are aborted when newer commits arrive.

### Steps
1. **Checkout** — `actions/checkout@v4` with submodules.
2. **Setup Node** — `actions/setup-node@v4` (Node 20, npm cache keyed on `package-lock.json`).
3. **Install:** `npm ci --no-audit --no-fund`.
4. **Build component library:** `npm run build --workspace=@tdq/ora-components --if-present` — produces `component-manifest.json`.
5. **Build MCP server:** `npm run build --workspace=ora-mcp-server` — runs `tsc` + the staging script.
6. **Sanity check:** Verifies the artifact has all required files:
   - `api/host.json`, `api/package.json`, `api/dist/http-function.js`
   - `api/dist/data/component-manifest.json`
   - `public/index.html`
7. **Deploy:** `Azure/static-web-apps-deploy@v1` with `app_location=packages/mcp-server/public`, `api_location=packages/mcp-server/api`, `output_location=''`, both build skips on, and the `AZURE_STATIC_WEB_APPS_API_TOKEN_CALM_BEACH_0BFD4E803` secret.

### PR Previews
On PR open / synchronize, SWA creates an isolated staging environment with its own URL. On PR close the `close_pull_request_job` invokes the SWA action with `action: close` to tear it down.

## Runtime Behaviour

- **Cold start:** ~1–2s on the SWA managed plan. Acceptable for an MCP tool surface, which is sporadic by nature.
- **State:** None. Every POST is independent.
- **Cost:** Free tier covers normal usage; per-invocation pricing kicks in only at very high volume.
- **CORS:** Allowed for all origins on `/api/mcp` — required so cross-origin browser clients (and embedded MCP clients) can connect.

## Custom Domain

`mcp.ora-components.com` is mapped to the SWA app via a CNAME in DNS. The SSL certificate is issued and renewed automatically by Azure. Both the landing page (`app.js#endpoint`) and any client connection snippets use this domain rather than the default `*.azurestaticapps.net` URL.

## Local Equivalents

| Production                                | Local equivalent                               |
|-------------------------------------------|------------------------------------------------|
| `https://mcp.ora-components.com/` (static)| `npx serve packages/mcp-server/public`         |
| `https://mcp.ora-components.com/api/mcp`  | `cd packages/mcp-server/api && func start` → `http://localhost:7071/api/mcp` |
| Stdio MCP server                          | `node packages/mcp-server/dist/index.js`       |

## Rollback

Static Web Apps does **not** keep prior deployment slots. To roll back, re-run the workflow on the last good commit (`gh workflow run` or push a revert). PR preview environments are isolated and never affect the production slot.
