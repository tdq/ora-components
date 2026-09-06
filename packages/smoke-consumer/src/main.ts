import '@tdq/ora-components/style.css';
import './app.css';

import {
    LayoutBuilder, LayoutGap, SlotSize,
    SideBarBuilder,
    GridBuilder, SortDirection,
    DialogBuilder, DialogSize,
    LabelBuilder, LabelSize,
    ButtonBuilder,
    Icons,
    type Money,
} from '@tdq/ora-components';
// Exercised from its own subpath, not the main barrel, so this smoke app also
// covers `@tdq/ora-components/router`'s own `exports` entry and Vite build
// output (dist/router/index.js) — previously unbuilt and unreachable.
import { RouterBuilder } from '@tdq/ora-components/router';
import { themeManager } from '@tdq/ora-components';
import { of } from 'rxjs';

// ─── data ───────────────────────────────────────────────────────────────────
// 1 000 rows so the grid virtualization assertion (< 100 row nodes rendered)
// actually exercises the packaged component, not just its API surface.

interface LedgerRow {
    id: string;
    account: string;
    description: string;
    amount: Money;
    date: string;
    status: 'Posted' | 'Pending';
}

const ACCOUNTS = ['Operating', 'Payroll', 'Receivables', 'Payables', 'Reserve'];

// Deterministic pseudo-random amount in [AMOUNT_MIN, AMOUNT_MIN + AMOUNT_SPAN), with
// cents — varied enough per row to look like real data, stable across runs for a
// reproducible spec.
const AMOUNT_STEP = 37;
const AMOUNT_SPAN = 5000;
const AMOUNT_MIN = 10;
const CENTS_STEP = 13; // coprime-ish with 100, so cents cycle through a spread of values

function amountForRow(i: number): number {
    const whole = ((i * AMOUNT_STEP) % AMOUNT_SPAN) + AMOUNT_MIN;
    const cents = (i * CENTS_STEP) % 100;
    return Math.round(whole * 100 + cents) / 100;
}

function buildRows(count: number): LedgerRow[] {
    const rows: LedgerRow[] = [];
    for (let i = 0; i < count; i++) {
        const day = String((i % 28) + 1).padStart(2, '0');
        const month = String((i % 12) + 1).padStart(2, '0');
        rows.push({
            id: `LE-${String(i + 1).padStart(5, '0')}`,
            account: ACCOUNTS[i % ACCOUNTS.length],
            description: `Ledger line ${i + 1}`,
            amount: { amount: amountForRow(i), currencyId: 'EUR' },
            date: `2026-${month}-${day}`,
            status: i % 5 === 0 ? 'Pending' : 'Posted',
        });
    }
    return rows;
}

const ROWS = buildRows(1000);

// ─── helpers ────────────────────────────────────────────────────────────────

function label(text: string, size: LabelSize = LabelSize.MEDIUM): LabelBuilder {
    return new LabelBuilder().withCaption(of(text)).withSize(size);
}

// ─── grid page (routed) ─────────────────────────────────────────────────────

function createGridPage(): LayoutBuilder {
    const page = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM)
        .withClass(of('smoke-page h-full min-h-0'));

    page.addSlot().withSize(SlotSize.FIT).withContent(label('Ledger', LabelSize.LARGE));

    const grid = new GridBuilder<LedgerRow>()
        .withTestId('grid')
        .withItems(of(ROWS))
        .withSort('date', SortDirection.DESC);

    const cols = grid.withColumns();
    cols.addTextColumn('id').withHeader('Entry').withWidth('120px');
    cols.addTextColumn('account').withHeader('Account').withWidth('140px');
    cols.addTextColumn('description').withHeader('Description').withWidth('1fr');
    cols.addDateColumn('date').withHeader('Date').withWidth('120px').asSortable();
    cols.addMoneyColumn('amount').withHeader('Amount').withWidth('130px');
    cols.addTextColumn('status').withHeader('Status').withWidth('110px');

    page.addSlot().withSize(SlotSize.FULL).withContent(grid);

    return page;
}

// ─── settings page (routed) ─────────────────────────────────────────────────

