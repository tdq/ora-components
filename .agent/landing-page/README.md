# Landing Page Package (`packages/landing-page`)

The `landing-page` package is a dedicated marketing and demonstration website for the `ora-components` library. Its primary goal is to attract new users by showcasing the library's aesthetics, performance, and reactive capabilities in a real-world context.

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

## Directory Structure
- `src/app.ts`: Main entry point and view switcher.
- `src/state/`: RxJS-based global state (e.g., current view).
- `src/components/`: Reusable landing-page-specific UI parts (Header, Footer, ThemeToggle).
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
