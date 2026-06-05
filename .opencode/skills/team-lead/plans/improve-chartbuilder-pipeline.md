# Plan: Improve ChartBuilder with Optimized Pipeline

**Date**: 2026-06-05
**Task**: Apply `createOptimizedPipeline` and `createLifecycleBoundary` to ChartBuilder, following `money-kpi-card-viewport.ts` pattern.

## Subtasks

- [x] 1. Defer data subscription & add optimized pipeline — `ora-components-dev` — Store `rawData$` in `withData()`, apply `createOptimizedPipeline` in `build()`
- [x] 2. Replace `registerDestroy` with `createLifecycleBoundary` in ChartViewport — `ora-components-dev` — Switch from legacy MutationObserver-based teardown to lifecycle boundary
- [x] 3. Code review: chart-builder.ts and chart-viewport.ts changes — `code-reviewer`
- [x] 4. QA: update tests for IntersectionObserver dependency — `qa-tester`
- [x] 5. Update `.agent/` docs (chart.md, architecture.md) — `ora-components-docs`
- [x] 6. Code review: `.agent/` doc updates — `code-reviewer`
- [x] 7. QA: verify examples and documentation — `qa-tester`
