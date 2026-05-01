import { BehaviorSubject, combineLatest, Observable, of, Subject } from 'rxjs';
import { startWith } from 'rxjs/operators';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ComponentBuilder } from '../../core/component-builder';
import { registerDestroy } from '../../core/destroyable-element';
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
        list.tabIndex = -1;
        list.className = 'w-full h-full overflow-y-auto py-0';
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

        const itemsState$ = combineLatest([
            this.items$,
            currentValue$,
            this.style$,
            focusedIndex$,
        ]);

        const itemsSub = itemsState$.subscribe(([items, selectedItem, style, focusedIndex]) => {
            currentItems = items;
            list.innerHTML = '';

            const selectedId = selectedItem ? this.itemIdProvider(selectedItem) : null;

            items.forEach((item, index) => {
                const id = this.itemIdProvider(item);
                const isSelected = selectedId === id;
                const isFocused = focusedIndex === index;
                const caption = this.itemCaptionProvider(item);

                const li = document.createElement('li');
                li.role = 'option';
                li.setAttribute('aria-selected', String(isSelected));

                // Styling logic mirrored from ComboBox
                const isTonal = (style === ListBoxStyle.TONAL || style === ListBoxStyle.BORDERLESS) && !this.isGlass;
                const isOutlined = style === ListBoxStyle.OUTLINED && !this.isGlass;

                let itemTextColor: string;
                let selectedBg: string;
                let hoverBg: string;

                if (this.isGlass) {
                    itemTextColor = '';
                    selectedBg = 'bg-white/40';
                    hoverBg = 'hover:bg-black/5 dark:hover:bg-white/10';
                } else {
                    itemTextColor = (isSelected && isOutlined)
                        ? 'text-on-primary-container'
                        : (isTonal ? 'text-on-secondary-container' : 'text-on-surface');
                    selectedBg = isTonal ? 'bg-on-secondary-container/20' : 'bg-primary-container';
                    hoverBg = 'hover:bg-on-surface/8';
                }

                li.className = cn(
                    'px-px-16 py-px-12 cursor-pointer body-large transition-colors relative overflow-hidden group',
                    itemTextColor,
                    isSelected && 'font-bold',
                    isSelected && selectedBg,
                    !isSelected && hoverBg,
                    isFocused && !isSelected && 'bg-on-surface/12'
                );

                // State Layer (for focus/hover/active visual consistency)
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

                list.appendChild(li);
            });

            if (focusedIndex >= 0) {
                (list.children[focusedIndex] as HTMLElement | null)?.scrollIntoView({ block: 'nearest' });
            }
        });
        registerDestroy(container, () => itemsSub.unsubscribe());

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
