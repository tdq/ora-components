import { router } from '../routes';

const INSTALL_CODE = `npm install @tdq/ora-components rxjs`;

const USAGE_CODE = `import { ButtonBuilder, ButtonStyle } from '@tdq/ora-components';
import { of } from 'rxjs';

const btn = new ButtonBuilder()
  .withCaption(of('Hello, Ora!'))
  .withStyle(of(ButtonStyle.FILLED))
  .build();

document.body.appendChild(btn);`;

export function createGetStarted(): HTMLElement {
    const section = document.createElement('section');
    section.id = 'get-started';
    section.className = 'py-px-96 px-px-24 bg-surface relative overflow-hidden';

    // Subtle bg
    const bgDec = document.createElement('div');
    bgDec.className = 'absolute inset-0 -z-10';
    bgDec.innerHTML = `
        <div class="absolute top-1/2 right-[-100px] w-[500px] h-[500px] rounded-full -translate-y-1/2" style="background: radial-gradient(circle, rgba(79,70,229,0.05) 0%, transparent 70%);"></div>
    `;
    section.appendChild(bgDec);

    // Section header
    const header = document.createElement('div');
    header.className = 'max-w-7xl mx-auto text-center mb-px-64';
    header.innerHTML = `
        <div class="inline-flex items-center gap-px-8 px-px-16 py-px-8 rounded-full text-label-medium mb-px-24 badge-accent">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4zm2 2H5V5h14v14zm0-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
            Quick Start
        </div>
        <h2 class="text-[40px] font-bold text-on-surface leading-tight tracking-tight" style="letter-spacing: -0.025em;">
            Try it in <span class="text-gradient-2">60 seconds</span>
        </h2>
        <p class="mt-px-16 text-body-large text-on-surface-variant max-w-2xl mx-auto" style="opacity: 0.75;">
            One install. Pass your first observable to a component. That's it.
        </p>
        <div class="mt-px-24 mx-auto w-24 h-px" style="background: linear-gradient(90deg, transparent, var(--md-sys-color-primary), transparent); opacity: 0.4;"></div>
    `;
    section.appendChild(header);

    // Stats row
    section.appendChild(createStats());

    // Code block container
    const codeWrapper = document.createElement('div');
    codeWrapper.id = 'install-code';
    codeWrapper.className = 'max-w-3xl mx-auto mt-px-64';
    section.appendChild(codeWrapper);

    // Tab state
    let activeTab: 'install' | 'usage' = 'install';

    // Terminal window
    const terminal = document.createElement('div');
    terminal.className = 'rounded-extra-large overflow-hidden';
    terminal.style.cssText = 'background: #1a1625; box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06);';

    // Terminal header
    const termHeader = document.createElement('div');
    termHeader.className = 'flex items-center justify-between px-px-24 py-px-16 border-b';
    termHeader.style.cssText = 'border-color: rgba(255,255,255,0.06); background: rgba(255,255,255,0.03);';

    const dots = document.createElement('div');
    dots.className = 'flex items-center gap-px-8';
    dots.innerHTML = `
        <span class="w-3 h-3 rounded-full" style="background: #ff5f57;"></span>
        <span class="w-3 h-3 rounded-full" style="background: #febc2e;"></span>
        <span class="w-3 h-3 rounded-full" style="background: #28c840;"></span>
    `;

    const tabsRow = document.createElement('div');
    tabsRow.className = 'flex items-center gap-px-4';

    const installTab = createTermTab('Installation', true);
    const usageTab = createTermTab('Usage', false);

    const codeDisplay = document.createElement('div');
    codeDisplay.className = 'p-px-32 overflow-x-auto';
    codeDisplay.style.cssText = 'font-family: "Fira Code", "Cascadia Code", "JetBrains Mono", monospace; font-size: 13px; line-height: 1.7;';

    const renderCode = () => {
        if (activeTab === 'install') {
            codeDisplay.innerHTML = renderInstallCode();
        } else {
            codeDisplay.innerHTML = renderUsageCode();
        }
    };

    installTab.onclick = () => {
        activeTab = 'install';
        installTab.style.cssText = 'background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); padding: 4px 14px; border-radius: 6px; font-size: 12px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;';
        usageTab.style.cssText = 'background: transparent; color: rgba(255,255,255,0.4); padding: 4px 14px; border-radius: 6px; font-size: 12px; border: 1px solid transparent; cursor: pointer;';
        renderCode();
    };

    usageTab.onclick = () => {
        activeTab = 'usage';
        usageTab.style.cssText = 'background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); padding: 4px 14px; border-radius: 6px; font-size: 12px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;';
        installTab.style.cssText = 'background: transparent; color: rgba(255,255,255,0.4); padding: 4px 14px; border-radius: 6px; font-size: 12px; border: 1px solid transparent; cursor: pointer;';
        renderCode();
    };

    tabsRow.appendChild(installTab);
    tabsRow.appendChild(usageTab);

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'flex items-center gap-px-8 px-px-12 py-px-4 rounded-medium text-label-small transition-all duration-200';
    copyBtn.style.cssText = 'background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.1);';
    copyBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
    `;
    copyBtn.onclick = () => {
        const code = activeTab === 'install' ? INSTALL_CODE : USAGE_CODE;
        navigator.clipboard.writeText(code).then(() => {
            copyBtn.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Copied!
            `;
            copyBtn.style.cssText = 'background: rgba(40,200,64,0.15); color: #28c840; border: 1px solid rgba(40,200,64,0.3); padding: 4px 12px; border-radius: 6px; display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer;';
            setTimeout(() => {
                copyBtn.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy
                `;
                copyBtn.style.cssText = 'background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.1); padding: 4px 12px; border-radius: 6px; display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer;';
            }, 2000);
        });
    };

    termHeader.appendChild(dots);
    termHeader.appendChild(tabsRow);
    termHeader.appendChild(copyBtn);
    terminal.appendChild(termHeader);
    terminal.appendChild(codeDisplay);
    renderCode();

    codeWrapper.appendChild(terminal);

    // Bottom CTA
    section.appendChild(createBottomCTA());

    return section;
}

function createTermTab(label: string, active: boolean): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.style.cssText = active
        ? 'background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); padding: 4px 14px; border-radius: 6px; font-size: 12px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;'
        : 'background: transparent; color: rgba(255,255,255,0.4); padding: 4px 14px; border-radius: 6px; font-size: 12px; border: 1px solid transparent; cursor: pointer;';
    btn.textContent = label;
    return btn;
}

function renderInstallCode(): string {
    return `<pre style="margin:0; color: rgba(255,255,255,0.85);"><code><span style="color: #a78bfa;">$</span> <span style="color: #34d399;">npm</span> <span style="color: #e2e8f0;">install</span> <span style="color: #93c5fd;">@tdq/ora-components</span> <span style="color: #93c5fd;">rxjs</span>

<span style="color: rgba(255,255,255,0.3);"># or with yarn</span>
<span style="color: #a78bfa;">$</span> <span style="color: #34d399;">yarn</span> <span style="color: #e2e8f0;">add</span> <span style="color: #93c5fd;">@tdq/ora-components</span> <span style="color: #93c5fd;">rxjs</span>

<span style="color: rgba(255,255,255,0.3);"># or with pnpm</span>
<span style="color: #a78bfa;">$</span> <span style="color: #34d399;">pnpm</span> <span style="color: #e2e8f0;">add</span> <span style="color: #93c5fd;">@tdq/ora-components</span> <span style="color: #93c5fd;">rxjs</span></code></pre>`;
}

function renderUsageCode(): string {
    return `<pre style="margin:0; color: rgba(255,255,255,0.85);"><code><span style="color: #a78bfa;">import</span> <span style="color: #e2e8f0;">{</span> <span style="color: #93c5fd;">ButtonBuilder</span><span style="color: #e2e8f0;">,</span> <span style="color: #93c5fd;">ButtonStyle</span> <span style="color: #e2e8f0;">}</span> <span style="color: #a78bfa;">from</span> <span style="color: #fbbf24;">'@tdq/ora-components'</span><span style="color: #e2e8f0;">;</span>
<span style="color: #a78bfa;">import</span> <span style="color: #e2e8f0;">{</span> <span style="color: #93c5fd;">of</span> <span style="color: #e2e8f0;">}</span> <span style="color: #a78bfa;">from</span> <span style="color: #fbbf24;">'rxjs'</span><span style="color: #e2e8f0;">;</span>

<span style="color: #a78bfa;">const</span> <span style="color: #34d399;">btn</span> <span style="color: #e2e8f0;">=</span> <span style="color: #a78bfa;">new</span> <span style="color: #93c5fd;">ButtonBuilder</span><span style="color: #e2e8f0;">()</span>
  <span style="color: #e2e8f0;">.</span><span style="color: #34d399;">withCaption</span><span style="color: #e2e8f0;">(</span><span style="color: #93c5fd;">of</span><span style="color: #e2e8f0;">(</span><span style="color: #fbbf24;">'Hello, Ora!'</span><span style="color: #e2e8f0;">))</span>
  <span style="color: #e2e8f0;">.</span><span style="color: #34d399;">withStyle</span><span style="color: #e2e8f0;">(</span><span style="color: #93c5fd;">of</span><span style="color: #e2e8f0;">(</span><span style="color: #93c5fd;">ButtonStyle</span><span style="color: #e2e8f0;">.</span><span style="color: #fbbf24;">FILLED</span><span style="color: #e2e8f0;">))</span>
  <span style="color: #e2e8f0;">.</span><span style="color: #34d399;">build</span><span style="color: #e2e8f0;">();</span>

<span style="color: #93c5fd;">document</span><span style="color: #e2e8f0;">.</span><span style="color: #34d399;">body</span><span style="color: #e2e8f0;">.</span><span style="color: #34d399;">appendChild</span><span style="color: #e2e8f0;">(</span><span style="color: #34d399;">btn</span><span style="color: #e2e8f0;">);</span></code></pre>`;
}

function createStats(): HTMLElement {
    const stats = [
        { number: '0', unit: 'deps', label: 'Runtime deps (RxJS is a peer)' },
        { number: '~45', unit: 'kb', label: 'Gzipped — lighter than a single icon font' },
        { number: '100', unit: '%', label: 'TypeScript — strict, no any' },
    ];

    const grid = document.createElement('div');
    grid.className = 'max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-px-4';

    stats.forEach((stat) => {
        const item = document.createElement('div');
        item.className = 'flex flex-col items-center text-center p-px-32 rounded-extra-large';
        item.style.cssText = 'background: linear-gradient(145deg, var(--md-sys-color-surface-container-low), var(--md-sys-color-surface)); border: 1px solid rgba(121,116,126,0.1);';
        item.innerHTML = `
            <div class="flex items-baseline gap-1">
                <span class="text-[48px] font-bold leading-none tracking-tight text-gradient-1">${stat.number}</span>
                <span class="text-headline-small font-semibold text-primary opacity-70">${stat.unit}</span>
            </div>
            <span class="mt-px-8 text-label-medium text-on-surface-variant" style="opacity: 0.65;">${stat.label}</span>
        `;
        grid.appendChild(item);
    });

    return grid;
}

function getCTAThemeStyle(theme: string | null): string {
    if (theme === 'dark') return 'background: linear-gradient(135deg, #4F378B 0%, #633B48 100%); box-shadow: 0 20px 60px rgba(79,55,139,0.3);';
    if (theme === 'pink') return 'background: linear-gradient(135deg, #7D2950 0%, #5F1138 100%); box-shadow: 0 20px 60px rgba(125,41,80,0.3);';
    return 'background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); box-shadow: 0 20px 60px rgba(79,70,229,0.3);';
}

function createBottomCTA(): HTMLElement {
    const cta = document.createElement('div');
    cta.className = 'max-w-4xl mx-auto mt-px-96 rounded-extra-large p-px-64 text-center relative overflow-hidden';
    cta.style.cssText = getCTAThemeStyle(document.documentElement.getAttribute('data-theme'));

    // React to theme changes
    const observer = new MutationObserver(() => {
        cta.style.cssText = getCTAThemeStyle(document.documentElement.getAttribute('data-theme'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    cta.innerHTML = `
        <div class="absolute inset-0 overflow-hidden">
            <div class="absolute top-[-50%] left-[-20%] w-[400px] h-[400px] rounded-full opacity-20" style="background: radial-gradient(circle, white, transparent);"></div>
            <div class="absolute bottom-[-30%] right-[-10%] w-[300px] h-[300px] rounded-full opacity-10" style="background: radial-gradient(circle, white, transparent);"></div>
            <div class="absolute inset-0 opacity-[0.04]" style="background-image: url(&quot;data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E&quot;);"></div>
        </div>
        <div class="relative z-10">
            <h3 class="text-[36px] font-bold text-white leading-tight tracking-tight" style="letter-spacing: -0.025em;">npm install @tdq/ora-components rxjs<br><span style="opacity: 0.7; font-size: 0.75em; font-weight: 400;">— and you're done.</span></h3>
            <p class="mt-px-16 text-white max-w-lg mx-auto text-body-large" style="opacity: 0.75;">No config. No boilerplate. Pass your first observable to a component and watch it react.</p>
            <div class="mt-px-40 flex flex-wrap gap-px-16 justify-center">
                <button class="px-px-32 py-px-16 text-label-large font-semibold rounded-extra-large transition-all duration-200 hover:scale-105 active:scale-95 cta-primary-btn" style="background: white; color: var(--md-sys-color-primary); box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                    Get Started Now
                </button>
                <button class="px-px-32 py-px-16 text-label-large font-semibold text-white rounded-extra-large transition-all duration-200 hover:scale-105 active:scale-95 cta-demo-btn" style="background: rgba(255,255,255,0.12); border: 1.5px solid rgba(255,255,255,0.3); backdrop-filter: blur(10px);">
                    View Dashboard
                </button>
            </div>
        </div>
    `;

    // Wire up button events after insertion
    requestAnimationFrame(() => {
        const primaryBtn = cta.querySelector('.cta-primary-btn') as HTMLButtonElement;
        const demoBtn = cta.querySelector('.cta-demo-btn') as HTMLButtonElement;
        if (primaryBtn) {
            primaryBtn.onclick = () => {
                document.getElementById('install-code')?.scrollIntoView({ behavior: 'smooth' });
            };
        }
        if (demoBtn) {
            demoBtn.onclick = () => router.navigate('/dashboard');
        }
    });

    return cta;
}
