# Plan: Fix MoneyField Precision Rounding

**Date**: 2026-04-13
**Task**: Prevent MoneyField and NumberField from rounding to step on blur, ensuring they respect precision instead.

## Subtasks

- [x] 1. Fix rounding logic in MoneyFieldLogic — ora-components-dev — Remove roundToStep on blur and use precision rounding.
- [x] 2. Fix rounding logic in NumberFieldLogic — ora-components-dev — Remove roundToStep on blur and use precision rounding.
- [x] 3. Code review: MoneyField and NumberField rounding logic — code-reviewer
- [x] 4. QA: Validate rounding behavior with tests — qa-tester
- [x] 5. Update documentation: Update .agent/ component guides — ora-components-docs
- [x] 6. Fix NumberColumn inline editor precision — ora-components-dev — Pass precision and step to NumberFieldBuilder in createEditor.
- [x] 7. Code review: NumberColumn precision fix — code-reviewer
- [x] 8. QA: Test NumberColumn inline editing preservation — qa-tester
