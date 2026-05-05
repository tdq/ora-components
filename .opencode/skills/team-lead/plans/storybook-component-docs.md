# Plan: Storybook Component Documentation (MDX Docs)

**Date**: 2026-05-04
**Task**: Create MDX "Docs" files for every component in Storybook — each describing the component, with usage examples and method descriptions.

## Subtasks

- [x] 1. Pilot: Create `button.docs.mdx` — ora-components-docs — Validate MDX format, template, and Storybook rendering
- [x] 2. Batch 1: text-field, dialog, label, checkbox docs (4 files) — ora-components-docs — Simple form element docs
- [x] 3. Batch 2: combobox, date-picker, listbox, multi-select-list docs (4 files) — ora-components-docs — List/selection component docs
- [x] 4. Batch 3: number-field, money-field, panel, tabs docs (4 files) — ora-components-docs — Form and container component docs
- [x] 5. Batch 4: form, layout docs (2 files) — ora-components-docs — Complex composite component docs (renamed to `form-builder.docs.mdx` and `layout-builder.docs.mdx` to match story basenames)
- [x] 6. Batch 5: grid, chart docs (2 files) — ora-components-docs — Most complex multi-file component docs
- [x] 7. Batch 6: toolbar docs (1 file) — ora-components-docs — Component without existing story
- [x] 8. Code Review: All created .docs.mdx files — code-reviewer — Review accuracy, consistency, format
- [x] 9. QA: Validate all docs render in Storybook — qa-tester — Verify docs load, stories render, methods accurate
- [x] 10. Architect update: Sync .agent/ docs — architect — Update architecture docs per documentation impact list

## Post-completion Fixes (2026-05-05)

- Renamed `form.docs.mdx` → `form-builder.docs.mdx` and `layout.docs.mdx` → `layout-builder.docs.mdx` to fix sidebar "Docs" naming (Storybook requires basename match with `.stories.ts`)
- Removed `tags: ['autodocs']` from `tabs.stories.ts` to resolve indexing conflict with `tabs.docs.mdx`
- Updated `.storybook/preview.ts` with `globalTypes` theme toolbar (Light/Dark/System) and decorator that applies `data-theme` attribute and `.dark` class
- Redesigned all 18 Builder API sections: replaced cramped 3-column markdown tables with clean definition-list format (`- **\`method\`** — \`signature\`\n  description`)
