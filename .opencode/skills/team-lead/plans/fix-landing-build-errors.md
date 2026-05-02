# Plan: Fix Landing Page Build Errors (v2 — Fix Consumer Deps)

**Date**: 2026-05-01
**Task**: Fix 23 TypeScript build errors by aligning consumer package dependencies and imports with the actual package name `@tdq/ora-components`

## Subtasks

- [x] 1. (v1) Build ora-components type declarations — ora-components-dev — Regenerate `.d.ts` files in `dist/` so modules resolve with types
- [x] 2. (v1) Fix remaining landing-page type errors — landing-page — No remaining errors; all TS7006/TS2339 resolved by types
- [x] 3. (v1) Code review — code-reviewer
- [x] 4. (v1) QA — qa-tester
- [x] 5. Update all `package.json` deps to `@tdq/ora-components` — 4 files across 4 packages
- [x] 6. Renew `package-lock.json` — `npm install` at root + turbo dry-run verify (2 packages in scope, correct dep chain)
- [x] 7. Update landing-page imports (17 TS files + 1 CSS import) — landing-page agent
- [x] 8. Update examples + mcp-server imports (5 TS + 2 mcp-server refs + .agent/ docs) — ora-components-docs agent
- [x] 9. Update stories imports (24 files + storybook config) — ora-components-dev agent
- [x] 10. Code review — code-reviewer (found 3 issues, all fixed)
- [x] 11. QA: verify full build + turbo dependency chain — qa-tester (PASS)
