import { Observable, ReplaySubject, Subscription, of } from 'rxjs';
import type { ComponentBuilder } from '../../core/component-builder';
import { Icons } from '../../core/icons';
import { cn } from '../../utils/cn';
import { createLifecycleBoundary } from '../../core/lifecycle-boundary';
import type { SidebarMenu } from './sidebar-menu';
import { attachSidebarTooltip, hideSidebarTooltip } from './sidebar-tooltip';
import { SidebarItemViewportConfig, buildSidebarItem } from './sidebar-item-viewport';

export interface SidebarFooterViewportConfig {
    icon$?: Observable<string>;
    avatar?: ComponentBuilder;
    caption$?: Observable<string>;
    description$?: Observable<string>;
    menu?: SidebarMenu;
}

export type SidebarEntry = SidebarItemViewportConfig | 'divider';

export interface SidebarViewportConfig {
    caption$: Observable<string>;
    logo?: ComponentBuilder;
    expanded$: Observable<boolean>;
    /** Header chevron — only reachable while expanded. */
    onCollapse: () => void;
    /** Brand button — only reachable while collapsed. */
    onExpand: () => void;
    entries: SidebarEntry[];
    footer?: SidebarFooterViewportConfig;
    glass: boolean;
    /** Extra teardown owned by the builder (e.g. `SidebarLogic.destroy`). */
    onDestroy?: () => void;
}

const PANEL_SOLID = 'ora-sidebar-panel--solid';
const ANIMATING_CLASS = 'ora-sidebar--animating';

/** Must outlast the 0.28s width transition; only a safety net for a missed transitionend. */
const ANIMATION_FALLBACK_MS = 400;

/** Accessible name for the footer row when it has neither caption nor description. */
const FOOTER_FALLBACK_NAME = 'Menu';

/**
 * True when the operator asked the OS to minimise animation. The width
 * transition is then `transition: none`, so `transitionend` never fires and the
 * animating class would linger for the whole fallback timeout — turning a
 * mitigation into a visible blur flash on every toggle.
 */
function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function buildDivider(): HTMLElement {
    const divider = document.createElement('div');
    divider.className = 'ora-sidebar-divider';
    divider.setAttribute('role', 'separator');
    return divider;
}

/**
 * Brand: monogram (first character of the caption) or a caller-supplied logo,
 * plus the chevron that replaces it on hover while collapsed.
 *
 * It is a real `<button>`, not a decorative div: while collapsed it is the only
 * control that can expand the sidebar (the header chevron is display:none), so
 * it has to be reachable by keyboard. Native button semantics give us Enter and
 * Space for free. Expanded, it has nothing to do and is disabled.
 */
function buildBrand(config: SidebarViewportConfig, subscription: Subscription): HTMLElement {
    const brand = document.createElement('button');
    brand.type = 'button';
    brand.className = 'ora-sidebar-brand';

    const markWrap = document.createElement('span');
    markWrap.className = 'ora-sidebar-brand-mark-wrap';

    const mark = document.createElement('span');
    mark.className = 'ora-sidebar-brand-mark';
    if (config.logo) mark.appendChild(config.logo.build());

    const arrow = document.createElement('span');
    arrow.className = 'ora-sidebar-brand-arrow';
    arrow.innerHTML = Icons.PANEL_EXPAND;
    arrow.setAttribute('aria-hidden', 'true');

    markWrap.appendChild(mark);
    markWrap.appendChild(arrow);

    const text = document.createElement('span');
    text.className = 'ora-sidebar-brand-text';

    brand.appendChild(markWrap);
    brand.appendChild(text);

    let expanded = false;
    let caption = '';

    const applyName = (): void => {
        // Collapsed the button expands the sidebar, so its name says so rather
        // than repeating the brand, which the visible text already carries.
        brand.setAttribute('aria-label', expanded ? caption : 'Expand sidebar');
    };

    // One subscription, both consumers: the monogram is just the caption's first
    // character, so deriving it here avoids a second pass over the same stream.
    subscription.add(config.caption$.subscribe(value => {
        caption = value;
        text.textContent = value;
        if (!config.logo) mark.textContent = value.charAt(0).toUpperCase();
        applyName();
    }));

    const applyExpanded = (value: boolean): void => {
        expanded = value;
        brand.disabled = value;
        brand.classList.toggle('ora-sidebar-brand--interactive', !value);
        brand.classList.remove('ora-sidebar-brand--hovered');
        applyName();
    };

    // Seeded before subscribing: a plain Subject<boolean> has no current value,
    // and until it emits the sidebar renders collapsed — the brand has to be
    // interactive and correctly named from the first paint, not from the first
    // emission that may never come.
    applyExpanded(false);
    subscription.add(config.expanded$.subscribe(applyExpanded));

    brand.addEventListener('click', () => {
        if (!expanded) config.onExpand();
    });
    brand.addEventListener('mouseenter', () => {
        if (!expanded) brand.classList.add('ora-sidebar-brand--hovered');
    });
    brand.addEventListener('mouseleave', () => {
        brand.classList.remove('ora-sidebar-brand--hovered');
    });

    return brand;
}

