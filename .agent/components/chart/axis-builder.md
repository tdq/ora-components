# Axis Builder

## Description
The `AxisBuilder` is used to configure the appearance and behavior of X and Y axes in a chart. It handles labels, grid lines, and scale formatting.

## Builder Methods
`AxisBuilder` provides methods to customize axis visuals.

### Axis Labeling
- `withLabel(label: string): this`: Sets the axis title.
- `withVisible(visible: boolean): this`: Toggles the axis line and labels visibility.
- `withFormat(format: ValueFormat): this`: Sets the value format shared by this axis's tick labels **and** the tooltip values of every series bound to it (primary or secondary), unless a series overrides it with its own `withFormat`. Accepts a preset string or a `(value: number) => string` function. Presets: `'number'` (grouped, no rounding — the default when `withFormat` is not called), `'money'` (grouped, 2 decimals), `'integer'` (grouped, 0 decimals), `'compact'` (`1.2K` / `3.4M`), `'percentage'` (value is a fraction: `0.153` → `15.3%`), `'currency'` (Intl currency using the id set via the chart's `withCurrency` method — see `chart.md` — default `'EUR'`), and `` `currency:${string}` `` (e.g. `'currency:USD'`). An unrecognized preset string `console.warn`s once and falls back to `'number'` with the axis's default tick precision (the precision it would use with no `withFormat` at all). Category (X) axes ignore `withFormat` — dates/labels pass through unformatted.
- `withTicks(amount: number): this`: Sets the approximate number of ticks on the axis.

### Grid & Layout
- `withGridLines(visible: boolean): this`: Toggles the display of major grid lines. Off by default — grid lines are opt-in on both the X and Y axis. When enabled they are painted behind the series, never across them. A secondary Y axis never draws grid lines, so a dual-axis chart cannot end up with two overlapping horizontal grids.
- `withMinorGridLines(visible: boolean): this`: Toggles the display of minor grid lines. Off by default.
- `withPosition('left' | 'right' | 'top' | 'bottom'): this`: Sets the position of the axis (for multi-axis charts).

### Scaling & Bounds
- `withMin(min: number | 'auto'): this`: Sets the minimum value for the scale. By default using minimum value from provided set.
- `withMax(max: number | 'auto'): this`: Sets the maximum value for the scale. By default using maximum value from provided set.
- `withScaleType('linear' | 'log' | 'time' | 'category'): this`: Sets the mathematical scale type.

## Implementation Details
- **Rendering**: The `AxisRenderer` is responsible for drawing the axes into the SVG.
- **Dynamic Scaling**: The axis scale is automatically recalculated by `ChartLogic` when data or bounds change. For category scales, the number of labels and ticks is determined by the downsampled `displayData` to prevent overlapping.
- **Tick Generation**: Ticks are generated using smart algorithms to ensure readable intervals.
- **Responsive Layout**: `ChartSvgArea` provides the `viewWidth` and `viewHeight` to the renderer to ensure proper alignment.
- **Type Safety**: `AxisRenderer.render` receives a `ChartScales` object containing `xScale`, `yScale`, `yDomain`, `xStep`, `barWidth`, and optionally secondary axis information.

## Styling
- **Axis Line**: Uses standard MD3 `outline` color tokens.
- **Tick Labels**: Uses `md-label-small` typography.
- **Grid Lines**: Uses subtle, low-opacity lines (`border-outline/10`).
- **SVG Elements**: Ticks and lines use SVG primitives (`line`, `text`).
