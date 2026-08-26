import { Observable, Subscription, isObservable, of } from 'rxjs';
import type { ComponentBuilder } from '../../core/component-builder';
import { PopoverBuilder, PopoverPlacement } from '../component-parts/popover';
import { cn } from '../../utils/cn';

/**
 * Preferred menu height. A RIGHT-placed popover never flips vertically, so an
 * unbounded menu would run off the bottom of the viewport; the popover clamps
 * this to the viewport and hands the result to the scroll element below.
 */
const MENU_MAX_HEIGHT = 320;

/** Gap between the sidebar rail and the menu that opens beside it. */
const MENU_OFFSET = 8;

export interface SidebarMenuItemBuilder {
    /** Inline SVG markup (e.g. `Icons.SETTINGS`), static or reactive. */
    withIcon(icon: string | Observable<string>): this;
    withCaption(caption: Observable<string>): this;
    withClick(cb: () => void): this;
    withEnabled(enabled: Observable<boolean>): this;
}

export interface SidebarMenuBuilder {
    addItem(): SidebarMenuItemBuilder;
    addDivider(): this;
}

/** Handle the owner of the anchor's lifetime holds onto. */
export interface SidebarMenuHandle {
    subscription: Subscription;
    toggle(): void;
    close(): void;
}

/**
 * Module-internal view of a menu: the public builder surface plus the one
 * method the sidebar viewports need. Exported as an interface only — the impl
 * class stays module-private (see `.agent/builder-pattern.md`), so construction
 * goes through {@link createSidebarMenu}.
 */
export interface SidebarMenu extends SidebarMenuBuilder {
    attach(anchor: HTMLElement, glass: boolean): SidebarMenuHandle;
}

class SidebarMenuItemBuilderImpl implements SidebarMenuItemBuilder {
    private _icon$?: Observable<string>;
    private _caption$: Observable<string> = of('');
    private _click?: () => void;
    private _enabled$: Observable<boolean> = of(true);

    withIcon(icon: string | Observable<string>): this {
        this._icon$ = isObservable(icon) ? icon : of(icon);
        return this;
    }

    withCaption(caption: Observable<string>): this {
        this._caption$ = caption;
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

    render(subscription: Subscription, onAfterClick: () => void): HTMLElement {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'menuitem');
        button.className = 'ora-sidebar-menu-item';
        // Roving tabindex: the open menu promotes exactly one item to 0.
        button.tabIndex = -1;

        if (this._icon$) {
            const icon = document.createElement('span');
            icon.className = 'ora-sidebar-menu-item-icon';
            icon.setAttribute('aria-hidden', 'true');
            subscription.add(this._icon$.subscribe(svg => {
                icon.innerHTML = svg;
            }));
            button.appendChild(icon);
        }

        const label = document.createElement('span');
        label.className = 'ora-sidebar-menu-item-label';
        subscription.add(this._caption$.subscribe(caption => {
            label.textContent = caption;
        }));
        button.appendChild(label);

        let enabled = true;
        subscription.add(this._enabled$.subscribe(value => {
            enabled = value;
            button.disabled = !value;
            button.setAttribute('aria-disabled', String(!value));
            button.classList.toggle('ora-sidebar-menu-item--disabled', !value);
        }));

        button.addEventListener('click', () => {
            if (!enabled) return;
            this._click?.();
            onAfterClick();
        });

        return button;
    }
}

/**
 * The popover menu opened by a sidebar item or the footer.
 *
 * `PopoverBuilder` already owns outside-click, the single-active-popover rule,
 * dialog re-parenting and reposition on scroll/resize; placement, the anchor's
 * `aria-expanded` and teardown are ours.
 */
class SidebarMenuImpl implements SidebarMenu {
    private readonly _entries: (SidebarMenuItemBuilderImpl | 'divider')[] = [];

    addItem(): SidebarMenuItemBuilder {
        const item = new SidebarMenuItemBuilderImpl();
        this._entries.push(item);
        return item;
    }

    addDivider(): this {
        this._entries.push('divider');
        return this;
    }

