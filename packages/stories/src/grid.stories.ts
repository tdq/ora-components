import { GridBuilder, Icons } from '@tdq/ora-components';
import { SortDirection } from '@tdq/ora-components';
import { of, Subject } from 'rxjs';
import { Money } from '@tdq/ora-components';

export default {
    title: 'Components/Grid',
};

interface User {
    id: number;
    name: string;
    email: string;
    role: 'ADMIN' | 'USER' | 'GUEST';
    active: boolean;
    lastLogin: Date;
    balance: Money;
    progress: number;
}

const generateUsers = (count: number): User[] => {
    const roles: ('ADMIN' | 'USER' | 'GUEST')[] = ['ADMIN', 'USER', 'GUEST'];
    return Array.from({ length: count }).map((_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        role: roles[i % 3],
        active: i % 2 === 0,
        lastLogin: new Date(Date.now() - Math.random() * 10000000000),
        balance: {
            amount: Math.floor(Math.random() * 10000) / 100,
            currencyId: ['USD', 'EUR', 'GBP'][i % 3]
        },
        progress: Math.random()
    }));
};

const users = generateUsers(50);

export const Basic = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 10)))
        .withHeight(of(400));

    const columns = grid.withColumns();
    columns.addTextColumn('id').withHeader('ID').withWidth('50px');
    columns.addTextColumn('name').withHeader('Name');
    columns.addTextColumn('email').withHeader('Email');

    return grid.build();
};

export const ComplexColumns = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users))
        .withHeight(of(500));

    const columns = grid.withColumns();
    columns.addNumberColumn('id').withHeader('ID').withWidth('60px');
    columns.addTextColumn('name').withHeader('Name').withWidth('150px');
    columns.addEnumColumn('role').withHeader('Role').withWidth('100px');
    columns.addBooleanColumn('active').withHeader('Active').withWidth('80px');
    columns.addDateColumn('lastLogin').withHeader('Last Login').withWidth('120px');
    columns.addMoneyColumn('balance').withHeader('Balance').withWidth('100px');
    columns.addPercentageColumn('progress').withHeader('Progress').withWidth('100px');

    return grid.build();
};

export const MultiSelect = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 20)))
        .withHeight(of(400))
        .asMultiSelect();

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name');
    columns.addTextColumn('email').withHeader('Email');
    columns.addEnumColumn('role').withHeader('Role');

    return grid.build();
};

export const WithActions = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 15)))
        .withHeight(of(400));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name');
    columns.addTextColumn('email').withHeader('Email');

    const editClick = (user: User) => alert(`Editing ${user.name}`);
    const deleteClick = (user: User) => alert(`Deleting ${user.name}`);

    const actions = grid.withActions();
    actions.addAction(Icons.EDIT, 'Edit', editClick);
    actions.addAction(Icons.DELETE, 'Delete', deleteClick);

    return grid.build();
};

export const WithToolbar = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 15)))
        .withHeight(of(400));

    const toolbar = grid.withToolbar();
    const addClick = new Subject<void>();
    addClick.subscribe(() => alert('Add User Clicked'));

    toolbar.withPrimaryButton().withCaption(of('Add User')).withClick(() => addClick.next());
    toolbar.addSecondaryButton().withCaption(of('Export'));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name');
    columns.addTextColumn('email').withHeader('Email');

    return grid.build();
};

