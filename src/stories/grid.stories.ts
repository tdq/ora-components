import { GridBuilder } from '../components/grid/grid-builder';
import { SortDirection } from '../components/grid/types';
import { of, Subject } from 'rxjs';

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
    balance: number;
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
        balance: Math.floor(Math.random() * 10000) / 100,
        progress: Math.floor(Math.random() * 100)
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

    const actions = grid.withActions();
    actions.addAction('Edit', (user) => alert(`Editing ${user.name}`));
    actions.addAction('Delete', (user) => alert(`Deleting ${user.name}`));

    return grid.build();
};

export const WithToolbar = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 15)))
        .withHeight(of(400));

    const toolbar = grid.withToolbar();
    const addClick = new Subject<void>();
    addClick.subscribe(() => alert('Add User Clicked'));
    
    toolbar.withPrimaryButton().withCaption(of('Add User')).withClick(addClick);
    toolbar.addSecondaryButton().withCaption(of('Export'));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name');
    columns.addTextColumn('email').withHeader('Email');

    return grid.build();
};

export const Editable = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 15)))
        .withHeight(of(400))
        .asEditable();

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name');
    columns.addTextColumn('email').withHeader('Email');
    columns.addEnumColumn('role').withHeader('Role');

    return grid.build();
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
    columns.addNumberColumn('id').withHeader('ID').withWidth('60px').sortable(true);
    columns.addTextColumn('name').withHeader('Name').withWidth('150px').sortable(true);
    columns.addEnumColumn('role').withHeader('Role').withWidth('100px').sortable(true);
    columns.addMoneyColumn('balance').withHeader('Balance').withWidth('100px').sortable(true);
    columns.addDateColumn('lastLogin').withHeader('Last Login').withWidth('150px').sortable(true);

    return grid.build();
};

export const ResizableColumns = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 15)))
        .withHeight(of(400));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name (Resizable)').withWidth('200px').resizable(true);
    columns.addTextColumn('email').withHeader('Email (Resizable)').withWidth('250px').resizable(true);
    columns.addEnumColumn('role').withHeader('Role').withWidth('100px');
    columns.addMoneyColumn('balance').withHeader('Balance').withWidth('100px');

    return grid.build();
};
