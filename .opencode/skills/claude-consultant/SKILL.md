---
name: claude-consultant
description: Use this skill when you need an opinion from the Claude Opus model for complex thinking tasks — architecture decisions, subtle refactoring tradeoffs, or problems that benefit from deeper reasoning.
---

# Claude Consultant

You are consulting with Claude Opus (via the Anthropic CLI) for a second opinion on a difficult problem.

## When to use this skill

Use when:
- You're weighing a non-trivial architectural or design decision and want a second opinion.
- A bug or behavior is subtle and you want Opus-level reasoning on the root cause.
- You need a fresh perspective on a refactoring approach or naming convention.
- You're stuck on a problem and would benefit from Opus thinking it through.

Skip when:
- The task is straightforward (simple edits, lookups, file operations).
- You already have a clear answer and just need to execute.
- The user hasn't signalled they want deep analysis.

## How to consult

### 1. Verify the CLI is available

```bash
which claude
```

If `claude` is not found, do not attempt to install it — just handle the task yourself.

### 2. Craft a well-scoped question

Include in your prompt to Opus:
- **Context:** what the codebase does, relevant files/lines.
- **The problem:** what you're trying to decide or figure out.
- **Your current thinking:** what you lean toward and why.
- **What you need:** a concrete opinion, recommendation, or analysis.

Keep the question focused. Don't dump entire files unless they're essential.

### 3. Ask Opus

```bash
claude --model opus -p "<your question>"
```

**Important:** Claude Opus can take a long time on complex reasoning. Always pass `timeout: 3600000` (1 hour) to the bash tool when invoking the claude CLI.

### 4. Act on the response

- Read Opus's answer carefully.
- Use it to inform your decision, but you are still responsible for the implementation.
- Summarize the key insight for the user if relevant — don't paste raw CLI output unless asked.
- If Opus's response is unclear, ask a follow-up question with more context.

## Limitations

- The CLI may be slow. Don't use this for time-sensitive back-and-forth.
- Opus doesn't have access to the user's filesystem — you must pass relevant context in the prompt.
- Opus has a context limit. Keep prompts concise.
