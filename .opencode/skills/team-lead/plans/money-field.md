# Plan: Implement MoneyField Component

**Date**: 2026-04-13
**Task**: Implement the MoneyField component following the builder pattern, merging NumberField input logic with a currency dropdown or suffix.

## Subtasks

- [x] 1. Extract `Money` interface from `src/components/grid/types.ts` to `src/types/money.ts` and update imports. — ora-components-dev — Create shared Money type to avoid coupling component to grid.
- [x] 2. Code review: Extract Money interface — code-reviewer
- [x] 3. QA: Extract Money interface — qa-tester
- [x] 4. Implement `MoneyFieldBuilder` (`money-field.ts`) and sub-components (`money-field-label.ts`, `money-field-error.ts`, `money-field-icon.ts`, `index.ts`). — ora-components-dev — Set up the DOM builder structure for the component without core logic.
- [x] 5. Code review: MoneyField builders — code-reviewer
- [x] 6. QA: MoneyField builders — qa-tester
- [x] 7. Implement `MoneyFieldLogic` (`money-field-logic.ts`). — ora-components-dev — Add input filtering, formatting, clamping, Arrow keys support, and currency combobox/suffix handling.
- [x] 8. Code review: MoneyFieldLogic — code-reviewer
- [x] 9. QA: MoneyField logic and tests — qa-tester
- [x] 10. Create dashboard demo for MoneyField in landing-page. — aura-dashboard-demo — Add a demo page showing MoneyField features.
- [x] 11. Update docs. — ora-components-docs — Update `.agent/` docs if necessary.
