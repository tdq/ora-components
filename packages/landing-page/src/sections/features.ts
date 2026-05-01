const FEATURES = [
    {
        title: 'RxJS Reactive',
        description: 'Every component speaks RxJS natively. Declarative state streams, real-time updates, zero unnecessary re-renders.',
        color: '#4338ca',
        colorLight: 'rgba(67, 56, 202, 0.08)',
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>`
    },
    {
        title: 'Tailwind CSS',
        description: 'Utility-first styling that scales with your project. Full Tailwind v3 support with custom Material 3 tokens baked in.',
        color: '#4f46e5',
        colorLight: 'rgba(79, 70, 229, 0.08)',
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="13.5" cy="6.5" r="2.5"/>
            <circle cx="17.5" cy="10.5" r="2.5"/>
            <circle cx="8.5" cy="7.5" r="2.5"/>
            <circle cx="6.5" cy="12.5" r="2.5"/>
            <path d="M12 20v-3.5a4 4 0 0 1 4-4h1.5"/>
        </svg>`
    },
    {
        title: 'Material 3',
        description: 'Adheres to Google\'s latest design language. Dynamic color, expressive motion, and accessible typography built in.',
        color: '#6366f1',
        colorLight: 'rgba(99, 102, 241, 0.08)',
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
        </svg>`
    },
    {
        title: 'Type Safe',
        description: 'Fully typed with strict TypeScript. Builder pattern APIs that are impossible to misuse. IDE autocomplete everywhere.',
        color: '#4338ca',
        colorLight: 'rgba(67, 56, 202, 0.08)',
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
        </svg>`
    },
    {
        title: 'Zero Bundle Bloat',
        description: 'Tree-shakeable exports. Import only what you use. Each component is self-contained with minimal runtime overhead.',
        color: '#4f46e5',
        colorLight: 'rgba(79, 70, 229, 0.08)',
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>`
    }
];

export function createFeatures(): HTMLElement {
    const section = document.createElement('section');
    section.id = 'features';
    section.className = 'py-px-96 px-px-24 bg-surface relative overflow-hidden';

    // Background texture
    const bgTexture = document.createElement('div');
    bgTexture.className = 'absolute inset-0 -z-10';
    bgTexture.innerHTML = `
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] rounded-full opacity-30" style="background: radial-gradient(ellipse, rgba(79,70,229,0.05) 0%, transparent 70%);"></div>
    `;
    section.appendChild(bgTexture);

    // Section header
    const header = document.createElement('div');
    header.className = 'max-w-7xl mx-auto mb-px-48';
    header.innerHTML = `
        <div class="inline-flex items-center gap-px-8 px-px-16 py-px-8 rounded-full text-label-medium mb-px-24 badge-accent">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            What makes it different
        </div>
        <h2 class="text-[36px] md:text-[44px] font-bold text-on-surface leading-tight" style="letter-spacing: -0.025em;">
            Not a framework wrapper.<br>
            <span class="text-gradient-2">Not a Web Component.</span>
        </h2>
        <p class="mt-px-16 text-body-large text-on-surface-variant max-w-2xl" style="opacity: 0.75;">
            Builder-pattern APIs, RxJS-native props, full Tailwind styling — and the DOM is yours. No encapsulation, no workarounds.
        </p>
    `;
    section.appendChild(header);

    // Hero feature card (No Shadow DOM — the most differentiating feature)
    const heroCard = createHeroFeatureCard();
    const heroWrap = document.createElement('div');
    heroWrap.className = 'max-w-7xl mx-auto mb-px-24';
    heroWrap.appendChild(heroCard);
    section.appendChild(heroWrap);

    // Feature grid (remaining 5 features)
    const grid = document.createElement('div');
    grid.className = 'max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px-24';

    FEATURES.forEach((feature, index) => {
        const card = createFeatureCard(feature, index);
        grid.appendChild(card);
    });

    section.appendChild(grid);

    // Animate cards on scroll
    requestAnimationFrame(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        (entry.target as HTMLElement).style.opacity = '1';
                        (entry.target as HTMLElement).style.transform = 'translateY(0)';
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1 }
        );

        grid.querySelectorAll('[data-feature-card]').forEach(card => {
            observer.observe(card);
        });
    });

    return section;
}

function createFeatureCard(feature: typeof FEATURES[0], index: number): HTMLElement {
    const card = document.createElement('div');
    card.setAttribute('data-feature-card', '');
    card.className = 'group p-px-32 rounded-extra-large border cursor-default';
    card.style.cssText = `
        background: linear-gradient(145deg, var(--md-sys-color-surface), var(--md-sys-color-surface-container-low));
        border-color: rgba(121, 116, 126, 0.1);
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateY(24px);
        transition-delay: ${index * 60}ms;
    `;

    card.onmouseenter = () => {
        card.style.cssText = `
            background: linear-gradient(145deg, var(--md-sys-color-surface), var(--md-sys-color-surface-container-low));
            border-color: ${feature.color}40;
            box-shadow: 0 8px 32px ${feature.color}18, 0 2px 8px rgba(0,0,0,0.06);
            transform: translateY(-4px);
            opacity: 1;
            transition: all 0.3s ease;
            transition-delay: ${index * 60}ms;
            cursor: default;
        `;
        iconWrap.style.cssText = `background: ${feature.colorLight}; border-color: ${feature.color}25; color: ${feature.color}; transition: all 0.3s ease; transform: scale(1.08);`;
    };

    card.onmouseleave = () => {
        card.style.cssText = `
            background: linear-gradient(145deg, var(--md-sys-color-surface), var(--md-sys-color-surface-container-low));
            border-color: rgba(121, 116, 126, 0.1);
            transform: translateY(0);
            opacity: 1;
            transition: all 0.3s ease;
            transition-delay: 0ms;
            cursor: default;
        `;
        iconWrap.style.cssText = `background: ${feature.colorLight}; border-color: ${feature.color}20; color: ${feature.color}; transition: all 0.3s ease; transform: scale(1);`;
    };

    const iconWrap = document.createElement('div');
    iconWrap.className = 'w-12 h-12 rounded-large flex items-center justify-center mb-px-24 border';
    iconWrap.style.cssText = `background: ${feature.colorLight}; border-color: ${feature.color}20; color: ${feature.color}; transition: all 0.3s ease;`;
    iconWrap.innerHTML = feature.icon;

    const title = document.createElement('h3');
    title.className = 'text-title-large text-on-surface mb-px-12 font-semibold';
    title.textContent = feature.title;

    const desc = document.createElement('p');
    desc.className = 'text-body-medium text-on-surface-variant leading-relaxed';
    desc.style.cssText = 'opacity: 0.75;';
    desc.textContent = feature.description;

    card.appendChild(iconWrap);
    card.appendChild(title);
    card.appendChild(desc);

    return card;
}

function createHeroFeatureCard(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'rounded-extra-large border overflow-hidden';
    card.style.cssText = `
        background: linear-gradient(145deg, var(--md-sys-color-surface), var(--md-sys-color-surface-container-low));
        border-color: rgba(79, 70, 229, 0.15);
        box-shadow: 0 4px 24px rgba(79,70,229,0.06);
    `;

    const inner = document.createElement('div');
    inner.className = 'grid grid-cols-1 md:grid-cols-2 gap-0';

    // Left: copy
    const copy = document.createElement('div');
    copy.className = 'p-px-40 flex flex-col justify-center';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'w-12 h-12 rounded-large flex items-center justify-center mb-px-24 border';
    iconWrap.style.cssText = 'background: rgba(79, 70, 229, 0.08); border-color: rgba(79,70,229,0.2); color: #4f46e5;';
    iconWrap.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 6h16M4 12h16M4 18h7"/>
        <circle cx="17" cy="18" r="3"/>
        <path d="m21 22-2.5-2.5"/>
    </svg>`;

    const label = document.createElement('div');
    label.className = 'text-label-medium mb-px-8 font-medium text-primary opacity-80';
    label.textContent = 'No Shadow DOM';

    const title = document.createElement('h3');
    title.className = 'text-[28px] font-bold text-on-surface leading-tight mb-px-16';
    title.style.cssText = 'letter-spacing: -0.02em;';
    title.textContent = 'Your CSS works. Every time.';

    const desc = document.createElement('p');
    desc.className = 'text-body-large text-on-surface-variant leading-relaxed';
    desc.style.cssText = 'opacity: 0.75;';
    desc.textContent = 'Direct DOM elements. No ::part(), no shadow-root, no encapsulation barriers. Your design tokens, your Tailwind classes, your overrides — they just reach in and work.';

    copy.appendChild(iconWrap);
    copy.appendChild(label);
    copy.appendChild(title);
    copy.appendChild(desc);

    // Right: before/after code comparison
    const comparison = document.createElement('div');
    comparison.className = 'border-l md:block hidden';
    comparison.style.cssText = 'border-color: rgba(79,70,229,0.1);';

    const before = document.createElement('div');
    before.className = 'p-px-24 border-b';
    before.style.cssText = 'border-color: rgba(79,70,229,0.1); background: rgba(239,68,68,0.02);';
    before.innerHTML = `
        <div class="flex items-center gap-px-8 mb-px-12">
            <span class="w-4 h-4 rounded-full flex items-center justify-center text-white" style="background: #ef4444; font-size: 9px; font-weight: 700;">✕</span>
            <span class="text-label-small font-medium" style="color: #ef4444; font-size: 11px;">Other Libraries (Shadow DOM)</span>
        </div>
        <pre style="margin:0; font-family: 'Fira Code', monospace; font-size: 11.5px; line-height: 1.7; color: var(--md-sys-color-on-surface-variant); opacity: 0.6;"><code>/* Your tokens don't cross the boundary */
:host { --btn-color: blue; }   /* maybe */
::part(base) { color: red; }   /* Safari? */
my-btn::part(label) { ... }    /* good luck */</code></pre>
    `;

    const after = document.createElement('div');
    after.className = 'p-px-24';
    after.style.cssText = 'background: rgba(79, 70, 229, 0.05);';
    after.innerHTML = `
        <div class="flex items-center gap-px-8 mb-px-12">
            <span class="w-4 h-4 rounded-full flex items-center justify-center text-white bg-primary" style="font-size: 9px; font-weight: 700;">✓</span>
            <span class="text-label-small font-medium text-primary" style="font-size: 11px;">Ora Components (Direct DOM)</span>
        </div>
        <pre style="margin:0; font-family: 'Fira Code', monospace; font-size: 11.5px; line-height: 1.7; color: var(--md-sys-color-on-surface-variant);"><code><span class="text-primary-alpha-80">/* Standard CSS. Just works. */</span>
.my-button { color: blue; }
[data-theme="dark"] .my-button { ... }
<span style="color: rgba(255,255,255,0.3);">/* Tailwind, CSS vars, anything. */</span></code></pre>
    `;

    comparison.appendChild(before);
    comparison.appendChild(after);

    inner.appendChild(copy);
    inner.appendChild(comparison);
    card.appendChild(inner);

    return card;
}
