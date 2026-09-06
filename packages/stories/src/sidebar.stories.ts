import {
    LabelBuilder,
    LabelSize,
    RouterBuilder,
    SideBarBuilder,
    registerDestroy,
} from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';
import { expect, userEvent, within } from 'storybook/test';
import {
    addNavRows,
    createAppShell,
    createButton,
    createControlStrip,
    createGlassBackdrop,
    createShell,
    GLASS_GRADIENTS,
    NAV_ICONS,
    NAV_ROWS,
    SHELL_HEIGHT_PX,
} from './story-helpers';

/**
 * NOTE: no `'autodocs'` tag — `sidebar.docs.mdx` is the docs page for this
 * component, and having both makes Storybook's indexer throw.
 */
export default {
    title: 'Components/SideBar',
    tags: ['stable', 'glass', 'reactive'],
};

/** A `history` method tagged as this file's own no-op, so re-entry can recognise it. */
type Stub = typeof window.history.pushState & { __oraStoryStub?: true };

/** A neutral page body so the rail is not floating against nothing. */
function createPagePlaceholder(title: string, subtitle: string): HTMLElement {
    const page = document.createElement('div');
    page.className = 'flex h-full min-w-0 flex-1 flex-col gap-2 p-6';
    const heading = new LabelBuilder().withCaption(of(title)).withSize(LabelSize.LARGE).build();
    const caption = new LabelBuilder().withCaption(of(subtitle)).withSize(LabelSize.SMALL).build();
    page.appendChild(heading);
    page.appendChild(caption);
    return page;
}

// ---------------------------------------------------------------------------
// 1. Default — the collapsed icon rail, persisting to localStorage
// ---------------------------------------------------------------------------

/**
 * The out-of-the-box rail: 52px wide, icons only, tooltips on hover. With no
 * `withExpanded()` subject the sidebar owns its own state and persists it under
 * `withStorageKey()`. The story clears its key first so the canvas always opens
 * collapsed — otherwise the previous visit's toggle would leak into this one.
 */
export const Default = () => {
    const STORAGE_KEY = 'ora-story-sidebar-default';
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* private browsing — the sidebar falls back to collapsed anyway */
    }

    const sidebar = new SideBarBuilder()
        .withCaption(of('Northwind Books'))
        .withStorageKey(STORAGE_KEY);

    addNavRows(sidebar);
    sidebar.addDivider();
    addNavRows(sidebar, [[NAV_ICONS.SETTINGS, 'Settings']]);

    return createShell(
        sidebar.build(),
        createPagePlaceholder('Dashboard', 'Click the monogram to expand the rail.'),
    );
};

Default.play = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const root = canvasElement.querySelector('.ora-sidebar') as HTMLElement;

    // Collapsed: the brand button's accessible name is the affordance.
    await expect(root).not.toHaveClass('ora-sidebar--expanded');

    await userEvent.click(canvas.getByRole('button', { name: /expand sidebar/i }));

    await expect(root).toHaveClass('ora-sidebar--expanded');
};

// ---------------------------------------------------------------------------
// 2. Expanded — caller-owned expanded state
// ---------------------------------------------------------------------------

/**
 * `withExpanded()` hands the flag to the application. The sidebar reads and
 * writes the subject and stops touching `localStorage` entirely — and the
 * narrow-viewport auto-collapse becomes the caller's business too.
 */
export const Expanded = () => {
    const expanded$ = new BehaviorSubject<boolean>(true);

    const sidebar = new SideBarBuilder()
        .withCaption(of('Northwind Books'))
        .withExpanded(expanded$);

    addNavRows(sidebar);

    const page = createPagePlaceholder('Dashboard', 'The expanded flag lives in a BehaviorSubject.');
    const strip = createControlStrip([
        createButton('Expand', () => expanded$.next(true)).build(),
        createButton('Collapse', () => expanded$.next(false)).build(),
    ]);
    page.appendChild(strip);

    const shell = createShell(sidebar.build(), page);
    registerDestroy(shell, () => expanded$.complete());
    return shell;
};

// ---------------------------------------------------------------------------
// 3. WithRouter — router rows, active state, content outlet
// ---------------------------------------------------------------------------

/**
 * `withHref()` turns a row into a real `<a href>`; the sidebar derives
 * `.ora-sidebar-item--active` + `aria-current="page"` from `router.currentRoute$`
 * and left-clicks go through `router.navigate()`.
 *
 * Storybook renders stories at `/iframe.html?id=…`, and `RouterBuilder` writes
 * navigation straight to `window.history` — which would rewrite the iframe's URL
 * and drop Storybook's query string. The story therefore neuters `pushState`/
 * `replaceState` for its own lifetime, so routing runs entirely in memory.
 */
