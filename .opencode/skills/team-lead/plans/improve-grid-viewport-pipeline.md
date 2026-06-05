# Plan: Improve GridBuilder with Viewport-Gated Data Pipeline

**Date**: 2026-06-05
**Task**: Apply `createOptimizedPipeline` and `createLifecycleBoundary` to GridBuilder (following MoneyKPICardViewport pattern) for lazy data subscriptions, instant traffic cutting on viewport exit, and deterministic teardown.

## Subtasks

- [x] 1. Gate `items$` with `createOptimizedPipeline` and replace `registerDestroy` with `createLifecycleBoundary` in GridBuilder — ora-components-dev — defer items subscription, wrap in optimized pipeline, use lifecycle-boundary teardown
- [x] 2. Update grid stories — ora-storybook-dev — verify existing stories still work, document lazy pipeline behaviour
- [x] 3. Update grid tests for IntersectionObserver mock — ora-components-dev — add mock, fix any test regressions
- [x] 4. Code review: grid-builder.ts, grid-viewport.ts, test changes, docs — code-reviewer
- [x] 5. QA: lazy pipeline behaviour and test coverage — qa-tester
- [x] 6. Sync .agent/ docs and MCP server — ora-components-docs — update grid.md, reactive.md, architecture.md
- [x] 7. Code review: docs and MCP changes — code-reviewer
- [x] 8. QA: docs and examples — qa-tester
