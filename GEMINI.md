# Project Overview: a1-components

`a1-components` is a high-performance UI component library for the 1A platform. It is built using **Vanilla TypeScript**, **RxJS** for reactive state management, and **Tailwind CSS** for styling, following **Material Design 3** principles.

## Core Technology Stack
- **Framework:** Vanilla TypeScript (Native DOM manipulation, No Shadow DOM).
- **Reactivity:** RxJS (Observables, Subjects, and Subscriptions).
- **Styling:** Tailwind CSS (with support for Light, Dark, and Pink themes).
- **Build Tool:** Vite.
- **Documentation/Testing:** Storybook.
- **Testing:** Jest + JSDOM.

## Architectural Patterns

### 1. Builder Pattern
Components are created using the **Builder Pattern** via classes that implement the `ComponentBuilder` interface. 
- **Naming:** Classes must end with `Builder` (e.g., `ButtonBuilder`).
- **Methods:** Use prefixes `with`, `add`, or `as` (e.g., `withCaption`, `asGlass`, `addSlot`).
- **Finality:** The `build()` method creates and returns the `HTMLElement`.
- **Method Chaining:** Builder methods should return `this` to allow chaining.

### 2. Reactive Components
Component properties (captions, states, values) are typically passed as **RxJS Observables**. This allows components to react to state changes without re-rendering the entire DOM tree.

### 3. Lifecycle Management
To prevent memory leaks from RxJS subscriptions, components use `registerDestroy(element, callback)`. 
- This utility uses a `MutationObserver` to automatically call the destroy callback when a component is removed from the DOM.
- **Standard Practice:** Always unsubscribe from all subscriptions within the `registerDestroy` callback.

## Directory Structure
- `src/components/`: Component implementations. Each component has its own folder with a builder, styles, and tests.
- `src/core/`: Core abstractions like `ComponentBuilder` and `DestroyableElement`.
- `src/stories/`: Storybook stories for visual testing and documentation.
- `src/theme/`: Theme management logic.
- `.agent/`: Detailed documentation and rules for the AI agent.

## Building and Running
| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start Vite development server |
| `npm run storybook` | Start Storybook for component development |
| `npm run build` | Compile TypeScript and build for production |
| `npm run test` | Run unit tests with Jest |
| `npm run build-storybook` | Build static Storybook documentation |

## Development Conventions
1. **No Shadow DOM:** Use only Light DOM for better integration with global styles and Tailwind.
2. **Composition over Complexity:** Split complex components into smaller, reusable pieces.
3. **Reactive First:** Prefer `Observable<T>` for any dynamic property.
4. **Cleanup:** Always use `registerDestroy` to manage subscription lifecycles.
5. **Atomic Components:** Keep components focused on a single task.
6. **Styling:** Use `twMerge` and `clsx` for dynamic Tailwind class management.

## Contributing a New Component
1. Analyze requirements and compare with existing components.
2. Create a new directory in `src/components/`.
3. Implement the `Builder` class.
4. Use `registerDestroy` for RxJS subscription cleanup in the `build()` method.
5. Add unit tests in a `.test.ts` file.
6. Create a Storybook story in `src/stories/`.
