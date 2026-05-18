import { BehaviorSubject, of, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { GridBuilder } from '@tdq/ora-components';
import { LayoutBuilder, LayoutGap } from '@tdq/ora-components';
import { DialogBuilder, DialogSize } from '@tdq/ora-components';
import { TextFieldBuilder, TextFieldStyle } from '@tdq/ora-components';
import { ButtonBuilder, ButtonStyle } from '@tdq/ora-components';
import { LabelBuilder } from '@tdq/ora-components';
import { Icons, registerDestroy } from '@tdq/ora-components';
import { CheckboxBuilder } from '@tdq/ora-components';
import { createActionLog } from './story-helpers/action-log';
import { generateProducts } from './story-helpers/data-generators';
import type { Product } from './story-helpers/data-generators';

export default {
    title: 'Examples/ConfirmationPatterns',
    tags: ['autodocs', 'enterprise', 'reactive'],
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PendingProduct = Product & { _pending?: boolean };

// ---------------------------------------------------------------------------
// Story 1 — SoftDelete
// ---------------------------------------------------------------------------

export const SoftDelete = () => {
    const { element: actionLog, log } = createActionLog();

    // ── State ──────────────────────────────────────────────────────────

    const products$ = new BehaviorSubject<PendingProduct[]>(
        generateProducts(10).map(p => ({ ...p, _pending: false }))
    );

    // Active countdown timers: productId → remaining seconds + handles
    interface CountdownEntry {
        remaining: number;
        intervalId: ReturnType<typeof setInterval>;
        timeoutId: ReturnType<typeof setTimeout>;
    }
    const countdownMap = new Map<number, CountdownEntry>();
    const bannerUpdate$ = new Subject<void>();

    // ── Soft-delete actions ────────────────────────────────────────────

    const markPending = (product: PendingProduct) => {
        if (product._pending) return;
        products$.next(
            products$.value.map(p =>
                p.id === product.id ? { ...p, _pending: true } : p
            )
        );
        log(`"${product.name}" marked for deletion`);

        let remaining = 5;
        const intervalId = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                const entry = countdownMap.get(product.id);
                if (entry) entry.remaining = remaining;
                bannerUpdate$.next();
            } else {
                clearInterval(intervalId);
            }
        }, 1000);

        const timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            countdownMap.delete(product.id);
            products$.next(products$.value.filter(p => p.id !== product.id));
            bannerUpdate$.next();
            log(`"${product.name}" auto-deleted after timeout`);
        }, 5000);

        countdownMap.set(product.id, { remaining, intervalId, timeoutId });
        bannerUpdate$.next();
    };

    const undoPending = (productId: number) => {
        const entry = countdownMap.get(productId);
        if (!entry) return;
        clearInterval(entry.intervalId);
        clearTimeout(entry.timeoutId);
        countdownMap.delete(productId);

        const product = products$.value.find(p => p.id === productId);
        products$.next(
            products$.value.map(p =>
                p.id === productId ? { ...p, _pending: false } : p
            )
        );
        bannerUpdate$.next();
        log(`Deletion of "${product?.name}" undone`);
    };

    // ── Banner ─────────────────────────────────────────────────────────

    const bannerEl = document.createElement('div');
    bannerEl.className =
        'flex flex-col gap-2 p-3 bg-error-container/20 rounded-lg text-sm';
    bannerEl.style.display = 'none';

    const renderBanner = () => {
        bannerEl.innerHTML = '';
        if (countdownMap.size === 0) {
            bannerEl.style.display = 'none';
            return;
        }
        bannerEl.style.display = 'flex';

        countdownMap.forEach((entry, id) => {
            const product = products$.value.find(p => p.id === id);
            if (!product) return;

            const row = document.createElement('div');
            row.className = 'flex items-center gap-3';

            const text = document.createElement('span');
            text.textContent = `"${product.name}" will be deleted in ${entry.remaining}s`;

            const undoBtn = new ButtonBuilder()
                .withCaption(of('Undo'))
                .withStyle(of(ButtonStyle.TEXT))
                .withClick(() => undoPending(id))
                .build();

            row.appendChild(text);
            row.appendChild(undoBtn);
            bannerEl.appendChild(row);
        });
    };

    const bannerSub = bannerUpdate$.subscribe(() => renderBanner());

    // ── Grid ───────────────────────────────────────────────────────────

    const grid = new GridBuilder<PendingProduct>()
        .withItems(products$)
        .withHeight(of(400));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name').withWidth('200px')
        .withClass(p => p._pending ? 'bg-red-50 line-through text-red-500 opacity-60' : '');
    columns.addTextColumn('category').withHeader('Category').withWidth('150px')
        .withClass(p => p._pending ? 'bg-red-50 line-through text-red-500 opacity-60' : '');
    columns.addMoneyColumn('price').withHeader('Price').withWidth('100px')
        .withClass(p => p._pending ? 'bg-red-50 line-through text-red-500 opacity-60' : '');
    columns.addNumberColumn('stock').withHeader('Stock').withWidth('100px')
        .withClass(p => p._pending ? 'bg-red-50 line-through text-red-500 opacity-60' : '');

    const actions = grid.withActions();
    actions.addAction(Icons.DELETE, 'Delete', markPending)
        .withEnable(p => !p._pending);

    // ── Layout ─────────────────────────────────────────────────────────

    const container = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE)
        .withClass(of('p-4'));

    container.addSlot().withContent({ build: () => bannerEl });
    container.addSlot().withContent(grid);
    container.addSlot().withContent({ build: () => actionLog });

    const containerEl = container.build();

    registerDestroy(containerEl, () => {
        bannerSub.unsubscribe();
        bannerUpdate$.complete();
        // Clear all active countdowns
        countdownMap.forEach(entry => {
            clearInterval(entry.intervalId);
            clearTimeout(entry.timeoutId);
        });
        countdownMap.clear();
    });

    return containerEl;
};

