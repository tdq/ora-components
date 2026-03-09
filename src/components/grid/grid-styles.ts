export const GridStyles = {
    container: 'flex flex-col w-full text-sm text-foreground bg-background rounded-lg border border-outline/30 dark:border-stone-50/20 overflow-hidden',
    glass: 'glass-effect bg-opacity-50 backdrop-blur-md',
    
    header: 'flex flex-row items-stretch bg-surface-container-low/80 backdrop-blur font-semibold h-[52px] sticky top-0 z-20 text-on-surface-variant text-[11px] uppercase tracking-wider border-b border-outline/20 dark:border-stone-50/20',
    headerGlass: 'bg-white/20 backdrop-blur-md',
    
    viewport: 'flex-1 overflow-auto relative outline-none',
    content: 'relative w-full',
    
    checkboxCell: 'w-12 flex-none flex items-center justify-center',
    checkboxInput: 'rounded border-outline w-4 h-4 cursor-pointer accent-primary',
    
    headerCell: 'px-4 h-full flex items-center text-left truncate font-semibold text-on-surface-variant group relative',
    headerCellSortable: 'cursor-pointer hover:text-primary transition-colors',
    
    sortIcon: 'fas ml-2 transition-opacity',
    sortIconActive: 'opacity-100 text-primary',
    sortIconInactive: 'opacity-0 group-hover:opacity-50',
    
    resizeHandle: 'resize-handle absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-30',
    
    actionHeaderCell: 'w-20 flex-none sticky right-0 bg-surface-container-low/80 backdrop-blur-sm border-l border-outline/10 dark:border-stone-50/10 z-20',
    
    row: 'absolute w-full flex items-stretch border-b border-outline/10 dark:border-stone-50/10 transition-all duration-200 group border-l-2 border-l-transparent hover:bg-surface-variant/20 hover:border-l-primary dark:hover:bg-slate-800/60',
    rowOdd: 'bg-surface-container-low/20',
    rowSelected: 'bg-primary/10 border-l-primary',
    rowEditable: 'cursor-text',
    
    cell: 'px-4 flex items-center truncate h-full',
    
    actionCell: 'w-20 flex-none flex items-center justify-center gap-1 sticky right-0 z-10 border-l border-outline/10 dark:border-stone-50/10 transition-all duration-200 bg-surface-container-low/80 backdrop-blur-sm',
    actionCellSelected: 'bg-primary/10',
    actionCellOdd: 'bg-surface-container-low/20',
    actionCellEven: 'bg-background',
    
    actionButton: 'p-2 hover:bg-muted rounded-full text-on-surface-variant hover:text-primary transition-colors',
    actionButtonText: 'text-xs px-2 rounded-md'
};
