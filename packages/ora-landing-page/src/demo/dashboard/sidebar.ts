import { SideBarBuilder, type ComponentBuilder } from '@tdq/ora-components';
import { of } from 'rxjs';
import { router } from '../../routes';
import { createLogo } from '../../components/logo';
import oraComponentsPkg from '@tdq/ora-components/package.json';

/**
 * The demo's navigation rail, built entirely from the library's `SideBarBuilder`.
 *
 * Every subscription here belongs to the builder (captions, icons, active route,
 * tooltips), so there is nothing to `registerDestroy` — the sidebar tears its own
 * streams down when it leaves the DOM.
 */

interface NavItem {
    readonly label: string;
    readonly path: string;
    readonly exact?: boolean;
    readonly icon: string;
}

/** Inline SVGs carried over from the hand-rolled sidebar; the rail's CSS sizes them to 20px. */
const ICON_OVERVIEW = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`;
const ICON_PULSE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
const ICON_CUSTOMERS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
const ICON_ORDERS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`;
const ICON_SETTINGS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`;
const ICON_LEDGER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
const ICON_PL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`;
const ICON_BALANCE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`;
const ICON_PAYABLES = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`;
const ICON_BACK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;
const ICON_TAG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`;

/** Main Menu group. */
const MAIN_ITEMS: readonly NavItem[] = [
    { label: 'Overview', path: '/dashboard', exact: true, icon: ICON_OVERVIEW },
    { label: 'Analytics', path: '/dashboard/analytics', icon: ICON_PULSE },
    { label: 'Customers', path: '/dashboard/customers', icon: ICON_CUSTOMERS },
    { label: 'Orders', path: '/dashboard/orders', icon: ICON_ORDERS },
    { label: 'Settings', path: '/dashboard/settings', icon: ICON_SETTINGS }
];

/** Accounting group. */
const ACCOUNTING_ITEMS: readonly NavItem[] = [
    { label: 'Ledger', path: '/dashboard/ledger', icon: ICON_LEDGER },
    { label: 'P&L', path: '/dashboard/pl', icon: ICON_PL },
    { label: 'Balance Sheet', path: '/dashboard/balance-sheet', icon: ICON_BALANCE },
    { label: 'Payables', path: '/dashboard/payables', icon: ICON_PAYABLES }
];

/** Trading group. */
const TRADING_ITEMS: readonly NavItem[] = [
    { label: 'Trading terminal', path: '/dashboard/trading', icon: ICON_PULSE }
];

/** Remembers the expanded flag across reloads without colliding with other demos. */
const STORAGE_KEY = 'ora-dashboard-sidebar-expanded';

/**
 * The brand mark only gets the 36px slot inside the sidebar header, so the
 * landing page's full logo (mark + wordmark + subtitle) would overflow it — the
 * sidebar renders the caption itself. We hand it the gradient glyph alone.
 */
const logoMark: ComponentBuilder = {
    build: () =>
        createLogo().querySelector<HTMLElement>('.logo-icon') ?? document.createElement('span')
};

export function createSidebar(): SideBarBuilder {
    // A first-time visitor should meet the demo as a labelled rail, not a bare icon strip.
    // `asExpandedByDefault()` only applies while the key is absent, so a preference the
    // visitor has already set — and the narrow-viewport auto-collapse — still win.
    const sidebar = new SideBarBuilder()
        .withRouter(router)
        .withCaption(of('Ora Dashboard'))
        .withLogo(logoMark)
        .withStorageKey(STORAGE_KEY)
        .asExpandedByDefault();

    addGroup(sidebar, MAIN_ITEMS);
    sidebar.addDivider();
    addGroup(sidebar, ACCOUNTING_ITEMS);
    sidebar.addDivider();
    addGroup(sidebar, TRADING_ITEMS);

    // Leaving the demo is a one-click action, so it stays a nav row rather than
    // hiding behind the footer's popover menu.
    sidebar.addDivider();
    sidebar
        .addItem()
        .withIcon(ICON_BACK)
        .withCaption(of('Back to Landing'))
        .withClick(() => router.navigate('/'));

    // The footer carries the build identity the old logo showed as a subtitle.
    sidebar
        .withFooter()
        .withIcon(ICON_TAG)
        .withCaption(of(`v${oraComponentsPkg.version}`))
        .withDescription(of('Ora Components demo'));

    return sidebar;
}

function addGroup(sidebar: SideBarBuilder, items: readonly NavItem[]): void {
    for (const item of items) {
        sidebar
            .addItem()
            .withIcon(item.icon)
            .withCaption(of(item.label))
            .withHref(item.path)
            .withExact(item.exact ?? false);
    }
}
