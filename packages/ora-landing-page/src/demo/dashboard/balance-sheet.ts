interface BSLineItem {
    label: string;
    amount: number;
    indent?: boolean;
    isSubtotal?: boolean;
    isTotal?: boolean;
}

const ASSETS: BSLineItem[] = [
    { label: 'Current Assets',               amount:       0, isSubtotal: false },
    { label: 'Cash & Bank',                  amount:  84200,  indent: true  },
    { label: 'Accounts Receivable',          amount:  12640,  indent: true  },
    { label: 'Prepaid Expenses',             amount:   3360,  indent: true  },
    { label: 'Total Current Assets',         amount: 100200,  isSubtotal: true  },
    { label: 'Non-current Assets',           amount:      0  },
    { label: 'Equipment (net of deprec.)',   amount:  14800,  indent: true  },
    { label: 'Software IP',                  amount:  38000,  indent: true  },
    { label: 'Total Non-current Assets',     amount:  52800,  isSubtotal: true  },
];

const TOTAL_ASSETS = 153000;

const LIABILITIES: BSLineItem[] = [
    { label: 'Current Liabilities',          amount:      0  },
    { label: 'Accounts Payable',             amount:   6420,  indent: true  },
    { label: 'Accrued Expenses',             amount:   3180,  indent: true  },
    { label: 'Total Current Liabilities',    amount:   9600,  isSubtotal: true  },
    { label: 'Long-term Liabilities',        amount:      0  },
    { label: 'Deferred Revenue',             amount:  18400,  indent: true  },
    { label: 'Total Liabilities',            amount:  28000,  isSubtotal: true  },
    { label: 'Equity',                       amount:      0  },
    { label: 'Common Stock',                 amount: 100000,  indent: true  },
    { label: 'Retained Earnings',            amount:  25000,  indent: true  },
    { label: 'Total Equity',                 amount: 125000,  isSubtotal: true  },
];

const TOTAL_LE = 153000;

function fmt(n: number): string {
    if (n === 0) return '';
    return `€${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function renderSection(title: string, items: BSLineItem[], grandTotal: number, grandTotalLabel: string): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'p-px-24 rounded-extra-large border flex flex-col gap-0';
    panel.style.cssText = 'background: var(--md-sys-color-surface); border-color: var(--dashboard-border-soft);';

    const heading = document.createElement('div');
    heading.className = 'text-title-medium font-semibold text-on-surface mb-px-16 pb-px-12 border-b';
    heading.style.cssText = 'border-color: var(--dashboard-border-soft);';
    heading.textContent = title;
    panel.appendChild(heading);

    items.forEach(item => {
        if (item.amount === 0 && !item.indent && !item.isSubtotal && !item.isTotal) {
            // Section sub-header
            const row = document.createElement('div');
            row.className = 'text-label-small font-semibold text-on-surface-variant uppercase tracking-wider mt-px-12 mb-px-4';
            row.style.cssText = 'opacity: 0.5; letter-spacing: 0.08em;';
            row.textContent = item.label;
            panel.appendChild(row);
            return;
        }

        const row = document.createElement('div');
        row.className = 'flex justify-between items-center py-px-4';

        if (item.isSubtotal) {
            row.className += ' mt-px-4 pt-px-8 border-t font-semibold';
            row.style.cssText = 'border-color: var(--dashboard-border-soft);';
        }

        const labelEl = document.createElement('span');
        labelEl.className = item.isSubtotal
            ? 'text-body-medium text-on-surface font-semibold'
            : item.indent
                ? 'text-body-medium text-on-surface-variant pl-px-16'
                : 'text-body-medium text-on-surface';
        labelEl.textContent = item.label;

        const amountEl = document.createElement('span');
        amountEl.className = item.isSubtotal
            ? 'text-body-medium text-on-surface font-semibold'
            : 'text-body-medium text-on-surface-variant';
        amountEl.textContent = fmt(item.amount);

        row.appendChild(labelEl);
        row.appendChild(amountEl);
        panel.appendChild(row);
    });

    // Grand total row
    const totalRow = document.createElement('div');
    totalRow.className = 'flex justify-between items-center mt-px-8 pt-px-12';
    totalRow.style.cssText = 'border-top: 2px solid var(--dashboard-accent-border);';

    const totalLabel = document.createElement('span');
    totalLabel.className = 'text-title-small font-bold text-on-surface';
    totalLabel.textContent = grandTotalLabel;

    const totalAmount = document.createElement('span');
    totalAmount.className = 'text-title-small font-bold';
    totalAmount.style.cssText = 'color: var(--dashboard-accent);';
    totalAmount.textContent = fmt(grandTotal);

    totalRow.appendChild(totalLabel);
    totalRow.appendChild(totalAmount);
    panel.appendChild(totalRow);

    return panel;
}

export function createBalanceSheet(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex-1 overflow-y-auto p-px-24';

    // Header
    const header = document.createElement('div');
    header.className = 'mb-px-24';
    header.innerHTML = `
        <h2 class="text-headline-small font-bold text-on-surface" style="letter-spacing: -0.02em;">Balance Sheet</h2>
        <p class="text-body-medium text-on-surface-variant mt-px-4" style="opacity: 0.6;">As of April 30, 2026</p>
    `;
    container.appendChild(header);

    // Two-column grid
    const columns = document.createElement('div');
    columns.className = 'grid grid-cols-1 lg:grid-cols-2 gap-px-24 mb-px-24';
    columns.appendChild(renderSection('Assets', ASSETS, TOTAL_ASSETS, 'TOTAL ASSETS'));
    columns.appendChild(renderSection('Liabilities & Equity', LIABILITIES, TOTAL_LE, 'TOTAL LIABILITIES & EQUITY'));
    container.appendChild(columns);

    // Balance check banner
    const isBalanced = TOTAL_ASSETS === TOTAL_LE;
    const assetsStr = (TOTAL_ASSETS as number).toLocaleString();
    const leStr = (TOTAL_LE as number).toLocaleString();
    const balanceMsg = isBalanced
        ? `Balanced — Assets (€${assetsStr}) = Liabilities & Equity (€${leStr})`
        : `Out of balance — Assets: €${assetsStr} ≠ Liabilities & Equity: €${leStr}`;
    const banner = document.createElement('div');
    banner.className = 'flex items-center gap-px-12 p-px-16 rounded-extra-large border';
    banner.style.cssText = isBalanced
        ? 'background: var(--kpi-green-soft); border-color: color-mix(in srgb, var(--kpi-green) 22%, transparent);'
        : 'background: var(--kpi-red-soft); border-color: color-mix(in srgb, var(--kpi-red) 22%, transparent);';
    banner.innerHTML = `
        <span style="font-size: 18px;">${isBalanced ? '✓' : '✗'}</span>
        <span class="text-body-medium font-semibold" style="color: ${isBalanced ? 'var(--kpi-green)' : 'var(--kpi-red)'};">
            ${balanceMsg}
        </span>
    `;
    container.appendChild(banner);

    return container;
}
