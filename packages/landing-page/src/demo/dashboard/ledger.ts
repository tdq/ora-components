import { PanelBuilder, PanelGap, GridBuilder, LabelBuilder, LayoutBuilder, LayoutGap, SlotSize, Money } from '@tdq/ora-components';
import { BehaviorSubject, interval, map, of } from 'rxjs';
import { KPICardBuilder } from './kpi-card';

interface LedgerEntry {
    date: string;
    account: string;
    description: string;
    reference: string;
    debit: Money;
    credit: Money;
    balance: Money;
}

const generateInitialData = (count: number): LedgerEntry[] => {
    const data: LedgerEntry[] = [];
    let runningBalance = 81400.00;
    const accounts = ['Cash & Bank', 'Revenue / SaaS Subscriptions', 'Accounts Receivable', 'Expenses / Payroll', 'Expenses / Office Rent', 'Revenue / Professional Services', 'Expenses / SaaS Tools', 'Accounts Payable', 'Revenue / Add-ons', 'Expenses / Marketing'];

    for (let i = 0; i < count; i++) {
        const amount = Math.floor(Math.random() * 500000) / 100;
        const isDebit = Math.random() > 0.5;
        data.push({
            date: `2026-04-${String((i % 30) + 1).padStart(2, '0')}`,
            account: accounts[i % accounts.length],
            description: `Auto-generated entry ${i + 1}`,
            reference: `AUTO-${i + 1}`,
            debit: { amount: isDebit ? amount : 0, currencyId: 'EUR' },
            credit: { amount: isDebit ? 0 : amount, currencyId: 'EUR' },
            balance: { amount: runningBalance += (isDebit ? -amount : amount), currencyId: 'EUR' }
        });
    }
    return data;
};

const ledgerDataSubject = new BehaviorSubject<LedgerEntry[]>(generateInitialData(10000));

// Update 100 random entries every 10ms
interval(10).subscribe(() => {
    const current = [...ledgerDataSubject.getValue()];
    for (let i = 0; i < 100; i++) {
        const index = Math.floor(Math.random() * current.length);
        const amount = Math.floor(Math.random() * 500000) / 100;
        const isDebit = Math.random() > 0.5;
        current[index] = {
            ...current[index],
            debit: { amount: isDebit ? amount : 0, currencyId: 'EUR' },
            credit: { amount: isDebit ? 0 : amount, currencyId: 'EUR' }
        };
    }
    ledgerDataSubject.next(current);
});


function fmt(amount: number): string {
    return `€${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function createSummaryStats(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px-16 mb-px-24';

    const stats = [
        { label: 'Total Debits',  getValue: (d: LedgerEntry[]) => fmt(d.reduce((s, e) => s + e.debit.amount, 0)) },
        { label: 'Total Credits', getValue: (d: LedgerEntry[]) => fmt(d.reduce((s, e) => s + e.credit.amount, 0)) },
        { label: 'Net Balance',   getValue: (d: LedgerEntry[]) => fmt(Math.abs(d.reduce((s, e) => s + e.credit.amount, 0) - d.reduce((s, e) => s + e.debit.amount, 0))) },
        { label: 'Entries',       getValue: (d: LedgerEntry[]) => String(d.length) },
    ];

    stats.forEach(s => {
        const value$ = ledgerDataSubject.pipe(map(s.getValue));
        const card = new KPICardBuilder()
            .withLabel(of(s.label))
            .withValue(value$)
            .build();
        container.appendChild(card);
    });

    return container;
}


export function createLedger(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex-1 flex flex-col p-px-24';

    container.appendChild(createSummaryStats());

    const grid = new GridBuilder<LedgerEntry>()
        .withItems(ledgerDataSubject);
    const cols = grid.withColumns();
    cols.addTextColumn('date').withHeader('Date').withWidth('110px');
    cols.addTextColumn('account').withHeader('Account').withWidth('1fr');
    cols.addTextColumn('description').withHeader('Description').withWidth('1fr');
    cols.addTextColumn('reference').withHeader('Ref').withWidth('90px');
    cols.addMoneyColumn('debit').withHeader('Debit (€)').withWidth('110px');
    cols.addMoneyColumn('credit').withHeader('Credit (€)').withWidth('110px');
    cols.addMoneyColumn('balance').withHeader('Balance (€)').withWidth('120px');

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE)
        .withClass(of('h-full'));
    layout.addSlot().withContent(new LabelBuilder().withCaption(of('General Ledger — April 2026')));
    layout.addSlot().withContent(grid).withSize(SlotSize.FULL);

    const panel = new PanelBuilder()
        .withContent(layout)
        .withGap(PanelGap.LARGE)
        .build();
    panel.classList.add('flex', 'flex-col', 'flex-1', 'min-h-0');
    container.appendChild(panel);

    return container;
}

