import { GridBuilder, Icons, LabelBuilder, LayoutGap, SlotSize, CheckboxBuilder } from '@tdq/ora-components';
import { SortDirection } from '@tdq/ora-components';
import { BehaviorSubject, of, Subject, combineLatest, map } from 'rxjs';
import { LayoutBuilder } from '@tdq/ora-components';
import { createActionLog, createButton, createControlStrip, generateUsers, generateFullCoverageData } from './story-helpers';
import type { User, FullCoverageItem } from './story-helpers';

export default {
    title: 'Components/Grid',
    tags: ['stable', 'glass'],
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
    columns.addTextColumn('name').withHeader('Name');
    columns.addEnumColumn('role').withHeader('Role');
    columns.addBooleanColumn('active').withHeader('Active');
    columns.addDateColumn('lastLogin').withHeader('Last Login');
    columns.addMoneyColumn('balance').withHeader('Balance');
    columns.addPercentageColumn('progress').withHeader('Progress');

    return grid.build();
};

export const Sorting = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users))
        .withHeight(of(500))
        .withSort('name', SortDirection.ASC);

    const columns = grid.withColumns();
    columns.addNumberColumn('id').withHeader('ID').withWidth('60px').asSortable();
    columns.addTextColumn('name').withHeader('Name').asSortable();
    columns.addEnumColumn('role').withHeader('Role').asSortable();
    columns.addMoneyColumn('balance').withHeader('Balance').asSortable();
    columns.addDateColumn('lastLogin').withHeader('Last Login').asSortable();

    return grid.build();
};

export const ResizableColumns = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 15)))
        .withHeight(of(400));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name (Resizable)').asResizable();
    columns.addTextColumn('email').withHeader('Email (Resizable)').asResizable();
    columns.addEnumColumn('role').withHeader('Role');
    columns.addMoneyColumn('balance').withHeader('Balance');

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

export const EmptyState = () => {
    const grid = new GridBuilder<User>()
        .withItems(of([]))
        .withHeight(of(200));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name');
    columns.addTextColumn('email').withHeader('Email');

    return grid.build();
};

export const Loading = () => {
    const data$ = new BehaviorSubject<User[]>([]);

    const loadingLabel = new LabelBuilder()
        .withCaption(of('Loading data...'))
        .build();

    const grid = new GridBuilder<User>()
        .withItems(data$)
        .withHeight(of(400));

    const columns = grid.withColumns();
    columns.addNumberColumn('id').withHeader('ID').withWidth('60px');
    columns.addTextColumn('name').withHeader('Name');
    columns.addTextColumn('email').withHeader('Email');

    const container = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.SMALL)
        .withClass(of('p-4'));

    container.addSlot().withContent({ build: () => loadingLabel });
    container.addSlot().withContent(grid);

    const result = container.build();

    setTimeout(() => {
        loadingLabel.remove();
        data$.next(users.slice(0, 15));
    }, 1500);

    return result;
};

export const Forbidden = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 10)))
        .withHeight(of(400));

    const columns = grid.withColumns();
    columns.addNumberColumn('id').withHeader('ID').withWidth('60px');
    columns.addTextColumn('name').withHeader('Name');
    columns.addTextColumn('email').withHeader('Email');
    columns.addEnumColumn('role').withHeader('Role');

    const toolbar = grid.withToolbar();
    toolbar.withPrimaryButton()
        .withCaption(of('Add User'))
        .withEnabled(of(false));
    toolbar.addSecondaryButton()
        .withCaption(of('Export'))
        .withEnabled(of(false));

    const banner = new LabelBuilder()
        .withCaption(of('You have view-only access to this data'))
        .withClass(of('p-3 bg-surface-variant rounded text-on-surface-variant text-sm'))
        .build();

    const container = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.SMALL)
        .withClass(of('p-4'));

    container.addSlot().withContent({ build: () => banner });
    container.addSlot().withContent(grid);

    return container.build();
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

