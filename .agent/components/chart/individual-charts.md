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

## AreaChartBuilder
Used to configure area-based series (line with filled area below).
- `withCurve(curve: 'smooth' | 'step' | 'linear'): this`: Sets the line interpolation type.
- `withOpacity(opacity: number): this`: Sets the fill opacity of the area (default: 0.3).
- `asStacked(): this`: Sets the series to be stacked with other bar or area series.

## Implementation Details
- **Zero Baseline**: All value-based renderings (lines, bars, areas) MUST use `yScale(0)` as the baseline. This ensures bars grow from the correct axis line and that charts with negative values render accurately.
- **Path Rendering**: Lines and area boundaries MUST use `<path>` elements with standard `M` (move to) and `L` (line to) commands. 
- **Animation Paths**: For path-based animations (`LineChart`, `AreaChart`), create a `zeroLinePoints` string representing all data points shifted to `yScale(0)`. Transition the `d` attribute from `zeroLinePoints` to actual `points`.
- **Bar Animation**: Bars MUST transition both `y` and `height` properties from the `baselineY` to their final calculated values.
- **Shadow Application**: Each series MUST apply its corresponding filter using `setAttribute('filter', 'url(#shadow-i)')`.
- **Tooltip Content**: Tooltip content MUST be constructed using `LabelBuilder` (e.g., `LabelSize.MEDIUM` for headers and `LabelSize.SMALL` for data rows) instead of raw `innerHTML` strings.
- **Composition**: Series are rendered in the order they were added. Area charts should typically be added first to ensure they don't overlap line markers.
- **Markers**: Markers for line series should also receive the shadow filter for consistent visual depth. Markers should also be animated from `baselineY` to their target position.