    attach(anchor: HTMLElement, glass: boolean): SidebarMenuHandle {
        const subscription = new Subscription();
        let isOpen = false;
        let keysAttached = false;

        // The anchor announces the menu's state on both open and close edges,
        // including closes we never initiated (outside click, scroll, another
        // popover stealing the single active slot).
        const setExpanded = (open: boolean): void => {
            isOpen = open;
            anchor.setAttribute('aria-expanded', String(open));
        };
        setExpanded(false);

        // Every close lands here, whoever started it. PopoverBuilder closes itself
        // on outside click, on eviction by another popover and on native dismissal,
        // and withOnClose is the only hook it calls on those paths — so the
        // bookkeeping (state, aria, keyboard listener) has to live in one function
        // that both it and our own close() go through, or the keydown listener
        // survives a close we did not initiate.
        const onClosed = (): void => {
            setExpanded(false);
            detachKeys();
        };

        const popover = new PopoverBuilder()
            .withAnchor(anchor)
            .withPlacement(PopoverPlacement.RIGHT)
            .withOffset(MENU_OFFSET)
            .withClass('ora-sidebar-menu')
            .withMaxHeight(MENU_MAX_HEIGHT)
            .withOnClose(() => onClosed());

        if (glass) popover.asGlass();

        // popover.close() fires onClosed through withOnClose; calling it again is
        // harmless (both halves are idempotent) and covers the already-closed path,
        // where PopoverBuilder early-returns without invoking the callback.
        const close = (): void => {
            if (isOpen) popover.close();
            onClosed();
        };

        const menu = document.createElement('div');
        menu.setAttribute('role', 'menu');
        menu.dataset.slot = 'menu';
        menu.className = cn('ora-sidebar-menu-list');

        for (const entry of this._entries) {
            if (entry === 'divider') {
                const divider = document.createElement('div');
                divider.className = 'ora-sidebar-menu-divider';
                divider.setAttribute('role', 'separator');
                menu.appendChild(divider);
                continue;
            }
            menu.appendChild(entry.render(subscription, close));
        }

        // --- WAI-ARIA menu-button keyboard contract ---
        // role="menu" is a promise: arrow keys move between items, Tab does not.
        // Roving tabindex keeps exactly one item in the tab order at a time.

        /** Enabled items only — a disabled <button> cannot hold focus. */
        const enabledItems = (): HTMLButtonElement[] =>
            Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
                .filter(item => !item.disabled);

        const focusItem = (index: number): void => {
            const items = enabledItems();
            if (items.length === 0) return;
            const target = items[(index + items.length) % items.length];
            for (const item of items) item.tabIndex = item === target ? 0 : -1;
            target.focus();
        };

        const onKeyDown = (event: KeyboardEvent): void => {
            const items = enabledItems();
            const current = items.indexOf(document.activeElement as HTMLButtonElement);

            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    focusItem(current + 1);          // -1 + 1 === 0: first item
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    focusItem(current - 1);          // -1 - 1 wraps to the last item
                    break;
                case 'Home':
                    event.preventDefault();
                    focusItem(0);
                    break;
                case 'End':
                    event.preventDefault();
                    focusItem(items.length - 1);
                    break;
                case 'Escape':
                    event.preventDefault();
                    close();
                    anchor.focus();
                    break;
                case 'Tab':
                    // Not preventDefault: the menu closes and focus moves on naturally.
                    close();
                    break;
            }
        };

        const attachKeys = (): void => {
            if (keysAttached) return;
            menu.addEventListener('keydown', onKeyDown);
            keysAttached = true;
        };

        function detachKeys(): void {
            if (!keysAttached) return;
            menu.removeEventListener('keydown', onKeyDown);
            keysAttached = false;
        }

        const content: ComponentBuilder = { build: () => menu };

        // The popover wrapper is overflow-hidden; the list owns the scrollbar and
        // receives the max-height the popover clamps to the viewport.
        popover.withContent(content).withScrollElement(menu);

        const toggle = (): void => {
            if (isOpen) {
                close();
            } else {
                popover.show();
                setExpanded(true);
                attachKeys();
                focusItem(0);
            }
        };

        subscription.add(() => close());

        return { subscription, toggle, close };
    }
}

/** Creates a menu. The impl class is module-private by contract. */
export function createSidebarMenu(): SidebarMenu {
    return new SidebarMenuImpl();
}