function buildHeader(config: SidebarViewportConfig, subscription: Subscription): HTMLElement {
    const header = document.createElement('div');
    header.className = 'ora-sidebar-header';
    header.dataset.slot = 'header';

    header.appendChild(buildBrand(config, subscription));

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'ora-sidebar-header-toggle';
    toggle.setAttribute('aria-label', 'Collapse sidebar');
    toggle.innerHTML = Icons.PANEL_COLLAPSE;

    let expanded = false;
    const applyExpanded = (value: boolean): void => {
        expanded = value;
        // display:none, not opacity/pointer-events: collapsed, this button sits on
        // top of the brand mark and would swallow its clicks and hover, and an
        // invisible-but-focusable control is a tab stop that does nothing.
        toggle.style.display = value ? 'flex' : 'none';
        toggle.setAttribute('aria-expanded', String(value));
    };

    // Seeded collapsed for the same reason as the brand: with a plain Subject
    // the first emission may be arbitrarily late, and an unseeded toggle renders
    // visible and inert on top of the brand.
    applyExpanded(false);
    subscription.add(config.expanded$.subscribe(applyExpanded));

    toggle.addEventListener('click', event => {
        event.stopPropagation();
        if (expanded) config.onCollapse();
    });

    header.appendChild(toggle);
    return header;
}

function buildFooter(
    footer: SidebarFooterViewportConfig,
    config: SidebarViewportConfig,
    subscription: Subscription
): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'ora-sidebar-footer';
    wrapper.dataset.slot = 'footer';

    // Only a footer with a menu is a control. Without one there is nothing to
    // activate, and rendering a <button> with a chevron promises an interaction
    // that does not exist — and adds a dead tab stop.
    const interactive = Boolean(footer.menu);
    const button = document.createElement(interactive ? 'button' : 'div');
    button.className = interactive ? 'ora-sidebar-footer-button' : 'ora-sidebar-footer-content';
    if (interactive) (button as HTMLButtonElement).type = 'button';

    const avatar = document.createElement('span');
    avatar.className = 'ora-sidebar-footer-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    if (footer.avatar) {
        avatar.appendChild(footer.avatar.build());
    } else if (footer.icon$) {
        subscription.add(footer.icon$.subscribe(svg => {
            avatar.innerHTML = svg;
        }));
    }
    button.appendChild(avatar);

    const info = document.createElement('span');
    info.className = 'ora-sidebar-footer-info';

    const caption = document.createElement('span');
    caption.className = 'ora-sidebar-footer-caption';
    info.appendChild(caption);

    const description = document.createElement('span');
    description.className = 'ora-sidebar-footer-description';
    if (footer.description$) {
        subscription.add(footer.description$.subscribe(value => {
            description.textContent = value;
        }));
    }
    info.appendChild(description);

    button.appendChild(info);

    if (interactive) {
        const chevron = document.createElement('span');
        chevron.className = 'ora-sidebar-footer-chevron';
        chevron.innerHTML = Icons.CHEVRON_RIGHT;
        chevron.setAttribute('aria-hidden', 'true');
        button.appendChild(chevron);
    }

    // An avatar-only footer (no caption) is a graphic with no text: without this
    // fallback the button is nameless to a screen reader and has no tooltip while
    // collapsed, which is exactly when the label is hidden.
    const source$ = footer.caption$ ?? footer.description$ ?? of(FOOTER_FALLBACK_NAME);

    // One subscription, three consumers (label, accessible name, tooltip): the source may
    // be a cold stream doing real work per subscriber, so it is fanned out here — as
    // buildBrand does for the caption it shares between the monogram and the brand text.
    const name$ = new ReplaySubject<string>(1);
    subscription.add(source$.subscribe(value => {
        if (footer.caption$) caption.textContent = value;
        // aria-label only names a widget; on a plain <div> it is noise.
        if (interactive) button.setAttribute('aria-label', value);
        name$.next(value);
    }));
    subscription.add(() => name$.complete());

    if (footer.menu) {
        button.setAttribute('aria-haspopup', 'menu');
        const handle = footer.menu.attach(button, config.glass);
        subscription.add(handle.subscription);
        button.addEventListener('click', event => {
            event.stopPropagation();
            // The tooltip and the menu describe the same row; stacking them is noise.
            hideSidebarTooltip();
            handle.toggle();
        });
    }

    subscription.add(attachSidebarTooltip(button, name$, config.expanded$));

    wrapper.appendChild(button);
    return wrapper;
}

