import { PanelBuilder, GridBuilder, LabelBuilder, Money } from '@tdq/ora-components';
import { of } from 'rxjs';

interface LedgerEntry {
    date: string;
    account: string;
    description: string;
    reference: string;
    debit: Money;
    credit: Money;
    balance: Money;
}

const LEDGER_DATA: LedgerEntry[] = [
    { date: '2026-04-01', account: 'Cash & Bank',                    description: 'Opening balance',                 reference: 'OB-001',  debit: { amount: 81400.00, currencyId: 'EUR' }, credit: { amount:     0.00, currencyId: 'EUR' }, balance: { amount:  81400.00, currencyId: 'EUR' } },
    { date: '2026-04-01', account: 'Revenue / SaaS Subscriptions',   description: 'Subscription — Pinnacle SaaS',    reference: 'INV-031', debit: { amount:     0.00, currencyId: 'EUR' }, credit: { amount:  2490.00, currencyId: 'EUR' }, balance: { amount:  83890.00, currencyId: 'EUR' } },
    { date: '2026-04-01', account: 'Accounts Receivable',            description: 'Subscription — Pinnacle SaaS',    reference: 'INV-031', debit: { amount:  2490.00, currencyId: 'EUR' }, credit: { amount:     0.00, currencyId: 'EUR' }, balance: { amount:  86380.00, currencyId: 'EUR' } },
    { date: '2026-04-02', account: 'Expenses / Payroll',             description: 'Payroll advance — April',         reference: 'PAY-004', debit: { amount: 18400.00, currencyId: 'EUR' }, credit: { amount:     0.00, currencyId: 'EUR' }, balance: { amount:  67980.00, currencyId: 'EUR' } },
    { date: '2026-04-02', account: 'Cash & Bank',                    description: 'Payroll advance — April',         reference: 'PAY-004', debit: { amount:     0.00, currencyId: 'EUR' }, credit: { amount: 18400.00, currencyId: 'EUR' }, balance: { amount:  49580.00, currencyId: 'EUR' } },
    { date: '2026-04-03', account: 'Revenue / SaaS Subscriptions',   description: 'Subscription — TechNova Corp',    reference: 'INV-032', debit: { amount:     0.00, currencyId: 'EUR' }, credit: { amount:  1190.00, currencyId: 'EUR' }, balance: { amount:  50770.00, currencyId: 'EUR' } },
    { date: '2026-04-03', account: 'Accounts Receivable',            description: 'Subscription — TechNova Corp',    reference: 'INV-032', debit: { amount:  1190.00, currencyId: 'EUR' }, credit: { amount:     0.00, currencyId: 'EUR' }, balance: { amount:  51960.00, currencyId: 'EUR' } },
    { date: '2026-04-04', account: 'Expenses / Office Rent',         description: 'Office rent — April',             reference: 'RENT-04', debit: { amount:  2800.00, currencyId: 'EUR' }, credit: { amount:     0.00, currencyId: 'EUR' }, balance: { amount:  49160.00, currencyId: 'EUR' } },
    { date: '2026-04-04', account: 'Cash & Bank',                    description: 'Office rent — April',             reference: 'RENT-04', debit: { amount:     0.00, currencyId: 'EUR' }, credit: { amount:  2800.00, currencyId: 'EUR' }, balance: { amount:  46360.00, currencyId: 'EUR' } },
    { date: '2026-04-05', account: 'Revenue / Professional Services', description: 'Consulting — Cascade Ventures',  reference: 'INV-033', debit: { amount:     0.00, currencyId: 'EUR' }, credit: { amount:  4200.00, currencyId: 'EUR' }, balance: { amount:  50560.00, currencyId: 'EUR' } },
    { date: '2026-04-05', account: 'Accounts Receivable',            description: 'Consulting — Cascade Ventures',   reference: 'INV-033', debit: { amount:  4200.00, currencyId: 'EUR' }, credit: { amount:     0.00, currencyId: 'EUR' }, balance: { amount:  54760.00, currencyId: 'EUR' } },
    { date: '2026-04-07', account: 'Expenses / SaaS Tools',          description: 'AWS invoice — March',             reference: 'EXP-011', debit: { amount:   420.00, currencyId: 'EUR' }, credit: { amount:     0.00, currencyId: 'EUR' }, balance: { amount:  54340.00, currencyId: 'EUR' } },
    { date: '2026-04-07', account: 'Accounts Payable',               description: 'AWS invoice — March',             reference: 'EXP-011', debit: { amount:     0.00, currencyId: 'EUR' }, credit: { amount:   420.00, currencyId: 'EUR' }, balance: { amount:  53920.00, currencyId: 'EUR' } },
    { date: '2026-04-08', account: 'Revenue / SaaS Subscriptions',   description: 'Subscription — DataStream Inc',   reference: 'INV-034', debit: { amount:     0.00, currencyId: 'EUR' }, credit: { amount:   490.00, currencyId: 'EUR' }, balance: { amount:  54410.00, currencyId: 'EUR' } },
    { date: '2026-04-08', account: 'Accounts Receivable',            description: 'Subscription — DataStream Inc',   reference: 'INV-034', debit: { amount:   490.00, currencyId: 'EUR' }, credit: { amount:     0.00, currencyId: 'EUR' }, balance: { amount:  54900.00, currencyId: 'EUR' } },
    { date: '2026-04-09', account: 'Revenue / Add-ons',              description: 'Add-on — Enterprise feature',     reference: 'INV-035', debit: { amount:     0.00, currencyId: 'EUR' }, credit: { amount:   299.00, currencyId: 'EUR' }, balance: { amount:  55199.00, currencyId: 'EUR' } },
    { date: '2026-04-09', account: 'Accounts Receivable',            description: 'Add-on — Enterprise feature',     reference: 'INV-035', debit: { amount:   299.00, currencyId: 'EUR' }, credit: { amount:     0.00, currencyId: 'EUR' }, balance: { amount:  55498.00, currencyId: 'EUR' } },
    { date: '2026-04-10', account: 'Expenses / Marketing',           description: 'Marketing campaign — Q2',         reference: 'EXP-012', debit: { amount:  1100.00, currencyId: 'EUR' }, credit: { amount:     0.00, currencyId: 'EUR' }, balance: { amount:  54398.00, currencyId: 'EUR' } },
    { date: '2026-04-10', account: 'Accounts Payable',               description: 'Marketing campaign — Q2',         reference: 'EXP-012', debit: { amount:     0.00, currencyId: 'EUR' }, credit: { amount:  1100.00, currencyId: 'EUR' }, balance: { amount:  53298.00, currencyId: 'EUR' } },
    { date: '2026-04-12', account: 'Revenue / SaaS Subscriptions',   description: 'Subscription — Quantum Insights', reference: 'INV-036', debit: { amount:     0.00, currencyId: 'EUR' }, credit: { amount:  1190.00, currencyId: 'EUR' }, balance: { amount:  54488.00, currencyId: 'EUR' } },
    { date: '2026-04-12', account: 'Accounts Receivable',            description: 'Subscription — Quantum Insights', reference: 'INV-036', debit: { amount:  1190.00, currencyId: 'EUR' }, credit: { amount:     0.00, currencyId: 'EUR' }, balance: { amount:  55678.00, currencyId: 'EUR' } },
    { date: '2026-04-15', account: 'Cash & Bank',                    description: 'Payment received — INV-031',      reference: 'PMT-021', debit: { amount:  2490.00, currencyId: 'EUR' }, credit: { amount:     0.00, currencyId: 'EUR' }, balance: { amount:  58168.00, currencyId: 'EUR' } },
    { date: '2026-04-15', account: 'Accounts Receivable',            description: 'Payment received — INV-031',      reference: 'PMT-021', debit: { amount:     0.00, currencyId: 'EUR' }, credit: { amount:  2490.00, currencyId: 'EUR' }, balance: { amount:  55678.00, currencyId: 'EUR' } },
];

