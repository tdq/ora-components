/**
 * Shared application-shell scaffold for the SideBar and ChatPanel stories.
 *
 * Both `sidebar.stories.ts` and `chat.stories.ts` need the same three-column
 * composition (rail + content + docked assistant) and the same nav icon set, so
 * it lives here once rather than being copy-pasted into two story files.
 *
 * Everything is deterministic: fixed copy, fixed figures, a per-shell message
 * counter for ids. No `Math.random()` at any scope.
 */

import {
    ChatPanelBuilder,
    ChatTriggerBuilder,
    LayoutBuilder,
    LayoutGap,
    SideBarBuilder,
    SlotSize,
    registerDestroy,
    type ChatMessage,
} from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';

/**
 * Inline 24×24 stroke SVGs for the nav rail.
 *
 * `Icons` (the library's own set) covers chrome — chevrons, close, send, sparkle —
 * but has no domain glyphs, and adding to it is out of scope for a story file,
 * so the accounting nav icons are declared here as plain markup strings.
 * `SidebarItemBuilder.withIcon` takes exactly that: inline SVG.
 */
export const NAV_ICONS = {
    DASHBOARD: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    LEDGER: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
    INVOICES: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>',
    PAYROLL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M17 11h4M19 9v4"/></svg>',
    REPORTS: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    SETTINGS: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
    SIGN_OUT: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/></svg>',
} as const;

/** The accounting nav rows the SideBar stories and the app shell share. */
export const NAV_ROWS: readonly (readonly [icon: string, caption: string])[] = [
    [NAV_ICONS.DASHBOARD, 'Dashboard'],
    [NAV_ICONS.LEDGER, 'General ledger'],
    [NAV_ICONS.INVOICES, 'Invoices'],
    [NAV_ICONS.PAYROLL, 'Payroll'],
    [NAV_ICONS.REPORTS, 'Reports'],
] as const;

/** Appends `[icon, caption]` pairs as inert demo rows. */
export function addNavRows(
    sidebar: SideBarBuilder,
    rows: readonly (readonly [string, string])[] = NAV_ROWS,
): void {
    for (const [icon, caption] of rows) {
        sidebar.addItem().withIcon(icon).withCaption(of(caption)).withClick(() => { /* demo only */ });
    }
}

/**
 * Every story that renders a sidebar or a docked chat panel needs a
 * height-constrained flex row: `.ora-sidebar` and `.ora-chat-panel-wrapper` are
 * both `height: 100%`, so in an auto-height Storybook canvas they would collapse
 * to nothing. 560px is tall enough to show the nav, a divider and the footer.
 */
export const SHELL_HEIGHT_PX = 560;

/** A height-constrained, rounded surface to drop a rail (and friends) into. */
export function createShell(...children: HTMLElement[]): HTMLElement {
    const shell = document.createElement('div');
    shell.className = 'flex w-full overflow-hidden rounded-large bg-surface text-on-surface';
    shell.style.height = `${SHELL_HEIGHT_PX}px`;
    for (const child of children) shell.appendChild(child);
    return shell;
}

/** Deterministic opening conversation for the shell's assistant. */
const SHELL_MESSAGES: ChatMessage[] = [
    { id: 'shell-1', role: 'user', content: 'Why is the March gross margin down 4 points?' },
    {
        id: 'shell-2',
        role: 'assistant',
        content:
            'Freight-in on the Rotterdam shipments moved from £4,120 to £11,480 in March, which is 3.1 of the 4 points. The rest is the 2% supplier price rise on SKU NB-220.',
    },
];

/**
 * The full application shell: nav rail, page content with a chat trigger in its
 * header, and a docked assistant panel — one `LayoutBuilder` row, one
 * `BehaviorSubject<boolean>` shared by the trigger and the panel.
 */
export function createAppShell(): HTMLElement {
    const open$ = new BehaviorSubject<boolean>(false);
    const expanded$ = new BehaviorSubject<boolean>(true);
    const messages$ = new BehaviorSubject<ChatMessage[]>(SHELL_MESSAGES);

    let seq = SHELL_MESSAGES.length;
    const nextId = (): string => `shell-${++seq}`;

    // --- rail -------------------------------------------------------------
    const sidebar = new SideBarBuilder()
        .withCaption(of('Northwind Books'))
        .withExpanded(expanded$);

    addNavRows(sidebar);
    sidebar.addDivider();
    addNavRows(sidebar, [[NAV_ICONS.SETTINGS, 'Settings']]);

    const footer = sidebar.withFooter();
    footer.withCaption(of('Northwind Books Ltd')).withDescription(of('Owner · FY 2026'));
    const footerMenu = footer.withMenu();
    footerMenu.addItem().withIcon(NAV_ICONS.SETTINGS).withCaption(of('Company settings'));
    footerMenu.addDivider();
    footerMenu.addItem().withIcon(NAV_ICONS.SIGN_OUT).withCaption(of('Sign out'));

    // --- content ----------------------------------------------------------
    const content = document.createElement('div');
    content.className = 'flex h-full w-full min-w-0 flex-col gap-4 p-6';

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between gap-4';

    const heading = document.createElement('div');
    heading.innerHTML =
        '<div class="text-title-large text-on-surface">Trial balance</div>' +
        '<div class="text-body-medium text-on-surface-variant">Period 3 · 1–31 March 2026</div>';
    header.appendChild(heading);
    header.appendChild(new ChatTriggerBuilder().withOpen(open$).withCaption(of('Ask assistant')).build());
    content.appendChild(header);

    const figures: [string, string][] = [
        ['Revenue', '£1,284,900'],
        ['Cost of sales', '£812,340'],
        ['Gross margin', '36.8%'],
        ['Cash at bank', '£317,220'],
    ];
    const cards = document.createElement('div');
    cards.className = 'grid grid-cols-2 gap-4';
    for (const [label, value] of figures) {
        const card = document.createElement('div');
        card.className = 'rounded-large border border-outline/20 bg-surface-container-low p-4';
        card.innerHTML =
            `<div class="text-label-medium text-on-surface-variant">${label}</div>` +
            `<div class="text-title-large text-on-surface">${value}</div>`;
        cards.appendChild(card);
    }
    content.appendChild(cards);

    // --- assistant --------------------------------------------------------
    const chat = new ChatPanelBuilder()
        .withMessages(messages$)
        .withOnSend(text => messages$.next([
            ...messages$.getValue(),
            { id: nextId(), role: 'user', content: text },
        ]))
        .withOpen(open$)
        .asClosable()
        .withCaption(of('Aura Assistant'))
        .withStatus(of('Online'))
        .withPlaceholder(of('Ask about this period…'))
        .withWidth(of(360));

    const layout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.NONE)
        .withClass(of('h-full'));
    layout.addSlot().withName('sidebar').withSize(SlotSize.FIT).withContent(sidebar);
    layout.addSlot().withName('content').withSize(SlotSize.FULL).withContent({ build: () => content });
    layout.addSlot().withName('assistant').withSize(SlotSize.FIT).withContent(chat);

    const shell = createShell(layout.build());
    // The shell owns these three subjects, so it completes them when Storybook
    // swaps the story out.
    registerDestroy(shell, () => {
        open$.complete();
        expanded$.complete();
        messages$.complete();
    });
    return shell;
}
