# Plan: Update Grid Money Column Alignment and Editor

**Date**: 2026-04-13
**Task**: Update Grid Money column to align with documentation (right-aligned, uses MoneyField editor) and add general alignment support.

## Subtasks

- [x] 1. Extend GridColumn and BaseColumnBuilder with alignment support — ora-components-dev — Added `align` and `withAlign()`
- [x] 2. Implement alignment classes in GridHeader and GridRow — ora-components-dev — Applied justify/text-align classes
- [x] 3. Update Money, Number, and Percentage columns to right-align by default — ora-components-dev — Set default alignment in constructors
- [x] 4. Update MoneyColumn to use MoneyFieldBuilder editor — ora-components-dev — Switched from NumberField to MoneyField
- [x] 5. Code review: Grid alignment and MoneyColumn changes — code-reviewer
- [x] 6. QA: Validate grid alignment and MoneyColumn editor — qa-tester
