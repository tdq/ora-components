export function buildArAgingTile(): HTMLElement {
    const root = document.createElement('div');
    root.className = 'rounded-large p-px-24 backdrop-blur-md border border-outline-alpha-20 bg-surface-variant-alpha-30 shadow-level-2';
    const buckets = [
        { label: '0–30',  pct: 62.1, color: '#10B981' },
        { label: '31–60', pct: 22.4, color: '#0EA5E9' },
        { label: '61–90', pct: 10.3, color: '#F59E0B' },
        { label: '90+',        pct: 5.2,  color: '#EF4444' },
    ];
    root.innerHTML = `
        <div class="flex items-center justify-between mb-px-12">
            <span class="text-label-medium text-on-surface-variant opacity-70 uppercase tracking-wide">AR Aging</span>
            <span class="inline-flex items-center gap-1 text-label-small font-semibold px-px-8 py-px-4 rounded-full text-trend-positive bg-trend-positive-bg">&uarr; 1.2 pp</span>
        </div>
        <div class="flex items-baseline gap-1 tabular-nums">
            <span class="text-on-surface text-4xl font-bold leading-none">92.4</span>
            <span class="text-on-surface opacity-70 text-xl font-semibold">% &lt; 30d</span>
        </div>
        <div class="mt-px-16 flex h-1.5 w-full overflow-hidden rounded-full" style="background: color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent);">
            ${buckets.map(b => `<div style="width: ${b.pct}%; background: ${b.color};" title="${b.label}d &middot; ${b.pct}%"></div>`).join('')}
        </div>
        <div class="mt-px-8 grid grid-cols-4 gap-px-8 text-label-small text-on-surface-variant opacity-70 tabular-nums">
            ${buckets.map(b => `<div class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full" style="background:${b.color};"></span><span>${b.label}</span></div>`).join('')}
        </div>
    `;
    return root;
}
