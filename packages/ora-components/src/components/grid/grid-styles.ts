export const GridStyles = {
    container: 'flex flex-col w-full text-sm text-foreground bg-background rounded-lg border border-outline/30 dark:border-stone-50/20 overflow-hidden min-h-0',
    glass: 'bg-transparent',
    
    header: 'flex flex-row items-stretch bg-surface-container-low font-semibold h-[52px] sticky top-0 z-20 text-on-surface-variant text-[11px] uppercase tracking-wider border-b border-outline/20 dark:border-stone-50/20',
    headerGlass: 'glass-effect !bg-white/20',
    
    viewport: 'flex-1 overflow-auto relative outline-none',
    content: 'relative w-full',
    rowsContainer: 'absolute inset-0 pointer-events-none',
    
    checkboxCell: 'w-12 flex-none flex items-center justify-center',
    checkboxInput: 'rounded border-outline w-4 h-4 cursor-pointer accent-primary',
    
    headerCell: 'px-4 h-full flex items-center text-left truncate font-semibold text-on-surface-variant bg-surface-container-low group relative transition-colors hover:bg-surface-variant/30 select-none after:absolute after:right-0 after:top-[10%] after:h-[80%] after:w-0.5 after:bg-outline/30 after:opacity-0 [&.resizable-column]:hover:after:opacity-100 before:absolute before:left-0 before:top-[10%] before:h-[80%] before:w-0.5 before:bg-outline/30 before:opacity-0 [&.prev-resizable]:hover:before:opacity-100',
    headerCellSortable: 'cursor-pointer hover:text-primary',
    headerCellActive: 'bg-surface-variant/30',
    
    sortIcon: 'ml-2 transition-all transform inline-flex w-3 h-3 shrink-0 [&_svg]:w-full [&_svg]:h-full [&_svg]:block',
    sortIconActive: 'opacity-100 text-primary scale-110',
    sortIconInactive: 'opacity-0 group-hover:opacity-40 -translate-y-1 group-hover:translate-y-0',
    
    resizeHandle: 'resize-handle absolute right-0 top-[10%] w-1.5 h-[80%] cursor-col-resize z-40 transition-all after:absolute after:right-0 after:top-0 after:h-full after:w-0.5 after:bg-primary after:opacity-0 hover:after:opacity-100 [&.active]:after:opacity-100',
    
    actionHeaderCell: 'flex-none sticky right-0 bg-surface-container-low border-l border-outline/10 dark:border-stone-50/10 z-20 ml-auto',
    actionHeaderCellGlass: 'glass-effect !bg-white/20',
    
    row: 'absolute w-full flex items-stretch border-b border-outline/10 dark:border-stone-50/10 transition-colors duration-200 group border-l-2 border-l-transparent hover:bg-surface-variant/20 hover:border-l-primary dark:hover:bg-slate-800/60 [will-change:transform] pointer-events-auto',
    rowOdd: 'bg-surface-container-low/20',
    rowSelected: 'bg-primary/10 border-l-primary',
    rowEditable: 'cursor-text',
    rowGlass: 'hover:bg-white/10 dark:hover:bg-white/5',
    actionCellGlass: 'glass-effect !bg-white/10',
    
    cell: 'px-4 flex items-center truncate h-full',
    totalCell: 'font-bold bg-surface-container-highest/30',
    
    groupRow: 'absolute w-full flex items-center bg-surface-container-high border-b border-outline/10 cursor-pointer hover:bg-surface-container-highest transition-colors z-10 [will-change:transform] pointer-events-auto',
    groupRowGlass: 'glass-effect !bg-white/10 hover:bg-white/20',
    groupToggle: 'aura-grid-group-toggle w-5 h-5 flex items-center justify-center text-on-surface-variant transition-transform duration-200',
    groupToggleExpanded: 'rotate-90',
    groupIcon: 'w-5 h-5 flex items-center justify-center',
    groupContent: 'flex items-center gap-2 font-medium',
    groupValue: 'text-primary',
    groupCount: 'text-xs text-on-surface-variant/60 font-normal',
    
    actionCell: 'flex-none flex items-center justify-end px-2 gap-1 sticky right-0 z-10 border-l border-outline/10 dark:border-stone-50/10 transition-colors duration-200 bg-surface-container-low/80 ml-auto',
    actionCellSelected: 'bg-primary/10',
    actionCellOdd: 'bg-surface-container-low',
    actionCellEven: 'bg-background',
    
    actionButton: 'p-2 hover:bg-muted rounded-full text-on-surface-variant hover:text-primary transition-colors',
    tooltipWrapper: 'relative',
    tooltip: 'fixed m-0 border-0 px-2 py-1 text-xs font-medium rounded bg-neutral-800/90 text-white dark:bg-neutral-100 dark:text-neutral-900 whitespace-nowrap pointer-events-none -translate-x-1/2 -translate-y-full z-[9999]'
};

export function getAlignClass(align?: 'left' | 'center' | 'right'): string {
    switch (align) {
        case 'right': return 'justify-end text-right';
        case 'center': return 'justify-center text-center';
        default: return 'justify-start text-left';
    }
}

export function applyColumnWidth(element: HTMLElement, col: { width?: string; minWidth?: string }): void {
    if (col.width) {
        if (col.width.includes('px') || col.width.includes('rem')) {
            element.style.width = col.width;
            element.style.flex = 'none';
            element.classList.add('flex-none');
            element.classList.remove('flex-1');
        } else if (col.width.includes('fr')) {
            element.style.flex = col.width.replace('fr', '');
            element.style.width = '';
            element.classList.remove('flex-none');
            element.classList.remove('flex-1');
        } else {
            element.style.width = col.width;
            element.style.flex = 'none';
            element.classList.add('flex-none');
            element.classList.remove('flex-1');
        }
    } else {
        element.style.width = '';
        element.style.flex = '1';
        element.classList.add('flex-1');
        element.classList.remove('flex-none');
    }
    element.style.minWidth = col.minWidth ?? '';
}
