# Plan: GridBuilder `withRowsSelected` two-way selection binding

**Date**: 2026-06-26
**Task**: Add `GridBuilder.withRowsSelected(rows: Subject<ITEM[]>)` — a two-way binding that emits the grid's selected rows into the Subject and applies consumer pushes back onto the grid selection. Renamed from the improvement's `withRowsSelect`.

## Architect context (from plan-mode exploration — Step 1 folded in)
- Implement in `packages/ora-components/src/components/grid/grid-builder.ts`.
- Outbound source: `GridLogic.selectedItems$` (`grid-logic.ts:210`) — emits only on selection change.
- Inbound sink: `GridLogic.setSelectedItems(Set<ITEM>)` (`grid-logic.ts:58`).
- Cleanup via existing `mainSub` + `registerDestroy` (`grid-builder.ts:264, 268`).
- Convention reference: `withValue(subject)` in `combobox-builder.ts:40`, `multi-select-list.ts:72`.
- Loop guarding required (two `suppress*` flags) to avoid echo between the two subscriptions.
- Selection is by object identity; inbound pushes must reuse the same item references from `withItems`.
- Docs needing update: `packages/stories/src/grid.docs.mdx`, `.agent/components/grid/grid.md`, `packages/ora-components/README.md`.

## Agent mapping (opencode roster → this harness)
- `ora-components-dev` / `ora-storybook-dev` → `senior-dev-coder`
- `ora-components-docs` → `general-purpose`
- `code-reviewer` → `code-reviewer`
- `qa-tester` → `qa-spec-validator`

## Subtasks

- [x] 1. Core impl — senior-dev-coder — add `selectedRows$` field + `withRowsSelected(rows: Subject<ITEM[]>)` and two-way sync (outbound `selectedItems$`→subject, inbound subject→`setSelectedItems`, loop-guarded) in `grid-builder.ts`
- [x] 2. Code review: grid-builder.ts changes — code-reviewer (1 BLOCKING + 3 NITs, all fixed)
- [x] 3. QA: two-way binding behavior + unit tests in `grid-builder.test.ts` — qa-spec-validator (8 new tests; 26/26 pass)
- [x] 4. Stories + MDX docs — senior-dev-coder (`RowsSelectedBinding` story + `grid.docs.mdx`)
- [x] 5. Code review: stories/docs changes — Tech Lead (accurate to API; purely additive; no new type errors)
- [x] 6. Guide docs — general-purpose (`.agent/components/grid/grid.md`, `README.md`, `improvements.md` line 19)
- [x] 7. Code review: .agent/README/improvements changes — Tech Lead (consistent signature across all docs)

## Acceptance criteria (binary)
- `GridBuilder.withRowsSelected(subject)` exists, returns `this`, stores the subject.
- With `asMultiSelect()`: toggling a row checkbox emits the selected `ITEM[]` into the subject; "select all" emits all items; deselect emits `[]`.
- Pushing `subject.next([item])` selects that row in the grid.
- No feedback loop (single emission per user action; no infinite re-entry).
- Subscriptions are torn down on element destroy (added to `mainSub`).
- Grid builds and behaves normally when `withRowsSelected` is never called.
- Docs in all three surfaces reflect the new method; `improvements.md` line 19 ticked.
