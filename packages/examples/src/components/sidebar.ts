import {
    SideBarBuilder,
    ComponentBuilder,
    Icons,
    registerDestroy,
} from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';

// ─── shared icons ────────────────────────────────────────────────────────────
// SideBarBuilder accepts raw inline SVG for withIcon() (Icons.* are just strings
// of the same shape) — these cover navigation concepts Icons doesn't have.

const ICON_DASHBOARD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>`;
const ICON_INVOICES = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/><path d="M9 13h6M9 17h6"/></svg>`;
const ICON_BUDGETS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`;
const ICON_REPORTS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></svg>`;
const ICON_SETTINGS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

/** Fixed-height wrapper — the sidebar rail is `height: 100%` in CSS and collapses to
 *  nothing without a sized ancestor; the examples page otherwise only gives it FIT
 *  width and auto height. */
function railBox(sidebar: ComponentBuilder): ComponentBuilder {
    return {
        build(): HTMLElement {
            const box = document.createElement('div');
            box.style.height = '480px';
            box.appendChild(sidebar.build());
            return box;
        },
    };
}

/**
 * Collapsible navigation rail
 *
 * `.withExpanded(Subject<boolean>)` hands the expanded flag to the caller instead
 * of the sidebar's default `localStorage`-backed state — the built-in header toggle
 * (and the collapsed brand's hover arrow) still drive it, but here it's a plain
 * `BehaviorSubject` seeded `true` so the example opens expanded and the rail's own
 * collapse control demonstrably flips the same subject a caller could also read
 * or set from outside (e.g. to sync a mobile drawer).
 *
 * Each `addItem()` returns a fresh `SidebarItemBuilder`; `.withIcon()` takes raw
 * inline SVG (or an `Observable<string>` for a reactive icon) — `Icons.*` are the
 * same shape. `.withExact()` matches the router path exactly instead of by prefix,
 * which matters for the '/' dashboard route so every other route doesn't also
 * light it up. `addDivider()` inserts a plain separator between groups of items.
 */
export function createSidebarExample(): ComponentBuilder {
    return {
        build(): HTMLElement {
            const expanded$ = new BehaviorSubject<boolean>(true);

            const sidebar = new SideBarBuilder()
                .withCaption(of('Aurora Finance'))
                .withExpanded(expanded$)
                .asGlass();

            sidebar.addItem()
                .withIcon(ICON_DASHBOARD)
                .withCaption(of('Dashboard'))
                .withHref('/')
                .withExact();
            sidebar.addItem()
                .withIcon(ICON_INVOICES)
                .withCaption(of('Invoices'))
                .withHref('/invoices');
            sidebar.addItem()
                .withIcon(ICON_BUDGETS)
                .withCaption(of('Budgets'))
                .withHref('/budgets');
            sidebar.addItem()
                .withIcon(ICON_REPORTS)
                .withCaption(of('Reports'))
                .withHref('/reports');
            sidebar.addDivider();
            sidebar.addItem()
                .withIcon(ICON_SETTINGS)
                .withCaption(of('Settings'))
                .withHref('/settings');

            const box = railBox(sidebar).build();
            registerDestroy(box, () => expanded$.complete());
            return box;
        },
    };
}

/**
 * Footer with avatar, description and a popover menu, plus a nav item with its
 * own menu
 *
 * `.withFooter()` is memoised — call it once and configure it. `.withAvatar()`
 * takes any `ComponentBuilder` (here a plain initials badge); without it the
 * footer falls back to `.withIcon()` or a monogram, same as the brand mark.
 *
 * `.withMenu()` — on a footer or on an item — returns a `SidebarMenuBuilder` that
 * opens a `PopoverBuilder`-backed menu to the side of the rail on click; a menu
 * always wins over `withHref`/`withClick` on the same row. `addDivider()` groups
 * the menu's own items, e.g. separating "Sign out" from the rest.
 */
export function createSidebarWithFooterMenuExample(): ComponentBuilder {
    return {
        build(): HTMLElement {
            const expanded$ = new BehaviorSubject<boolean>(true);

            const avatar: ComponentBuilder = {
                build(): HTMLElement {
                    const badge = document.createElement('div');
                    badge.textContent = 'MC';
                    badge.style.cssText =
                        'width:32px;height:32px;border-radius:50%;display:flex;align-items:center;' +
                        'justify-content:center;background:#6366f1;color:#fff;font-size:12px;font-weight:600;';
                    return badge;
                },
            };

            const sidebar = new SideBarBuilder()
                .withCaption(of('Northwind Ltd'))
                .withExpanded(expanded$)
                .asGlass();

            sidebar.addItem()
                .withIcon(ICON_DASHBOARD)
                .withCaption(of('Dashboard'))
                .withHref('/')
                .withExact();

            const reports = sidebar.addItem()
                .withIcon(ICON_REPORTS)
                .withCaption(of('Reports'));
            const reportsMenu = reports.withMenu();
            reportsMenu.addItem().withCaption(of('Export as CSV')).withClick(() => {});
            reportsMenu.addItem().withCaption(of('Print')).withClick(() => {});

            sidebar.addItem()
                .withIcon(ICON_SETTINGS)
                .withCaption(of('Settings'))
                .withHref('/settings');

            const footer = sidebar.withFooter();
            footer.withAvatar(avatar);
            footer.withCaption(of('Maria Chen'));
            footer.withDescription(of('Finance Owner'));
            const footerMenu = footer.withMenu();
            footerMenu.addItem().withCaption(of('Profile')).withClick(() => {});
            footerMenu.addItem().withCaption(of('Preferences')).withClick(() => {});
            footerMenu.addDivider();
            footerMenu.addItem().withCaption(of('Sign out')).withClick(() => {});

            const box = railBox(sidebar).build();
            registerDestroy(box, () => expanded$.complete());
            return box;
        },
    };
}
