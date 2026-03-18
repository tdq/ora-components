# Chart

## Description
The Chart component is a high-performance data visualization component for Material Design 3. 
It uses the **Builder pattern**, implementing the `ComponentBuilder` interface. 
It supports multiple simultaneous chart types (e.g., Line and Bar on the same axes), reactive data updates via RxJS, and glass styling effects.

By default, the chart is transparent and occupies 100% of the available width and height of its parent container. To make it look like a standalone card/panel, use the `asGlass()` method.

## Architecture
The chart is modularized into specialized classes to separate configuration, state management, and rendering concerns:
- **`ChartBuilder<ITEM>`**: The public API and configuration orchestrator.
- **`ChartViewport<ITEM>`**: The main DOM orchestrator and view component.
- **`ChartLogic<ITEM>`**: Manages data processing, scaling, and reactive state.
- **`ChartSvgArea`**: Manages the `<svg>` element, `<defs>`, and responsive `viewBox`.
- **`AxisRenderer`**: Renders X and Y axes, grid lines, and labels.
- **`SeriesRenderer`**: Renders data series (Line, Bar, Area) and SVG filters.
- **`ChartLegend`**: Handles the rendering of the series legend.
- **`ChartTooltip`**: Manages tooltip visibility, content, and positioning.
- **`LabelBuilder`**: Used for all text elements outside the SVG.

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
- `asGlass(): this`: Enables translucent glass styling.

## Implementation Requirements
- **Orchestration**: `ChartBuilder.build()` MUST instantiate `ChartViewport` and pass the `ChartLogic` instance to it.
- **Viewport Lifecycle**: `ChartViewport` MUST subscribe to `logic.state$` and trigger updates across all sub-components (`AxisRenderer`, `SeriesRenderer`, `ChartLegend`).
- **SVG Management**: `ChartSvgArea` MUST manage the `<svg>`, its `<defs>`, and main `<g>` group. It MUST also handle `ResizeObserver` to trigger re-renders when the container size changes.
- **Text Components**: All text elements outside of the SVG MUST be created using `LabelBuilder`.
- **SVG Namespace**: All SVG elements MUST be created using `document.createElementNS('http://www.w3.org/2000/svg', ...)`.
- **Animation Paths**: When `animate` is true, use `<animate>` elements inside SVG paths/rects/circles.
- **Rendering Loop**: Use `logic.state$` subscription to trigger re-renders. `ChartViewport` is responsible for clearing the SVG (via `ChartSvgArea.clear()`) and updating filters before renderers are called.
- **X-Axis Scaling**: Category scales MUST be point-centered with exactly **8px padding** from the Y-axis to the first chart element (e.g., the left edge of the first bar). This is achieved using the formula `xScale(i) = 8 + barWidth / 2 + i * xStep`.
- **Individual Shadows**: `SeriesRenderer` MUST handle the creation of filters in `<defs>` with ID `shadow-${index}`.
- **Cleanup**: `ChartViewport` MUST use `registerDestroy` to unsubscribe from RxJS and disconnect observers.

## Styling

### Glass effect
**Chart itself is not affected by glass effect**.