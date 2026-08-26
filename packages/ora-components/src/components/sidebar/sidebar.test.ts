import { BehaviorSubject, Subject, of } from 'rxjs';
import { SideBarBuilder } from './sidebar-builder';
import { __resetSidebarTooltipForTests__ } from './sidebar-tooltip';
import { RouterBuilder } from '../../router/router-builder';
import { RouteMatch } from '../../router/types';
import { Icons } from '../../core/icons';

const ICON = '<svg class="test-icon"></svg>';

interface RouterStub {
    router: RouterBuilder;
    currentRoute$: BehaviorSubject<RouteMatch | null>;
    navigate: jest.Mock;
}

function routerStub(path: string | null = null): RouterStub {
    const currentRoute$ = new BehaviorSubject<RouteMatch | null>(
        path === null ? null : { path, params: {}, query: {} }
    );
    const navigate = jest.fn();
    return {
        currentRoute$,
        navigate,
        router: { currentRoute$, navigate } as unknown as RouterBuilder
    };
}

function click(el: Element): void {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

function mount(el: HTMLElement): HTMLElement {
    document.body.appendChild(el);
    return el;
}

function rows(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>('.ora-sidebar-item'));
}

describe('SideBarBuilder', () => {
    const realMatchMedia = window.matchMedia;

    afterEach(() => {
        document.body.innerHTML = '';
        __resetSidebarTooltipForTests__();
        window.matchMedia = realMatchMedia;
        localStorage.clear();
    });

    describe('structure', () => {
        it('renders one row per item, with caption and icon', () => {
            const sidebar = new SideBarBuilder().withCaption(of('Aurora'));
            sidebar.addItem().withIcon(ICON).withCaption(of('Dashboard'));
            sidebar.addItem().withIcon(of(Icons.MENU)).withCaption(of('Ledger'));
            sidebar.addItem().withCaption(of('Reports'));

            const el = sidebar.build();

            expect(el.classList.contains('ora-sidebar')).toBe(true);
            expect(rows(el)).toHaveLength(3);
            expect(rows(el).map(r => r.querySelector('.ora-sidebar-item-label')!.textContent))
                .toEqual(['Dashboard', 'Ledger', 'Reports']);
            expect(rows(el)[0].querySelector('.ora-sidebar-item-icon')!.innerHTML).toBe(ICON);
            expect(rows(el)[1].querySelector('.ora-sidebar-item-icon svg')).not.toBeNull();
            expect(rows(el)[2].querySelector('.ora-sidebar-item-icon')).toBeNull();
        });

        it('renders the brand monogram from the caption and stamps nav/footer slots', () => {
            const sidebar = new SideBarBuilder().withCaption(of('Aurora'));
            sidebar.withFooter().withCaption(of('Northwind'));

            const el = sidebar.build();

            expect(el.querySelector('.ora-sidebar-brand-mark')!.textContent).toBe('A');
            expect(el.querySelector('.ora-sidebar-brand-text')!.textContent).toBe('Aurora');
            expect(el.querySelector('[data-slot="nav"]')).not.toBeNull();
            expect(el.querySelector('[data-slot="footer"]')).not.toBeNull();
        });

        it('renders dividers between items in order', () => {
            const sidebar = new SideBarBuilder();
            sidebar.addItem().withCaption(of('One'));
            sidebar.addDivider();
            sidebar.addItem().withCaption(of('Two'));

            const nav = sidebar.build().querySelector('[data-slot="nav"]')!;

            expect(Array.from(nav.children).map(c => c.className)).toEqual([
                'ora-sidebar-item',
                'ora-sidebar-divider',
                'ora-sidebar-item'
            ]);
        });

        it('applies glass-effect to the panel only when asGlass is called', () => {
            const plain = new SideBarBuilder().build().querySelector('.ora-sidebar-panel')!;
            const glass = new SideBarBuilder().asGlass().build().querySelector('.ora-sidebar-panel')!;

            expect(plain.classList.contains('glass-effect')).toBe(false);
            expect(plain.classList.contains('ora-sidebar-panel--solid')).toBe(true);
            expect(glass.classList.contains('glass-effect')).toBe(true);
        });
    });

    describe('expanded state', () => {
        it('reflects the supplied subject on the root class', () => {
            const expanded$ = new BehaviorSubject(false);
            const el = new SideBarBuilder().withExpanded(expanded$).build();

            expect(el.classList.contains('ora-sidebar--expanded')).toBe(false);

            expanded$.next(true);
            expect(el.classList.contains('ora-sidebar--expanded')).toBe(true);

            expanded$.next(false);
            expect(el.classList.contains('ora-sidebar--expanded')).toBe(false);
        });

        it('emits false when the header toggle is clicked while expanded', () => {
            const expanded$ = new BehaviorSubject(true);
            const el = new SideBarBuilder().withExpanded(expanded$).build();

            click(el.querySelector('.ora-sidebar-header-toggle')!);

            expect(expanded$.getValue()).toBe(false);
        });

        it('ignores the header toggle while already collapsed', () => {
            const expanded$ = new BehaviorSubject(false);
            const emissions: boolean[] = [];
            expanded$.subscribe(v => emissions.push(v));

            const el = new SideBarBuilder().withExpanded(expanded$).build();
            click(el.querySelector('.ora-sidebar-header-toggle')!);

            expect(emissions).toEqual([false]);
        });

        it('hides the header toggle while collapsed and shows it while expanded', () => {
            const expanded$ = new BehaviorSubject(false);
            const el = new SideBarBuilder().withExpanded(expanded$).build();
            const toggle = el.querySelector<HTMLElement>('.ora-sidebar-header-toggle')!;

            // Collapsed the toggle would otherwise overlay the brand mark and
            // swallow the clicks that expand the sidebar.
            expect(toggle.style.display).toBe('none');

            expanded$.next(true);
            expect(toggle.style.display).toBe('flex');

            expanded$.next(false);
            expect(toggle.style.display).toBe('none');
        });

        it('exposes the brand as a keyboard-reachable button while collapsed', () => {
            const expanded$ = new BehaviorSubject(false);
            const el = new SideBarBuilder().withCaption(of('Aurora')).withExpanded(expanded$).build();
            const brand = el.querySelector<HTMLButtonElement>('.ora-sidebar-brand')!;

            expect(brand.tagName).toBe('BUTTON');
            expect(brand.type).toBe('button');
            expect(brand.disabled).toBe(false);
            expect(brand.getAttribute('aria-label')).toBe('Expand sidebar');

            expanded$.next(true);

            // Nothing left to do once expanded — the header chevron takes over.
            expect(brand.disabled).toBe(true);
            expect(brand.getAttribute('aria-label')).toBe('Aurora');
        });

        it('emits true when the brand mark is clicked while collapsed', () => {
            const expanded$ = new BehaviorSubject(false);
            const el = new SideBarBuilder().withExpanded(expanded$).build();

            click(el.querySelector('.ora-sidebar-brand')!);

            expect(expanded$.getValue()).toBe(true);
        });

        it('does not touch localStorage when a subject is supplied', () => {
            const expanded$ = new BehaviorSubject(true);
            const el = new SideBarBuilder()
                .withStorageKey('ora-test-key')
                .withExpanded(expanded$)
                .build();

            click(el.querySelector('.ora-sidebar-header-toggle')!);

            expect(localStorage.getItem('ora-test-key')).toBeNull();
        });

        it('seeds from and writes back to the configured storage key', () => {
            localStorage.setItem('ora-test-key', 'true');

            const el = new SideBarBuilder().withStorageKey('ora-test-key').build();
            expect(el.classList.contains('ora-sidebar--expanded')).toBe(true);

            click(el.querySelector('.ora-sidebar-header-toggle')!);

            expect(el.classList.contains('ora-sidebar--expanded')).toBe(false);
            expect(localStorage.getItem('ora-test-key')).toBe('false');
        });

        it('suspends the glass blur only while the width transition runs', () => {
            const expanded$ = new BehaviorSubject(false);
            const el = mount(new SideBarBuilder().asGlass().withExpanded(expanded$).build());

            // Initial paint lands at its final width — nothing animates.
            expect(el.classList.contains('ora-sidebar--animating')).toBe(false);

            expanded$.next(true);
            expect(el.classList.contains('ora-sidebar--animating')).toBe(true);

            const done = new Event('transitionend', { bubbles: true }) as TransitionEvent;
            Object.defineProperty(done, 'propertyName', { value: 'width' });
            el.dispatchEvent(done);

            expect(el.classList.contains('ora-sidebar--animating')).toBe(false);
        });

        it('drops the animating class via the timeout when transitionend never fires', () => {
            jest.useFakeTimers();
            try {
                const expanded$ = new BehaviorSubject(false);
                const el = mount(new SideBarBuilder().asGlass().withExpanded(expanded$).build());

                expanded$.next(true);
                expect(el.classList.contains('ora-sidebar--animating')).toBe(true);

                jest.advanceTimersByTime(400);
                expect(el.classList.contains('ora-sidebar--animating')).toBe(false);
            } finally {
                jest.useRealTimers();
            }
        });

        it('does not suspend the blur when the value is re-emitted unchanged', () => {
            const expanded$ = new BehaviorSubject(false);
            const el = mount(new SideBarBuilder().asGlass().withExpanded(expanded$).build());

            expanded$.next(false);   // same value: no width change, no transition

            expect(el.classList.contains('ora-sidebar--animating')).toBe(false);
        });

        it('does not suspend the blur under prefers-reduced-motion', () => {
            // transition:none means transitionend never fires, so the class would
            // be held for the whole fallback and flash the blur off every toggle.
            window.matchMedia = jest.fn().mockImplementation(query => ({
                matches: query.includes('prefers-reduced-motion'),
                media: query,
                addEventListener: jest.fn(),
                removeEventListener: jest.fn()
            })) as unknown as typeof window.matchMedia;

            const expanded$ = new BehaviorSubject(false);
            const el = mount(new SideBarBuilder().asGlass().withExpanded(expanded$).build());

            expanded$.next(true);

            expect(el.classList.contains('ora-sidebar--expanded')).toBe(true);
            expect(el.classList.contains('ora-sidebar--animating')).toBe(false);
        });

        it('renders collapsed before a valueless Subject has emitted', () => {
            const expanded$ = new Subject<boolean>();
            const el = new SideBarBuilder().withCaption(of('Aurora')).withExpanded(expanded$).build();

            const toggle = el.querySelector<HTMLElement>('.ora-sidebar-header-toggle')!;
            const brand = el.querySelector<HTMLButtonElement>('.ora-sidebar-brand')!;

            expect(el.classList.contains('ora-sidebar--expanded')).toBe(false);
            expect(toggle.style.display).toBe('none');
            expect(brand.disabled).toBe(false);
            expect(brand.getAttribute('aria-label')).toBe('Expand sidebar');

            // ...and it still expands once the subject finally speaks.
            expanded$.next(true);
            expect(toggle.style.display).toBe('flex');
            expect(brand.disabled).toBe(true);
        });

        it('starts expanded with asExpandedByDefault() when storage is empty', () => {
            const el = new SideBarBuilder()
                .withStorageKey('ora-test-key')
                .asExpandedByDefault()
                .build();

            expect(el.classList.contains('ora-sidebar--expanded')).toBe(true);
        });

        it('stays collapsed by default without asExpandedByDefault()', () => {
            const el = new SideBarBuilder().withStorageKey('ora-test-key').build();

            expect(el.classList.contains('ora-sidebar--expanded')).toBe(false);
        });

        it('lets a stored false win over asExpandedByDefault()', () => {
            localStorage.setItem('ora-test-key', 'false');

            const el = new SideBarBuilder()
                .withStorageKey('ora-test-key')
                .asExpandedByDefault()
                .build();

            expect(el.classList.contains('ora-sidebar--expanded')).toBe(false);
        });

        it('still collapses on a narrow viewport with asExpandedByDefault()', () => {
            window.matchMedia = jest.fn().mockImplementation(query => ({
                matches: true,
                media: query,
                addEventListener: jest.fn(),
                removeEventListener: jest.fn()
            })) as unknown as typeof window.matchMedia;

            const el = new SideBarBuilder()
                .withStorageKey('ora-test-key')
                .asExpandedByDefault()
                .build();

            expect(el.classList.contains('ora-sidebar--expanded')).toBe(false);
            // A default is not a preference: nothing was persisted to erase.
            expect(localStorage.getItem('ora-test-key')).toBeNull();
        });

        it('stamps data-sidebar-initialized one frame after mount', () => {
            jest.useFakeTimers();
            try {
                const el = mount(new SideBarBuilder().build());

                expect(el.hasAttribute('data-sidebar-initialized')).toBe(false);

                jest.advanceTimersByTime(50);

                expect(el.hasAttribute('data-sidebar-initialized')).toBe(true);
            } finally {
                jest.useRealTimers();
            }
        });

        it('auto-collapses on a narrow viewport', () => {
            localStorage.setItem('ora-sidebar-expanded', 'true');
            window.matchMedia = jest.fn().mockImplementation(query => ({
                matches: true,
                media: query,
                addEventListener: jest.fn(),
                removeEventListener: jest.fn()
            })) as unknown as typeof window.matchMedia;

            const el = new SideBarBuilder().build();

            expect(el.classList.contains('ora-sidebar--expanded')).toBe(false);
            // Transient viewport override: the stored preference must survive so the
            // sidebar comes back expanded on a wide screen.
            expect(localStorage.getItem('ora-sidebar-expanded')).toBe('true');
        });
    });

    describe('items', () => {
        it('renders a router item as an anchor and navigates on left click', () => {
            const { router, navigate } = routerStub('/');
            const sidebar = new SideBarBuilder().withRouter(router);
            sidebar.addItem().withCaption(of('Ledger')).withHref('/ledger');

            const row = rows(sidebar.build())[0];

            expect(row.tagName).toBe('A');
            expect(row.getAttribute('href')).toBe('/ledger');

            click(row);
            expect(navigate).toHaveBeenCalledWith('/ledger');
        });

        it('derives the active class from currentRoute$', () => {
            const { router, currentRoute$ } = routerStub('/');
            const sidebar = new SideBarBuilder().withRouter(router);
            sidebar.addItem().withCaption(of('Home')).withHref('/').withExact();
            sidebar.addItem().withCaption(of('Ledger')).withHref('/ledger');

            const [home, ledger] = rows(sidebar.build());

            expect(home.classList.contains('ora-sidebar-item--active')).toBe(true);
            expect(ledger.classList.contains('ora-sidebar-item--active')).toBe(false);

            currentRoute$.next({ path: '/ledger/2024', params: {}, query: {} });

            expect(home.classList.contains('ora-sidebar-item--active')).toBe(false);
            expect(ledger.classList.contains('ora-sidebar-item--active')).toBe(true);
            expect(ledger.getAttribute('aria-current')).toBe('page');
        });

        it('renders a button and runs the click callback when there is no href', () => {
            const onClick = jest.fn();
            const sidebar = new SideBarBuilder();
            sidebar.addItem().withCaption(of('Compose')).withClick(onClick);

            const row = rows(sidebar.build())[0];

            expect(row.tagName).toBe('BUTTON');
            click(row);
            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it('marks a disabled item aria-disabled and blocks its click', () => {
            const onClick = jest.fn();
            const { router, navigate } = routerStub('/');
            const sidebar = new SideBarBuilder().withRouter(router);
            sidebar.addItem()
                .withCaption(of('Payroll'))
                .withHref('/payroll')
                .withClick(onClick)
                .withEnabled(of(false));

            const row = rows(sidebar.build())[0];

            expect(row.getAttribute('aria-disabled')).toBe('true');
            expect(row.classList.contains('ora-sidebar-item--disabled')).toBe(true);

            click(row);

            expect(navigate).not.toHaveBeenCalled();
            expect(onClick).not.toHaveBeenCalled();
        });

        it('strips href from a disabled router row and restores it when re-enabled', () => {
            const enabled$ = new BehaviorSubject(true);
            const { router } = routerStub('/');
            const sidebar = new SideBarBuilder().withRouter(router);
            sidebar.addItem().withCaption(of('Payroll')).withHref('/payroll').withEnabled(enabled$);

            const row = rows(sidebar.build())[0];
            expect(row.getAttribute('href')).toBe('/payroll');
            expect(row.hasAttribute('tabindex')).toBe(false);

            enabled$.next(false);
            // Without this, middle-click and "Open in new tab" still navigate —
            // neither of which a click handler can intercept.
            expect(row.hasAttribute('href')).toBe(false);
            expect(row.getAttribute('tabindex')).toBe('-1');

            enabled$.next(true);
            expect(row.getAttribute('href')).toBe('/payroll');
            expect(row.hasAttribute('tabindex')).toBe(false);
        });

        it('toggles display via withVisible without rebuilding the row', () => {
            const visible$ = new BehaviorSubject(false);
            const sidebar = new SideBarBuilder();
            sidebar.addItem().withCaption(of('Taxes')).withVisible(visible$);

            const el = sidebar.build();
            const row = rows(el)[0];

            expect(row.style.display).toBe('none');

            visible$.next(true);
            expect(row.style.display).toBe('');
            expect(rows(el)[0]).toBe(row);
        });
    });

    describe('menus', () => {
        it('opens a popover on click, runs the item callback and closes', () => {
            const onSettings = jest.fn();
            const sidebar = new SideBarBuilder();
            const item = sidebar.addItem().withCaption(of('More'));
            const menu = item.withMenu();
            menu.addItem().withIcon(ICON).withCaption(of('Settings')).withClick(onSettings);
            menu.addDivider();
            menu.addItem().withCaption(of('Log out')).withClick(jest.fn());

            const el = mount(sidebar.build());
            const row = rows(el)[0];

            expect(row.tagName).toBe('BUTTON');
            expect(row.getAttribute('aria-haspopup')).toBe('menu');

            click(row);

            const popover = document.querySelector<HTMLElement>('.ora-sidebar-menu')!;
            expect(popover).not.toBeNull();
            expect(popover.style.display).not.toBe('none');

            const menuItems = popover.querySelectorAll<HTMLElement>('[role="menuitem"]');
            expect(menuItems).toHaveLength(2);
            expect(popover.querySelectorAll('[role="separator"]')).toHaveLength(1);
            expect(menuItems[0].textContent).toBe('Settings');

            click(menuItems[0]);

            expect(onSettings).toHaveBeenCalledTimes(1);
            expect(popover.style.display).toBe('none');
        });

        it('lets the menu win over withClick', () => {
            const onClick = jest.fn();
            const sidebar = new SideBarBuilder();
            const item = sidebar.addItem().withCaption(of('More')).withClick(onClick);
            item.withMenu().addItem().withCaption(of('Settings'));

            const el = mount(sidebar.build());
            click(rows(el)[0]);

            expect(onClick).not.toHaveBeenCalled();
            expect(document.querySelector('.ora-sidebar-menu')).not.toBeNull();
        });

        it('tracks the menu state on the anchor with aria-expanded', () => {
            const sidebar = new SideBarBuilder();
            const menu = sidebar.addItem().withCaption(of('More')).withMenu();
            menu.addItem().withCaption(of('Settings')).withClick(jest.fn());

            const el = mount(sidebar.build());
            const row = rows(el)[0];

            expect(row.getAttribute('aria-expanded')).toBe('false');

            click(row);
            expect(row.getAttribute('aria-expanded')).toBe('true');

            click(document.querySelector('.ora-sidebar-menu [role="menuitem"]')!);
            expect(row.getAttribute('aria-expanded')).toBe('false');
        });

        it('follows the menu-button keyboard contract', () => {
            const sidebar = new SideBarBuilder();
            const menu = sidebar.addItem().withCaption(of('More')).withMenu();
            menu.addItem().withCaption(of('Settings')).withClick(jest.fn());
            menu.addItem().withCaption(of('Members')).withClick(jest.fn());
            menu.addItem().withCaption(of('Log out')).withClick(jest.fn());

            const el = mount(sidebar.build());
            const row = rows(el)[0];

            click(row);

            const items = Array.from(
                document.querySelectorAll<HTMLButtonElement>('.ora-sidebar-menu [role="menuitem"]')
            );

            // Opening moves focus into the menu, on the first item.
            expect(document.activeElement).toBe(items[0]);
            expect(items[0].tabIndex).toBe(0);
            expect(items[1].tabIndex).toBe(-1);

            const key = (k: string) => items.find(i => i === document.activeElement)!
                .dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

            key('ArrowDown');
            expect(document.activeElement).toBe(items[1]);

            key('End');
            expect(document.activeElement).toBe(items[2]);

            key('ArrowDown');                       // wraps past the end
            expect(document.activeElement).toBe(items[0]);

            key('ArrowUp');                         // wraps past the start
            expect(document.activeElement).toBe(items[2]);

            key('Home');
            expect(document.activeElement).toBe(items[0]);
        });

        it('closes on Escape and returns focus to the anchor', () => {
            const sidebar = new SideBarBuilder();
            sidebar.addItem().withCaption(of('More')).withMenu()
                .addItem().withCaption(of('Settings')).withClick(jest.fn());

            const el = mount(sidebar.build());
            const row = rows(el)[0];

            click(row);
            const popover = document.querySelector<HTMLElement>('.ora-sidebar-menu')!;
            expect(popover.style.display).not.toBe('none');

            document.activeElement!.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
            );

            expect(popover.style.display).toBe('none');
            expect(row.getAttribute('aria-expanded')).toBe('false');
            expect(document.activeElement).toBe(row);
        });

        it('detaches the keyboard listener when the popover closes itself', () => {
            const sidebar = new SideBarBuilder();
            const menu = sidebar.addItem().withCaption(of('More')).withMenu();
            menu.addItem().withCaption(of('Settings')).withClick(jest.fn());
            menu.addItem().withCaption(of('Log out')).withClick(jest.fn());

            const el = mount(sidebar.build());
            const row = rows(el)[0];

            click(row);
            const popover = document.querySelector<HTMLElement>('.ora-sidebar-menu')!;
            const items = Array.from(
                popover.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
            );
            expect(document.activeElement).toBe(items[0]);

            // An outside click closes the popover through its own document handler,
            // which only calls withOnClose — never our close().
            click(document.body);

            expect(popover.style.display).toBe('none');
            expect(row.getAttribute('aria-expanded')).toBe('false');

            // A stale keydown listener would still rove focus into the closed menu.
            const focusBeforeKey = document.activeElement;
            popover.querySelector('[role="menu"]')!.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
            );

            expect(document.activeElement).toBe(focusBeforeKey);
            expect(document.activeElement).not.toBe(items[0]);
            expect(document.activeElement).not.toBe(items[1]);
        });

        it('skips disabled items when moving focus', () => {
            const sidebar = new SideBarBuilder();
            const menu = sidebar.addItem().withCaption(of('More')).withMenu();
            menu.addItem().withCaption(of('Archive')).withEnabled(of(false));
            menu.addItem().withCaption(of('Settings'));

            const el = mount(sidebar.build());
            click(rows(el)[0]);

            const settings = document.querySelectorAll<HTMLButtonElement>(
                '.ora-sidebar-menu [role="menuitem"]'
            )[1];

            expect(document.activeElement).toBe(settings);
        });

        it('returns the same menu builder on every withMenu call', () => {
            const item = new SideBarBuilder().addItem();
            expect(item.withMenu()).toBe(item.withMenu());
        });

        it('does not run a disabled menu item callback', () => {
            const onClick = jest.fn();
            const sidebar = new SideBarBuilder();
            const menu = sidebar.addItem().withCaption(of('More')).withMenu();
            menu.addItem().withCaption(of('Archive')).withClick(onClick).withEnabled(of(false));

            const el = mount(sidebar.build());
            click(rows(el)[0]);

            const menuItem = document.querySelector<HTMLElement>('.ora-sidebar-menu [role="menuitem"]')!;
            expect(menuItem.getAttribute('aria-disabled')).toBe('true');

            click(menuItem);
            expect(onClick).not.toHaveBeenCalled();
        });
    });

    describe('footer', () => {
        it('renders caption, description and a custom avatar', () => {
            const sidebar = new SideBarBuilder();
            sidebar.withFooter()
                .withAvatar({ build: () => {
                    const el = document.createElement('img');
                    el.className = 'test-avatar';
                    return el;
                } })
                .withCaption(of('Northwind Ltd'))
                .withDescription(of('Owner · EUR'));

            const footer = sidebar.build().querySelector('[data-slot="footer"]')!;

            expect(footer.querySelector('.ora-sidebar-footer-chevron')).toBeNull();
            expect(footer.querySelector('.ora-sidebar-footer-caption')!.textContent).toBe('Northwind Ltd');
            expect(footer.querySelector('.ora-sidebar-footer-description')!.textContent).toBe('Owner · EUR');
            expect(footer.querySelector('.ora-sidebar-footer-avatar .test-avatar')).not.toBeNull();
        });

        it('returns the same footer builder on every withFooter call', () => {
            const sidebar = new SideBarBuilder();
            expect(sidebar.withFooter()).toBe(sidebar.withFooter());
        });

        it('names a caption-less footer with a menu from its description, then a fallback', () => {
            const described = new SideBarBuilder();
            described.withFooter().withDescription(of('Owner')).withMenu();
            const describedBtn = described.build().querySelector('.ora-sidebar-footer-button')!;
            expect(describedBtn.getAttribute('aria-label')).toBe('Owner');

            const bare = new SideBarBuilder();
            bare.withFooter()
                .withAvatar({ build: () => document.createElement('img') })
                .withMenu();
            const bareBtn = bare.build().querySelector('.ora-sidebar-footer-button')!;
            expect(bareBtn.getAttribute('aria-label')).toBe('Menu');
        });

        it('renders a menu-less footer as an inert div with no chevron', () => {
            const sidebar = new SideBarBuilder();
            sidebar.withFooter().withCaption(of('Northwind Ltd')).withDescription(of('Owner'));

            const footer = sidebar.build().querySelector('[data-slot="footer"]')!;
            const content = footer.firstElementChild as HTMLElement;

            // No menu means nothing to activate: a <button> with a chevron would
            // promise an interaction that does not exist, and add a dead tab stop.
            expect(content.tagName).toBe('DIV');
            expect(content.className).toBe('ora-sidebar-footer-content');
            expect(footer.querySelector('.ora-sidebar-footer-chevron')).toBeNull();
            expect(footer.querySelector('button')).toBeNull();
            expect(content.querySelector('.ora-sidebar-footer-caption')!.textContent)
                .toBe('Northwind Ltd');
        });

        it('tracks the footer menu state with aria-expanded', () => {
            const sidebar = new SideBarBuilder();
            const footer = sidebar.withFooter().withCaption(of('Northwind Ltd'));
            footer.withMenu().addItem().withCaption(of('Log out')).withClick(jest.fn());

            const el = mount(sidebar.build());
            const button = el.querySelector<HTMLElement>('.ora-sidebar-footer-button')!;

            expect(button.getAttribute('aria-expanded')).toBe('false');

            click(button);
            expect(button.getAttribute('aria-expanded')).toBe('true');

            click(document.querySelector('.ora-sidebar-menu [role="menuitem"]')!);
            expect(button.getAttribute('aria-expanded')).toBe('false');
        });

        it('opens the footer menu on click', () => {
            const onSwitch = jest.fn();
            const sidebar = new SideBarBuilder();
            const footer = sidebar.withFooter().withCaption(of('Northwind Ltd'));
            footer.withMenu().addItem().withCaption(of('Switch organization')).withClick(onSwitch);

            const el = mount(sidebar.build());
            click(el.querySelector('.ora-sidebar-footer-button')!);

            const menuItem = document.querySelector<HTMLElement>('.ora-sidebar-menu [role="menuitem"]')!;
            click(menuItem);

            expect(onSwitch).toHaveBeenCalledTimes(1);
        });
    });

    describe('teardown', () => {
        it('unsubscribes every stream when the sidebar leaves the DOM', () => {
            const caption$ = new BehaviorSubject('Aurora');
            const itemCaption$ = new BehaviorSubject('Ledger');
            const visible$ = new BehaviorSubject(true);
            const footerCaption$ = new BehaviorSubject('Northwind');
            const menuCaption$ = new BehaviorSubject('Settings');

            const sidebar = new SideBarBuilder().withCaption(caption$);
            sidebar.addItem().withCaption(itemCaption$).withVisible(visible$);
            const footer = sidebar.withFooter().withCaption(footerCaption$);
            footer.withMenu().addItem().withCaption(menuCaption$);

            const el = mount(sidebar.build());

            expect(caption$.observed).toBe(true);
            expect(itemCaption$.observed).toBe(true);
            expect(menuCaption$.observed).toBe(true);

            el.remove();

            expect(caption$.observed).toBe(false);
            expect(itemCaption$.observed).toBe(false);
            expect(visible$.observed).toBe(false);
            expect(footerCaption$.observed).toBe(false);
            expect(menuCaption$.observed).toBe(false);
        });

        it('removes the singleton tooltip node once the last anchor is gone', () => {
            const sidebar = new SideBarBuilder();
            sidebar.addItem().withCaption(of('Ledger'));
            sidebar.addItem().withCaption(of('Taxes'));

            const el = mount(sidebar.build());
            const rowEls = rows(el);

            rowEls[0].dispatchEvent(new MouseEvent('mouseenter'));
            expect(document.querySelectorAll('.ora-sidebar-tooltip')).toHaveLength(1);
            expect(document.querySelector('.ora-sidebar-tooltip')!.textContent).toBe('Ledger');

            el.remove();

            expect(document.querySelectorAll('.ora-sidebar-tooltip')).toHaveLength(0);
        });

        it('points aria-describedby at the shared tooltip only while it is shown', () => {
            const sidebar = new SideBarBuilder();
            sidebar.addItem().withCaption(of('Ledger')).withTooltip(of('Open the ledger'));

            const el = mount(sidebar.build());
            const [row] = rows(el);

            row.dispatchEvent(new MouseEvent('mouseenter'));

            const tooltip = document.querySelector('.ora-sidebar-tooltip')!;
            expect(tooltip.id).toBe('ora-sidebar-tooltip');
            expect(tooltip.textContent).toBe('Open the ledger');
            expect(row.getAttribute('aria-describedby')).toBe('ora-sidebar-tooltip');

            el.remove();

            expect(row.hasAttribute('aria-describedby')).toBe(false);
        });

        it('suppresses the tooltip while the sidebar is expanded', () => {
            const expanded$ = new BehaviorSubject(true);
            const sidebar = new SideBarBuilder().withExpanded(expanded$);
            sidebar.addItem().withCaption(of('Ledger'));

            const el = mount(sidebar.build());
            const [row] = rows(el);

            row.dispatchEvent(new MouseEvent('mouseenter'));

            // The label is already on screen; a tooltip repeating it is noise.
            expect(document.querySelector('.ora-sidebar-tooltip')).toBeNull();
            expect(row.hasAttribute('aria-describedby')).toBe(false);

            expanded$.next(false);
            row.dispatchEvent(new MouseEvent('mouseenter'));

            expect(document.querySelector('.ora-sidebar-tooltip')!.classList.contains('visible')).toBe(true);
        });

        it('hides the tooltip when the row opens its menu, and on ancestor scroll', () => {
            const sidebar = new SideBarBuilder();
            const item = sidebar.addItem().withCaption(of('More'));
            item.withMenu().addItem().withCaption(of('Settings'));
            sidebar.addItem().withCaption(of('Ledger'));

            const el = mount(sidebar.build());
            const [menuRow, plainRow] = rows(el);
            const tooltip = (): HTMLElement =>
                document.querySelector<HTMLElement>('.ora-sidebar-tooltip')!;

            menuRow.dispatchEvent(new MouseEvent('mouseenter'));
            expect(tooltip().classList.contains('visible')).toBe(true);

            // The menu and the tooltip describe the same row.
            click(menuRow);
            expect(tooltip().classList.contains('visible')).toBe(false);

            plainRow.dispatchEvent(new MouseEvent('mouseenter'));
            expect(tooltip().classList.contains('visible')).toBe(true);

            // Scrolling the nav moves the anchor out from under the tooltip; the
            // event does not bubble, hence the capture-phase listener.
            el.querySelector('[data-slot="nav"]')!
                .dispatchEvent(new Event('scroll', { bubbles: false }));

            expect(tooltip().classList.contains('visible')).toBe(false);
        });

        it('removes the matchMedia listener when the sidebar leaves the DOM', () => {
            const removeEventListener = jest.fn();
            window.matchMedia = jest.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                addEventListener: jest.fn(),
                removeEventListener
            })) as unknown as typeof window.matchMedia;

            // No withExpanded(): the sidebar owns a SidebarLogic, which owns the listener.
            const el = mount(new SideBarBuilder().build());
            expect(removeEventListener).not.toHaveBeenCalled();

            el.remove();

            expect(removeEventListener).toHaveBeenCalledTimes(1);
            expect(removeEventListener.mock.calls[0][0]).toBe('change');
        });

        it('clears the animating timer and drops the class on disconnect', () => {
            jest.useFakeTimers();
            try {
                const expanded$ = new BehaviorSubject(false);
                const el = mount(new SideBarBuilder().asGlass().withExpanded(expanded$).build());

                expanded$.next(true);
                expect(el.classList.contains('ora-sidebar--animating')).toBe(true);

                el.remove();

                expect(el.classList.contains('ora-sidebar--animating')).toBe(false);
                expect(jest.getTimerCount()).toBe(0);
            } finally {
                jest.useRealTimers();
            }
        });

        it('leaves a caller-owned expanded subject usable after teardown', () => {
            const expanded$ = new BehaviorSubject(false);
            const el = mount(new SideBarBuilder().withExpanded(expanded$).build());

            el.remove();

            expect(expanded$.closed).toBe(false);
            expect(() => expanded$.next(true)).not.toThrow();
        });
    });
});
