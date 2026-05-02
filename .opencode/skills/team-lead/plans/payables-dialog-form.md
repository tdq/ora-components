# Plan: Move "Add New Invoice" into Dialog

**Date**: 2026-05-02
**Task**: Replace inline "Add New Invoice" panel on payables page with a dialog modal triggered by a button.

## Subtasks

- [x] 1. Refactor payables form into dialog — aura-dashboard-demo — Replace `createNewInvoiceForm()` with `createNewInvoiceButton()` + `showNewInvoiceDialog()` using `DialogBuilder`
- [x] 2. Code review: payables dialog refactor — code-reviewer
- [x] 3. QA: validate dialog opens, submits, closes correctly — qa-tester
- [x] 4. Update .agent/ docs — architect