export const ColumnVisibility = () => {
    const columns: { field: string; label: string }[] = [
        { field: 'id', label: 'ID' },
        { field: 'name', label: 'Name' },
        { field: 'email', label: 'Email' },
        { field: 'role', label: 'Role' },
        { field: 'status', label: 'Status' },
        { field: 'department', label: 'Department' },
        { field: 'location', label: 'Location' },
        { field: 'startDate', label: 'Start Date' },
    ];

    const visibilitySubjects: Record<string, BehaviorSubject<boolean>> = {};
    columns.forEach(c => {
        visibilitySubjects[c.field] = new BehaviorSubject<boolean>(true);
    });

    const visibleCount$ = combineLatest(
        columns.map(c => visibilitySubjects[c.field])
    ).pipe(
        map(states => states.filter(Boolean).length)
    );

    const baseUsers = generateUsers(15);
    const STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING'] as const;
    const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'Support'] as const;
    const LOCATIONS = ['New York', 'London', 'Tokyo', 'Berlin'] as const;
    const users = baseUsers.map((u, i) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: STATUSES[i % STATUSES.length],
        department: DEPARTMENTS[i % DEPARTMENTS.length],
        location: LOCATIONS[i % LOCATIONS.length],
        startDate: new Date(2020 + Math.floor(i / 12), i % 12, (i % 28) + 1),
    }));

    const grid = new GridBuilder<any>()
        .withItems(of(users))
        .withHeight(of(400));

    const gridColumns = grid.withColumns();
    gridColumns.addNumberColumn('id').withHeader('ID').withWidth('60px')
        .withVisible(visibilitySubjects.id);
    gridColumns.addTextColumn('name').withHeader('Name')
        .withVisible(visibilitySubjects.name);
    gridColumns.addTextColumn('email').withHeader('Email')
        .withVisible(visibilitySubjects.email);
    gridColumns.addEnumColumn('role').withHeader('Role')
        .withVisible(visibilitySubjects.role);
    gridColumns.addTextColumn('status').withHeader('Status')
        .withVisible(visibilitySubjects.status);
    gridColumns.addTextColumn('department').withHeader('Department')
        .withVisible(visibilitySubjects.department);
    gridColumns.addTextColumn('location').withHeader('Location')
        .withVisible(visibilitySubjects.location);
    gridColumns.addDateColumn('startDate').withHeader('Start Date')
        .withVisible(visibilitySubjects.startDate);

    const checkboxes = columns.map(c => {
        const checkbox = new CheckboxBuilder()
            .withCaption(of(c.label))
            .withValue(visibilitySubjects[c.field]);
        return checkbox.build();
    });

    const label = new LabelBuilder()
        .withCaption(visibleCount$.pipe(
            map(n => `Visible columns: ${n}/${columns.length}`)
        ))
        .withClass(of('text-sm font-medium text-on-surface-variant mb-4'))
        .build();

    const container = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE)
        .withClass(of('p-4'));
    container.addSlot().withContent({ build: () => createControlStrip(checkboxes) });
    container.addSlot().withContent({ build: () => label });
    container.addSlot().withContent(grid);

    return container.build();
};