function fmt(amount: number): string {
    return `€${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function createSummaryStats(): HTMLElement {
    const totalDebits  = LEDGER_DATA.reduce((s, e) => s + e.debit.amount, 0);
    const totalCredits = LEDGER_DATA.reduce((s, e) => s + e.credit.amount, 0);
    const netBalance   = totalCredits - totalDebits;

    const stats = [
        { label: 'Total Debits',  value: fmt(totalDebits),     color: '#EF4444', colorLight: 'rgba(239,68,68,0.08)'    },
        { label: 'Total Credits', value: fmt(totalCredits),    color: '#10B981', colorLight: 'rgba(16,185,129,0.08)'   },
        { label: 'Net Balance',   value: fmt(Math.abs(netBalance)), color: '#6750A4', colorLight: 'rgba(103,80,164,0.08)' },
        { label: 'Entries',       value: String(LEDGER_DATA.length), color: '#0EA5E9', colorLight: 'rgba(14,165,233,0.08)' },
    ];

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px-16 mb-px-24';

    stats.forEach(s => {
        const card = document.createElement('div');
        card.className = 'p-px-24 rounded-extra-large border';
        card.style.cssText = `background: var(--md-sys-color-surface); border-color: rgba(121,116,126,0.1); position: relative; overflow: hidden;`;
        card.innerHTML = `
            <div class="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-1/2 translate-x-1/2" style="background: radial-gradient(circle, ${s.colorLight}, transparent);"></div>
            <div class="flex items-center justify-between mb-px-12">
                <span class="text-label-medium text-on-surface-variant" style="opacity: 0.6;">${s.label}</span>
                <div class="w-8 h-8 rounded-large flex items-center justify-center" style="background: ${s.colorLight};">
                    <span class="w-2 h-2 rounded-full" style="background: ${s.color};"></span>
                </div>
            </div>
            <span class="text-headline-medium text-on-surface font-bold" style="letter-spacing: -0.02em;">${s.value}</span>
        `;
        grid.appendChild(card);
    });

    return grid;
}

export function createLedger(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex-1 overflow-y-auto p-px-24';

    container.appendChild(createSummaryStats());

    const panel = new PanelBuilder()
        .withContent(new LabelBuilder().withCaption(of('General Ledger — April 2026')))
        .build();
    panel.classList.add('flex', 'flex-col');

    const grid = new GridBuilder<LedgerEntry>()
        .withItems(of(LEDGER_DATA))
        .withHeight(of(520));
    const cols = grid.withColumns();
    cols.addTextColumn('date').withHeader('Date').withWidth('110px');
    cols.addTextColumn('account').withHeader('Account').withWidth('1fr');
    cols.addTextColumn('description').withHeader('Description').withWidth('1fr');
    cols.addTextColumn('reference').withHeader('Ref').withWidth('90px');
    cols.addMoneyColumn('debit').withHeader('Debit (€)').withWidth('110px');
    cols.addMoneyColumn('credit').withHeader('Credit (€)').withWidth('110px');
    cols.addMoneyColumn('balance').withHeader('Balance (€)').withWidth('120px');

    panel.appendChild(grid.build());
    container.appendChild(panel);

    return container;
}
