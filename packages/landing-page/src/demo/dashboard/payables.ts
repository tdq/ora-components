import { GridBuilder, TabsBuilder, LabelBuilder, PanelBuilder, ButtonBuilder, ButtonStyle, TextFieldBuilder, DatePickerBuilder, MoneyFieldBuilder, Money } from 'ora-components';
import { of, BehaviorSubject } from 'rxjs';

interface Invoice {
    id: string;
    vendor: string;
    issueDate: string;
    dueDate: string;
    amount: Money;
    status: string;
}

// Reference date for aging calculation
const TODAY = new Date('2026-04-16');

function daysPast(dueDate: string): number {
    const due = new Date(dueDate);
    return Math.floor((TODAY.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

const ALL_INVOICES: Invoice[] = [
    { id: 'INV-P001', vendor: 'Amazon Web Services',   issueDate: '2026-04-01', dueDate: '2026-04-30', amount: { amount:  742.80, currencyId: 'EUR' }, status: 'Current'  },
    { id: 'INV-P002', vendor: 'Stripe Inc.',            issueDate: '2026-04-01', dueDate: '2026-04-30', amount: { amount:  119.00, currencyId: 'EUR' }, status: 'Current'  },
    { id: 'INV-P003', vendor: 'Figma Inc.',             issueDate: '2026-04-01', dueDate: '2026-04-30', amount: { amount:   75.00, currencyId: 'EUR' }, status: 'Current'  },
    { id: 'INV-P004', vendor: 'HubSpot CRM',            issueDate: '2026-03-25', dueDate: '2026-04-24', amount: { amount:  540.00, currencyId: 'EUR' }, status: 'Current'  },
    { id: 'INV-P005', vendor: 'Office Landlord GmbH',   issueDate: '2026-04-01', dueDate: '2026-04-05', amount: { amount: 2800.00, currencyId: 'EUR' }, status: 'Due Soon' },
    { id: 'INV-P006', vendor: 'Slack Technologies',     issueDate: '2026-03-20', dueDate: '2026-04-19', amount: { amount:  156.00, currencyId: 'EUR' }, status: 'Due Soon' },
    { id: 'INV-P007', vendor: 'Loom Inc.',               issueDate: '2026-03-18', dueDate: '2026-04-17', amount: { amount:   32.00, currencyId: 'EUR' }, status: 'Due Soon' },
    { id: 'INV-P008', vendor: 'Linear B.V.',             issueDate: '2026-03-10', dueDate: '2026-04-09', amount: { amount:   96.00, currencyId: 'EUR' }, status: 'Overdue'  },
    { id: 'INV-P009', vendor: 'Freelancer — J. Müller', issueDate: '2026-02-28', dueDate: '2026-03-28', amount: { amount: 1200.00, currencyId: 'EUR' }, status: 'Overdue'  },
    { id: 'INV-P010', vendor: 'Google Workspace',       issueDate: '2026-03-01', dueDate: '2026-03-31', amount: { amount:  216.00, currencyId: 'EUR' }, status: 'Overdue'  },
    { id: 'INV-P011', vendor: 'Office Landlord GmbH',   issueDate: '2026-03-01', dueDate: '2026-03-05', amount: { amount: 2800.00, currencyId: 'EUR' }, status: 'Paid'     },
    { id: 'INV-P012', vendor: 'Amazon Web Services',    issueDate: '2026-03-01', dueDate: '2026-03-31', amount: { amount:  698.40, currencyId: 'EUR' }, status: 'Paid'     },
    { id: 'INV-P013', vendor: 'Stripe Inc.',             issueDate: '2026-03-01', dueDate: '2026-03-31', amount: { amount:  119.00, currencyId: 'EUR' }, status: 'Paid'     },
    { id: 'INV-P014', vendor: 'Figma Inc.',              issueDate: '2026-03-01', dueDate: '2026-03-31', amount: { amount:   75.00, currencyId: 'EUR' }, status: 'Paid'     },
    { id: 'INV-P015', vendor: 'HubSpot CRM',             issueDate: '2026-02-25', dueDate: '2026-03-26', amount: { amount:  540.00, currencyId: 'EUR' }, status: 'Paid'     },
];

function renderPayableChip(status: string): HTMLElement {
    const chip = document.createElement('span');
    chip.className = 'px-3 py-1 rounded-full text-xs font-medium';
    const colors: Record<string, { bg: string; text: string }> = {
        'Current':  { bg: 'rgba(14,165,233,0.1)',   text: '#0369a1' },
        'Due Soon': { bg: 'rgba(245,158,11,0.1)',   text: '#b45309' },
        'Overdue':  { bg: 'rgba(239,68,68,0.1)',    text: '#b91c1c' },
        'Paid':     { bg: 'rgba(16,185,129,0.1)',   text: '#047857' },
    };
    const c = colors[status] ?? { bg: 'rgba(121,116,126,0.1)', text: 'var(--md-sys-color-on-surface-variant)' };
    chip.style.cssText = `background: ${c.bg}; color: ${c.text};`;
    chip.textContent = status;
    return chip;
}

function computeAgingCard(label: string, filter: (inv: Invoice) => boolean, accentColor: string, lightColor: string): HTMLElement {
    const subset = ALL_INVOICES.filter(filter);
    const total = subset.reduce((s, i) => s + i.amount.amount, 0);

    const card = document.createElement('div');
    card.className = 'p-px-24 rounded-extra-large border';
    card.style.cssText = `background: var(--md-sys-color-surface); border-color: rgba(121,116,126,0.1); position: relative; overflow: hidden;`;
    card.innerHTML = `
        <div class="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-1/2 translate-x-1/2" style="background: radial-gradient(circle, ${lightColor}, transparent);"></div>
        <div class="flex items-center justify-between mb-px-12">
            <span class="text-label-medium text-on-surface-variant" style="opacity: 0.6;">${label}</span>
            <div class="w-8 h-8 rounded-large flex items-center justify-center" style="background: ${lightColor};">
                <span class="w-2 h-2 rounded-full" style="background: ${accentColor};"></span>
            </div>
        </div>
        <span class="text-headline-medium text-on-surface font-bold" style="letter-spacing: -0.02em;">
            €${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <div class="text-label-small text-on-surface-variant mt-px-4" style="opacity: 0.5;">${subset.length} invoice${subset.length !== 1 ? 's' : ''}</div>
    `;
    return card;
}

function createAgingSummary(): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px-16 mb-px-24';

    grid.appendChild(computeAgingCard(
        'Current',
        inv => inv.status === 'Current',
        '#0EA5E9', 'rgba(14,165,233,0.08)'
    ));
    grid.appendChild(computeAgingCard(
        '1–30 Days Overdue',
        inv => { const d = daysPast(inv.dueDate); return d >= 1 && d <= 30 && inv.status !== 'Paid'; },
        '#F59E0B', 'rgba(245,158,11,0.08)'
    ));
    grid.appendChild(computeAgingCard(
        '31–60 Days Overdue',
        inv => { const d = daysPast(inv.dueDate); return d >= 31 && d <= 60 && inv.status !== 'Paid'; },
        '#EF4444', 'rgba(239,68,68,0.08)'
    ));
    grid.appendChild(computeAgingCard(
        '60+ Days Overdue',
        inv => { const d = daysPast(inv.dueDate); return d > 60 && inv.status !== 'Paid'; },
        '#7D5260', 'rgba(125,82,96,0.08)'
    ));

    return grid;
}

function buildInvoiceGrid(invoices$: BehaviorSubject<Invoice[]>): HTMLElement {
    const panel = new PanelBuilder()
        .withContent(new LabelBuilder().withCaption(of('Invoices')))
        .build();
    panel.classList.add('flex', 'flex-col', 'mb-px-24');

    const tabs = new TabsBuilder();

    const makeGrid = (filterFn?: (i: Invoice) => boolean) => {
        const filtered$ = new BehaviorSubject<Invoice[]>(
            filterFn ? invoices$.value.filter(filterFn) : invoices$.value
        );
        // keep filtered$ in sync when invoices$ updates
        invoices$.subscribe(all => filtered$.next(filterFn ? all.filter(filterFn) : all));

        const grid = new GridBuilder<Invoice>().withItems(filtered$).withHeight(of(280));
        const cols = grid.withColumns();
        cols.addTextColumn('vendor').withHeader('Vendor').withWidth('1fr');
        cols.addTextColumn('id').withHeader('Invoice #').withWidth('100px');
        cols.addTextColumn('issueDate').withHeader('Issued').withWidth('110px');
        cols.addTextColumn('dueDate').withHeader('Due').withWidth('110px');
        cols.addMoneyColumn('amount').withHeader('Amount (€)').withWidth('120px');
        cols.addCustomColumn().withHeader('Status').withWidth('100px').withRenderer(i => renderPayableChip(i.status));
        return grid;
    };

    tabs.addTab().withCaption(of(`All (${ALL_INVOICES.length})`)).withContent(makeGrid());
    tabs.addTab().withCaption(of('Due Soon')).withContent(makeGrid(i => i.status === 'Due Soon'));
    tabs.addTab().withCaption(of('Overdue')).withContent(makeGrid(i => i.status === 'Overdue'));
    tabs.addTab().withCaption(of('Paid')).withContent(makeGrid(i => i.status === 'Paid'));

    const tabsEl = tabs.build();
    panel.appendChild(tabsEl);

    return panel;
}

function createNewInvoiceForm(invoices$: BehaviorSubject<Invoice[]>): HTMLElement {
    const panel = new PanelBuilder()
        .withContent(new LabelBuilder().withCaption(of('Add New Invoice')))
        .build();
    panel.classList.add('flex', 'flex-col');

    const form = document.createElement('div');
    form.className = 'p-px-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px-16';

    // Text fields
    const vendorField = new TextFieldBuilder()
        .withLabel(of('Vendor'))
        .withPlaceholder(of('e.g. Amazon Web Services'))
        .build();

    const invoiceNumField = new TextFieldBuilder()
        .withLabel(of('Invoice #'))
        .withPlaceholder(of('e.g. INV-P016'))
        .build();

    // Date pickers
    const issueDate$ = new BehaviorSubject<Date | null>(null);
    const dueDate$   = new BehaviorSubject<Date | null>(null);

    const issueDatePicker = new DatePickerBuilder()
        .withValue(issueDate$)
        .withCaption(of('Issue Date'))
        .withFormat('DD-MM-YYYY')
        .build();

    const dueDatePicker = new DatePickerBuilder()
        .withValue(dueDate$)
        .withCaption(of('Due Date'))
        .withFormat('DD-MM-YYYY')
        .build();

    // Money field
    const amount$ = new BehaviorSubject<Money | null>(null);
    const amountField = new MoneyFieldBuilder()
        .withValue(amount$)
        .withLabel(of('Amount'))
        .withCurrencies(['EUR', 'USD', 'GBP'])
        .build();

    // Add button
    const addBtn = new ButtonBuilder()
        .withCaption(of('Add Invoice'))
        .withStyle(of(ButtonStyle.FILLED))
        .build();
    addBtn.classList.add('self-end');

    addBtn.addEventListener('click', () => {
        const vendorInput = vendorField.querySelector('input') as HTMLInputElement;
        const invoiceInput = invoiceNumField.querySelector('input') as HTMLInputElement;

        const vendor = vendorInput?.value?.trim();
        const invoiceNum = invoiceInput?.value?.trim();
        const amountVal = amount$.value;
        const issueDateVal = issueDate$.value;
        const dueDateVal = dueDate$.value;

        if (!vendor || !invoiceNum || !amountVal || !issueDateVal || !dueDateVal) return;

        const toISO = (d: Date) => d.toISOString().split('T')[0];

        const past = daysPast(toISO(dueDateVal));
        const status = past > 0 ? 'Overdue' : past >= -7 ? 'Due Soon' : 'Current';

        const newInvoice: Invoice = {
            id: invoiceNum,
            vendor,
            issueDate: toISO(issueDateVal),
            dueDate:   toISO(dueDateVal),
            amount: amountVal,
            status,
        };

        invoices$.next([newInvoice, ...invoices$.value]);

        // Reset
        if (vendorInput) vendorInput.value = '';
        if (invoiceInput) invoiceInput.value = '';
        issueDate$.next(null);
        dueDate$.next(null);
        amount$.next(null);
    });

    const buttonWrapper = document.createElement('div');
    buttonWrapper.className = 'flex items-end';
    buttonWrapper.appendChild(addBtn);

    form.appendChild(vendorField);
    form.appendChild(invoiceNumField);
    form.appendChild(issueDatePicker);
    form.appendChild(dueDatePicker);
    form.appendChild(amountField);
    form.appendChild(buttonWrapper);

    panel.appendChild(form);
    return panel;
}

export function createPayables(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex-1 overflow-y-auto p-px-24';

    const invoices$ = new BehaviorSubject<Invoice[]>(ALL_INVOICES);

    container.appendChild(createAgingSummary());
    container.appendChild(buildInvoiceGrid(invoices$));
    container.appendChild(createNewInvoiceForm(invoices$));

    return container;
}
