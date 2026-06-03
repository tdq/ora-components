# Plan: Stories Improvement — Enterprise Component Catalogue

**Date**: 2026-05-17
**Task**: Transform Storybook from developer sandbox into credible enterprise component catalogue — consistent structure, zero `alert()`, full state coverage, comprehensive MDX docs.

## Phases & Subtasks

### Phase 0 — Foundation (blockers for all other work)

- [x] 1. Install `@storybook/addon-viewport` — architect — `npm install` in packages/stories
- [x] 2. Create `src/story-helpers/` module — ora-components-dev — action-log.ts, data-generators.ts, demo-controls.ts, glass-backdrop.ts
- [x] 3. Standardize story format (grid-pivot, tabs) — ora-components-dev — convert StoryObj → plain function exports
- [x] 4. Code review: Phase 0 — code-reviewer — LGTM, no blocking issues
- [x] 5. QA: Phase 0 — qa-tester — Approved, NITs fixed (removed deprecated viewport pkg, JSDoc fix)

### Phase 1 — Critical Fixes

- [x] 6. Create `toolbar.stories.ts` — ora-components-dev — Default, WithSearch, Reactive, Disabled stories
- [x] 7. Create `theming.docs.mdx` and delete `theme-manager.stories.ts` — ora-components-dev — comprehensive theming guide under System/
- [x] 8. Replace all `alert()`/`confirm()` calls — ora-components-dev — grid, dialog, product-management stories → action log
- [x] 9. Fix preview area fill + desktop viewports — ora-components-dev — preview.ts decorator, main.ts addons, viewport presets
- [x] 10. Code review: Phase 1 — code-reviewer — BLOCKING fixed (FullCoverage alert), NITs addressed
- [x] 11. QA: Phase 1 — qa-tester — Approved, no blocking issues

### Phase 2 — MDX Enhancement & Structure

- [x] 12. Enhance MDX docs (chart, dialog, grid, tabs, panel) — ora-components-docs — added Styling, When to use, Keyboard, Related components
- [x] 13. Add Styling sections to all existing MDX docs — ora-components-docs — CSS variable tables for all 19 components
- [x] 14. Story organization & naming (P9) — ora-components-dev — category hierarchy, naming sequence, tags, cleanup
- [x] 15. Code review: Phase 2 — code-reviewer — LGTM, nits only
- [x] 16. QA: Phase 2 — qa-tester — BLOCKING fixed (orphaned code in combobox/listbox), approved

### Phase 3 — State Coverage & Grid Improvements

- [x] 17. Standardize state coverage (P4) — ora-components-dev — Loading/Empty/Forbidden/Error states for Grid, Chart, Form, ComboBox, ListBox
- [x] 18. Grid improvements (P5) — ora-components-dev — column chooser, pagination, editable feedback, grouping buttons, withVisible support
- [x] 19. Code review: Phase 3 — code-reviewer — LGTM, nits only
- [x] 20. QA: Phase 3 — qa-tester — Approved, no blocking issues

### Phase 4 — Field/Form Improvements

- [x] 21. Field & form improvements (P6) — ora-components-dev — checkbox indeterminate, combobox async, datepicker constraints, number/money bounds, wizard
- [x] 22. Code review: Phase 4 — code-reviewer — LGTM, nits only
- [x] 23. QA: Phase 4 — qa-tester — Approved (pre-existing issues in other stories noted for final sweep)

### Phase 5 — Real-World Examples (P7)

- [x] 24. Dashboard layout (dashboard.stories.ts) — ora-dashboard-demo — full-screen enterprise dashboard with KPI cards, chart, grid
- [x] 25. Audit log view (audit-log.stories.ts) — ora-dashboard-demo — immutable grid with color-coded action badges
- [x] 26. Confirmation patterns (confirmation-patterns.stories.ts) — ora-dashboard-demo — soft delete, hard delete, bulk action
- [x] 27. Settings panel (settings-panel.stories.ts) — ora-dashboard-demo — tabbed settings with theme switching
- [ ] 28. Code review: Phase 5 — code-reviewer
- [ ] 29. QA: Phase 5 — qa-tester

### Phase 6 — Documentation Polish & .agent/ Updates

- [x] 28. Code review: Phase 5 — code-reviewer — LGTM, nits only
- [x] 29. QA: Phase 5 — qa-tester — Approved, no blocking issues
- [x] 30. Documentation polish (P8) — ora-components-docs — When to use, Keyboard, Related components added to all remaining docs
- [x] 31. Update .agent/ docs — architect — storybook.md rewritten, story-helpers.md created, README/rules updated
- [x] 32. Code review: Phase 6 — code-reviewer — BLOCKING fixed (git add, missing MDX sections)
- [x] 33. QA: Final sweep — qa-tester — BLOCKING fixed (alert, raw buttons, Math.random all replaced)