function createSettingsPage(): LayoutBuilder {
    const page = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM)
        .withTestId('settings-page')
        .withClass(of('smoke-page h-full min-h-0'));

    page.addSlot().withSize(SlotSize.FIT).withContent(label('Settings', LabelSize.LARGE));

    // Theme toggle controls
    const themeControls = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.MEDIUM)
        .withClass(of('gap-md'));

    themeControls.addSlot().withSize(SlotSize.FIT).withContent(
        new ButtonBuilder()
            .withTestId('toggle-theme-light')
            .withCaption(of('Light'))
            .withClick(() => themeManager.setTheme('light'))
    );

    themeControls.addSlot().withSize(SlotSize.FIT).withContent(
        new ButtonBuilder()
            .withTestId('toggle-theme-dark')
            .withCaption(of('Dark'))
            .withClick(() => themeManager.setTheme('dark'))
    );

    page.addSlot().withSize(SlotSize.FIT).withContent(themeControls);

    page.addSlot().withSize(SlotSize.FIT).withContent(label('Default grid header:', LabelSize.SMALL));

    // Default grid for theming comparison
    const defaultGrid = new GridBuilder<LedgerRow>()
        .withTestId('grid')
        .withItems(of(ROWS.slice(0, 50)))
        .withSort('date', SortDirection.DESC);

    const defaultCols = defaultGrid.withColumns();
    defaultCols.addTextColumn('id').withHeader('Entry').withWidth('120px');
    defaultCols.addTextColumn('account').withHeader('Account').withWidth('140px');
    defaultCols.addTextColumn('description').withHeader('Description').withWidth('1fr');
    defaultCols.addDateColumn('date').withHeader('Date').withWidth('120px').asSortable();
    defaultCols.addMoneyColumn('amount').withHeader('Amount').withWidth('130px');
    defaultCols.addTextColumn('status').withHeader('Status').withWidth('110px');

    page.addSlot().withSize(SlotSize.FULL).withContent(defaultGrid);

    page.addSlot().withSize(SlotSize.FIT).withContent(label('Themed grid header (ledger-grid):', LabelSize.SMALL));

    // Grid with ledger-grid class for theming comparison
    const ledgerGrid = new GridBuilder<LedgerRow>()
        .withTestId('grid-ledger')
        .withClass(of('ledger-grid'))
        .withItems(of(ROWS.slice(0, 50)))
        .withSort('date', SortDirection.DESC);

    const ledgerCols = ledgerGrid.withColumns();
    ledgerCols.addTextColumn('id').withHeader('Entry').withWidth('120px');
    ledgerCols.addTextColumn('account').withHeader('Account').withWidth('140px');
    ledgerCols.addTextColumn('description').withHeader('Description').withWidth('1fr');
    ledgerCols.addDateColumn('date').withHeader('Date').withWidth('120px').asSortable();
    ledgerCols.addMoneyColumn('amount').withHeader('Amount').withWidth('130px');
    ledgerCols.addTextColumn('status').withHeader('Status').withWidth('110px');

    page.addSlot().withSize(SlotSize.FULL).withContent(ledgerGrid);

    return page;
}

// ─── dialog (opened from the sidebar, not routed) ───────────────────────────

function createNewEntryDialog(): DialogBuilder {
    const content = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.SMALL);
    content.addSlot().withContent(label('Add a new ledger line for the current period.'));
    content.addSlot().withContent(label('Amounts post immediately once saved.', LabelSize.SMALL));

    const dialog = new DialogBuilder()
        .withTestId('entry-dialog')
        .withCaption(of('New ledger entry'))
        .withDescription(of('Operating account'))
        .withSize(DialogSize.SMALL)
        .withContent(content);

    dialog.withToolbar()
        .addSecondaryButton()
        .withTestId('dialog-cancel')
        .withCaption(of('Cancel'))
        .withClick(() => dialog.close());

    dialog.withToolbar()
        .withPrimaryButton()
        .withTestId('dialog-save')
        .withCaption(of('Save'))
        .withClick(() => dialog.close());

    return dialog;
}

// ─── shell ───────────────────────────────────────────────────────────────────

const router = new RouterBuilder()
    .withFallback('/')
    .withTestId('outlet');

router.addRoute()
    .withPattern('/')
    .withContent(() => createGridPage());

router.addRoute()
    .withPattern('/settings')
    .withContent(() => createSettingsPage());

const dialog = createNewEntryDialog();

const sidebar = new SideBarBuilder()
    .withTestId('nav')
    .withRouter(router)
    .withCaption(of('Ledger Lite'))
    .asExpandedByDefault();

sidebar.addItem()
    .withTestId('nav-ledger')
    .withIcon(Icons.MENU)
    .withCaption(of('Ledger'))
    .withHref('/')
    .withExact(true);

sidebar.addItem()
    .withTestId('nav-settings')
    .withIcon(Icons.CALENDAR)
    .withCaption(of('Settings'))
    .withHref('/settings');

sidebar.addItem()
    .withTestId('nav-open-dialog')
    .withIcon(Icons.EDIT)
    .withCaption(of('New entry'))
    .withClick(() => dialog.show());

const contentArea = new LayoutBuilder()
    .asVertical()
    .withGap(LayoutGap.NONE)
    .withClass(of('h-full min-h-0 overflow-auto'));
contentArea.addSlot().withSize(SlotSize.FULL).withContent(router);

const shell = new LayoutBuilder()
    .asHorizontal()
    .withGap(LayoutGap.NONE)
    .withClass(of('smoke-shell w-full overflow-hidden'));

shell.addSlot().withSize(SlotSize.FIT).withContent(sidebar);
shell.addSlot().withSize(SlotSize.FULL).withContent(contentArea);

const app = document.getElementById('app')!;
app.appendChild(shell.build());