/**
 * Assembles wrapper > panel > (header / nav / footer) and syncs the expanded class.
 *
 * While the width is in flight the wrapper carries `.ora-sidebar--animating`,
 * which switches `backdrop-filter` off on a glass panel. A backdrop-filtered
 * surface is re-composited every frame, and re-blurring a resizing panel drops
 * the animation to single-digit fps on mid-range hardware. The class is removed
 * on the wrapper's own `width` transitionend, with a timeout fallback for the
 * case where the transition never runs (reduced motion, display:none, an
 * interrupted transition) and transitionend therefore never fires.
 */
export function buildSidebarViewport(config: SidebarViewportConfig): HTMLElement {
    const subscription = new Subscription();

    const wrapper = document.createElement('div');
    wrapper.className = cn('ora-sidebar');

    const panel = document.createElement('div');
    panel.className = cn('ora-sidebar-panel', config.glass ? 'glass-effect' : PANEL_SOLID);

    const inner = document.createElement('div');
    inner.className = 'ora-sidebar-inner';

    inner.appendChild(buildHeader(config, subscription));

    const nav = document.createElement('nav');
    nav.className = 'ora-sidebar-nav';
    nav.dataset.slot = 'nav';

    for (const entry of config.entries) {
        if (entry === 'divider') {
            nav.appendChild(buildDivider());
            continue;
        }
        const item = buildSidebarItem(entry);
        subscription.add(item.subscription);
        nav.appendChild(item.element);
    }
    inner.appendChild(nav);

    if (config.footer) {
        inner.appendChild(buildFooter(config.footer, config, subscription));
    }

    panel.appendChild(inner);
    wrapper.appendChild(panel);

    let animationTimer: ReturnType<typeof setTimeout> | undefined;

    const endAnimation = (): void => {
        if (animationTimer !== undefined) {
            clearTimeout(animationTimer);
            animationTimer = undefined;
        }
        wrapper.classList.remove(ANIMATING_CLASS);
    };

    const onTransitionEnd = (event: TransitionEvent): void => {
        if (event.target === wrapper && event.propertyName === 'width') endAnimation();
    };
    wrapper.addEventListener('transitionend', onTransitionEnd);

    // Seeded to the collapsed state the DOM is rendered in, so the first emission
    // that merely confirms it is not mistaken for a width change.
    let previousExpanded = false;
    let firstEmission = true;

    subscription.add(config.expanded$.subscribe(expanded => {
        wrapper.classList.toggle('ora-sidebar--expanded', expanded);

        // The initial state paints at its final width — nothing animates, so
        // suspending the blur for it would only cost a frame of un-blurred glass.
        // A re-emission of the same value is not a width change either.
        const changed = !firstEmission && expanded !== previousExpanded;
        firstEmission = false;
        previousExpanded = expanded;

        // No transition means no transitionend: the class would be held for the
        // whole fallback timeout and flash the blur off on every toggle.
        if (!changed || prefersReducedMotion()) return;

        if (animationTimer !== undefined) clearTimeout(animationTimer);
        wrapper.classList.add(ANIMATING_CLASS);
        animationTimer = setTimeout(endAnimation, ANIMATION_FALLBACK_MS);
    }));

    // The width transition is gated on this attribute so the sidebar does not
    // animate from 0 on its first paint; it is stamped one frame after mount.
    const frame = typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame(() => wrapper.setAttribute('data-sidebar-initialized', ''))
        : undefined;

    const boundary = createLifecycleBoundary();
    boundary.onDisconnect = () => {
        if (frame !== undefined) cancelAnimationFrame(frame);
        // Clears the fallback timer and drops the class, so a wrapper detached mid-transition
        // and re-attached later does not come back with the blur still suspended.
        endAnimation();
        wrapper.removeEventListener('transitionend', onTransitionEnd);
        subscription.unsubscribe();
        config.onDestroy?.();
    };
    wrapper.appendChild(boundary);

    return wrapper;
}
