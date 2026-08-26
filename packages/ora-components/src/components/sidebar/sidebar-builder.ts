import { Observable, Subject, isObservable, of } from 'rxjs';
import type { ComponentBuilder } from '../../core/component-builder';
import type { RouterBuilder } from '../../router/router-builder';
import { SIDEBAR_STORAGE_KEY, SidebarLogic } from './sidebar-logic';
import { createSidebarMenu, type SidebarMenu, type SidebarMenuBuilder } from './sidebar-menu';
import type { SidebarItemViewportConfig } from './sidebar-item-viewport';
import { buildSidebarViewport, type SidebarEntry, type SidebarFooterViewportConfig } from './sidebar-viewport';

export interface SidebarItemBuilder {
    /** Inline SVG markup (e.g. `Icons.HOME`), static or reactive. */
    withIcon(icon: string | Observable<string>): this;
    withCaption(caption: Observable<string>): this;
    /** Turns the row into a router link when the sidebar has a router. */
    withHref(href: string): this;
    /** Match the whole path instead of the prefix when deciding active state. */
    withExact(exact?: boolean): this;
    /** Ignored when the item also has a menu — see {@link SidebarItemBuilder.withMenu}. */
    withClick(cb: () => void): this;
    /**
     * Disabled rows stay visible but refuse clicks, report `aria-disabled`, drop
     * out of the tab order and (for router rows) lose their `href`, so
     * middle-click and the context menu cannot navigate either.
     */
    withEnabled(enabled: Observable<boolean>): this;
    /** Same semantics as `SlotBuilder.withVisible`: toggles display, no rebuild. */
    withVisible(visible: Observable<boolean>): this;
    /** Tooltip shown while collapsed; defaults to the caption. */
    withTooltip(text: Observable<string>): this;
    /**
     * Clicking the row opens this menu instead of navigating or running
     * `withClick` — the menu always wins. Created once.
     */
    withMenu(): SidebarMenuBuilder;
}

export interface SidebarFooterBuilder {
    withIcon(icon: string | Observable<string>): this;
    withAvatar(avatar: ComponentBuilder): this;
    withCaption(caption: Observable<string>): this;
    withDescription(desc: Observable<string>): this;
    withMenu(): SidebarMenuBuilder;
}

class SidebarItemBuilderImpl implements SidebarItemBuilder {
    private _icon$?: Observable<string>;
    private _caption$: Observable<string> = of('');
    private _href?: string;
    private _exact = false;
    private _click?: () => void;
    private _enabled$: Observable<boolean> = of(true);
    private _visible$?: Observable<boolean>;
    private _tooltip$?: Observable<string>;
    private _menu?: SidebarMenu;

    withIcon(icon: string | Observable<string>): this {
        this._icon$ = isObservable(icon) ? icon : of(icon);
        return this;
    }

    withCaption(caption: Observable<string>): this {
        this._caption$ = caption;
        return this;
    }

    withHref(href: string): this {
        this._href = href;
        return this;
    }

    withExact(exact: boolean = true): this {
        this._exact = exact;
        return this;
    }

    withClick(cb: () => void): this {
        this._click = cb;
        return this;
    }

    withEnabled(enabled: Observable<boolean>): this {
        this._enabled$ = enabled;
        return this;
    }

    withVisible(visible: Observable<boolean>): this {
        this._visible$ = visible;
        return this;
    }

    withTooltip(text: Observable<string>): this {
        this._tooltip$ = text;
        return this;
    }

    withMenu(): SidebarMenuBuilder {
        this._menu ??= createSidebarMenu();
        return this._menu;
    }

    /** Internal — not part of {@link SidebarItemBuilder}. */
    toViewportConfig(
        router: RouterBuilder | undefined,
        expanded$: Observable<boolean>,
        glass: boolean
    ): SidebarItemViewportConfig {
        return {
            icon$: this._icon$,
            caption$: this._caption$,
            href: this._href,
            exact: this._exact,
            click: this._click,
            enabled$: this._enabled$,
            visible$: this._visible$,
            tooltip$: this._tooltip$,
            menu: this._menu,
            router,
            expanded$,
            glass
        };
    }
}

class SidebarFooterBuilderImpl implements SidebarFooterBuilder {
    private _icon$?: Observable<string>;
    private _avatar?: ComponentBuilder;
    private _caption$?: Observable<string>;
    private _description$?: Observable<string>;
    private _menu?: SidebarMenu;

    withIcon(icon: string | Observable<string>): this {
        this._icon$ = isObservable(icon) ? icon : of(icon);
        return this;
    }

    withAvatar(avatar: ComponentBuilder): this {
        this._avatar = avatar;
        return this;
    }