export const ServerPagination = () => {
    const allUsers = generateUsers(200);
    const pageSize = 25;
    const totalPages = Math.ceil(allUsers.length / pageSize);

    const currentPage$ = new BehaviorSubject(1);

    const pageData$ = currentPage$.pipe(
        map(page => {
            const start = (page - 1) * pageSize;
            return allUsers.slice(start, start + pageSize);
        })
    );

    const rangeLabel$ = currentPage$.pipe(
        map(page => {
            const start = (page - 1) * pageSize + 1;
            const end = Math.min(page * pageSize, allUsers.length);
            return `Showing ${start}–${end} of ${allUsers.length}`;
        })
    );

    const canPrev$ = currentPage$.pipe(map(p => p > 1));
    const canNext$ = currentPage$.pipe(map(p => p < totalPages));

    const prevBtn = createButton('← Previous', () => currentPage$.next(currentPage$.value - 1))
        .withEnabled(canPrev$)
        .build();
    const nextBtn = createButton('Next →', () => currentPage$.next(currentPage$.value + 1))
        .withEnabled(canNext$)
        .build();

    const grid = new GridBuilder<User>()
        .withItems(pageData$)
        .withHeight(of(400));

    const columns = grid.withColumns();
    columns.addNumberColumn('id').withHeader('ID').withWidth('60px');
    columns.addTextColumn('name').withHeader('Name');
    columns.addTextColumn('email').withHeader('Email');
    columns.addEnumColumn('role').withHeader('Role');
    columns.addBooleanColumn('active').withHeader('Active');
    columns.addMoneyColumn('balance').withHeader('Balance');

    const label = new LabelBuilder()
        .withCaption(rangeLabel$)
        .withClass(of('text-sm font-medium text-on-surface-variant mb-4'))
        .build();

    const container = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE)
        .withClass(of('p-4'));
    container.addSlot().withContent({ build: () => createControlStrip([prevBtn, nextBtn]) });
    container.addSlot().withContent({ build: () => label });
    container.addSlot().withContent(grid);

    return container.build();
};

export const Editable = () => {
    const { element: actionLog, log } = createActionLog();

    // Deep-clone snapshots for old → new change detection
    const snapshots = new Map<number, User>();
    users.slice(0, 15).forEach(u => snapshots.set(u.id, structuredClone(u)));

    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 15)))
        .withHeight(of(500))
        .asEditable((item: User) => {
            const snapshot = snapshots.get(item.id);
            if (!snapshot) return;

            const changes: string[] = [];

            if (snapshot.name !== item.name) {
                changes.push(`Name changed: <s>${snapshot.name}</s> → <b>${item.name}</b>`);
            }
            if (snapshot.email !== item.email) {
                changes.push(`Email changed: <s>${snapshot.email}</s> → <b>${item.email}</b>`);
            }
            if (snapshot.lastLogin.valueOf() !== item.lastLogin.valueOf()) {
                const oldDate = snapshot.lastLogin.toLocaleDateString();
                const newDate = item.lastLogin.toLocaleDateString();
                changes.push(`Last Login changed: <s>${oldDate}</s> → <b>${newDate}</b>`);
            }
            if (snapshot.active !== item.active) {
                changes.push(`Active changed: <s>${snapshot.active}</s> → <b>${item.active}</b>`);
            }
            if (snapshot.progress !== item.progress) {
                const oldPct = `${Math.round(snapshot.progress * 100)}%`;
                const newPct = `${Math.round(item.progress * 100)}%`;
                changes.push(`Progress changed: <s>${oldPct}</s> → <b>${newPct}</b>`);
            }
            if (JSON.stringify(snapshot.balance) !== JSON.stringify(item.balance)) {
                const oldBal = `${snapshot.balance.amount} ${snapshot.balance.currencyId}`;
                const newBal = `${item.balance.amount} ${item.balance.currencyId}`;
                changes.push(`Balance changed: <s>${oldBal}</s> → <b>${newBal}</b>`);
            }

            // Update snapshot after detecting changes
            snapshots.set(item.id, structuredClone(item));

            changes.forEach(change => log(change));
        });

    const columns = grid.withColumns();
    columns.addNumberColumn('id').withHeader('ID').withWidth('60px').withAlign('center');
    columns.addTextColumn('name').withHeader('Name').asEditable();
    columns.addTextColumn('email').withHeader('Email').asEditable();
    columns.addDateColumn('lastLogin').withHeader('Last Login').asEditable();
    columns.addBooleanColumn('active').withHeader('Active').withAlign('center').asEditable();
    columns.addPercentageColumn('progress').withHeader('Progress').asEditable();
    columns.addMoneyColumn('balance')
        .withHeader('Balance')
        .asEditable()
        .withPrecision(2)
        .withCurrencies(['USD', 'EUR', 'GBP', 'JPY']);
    columns.addEnumColumn('role').withHeader('Role');

    const container = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE)
        .withClass(of('p-4'));
    container.addSlot().withContent(grid);
    container.addSlot().withContent({ build: () => actionLog }).withSize(SlotSize.FULL);

    return container.build();
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
    container.className = 'flex-1 p-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center';

    const gridElement = grid.build();
    gridElement.style.width = '100%';
    container.appendChild(gridElement);

    return container;
};

