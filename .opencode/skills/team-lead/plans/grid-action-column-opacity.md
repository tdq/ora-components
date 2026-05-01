# Plan: Fix GridBuilder Action Column & Header Transparency

**Date**: 2026-04-25
**Task**: Remove transparency and blur from GridBuilder's header and action column in non-glass mode.

## Subtasks

- [x] 1. Fix grid-styles.ts: header, actionHeaderCell, actionCellOdd opacity — ora-components-dev — remove backdrop-blur from header/actionHeaderCell, change partial-opacity backgrounds to fully opaque
- [x] 2. Code review: grid-styles.ts changes — code-reviewer — verify correctness of opacity/blur removals
- [x] 3. QA: validate and add tests — qa-tester — verify fix works, run existing tests, add coverage if needed
- [x] 4. Update .agent/ docs — architect — update grid-styles.md, grid-header.md, grid.md
