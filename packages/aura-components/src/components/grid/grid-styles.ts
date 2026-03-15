export const GridStyles = {
    container: 'flex flex-col w-full text-sm text-foreground bg-background rounded-lg border border-outline/30 dark:border-stone-50/20 overflow-hidden',
    glass: 'glass-effect bg-opacity-50 backdrop-blur-md',
    
    header: 'flex flex-row items-stretch bg-surface-container-low/80 backdrop-blur font-semibold h-[52px] sticky top-0 z-20 text-on-surface-variant text-[11px] uppercase tracking-wider border-b border-outline/20 dark:border-stone-50/20',
    headerGlass: 'bg-white/20 backdrop-blur-md',
    
    viewport: 'flex-1 overflow-auto relative outline-none',
    content: 'relative w-full',
    
    checkboxCell: 'w-12 flex-none flex items-center justify-center',
    checkboxInput: 'rounded border-outline w-4 h-4 cursor-pointer accent-primary',
    
    headerCell: 'px-4 h-full flex items-center text-left truncate font-semibold text-on-surface-variant group relative transition-colors hover:bg-surface-variant/30 after:absolute after:right-0 after:top-[10%] after:h-[80%] after:w-0.5 after:bg-outline/30 after:opacity-0 [&.resizable-column]:hover:after:opacity-100 before:absolute before:left-0 before:top-[10%] before:h-[80%] before:w-0.5 before:bg-outline/30 before:opacity-0 [&.prev-resizable]:hover:before:opacity-100',
    headerCellSortable: 'cursor-pointer hover:text-primary',
    headerCellActive: 'bg-surface-variant/30',
    
    sortIcon: 'fas ml-2 transition-all transform',
    sortIconActive: 'opacity-100 text-primary scale-110',
    sortIconInactive: 'opacity-0 group-hover:opacity-40 -translate-y-1 group-hover:translate-y-0',
    
    resizeHandle: 'resize-handle absolute right-0 top-[10%] w-1.5 h-[80%] cursor-col-resize z-40 transition-all after:absolute after:right-0 after:top-0 after:h-full after:w-0.5 after:bg-primary after:opacity-0 hover:after:opacity-100 [&.active]:after:opacity-100',
    
    actionHeaderCell: 'w-20 flex-none sticky right-0 bg-surface-container-low/80 border-l border-outline/10 dark:border-stone-50/10 z-20',
    
    row: 'absolute w-full flex items-stretch border-b border-outline/10 dark:border-stone-50/10 transition-colors duration-200 group border-l-2 border-l-transparent hover:bg-surface-variant/20 hover:border-l-primary dark:hover:bg-slate-800/60 [will-change:transform]',
    rowOdd: 'bg-surface-container-low/20',
    rowSelected: 'bg-primary/10 border-l-primary',
    rowEditable: 'cursor-text',
    
    cell: 'px-4 flex items-center truncate h-full',
    totalCell: 'font-bold bg-surface-container-highest/30',
    
    groupRow: 'absolute w-full flex items-center bg-surface-container-high border-b border-outline/10 cursor-pointer hover:bg-surface-container-highest transition-colors z-10 [will-change:transform]',
    groupToggle: 'w-10 h-10 flex items-center justify-center text-on-surface-variant transition-transform duration-200',
    groupToggleExpanded: 'rotate-90',
    groupIcon: 'w-5 h-5 flex items-center justify-center',
    groupContent: 'flex items-center gap-2 font-medium',
    groupValue: 'text-primary',
    groupCount: 'text-xs text-on-surface-variant/60 font-normal',
    
    actionCell: 'w-20 flex-none flex items-center justify-center gap-1 sticky right-0 z-10 border-l border-outline/10 dark:border-stone-50/10 transition-colors duration-200 bg-surface-container-low/80',
    actionCellSelected: 'bg-primary/10',
    actionCellOdd: 'bg-surface-container-low/20',
    actionCellEven: 'bg-background',
    
    actionButton: 'p-2 hover:bg-muted rounded-full text-on-surface-variant hover:text-primary transition-colors',
    actionButtonText: 'text-xs px-2 rounded-md'
};
