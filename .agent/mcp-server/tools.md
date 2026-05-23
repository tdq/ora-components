# MCP Server Tools

The server exposes **eight tools**, all declared in `src/tools-registry.ts`. Each is invoked via standard MCP `tools/call` with a `name` and `arguments` object; the result is returned as a single text content block containing pretty-printed JSON.

| Tool | Input | Returns | Data source |
|------|-------|---------|-------------|
| `list_components` | — | Array of `{ name, componentName, description, import }` for every component | Component manifest |
| `search_components` | `query: string` (optional) | Components ranked by relevance across names, descriptions, and method names | Component manifest |
| `get_component_api` | `name: string` | Full `ComponentEntry`: methods, signatures, params, return types, enums | Component manifest |
| `get_component_guide` | `name: string` | `{ name, componentName, guide }` — the long-form markdown guide | `.agent/components/{name}.md` (flat or subdirectory) |
| `get_usage_example` | `name: string` | `{ name, example, source, file? }` — a runnable snippet | ora-examples → Storybook story → manifest snippet (in order) |
| `get_component_stories` | `name: string` | `{ name, componentName, stories: [{ file, storyNames, docs, source }] }` | `packages/stories/src/{name}*.stories.ts` (+ `.docs.mdx`) |
| `get_router_docs` | — | `{ docs }` — full router markdown | `.agent/router.md` |
| `get_architecture_guide` | `topic: string` | `{ topic, guide }` | `.agent/{topic}.md` |

Valid topics for `get_architecture_guide`: `architecture | builder-pattern | reactive | theme | glass-effects | icons | component`.

---

## Tool detail

### `list_components`
Cheap, no-args overview. Returns a trimmed shape (no methods / enums / examples) so an agent can scan the catalogue in one call before drilling in.

### `search_components`
Scoring rules (see `tools/search-components.ts`):
- Exact match on `name` or `componentName` → +100
- Substring match on `name` / `componentName` → +50
- Substring match on `description` → +20
- Method name substring match → +10

Empty query returns the full catalogue (same trimmed shape as `list_components`).

### `get_component_api`
Returns the full `ComponentEntry` straight from the manifest. Component lookup is case-insensitive and matches against both the registered `name` (e.g. `ButtonBuilder`) and the slug `componentName` (e.g. `button`).

### `get_component_guide`
Looks up the markdown guide for a component. Tries two patterns in order:
1. `.agent/components/{componentName}.md` (flat file)
2. `.agent/components/{componentName}/{componentName}.md` (subdirectory — used for grid/chart families)

Returns `{ error }` if the component exists but has no guide on disk.

### `get_usage_example`
Three-tier fallback for "give me code that uses this component":
1. **`ora-examples`** — curated single-purpose examples under `packages/examples/src/components/{lowercase}.ts`. Source label: `ora-examples`.
2. **Storybook** — first matching `*.stories.ts` (exact-name preferred). Source label: `storybook`.
3. **Manifest** — the `example` field embedded in the component manifest. Source label: `manifest`.

The response carries `source` so the agent knows what it's reading; for the Storybook fallback it also includes `file` (e.g. `dialog.stories.ts`).

### `get_component_stories`
Returns all Storybook stories matched to a component. Matching: the story-file basename is either `{componentName}` (exact) or starts with `{componentName}-` (prefix — captures families like `grid-grouping`, `grid-pivot`).

For each matched file the tool returns:
- `file` — the source filename.
- `storyNames` — every named CSF export (e.g. `Styles`, `DynamicStyle`, `Interactive`). Extracted via regex on `export const Name = …`.
- `docs` — the contents of the sibling `{base}.docs.mdx` if it exists, else `null`.
- `source` — the full file content, so the agent can read patterns directly.

Use this when you want to show the agent *idiomatic* usage of a component in context — stories include realistic data, layouts, and RxJS wiring.

### `get_router_docs`
Returns the entire `.agent/router.md` (router builder API, link builder, route patterns, navigation, examples). Cheap, no-args.

### `get_architecture_guide`
Returns one of the top-level `.agent/*.md` guides. Topic is validated against an allowlist before reading.

---

## Adding a new tool

Add an entry to `src/tools-registry.ts`:

```ts
{
  name: 'my_new_tool',
  description: 'What it does.',
  zodSchema: { foo: z.string().describe('...') },
  jsonSchema: {
    type: 'object',
    properties: { foo: { type: 'string', description: '...' } },
    required: ['foo'],
  },
  handler: ({ foo }) => myNewToolImpl(String(foo)),
}
```

Both transports pick it up automatically — no further wiring needed. Update `public/app.js`'s `TOOLS` array and the "N tools" copy in `public/index.html` so the landing page reflects the new count.
