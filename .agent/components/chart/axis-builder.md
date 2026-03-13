# Axis Builder

## Description
The `AxisBuilder` is used to configure the appearance and behavior of X and Y axes in a chart. It handles labels, grid lines, and scale formatting.

## Builder Methods
`AxisBuilder` provides methods to customize axis visuals.

### Axis Labeling
- `withLabel(label: string): this`: Sets the axis title.
- `withVisible(visible: boolean): this`: Toggles the axis line and labels visibility.
- `withFormat(format: string | ((value: any) => string)): this`: Sets the tick labels format (e.g., 'currency', 'percentage', or a custom function).
- `withTicks(amount: number): this`: Sets the approximate number of ticks on the axis.

### Grid & Layout
- `withGridLines(visible: boolean): this`: Toggles the display of major grid lines.
- `withMinorGridLines(visible: boolean): this`: Toggles the display of minor grid lines.
- `withPosition('left' | 'right' | 'top' | 'bottom'): this`: Sets the position of the axis (for multi-axis charts).

### Scaling & Bounds
- `withMin(min: number | 'auto'): this`: Sets the minimum value for the scale.
- `withMax(max: number | 'auto'): this`: Sets the maximum value for the scale.
- `withScaleType('linear' | 'log' | 'time' | 'category'): this`: Sets the mathematical scale type.

## Implementation Details
- **Rendering**: The `AxisRenderer` is responsible for drawing the axes into the SVG.
- **Dynamic Scaling**: The axis scale is automatically recalculated by `ChartLogic` when data or bounds change.
- **Tick Generation**: Ticks are generated using smart algorithms to ensure readable intervals.
- **Responsive Layout**: `ChartSvgArea` provides the `viewWidth` and `viewHeight` to the renderer to ensure proper alignment.
- **Type Safety**: `AxisRenderer.render` receives a `ChartScales` object containing `xScale`, `yScale`, `yDomain`, `xStep`, `barWidth`, and optionally secondary axis information.

## Styling
- **Axis Line**: Uses standard MD3 `outline` color tokens.
- **Tick Labels**: Uses `md-label-small` typography.
- **Grid Lines**: Uses subtle, low-opacity lines (`border-outline/10`).
- **SVG Elements**: Ticks and lines use SVG primitives (`line`, `text`).
