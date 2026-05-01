# Landing Page Architecture

The landing page is built as a standalone Vite-powered package within the `ora-components` monorepo. It leverages the same core technologies as the library itself: **Vanilla TypeScript**, **RxJS**, and **Tailwind CSS**.

## Core Technology Stack
- **Framework:** Vanilla TypeScript (No framework like React or Angular).
- **Reactivity:** RxJS (Observables, Subjects, and Subscriptions).
- **Styling:** Tailwind CSS (extending the Material 3 design system).
- **Build Tool:** Vite (for fast development and optimized production builds).

## Design System & Theme Management
The landing page fully integrates with the `ora-components` Theme Management system:
1.  **Variables:** All colors, spacing, and typography are defined as CSS variables in `src/styles.css`.
2.  **`ThemeManager`:** The `ThemeManager.getInstance()` singleton from the core library is used to globally switch themes.
3.  **Tailwind Utility:** Tailwind classes (e.g., `text-primary`, `bg-background`) are used consistently across all sections to ensure theme responsiveness.

## Navigation & View Management
The landing page uses **`RouterBuilder`** from `ora-components` for client-side routing, defined in `src/routes.ts`:
- **Routes:** Four routes are configured: `/` (landing page), `/dashboard` (dashboard demo), `/dashboard/{page}` (parameterised dashboard), and `/finance` (finance demo).
- **Router outlet:** `app.ts` builds the router and appends it to the root container. Each route's `.withContent()` callback returns a builder whose `.build()` output is rendered into the outlet.
- **Zero-refresh navigation:** Route transitions happen entirely on the client, with no full page reloads.

## Integration with `ora-components`
The landing page consumes `ora-components` directly as a workspace dependency. It showcases the library's:
- **Builders:** Using `ButtonBuilder`, `TextFieldBuilder`, `PanelBuilder`, etc., to build sections.
- **Components:** Directly rendering charts and grids within the Dashboard Demo.
- **State Patterns:** Demonstrating how to use RxJS `of`, `timer`, and `map` for real-time component updates.

## CI/CD Pipeline

The landing page is built and deployed via a single GitHub Actions workflow:

1. **Turbo dependency chain:** `turbo run build --filter=landing-page...` ensures `ora-components` is built first (its `^build` dependency), then the landing page.
2. **Vite production build:** `tsc && vite build` produces an optimised bundle in `packages/landing-page/dist/`.
3. **Azure deployment:** The `Azure/static-web-apps-deploy@v1` action uploads `dist/` to Azure Static Web Apps. The `skip_app_build: true` flag tells Azure not to rebuild — the pipeline already handled it.