export const WithRouter = () => {
    // Storybook's HTML renderer runs the new storyFn() before clearing the canvas, so on
    // re-entry (toolbar change, HMR, docs Canvas <-> standalone) a second instance would
    // capture the stub as "original" and the first instance's teardown would hand the real
    // pushState back to a live story — which then rewrites the iframe URL. The sentinel makes
    // both the install and the restore idempotent.
    const stub = (() => { /* story-local: do not touch the iframe URL */ }) as Stub;
    stub.__oraStoryStub = true;
    const originalPush = window.history.pushState as Stub;
    const originalReplace = window.history.replaceState as Stub;
    if (!originalPush.__oraStoryStub) window.history.pushState = stub;
    if (!originalReplace.__oraStoryStub) window.history.replaceState = stub;

    const router = new RouterBuilder().withFallback('/ledger');

    router.addRoute()
        .withPattern('/ledger')
        .withContent(() => ({
            build: () => createPagePlaceholder('General ledger', '412 postings · period 3 open'),
        }));

    router.addRoute()
        .withPattern('/invoices')
        .withContent(() => ({
            build: () => createPagePlaceholder('Invoices', '9 unpaid · £84,120 outstanding'),
        }));

    const expanded$ = new BehaviorSubject<boolean>(true);
    const sidebar = new SideBarBuilder()
        .withRouter(router)
        .withCaption(of('Northwind Books'))
        .withExpanded(expanded$);

    sidebar.addItem()
        .withIcon(NAV_ICONS.LEDGER)
        .withCaption(of('General ledger'))
        .withHref('/ledger')
        .withExact();
    sidebar.addItem()
        .withIcon(NAV_ICONS.INVOICES)
        .withCaption(of('Invoices'))
        .withHref('/invoices')
        .withExact();

    // classList.add, not className: RouterBuilder stamps its own classes on the outlet.
    const outlet = router.build();
    outlet.classList.add('flex', 'h-full', 'min-w-0', 'flex-1', 'flex-col');

    const shell = createShell(sidebar.build(), outlet);
    registerDestroy(shell, () => {
        expanded$.complete();
        if ((window.history.pushState as Stub).__oraStoryStub && !originalPush.__oraStoryStub) {
            window.history.pushState = originalPush;
        }
        if ((window.history.replaceState as Stub).__oraStoryStub && !originalReplace.__oraStoryStub) {
            window.history.replaceState = originalReplace;
        }
    });
    return shell;
};

// ---------------------------------------------------------------------------
// 4. WithFooterMenu — avatar, caption, description and a popover menu
// ---------------------------------------------------------------------------

/**
 * The footer is the account switcher. `withMenu()` on it opens a
 * `PopoverPlacement.RIGHT` menu beside the rail; the menu's arrow keys, Home/End,
 * Escape and Tab are handled by the component.
 */
export const WithFooterMenu = () => {
    const selection$ = new BehaviorSubject<string>('No menu action yet');

    const avatar = {
        build: () => {
            const el = document.createElement('span');
            el.className = 'flex h-full w-full items-center justify-center text-label-medium';
            el.textContent = 'NB';
            return el;
        },
    };

    const expanded$ = new BehaviorSubject<boolean>(true);
    const sidebar = new SideBarBuilder()
        .withCaption(of('Northwind Books'))
        .withExpanded(expanded$);

    addNavRows(sidebar, NAV_ROWS.slice(0, 3));

    const footer = sidebar.withFooter();
    footer
        .withAvatar(avatar)
        .withCaption(of('Northwind Books Ltd'))
        .withDescription(of('Owner · FY 2026'));

    const menu = footer.withMenu();
    menu.addItem()
        .withIcon(NAV_ICONS.SETTINGS)
        .withCaption(of('Company settings'))
        .withClick(() => selection$.next('Company settings'));
    menu.addItem()
        .withIcon(NAV_ICONS.REPORTS)
        .withCaption(of('Switch entity'))
        .withClick(() => selection$.next('Switch entity'));
    menu.addDivider();
    menu.addItem()
        .withIcon(NAV_ICONS.SIGN_OUT)
        .withCaption(of('Sign out'))
        .withClick(() => selection$.next('Sign out'));

    const page = createPagePlaceholder('Dashboard', 'Click the footer row to open its menu.');
    page.appendChild(new LabelBuilder().withCaption(selection$).withSize(LabelSize.MEDIUM).build());

    const shell = createShell(sidebar.build(), page);
    registerDestroy(shell, () => {
        selection$.complete();
        expanded$.complete();
    });
    return shell;
};

