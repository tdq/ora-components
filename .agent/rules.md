## Creating component
Follow this steps when creating component:
1. Analyse requirements, compare them with common instructions and with similar components
2. Prepare implementation plan
3. Implement component by using best coding practices
4. Review implemented component. Spot issues. Improve code.
5. Implement tests
6. Implement story (`.stories.ts`). See [Storybook](storybook.md) for format conventions, tags, and naming sequence. Use [Story Helpers](story-helpers.md) for reusable utilities (action log, data generators, demo controls, glass backdrop). **CRITICAL**: If you are going to create a custom docs file in step 7, do NOT include `'autodocs'` in the `tags` array of the story's default export to prevent Storybook indexing conflict errors.
7. Create a `.docs.mdx` file in `packages/stories/src/` alongside the component's `.stories.ts` file. Use `@storybook/addon-docs/blocks` imports (`Meta`, `Canvas`). Include: usage example, Builder API table, story canvases, and styling notes. Ensure `'autodocs'` is NOT included in the corresponding `.stories.ts` default export tags.

Use existing components, especially LayoutBuilder for compositions. Prepare custom components only if existing components are not covering some use cases.
- NEVER modify the HTMLElement returned by build() — all configuration must happen via builder methods BEFORE build()

## Project-wide conventions

- **Class merging**: compose classes with the shared `cn()` from `src/utils/cn.ts`. Never build a local `twMerge`/`cn` inside a component — the shared one is the only one that knows the library's custom Tailwind scales (see [theme.md](theme.md#10a-class-merging-cn)).
- **Structural addressing**: container components stamp a `data-slot` attribute on the elements they lay out (`LayoutBuilder` slots use `withName(...)` or the slot index; `PanelBuilder` uses `"body"`). Set it non-clobbering — never overwrite a `data-slot` the caller already put there.
- **Subscription ownership**: a helper that subscribes and returns DOM must hand its `Subscription` (or a `destroy()`) back to the owner of the element's lifetime. See rules 4–6 in [reactive.md](reactive.md#rxjs-subscription-hygiene-rules).
- **Render purity**: any per-item render callback a consumer supplies (grid custom column renderer, virtual row renderer) must be a pure function of the item, because the library re-invokes it only when the item reference changes.