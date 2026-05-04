# Landing Page Package (`packages/landing-page`)

The `landing-page` package is a dedicated marketing and demonstration website for the `@tdq/ora-components` library. Its primary goal is to attract new users by showcasing the library's aesthetics, performance, and reactive capabilities in a real-world context.

## Core Objectives
1.  **Marketing:** High-impact introduction to the "Ora" design system.
2.  **Getting Started:** Clear path for developers to install and use the library.
3.  **Interactive Playground:** Live, editable-in-spirit component demos.
4.  **Dashboard Demo:** A complex, full-screen application example showing "Ora" in a high-density, data-driven environment.

## Key Features
- **Modern Aesthetic:** Built with Material 3 principles, Tailwind CSS, and glassmorphism.
- **Full Reactivity:** Powered by RxJS for state management and real-time updates.
- **Theme Support:** Global switching between Light, Dark, and Pink themes via `ThemeManager`.
- **Zero-Refresh Navigation:** Instant switching between the Landing Page and Dashboard Demo.

## External Links

The landing page includes links to external resources in three locations:

| Location | Links |
|----------|-------|
| **Header** (desktop) | GitHub, Storybook — rendered as icon-only buttons (`hidden md:flex`) |
| **Header** (mobile drawer) | GitHub, Storybook — rendered as text links |
| **Footer** "Connect" column | GitHub, npm, Storybook — rendered as icon+text links |

### URL pattern

The Storybook link uses a dynamic hostname-based URL so it resolves correctly across environments (local dev, staging, production):

```
https://storybook.${window.location.hostname}
```

This is constructed once in `header.ts` (`storybookUrl` variable, line 60) and reused for both desktop and mobile header links. The footer in `landing-page.ts` inlines the same template literal directly (line 88).

### Security

All external links use `target="_blank"` and `rel="noopener"` to prevent tab-napping attacks. This applies uniformly to GitHub, npm, and Storybook links across header, mobile drawer, and footer.

## Directory Structure
- `src/app.ts`: Main entry point and view switcher.
- `src/routes.ts`: Central routing configuration using `RouterBuilder` from `@tdq/ora-components`.
- `src/components/`: Reusable landing-page-specific UI parts (Header).
- `src/sections/`: High-level landing page sections (Hero, Features, Playground, Get Started).
- `src/demo/`: The "Ora Dashboard" demo application.
- `src/styles.css`: Global Tailwind and Material 3 variable definitions.

## Getting Started for Developers
To run the landing page locally:
```bash
# From the root of the monorepo
npm run dev --filter=landing-page
```
The development server will typically start on `http://localhost:3000`.

**Important**: The `@tdq/ora-components` package's `dist/` directory is gitignored. The Turbo pipeline (`turbo.json`) builds `@tdq/ora-components` first when using `--filter=landing-page...`, so the commands above work automatically. However, if you run `npm run build` inside `packages/landing-page` directly (bypassing Turbo), you must first generate the `@tdq/ora-components` type declarations:
```bash
npm run build --filter=@tdq/ora-components    # or: cd packages/ora-components && npm run build:types
```
Without this step, `tsc` in the landing page will report ~23 errors about missing `.d.ts` files.

## Deployment

The landing page is hosted on **Azure Static Web Apps** and deployed automatically via a **GitHub Actions CI/CD pipeline**.

### CI/CD Pipeline

The workflow (`.github/workflows/azure-static-web-apps-red-grass-0a3b7b603.yml`) triggers on every push or pull request to `master`:

1. **Install:** `npm ci` — clean install of all dependencies.
 2. **Build:** `npx turbo run build --filter=landing-page...` — Turbo resolves the dependency chain, building `@tdq/ora-components` first, then the landing page. `staticwebapp.config.json` is also copied into `dist/` for Azure deployment.
 3. **Deploy:** The `Azure/static-web-apps-deploy@v1` action uploads `packages/landing-page/dist/` directly to Azure (with `skip_app_build: true`).

### `staticwebapp.config.json`

The configuration file at `packages/landing-page/staticwebapp.config.json` controls Azure's behaviour in production:

- **SPA fallback:** All unrecognised routes are rewritten to `/index.html` so client-side view switching works without 404s.
- **Cache headers:** `/index.html` is served with `no-cache` to ensure fresh content on every load. Static assets under `/assets/*` are cached immutably for one year for optimal performance.
