# Chart

## Description
The Chart component is a high-performance data visualization component for Material Design 3. 
It uses the **Builder pattern**, implementing the `ComponentBuilder` interface. 
It supports multiple simultaneous chart types (e.g., Line and Bar on the same axes), reactive data updates via RxJS, and glass styling effects.

By default, the chart is transparent and occupies 100% of the available width and height of its parent container. To make it look like a standalone card/panel, use the `asGlass()` method.

## Architecture
The chart is modularized into several builders and logic classes:
- **`ChartBuilder<ITEM>`**: The main orchestrator and public API.
- **`LabelBuilder`**: Used for all text elements outside the SVG (Title, Legend, Tooltip).
- **`LineChartBuilder<ITEM>`**: Handles configuration of line-based data series.
- **`BarChartBuilder<ITEM>`**: Handles configuration of bar-based data series.
- **`AreaChartBuilder<ITEM>`**: Handles configuration of area-based data series.
- **`AxisBuilder`**: Handles configuration of X and Y axes.
- **`ChartLogic<ITEM>`**: Manages data processing, scaling, and reactive state.
- **`ChartStyles`**: Centralizes Tailwind CSS classes for consistent styling.

## ChartBuilder Methods
`ChartBuilder<ITEM>` uses a generic type `ITEM` to ensure type safety for data fields and tooltips.

### Data & Dimensions
- `withData(data: Observable<ITEM[]>): this`: Sets the data source for the chart.
- `withCategoryField(field: keyof ITEM | string): this`: Sets the field used for the X-axis (categories).
- `withHeight(height: number): this`: Sets the height of the chart in pixels. Use `0` (default) to fill the available vertical space (`100%`).
- `withWidth(width: string): this`: Sets the width (e.g., '100%' (default), '400px').

### Adding Charts (Series)
Each method returns a specialized builder for that series.
- `addLineChart(field: keyof ITEM | string): LineChartBuilder<ITEM>`
- `addBarChart(field: keyof ITEM | string): BarChartBuilder<ITEM>`
- `addAreaChart(field: keyof ITEM | string): AreaChartBuilder<ITEM>`

### Axes & Configuration
- `withXAxis(): AxisBuilder`: Returns an `AxisBuilder` for the X-axis (bottom).
- `withYAxis(): AxisBuilder`: Returns an `AxisBuilder` for the primary Y-axis (left).
- `withSecondaryYAxis(): AxisBuilder`: Returns an `AxisBuilder` for the secondary Y-axis (right).
- `withTitle(title: Observable<string>): this`: Sets the chart title.
- `withLegend(visible: boolean): this`: Toggles the legend visibility.
- `withTooltip(enabled: boolean): this`: Toggles interactive tooltips.
- `withAnimation(enabled: boolean): this`: Toggles entry animations for data series (default: true).
- `asGlass(): this`: Enables translucent glass styling with backdrop blur and adds panel-like container styling (padding, borders, rounded corners).

## Implementation Requirements
- **Text Components**: All text elements outside of the SVG (Title, Legend labels, Tooltip content) MUST be created using `LabelBuilder` to ensure consistent typography and reactivity.
- **SVG Namespace**: All SVG elements MUST be created using `document.createElementNS('http://www.w3.org/2000/svg', ...)`.
- **Responsive ViewBox**: The SVG `viewBox` MUST be defined using the dimensions of the parent `chartArea` div via `getBoundingClientRect()`. 
- **Resize Handling**: A `ResizeObserver` MUST be attached to the `chartArea` element to trigger a re-render and update the `viewBox` whenever the available space changes.
- **SVG Attributes**: The SVG element MUST have `width="100%"`, `height="100%"`, and `preserveAspectRatio="xMidYMid meet"`.
- **SVG Animations**: When `animate` is true, use `<animate>` elements inside SVG paths/rects/circles to transition from a zero-baseline state (e.g., `yScale(0)`) to the actual value state. 
- **Animation Timing**: Use a duration of `0.5s` and `calcMode="spline"` with `keySplines="0.4 0 0.2 1"` for smooth MD3-compliant motion.
- **Rendering Loop**: Use `logic.state$` subscription to trigger re-renders.
- **Individual Shadows**: Each series must have its own shadow filter in `<defs>` with ID `shadow-${index}`.
- **Shadow Configuration**: 
  - `dx="0" dy="2" stdDeviation="2" flood-opacity="0.3" flood-color="black"`
- **Clearing Logic**: When re-rendering, use `while(element.firstChild) element.removeChild(element.firstChild)` to clear content robustly.
- **Reactivity**: Use RxJS `BehaviorSubject` for all configuration properties. Ensure previous subscriptions (e.g., for `data$` or `title$`) are unsubscribed before creating new ones or on destroy.
- **State Reset**: Call `logic.resetCharts()` at the beginning of the `build()` method to ensure a clean state if `build()` is called multiple times on the same builder instance.
- **Reactive Visibility**: Use `classList.toggle('hidden', !condition)` within the state subscription for elements like the title that may be conditionally visible.