// ---------------------------------------------------------------------------
// Story 2 — HardDelete
// ---------------------------------------------------------------------------

export const HardDelete = () => {
    const { element: actionLog, log } = createActionLog();

    // ── State ──────────────────────────────────────────────────────────

    const products$ = new BehaviorSubject<Product[]>(generateProducts(10));

    // ── Delete with confirmation dialog ────────────────────────────────

    const confirmDelete = (product: Product) => {
        const confirmName$ = new BehaviorSubject<string>('');
        const isMatch$ = confirmName$.pipe(
            map(v => v.trim() === product.name)
        );

        const textField = new TextFieldBuilder()
            .withPlaceholder(of('Type the product name to confirm'))
            .withValue(confirmName$)
            .withStyle(of(TextFieldStyle.OUTLINED))
            .build();

        const contentLayout = new LayoutBuilder()
            .asVertical()
            .withGap(LayoutGap.SMALL);
        contentLayout.addSlot().withContent({ build: () => textField });

        const dialog = new DialogBuilder()
            .withCaption(of(`Delete ${product.name}?`))
            .withDescription(of(
                'This action cannot be undone. Type the product name to confirm.'
            ))
            .withContent(contentLayout)
            .withSize(DialogSize.SMALL);

        const cancelClick$ = new Subject<void>();
        const confirmClick$ = new Subject<void>();

        cancelClick$.subscribe(() => dialog.close());
        confirmClick$.subscribe(() => {
            products$.next(products$.value.filter(p => p.id !== product.id));
            log(`Deleted "${product.name}"`);
            dialog.close();
        });

        const toolbar = dialog.withToolbar();
        toolbar.addSecondaryButton()
            .withCaption(of('Cancel'))
            .withClick(() => cancelClick$.next());

        toolbar.withPrimaryButton()
            .withCaption(of('Delete'))
            .withEnabled(isMatch$)
            .withClick(() => confirmClick$.next());

        dialog.show();
    };

    // ── Grid ───────────────────────────────────────────────────────────

    const grid = new GridBuilder<Product>()
        .withItems(products$)
        .withHeight(of(400));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name').withWidth('200px');
    columns.addTextColumn('category').withHeader('Category').withWidth('150px');
    columns.addMoneyColumn('price').withHeader('Price').withWidth('100px');
    columns.addNumberColumn('stock').withHeader('Stock').withWidth('100px');

    const actions = grid.withActions();
    actions.addAction(Icons.DELETE, 'Delete', confirmDelete);

    // ── Layout ─────────────────────────────────────────────────────────

    const container = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE)
        .withClass(of('p-4'));

    container.addSlot().withContent(grid);
    container.addSlot().withContent({ build: () => actionLog });

    return container.build();
};

// ---------------------------------------------------------------------------
// Story 3 — BulkAction
// ---------------------------------------------------------------------------