export const WithActions = () => {
    const { element: actionLog, log } = createActionLog();

    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 15)))
        .withHeight(of(400));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name');
    columns.addTextColumn('email').withHeader('Email');

    const editClick = (user: User) => log(`Editing ${user.name}`);
    const deleteClick = (user: User) => log(`Deleting ${user.name}`);

    const actions = grid.withActions();
    actions.addAction(Icons.EDIT, 'Edit', editClick);
    actions.addAction(Icons.DELETE, 'Delete', deleteClick);

    const container = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE)
        .withClass(of('p-4'));
    container.addSlot().withContent(grid);
    container.addSlot().withContent({ build: () => actionLog }).withSize(SlotSize.FULL);

    return container.build();
};

export const WithToolbar = () => {
    const { element: actionLog, log } = createActionLog();

    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 15)))
        .withHeight(of(400));

    const toolbar = grid.withToolbar();
    const addClick = new Subject<void>();
    addClick.subscribe(() => log('Add User Clicked'));

    toolbar.withPrimaryButton().withCaption(of('Add User')).withClick(() => addClick.next());
    toolbar.addSecondaryButton().withCaption(of('Export'));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name');
    columns.addTextColumn('email').withHeader('Email');

    const container = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE)
        .withClass(of('p-4'));
    container.addSlot().withContent(grid);
    container.addSlot().withContent({ build: () => actionLog }).withSize(SlotSize.FULL);

    return container.build();
};

export const FullCoverage = () => {
    const { element: actionLog, log } = createActionLog();
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
        .withClick((item) => log(`Clicked row ${item.id}`))
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
    columns.addTrendColumn('trend')
        .withHeader('Trend')
        .withWidth('180px');

    const editClick = (item: FullCoverageItem) => log(`Editing ${item.name}`);
    const deleteClick = (item: FullCoverageItem) => log(`Deleting ${item.name}`);
    const viewClick = (item: FullCoverageItem) => log(`Viewing ${item.name}`);

    const actions = grid.withActions();
    actions.addAction(Icons.EDIT, 'Edit', editClick);
    actions.addAction(Icons.DELETE, 'Delete', deleteClick);
    actions.addAction(Icons.EYE_OPEN, 'View', viewClick);

    const container = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE)
        .withClass(of('p-4'));
    container.addSlot().withContent(grid);
    container.addSlot().withContent({ build: () => actionLog }).withSize(SlotSize.FULL);

    return container.build();
};

export const TrendColumn = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 15)))
        .withHeight(of(500));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name');
    columns.addEnumColumn('role').withHeader('Role');
    columns.addTrendColumn('trend')
        .withHeader('Trend')
        .withWidth('190px')
        .asSortable();

    return grid.build();
};

export const TrendColumnPeriod = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 12)))
        .withHeight(of(400));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name');
    columns.addTrendColumn('trend')
        .withHeader('Trend (vs Last Year)')
        .withPeriod('vs last year')
        .withWidth('200px');

    return grid.build();
};

export const TrendColumnProvider = () => {
    const grid = new GridBuilder<User>()
        .withItems(of(users.slice(0, 12)))
        .withHeight(of(400));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name');
    columns.addTrendColumn('progress')
        .withHeader('Progress Trend')
        .withTrendProvider((user) => ({
            value: (user.progress - 0.5) * 20,
            period: 'vs target',
        }))
        .withWidth('190px');

    return grid.build();
};
