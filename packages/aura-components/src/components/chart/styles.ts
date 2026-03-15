export const ChartStyles = {
    container: 'relative flex flex-col w-full h-full',
    glass: 'bg-white/10 backdrop-blur-md border border-white/20 rounded-large p-4',
    title: 'text-title-large font-semibold text-on-surface mb-4',
    chartArea: 'relative flex-grow min-h-[200px] w-full',
    svg: 'w-full h-full overflow-visible',
    axis: 'text-label-small fill-on-surface-variant',
    gridLine: 'stroke-outline/10',
    tooltip: 'absolute z-50 p-2 rounded-small bg-surface-container-low shadow-level-2 border border-outline/20 pointer-events-none text-body-small whitespace-nowrap transition-opacity duration-200',
    legend: 'flex flex-wrap gap-4 mt-4 justify-center',
    legendItem: 'flex items-center gap-2 text-label-medium cursor-pointer hover:opacity-80 transition-opacity',
    legendColor: 'w-3 h-3 rounded-full',
    error: 'text-error text-body-small mt-2'
};
