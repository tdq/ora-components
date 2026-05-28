# 🌌 Ora Components Monorepo

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![RxJS](https://img.shields.io/badge/Reactivity-RxJS-purple.svg)](https://rxjs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC.svg)](https://tailwindcss.com/)
[![Material Design 3](https://img.shields.io/badge/Design-Material_3-7F3FBF.svg)](https://m3.material.io/)
[![Build Tool](https://img.shields.io/badge/Build%20Tool-Vite-646CFF.svg)](https://vitejs.dev/)
[![Monorepo](https://img.shields.io/badge/Monorepo-Turborepo-EF4444.svg)](https://turbo.build/)

> A premium, high-performance UI component library for financial applications, built using **Vanilla TypeScript**, **RxJS** for fine-grained reactive state management, and **Tailwind CSS** following **Material Design 3 (M3)** principles.

`ora-components` is designed to be extremely lightweight, highly interactive, and optimized for speed. By choosing native DOM APIs over heavy virtual-DOM frameworks, and leveraging RxJS streams for targeted rendering, the library achieves exceptional performance, gorgeous visual styles (including advanced glassmorphism), and a clean, programmatic component building interface.

---

## 📖 Table of Contents

1. [Core Technology Stack](#-core-technology-stack)
2. [Monorepo Structure](#-monorepo-structure)
3. [Architectural Design Patterns](#-architectural-design-patterns)
   - [Builder Pattern](#1-builder-pattern)
   - [Reactive Data Binding](#2-reactive-data-binding)
   - [Lifecycle and Memory Management](#3-lifecycle-and-memory-management)
4. [Getting Started & Installation](#-getting-started--installation)
5. [Monorepo Scripts](#-monorepo-scripts)
6. [Theme System & Aesthetics](#-theme-system--aesthetics)
7. [Component Portfolio](#-component-portfolio)
8. [Development Conventions](#-development-conventions)
9. [Contributing a New Component](#-contributing-a-new-component)
10. [Model Context Protocol (MCP) Server](#-model-context-protocol-mcp-server)
11. [License](#-license)

---

## 🛠 Core Technology Stack

The project relies on a highly curated stack of modern web technologies to enforce performance, scalability, and extreme customizability:

| Technology | Purpose | Description |
| :--- | :--- | :--- |
| **Vanilla TypeScript** | Component Logic | Native DOM manipulation without the overhead of Shadow DOM or Virtual DOM frameworks. |
| **RxJS v7** | State Reactivity | Reactive streams handle events, state changes, and updates at the exact DOM node level. |
| **Tailwind CSS v3** | Responsive Styling | Semantic utility classes for flexible design, theme variables, and visual modifiers. |
| **Vite** | Compilation & Dev | Fast bundling, HMR, and ultra-fast component builds. |
| **Storybook** | Component Sandbox | Rich documentation, live playground, and interactive stories for component authors. |
| **Jest + JSDOM** | Unit & Integration Testing | Comprehensive test suites ensuring high accessibility and behavioral correctness. |

---

## 📂 Monorepo Structure

The monorepo uses **Turborepo** and **npm Workspaces** to coordinate dependencies and build steps across packages:

```txt
ora-components/
├── .agent/                  # Multi-file detailed developer guides and component specs
├── packages/
│   ├── ora-components/      # 📦 Core UI Components Library (Vite, TS, RxJS, Tailwind)
│   ├── landing-page/        # 🌐 Marketing site and dashboard showcases (Azure SWA deployment)
│   ├── mcp-server/          # 🔌 Model Context Protocol Server for LLM integration
│   ├── stories/             # 🎨 Visual Storybook configuration and interactive stories
│   └── examples/            # 💡 Native integrations showing minimal bundle setups
├── plans/                   # Implementation specifications and visual improvement logs
├── tasks/                   # Developer task-lists and active boards
├── package.json             # Root monorepo configuration
├── turbo.json               # Turborepo task graph pipeline definitions
└── LICENSE                  # MIT License details
```

### Key Packages
*   **`@tdq/ora-components`**: The primary published library. Contains pure builders and UI classes.
*   **`landing-page`**: A beautiful marketing, P&L, Balance Sheet, and Dashboard demo showing off the component portfolio, complete with mock APIs and live web-socket connections.
*   **`ora-mcp-server`**: Integrates with LLMs to allow programmatic component generation and tools to explore the component schemas in real-time.
*   **`stories`**: Houses visual stories and MDX documentation for Storybook.

---

## 📐 Architectural Design Patterns

This library relies heavily on three core principles to remain highly structured, type-safe, and responsive:

### 1. Builder Pattern
Components are not declared via raw HTML templates or JSX. Instead, they are constructed programmatically using the **Builder Pattern**. Classes implementing the `ComponentBuilder` interface handle the fluent configuration of properties and compile down to standard HTML elements upon calling `.build()`.

#### Key Conventions:
*   All builder classes must end with `Builder` (e.g. `ButtonBuilder`, `DialogBuilder`).
*   Configurator methods use prefixes `with`, `add`, or `as` (e.g., `withCaption()`, `addSlot()`, `asGlass()`).
*   Builder methods must return `this` to support **method chaining**.
*   The final `.build()` method creates the underlying `HTMLElement`, configures event listeners, binds reactive streams, and returns the customized DOM node.

#### Example Usage:
```typescript
import { ButtonBuilder } from '@tdq/ora-components/button';
import { BehaviorSubject } from 'rxjs';

// Create a reactive caption stream
const captionStream$ = new BehaviorSubject('Initial Caption');

// Programmatically build the button
const submitButton = new ButtonBuilder()
  .withCaption(captionStream$)
  .asGlass()
  .withIcon('check')
  .onClick(() => console.log('Button clicked!'))
  .build();

// Mount button to DOM
document.getElementById('app')?.appendChild(submitButton);

// Update caption reactively without a full re-render
setTimeout(() => {
  captionStream$.next('Save Changes');
}, 2000);
```

### 2. Reactive Data Binding
Instead of receiving raw static primitives, dynamic component properties (like list choices, text inputs, loading indicators, or chart data sets) are accepted as **RxJS Observables** (`Observable<T>`).
*   **Granular DOM Updates**: When an observable emits a new value, the component updates *only* the affected DOM node (e.g. inner text of a label or attribute of an input), leaving the rest of the component tree untouched.
*   This avoids heavy tree-diffing algorithms and minimizes repaint times.

### 3. Lifecycle and Memory Management
Using reactive subscriptions (`.subscribe()`) in a native DOM environment can lead to severe memory leaks if subscriptions are not closed when elements are discarded. 
To completely automate cleanup, the library features a `registerDestroy` utility:
*   **Mechanism**: Uses a global `MutationObserver` to watch when elements are detached from the document tree.
*   **Automatic Unsubscribe**: When a component is removed from the DOM, `registerDestroy` automatically fires its callback, letting you unsubscribe from active RxJS subscriptions, clear timers, or release resources.

```typescript
import { registerDestroy } from '@tdq/ora-components';

// Inside ButtonBuilder's build() method:
const subscription = caption$.subscribe(text => {
  labelElement.innerText = text;
});

// Register automatic subscription teardown
registerDestroy(buttonElement, () => {
  subscription.unsubscribe();
  console.log('Button detached from DOM: cleanups executed.');
});
```

---

## 🚀 Getting Started & Installation

### Prerequisites
*   **Node.js**: `v18.x` or higher (Recommended: `v20.x` or `v22.x`)
*   **NPM**: `v10.x` or higher

### Steps to Run Locally

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/tdq/ora-components.git
    cd ora-components
    ```

2.  **Install Monorepo Dependencies**:
    ```bash
    npm install
    ```

3.  **Run Storybook (Visual Development)**:
    To view and interact with components in isolation, spin up the local Storybook environment:
    ```bash
    npm run storybook
    ```
    *Open [http://localhost:6006](http://localhost:6006) in your browser.*

4.  **Run the Landing Page & Dashboard Showcase**:
    To see components working together in a rich finance application:
    ```bash
    npm run landing:start
    ```
    *Open [http://localhost:5173](http://localhost:5173) in your browser.*

---

## ⚡ Monorepo Scripts

Thanks to **Turborepo**, commands are executed in parallel across packages with optimized caching.

| Command | Action | Scope |
| :--- | :--- | :--- |
| `npm run dev` | Starts Vite developer mode for all packages in parallel. | Full Monorepo |
| `npm run build` | Builds all packages in dependency order. | Full Monorepo |
| `npm run test` | Runs unit tests across all libraries and components. | Full Monorepo |
| `npm run storybook` | Boots up the local visual component playground. | Stories package |
| `npm run landing:start` | Launches the dashboard & accounting demo in dev mode. | Landing Page package |
| `npm run landing:build` | Compiles a production-ready bundle for Azure. | Landing Page package |
| `npm run mcp:start` | Starts the Model Context Protocol background server. | MCP Server package |
| `npm run pack:local` | Locally packs `@tdq/ora-components` as a tarball. | UI Core package |

---

## 🎨 Theme System & Aesthetics

Ora Components includes a highly customized modern design system inspired by **Material Design 3 (M3)** with support for multiple visual flavors:

*   **Harmony Palette**: Leverages carefully mapped HSL design tokens, avoiding raw, garish colors.
*   **Three Core Themes**:
    *   `Light Theme`: Clean, high-contrast, structured layout with beautiful elevation shadows.
    *   `Dark Theme`: Immersive, charcoal/slate surfaces, relaxing to the eyes.
    *   `Pink Theme`: An alternative aesthetic option demonstrating the theme framework's elasticity.
*   **Glassmorphic Accents**: Premium glass controls using `backdrop-filter: blur()`, transluscent borders, subtle gradients, and glowing hover states to make dashboards feel alive.
*   **Micro-Animations**: Elegant, responsive feedback transitions for clicks, input focus, panel expands, and tab changes.

---

## 🧱 Component Portfolio

The library contains a comprehensive set of premium building blocks:

*   **`Button`**: Highly configurable action button featuring normal, outline, text, and glassmorphic styles with support for icon injection.
*   **`Label`**: Dynamic semantic text labels that bind seamlessly to RxJS string streams.
*   **`TextField` & `NumberField`**: Form inputs with active validations, inline labels, error display, and focus animations.
*   **`MoneyField`**: Optimized input component tailored for financial figures, automatic decimal formatting, currency symbols, and strict rounding.
*   **`Checkbox`**: Standardized, clean checkbox with custom check animations and accessibility descriptors.
*   **`ComboBox`**: Dynamic search-and-select fields supporting asynchronous lists and autocomplete.
*   **`DatePicker`**: Accessible, custom calendar popover supporting rapid date selection.
*   **`Form`**: Container coordination wrapping field groups, handling submission validation state, and preventing double-submits.
*   **`Tabs`**: Reactive navigation switching that swaps panel contents with elegant horizontal animations.
*   **`Panel`**: Structured card container featuring headers, actions slots, collapsible states, and elevation controls.
*   **`Dialog`**: Modal overlay utilizing native HTML `<dialog>` elements for accessibility, combined with custom glass backdrops.
*   **`Toolbar`**: Layout element orchestrating buttons, filters, search fields, and titles.
*   **`ListBox`**: Selectable vertical scroll listing supporting interactive selection states.
*   **`Grid`**: A high-performance table component capable of handling thousands of rows, featuring resizable columns, sorting, cell styling, custom renderers, and sticky headers.
*   **`Chart`**: A lightweight reactive charting tool supporting bar, line, and area projections updating in real-time as data streams emit.
*   **`Layout`**: Layout templates including double-column panels, grids, and flex systems.

---

## 📝 Development Conventions

To keep codebase quality exceptional and maintain perfect ratings on analysis tools:

1.  **Light DOM Only**: Never use Shadow DOM. Keeping components in the Light DOM allows perfect integration with global Tailwind classes and custom overrides.
2.  **Atomic Composition**: Focus each component on a single responsibility. Create complex page sections by nesting layout, grid, and form components.
3.  **RxJS Observables First**: Every dynamic property must support `Observable<T>` in addition to static constants.
4.  **Automatic Teardowns**: Always register cleanup logic using `registerDestroy(element, teardownFunc)` within the builder's `.build()` step.
5.  **Strict Styling**: Avoid hardcoding inline styling. Rely on Tailwind classes combined with the `clsx` and `twMerge` helpers.

---

## 🤝 Contributing a New Component

To add a new component, follow this workflow:

1.  **Preparation**: Analyze the requirement, check for existing builder methods, and draft a plan.
2.  **Implementation**:
    *   Create a folder under `packages/ora-components/src/components/<name>/`.
    *   Create `<Name>Builder.ts` establishing the API and chainable methods.
    *   Ensure all subscriptions use `registerDestroy` to prevent memory leaks.
3.  **Tests**: Write a unit test file `<name>.test.ts` checking rendering, builder modifications, and reactive streams.
4.  **Visual Docs**:
    *   Write a Storybook file inside `packages/stories/src/<Name>.stories.ts`.
    *   Provide interactive controls for all builder configurations.
    *   Write an MDX file (`packages/stories/src/<Name>.docs.mdx`) showing copy-pasteable usage recipes.

---

## 🔌 Model Context Protocol (MCP) Server

To supercharge development inside AI-assisted editors, the monorepo includes **`ora-mcp-server`** under `packages/mcp-server/`. 
*   **Functionality**: Exposes specialized tools for AI coding assistants to query the design system, discover existing component configurations, read code structures, and generate conforming component composition code in real-time.
*   **Usage**: Run `npm run mcp:start` to activate the local MCP server, allowing your editor's AI to gain complete runtime knowledge of all component APIs.

---

## 📄 License

This monorepo and all its nested packages are licensed under the **MIT License**. For the full terms, please refer to the [LICENSE](LICENSE) file in the root of the repository.