// ---------------------------------------------------------------------------
// 5. DisabledAndHidden — withEnabled + withTooltip vs withVisible
// ---------------------------------------------------------------------------

/**
 * Two different answers to "this row does not apply right now".
 *
 * `withEnabled(of(false))` keeps the row on screen, greyed, `aria-disabled`, out
 * of the tab order and — for a router row — stripped of its `href`, so
 * middle-click and the context menu cannot navigate either. `withTooltip()`
 * carries the reason, because `withEnabled` takes a boolean and no text.
 *
 * `withVisible(false)` removes the row from view without rebuilding it: the node
 * stays, its subscriptions stay live, only `display` flips.
 */
export const DisabledAndHidden = () => {
    const payrollVisible$ = new BehaviorSubject<boolean>(true);

    const expanded$ = new BehaviorSubject<boolean>(true);
    const sidebar = new SideBarBuilder()
        .withCaption(of('Northwind Books'))
        .withExpanded(expanded$);

    addNavRows(sidebar, NAV_ROWS.slice(0, 2));

    sidebar.addItem()
        .withIcon(NAV_ICONS.REPORTS)
        .withCaption(of('Year-end reports'))
        .withEnabled(of(false))
        .withTooltip(of('Year-end reports — locked until period 12 is closed'))
        .withClick(() => { /* never fires while disabled */ });

    sidebar.addItem()
        .withIcon(NAV_ICONS.PAYROLL)
        .withCaption(of('Payroll'))
        .withVisible(payrollVisible$)
        .withClick(() => { /* demo only */ });

    const page = createPagePlaceholder(
        'Permissions',
        'Disabled rows stay visible with a reason; hidden rows disappear entirely.',
    );
    page.appendChild(createControlStrip([
        createButton('Hide Payroll', () => payrollVisible$.next(false)).build(),
        createButton('Show Payroll', () => payrollVisible$.next(true)).build(),
    ]));

    const shell = createShell(sidebar.build(), page);
    registerDestroy(shell, () => {
        payrollVisible$.complete();
        expanded$.complete();
    });
    return shell;
};

// ---------------------------------------------------------------------------
// 6. Glass
// ---------------------------------------------------------------------------

/**
 * `asGlass()` swaps the solid panel for `.glass-effect` and propagates the glass
 * flag to every popover menu the rail opens. The blur is suspended for the 0.28s
 * the width transition is in flight (`.ora-sidebar--animating`) — toggle the rail
 * to see the panel stay crisp while it moves.
 */
export const Glass = () => {
    const expanded$ = new BehaviorSubject<boolean>(false);
    const sidebar = new SideBarBuilder()
        .withCaption(of('Northwind Books'))
        .withExpanded(expanded$)
        .asGlass();

    addNavRows(sidebar);

    const menuItem = sidebar.addItem().withIcon(NAV_ICONS.SETTINGS).withCaption(of('Settings'));
    const menu = menuItem.withMenu();
    menu.addItem().withCaption(of('Chart of accounts'));
    menu.addItem().withCaption(of('Tax codes'));

    const stage = document.createElement('div');
    stage.className = 'relative w-full overflow-hidden rounded-large';
    stage.style.height = `${SHELL_HEIGHT_PX}px`;
    stage.appendChild(createGlassBackdrop(GLASS_GRADIENTS.BLUE_TEAL, 6, 'opacity-70'));

    const row = document.createElement('div');
    row.className = 'relative flex h-full w-full';
    row.appendChild(sidebar.build());
    row.appendChild(createPagePlaceholder('Dashboard', 'Glass rail over a gradient backdrop.'));
    stage.appendChild(row);

    registerDestroy(stage, () => expanded$.complete());
    return stage;
};

// ---------------------------------------------------------------------------
// 7. AppShell — sidebar + content + chat in one LayoutBuilder row
// ---------------------------------------------------------------------------

/**
 * The composition the sidebar and the chat panel were built for: a horizontal
 * `LayoutBuilder` with the rail at `SlotSize.FIT`, the page at `SlotSize.FULL`
 * and the assistant at `SlotSize.FIT`. The `ChatTriggerBuilder` in the page
 * header and the `ChatPanelBuilder` share one `BehaviorSubject<boolean>`, so
 * opening one hides the other.
 */
export const AppShell = () => createAppShell();
