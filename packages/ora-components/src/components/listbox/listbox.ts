import { BehaviorSubject, combineLatest, Observable, of, Subject } from 'rxjs';
import { startWith } from 'rxjs/operators';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ComponentBuilder } from '../../core/component-builder';
import { registerDestroy } from '../../core/destroyable-element';
import { createOptimizedPipeline } from '../../utils/optimized-pipeline';
import { VirtualRowsViewport } from '../../utils/virtual-rows-viewport';
import { ListBoxStyle } from './types';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export class ListBoxBuilder<ITEM> implements ComponentBuilder {
    private caption$?: Observable<string>;
    private enabled$?: Observable<boolean>;
    private style$: Observable<ListBoxStyle> = of(ListBoxStyle.TONAL);
    private className$?: Observable<string>;
    private items$: Observable<ITEM[]> = of([]);
    private itemCaptionProvider: (item: ITEM) => string = (item) => String(item);
    private itemIdProvider: (item: ITEM) => string | number = (item) => String(item);
    private value$: Subject<ITEM | null> = new Subject<ITEM | null>();
    private height$?: Observable<number>;
    private error$?: Observable<string>;
    private isGlass: boolean = false;
    private externalFocusedIndex$?: Observable<number>;

    withCaption(caption: Observable<string>): this {
        this.caption$ = caption;
        return this;
    }

    withEnabled(enabled: Observable<boolean>): this {
        this.enabled$ = enabled;
        return this;
    }

    withStyle(style: Observable<ListBoxStyle>): this {
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

    withValue(value: Subject<ITEM | null>): this {
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

    /**
     * Provide an external observable that drives focused-index state.
     * The external observable and internal keyboard navigation share the same
     * focused-index subject, so it should only emit intentional resets
     * (e.g. reset to 0 on items change), not continuous streams.
     */
    withFocusedIndex(index$: Observable<number>): this {
        this.externalFocusedIndex$ = index$;
        return this;
    }

    build(): HTMLElement {
        const focusedIndex$ = new BehaviorSubject<number>(-1);
        let currentItems: ITEM[] = [];
        const instanceId = `listbox-${Math.random().toString(36).substring(2, 9)}`;

        const container = document.createElement('div');
        
        // Container styles and state
        const containerState$ = combineLatest([
            this.className$ ? this.className$.pipe(startWith('')) : of(''),
            this.height$ ? this.height$.pipe(startWith(undefined)) : of(undefined),
            this.enabled$ ? this.enabled$.pipe(startWith(true)) : of(true),
        ]);

        const containerSub = containerState$.subscribe(([className, height, enabled]) => {
            container.className = cn(
                'flex flex-col gap-px-4',
                !enabled && 'opacity-50 pointer-events-none',
                className
            );
            if (enabled) {
                container.removeAttribute('aria-disabled');
            } else {
                container.setAttribute('aria-disabled', 'true');
            }
            if (height) {
                container.style.height = `${height}px`;
            } else {
                container.style.height = '';
            }
        });
        registerDestroy(container, () => containerSub.unsubscribe());

        // Caption
        if (this.caption$) {
            const label = document.createElement('label');
            label.id = `${instanceId}-caption`;
            label.className = 'text-label-medium text-on-surface-variant ml-px-16';
            const labelSub = this.caption$.subscribe(caption => {
                label.textContent = caption;
            });
            registerDestroy(container, () => labelSub.unsubscribe());
            container.appendChild(label);
        }

        // List Container (Panel style)
        const listContainer = document.createElement('div');
        
        const listStyleSub = combineLatest([
            this.style$,
            this.error$ ? this.error$.pipe(startWith(null)) : of(null)
        ]).subscribe(([style, error]) => {
            const isBorderless = style === ListBoxStyle.BORDERLESS;
            listContainer.className = cn(
                'overflow-hidden transition-all flex-1 relative flex flex-col',
                !this.isGlass && 'bg-surface text-on-surface',
                !isBorderless && !this.isGlass && 'rounded-large border',
                !isBorderless && !this.isGlass && !error && 'border-outline',
                !isBorderless && this.isGlass && 'glass-effect',
                !!error && !isBorderless && 'border-error',
                !!error && isBorderless && 'rounded-large border border-error',
            );
        });
        registerDestroy(container, () => listStyleSub.unsubscribe());
        
        container.appendChild(listContainer);

        // List (UL)
        const list = document.createElement('ul');
        list.role = 'listbox';
        // When driven by an external observable (e.g. ComboBox), the trigger input owns
        // tab focus and points at options via aria-activedescendant, so the list itself
        // must stay out of the tab order. Standalone ListBox has no such trigger, so it
        // needs to be tabbable itself for keyboard/scroll access.
        list.tabIndex = this.externalFocusedIndex$ ? -1 : 0;
        list.className = 'w-full h-full overflow-y-auto py-0';
        if (this.caption$) {
            list.setAttribute('aria-labelledby', `${instanceId}-caption`);
        }
        listContainer.appendChild(list);

        if (this.externalFocusedIndex$) {
            const externalSub = this.externalFocusedIndex$.subscribe(index => {
                focusedIndex$.next(index);
            });
            registerDestroy(container, () => externalSub.unsubscribe());
        }

        list.addEventListener('keydown', (e: KeyboardEvent) => {
            const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter'];
            if (!keys.includes(e.key)) return;
            e.preventDefault();

            const count = currentItems.length;
            if (count === 0) return;

            const current = focusedIndex$.getValue();

            if (e.key === 'ArrowDown') {
                focusedIndex$.next(current < count - 1 ? current + 1 : 0);
            } else if (e.key === 'ArrowUp') {
                focusedIndex$.next(current > 0 ? current - 1 : count - 1);
            } else if (e.key === 'Home') {
                focusedIndex$.next(0);
            } else if (e.key === 'End') {
                focusedIndex$.next(count - 1);
            } else if (e.key === 'Enter') {
                const idx = focusedIndex$.getValue();
                if (idx >= 0 && idx < currentItems.length) {
                    this.value$.next(currentItems[idx]);
                }
            }
        });

        list.addEventListener('focusout', (e: FocusEvent) => {
            if (!list.contains(e.relatedTarget as Node)) {
                focusedIndex$.next(-1);
            }
        });

        // Items Rendering
        const currentValue$ = this.value$
            ? this.value$.pipe(startWith(null))
            : new BehaviorSubject<ITEM | null>(null);

        // Gate the heavy items source on viewport visibility — items will not
        // render (and the source will not be subscribed) until container enters
        // the viewport.  All other streams (keyboard nav, selection, style) are
        // intentionally left ungated so they remain reactive at all times.
        // createOptimizedPipeline is idempotent: an already-gated source (e.g. a filtered
        // view from a parent combobox branded as GatedObserver) is returned as-is.
        const itemsSource$ = createOptimizedPipeline(container, this.items$);

        const itemsState$ = combineLatest([
            itemsSource$,
            currentValue$,
            this.style$,
            focusedIndex$,
        ]);

        // Captured latest state read by renderRow.
        let selectedId: string | number | null = null;
        let currentStyle = ListBoxStyle.TONAL;
        let currentFocusedIndex = -1;

        const buildOption = (index: number, item: ITEM): HTMLElement => {
            const id = this.itemIdProvider(item);
            const isSelected = selectedId === id;
            const isFocused = currentFocusedIndex === index;
            const caption = this.itemCaptionProvider(item);
            const style = currentStyle;

            const li = document.createElement('li');
            li.role = 'option';
            li.setAttribute('aria-selected', String(isSelected));
            li.setAttribute('aria-setsize', String(currentItems.length));
            li.setAttribute('aria-posinset', String(index + 1));

            const isTonal = (style === ListBoxStyle.TONAL || style === ListBoxStyle.BORDERLESS) && !this.isGlass;
            const isOutlined = style === ListBoxStyle.OUTLINED && !this.isGlass;

            let itemTextColor: string;
            let selectedBg: string;
            let hoverBg: string;
            let focusBg: string;

            if (this.isGlass) {
                itemTextColor = '';
                selectedBg = 'bg-white/40';
                hoverBg = 'hover:bg-black/5 dark:hover:bg-white/10';
                focusBg = 'bg-black/10 dark:bg-white/20';
            } else {
                itemTextColor = (isSelected && isOutlined)
                    ? 'text-on-primary-container'
                    : (isTonal ? 'text-on-secondary-container' : 'text-on-surface');
                selectedBg = isTonal ? 'bg-on-secondary-container/20' : 'bg-primary-container';
                hoverBg = 'hover:bg-on-surface/8';
                focusBg = 'bg-on-surface/12';
            }

            // `relative` is kept intentionally: the direct (ComboBox) path needs it so
            // the focus indicator and state-layer children position against the <li>.
            // The virtual path overrides position to `absolute` via inline style set by
            // VirtualRowsViewport, which also satisfies the positioned-ancestor requirement.
            li.className = cn(
                'px-px-16 py-px-12 cursor-pointer body-large transition-colors relative overflow-hidden group',
                itemTextColor,
                isSelected && 'font-bold',
                isSelected && selectedBg,
                !isSelected && hoverBg,
                isFocused && !isSelected && focusBg
            );

            if (isFocused) {
                const focusIndicator = document.createElement('div');
                focusIndicator.className = 'absolute left-0 top-0 bottom-0 w-[4px] bg-primary z-20';
                li.appendChild(focusIndicator);
            }

            const stateLayer = document.createElement('div');
            stateLayer.className = cn(
                'absolute inset-0 pointer-events-none transition-colors',
                'active:bg-current active:opacity-15'
            );
            li.appendChild(stateLayer);

            const content = document.createElement('span');
            content.className = 'relative z-10';
            content.textContent = caption;
            li.appendChild(content);

            li.onclick = () => {
                if (this.value$) {
                    this.value$.next(item);
                }
            };

            return li;
        };

        // Standalone listboxes use VirtualRowsViewport for efficient windowing.
        // When driven by an external focus index (ComboBox mode) we fall back to
        // direct rendering so the caller can safely index into ul.children by
        // position — the spacer that VirtualRowsViewport prepends would break that.
        if (!this.externalFocusedIndex$) {
            const vp = new VirtualRowsViewport<ITEM>({
                scrollEl: list,
                rowHeight: 44,
                renderRow: buildOption,
            });
            registerDestroy(container, () => vp.destroy());

            const itemsSub = itemsState$.subscribe(([items, selectedItem, style, focusedIndex]) => {
                const itemsChanged = items !== currentItems;
                currentItems = items;
                selectedId = selectedItem ? this.itemIdProvider(selectedItem) : null;
                currentStyle = style;
                const focusChanged = focusedIndex !== currentFocusedIndex;
                currentFocusedIndex = focusedIndex;

                if (itemsChanged) {
                    vp.setItems(items);
                } else if (focusChanged) {
                    // Refresh re-renders the window with the new focus highlight, then
                    // scrollToIndex adjusts scrollTop if the focused row is off-screen.
                    vp.refresh();
                    if (focusedIndex >= 0) vp.scrollToIndex(focusedIndex);
                } else {
                    vp.refresh(); // selection / style change
                }
            });
            registerDestroy(container, () => itemsSub.unsubscribe());
        } else {
            // Direct rendering path (ComboBox / externalFocusedIndex mode)
            const itemsSub = itemsState$.subscribe(([items, selectedItem, style, focusedIndex]) => {
                currentItems = items;
                selectedId = selectedItem ? this.itemIdProvider(selectedItem) : null;
                currentStyle = style;
                currentFocusedIndex = focusedIndex;

                list.innerHTML = '';
                items.forEach((item, index) => {
                    list.appendChild(buildOption(index, item));
                });
                if (focusedIndex >= 0) {
                    const el = list.children[focusedIndex] as HTMLElement | null;
                    if (el && typeof el.scrollIntoView === 'function') {
                        el.scrollIntoView({ block: 'nearest' });
                    }
                }
            });
            registerDestroy(container, () => itemsSub.unsubscribe());
        }

        // Error message
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
