import { GridBuilder, Icons } from 'aura-components';
import { SortDirection } from 'aura-components';
import { of, Subject } from 'rxjs';
import { Money } from 'aura-components';

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
    log.className = 'mt-4 p-3 bg-surface-container rounded text-xs font-mono max-h-32 overflow-y-auto text-on-surface-variant';
    log.textContent = 'Edit a cell and commit with Enter to see changes here...';

    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 15)))
        .withHeight(of(500))
        .asEditable((item: User) => {
            const entry = document.createElement('div');
            entry.textContent = `✓ ${item.name} — id:${item.id} active:${item.active} progress:${item.progress}% balance:${item.balance.amount} ${item.balance.currencyId}`;
            if (log.firstChild?.textContent?.startsWith('Edit')) {
                log.innerHTML = '';
            }
            log.prepend(entry);
        });

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name').withWidth('150px').asEditable();
    columns.addTextColumn('email').withHeader('Email').withWidth('200px').asEditable();
    columns.addNumberColumn('id').withHeader('ID').withWidth('60px');
    columns.addDateColumn('lastLogin').withHeader('Last Login').withWidth('140px').asEditable();
    columns.addBooleanColumn('active').withHeader('Active').withWidth('80px').asEditable();
    columns.addPercentageColumn('progress').withHeader('Progress').withWidth('100px').asEditable();
    columns.addMoneyColumn('balance').withHeader('Balance').withWidth('110px').asEditable();
    columns.addEnumColumn('role').withHeader('Role').withWidth('100px');

    const container = document.createElement('div');
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
