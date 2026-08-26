import { Observable, Subscription } from 'rxjs';
import type { RouterBuilder } from '../../router/router-builder';
import { cn } from '../../utils/cn';
import { attachSidebarTooltip, hideSidebarTooltip } from './sidebar-tooltip';
import type { SidebarMenu } from './sidebar-menu';

export interface SidebarItemViewportConfig {
    icon$?: Observable<string>;
    caption$: Observable<string>;
    href?: string;
    exact: boolean;
    click?: () => void;
    enabled$: Observable<boolean>;
    visible$?: Observable<boolean>;
    tooltip$?: Observable<string>;
    menu?: SidebarMenu;
    /** Sidebar-level context. */
    router?: RouterBuilder;
    expanded$: Observable<boolean>;
    glass: boolean;
}

export interface SidebarItemViewport {
    element: HTMLElement;
    subscription: Subscription;
}

/**
 * Decides whether `currentPath` activates `href`, with the same semantics as
 * `src/router/link.ts`: prefix match by default, whole-path match with `exact`.
 */
function isActive(href: string, currentPath: string, exact: boolean): boolean {
    if (exact) return currentPath === href;
    if (href === '/') return currentPath === '/';
    return currentPath.startsWith(href);
}

/**
 * One nav row: icon + label, optionally a router link, optionally a popover menu.
 *
 * `LinkBuilder` is deliberately not reused — it owns the anchor's `textContent`,
 * which would wipe the icon/label spans on every emission (aura-accounting needed
 * a `MutationObserver` to fight it). The click and active-route semantics below
 * are the ones from `link.ts`, applied to a row we own outright.
 */
export function buildSidebarItem(config: SidebarItemViewportConfig): SidebarItemViewport {
    const subscription = new Subscription();
    const isLink = Boolean(config.router && config.href && !config.menu);

    const element: HTMLElement = isLink
        ? document.createElement('a')
        : document.createElement('button');

    element.className = cn('ora-sidebar-item');

    if (isLink) {
        element.setAttribute('href', config.href!);
    } else {
        (element as HTMLButtonElement).type = 'button';
    }

    // ---- icon ----
    if (config.icon$) {
        const icon = document.createElement('span');
        icon.className = 'ora-sidebar-item-icon';
        icon.setAttribute('aria-hidden', 'true');
        subscription.add(config.icon$.subscribe(svg => {
            icon.innerHTML = svg;
        }));
        element.appendChild(icon);
    }

    // ---- label ----
    const label = document.createElement('span');
    label.className = 'ora-sidebar-item-label';
    element.appendChild(label);

    subscription.add(config.caption$.subscribe(caption => {
        label.textContent = caption;
        // Collapsed, the label is visually hidden, so the row needs its own name.
        element.setAttribute('aria-label', caption);
    }));

    // ---- enabled ----
    // A disabled row stays visible — a missing nav item reads as a broken product,
    // a disabled one is self-explanatory — but it must stop behaving like a link:
    // an <a href> still navigates on middle-click, "Open in new tab" and the
    // context menu, none of which a click handler can intercept. Dropping href
    // makes it inert at the source; tabindex -1 takes it out of the tab order.
    let enabled = true;
    subscription.add(config.enabled$.subscribe(value => {
        enabled = value;
        element.setAttribute('aria-disabled', String(!value));
        element.classList.toggle('ora-sidebar-item--disabled', !value);

        if (value) {
            element.removeAttribute('tabindex');
            if (isLink) element.setAttribute('href', config.href!);
        } else {
            element.setAttribute('tabindex', '-1');
            if (isLink) element.removeAttribute('href');
        }
    }));

    // Capture phase: refuse the click before navigation or the menu sees it.
    element.addEventListener('click', event => {
        if (enabled) return;
        event.preventDefault();
        event.stopImmediatePropagation();
    }, true);

    // ---- visibility (SlotBuilder.withVisible semantics: toggle display, no rebuild) ----
    if (config.visible$) {
        subscription.add(config.visible$.subscribe(visible => {
            element.style.display = visible ? '' : 'none';
        }));
    }

    // ---- active route ----
    if (isLink) {
        const href = config.href!;
        subscription.add(config.router!.currentRoute$.subscribe(route => {
            const active = isActive(href, route?.path ?? '', config.exact);
            element.classList.toggle('ora-sidebar-item--active', active);
            if (active) {
                element.setAttribute('aria-current', 'page');
            } else {
                element.removeAttribute('aria-current');
            }
        }));

        element.addEventListener('click', event => {
            // Same guard as link.ts: only intercept a plain left-click, so
            // middle-click, Ctrl/Cmd-click and friends keep browser behaviour.
            const isLeftClick = event.button === 0;
            const hasModifier = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
            const hasTarget = element.hasAttribute('target');
            if (isLeftClick && !hasModifier && !event.defaultPrevented && !hasTarget) {
                event.preventDefault();
                config.router!.navigate(element.getAttribute('href') ?? href);
            }
        });
    }

    // ---- menu (wins over withClick: the row opens the menu instead of acting) ----
    if (config.menu) {
        element.setAttribute('aria-haspopup', 'menu');
        const handle = config.menu.attach(element, config.glass);
        subscription.add(handle.subscription);
        element.addEventListener('click', event => {
            event.stopPropagation();
            // The tooltip and the menu describe the same row; stacking them is noise.
            hideSidebarTooltip();
            handle.toggle();
        });
    } else if (config.click) {
        element.addEventListener('click', () => config.click!());
    }

    // ---- tooltip (collapsed only) ----
    subscription.add(
        attachSidebarTooltip(element, config.tooltip$ ?? config.caption$, config.expanded$)
    );

    return { element, subscription };
}
