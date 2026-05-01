# Plan: Fix Landing Page Build Errors

**Date**: 2026-05-01
**Task**: Fix 23 TypeScript build errors in the landing-page package caused by missing ora-components type declarations

## Subtasks

- [x] 1. Build ora-components type declarations — ora-components-dev — Regenerate `.d.ts` files in `dist/` so modules resolve with types
- [x] 2. Fix remaining landing-page type errors — landing-page — No remaining errors; all TS7006/TS2339 resolved by types
- [x] 3. Code review: all changes from subtasks 1-2 — code-reviewer
- [x] 4. QA: verify landing-page `tsc` passes clean — qa-tester
