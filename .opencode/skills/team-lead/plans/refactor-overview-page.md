# Plan: Refactor Overview Page to Documentation

**Date**: 2026-05-02
**Task**: Review `overview.ts` for builder-pattern anti-patterns and refactor to align with documented conventions.

## Subtasks

- [x] 1. Refactor `overview.ts` — move post-build `classList.add()` into pre-build `withClass(of('...'))` — aura-dashboard-demo — eliminated all post-build DOM manipulation on PanelBuilder elements
- [x] 2. Update `.agent/landing-page/dashboard-demo.md` — fix stale references (asGlass, withHeight) — aura-components-docs — aligned docs with current implementation
- [x] 3. Code review: refactored overview.ts + updated docs — code-reviewer — LGTM
- [x] 4. QA: validate overview.ts builds correctly, no regressions — qa-tester — Approved, no regressions
- [x] 5. Eliminate all `appendChild` and remaining `classList.add` by using LayoutBuilder for layout — aura-dashboard-demo — zero appendChild, zero classList.add, zero raw div grids
- [x] 6. Code review: LayoutBuilder refactor — code-reviewer — LGTM
- [x] 7. QA: validate LayoutBuilder-based overview.ts — qa-tester — Approved, all requirements met
