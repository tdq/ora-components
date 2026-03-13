# Individual Charts

## Description
Each data series in a `Chart` is managed by a specialized builder. These builders allow for individual configuration of the look and behavior of each chart series.

## Common Methods
All specialized chart builders share these methods:
- `withLabel(label: string): this`: Sets the name of the series (used for legend and tooltips).
- `withColor(color: string): this`: Sets a custom color (CSS color or MD3 token).
- `withTooltip(renderer: (item: ITEM) => string): this`: Sets a custom tooltip renderer for the specific series.
- `asSecondaryAxis(): this`: Links the series to the secondary Y-axis.

## LineChartBuilder
Used to configure line-based series.
- `withWidth(width: number): this`: Sets the line thickness.
- `withCurve(curve: 'smooth' | 'step' | 'linear'): this`: Sets the line interpolation type.
- `withMarkers(visible: boolean): this`: Toggles the display of data point markers (circles).
- `asDashed(): this`: Sets the line style to dashed (`stroke-dasharray="5,5"`).

## BarChartBuilder
Used to configure bar-based series.
- `asStacked(): this`: Sets the series to be stacked with other bar or area series.
- `withBarWidth(width: number): this`: Sets the relative width of the bars (0-1).
- **Max Width**: The absolute width of a bar MUST NOT exceed **32px**.

## AreaChartBuilder
Used to configure area-based series (line with filled area below).
- `withCurve(curve: 'smooth' | 'step' | 'linear'): this`: Sets the line interpolation type.
- `withOpacity(opacity: number): this`: Sets the fill opacity of the area (default: 0.3).
- `asStacked(): this`: Sets the series to be stacked with other bar or area series.

## Implementation Details
- **Rendering**: The `SeriesRenderer` handles the drawing of all series types.
- **X-Scale Padding**: There MUST be exactly **8px padding** between the Y-axis and the first series element (e.g., the first bar's left edge).
- **Zero Baseline**: All value-based renderings (lines, bars, areas) MUST use `yScale(0)` as the baseline. 
- **Path Rendering**: Lines and area boundaries MUST use `<path>` elements with standard `M` (move to) and `L` (line to) commands. 
- **Animation Paths**: For path-based animations (`LineChart`, `AreaChart`), create a `zeroLinePoints` string representing all data points shifted to `yScale(0)`. Transition the `d` attribute from `zeroLinePoints` to actual `points`.
- **Bar Animation**: Bars MUST transition both `y` and `height` properties from the `baselineY` to their final calculated values.
- **Shadow Application**: `SeriesRenderer` applies corresponding filters using `setAttribute('filter', 'url(#shadow-i)')`.
- **Tooltip Content**: Handled by `ChartTooltip` class using `LabelBuilder`.
- **Composition**: Series are rendered in the order they were added to the `logic.state$.charts` array.
- **Markers**: Markers for line series should be animated from `baselineY` to their target position and should receive the shadow filter.
- **Filters**: The `SeriesRenderer` is responsible for updating SVG filters in the `<defs>` section of the SVG (via `SeriesRenderer.updateFilters()`).
