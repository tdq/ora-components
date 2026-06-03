import { GridBuilder, PanelBuilder, LayoutBuilder } from '@tdq/ora-components';
import { BehaviorSubject, interval, of, Subscription } from 'rxjs';

// ---------- Domain types for the live ledger demo ----------

interface JournalEntry {
    id: string;
    date: string;
    account: string;
    currency: string;
    memo: string;
    debit: number;
    credit: number;
}

// ---------- Helpers ----------

const CURRENCY_SYMBOLS: Record<string, string> = {
    EUR: '€', USD: '$', GBP: '£', JPY: '¥', CHF: 'Fr',
};

const fmtEUR = (n: number): string =>
    '€ ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtAmount = (n: number, currency: string): string => {
    const sym = CURRENCY_SYMBOLS[currency] ?? currency;
    const decimals = currency === 'JPY' ? 0 : 2;
    return sym + ' ' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const pad2 = (n: number) => n.toString().padStart(2, '0');

function nextJournalEntry(now: Date, seq: number): JournalEntry {
    const accounts: Array<{ account: string; currency: string; memo: string }> = [
        { account: '1100 · Cash',                 currency: 'EUR', memo: 'Customer payment · INV-' },
        { account: '1200 · Accounts Receivable',  currency: 'USD', memo: 'Invoice issued · INV-' },
        { account: '4000 · Revenue',              currency: 'EUR', memo: 'Service revenue · SO-' },
        { account: '2100 · Accounts Payable',     currency: 'GBP', memo: 'Vendor bill · BIL-' },
        { account: '6500 · Operating Expense',    currency: 'USD', memo: 'SaaS subscription · ' },
        { account: '5000 · COGS',                 currency: 'JPY', memo: 'Materials issued · ' },
        { account: '1300 · Prepaid Expenses',     currency: 'CHF', memo: 'Insurance premium · ' },
    ];
    const pick = accounts[seq % accounts.length];
    const isJPY = pick.currency === 'JPY';
    const amt = isJPY
        ? Math.round(20000 + Math.random() * 980000)
        : Math.round((200 + Math.random() * 9800) * 100) / 100;
    const isDebit = seq % 2 === 0;
    const ref = (10000 + seq).toString();
    return {
        id: `je-${now.getTime()}-${seq}`,
        date: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`,
        account: pick.account,
        currency: pick.currency,
        memo: pick.memo + ref,
        debit: isDebit ? amt : 0,
        credit: isDebit ? 0 : amt,
    };
}

// ---------- Journal Entries Component ----------

export function buildJournalEntries(sub: Subscription): HTMLElement {
    const journalPanel = new PanelBuilder().asGlass();
    const journalLayout = new LayoutBuilder().asVertical();

    const journalHeader = document.createElement('div');
    journalHeader.className = 'flex w-full items-center justify-between gap-px-16 mb-px-8';
    journalHeader.innerHTML = `
        <span class="text-label-large font-semibold text-on-surface">Journal Entries &mdash; Live</span>
        <span class="inline-flex items-center gap-px-8 text-label-small text-on-surface-variant opacity-70">
            <span class="relative flex h-2 w-2"><span class="js-pulse-badge animate-ping absolute inline-flex h-full w-full rounded-full bg-kpi-green opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-kpi-green"></span></span>
            <span>posting &middot; auto-balanced</span>
        </span>
    `;
    journalLayout.addSlot().withContent({ build: () => journalHeader });

    const now = new Date();
    const seed: JournalEntry[] = Array.from({ length: 5 }, (_, i) => nextJournalEntry(now, i));
    const journal$ = new BehaviorSubject<JournalEntry[]>(seed);
    let seq = seed.length;
    sub.add(interval(3000).subscribe(() => {
        const next = nextJournalEntry(new Date(), seq++);
        const cur = journal$.value;
        journal$.next([next, ...cur].slice(0, 6));
    }));

    const journalGrid = new GridBuilder()
        .withItems(journal$ as any)
        .withHeight(of(220))
        .asGlass();
    const jcols = journalGrid.withColumns();
    jcols.addTextColumn('date').withHeader('Date').withWidth('110px').asResizable();
    jcols.addTextColumn('account').withHeader('Account').withWidth('220px').asResizable();
    jcols.addTextColumn('memo').withHeader('Memo').asResizable();
    jcols.addCustomColumn()
        .withHeader('Debit')
        .withWidth('130px')
        .asResizable()
        .withRenderer((item: any) => {
            const span = document.createElement('span');
            span.className = 'tabular-nums';
            span.style.cssText = 'color: var(--md-sys-color-on-surface); opacity: ' + (item.debit > 0 ? '1' : '0.25') + ';';
            span.textContent = item.debit > 0 ? fmtAmount(item.debit, item.currency) : '—';
            return span;
        });
    jcols.addCustomColumn()
        .withHeader('Credit')
        .withWidth('130px')
        .asResizable()
        .withRenderer((item: any) => {
            const span = document.createElement('span');
            span.className = 'tabular-nums';
            span.style.cssText = 'color: var(--md-sys-color-on-surface); opacity: ' + (item.credit > 0 ? '1' : '0.25') + ';';
            span.textContent = item.credit > 0 ? fmtAmount(item.credit, item.currency) : '—';
            return span;
        });
    jcols.addCustomColumn()
        .withHeader('')
        .withWidth('44px')
        .asResizable()
        .withRenderer(() => {
            const span = document.createElement('span');
            span.style.cssText = 'color:#10b981; font-weight:700;';
            span.textContent = '✓';
            return span;
        });

    journalLayout.addSlot().withContent(journalGrid);

    const totalsRow = document.createElement('div');
    totalsRow.setAttribute('aria-live', 'polite');
    totalsRow.className = 'mt-px-12 flex w-full items-center justify-between gap-px-16 px-px-12 py-px-8 rounded-large border border-outline-alpha-20 bg-surface-variant-alpha-30 tabular-nums';
    totalsRow.innerHTML = `
        <span class="text-label-medium font-semibold text-on-surface opacity-70 uppercase tracking-wide">Totals</span>
        <div class="flex items-center gap-px-24">
            <div class="flex items-baseline gap-1"><span class="text-label-small text-on-surface-variant opacity-60">Dr</span><span data-tot-dr class="text-title-medium font-bold text-on-surface">&euro; 0.00</span></div>
            <div class="flex items-baseline gap-1"><span class="text-label-small text-on-surface-variant opacity-60">Cr</span><span data-tot-cr class="text-title-medium font-bold text-on-surface">&euro; 0.00</span></div>
            <span data-bal class="inline-flex items-center gap-1 text-label-small font-semibold px-px-8 py-px-4 rounded-full text-trend-positive bg-trend-positive-bg">&#9878; balanced</span>
        </div>
    `;
    sub.add(journal$.subscribe(entries => {
        const dr = entries.reduce((s, e) => s + e.debit, 0);
        const cr = entries.reduce((s, e) => s + e.credit, 0);
        (totalsRow.querySelector('[data-tot-dr]') as HTMLElement).textContent = fmtEUR(dr);
        (totalsRow.querySelector('[data-tot-cr]') as HTMLElement).textContent = fmtEUR(cr);
        const balanced = Math.abs(dr - cr) < 0.005;
        const badge = totalsRow.querySelector('[data-bal]') as HTMLElement;
        badge.className = 'inline-flex items-center gap-1 text-label-small font-semibold px-px-8 py-px-4 rounded-full ' +
            (balanced ? 'text-trend-positive bg-trend-positive-bg' : 'text-trend-negative bg-trend-negative-bg');
        badge.textContent = balanced ? '⚖ balanced' : '⚠ out of balance';
    }));
    journalLayout.addSlot().withContent({ build: () => totalsRow });

    journalPanel.withContent(journalLayout);
    const journalEl = journalPanel.build();
    journalEl.classList.add('slide-in-down', 'hero-journal');

    return journalEl;
}
