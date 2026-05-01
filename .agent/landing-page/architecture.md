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
Instead of a traditional router, the landing page uses an **RxJS-driven View Switcher**:
- **`AppView` Enum:** Defines the two primary views: `LANDING` and `DASHBOARD`.
- **`appState.view$`:** A `BehaviorSubject` that streams the current view.
- **`app.ts`:** Subscribes to the view stream and re-renders the root container without a full page reload.

## Integration with `ora-components`
The landing page consumes `ora-components` directly as a workspace dependency. It showcases the library's:
- **Builders:** Using `ButtonBuilder`, `TextFieldBuilder`, `PanelBuilder`, etc., to build sections.
- **Components:** Directly rendering charts and grids within the Dashboard Demo.
- **State Patterns:** Demonstrating how to use RxJS `of`, `timer`, and `map` for real-time component updates.
