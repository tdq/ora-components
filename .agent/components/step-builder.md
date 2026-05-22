# Steps

## Description
Steps is a custom component that displays a stepper / wizard progress indicator: an ordered sequence of numbered steps with three visual states — completed, active, upcoming — connected by lines. Used to show progress through a multi-stage flow (registration wizard, onboarding, checkout).

`StepsBuilder` has the following methods:
- `addStep(): StepBuilder` — adds a new step to the sequence.
- `withActiveStep(activeStep$: Observable<number>): this` — optional external source of the active-step index. Read-only from the builder's perspective: it reflects the stream but never emits onto it. If omitted, the builder creates an internal `BehaviorSubject<number>(0)`.
- `withStepClick(handler: (index: number) => void): this` — opt-in click navigation. When set, each step renders as a `<button>` and clicks invoke the handler with the step index. In internal-state mode the builder also advances its own active index on click; in external-state mode the parent is responsible for updating its source observable.
- `asGlass(): this` — sets special styling option as transparent with adjusted colors for use on gradient / glass backgrounds.
- `asVertical(): this` — stacks steps top-to-bottom with vertical connectors. Default is horizontal.
- `withClass(className: Observable<string>): this` — sets css class name on the container.

`StepBuilder` has the following methods:
- `withCaption(caption: Observable<string>): this` — sets the short label shown next to the step's circle.
- `withDescription(description: Observable<string>): this` — sets secondary text shown only when this step is the active one. Hidden on completed and upcoming steps.
- `withVisible(visible: Observable<boolean>): this` — sets visibility of the step. If a hidden step contains the current active index, the indicator falls back to index 0 (matches `TabsBuilder` behavior).

## Styling
Style according to Material Design 3.

Each step renders a numbered circle and a caption label. The active step additionally renders its description below the caption. Adjacent steps are joined by a connector line; connectors leading into completed steps take the completed color, the rest take the upcoming color.

- **Circle**: `w-8 h-8 rounded-full` with `text-sm font-bold`, `transition-all duration-200`.
- **Caption**: `text-xs font-medium` with `transition-colors duration-200 whitespace-nowrap`.
- **Description**: `text-xs mt-0.5`, visible only on the active step.
- **Connector**: 1px line (`h-px` horizontal, `w-px` vertical) with `flex-1` to fill space between adjacent steps. Aligned to the vertical center of the circle in horizontal mode.
- **Step item**: in horizontal mode `flex flex-col items-center gap-1.5`; in vertical mode `flex flex-row items-center gap-2` so the caption sits beside the circle.
- **Container**: `flex w-full` with `items-start` (horizontal) or `flex-col items-start` (vertical).

Clickable steps additionally use `cursor-pointer` and render as `<button type="button">` for accessibility.

State colors (non-glass):
- **Completed**: circle `bg-secondary text-on-secondary` with `'✓'` glyph; caption `text-secondary`.
- **Active**: circle `bg-primary text-on-primary` showing the step number; caption `text-primary`.
- **Upcoming**: circle `border-2 border-outline/30 text-on-surface-variant/60` showing the step number; caption `text-on-surface-variant/40`.
- **Connector (completed segment)**: `bg-secondary/60`.
- **Connector (upcoming segment)**: `bg-outline/30`.

### Glass effect
**The steps container itself has no background**. Only the step internals adjust colors so they remain legible on a gradient / glass surface.

Light theme:
1. Completed circle: `bg-white/30 text-gray-900`; caption `text-gray-700`.
2. Active circle: `bg-white/80 text-gray-900`; caption `text-gray-900`.
3. Upcoming circle: `border-2 border-gray-900/30 text-gray-600`; caption `text-gray-600`.
4. Description: `text-gray-700`.
5. Connector (completed): `bg-gray-900/40`. Connector (upcoming): `bg-gray-900/20`.

Dark theme:
1. Completed circle: `bg-white/30 text-white/90`; caption `text-white/80`.
2. Active circle: `bg-white/80 text-gray-900`; caption `text-white`.
3. Upcoming circle: `border-2 border-white/30 text-white/50`; caption `text-white/40`.
4. Description: `text-white/70`.
5. Connector (completed): `bg-white/50`. Connector (upcoming): `bg-white/30`.