export const Editable = () => {
    const log = document.createElement('div');
    log.className = 'mt-4 p-4 bg-surface-container rounded-lg border border-outline/10 text-xs font-mono max-h-40 overflow-y-auto text-on-surface-variant shadow-inner';
    log.innerHTML = '<div class="opacity-50 italic mb-2 font-sans text-sm">Action Log: Edit a cell and commit with Enter to see changes here...</div>';

    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 15)))
        .withHeight(of(500))
        .asEditable((item: User) => {
            const entry = document.createElement('div');
            entry.className = 'py-1 border-b border-outline/5 last:border-0';
            entry.innerHTML = `<span class="text-primary font-bold">✓</span> <span class="text-on-surface font-semibold">${item.name}</span> <span class="opacity-70">(id:${item.id})</span>: 
                <span class="text-secondary">${item.balance.amount} ${item.balance.currencyId}</span>, 
                <span class="text-tertiary">${Math.round(item.progress * 100)}%</span>, 
                ${item.active ? '<span class="text-green-600">Active</span>' : '<span class="text-red-600">Inactive</span>'}`;

            const actionMsg = log.querySelector('.italic');
            if (actionMsg) actionMsg.remove();

            log.prepend(entry);
        });

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name').withWidth('150px').asEditable();
    columns.addTextColumn('email').withHeader('Email').withWidth('200px').asEditable();
    columns.addNumberColumn('id').withHeader('ID').withWidth('60px').withAlign('center');
    columns.addDateColumn('lastLogin').withHeader('Last Login').withWidth('140px').asEditable();
    columns.addBooleanColumn('active').withHeader('Active').withWidth('80px').asEditable().withAlign('center');
    columns.addPercentageColumn('progress').withHeader('Progress').withWidth('100px').asEditable();
    columns.addMoneyColumn('balance')
        .withHeader('Balance')
        .withWidth('120px')
        .asEditable()
        .withPrecision(2)
        .withCurrencies(['USD', 'EUR', 'GBP', 'JPY']);
    columns.addEnumColumn('role').withHeader('Role').withWidth('100px');

    const container = document.createElement('div');
    container.className = 'flex flex-col gap-2 p-4';
    container.appendChild(grid.build());
    container.appendChild(log);
    return container;
};

export const GlassEffect = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 15)))
        .withHeight(of(400))
        .asGlass();

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name');
    columns.addEnumColumn('role').withHeader('Role');
    columns.addMoneyColumn('balance').withHeader('Balance');

    const container = document.createElement('div');
    container.className = 'p-8 bg-gradient-to-br from-blue-500 to-purple-600 h-[500px] flex items-center justify-center';

    const gridElement = grid.build();
    gridElement.style.width = '100%';
    container.appendChild(gridElement);

    return container;
};

export const EmptyState = () => {
    const grid = new GridBuilder<User>()
        .withItems(of([]))
        .withHeight(of(200));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name');
    columns.addTextColumn('email').withHeader('Email');

    return grid.build();
};

export const CustomRendering = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 10)))
        .withHeight(of(400));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name');

    columns.addCustomColumn()
        .withHeader('Status Badge')
        .withWidth('150px')
        .withRenderer((user) => {
            const badge = document.createElement('span');
            badge.className = 'px-2 py-1 rounded text-xs font-semibold';
            if (user.active) {
                badge.classList.add('bg-green-100', 'text-green-800');
                badge.textContent = 'Active';
            } else {
                badge.classList.add('bg-red-100', 'text-red-800');
                badge.textContent = 'Inactive';
            }
            return badge;
        });

    return grid.build();
};

export const HighVolume = () => {
    const manyUsers = generateUsers(1000);
    const grid = new GridBuilder<User>()
        .withItems(of(manyUsers))
        .withHeight(of(600))
        .asMultiSelect();

    const columns = grid.withColumns();
    columns.addNumberColumn('id').withHeader('ID').withWidth('60px');
    columns.addTextColumn('name').withHeader('Name');
    columns.addTextColumn('email').withHeader('Email');
    columns.addEnumColumn('role').withHeader('Role');
    columns.addMoneyColumn('balance').withHeader('Balance');

    return grid.build();
};

