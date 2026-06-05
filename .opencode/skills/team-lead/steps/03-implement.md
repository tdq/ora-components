# Step 3 — Implementation Loop

## Purpose

Execute each subtask through the **dev → code review → QA** feedback loop. Mark completion in the plan file as each phase passes.

## Loop Overview

```
Dev Agent → Code Review → QA → Next Subtask
   ↑            ↓           ↓
   └── BLOCKING ←── BLOCKING ←──┘
```

## Procedure

### 3a. Run the Dev Agent

1. Write a Task Brief using the format in `reference/task-brief.md`.
2. Send the brief to the correct dev agent from the roster.
3. If a subtask spans multiple areas, split into one brief per agent in dependency order.
4. After the dev agent completes, mark its checkbox in the plan file: `- [x]`.

### 3b. Code Review

1. Write a Task Brief for `code-reviewer`:
   - **Goal**: review the change
   - **Files**: what was modified
   - **Requirements**: the original acceptance criteria from the dev brief
2. Send the brief to `code-reviewer`.
3. Evaluate the result:
   - **BLOCKING** issues → write a new dev brief with findings in the Requirements field. Return to 3a.
   - **NIT only** or **LGTM** → mark the review checkbox `- [x]` and proceed to QA.

### 3c. QA

1. Write a Task Brief for `qa-tester`:
   - **Goal**: validate the change and add missing tests
   - **Files**: changed files + existing test paths
   - **Requirements**: the original acceptance criteria
2. Send the brief to `qa-tester`.
3. Evaluate the result:
   - **BLOCKING** or failing tests → write a new dev brief with the QA report in Requirements. Return to 3a.
   - **Approved** → mark the QA checkbox `- [x]`. Report to user and move to the next subtask.

## Retry Briefs

When a review or QA finds blocking issues, write a retry brief for the dev agent:
- Same Goal and Files as the original brief.
- Replace Requirements with the exact findings list from the reviewer/QA.
- Do not paraphrase — cite exact file:line references from the findings.
- See `reference/task-brief.md` for retry brief examples.

## 3-Strike Rule

If a subtask loops through dev → review or dev → QA more than 3 times:
1. Stop the loop.
2. Surface the blocker to the user with a summary of what's failing and what's been tried.
3. Wait for user direction before continuing.

## Parallel Execution

Independent subtasks (different file areas, no dependency between them) can run their dev agents in parallel. Review and QA for each must still happen sequentially after the dev completes for that subtask.
