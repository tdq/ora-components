export const ChartStyles = {
    container: 'relative flex flex-col w-full h-full',
    glass: 'p-4',
    title: 'text-title-large font-semibold text-on-surface mb-4',
    chartArea: 'relative flex-grow w-full',
    /** Omitted in sparkline mode — a fixed min-height would override the configured (default 32px) height. */
    chartAreaMinHeight: 'min-h-[200px]',
    svg: 'w-full h-full overflow-visible',
    axis: 'text-label-small fill-[var(--ora-chart-axis-fg)]',
    gridLine: 'stroke-[var(--ora-chart-grid-line)] [stroke-opacity:var(--ora-chart-grid-line-opacity)] stroke-1',
    tooltip: 'absolute z-50 p-2 rounded-small bg-surface-container-low shadow-level-2 border border-outline/20 pointer-events-none text-body-small whitespace-nowrap transition-opacity duration-200',
    // glass-effect--overlay, not shadow-level-2: the tooltip floats above its (often
    // glass) host, so it must keep its backdrop-blur instead of being treated as a
    // nested glass surface, and the overlay class carries the elevation *plus*
    // glass-effect's 1px ring, which a shadow utility would have overwritten.
    // See index-layered.css.
    tooltipGlass: 'absolute z-50 p-2 rounded-large glass-effect glass-effect--overlay [overflow:clip] pointer-events-none text-body-small whitespace-nowrap transition-opacity duration-200',
    legend: 'flex flex-wrap gap-4 mt-4 justify-center',
    legendItem: 'flex items-center gap-2 text-label-medium cursor-pointer hover:opacity-80 transition-opacity',
    legendColor: 'w-3 h-3 rounded-full',
    hoverLine: 'stroke-on-surface-variant/50 stroke-1',
    hoverRing: 'fill-none stroke-current stroke-2',
    error: 'text-error text-body-small mt-2'
};