export const Sorting = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users))
        .withHeight(of(500))
        .withSort('name', SortDirection.ASC);

    const columns = grid.withColumns();
    columns.addNumberColumn('id').withHeader('ID').withWidth('60px').asSortable();
    columns.addTextColumn('name').withHeader('Name').withWidth('150px').asSortable();
    columns.addEnumColumn('role').withHeader('Role').withWidth('100px').asSortable();
    columns.addMoneyColumn('balance').withHeader('Balance').withWidth('100px').asSortable();
    columns.addDateColumn('lastLogin').withHeader('Last Login').withWidth('150px').asSortable();

    return grid.build();
};

export const ResizableColumns = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 15)))
        .withHeight(of(400));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name (Resizable)').withWidth('200px').asResizable();
    columns.addTextColumn('email').withHeader('Email (Resizable)').withWidth('250px').asResizable();
    columns.addEnumColumn('role').withHeader('Role').withWidth('100px');
    columns.addMoneyColumn('balance').withHeader('Balance').withWidth('100px');

    return grid.build();
};

export const FullHeight = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name');
    columns.addTextColumn('email').withHeader('Email');
    columns.addEnumColumn('role').withHeader('Role');

    const container = document.createElement('div');
    container.className = 'p-4 border-2 border-dashed border-primary/30 h-[600px] flex flex-col';

    const label = document.createElement('div');
    label.className = 'mb-4 font-bold text-lg';
    label.textContent = 'Grid in a 600px container (Default 100% height)';

    container.appendChild(label);

    const gridEl = grid.build();
    gridEl.classList.add('flex-1');
    container.appendChild(gridEl);

    return container;
};
export const ConditionalStyling = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 20)))
        .withHeight(of(400));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name');
    columns.addEnumColumn('role').withHeader('Role');

    // Demonstrate withClass using item provider
    columns.addMoneyColumn('balance').withHeader('Balance')
        .withClass(user => user.balance.amount > 50 ? 'text-green-600 font-bold' : 'text-red-600');

    columns.addPercentageColumn('progress').withHeader('Progress')
        .withClass(user => user.progress > 0.8 ? 'bg-green-50' : (user.progress < 0.2 ? 'bg-red-50' : ''));

    return grid.build();
};

interface FullCoverageItem {
    id: number;
    name: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    department: string;
    score: number;
    rating: number;
    clicks: number;
    lastLogin: Date;
    createdAt: Date;
    lastModified: Date;
    role: 'ADMIN' | 'USER' | 'MANAGER' | 'VIEWER';
    status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';
    active: boolean;
    verified: boolean;
    progress: number;
    balance: Money;
    priority: 'low' | 'medium' | 'high';
    buttonLabel: string;
}

const generateFullCoverageData = (count: number): FullCoverageItem[] => {
    const roles: ('ADMIN' | 'USER' | 'MANAGER' | 'VIEWER')[] = ['ADMIN', 'USER', 'MANAGER', 'VIEWER'];
    const statuses: ('ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED')[] = ['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED'];
    const priorities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
    const departments = ['Engineering', 'Marketing', 'Sales', 'Support', 'HR', 'Finance', 'Legal', 'Operations'];
    const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    return Array.from({ length: count }).map((_, i) => ({
        id: i + 1,
        name: `Record ${i + 1}`,
        email: `record${i + 1}@company.com`,
        firstName: firstNames[i % firstNames.length],
        lastName: lastNames[i % lastNames.length],
        phone: `+1-555-${String(1000 + (i % 9000)).slice(0, 4)}`,
        department: departments[i % departments.length],
        score: Math.floor(Math.random() * 1000),
        rating: Math.floor(Math.random() * 5) + 1,
        clicks: Math.floor(Math.random() * 10000),
        lastLogin: new Date(Date.now() - Math.random() * 10000000000),
        createdAt: new Date(Date.now() - Math.random() * 100000000000),
        lastModified: new Date(Date.now() - Math.random() * 5000000000),
        role: roles[i % roles.length],
        status: statuses[i % statuses.length],
        active: i % 2 === 0,
        verified: i % 3 === 0,
        progress: Math.random(),
        balance: {
            amount: Math.floor(Math.random() * 10000) / 100,
            currencyId: ['USD', 'EUR', 'GBP'][i % 3]
        },
        priority: priorities[i % priorities.length],
        buttonLabel: `Btn${i + 1}`
    }));
};