    withCaption(caption: Observable<string>): this {
        this._caption$ = caption;
        return this;
    }

    withDescription(desc: Observable<string>): this {
        this._description$ = desc;
        return this;
    }

    withMenu(): SidebarMenuBuilder {
        this._menu ??= createSidebarMenu();
        return this._menu;
    }

    /** Internal — not part of {@link SidebarFooterBuilder}. */
    toViewportConfig(): SidebarFooterViewportConfig {
        return {
            icon$: this._icon$,
            avatar: this._avatar,
            caption$: this._caption$,
            description$: this._description$,
            menu: this._menu
        };
    }
}

/** Reads and writes the expanded flag, whoever owns it. */
interface ExpandedController {
    expanded$: Observable<boolean>;
    set(expanded: boolean): void;
    destroy(): void;
}

/**
 * Collapsible glass sidebar: a fixed-width icon rail that expands to show labels,
 * with router-aware nav rows, tooltips while collapsed and popover menus.
 *
 * ```ts
 * const sidebar = new SideBarBuilder()
 *     .withRouter(router)
 *     .withCaption(of('Aurora'))
 *     .asGlass();
 * sidebar.addItem().withIcon(Icons.HOME).withCaption(of('Dashboard')).withHref('/').withExact();
 * sidebar.addDivider();
 * sidebar.withFooter().withCaption(of('Northwind Ltd')).withDescription(of('Owner'));
 * container.appendChild(sidebar.build());
 * ```
 */
export class SideBarBuilder implements ComponentBuilder {
    private _router?: RouterBuilder;
    private _caption$: Observable<string> = of('');
    private _logo?: ComponentBuilder;
    private _expanded?: Subject<boolean>;
    private _storageKey: string = SIDEBAR_STORAGE_KEY;
    private _defaultExpanded = false;
    private _entries: (SidebarItemBuilderImpl | 'divider')[] = [];
    private _footer?: SidebarFooterBuilderImpl;
    private _glass = false;

    withRouter(router: RouterBuilder): this {
        this._router = router;
        return this;
    }

    /** Brand text shown when expanded; its first character is the default monogram. */
    withCaption(caption: Observable<string>): this {
        this._caption$ = caption;
        return this;
    }

    /** Custom brand mark replacing the monogram. */
    withLogo(logo: ComponentBuilder): this {
        this._logo = logo;
        return this;
    }

    /**
     * Two-way expanded state. When supplied the sidebar drives and observes this
     * subject only — it neither reads nor writes `localStorage`, and the narrow
     * viewport auto-collapse becomes the caller's business.
     */
    withExpanded(expanded: Subject<boolean>): this {
        this._expanded = expanded;
        return this;
    }

    /** localStorage key used when `withExpanded` is not supplied. */
    withStorageKey(key: string): this {
        this._storageKey = key;
        return this;
    }

    /**
     * Start expanded on a first visit. Only applies when `withExpanded` is not used and
     * `localStorage` holds no value for the storage key — a stored preference always wins,
     * and the <960px viewport still collapses the rail transiently.
     */
    asExpandedByDefault(): this {
        this._defaultExpanded = true;
        return this;
    }

    addItem(): SidebarItemBuilder {
        const item = new SidebarItemBuilderImpl();
        this._entries.push(item);
        return item;
    }

    addDivider(): this {
        this._entries.push('divider');
        return this;
    }

    withFooter(): SidebarFooterBuilder {
        this._footer ??= new SidebarFooterBuilderImpl();
        return this._footer;
    }

    asGlass(): this {
        this._glass = true;
        return this;
    }

    build(): HTMLElement {
        const controller = this._createExpandedController();

        const entries: SidebarEntry[] = this._entries.map(entry =>
            entry === 'divider'
                ? 'divider'
                : entry.toViewportConfig(this._router, controller.expanded$, this._glass)
        );

        return buildSidebarViewport({
            caption$: this._caption$,
            logo: this._logo,
            expanded$: controller.expanded$,
            onCollapse: () => controller.set(false),
            onExpand: () => controller.set(true),
            entries,
            footer: this._footer?.toViewportConfig(),
            glass: this._glass,
            onDestroy: () => controller.destroy()
        });
    }

    private _createExpandedController(): ExpandedController {
        const external = this._expanded;
        if (!external) {
            const logic = new SidebarLogic(this._storageKey, { defaultExpanded: this._defaultExpanded });
            return {
                expanded$: logic.expanded$,
                set: expanded => logic.setExpanded(expanded),
                destroy: () => logic.destroy()
            };
        }

        // The subject belongs to the caller: read it, write it, never complete it.
        return {
            expanded$: external,
            set: expanded => external.next(expanded),
            destroy: () => { /* caller owns the subject's lifetime */ }
        };
    }
}
