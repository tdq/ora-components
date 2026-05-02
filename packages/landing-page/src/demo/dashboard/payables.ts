import { GridBuilder, TabsBuilder, LabelBuilder, PanelBuilder, ButtonBuilder, ButtonStyle, TextFieldBuilder, DatePickerBuilder, MoneyFieldBuilder, Money, DialogBuilder, DialogSize } from '@tdq/ora-components';
import { of, BehaviorSubject } from 'rxjs';
import { KPICardBuilder } from './kpi-card';

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

function computeAgingCard(label: string, filter: (inv: Invoice) => boolean): HTMLElement {
    const subset = ALL_INVOICES.filter(filter);
    const total = subset.reduce((s, i) => s + i.amount.amount, 0);

    const footerBuilder = {
        build: (): HTMLElement => {
            const div = document.createElement('div');
            div.className = 'text-label-small text-on-surface-variant mt-px-4';
            div.style.opacity = '0.5';
            div.textContent = `${subset.length} invoice${subset.length !== 1 ? 's' : ''}`;
            return div;
        }
    };

    return new KPICardBuilder()
        .withLabel(of(label))
        .withValue(of(`€${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`))
        .withFooter(footerBuilder)
        .build();
}

function createAgingSummary(): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px-16 mb-px-24';

    grid.appendChild(computeAgingCard(
        'Current',
        inv => inv.status === 'Current'
    ));
    grid.appendChild(computeAgingCard(
        '1–30 Days Overdue',
        inv => { const d = daysPast(inv.dueDate); return d >= 1 && d <= 30 && inv.status !== 'Paid'; }
    ));
    grid.appendChild(computeAgingCard(
        '31–60 Days Overdue',
        inv => { const d = daysPast(inv.dueDate); return d >= 31 && d <= 60 && inv.status !== 'Paid'; }
    ));
    grid.appendChild(computeAgingCard(
        '60+ Days Overdue',
        inv => { const d = daysPast(inv.dueDate); return d > 60 && inv.status !== 'Paid'; }
    ));

    return grid;
}

