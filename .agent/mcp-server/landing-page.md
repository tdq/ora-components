# MCP Landing Page (`packages/mcp-server/public/`)

A self-contained static marketing site that ships alongside the api. Three files, no build step, no JS framework.

## Files
- `index.html` — markup and section structure.
- `styles.css` — design system (dark theme, glassmorphism, gradient accents).
- `app.js` — dynamic content: tool grid, copy-to-clipboard, live status check.
- `favicon.svg` / `favicon.ico` — copied from `packages/landing-page/public/` so the brand mark in the header matches the main Ora site.
- `staticwebapp.config.json` — Azure SWA routing + cache headers + CORS for `/api/mcp`.

## Sections

### 1. Header
- Brand: `favicon.svg` background image + the `Ora /mcp` wordmark.
- Nav links: Tools, Connect, API, plus a ghost button linking directly to `/api/mcp`.

### 2. Hero
- Eyebrow chip with a **live status indicator** (`#status-pulse` + `#status-text`):
  - Starts grey, "checking…".
  - Resolves to green pulsing "online" or red static "unavailable" based on a real `GET https://mcp.ora-components.com/api/mcp` call with a 5-second timeout (see `app.js#checkStatus`).
- Headline with a gradient highlight.
- Two CTAs: primary "Copy Claude Desktop config" (clipboard), secondary anchor to `#connect`.
- Stat strip: tool count (populated from the live response), 30+ components, HTTP / JSON-RPC 2.0.

### 3. Tools (`#tools`)
A grid of cards built from the `TOOLS` array in `app.js`. Each card shows the tool name (mono, accent color) and a one-line description. Add a tool? Update the array and bump the heading "Eight tools, one endpoint."

### 4. Connect (`#connect`)
Four copy-ready config snippets, generated in `app.js`:
- **Claude Desktop** — uses `npx mcp-remote` to bridge stdio ↔ remote HTTP.
- **Cursor / Continue** — direct HTTP transport entry.
- **OpenCode** — remote MCP entry (`type: 'remote'`).
- **curl** — raw JSON-RPC `tools/list` invocation.

All four reference the **production endpoint** `https://mcp.ora-components.com/api/mcp` (hard-coded in `app.js`, not derived from `location.origin`). This means the snippets remain correct even when the page is served from a PR preview environment or `npx serve` locally.

### 5. API (`#api`)
Lists the three core JSON-RPC methods: `initialize`, `tools/list`, `tools/call`.

### 6. Footer
- Links to the MCP spec and the live endpoint.

## Design Tokens

Defined as CSS variables in `:root` (top of `styles.css`):
- Background: `--bg` (#07090f) with grid overlay + radial glows for depth.
- Accents: `--accent` (cyan), `--accent-2` (violet), `--accent-3` (pink) used together as the brand gradient.
- Panels: `--panel` (translucent white) on `--panel-border` for the glass effect.
- Status: `--good` (emerald) for "online".

## Static Web App Routing

`staticwebapp.config.json` declares:
- `cache-control: no-cache` for `index.html` (fresh on every load).
- `cache-control: max-age=3600` for `styles.css` and `app.js`.
- Permissive CORS on `/api/mcp` so cross-origin MCP clients can connect.
- SPA fallback to `index.html`, excluding `/api/*` and static assets.

## Previewing locally

```bash
npx serve packages/mcp-server/public
```

The page renders identically to production. The live status check will show "unavailable" unless the production endpoint is reachable; the rest of the page works fully (copy snippets, tool grid, layout).
