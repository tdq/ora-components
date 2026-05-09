# Plan: Fix Grid Row Bottom Border Width

**Date**: 2026-05-08
**Task**: Fix grid row `border-b` truncating at viewport width instead of extending to full content width when columns overflow.

## Subtasks

- [x] 1. Implement CSS variable fix — ora-components-dev — Set `--content-width` on content element, reference it in row/groupRow styles, fix test selectors
- [x] 2. Code review: grid row border fix — code-reviewer
- [x] 3. QA: grid row border fix — qa-tester
- [ ] 4. Update .agent/ docs — architect — Update grid.md with CSS variable approach
