import { GridBuilder, LabelBuilder, LayoutBuilder, LayoutGap, SortDirection } from '@tdq/ora-components';
import { of } from 'rxjs';
import { createActionLog } from './story-helpers/action-log';

export default {
    title: 'Examples/AuditLog',
    tags: ['autodocs', 'enterprise'],
};

interface AuditEntry {
    id: number;
    timestamp: Date;
    user: string;
    entity: string;
    action: 'Created' | 'Updated' | 'Deleted';
    field: string;
    oldValue: string;
    newValue: string;
}

const USERS = ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 'Eve Martin'];
const ENTITIES = ['Product', 'Order', 'Customer', 'Invoice', 'Subscription'];
const ACTIONS: AuditEntry['action'][] = ['Created', 'Updated', 'Deleted'];
const FIELDS_BY_ENTITY: Record<string, string[]> = {
    Product: ['Name', 'Price', 'Category', 'Stock', 'SKU', 'Description', 'Status'],
    Order: ['Status', 'Total', 'Shipping Address', 'Payment Method', 'Items', 'Discount'],
    Customer: ['Email', 'Phone', 'Address', 'Name', 'Tier', 'Status'],
    Invoice: ['Amount', 'Due Date', 'Status', 'Line Items', 'Tax Rate'],
    Subscription: ['Plan', 'Price', 'Status', 'Billing Cycle', 'Next Billing'],
};
const PRODUCT_NAMES = ['Widget Pro', 'Basic Plan', 'Premium Support', 'Standard License', 'Enterprise Suite'];
const STATUSES = ['Active', 'Inactive', 'Pending', 'Suspended', 'Draft'];
const PRICES = ['$19.99', '$49.99', '$99.99', '$149.99', '$299.99'];

function generateAuditEntries(count: number): AuditEntry[] {
    const now = Date.now();
    return Array.from({ length: count }).map((_, i) => {
        const entity = ENTITIES[i % ENTITIES.length];
        const entityFields = FIELDS_BY_ENTITY[entity];
        const field = entityFields[i % entityFields.length];
        const action = ACTIONS[i % ACTIONS.length];

        const pickValue = (idx: number): string => {
            if (field === 'Price' || field === 'Total' || field === 'Amount') return PRICES[idx % PRICES.length];
            if (field === 'Status' || field === 'Tier') return STATUSES[idx % STATUSES.length];
            if (field === 'Name' || field === 'Plan') return PRODUCT_NAMES[idx % PRODUCT_NAMES.length];
            return `Value ${(idx * 7 + 3) % 1000}`;
        };

        let oldValue: string;
        let newValue: string;

        switch (action) {
            case 'Created':
                oldValue = '';
                newValue = pickValue(i);
                break;
            case 'Deleted':
                oldValue = pickValue(i);
                newValue = '';
                break;
            case 'Updated':
                oldValue = pickValue(i);
                newValue = pickValue(i + 1);
                break;
        }

        return {
            id: i + 1,
            timestamp: new Date(now - (count - i) * 3_600_000),
            user: USERS[i % USERS.length],
            entity,
            action,
            field,
            oldValue,
            newValue,
        };
    });
}

const auditEntries = generateAuditEntries(500);

export const Basic = () => {
    const { element: actionLog, log } = createActionLog();

    const grid = new GridBuilder<AuditEntry>()
        .withItems(of(auditEntries))
        .withHeight(of(600))
        .withSort('timestamp', SortDirection.DESC);

    const columns = grid.withColumns();
    columns.addDateTimeColumn('timestamp')
        .withHeader('Timestamp')
        .withWidth('180px')
        .asSortable();
    columns.addTextColumn('user')
        .withHeader('User')
        .withWidth('150px');
    columns.addTextColumn('entity')
        .withHeader('Entity')
        .withWidth('120px');
    columns.addCustomColumn()
        .withHeader('Action')
        .withWidth('100px')
        .withRenderer((entry) => {
            const badge = document.createElement('span');
            badge.className = 'px-2 py-1 rounded text-xs font-semibold';
            if (entry.action === 'Created') {
                badge.classList.add('bg-green-100', 'text-green-800');
                badge.textContent = 'Created';
            } else if (entry.action === 'Updated') {
                badge.classList.add('bg-blue-100', 'text-blue-800');
                badge.textContent = 'Updated';
            } else {
                badge.classList.add('bg-red-100', 'text-red-800');
                badge.textContent = 'Deleted';
            }
            return badge;
        });
    columns.addTextColumn('field')
        .withHeader('Field')
        .withWidth('120px');
    columns.addTextColumn('oldValue')
        .withHeader('Old Value')
        .withWidth('160px');
    columns.addTextColumn('newValue')
        .withHeader('New Value')
        .withWidth('160px');

    const toolbar = grid.withToolbar();
    toolbar.addSecondaryButton()
        .withCaption(of('Export'))
        .withClick(() => log('Export audit log triggered'));

    const titleLabel = new LabelBuilder()
        .withCaption(of('Audit Log'))
        .withClass(of('text-headline-medium font-bold text-on-surface'))
        .build();

    const immutableNote = new LabelBuilder()
        .withCaption(of('This log is immutable'))
        .withClass(of('text-sm text-on-surface-variant italic'))
        .build();

    const headerRow = document.createElement('div');
    headerRow.className = 'flex items-center gap-3';
    headerRow.appendChild(titleLabel);
    headerRow.appendChild(immutableNote);

    const container = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM)
        .withClass(of('p-4'));

    container.addSlot().withContent({ build: () => headerRow });
    container.addSlot().withContent(grid);
    container.addSlot().withContent({ build: () => actionLog });

    return container.build();
};
