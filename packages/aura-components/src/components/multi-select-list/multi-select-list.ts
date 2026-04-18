import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { skip, startWith } from 'rxjs/operators';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ComponentBuilder } from '../../core/component-builder';
import { registerDestroy } from '../../core/destroyable-element';
import { Icons } from '../../core/icons';
import { MultiSelectListStyle } from './types';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

function getRowBg(isSelected: boolean, isTonal: boolean): string {
    if (isTonal && isSelected) return 'bg-secondary-container';
    if (!isTonal && isSelected) return 'bg-primary-container';
    return 'hover:bg-on-surface/8';
}

let uniqueCounter = 0;

export class MultiSelectListBuilder<ITEM> implements ComponentBuilder {
    private caption$?: Observable<string>;
    private enabled$?: Observable<boolean>;
    private style$: Observable<MultiSelectListStyle> = of(MultiSelectListStyle.TONAL);
    private className$?: Observable<string>;
    private items$: Observable<ITEM[]> = of([]);
    private itemCaptionProvider: (item: ITEM) => string = (item) => String(item);
    private itemIdProvider: (item: ITEM) => string | number = (item) => String(item);
    private value$: BehaviorSubject<ITEM[]> = new BehaviorSubject<ITEM[]>([]);
    private height$?: Observable<number>;
    private error$?: Observable<string>;
    private isGlass: boolean = false;
    private showSelectAll: boolean = true;

    withCaption(caption: Observable<string>): this {
        this.caption$ = caption;
        return this;
    }

    withEnabled(enabled: Observable<boolean>): this {
        this.enabled$ = enabled;
        return this;
    }

    withStyle(style: Observable<MultiSelectListStyle>): this {
        this.style$ = style;
        return this;
    }

    withClass(className: Observable<string>): this {
        this.className$ = className;
        return this;
    }

    withItems(items: Observable<ITEM[]>): this {
        this.items$ = items;
        return this;
    }

    withItemCaptionProvider(provider: (item: ITEM) => string): this {
        this.itemCaptionProvider = provider;
        return this;
    }

    withItemIdProvider(provider: (item: ITEM) => string | number): this {
        this.itemIdProvider = provider;
        return this;
    }

    withValue(value: BehaviorSubject<ITEM[]>): this {
        this.value$ = value;
        return this;
    }

    withHeight(height: Observable<number>): this {
        this.height$ = height;
        return this;
    }

    withError(error: Observable<string>): this {
        this.error$ = error;
        return this;
    }

    asGlass(): this {
        this.isGlass = true;
        return this;
    }

    withSelectAll(show: boolean): this {
        this.showSelectAll = show;
        return this;
    }

