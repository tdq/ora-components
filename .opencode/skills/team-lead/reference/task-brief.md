# Task Brief Format

Every agent invocation must start from a Task Brief. Agents start cold — the brief is everything they know. Keep it minimal and exact.

## Template

```
**Goal**: One sentence — what the agent must produce.

**Files**
- Modify: <explicit file paths>
- Read-only: <explicit file paths>
- Out of scope: <what not to touch>

**Requirements**
- <binary acceptance criterion>
- <binary acceptance criterion>

**Constraints** *(only task-specific; omit if covered by the agent's own system prompt)*
- <e.g. "do not change the public builder API">
- <e.g. retry: fix only — [BLOCKING] dialog.ts:42 — missing cleanup>
```

## Rules

1. **One goal per brief.** Split multi-concern work into separate briefs.
2. **Cite file paths** — do not paste file contents or guide sections into the brief.
3. **No open questions.** Resolve ambiguities before writing.
4. **Binary criteria.** Each requirement must be answerable with yes/no (e.g., "The button renders with the `variant` prop" — not "Make the button look good").

## Retry Briefs

When an agent must fix issues found by review or QA, write a new brief with:
- The same Goal and Files from the original brief.
- **Replace** the Requirements field with the exact findings list from the reviewer/QA (do not paraphrase).
- Add a **Constraints** field if the agent's system prompt already covers the normal rules.

## Examples

### Standard dev brief
```
**Goal**: Add a `size` prop to ButtonBuilder that accepts 'sm' | 'md' | 'lg'.

**Files**
- Modify: packages/ora-components/src/button/button.builder.ts
- Read-only: packages/ora-components/src/button/button.types.ts
- Out of scope: stories, tests, docs

**Requirements**
- ButtonBuilder.size() accepts 'sm', 'md', or 'lg'
- Default size is 'md'
- Size maps to CSS class `--size-{value}`
```

### Review brief
```
**Goal**: Review the `size` prop addition to ButtonBuilder for correctness and architecture alignment.

**Files**
- Modified: packages/ora-components/src/button/button.builder.ts

**Requirements**
- ButtonBuilder.size() accepts 'sm', 'md', or 'lg'
- Default size is 'md'
- Size maps to CSS class `--size-{value}`
```

### QA brief
```
**Goal**: Validate the `size` prop addition and add missing test coverage.

**Files**
- Changed: packages/ora-components/src/button/button.builder.ts
- Tests: packages/ora-components/src/button/button.spec.ts

**Requirements**
- ButtonBuilder.size() accepts 'sm', 'md', or 'lg'
- Default size is 'md'
- Size maps to CSS class `--size-{value}`
```

### Retry brief (after review)
```
**Goal**: Add a `size` prop to ButtonBuilder that accepts 'sm' | 'md' | 'lg'.

**Files**
- Modify: packages/ora-components/src/button/button.builder.ts
- Read-only: packages/ora-components/src/button/button.types.ts

**Requirements**
- [BLOCKING] button.builder.ts:42 — `size` setter does not validate the input value
- [NIT] button.builder.ts:38 — missing JSDoc on the `size()` method

**Constraints**
- Do not change the existing `variant()` method
```
