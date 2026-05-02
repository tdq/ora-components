# Plan: Use KPICardBuilder (extends PanelBuilder) for KPI Cards in Demo

**Date**: 2026-05-02
**Task**: Create a demo-local KPICardBuilder that wraps PanelBuilder + LayoutBuilder + LabelBuilder to replace innerHTML KPI card templates in all 5 dashboard files.

## Subtasks

- [x] 1. Create KPICardBuilder helper — aura-dashboard-demo — `packages/landing-page/src/demo/dashboard/kpi-card.ts` with `withLabel`, `withValue`, `withTrend`, `withAccentColor`, `withFooter`, `asMinimal` methods
- [x] 2. Refactor 5 demo files to use KPICardBuilder — aura-dashboard-demo — overview.ts, pl.ts, ledger.ts, orders.ts, payables.ts
- [x] 3. Code review: KPICardBuilder + demo changes — LGTM (1 nit: LabelBuilder font) — code-reviewer
- [x] 4. QA: validate KPI cards render correctly, no regressions — qa-tester — Approved
