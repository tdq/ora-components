import { GridBuilder, TabsBuilder } from 'ora-components';
import { of } from 'rxjs';
import { renderStatusChip } from './chip-utils';

type Customer = {
    id: number;
    name: string;
    company: string;
    email: string;
    role: string;
    status: string;
    lastLogin: string;
};

const ALL_CUSTOMERS: Customer[] = [
    { id: 1,  name: 'Alice Johnson',    company: 'TechNova Corp',       email: 'alice@technova.io',      role: 'Admin',   status: 'Active',   lastLogin: '2026-04-09 10:24' },
    { id: 2,  name: 'Bob Smith',        company: 'Meridian Labs',        email: 'bob@meridian.dev',       role: 'Viewer',  status: 'Inactive', lastLogin: '2026-04-07 14:12' },
    { id: 3,  name: 'Charlie Brown',    company: 'Skyline Analytics',    email: 'charlie@skyline.co',     role: 'Editor',  status: 'Active',   lastLogin: '2026-04-09 09:45' },
    { id: 4,  name: 'Diana Prince',     company: 'Orion Systems',        email: 'diana@orionsys.com',     role: 'Viewer',  status: 'Active',   lastLogin: '2026-04-08 11:30' },
    { id: 5,  name: 'Ethan Hunt',       company: 'Pinnacle SaaS',        email: 'ethan@pinnaclesaas.io',  role: 'Admin',   status: 'Active',   lastLogin: '2026-04-09 08:20' },
    { id: 6,  name: 'Fiona Gallagher',  company: 'Vertex Cloud',         email: 'fiona@vertex.cloud',     role: 'Viewer',  status: 'Pending',  lastLogin: '2026-04-06 16:15' },
    { id: 7,  name: 'George Miller',    company: 'BluePrint AI',         email: 'george@blueprint.ai',    role: 'Editor',  status: 'Active',   lastLogin: '2026-04-08 13:40' },
    { id: 8,  name: 'Hannah Abbott',    company: 'DataStream Inc',       email: 'hannah@datastream.io',   role: 'Billing', status: 'Active',   lastLogin: '2026-04-09 10:05' },
    { id: 9,  name: 'Ian Wright',       company: 'CloudForge Ltd',       email: 'ian@cloudforge.net',     role: 'Viewer',  status: 'Inactive', lastLogin: '2026-04-03 15:50' },
    { id: 10, name: 'Julia Roberts',    company: 'NexGen Solutions',     email: 'julia@nexgen.dev',       role: 'Editor',  status: 'Active',   lastLogin: '2026-04-08 11:20' },
    { id: 11, name: 'Kevin Park',       company: 'Ironclad Security',    email: 'kevin@ironclad.io',      role: 'Admin',   status: 'Active',   lastLogin: '2026-04-09 07:55' },
    { id: 12, name: 'Laura Chen',       company: 'Quantum Insights',     email: 'laura@quantumi.com',     role: 'Editor',  status: 'Active',   lastLogin: '2026-04-07 09:30' },
    { id: 13, name: 'Marcus Lee',       company: 'Apex Digital',         email: 'marcus@apexdigital.co',  role: 'Viewer',  status: 'Active',   lastLogin: '2026-04-08 14:45' },
    { id: 14, name: 'Nina Patel',       company: 'Cascade Ventures',     email: 'nina@cascadev.io',       role: 'Billing', status: 'Inactive', lastLogin: '2026-03-29 10:10' },
    { id: 15, name: 'Oscar Ruiz',       company: 'Lighthouse Labs',      email: 'oscar@lighthouse.dev',   role: 'Viewer',  status: 'Active',   lastLogin: '2026-04-09 08:00' },
    { id: 16, name: 'Priya Sharma',     company: 'TechNova Corp',        email: 'priya@technova.io',      role: 'Editor',  status: 'Active',   lastLogin: '2026-04-08 16:20' },
    { id: 17, name: 'Quinn Foster',     company: 'Meridian Labs',        email: 'quinn@meridian.dev',     role: 'Support', status: 'Pending',  lastLogin: '2026-04-05 12:00' },
    { id: 18, name: 'Rachel Kim',       company: 'Orion Systems',        email: 'rachel@orionsys.com',    role: 'Admin',   status: 'Active',   lastLogin: '2026-04-09 09:10' },
    { id: 19, name: 'Samuel Torres',    company: 'Pinnacle SaaS',        email: 'samuel@pinnaclesaas.io', role: 'Viewer',  status: 'Inactive', lastLogin: '2026-03-25 11:45' },
    { id: 20, name: 'Tara Nguyen',      company: 'BluePrint AI',         email: 'tara@blueprint.ai',      role: 'Editor',  status: 'Active',   lastLogin: '2026-04-08 15:30' },
];

function createCustomerGrid(data: Customer[]): GridBuilder<Customer> {
    const grid = new GridBuilder<Customer>().withItems(of(data));
    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name').withWidth('180px');
    columns.addTextColumn('company').withHeader('Company').withWidth('1fr');
    columns.addTextColumn('email').withHeader('Email').withWidth('1fr');
    columns.addTextColumn('role').withHeader('Role').withWidth('100px');
    columns.addCustomColumn()
        .withHeader('Status')
        .withWidth('100px')
        .withRenderer((item) => renderStatusChip(item.status));
    columns.addTextColumn('lastLogin').withHeader('Last Login').withWidth('170px');
    return grid;
}

export function createCustomers(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex-1 overflow-y-auto p-px-24';

    const activeData = ALL_CUSTOMERS.filter(c => c.status === 'Active');
    const inactiveData = ALL_CUSTOMERS.filter(c => c.status === 'Inactive' || c.status === 'Pending');

    const tabs = new TabsBuilder();
    tabs.addTab()
        .withCaption(of(`All Customers (${ALL_CUSTOMERS.length})`))
        .withContent(createCustomerGrid(ALL_CUSTOMERS));
    tabs.addTab()
        .withCaption(of(`Active (${activeData.length})`))
        .withContent(createCustomerGrid(activeData));
    tabs.addTab()
        .withCaption(of(`Inactive & Pending (${inactiveData.length})`))
        .withContent(createCustomerGrid(inactiveData));

    const tabsEl = tabs.build();
    tabsEl.classList.add('h-full', 'flex', 'flex-col');

    container.appendChild(tabsEl);

    return container;
}