export const BulkAction = () => {
    const { element: actionLog, log } = createActionLog();

    // ── State ──────────────────────────────────────────────────────────

    const products = generateProducts(15);
    const products$ = new BehaviorSubject<Product[]>(products);
    const selectedIds$ = new BehaviorSubject<Set<number>>(new Set());
    const selectionCount$ = selectedIds$.pipe(map(s => s.size));
    const hasSelection$ = selectedIds$.pipe(map(s => s.size > 0));

    // ── Checkbox Management ────────────────────────────────────────────

    interface CheckboxEntry {
        subject: BehaviorSubject<boolean>;
        element: HTMLElement;
    }
    const checkboxMap = new Map<number, CheckboxEntry>();
    const checkboxSubscriptions: { sub: ReturnType<typeof Subject.prototype.subscribe>; subject: BehaviorSubject<boolean> }[] = [];

    products.forEach(p => {
        const subject = new BehaviorSubject<boolean>(false);
        const sub = subject.subscribe(checked => {
            const ids = selectedIds$.value;
            const updated = new Set(ids);
            if (checked) {
                updated.add(p.id);
            } else {
                updated.delete(p.id);
            }
            selectedIds$.next(updated);
        });
        checkboxSubscriptions.push({ sub, subject });

        const checkbox = new CheckboxBuilder()
            .withValue(subject)
            .build();

        checkboxMap.set(p.id, { subject, element: checkbox });
    });

    // ── Bulk Actions ───────────────────────────────────────────────────

    const openBulkDeleteDialog = () => {
        const ids = selectedIds$.value;
        const selected = products$.value.filter(p => ids.has(p.id));
        if (selected.length === 0) return;

        const listLayout = new LayoutBuilder()
            .asVertical()
            .withGap(LayoutGap.SMALL)
            .withClass(of('pl-2'));

        selected.forEach(p => {
            const label = new LabelBuilder()
                .withCaption(of(`• ${p.name}`))
                .withClass(of('text-sm'))
                .build();
            listLayout.addSlot().withContent({ build: () => label });
        });

        const dialog = new DialogBuilder()
            .withCaption(of(`Delete ${selected.length} items?`))
            .withContent(listLayout)
            .withSize(DialogSize.SMALL);

        const cancelClick$ = new Subject<void>();
        const confirmClick$ = new Subject<void>();

        cancelClick$.subscribe(() => dialog.close());
        confirmClick$.subscribe(() => {
            const selectedIds = selectedIds$.value;
            products$.next(products$.value.filter(p => !selectedIds.has(p.id)));

            // Reset checkboxes
            selectedIds.forEach(id => {
                const entry = checkboxMap.get(id);
                if (entry) entry.subject.next(false);
            });
            selectedIds$.next(new Set());

            log(`Deleted ${selected.length} items`);
            dialog.close();
        });

        const toolbar = dialog.withToolbar();
        toolbar.addSecondaryButton()
            .withCaption(of('Cancel'))
            .withClick(() => cancelClick$.next());

        toolbar.withPrimaryButton()
            .withCaption(of('Delete All'))
            .withClick(() => confirmClick$.next());

        dialog.show();
    };

    // ── Toolbar ────────────────────────────────────────────────────────

    const selectionLabel = new LabelBuilder()
        .withCaption(selectionCount$.pipe(
            map(n => `${n} items selected`)
        ))
        .withClass(of('text-sm font-medium text-on-surface-variant'))
        .build();

    // Archive button (hidden when 0 selected)
    const archiveBtn = new ButtonBuilder()
        .withCaption(of('Archive'))
        .withStyle(of(ButtonStyle.TONAL))
        .withClick(() => {
            const count = selectedIds$.value.size;
            log(`Archived ${count} items`);
        })
        .build();

    const archiveBtnWrapper = document.createElement('span');

    // Delete button (hidden when 0 selected)
    const deleteBtn = new ButtonBuilder()
        .withCaption(of('Delete'))
        .withStyle(of(ButtonStyle.TONAL))
        .withClick(() => openBulkDeleteDialog())
        .build();

    const deleteBtnWrapper = document.createElement('span');

    // Show/hide wrappers based on selection
    const visibilitySub = hasSelection$.subscribe(has => {
        archiveBtnWrapper.style.display = has ? '' : 'none';
        deleteBtnWrapper.style.display = has ? '' : 'none';
    });

    archiveBtnWrapper.appendChild(archiveBtn);
    deleteBtnWrapper.appendChild(deleteBtn);

    const toolbar = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.MEDIUM)
        .withClass(of('p-3 bg-surface-container-low rounded-lg items-center'));

    toolbar.addSlot().withContent({ build: () => selectionLabel });
    toolbar.addSlot().withContent({ build: () => archiveBtnWrapper });
    toolbar.addSlot().withContent({ build: () => deleteBtnWrapper });

    // ── Grid ───────────────────────────────────────────────────────────

    const grid = new GridBuilder<Product>()
        .withItems(products$)
        .withHeight(of(400));

    const columns = grid.withColumns();

    // Custom checkbox column
    columns.addCustomColumn()
        .withHeader('')
        .withWidth('50px')
        .withRenderer((product) => {
            const entry = checkboxMap.get(product.id);
            return entry ? entry.element : document.createElement('div');
        });

    columns.addTextColumn('name').withHeader('Name').withWidth('200px');
    columns.addTextColumn('category').withHeader('Category').withWidth('150px');
    columns.addMoneyColumn('price').withHeader('Price').withWidth('100px');
    columns.addNumberColumn('stock').withHeader('Stock').withWidth('100px');

    // ── Layout ─────────────────────────────────────────────────────────

    const container = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE)
        .withClass(of('p-4'));

    container.addSlot().withContent(toolbar);
    container.addSlot().withContent(grid);
    container.addSlot().withContent({ build: () => actionLog });

    const containerEl = container.build();

    registerDestroy(containerEl, () => {
        visibilitySub.unsubscribe();
        checkboxSubscriptions.forEach(({ sub, subject }) => {
            sub.unsubscribe();
            subject.complete();
        });
    });

    return containerEl;
};
