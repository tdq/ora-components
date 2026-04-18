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

    build(): HTMLElement {
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
            const isBorderless = style === ListBoxStyle.BORDERLESS && !this.isGlass;
            listContainer.className = cn(
                'overflow-hidden transition-all flex-1 relative flex flex-col',
                !this.isGlass && 'bg-surface text-on-surface',
                !isBorderless && !this.isGlass && 'rounded-large border',
                !isBorderless && !this.isGlass && !error && 'border-outline',
                this.isGlass && 'glass-effect',
                !!error && !isBorderless && 'border-error',
                !!error && isBorderless && 'rounded-large border border-error',
            );
        });
        registerDestroy(container, () => listStyleSub.unsubscribe());
        
        container.appendChild(listContainer);

        // List (UL)
        const list = document.createElement('ul');
        list.role = 'listbox';
        list.className = 'w-full h-full overflow-y-auto py-0'; 
        listContainer.appendChild(list);

        // Items Rendering
        const currentValue$ = this.value$ 
            ? this.value$.pipe(startWith(null))
            : new BehaviorSubject<ITEM | null>(null);

        const itemsState$ = combineLatest([
            this.items$,
            currentValue$,
            this.style$
        ]);

        const itemsSub = itemsState$.subscribe(([items, selectedItem, style]) => {
            list.innerHTML = '';
            
            const selectedId = selectedItem ? this.itemIdProvider(selectedItem) : null;

            items.forEach(item => {
                const id = this.itemIdProvider(item);
                const isSelected = selectedId === id;
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
                    !isSelected && hoverBg
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
