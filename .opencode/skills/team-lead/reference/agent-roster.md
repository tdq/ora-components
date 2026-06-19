# Agent Roster — Detailed Selection Guide

## Selection by File Area

Use this table when a subtask touches files in multiple areas. Each file path prefix maps to a specific agent.

| File Path Prefix | Agent |
|---|---|
| `packages/ora-components/src/` (core lib, not stories) | `ora-components-dev` |
| `packages/ora-components/src/stories/` | `ora-storybook-dev` |
| `packages/stories/src/` | `ora-storybook-dev` |
| `packages/landing-page/src/` (excluding `demo/`) | `landing-page` |
| `packages/landing-page/src/demo/` | `ora-dashboard-demo` |
| `packages/examples/` | `ora-components-docs` |
| `packages/mcp-server/` | `ora-components-docs` |
| `.agent/` (documentation updates) | `ora-components-docs` or `architect` |

## When to Use Each Agent

### `ora-components-dev`
- Creating or modifying component builders in the core library.
- Changing component logic, reactive state, or rendering.
- Writing or updating component unit tests (`*.spec.ts`).

### `ora-storybook-dev`
- Creating or updating `.stories.ts` files.
- Writing Storybook MDX documentation.
- Adding interactive story examples or controls.

### `landing-page`
- Modifying the marketing landing page (hero, features, pricing, etc.).
- Changing the header, footer, or site chrome outside the demo area.
- **Does not** touch `packages/landing-page/src/demo/`.

### `ora-dashboard-demo`
- Developing or improving the interactive demo dashboard within the landing page.
- Adding demo pages, data visualizations, or mock data.
- Must follow memory-safe RxJS patterns.

### `ora-components-docs`
- Updating usage examples in `packages/examples/`.
- Modifying MCP server tools to expose component APIs.
- Syncing `.agent/` guide files with component changes.

### `architect`
- Providing architectural context before starting work.
- Proposing solution approaches for non-trivial changes.
- Updating project documentation in `.agent/` after changes land.
- **Consult first** before any non-trivial component work.

### `code-reviewer`
- Reviews any code change for quality, correctness, and architecture alignment.
- Used after every dev agent completes a subtask.

### `qa-tester`
- Validates changes against acceptance criteria.
- Writes or updates test coverage for new features and bug fixes.
- Used after every code review passes.

## Multi-Area Subtasks

If a subtask spans multiple file areas, split it into one brief per agent in dependency order. For example:
- Component change + story update → `ora-components-dev` first, then `ora-storybook-dev`.
- Component change + example update → `ora-components-dev` first, then `ora-components-docs`.
- Component change + demo usage → `ora-components-dev` first, then `ora-dashboard-demo`.
