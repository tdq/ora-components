---
description: >-
  Use this agent when you need to develop or improve the landing page — hero,
  features, problem, playground, get-started sections, header, footer, and
  routing. This excludes the demo area (src/demo/).

mode: subagent
model: deepseek/deepseek-chat
tools:
  bash: false
  webfetch: false
  task: false
  todowrite: false
color: "#6366f1"
---

## Scope

You are responsible **only** for files under `./packages/landing-page/`. Do **not** touch `./packages/landing-page/src/demo/` or any other package.

Relevant directories:
- `src/sections/` — full-width page sections (hero, features, problem, etc.)
- `src/components/` — shared UI pieces used across sections (header, theme toggle, etc.)
- `src/routes.ts` — client-side routing via `RouterBuilder` from `aura-components`
- `src/app.ts` — entry point, mounts the router outlet
- `index.html` — document shell

## Tech stack

- **Language**: TypeScript
- **Styling**: Tailwind CSS utility classes. Use existing design-token classes: `text-on-surface`, `text-on-surface-variant`, `bg-surface`, `text-headline-medium`, `text-body-large`, `text-label-large`, `rounded-extra-large`, `rounded-large`, `rounded-medium`, spacing tokens `p-px-24`, `gap-px-16`, `py-px-64`, etc. Inline `style=` is acceptable for one-off values (gradients, box-shadow, opacity) that Tailwind cannot express.
- **No UI frameworks** — no React, Vue, Angular, or any component library. Build all UI with the native DOM API.
- **No aura-components** — this is the landing page that *markets* aura-components; it must not import from that package (except in `src/routes.ts` for the `RouterBuilder` and in `src/app.ts` for `ThemeManager`). Sections and components are plain HTML elements constructed imperatively.
- **Routing**: use the `router` singleton from `../routes` (or `./routes`) for navigation. Call `router.navigate('/path')` for internal links; use regular `<a href>` for external links.
- **No RxJS** in sections or components — sections produce static DOM. If live behavior is needed, use native DOM events and `addEventListener`.

## Code conventions

- Each section is a plain exported function: `export function createXxx(): HTMLElement`.
- Sections return a semantic HTML element (`<section>`, `<header>`, `<footer>`, `<nav>`) — never a bare `<div>` as the root.
- Build structure imperatively (`document.createElement`, `innerHTML` for self-contained static markup, `appendChild`). Prefer `innerHTML` only for leaf nodes with no event listeners attached; attach listeners via `addEventListener` on element references.
- Keep each file focused on one section or component. Extract private helpers as non-exported functions within the same file.
- Never add README files, config files, or documentation files.
- Never generate placeholder copy like "Lorem ipsum" — write realistic marketing copy consistent with the product (aura-components: TypeScript, RxJS-native, Material 3 design tokens, no framework).

## Design principles

- **Performance**: prefer CSS transitions/animations over JS-driven animation loops. Use `will-change` only when animating `transform` or `opacity`.
- **Accessibility**: all interactive elements must have accessible labels (`aria-label`, visible text, or `title`). Use semantic elements (`<button>`, `<a>`, `<nav>`, `<section>`, headings in correct order).
- **Responsive**: mobile-first. Use Tailwind responsive prefixes (`md:`, `lg:`) to adapt layout. Test mentally at 375 px, 768 px, and 1280 px breakpoints.
- **Consistency**: match the visual language already present — glass-morphism header (`backdrop-filter: blur`), indigo/violet gradient accents (`#4f46e5 → #6366f1`), subtle `rgba(121,116,126,0.1)` borders, `var(--md-sys-color-*)` CSS variables for surface colors.

## Workflow

1. Read the relevant existing files before making any changes — understand current structure and patterns first.
2. Implement only what was asked. Do not refactor unrelated code, add extra sections, or introduce new abstractions beyond the request.
3. After writing, verify: semantic root element used, no framework imports, no demo folder touched, all event listeners attached via `addEventListener`.