    build(): HTMLElement {
        const uid = `msl-${++uniqueCounter}`;
        const container = document.createElement('div');

        const containerSub = combineLatest([
            this.className$ ? this.className$.pipe(startWith('')) : of(''),
            this.height$ ? this.height$.pipe(startWith(undefined as number | undefined)) : of(undefined as number | undefined),
            this.enabled$ ? this.enabled$.pipe(startWith(true)) : of(true),
        ]).subscribe(([className, height, enabled]) => {
            container.className = cn(
                'flex flex-col gap-px-4',
                !enabled && 'opacity-50 pointer-events-none',
                className
            );
            container.style.height = height ? `${height}px` : '';
        });
        registerDestroy(container, () => containerSub.unsubscribe());

        let captionId: string | undefined;
        if (this.caption$) {
            captionId = `${uid}-caption`;
            const label = document.createElement('span');
            label.id = captionId;
            label.className = 'text-label-medium text-on-surface-variant ml-px-16';
            const labelSub = this.caption$.subscribe(caption => {
                label.textContent = caption;
            });
            registerDestroy(container, () => labelSub.unsubscribe());
            container.appendChild(label);
        }

        const panel = document.createElement('div');
        const errorStream$ = this.error$ ? this.error$.pipe(startWith(null as string | null)) : of(null as string | null);
        const panelStyleSub = combineLatest([
            errorStream$,
            this.style$,
        ]).subscribe(([error, style]) => {
            const isBorderless = style === MultiSelectListStyle.BORDERLESS && !this.isGlass;
            panel.className = cn(
                'overflow-hidden transition-all flex-1 relative flex flex-col',
                !this.isGlass && 'bg-surface text-on-surface',
                !isBorderless && !this.isGlass && 'rounded-large border',
                !isBorderless && !this.isGlass && !error && 'border-outline',
                this.isGlass && 'glass-effect',
                !!error && !isBorderless && 'border-error',
                !!error && isBorderless && 'rounded-large border border-error',
            );
        });
        registerDestroy(container, () => panelStyleSub.unsubscribe());
        container.appendChild(panel);

        // Header row
        let headerInput: HTMLInputElement | undefined;
        let headerRow: HTMLDivElement | undefined;

        if (this.showSelectAll) {
            headerRow = document.createElement('div');
            headerRow.className = 'flex items-center px-px-16 py-px-8 border-b border-outline';

            headerInput = document.createElement('input');
            headerInput.type = 'checkbox';
            headerInput.className = 'sr-only peer';
            headerInput.id = `${uid}-select-all`;
            headerInput.setAttribute('aria-label', 'Select all');

            const headerLabel = document.createElement('label');
            headerLabel.className = 'flex items-center gap-px-8 cursor-pointer select-none';

            const headerCheckContainer = document.createElement('div');
            headerCheckContainer.className = 'relative flex items-center justify-center w-[18px] h-[18px]';

            const headerBox = document.createElement('div');
            headerBox.className = cn(
                'w-full h-full rounded-small transition-all relative',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2',
                'peer-checked:bg-primary peer-checked:border-primary',
                this.isGlass ? 'glass-effect' : 'border-2 border-outline'
            );

            const headerIconContainer = document.createElement('div');
            headerIconContainer.className = 'absolute inset-0 w-full h-full text-on-primary scale-0 transition-transform peer-checked:scale-100 flex items-center justify-center';
            headerIconContainer.innerHTML = Icons.CHECKMARK;

            const headerStateLayer = document.createElement('div');
            headerStateLayer.className = cn(
                'absolute -inset-px-8 rounded-full bg-primary opacity-0',
                'group-hover:opacity-[var(--md-sys-state-hover-opacity,0.08)]',
                'peer-active:opacity-[var(--md-sys-state-pressed-opacity,0.12)]'
            );

            headerCheckContainer.appendChild(headerInput);
            headerCheckContainer.appendChild(headerBox);
            headerCheckContainer.appendChild(headerIconContainer);
            headerCheckContainer.appendChild(headerStateLayer);

            const headerCaption = document.createElement('span');
            headerCaption.className = 'md-label-large';
            headerCaption.textContent = 'Select all';

            headerLabel.appendChild(headerCheckContainer);
            headerLabel.appendChild(headerCaption);
            headerRow.appendChild(headerLabel);
            panel.appendChild(headerRow);
        }

        // Items list
        const list = document.createElement('ul');
        list.role = 'listbox';
        list.setAttribute('aria-multiselectable', 'true');
        list.className = 'w-full h-full overflow-y-auto py-0';
        if (captionId) {
            list.setAttribute('aria-labelledby', captionId);
        }
        panel.appendChild(list);

        // Reactive rendering
        let currentItems: ITEM[] = [];
        let currentStyle: MultiSelectListStyle = MultiSelectListStyle.TONAL;
        const itemElements = new Map<string | number, { input: HTMLInputElement; li: HTMLLIElement; label: HTMLElement }>();

        const updateHeaderState = (selectedIds: Set<string | number>, items: ITEM[]) => {
            if (!headerInput) return;
            const enabledCount = items.length;
            const selectedCount = items.filter(item => selectedIds.has(this.itemIdProvider(item))).length;

            if (selectedCount === 0) {
                headerInput.checked = false;
                headerInput.indeterminate = false;
            } else if (selectedCount === enabledCount) {
                headerInput.checked = true;
                headerInput.indeterminate = false;
            } else {
                headerInput.checked = false;
                headerInput.indeterminate = true;
            }
        };

        // Full DOM rebuild only when items or style change
        const itemsRenderSub = combineLatest([this.items$, this.style$]).subscribe(([items, style]) => {
            currentItems = items;
            currentStyle = style;
            itemElements.clear();
            list.innerHTML = '';

            const isTonal = (style === MultiSelectListStyle.TONAL || style === MultiSelectListStyle.BORDERLESS) && !this.isGlass;
            // Must read value$.getValue() here to capture selections made before items$ emitted
            const selectedIds = new Set(this.value$.getValue().map(i => this.itemIdProvider(i)));

            items.forEach(item => {
                const itemId = this.itemIdProvider(item);
                const isSelected = selectedIds.has(itemId);
                const caption = this.itemCaptionProvider(item);

                const li = document.createElement('li');
                li.role = 'option';
                li.setAttribute('aria-selected', String(isSelected));

                const itemLabel = document.createElement('label');
                itemLabel.className = cn(
                    'flex items-center gap-px-8 px-px-16 py-px-12 cursor-pointer select-none',
                    'transition-colors relative overflow-hidden group',
                    getRowBg(isSelected, isTonal)
                );

                const itemCheckContainer = document.createElement('div');
                itemCheckContainer.className = 'relative flex items-center justify-center w-[18px] h-[18px] flex-shrink-0';

                const itemInput = document.createElement('input');
                itemInput.type = 'checkbox';
                itemInput.className = 'sr-only peer';
                itemInput.checked = isSelected;

                const itemBox = document.createElement('div');
                itemBox.className = cn(
                    'w-full h-full rounded-small transition-all relative',
                    'peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2',
                    'peer-checked:bg-primary peer-checked:border-primary',
                    'peer-disabled:opacity-38 peer-disabled:cursor-not-allowed',
                    this.isGlass ? 'glass-effect' : 'border-2 border-outline'
                );

                const itemIconContainer = document.createElement('div');
                itemIconContainer.className = 'absolute inset-0 w-full h-full text-on-primary scale-0 transition-transform peer-checked:scale-100 flex items-center justify-center';
                itemIconContainer.innerHTML = Icons.CHECKMARK;

                const itemStateLayer = document.createElement('div');
                itemStateLayer.className = cn(
                    'absolute -inset-px-8 rounded-full bg-primary opacity-0',
                    'group-hover:opacity-[var(--md-sys-state-hover-opacity,0.08)]',
                    'peer-active:opacity-[var(--md-sys-state-pressed-opacity,0.12)]'
                );

                itemCheckContainer.appendChild(itemInput);
                itemCheckContainer.appendChild(itemBox);
                itemCheckContainer.appendChild(itemIconContainer);
                itemCheckContainer.appendChild(itemStateLayer);

                const itemCaption = document.createElement('span');
                itemCaption.className = cn(
                    'md-label-large',
                    !this.isGlass && 'text-on-surface'
                );
                itemCaption.textContent = caption;

                itemInput.addEventListener('change', () => {
                    const latestSelectedItems = this.value$.getValue();
                    const latestSelectedIds = new Set(latestSelectedItems.map((i: ITEM) => this.itemIdProvider(i)));

                    if (itemInput.checked) {
                        latestSelectedIds.add(itemId);
                    } else {
                        latestSelectedIds.delete(itemId);
                    }

                    const newSelection = currentItems.filter(
                        i => latestSelectedIds.has(this.itemIdProvider(i))
                    );
                    this.value$.next(newSelection);
                });

                itemLabel.appendChild(itemCheckContainer);
                itemLabel.appendChild(itemCaption);
                li.appendChild(itemLabel);
                list.appendChild(li);

                itemElements.set(itemId, { input: itemInput, li, label: itemLabel });
            });

            updateHeaderState(selectedIds, items);
        });
        registerDestroy(container, () => itemsRenderSub.unsubscribe());

        // Selection-only patch — no DOM rebuild
        const selectionSub = this.value$.pipe(skip(1)).subscribe(selectedItems => {
            const selectedIds = new Set(selectedItems.map(i => this.itemIdProvider(i)));
            const isTonal = (currentStyle === MultiSelectListStyle.TONAL || currentStyle === MultiSelectListStyle.BORDERLESS) && !this.isGlass;

            itemElements.forEach(({ input, li, label }, itemId) => {
                const isSelected = selectedIds.has(itemId);
                input.checked = isSelected;
                li.setAttribute('aria-selected', String(isSelected));
                label.className = cn(
                    'flex items-center gap-px-8 px-px-16 py-px-12 cursor-pointer select-none',
                    'transition-colors relative overflow-hidden group',
                    getRowBg(isSelected, isTonal)
                );
            });

            updateHeaderState(selectedIds, currentItems);
        });
        registerDestroy(container, () => selectionSub.unsubscribe());

        if (this.showSelectAll && headerInput) {
            headerInput.addEventListener('change', () => {
                if (headerInput!.checked) {
                    // Select all enabled (all items in this implementation)
                    this.value$.next([...currentItems]);
                } else {
                    // Deselect all — keep none
                    this.value$.next([]);
                }

                // Reset indeterminate after programmatic change
                headerInput!.indeterminate = false;
            });
        }

        if (this.error$) {
            const errorMsg = document.createElement('div');
            errorMsg.className = 'text-label-small text-error ml-px-16 mt-px-4';
            const errorSub = this.error$.subscribe(error => {
                errorMsg.textContent = error || '';
                errorMsg.style.display = error ? 'block' : 'none';
            });
            registerDestroy(container, () => errorSub.unsubscribe());
            container.appendChild(errorMsg);
        }

        return container;
    }
}