export const FullCoverage = () => {
    const data = generateFullCoverageData(1000);
    const grid = new GridBuilder<FullCoverageItem>()
        .withItems(of(data))
        .withHeight(of(700));

    const columns = grid.withColumns();
    columns.addNumberColumn('id').withHeader('ID').withWidth('60px');
    columns.addTextColumn('name').withHeader('Name').withWidth('120px').asResizable();
    columns.addTextColumn('email').withHeader('Email').withWidth('220px').asResizable();
    columns.addTextColumn('firstName').withHeader('First Name').withWidth('100px').asResizable();
    columns.addTextColumn('lastName').withHeader('Last Name').withWidth('100px').asResizable();
    columns.addTextColumn('phone').withHeader('Phone').withWidth('130px').asResizable();
    columns.addTextColumn('department').withHeader('Department').withWidth('130px').asResizable();
    columns.addNumberColumn('score').withHeader('Score').withWidth('80px').asResizable();
    columns.addNumberColumn('rating').withHeader('Rating').withWidth('70px');
    columns.addNumberColumn('clicks').withHeader('Clicks').withWidth('80px').asResizable();
    columns.addDateColumn('lastLogin').withHeader('Last Login').withWidth('120px').asResizable();
    columns.addDateColumn('createdAt').withHeader('Created At').withWidth('120px').asResizable();
    columns.addDateTimeColumn('lastModified').withHeader('Last Modified').withWidth('150px').asResizable();
    columns.addEnumColumn('role').withHeader('Role').withWidth('100px');
    columns.addEnumColumn('status').withHeader('Status').withWidth('100px');
    columns.addBooleanColumn('active').withHeader('Active').withWidth('70px');
    columns.addBooleanColumn('verified').withHeader('Verified').withWidth('70px');
    columns.addPercentageColumn('progress').withHeader('Progress').withWidth('90px');
    columns.addMoneyColumn('balance').withHeader('Balance').withWidth('100px').asResizable();
    columns.addIconColumn('priority')
        .withHeader('Priority')
        .withIconProvider((item) => {
            if (item.priority === 'high') return 'w-3 h-3 rounded-full inline-block bg-red-500';
            if (item.priority === 'medium') return 'w-3 h-3 rounded-full inline-block bg-yellow-500';
            return 'w-3 h-3 rounded-full inline-block bg-green-500';
        })
        .withTooltipProvider((item) => `Priority: ${item.priority}`)
        .withWidth('70px');
    columns.addButtonColumn('buttonLabel')
        .withHeader('Action')
        .withLabel('Click')
        .withClick((item) => alert(`Clicked row ${item.id}`))
        .withWidth('90px');
    columns.addCustomColumn()
        .withHeader('Status Badge')
        .withWidth('150px')
        .withRenderer((item) => {
            const badge = document.createElement('span');
            badge.className = 'px-2 py-1 rounded text-xs font-semibold';
            if (item.active) {
                badge.classList.add('bg-green-100', 'text-green-800');
                badge.textContent = 'Active';
            } else {
                badge.classList.add('bg-red-100', 'text-red-800');
                badge.textContent = 'Inactive';
            }
            return badge;
        });

    const editClick = (item: FullCoverageItem) => alert(`Editing ${item.name}`);
    const deleteClick = (item: FullCoverageItem) => alert(`Deleting ${item.name}`);
    const viewClick = (item: FullCoverageItem) => alert(`Viewing ${item.name}`);

    const actions = grid.withActions();
    actions.addAction(Icons.EDIT, 'Edit', editClick);
    actions.addAction(Icons.DELETE, 'Delete', deleteClick);
    actions.addAction(Icons.EYE_OPEN, 'View', viewClick);

    return grid.build();
};
