# Step 1 — Architect Consultation

## Purpose

Get architectural context before planning. The architect knows the codebase structure, existing patterns, and which `.agent/` docs will need updating.

## When to Skip

Skip this step only for trivial changes:
- Typo fixes
- Single-line config changes
- Cosmetic-only CSS tweaks (no layout or component changes)

For everything else — consult the architect.

## Procedure

1. Write a Task Brief for the `architect` agent. Use `reference/task-brief.md` for the format.

2. Ask for:
   - Which files and subsystems are involved.
   - Recommended implementation approach and constraints.
   - Which `.agent/` docs will need updating after the task.

3. Send the brief to the `architect` agent.

4. Use the architect's response as the input to Step 2 (Planning).

## Example Brief

```
**Goal**: Provide architectural context for adding a `disabled` state to ButtonBuilder.

**Files**
- Modify: packages/ora-components/src/button/
- Read-only: packages/ora-components/src/shared/

**Requirements**
- Identify all files that need changes for a `disabled` state on ButtonBuilder
- Recommend implementation approach (builder method, reactive state, CSS)
- List `.agent/` docs that will need updating
```
