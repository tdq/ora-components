# Plan: Rename a1-components to ora-components

**Date**: 2026-05-01
**Task**: Rename all references from a1-components to ora-components across the monorepo — directory, package name, imports, configs, documentation, and root directory.

## Subtasks

- [x] 1. Bulk text replacement: replace `a1-components` → `ora-components`, `a1-components.css` → `ora-components.css`, `a1-monorepo` → `ora-monorepo` across all source files — direct
- [x] 2. Rename directories: `packages/a1-components/` → `packages/ora-components/`, root `a1-components/` → `ora-components/` — direct
- [x] 3. Re-link and build: delete node_modules/package-lock.json, npm install, full build, verify `dist/ora-components.css` exists — direct
- [x] 4. Run tests: `npm test` — direct
- [x] 5. Code review — code-reviewer (LGTM)
- [x] 6. QA — qa-tester (PASS, 13 pre-existing failures verified)
- [x] 7. Update .agent/ documentation — architect