function buildInvoiceGrid(invoices$: BehaviorSubject<Invoice[]>): HTMLElement {
    const panel = new PanelBuilder()
        .withContent(new LabelBuilder().withCaption(of('Invoices')))
        .build();
    panel.classList.add('flex', 'flex-col', 'flex-1', 'min-h-0');

    const tabs = new TabsBuilder();

    const makeGrid = (filterFn?: (i: Invoice) => boolean) => {
        const filtered$ = new BehaviorSubject<Invoice[]>(
            filterFn ? invoices$.value.filter(filterFn) : invoices$.value
        );
        // keep filtered$ in sync when invoices$ updates
        invoices$.subscribe(all => filtered$.next(filterFn ? all.filter(filterFn) : all));

        const grid = new GridBuilder<Invoice>().withItems(filtered$);
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
    tabsEl.classList.add('flex-1', 'min-h-0');
    panel.appendChild(tabsEl);

    return panel;
}

function showNewInvoiceDialog(invoices$: BehaviorSubject<Invoice[]>): void {
    // Fresh BehaviorSubjects for every dialog invocation
    const vendor$ = new BehaviorSubject<string>('');
    const invoiceNum$ = new BehaviorSubject<string>('');
    const issueDate$ = new BehaviorSubject<Date | null>(null);
    const dueDate$ = new BehaviorSubject<Date | null>(null);
    const amount$ = new BehaviorSubject<Money | null>(null);

    // Error subjects per field
    const vendorError$ = new BehaviorSubject<string>('');
    const invoiceNumError$ = new BehaviorSubject<string>('');
    const issueDateError$ = new BehaviorSubject<string>('');
    const dueDateError$ = new BehaviorSubject<string>('');
    const amountError$ = new BehaviorSubject<string>('');

    // Form fields
    const vendorField = new TextFieldBuilder()
        .withLabel(of('Vendor'))
        .withPlaceholder(of('e.g. Amazon Web Services'))
        .withValue(vendor$)
        .withError(vendorError$)
        .build();

    const invoiceNumField = new TextFieldBuilder()
        .withLabel(of('Invoice #'))
        .withPlaceholder(of('e.g. INV-P016'))
        .withValue(invoiceNum$)
        .withError(invoiceNumError$)
        .build();

    const issueDatePicker = new DatePickerBuilder()
        .withCaption(of('Issue Date'))
        .withValue(issueDate$)
        .withFormat('DD-MM-YYYY')
        .withError(issueDateError$)
        .build();

    const dueDatePicker = new DatePickerBuilder()
        .withCaption(of('Due Date'))
        .withValue(dueDate$)
        .withFormat('DD-MM-YYYY')
        .withError(dueDateError$)
        .build();

    const amountField = new MoneyFieldBuilder()
        .withLabel(of('Amount'))
        .withValue(amount$)
        .withCurrencies(['EUR', 'USD', 'GBP'])
        .withPrecision(of(2))
        .withError(amountError$)
        .build();

    // Form layout inside the dialog (grid, same field order as before)
    const form = document.createElement('div');
    form.className = 'grid grid-cols-1 sm:grid-cols-2 gap-px-16';
    const vendorWrapper = document.createElement('div');
    vendorWrapper.className = 'sm:col-span-2';
    vendorWrapper.appendChild(vendorField);
    form.appendChild(vendorWrapper);
    form.appendChild(invoiceNumField);
    form.appendChild(issueDatePicker);
    form.appendChild(dueDatePicker);
    form.appendChild(amountField);

    // Build dialog
    const dialog = new DialogBuilder()
        .withCaption(of('Add New Invoice'))
        .withSize(DialogSize.MEDIUM)
        .withContent({ build: () => form });

    // Toolbar: Cancel (secondary) closes dialog, Add Invoice (primary) validates & saves
    dialog.withToolbar().addSecondaryButton()
        .withCaption(of('Cancel'))
        .withClick(() => dialog.close());

    dialog.withToolbar().withPrimaryButton()
        .withCaption(of('Add Invoice'))
        .withClick(() => {
            // Clear previous errors
            vendorError$.next('');
            invoiceNumError$.next('');
            issueDateError$.next('');
            dueDateError$.next('');
            amountError$.next('');

            const vendor = vendor$.value?.trim();
            const invoiceNum = invoiceNum$.value?.trim();
            const amountVal = amount$.value;
            const issueDateVal = issueDate$.value;
            const dueDateVal = dueDate$.value;

            let valid = true;

            if (!vendor) {
                vendorError$.next('Vendor is required');
                valid = false;
            }
            if (!invoiceNum) {
                invoiceNumError$.next('Invoice # is required');
                valid = false;
            }
            if (!issueDateVal) {
                issueDateError$.next('Issue date is required');
                valid = false;
            }
            if (!dueDateVal) {
                dueDateError$.next('Due date is required');
                valid = false;
            } else if (issueDateVal && dueDateVal < issueDateVal) {
                dueDateError$.next('Due date must be on or after issue date');
                valid = false;
            }
            if (!amountVal) {
                amountError$.next('Amount is required');
                valid = false;
            } else if (amountVal.amount <= 0) {
                amountError$.next('Amount must be greater than 0');
                valid = false;
            }

            if (!valid) return;

            const toISO = (d: Date) => d.toISOString().split('T')[0];
            const past = daysPast(toISO(dueDateVal!));
            const status = past > 0 ? 'Overdue' : past >= -7 ? 'Due Soon' : 'Current';

            const newInvoice: Invoice = {
                id: invoiceNum,
                vendor,
                issueDate: toISO(issueDateVal!),
                dueDate: toISO(dueDateVal!),
                amount: amountVal!,
                status,
            };

            invoices$.next([newInvoice, ...invoices$.value]);
            dialog.close();
        });

    dialog.show();
}

function createNewInvoiceButton(invoices$: BehaviorSubject<Invoice[]>): HTMLElement {
    return new ButtonBuilder()
        .withCaption(of('Add New Invoice'))
        .withStyle(of(ButtonStyle.FILLED))
        .withClick(() => showNewInvoiceDialog(invoices$))
        .build();
}

export function createPayables(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex-1 flex flex-col p-px-24';

    const invoices$ = new BehaviorSubject<Invoice[]>(ALL_INVOICES);

    container.appendChild(createAgingSummary());
    const btn = createNewInvoiceButton(invoices$);
    btn.classList.add('self-start', 'mb-px-24', 'flex-shrink-0');
    container.appendChild(btn);
    container.appendChild(buildInvoiceGrid(invoices$));

    return container;
}
