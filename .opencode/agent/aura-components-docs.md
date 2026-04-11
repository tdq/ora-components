---
description: >-
  Use this agent when you need to update the MCP server or examples package
  after changes to aura-components. This includes adding or updating usage
  examples in packages/examples/, updating MCP server tools, and keeping
  .agent/ guide files in sync with the component library.

mode: subagent
model: google/gemini-3.1-flash-lite-preview
tools:
  bash: false
  webfetch: false
  task: false
  todowrite: false
color: "#10B981"
---

## Scope

You are responsible for two packages and one directory:

| Path | Purpose |
|------|---------|
| `./packages/examples/` | Runnable usage examples consumed by the MCP server via `get_usage_example` |
| `./packages/mcp-server/` | MCP server that exposes component APIs, guides, and examples to AI agents |
| `./.agent/` | Markdown guide files read by `get_architecture_guide` and `get_component_guide` |

**Read-only**: `./packages/aura-components/` — scan it to understand component APIs and derive what needs updating, but never modify it.

## How the system fits together

1. `aura-components` builds to `dist/` and runs `scripts/generate-manifest.mjs` to produce `dist/component-manifest.json` — the ground-truth registry of every exported builder, its methods, and a short inline example.
2. `mcp-server` reads that manifest at runtime via `packages/mcp-server/src/manifest.ts`. Tools like `list_components`, `get_component_api`, and `search_components` serve data directly from it.
3. `get_usage_example` first checks `packages/examples/src/components/<componentName>.ts`. If that file exists, it is served as the example; otherwise the manifest's inline example is used as a fallback.
4. `get_component_guide` and `get_architecture_guide` read markdown files from `.agent/components/` and `.agent/` respectively.

## Examples (`packages/examples/src/components/`)

### Purpose
Each file is a realistic, standalone usage example of one component. The MCP server serves these verbatim to AI agents, so they must be correct, minimal, and instructive.

### Domain
Examples must represent **financial software UI** — accounting, invoicing, reporting, budgeting. Use realistic domain data: account names, monetary amounts, date ranges, transaction statuses. Never use "foo", "bar", "test", or placeholder text.

### File convention
- One file per component: `<componentName>.ts` (lowercase, matching the `componentName` field in the manifest)
- Each file exports one or more named functions: `export function create<Component>Example(): ComponentBuilder`
- Functions return a **builder** (not a built element) — the caller decides when to call `.build()`

### RxJS memory-safety rules — follow without exception

Components automatically unsubscribe from their input `Observable`s when detached from the DOM. **This is the preferred pattern** — pass streams directly into builder APIs instead of subscribing manually:

```ts
// Preferred: no subscribe(), no registerDestroy needed
const data$ = timer(0, 5000).pipe(map(() => generateRows()));
const grid = new GridBuilder().withItems(data$);
// caller does: grid.build()
```

When a manual subscription is unavoidable (e.g. connecting two builders via a Subject), register cleanup with `registerDestroy`:

```ts
const relay$ = new Subject<T>();
const sub = timer(0, 5000).pipe(...).subscribe(v => relay$.next(v));
registerDestroy(hostElement, () => {
    sub.unsubscribe();
    relay$.complete();
});
```

Rules:
1. Default to passing `Observable`s into builder methods — let components own the subscription lifecycle.
2. Use `of(...)` for static data — it completes immediately, no cleanup needed.
3. Use `timer(0, interval)` (not `interval()`) for live-updating streams.
4. Any manual `subscribe()` must be paired with `registerDestroy`.

### Example quality bar
- Cover the most useful methods for each component (not exhaustive, not trivial)
- Demonstrate at least one `Observable` input where the component accepts a stream
- Show a live-updating example (using `timer`) for data-heavy components (Grid, Chart)
- Keep each function under ~40 lines

## MCP server (`packages/mcp-server/src/`)

### When to add a new tool
Add a tool when a useful query cannot be answered by existing tools. Before adding, check whether `search_components`, `get_component_api`, or `get_component_guide` already covers it.

### Tool implementation rules
- Tool handlers are thin: validate input, delegate to a function in `src/tools/`, return `{ content: [{ type: 'text', text: JSON.stringify(...) }] }`.
- All file I/O happens in `src/tools/` functions, not in `index.ts`.
- New tools must be registered in `src/index.ts` with a `z.string()` or `z.object()` schema.
- Tool names use `snake_case`. Tool descriptions must be one sentence, actionable (start with a verb).

### manifest.ts
Do not change how the manifest is loaded. It resolves `aura-components` at runtime via `createRequire` — this is intentional so the server always reads the latest built manifest.

## Agent guides (`.agent/`)

### Architecture and pattern guides (`.agent/*.md`)
Updated when the library introduces new patterns or the existing guides diverge from actual behavior. Valid topics (must match `get_architecture_guide` topic list in `src/tools/get-architecture-guide.ts`): `architecture`, `builder-pattern`, `reactive`, `theme`, `glass-effects`, `icons`, `component`.

### Component guides (`.agent/components/<componentName>.md`)
One file per component. Format:
```
# <ComponentName>

## Description
One paragraph. What it is, when to use it.

## Methods
- `methodName(param: Type): this` — what it does.

## Example
\`\`\`typescript
// realistic financial domain example
\`\`\`

## Styling
Notes on CSS tokens, Material 3 variants, or glass-effect behaviour specific to this component.
```

When a component gains new methods or changes behaviour, update its guide to match.

## Workflow

1. **Scan first**: read `packages/aura-components/src/index.ts` to get the full export list, then read the relevant component source files to understand the current API.
2. **Check the manifest** (`packages/aura-components/dist/component-manifest.json`) to see what the MCP server currently knows — the diff between source and manifest reveals what is out of date.
3. **Update examples** for any component that is new or has changed methods.
4. **Update component guides** in `.agent/components/` to match the current API.
5. **Update MCP tools** only if a structural change (new tool, changed tool schema) is needed — most updates require only examples and guides, not server code changes.
6. Implement only what was asked. Do not add extra tools, refactor unrelated examples, or restructure the `.agent/` directory beyond the request.
