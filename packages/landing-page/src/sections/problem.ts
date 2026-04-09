const PAIN_POINTS = [
    {
        stat: 'Every project',
        pain: 'Reinventing state adapters',
        detail: 'Your observable holds the data. The component wants a string. So you write glue. Again.',
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>`,
        color: '#ef4444'
    },
    {
        stat: 'Every override',
        pain: 'Fighting Shadow DOM boundaries',
        detail: 'Your design tokens stop at the component edge. You reach for ::part() and pray it works in Safari.',
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>`,
        color: '#f97316'
    },
    {
        stat: '150KB+',
        pain: 'Shipping a framework to use 3 components',
        detail: 'You needed a button, a dropdown, and a table. You got React, a virtual DOM, and a reconciler.',
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>`,
        color: '#eab308'
    }
];

export function createProblem(): HTMLElement {
    const section = document.createElement('section');
    section.className = 'py-px-96 px-px-24 relative overflow-hidden';
    section.style.cssText = 'background: var(--md-sys-color-surface-container-low);';

    // Top border
    const topBorder = document.createElement('div');
    topBorder.className = 'absolute top-0 left-0 right-0 h-px';
    topBorder.style.cssText = 'background: linear-gradient(90deg, transparent 0%, rgba(79,70,229,0.2) 30%, rgba(99,102,241,0.2) 70%, transparent 100%);';
    section.appendChild(topBorder);

    const inner = document.createElement('div');
    inner.className = 'max-w-7xl mx-auto';

    // Header
    const header = document.createElement('div');
    header.className = 'mb-px-64';
    header.innerHTML = `
        <div class="inline-flex items-center gap-px-8 px-px-16 py-px-8 rounded-full text-label-medium mb-px-24 badge-accent opacity-80">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
            Sound familiar?
        </div>
        <h2 class="text-[36px] md:text-[44px] font-bold text-on-surface leading-tight" style="letter-spacing: -0.025em;">
            Building reactive UIs in vanilla TypeScript<br class="hidden md:block"> used to mean accepting trade-offs.
        </h2>
        <p class="mt-px-16 text-body-large text-on-surface-variant max-w-2xl" style="opacity: 0.75;">
            Every component library forces a choice: bring a framework, fight Shadow DOM, or write adapters between your observables and the UI.
        </p>
    `;
    inner.appendChild(header);

    // Pain point cards
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-3 gap-px-6';

    PAIN_POINTS.forEach(point => {
        const card = document.createElement('div');
        card.className = 'p-px-32 rounded-extra-large border relative overflow-hidden';
        card.style.cssText = `
            background: var(--md-sys-color-surface);
            border-color: rgba(121, 116, 126, 0.1);
        `;

        // Subtle color accent in top-right
        const accent = document.createElement('div');
        accent.className = 'absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2';
        accent.style.cssText = `background: radial-gradient(circle, ${point.color}15 0%, transparent 70%);`;
        card.appendChild(accent);

        const iconWrap = document.createElement('div');
        iconWrap.className = 'w-10 h-10 rounded-large flex items-center justify-center mb-px-20 border';
        iconWrap.style.cssText = `background: ${point.color}10; border-color: ${point.color}25; color: ${point.color};`;
        iconWrap.innerHTML = point.icon;

        const stat = document.createElement('div');
        stat.className = 'text-[32px] font-bold leading-none mb-px-8 tabular-nums';
        stat.style.cssText = `color: ${point.color};`;
        stat.textContent = point.stat;

        const pain = document.createElement('h3');
        pain.className = 'text-title-medium font-semibold text-on-surface mb-px-8';
        pain.textContent = point.pain;

        const detail = document.createElement('p');
        detail.className = 'text-body-medium text-on-surface-variant leading-relaxed';
        detail.style.cssText = 'opacity: 0.7;';
        detail.textContent = point.detail;

        card.appendChild(iconWrap);
        card.appendChild(stat);
        card.appendChild(pain);
        card.appendChild(detail);
        grid.appendChild(card);
    });

    inner.appendChild(grid);

    // Resolution line
    const resolution = document.createElement('div');
    resolution.className = 'mt-px-48 flex items-center gap-px-16';
    resolution.innerHTML = `
        <div class="h-px flex-1" style="background: linear-gradient(90deg, rgba(79,70,229,0.2), transparent);"></div>
        <p class="text-body-large text-on-surface-variant text-center shrink-0" style="opacity: 0.7;">
            Aura Components was built to eliminate all three.
        </p>
        <div class="h-px flex-1" style="background: linear-gradient(90deg, transparent, rgba(79,70,229,0.2));"></div>
    `;
    inner.appendChild(resolution);

    section.appendChild(inner);
    return section;
}
