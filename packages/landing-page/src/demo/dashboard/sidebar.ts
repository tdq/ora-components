import { registerDestroy } from '@tdq/ora-components';
import { router } from '../../routes';
import { map } from 'rxjs/operators';

export function createSidebar(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex flex-col h-full w-64 flex-shrink-0';
    container.style.cssText = 'background: var(--md-sys-color-surface-container-low); border-right: 1px solid rgba(121,116,126,0.1);';

    // Logo area
    const logoArea = document.createElement('div');
    logoArea.className = 'px-px-16 py-px-16 border-b';
    logoArea.style.cssText = 'border-color: rgba(121,116,126,0.08);';
    logoArea.innerHTML = `
        <div class="flex items-center gap-px-12 cursor-pointer group" id="sidebar-logo">
            <div class="w-8 h-8 rounded-large flex items-center justify-center flex-shrink-0" style="background: linear-gradient(135deg, #6750A4, #7D5260);">
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2L15.5 14H2.5L9 2Z" fill="white" fill-opacity="0.9"/>
                    <circle cx="9" cy="10" r="2.5" fill="white" fill-opacity="0.6"/>
                </svg>
            </div>
            <div class="flex flex-col">
                <span class="text-title-small font-semibold text-on-surface group-hover:text-primary transition-colors duration-200">Ora Dashboard</span>
                <span class="text-label-small text-on-surface-variant" style="opacity: 0.5;">v2.0 Demo</span>
            </div>
        </div>
    `;
    logoArea.querySelector('#sidebar-logo')?.addEventListener('click', () => {
        router.navigate('/');
    });

    // Nav section
    const navSection = document.createElement('div');
    navSection.className = 'flex-1 overflow-y-auto p-px-12';

    const navLabel = document.createElement('div');
    navLabel.className = 'px-px-12 mb-px-8 mt-px-8 text-label-small font-semibold text-on-surface-variant uppercase tracking-widest';
    navLabel.style.cssText = 'opacity: 0.4; letter-spacing: 0.1em;';
    navLabel.textContent = 'Main Menu';
    navSection.appendChild(navLabel);

    const items = [
        {
            label: 'Overview',
            path: '/dashboard',
            exact: true,
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`
        },
        {
            label: 'Analytics',
            path: '/dashboard/analytics',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`
        },
        {
            label: 'Customers',
            path: '/dashboard/customers',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
        },
        {
            label: 'Orders',
            path: '/dashboard/orders',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`
        },
        {
            label: 'Settings',
            path: '/dashboard/settings',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`
        }
    ];

    const accountingItems = [
        {
            label: 'Ledger',
            path: '/dashboard/ledger',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`
        },
        {
            label: 'P&L',
            path: '/dashboard/pl',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`
        },
        {
            label: 'Balance Sheet',
            path: '/dashboard/balance-sheet',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`
        },
        {
            label: 'Payables',
            path: '/dashboard/payables',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`
        }
    ];

    const makeNavButton = (item: { label: string; path: string; exact?: boolean; icon: string }) => {
        const btn = document.createElement('button');
        btn.className = 'w-full flex items-center gap-px-12 px-px-12 py-px-8 rounded-large text-label-large mb-1 relative transition-all duration-200';

        const updateActive = (currentPath: string) => {
            const isActive = item.exact ? currentPath === item.path : currentPath.startsWith(item.path);
            if (isActive) {
                btn.style.cssText = 'background: rgba(103,80,164,0.1); color: #6750A4;';
                if (!btn.querySelector('.accent-bar')) {
                    const accent = document.createElement('span');
                    accent.className = 'accent-bar absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full';
                    accent.style.cssText = 'background: linear-gradient(180deg, #6750A4, #7D5260);';
                    btn.appendChild(accent);
                }
            } else {
                btn.style.cssText = '';
                btn.className = 'w-full flex items-center gap-px-12 px-px-12 py-px-8 rounded-large text-label-large mb-1 text-on-surface-variant transition-colors duration-150 hover:bg-surface-variant-alpha-40';
                btn.querySelector('.accent-bar')?.remove();
            }
        };

        const sub = router.currentRoute$.pipe(map(r => r?.path ?? '/')).subscribe(updateActive);
        registerDestroy(btn, () => sub.unsubscribe());

        btn.insertAdjacentHTML('beforeend', `${item.icon}<span>${item.label}</span>`);
        btn.onclick = () => router.navigate(item.path);
        return btn;
    };

    items.forEach(item => navSection.appendChild(makeNavButton(item)));

    // Accounting section
    const accountingLabel = document.createElement('div');
    accountingLabel.className = 'px-px-12 mb-px-8 mt-px-16 text-label-small font-semibold text-on-surface-variant uppercase tracking-widest';
    accountingLabel.style.cssText = 'opacity: 0.4; letter-spacing: 0.1em;';
    accountingLabel.textContent = 'Accounting';
    navSection.appendChild(accountingLabel);

    accountingItems.forEach(item => navSection.appendChild(makeNavButton(item)));

    // Footer
    const sidebarFooter = document.createElement('div');
    sidebarFooter.className = 'p-px-12 border-t';
    sidebarFooter.style.cssText = 'border-color: rgba(121,116,126,0.08);';

    const backBtn = document.createElement('button');
    backBtn.className = 'w-full flex items-center gap-px-12 px-px-12 py-px-8 rounded-large text-label-large text-on-surface-variant transition-colors duration-150 hover:bg-surface-variant-alpha-40';
    backBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to Landing
    `;
    backBtn.onclick = () => router.navigate('/');
    sidebarFooter.appendChild(backBtn);

    container.appendChild(logoArea);
    container.appendChild(navSection);
    container.appendChild(sidebarFooter);

    return container;
}
