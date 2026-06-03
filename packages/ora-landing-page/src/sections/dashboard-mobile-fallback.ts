import { router } from '../routes';

export function createDashboardMobileFallback(): HTMLElement {
    const section = document.createElement('section');
    section.className = 'min-h-screen w-full flex items-center justify-center px-px-24 py-px-64';
    section.style.cssText = 'background: linear-gradient(135deg, var(--md-sys-color-surface) 0%, var(--md-sys-color-surface-container-low) 100%);';

    const card = document.createElement('div');
    card.className = 'w-full max-w-md rounded-extra-large border p-px-32 text-center';
    card.style.cssText = 'background: var(--md-sys-color-surface); border-color: rgba(121,116,126,0.15); box-shadow: 0 8px 32px rgba(0,0,0,0.06);';

    card.innerHTML = `
        <div class="mx-auto mb-px-24 w-14 h-14 rounded-full flex items-center justify-center" style="background: rgba(79,70,229,0.1); color: #4f46e5;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
        </div>
        <h1 class="text-headline-small font-bold text-on-surface mb-px-12">Dashboard demo is desktop-only</h1>
        <p class="text-body-medium text-on-surface-variant mb-px-32" style="opacity: 0.75;">
            The interactive dashboard uses dense data tables and charts that don't fit on a phone screen. Please open this link on a wider screen to explore the demo.
        </p>
        <button id="dashboard-fallback-home" class="w-full py-px-12 px-px-24 rounded-large text-label-large font-medium text-white transition-all duration-200 hover:scale-[1.02] active:scale-95" style="background: linear-gradient(135deg, #4f46e5, #6366f1); box-shadow: 0 4px 16px rgba(79,70,229,0.25);">
            Back to home
        </button>
    `;

    section.appendChild(card);

    const homeBtn = card.querySelector('#dashboard-fallback-home');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => router.navigate('/'));
    }

    return section;
}
