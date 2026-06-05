# Step 2 — Task Decomposition & Plan File

## Purpose

Break the task into small, independent subtasks — one focused deliverable each. Assign agents, get user approval, and write the plan to disk.

## Procedure

1. **Decompose** — break the task into subtasks. Each subtask should be one focused deliverable that a single agent can complete.

2. **Assign agents** — for each subtask, determine the correct agent from the roster. Use `reference/agent-roster.md` for detailed selection criteria. Include review and QA steps as their own checklist items.

3. **Resolve ambiguities** — if anything is unclear about the task scope or approach, ask the user before proceeding.

4. **Present to user** — show the subtask list with agent assignments and get explicit approval.

5. **Write the plan file** — once approved, write to:
   - Path: `.opencode/skills/team-lead/plans/<slug>.md`
   - `<slug>` is a short kebab-case name (e.g. `add-button-disabled-state`).

6. **Confirm the path** to the user before executing any agent.

## Plan File Format

```markdown
# Plan: <Task Title>

**Date**: <YYYY-MM-DD>
**Task**: <one-sentence description>

## Subtasks

- [ ] 1. <Subtask title> — <agent> — <one-line goal>
- [ ] 2. <Subtask title> — <agent> — <one-line goal>
- [ ] 3. Code review: <what is reviewed> — code-reviewer
- [ ] 4. QA: <what is validated> — qa-tester
...
```

Each subtask gets its own checkbox line, including review and QA steps.

## Example

```markdown
# Plan: Add Disabled State to ButtonBuilder

**Date**: 2026-06-05
**Task**: Add a `disabled` state to ButtonBuilder with styling and documentation.

## Subtasks

- [ ] 1. Add `disabled()` method to ButtonBuilder — ora-components-dev — implement builder method, reactive state, CSS
- [ ] 2. Update ButtonBuilder stories — ora-storybook-dev — add disabled story variants
- [ ] 3. Code review: button.builder.ts changes — code-reviewer
- [ ] 4. QA: disabled state behavior and test coverage — qa-tester
- [ ] 5. Update examples and MCP server — ora-components-docs — sync API docs
- [ ] 6. Code review: examples and MCP changes — code-reviewer
- [ ] 7. QA: docs and examples — qa-tester
```
