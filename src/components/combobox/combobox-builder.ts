import { Observable, Subject, BehaviorSubject, combineLatest, map, distinctUntilChanged, Subscription } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { registerDestroy } from '@/core/destroyable-element';
import { ComboBoxStyle } from './types';
import { cn, STYLE_MAP } from './styles';
import { renderComboBoxItem } from './combobox-item';
import { renderComboBoxList, renderNoResults } from './combobox-list';
import { renderComboBoxInput } from './combobox-input';

export { ComboBoxStyle };

export class ComboBoxBuilder<ITEM> implements ComponentBuilder {
    private items$?: Observable<ITEM[]>;
    private value$: Subject<ITEM | null> = new Subject<ITEM | null>();
    private itemCaptionProvider: (item: ITEM) => string = (item) => String(item);
    private itemIdProvider: (item: ITEM) => string | number = (item) => String(item);
    private placeholder?: string;
    private caption$?: Observable<string>;
    private error$?: Observable<string>;
    private enabled$?: Observable<boolean>;
    private style$?: Observable<ComboBoxStyle>;
    private className$?: Observable<string>;
    private visible$?: Observable<boolean>;
    private isGlass: boolean = false;

    withItems(items: Observable<ITEM[]>): ComboBoxBuilder<ITEM> {
        this.items$ = items;
        return this;
    }

    withValue(value: Subject<ITEM | null>): ComboBoxBuilder<ITEM> {
        this.value$ = value;
        return this;
    }

    withItemCaptionProvider(provider: (item: ITEM) => string): ComboBoxBuilder<ITEM> {
        this.itemCaptionProvider = provider;
        return this;
    }

    withItemIdProvider(provider: (item: ITEM) => string | number): ComboBoxBuilder<ITEM> {
        this.itemIdProvider = provider;
        return this;
    }

    withPlaceholder(placeholder: string): ComboBoxBuilder<ITEM> {
        this.placeholder = placeholder;
        return this;
    }

    withCaption(caption: Observable<string>): ComboBoxBuilder<ITEM> {
        this.caption$ = caption;
        return this;
    }

    asGlass(isGlass: boolean = true): ComboBoxBuilder<ITEM> {
        this.isGlass = isGlass;
        return this;
    }

    withError(error: Observable<string>): ComboBoxBuilder<ITEM> {
        this.error$ = error;
        return this;
    }

    withEnabled(enabled: Observable<boolean>): ComboBoxBuilder<ITEM> {
        this.enabled$ = enabled;
        return this;
    }

    withStyle(style: Observable<ComboBoxStyle>): ComboBoxBuilder<ITEM> {
        this.style$ = style;
        return this;
    }

    withClass(className: Observable<string>): ComboBoxBuilder<ITEM> {
        this.className$ = className;
        return this;
    }

    withVisible(visible: Observable<boolean>): ComboBoxBuilder<ITEM> {
        this.visible$ = visible;
        return this;
    }

    build(): HTMLElement {
        const instanceId = `cb-${Math.random().toString(36).substring(2, 9)}`;
        const listboxId = `${instanceId}-listbox`;

        const container = document.createElement('div');
        container.className = 'flex flex-col gap-px-4 w-full relative';

        const captionElement = document.createElement('span');
        captionElement.className = 'md-label-small text-on-surface-variant px-px-16 hidden';
        container.appendChild(captionElement);

        const { container: inputContainer, input, iconContainer } = renderComboBoxInput({
            placeholder: this.placeholder,
            ariaControls: listboxId
        });
        container.appendChild(inputContainer);

        const listbox = renderComboBoxList(listboxId);
        container.appendChild(listbox);

        const error = document.createElement('span');
        error.className = 'md-label-small text-error px-px-16 hidden';
        container.appendChild(error);

        // Internal State
        const searchTerm$ = new BehaviorSubject<string>('');
        const isFiltering$ = new BehaviorSubject<boolean>(false);
        const isExpanded$ = new BehaviorSubject<boolean>(false);
        const focusedIndex$ = new BehaviorSubject<number>(-1);
        const items$ = this.items$ || new BehaviorSubject<ITEM[]>([]);
        const currentValue$ = new BehaviorSubject<ITEM | null>(null);

        // Helper to get item ID
        const getItemId = (item: ITEM) => {
            return `${listboxId}-option-${this.itemIdProvider(item)}`;
        };

        const filteredItems$ = combineLatest([items$, searchTerm$, isFiltering$]).pipe(
            map(([items, term, isFiltering]) => {
                if (!isFiltering || !term) return items;
                const lowerTerm = term.toLowerCase();
                return items.filter(item =>
                    this.itemCaptionProvider(item).toLowerCase().includes(lowerTerm)
                );
            })
        );

        // Subscriptions
        const subs = new Subscription();

        if (this.caption$) {
            subs.add(this.caption$.subscribe(text => {
                captionElement.textContent = text;
                captionElement.classList.toggle('hidden', !text);
            }));
        }

        const style$ = this.style$ || new BehaviorSubject<ComboBoxStyle>(ComboBoxStyle.TONAL);
        const isGlass = this.isGlass;

        subs.add(combineLatest({
            style: style$,
            expanded: isExpanded$
        }).subscribe(({ style, expanded }) => {
            // Update input container base style
            Object.values(STYLE_MAP).forEach(cls => {
                cls.split(' ').forEach(c => inputContainer.classList.remove(c));
            });
            STYLE_MAP[style].split(' ').forEach(c => inputContainer.classList.add(c));

            if (isGlass) {
                inputContainer.classList.add('glass-effect');
                inputContainer.classList.remove('bg-secondary-container');

                // Adjust text colors for glass mode
                const glassLabelClasses = ['text-gray-900', 'dark:text-white'];
                const glassDescClasses = ['text-gray-600', 'dark:text-white/60'];

                const standardCaptionClasses = ['text-on-surface-variant'];
                const standardInputClasses = ['text-on-surface'];
                const standardIconClasses = ['text-on-surface-variant'];

                // Caption
                captionElement.classList.remove(...standardCaptionClasses);
                captionElement.classList.add(...glassLabelClasses);
                
                // Input
                input.classList.remove(...standardInputClasses);
                input.classList.add(...glassLabelClasses);
                
                // Icons (using Description color)
                iconContainer.classList.remove(...standardIconClasses);
                iconContainer.classList.add(...glassDescClasses);
            } else {
                inputContainer.classList.remove('glass-effect');

                // Revert text colors
                const glassLabelClasses = ['text-gray-900', 'dark:text-white'];
                const glassDescClasses = ['text-gray-600', 'dark:text-white/60'];
                
                captionElement.classList.add('text-on-surface-variant');
                captionElement.classList.remove(...glassLabelClasses);

                input.classList.add('text-on-surface');
                input.classList.remove(...glassLabelClasses);

                iconContainer.classList.add('text-on-surface-variant');
                iconContainer.classList.remove(...glassDescClasses);
            }

            const dynamicClasses = [
                'bg-white/10', 'bg-white/20', 'backdrop-blur-xl', 'border-white/20', 'border-white/30',
                'bg-secondary-container', 'bg-surface', 'border-outline', 'border', 'border-transparent'
            ];
            listbox.classList.remove(...dynamicClasses);

            if (isGlass) {
                listbox.classList.add('glass-effect');
            } else if (style === ComboBoxStyle.TONAL) {
                listbox.classList.add('bg-secondary-container', 'border', 'border-transparent');
            } else {
                listbox.classList.add('bg-surface', 'border', 'border-outline');
            }

            if (expanded) {
                const rect = inputContainer.getBoundingClientRect();
                listbox.style.top = `${rect.bottom + 4}px`;
                listbox.style.left = `${rect.left}px`;
                listbox.style.width = `${rect.width}px`;
                (listbox as any).showPopover();
            } else {
                (listbox as any).hidePopover();
            }
        }));

        if (this.error$) {
            subs.add(this.error$.subscribe(text => {
                error.textContent = text;
                error.classList.toggle('hidden', !text);
                const hasError = !!text;
                inputContainer.classList.toggle('ring-error', hasError);
                inputContainer.classList.toggle('focus-within:ring-error', hasError);
                inputContainer.classList.toggle('shadow-[inset_0_-1px_0_0_var(--md-sys-color-error)]', hasError);
                inputContainer.classList.toggle('focus-within:shadow-[inset_0_-2px_0_0_var(--md-sys-color-error)]', hasError);
            }));
        }

        if (this.enabled$) {
            subs.add(this.enabled$.subscribe(enabled => {
                input.disabled = !enabled;
                inputContainer.classList.toggle('opacity-38', !enabled);
                inputContainer.classList.toggle('cursor-not-allowed', !enabled);
            }));
        }

        if (this.className$) {
            subs.add(this.className$.subscribe(cls => {
                container.className = cn('flex flex-col gap-px-4 w-full relative', cls);
            }));
        }

        if (this.visible$) {
            subs.add(this.visible$.subscribe(visible => {
                container.classList.toggle('hidden', !visible);
            }));
        }

        let currentItems: ITEM[] = [];

        subs.add(combineLatest({
            items: filteredItems$,
            style: style$,
            selectedValue: currentValue$,
            focusedIndex: focusedIndex$,
            expanded: isExpanded$
        }).subscribe(({ items, style, selectedValue, focusedIndex, expanded }) => {
            currentItems = items;

            let effectiveFocus = focusedIndex;
            if (expanded && items.length > 0) {
                if (effectiveFocus === -1) {
                    const currentVal = currentValue$.value;
                    const foundIndex = currentVal !== null 
                        ? items.findIndex(it => this.itemIdProvider(it) === this.itemIdProvider(currentVal))
                        : -1;
                    effectiveFocus = foundIndex !== -1 ? foundIndex : 0;
                } else if (effectiveFocus >= items.length) {
                    effectiveFocus = items.length - 1;
                }
            }

            const fragment = document.createDocumentFragment();
            if (items.length === 0) {
                fragment.appendChild(renderNoResults());
            } else {
                items.forEach((item, index) => {
                    const isSelected = selectedValue !== null &&
                        this.itemIdProvider(selectedValue) === this.itemIdProvider(item);
                    const isFocused = index === effectiveFocus;
                    const option = renderComboBoxItem({
                        item,
                        id: getItemId(item),
                        isSelected,
                        isFocused,
                        style,
                        isGlass,
                        caption: this.itemCaptionProvider(item),
                        onSelect: (selectedItem) => {
                            this.value$?.next(selectedItem);
                            currentValue$.next(selectedItem);
                            isExpanded$.next(false);
                            searchTerm$.next(this.itemCaptionProvider(selectedItem));
                            input.value = this.itemCaptionProvider(selectedItem);
                        },
                        onHover: () => {
                            if (focusedIndex$.value !== index) {
                                focusedIndex$.next(index);
                            }
                        }
                    });
                    fragment.appendChild(option);

                    if (isFocused) {
                        input.setAttribute('aria-activedescendant', option.id);
                        if (option.scrollIntoView) {
                            option.scrollIntoView({ block: 'nearest' });
                        }
                    }
                });
            }
            listbox.replaceChildren(fragment);

            if (effectiveFocus === -1) {
                input.removeAttribute('aria-activedescendant');
            }

            if (effectiveFocus !== focusedIndex) {
                // Update focusedIndex$ to keep it in sync, but do it asynchronously to avoid circular emission
                Promise.resolve().then(() => {
                    if (focusedIndex$.value === focusedIndex) {
                        focusedIndex$.next(effectiveFocus);
                    }
                });
            }
        }));

        subs.add(isExpanded$.subscribe(expanded => {
            input.setAttribute('aria-expanded', expanded.toString());
            if (expanded) {
                input.focus();
                const currentVal = currentValue$.value;
                if (currentVal !== null) {
                    const index = currentItems.findIndex(it =>
                        this.itemIdProvider(it) === this.itemIdProvider(currentVal));
                    focusedIndex$.next(index !== -1 ? index : (currentItems.length > 0 ? 0 : -1));
                } else if (currentItems.length > 0) {
                    focusedIndex$.next(0);
                }
            } else {
                isFiltering$.next(false);
                focusedIndex$.next(-1);
            }
        }));

        if (this.value$) {
            subs.add(this.value$.pipe(distinctUntilChanged()).subscribe(val => {
                currentValue$.next(val || null);
                if (val !== null && val !== undefined) {
                    const caption = this.itemCaptionProvider(val);
                    if (input.value !== caption) {
                        input.value = caption;
                        searchTerm$.next(caption);
                    }
                } else {
                    input.value = '';
                    searchTerm$.next('');
                }
            }));
        }

        input.oninput = (e) => {
            const val = (e.target as HTMLInputElement).value;
            searchTerm$.next(val);
            isFiltering$.next(true);
            if (!isExpanded$.value) {
                isExpanded$.next(true);
            }
        };

        input.onclick = () => {
            if (!isExpanded$.value) {
                isExpanded$.next(true);
            }
        };

        iconContainer.onclick = (e) => {
            e.stopPropagation();
            isExpanded$.next(!isExpanded$.value);
            input.focus();
        };

        input.onkeydown = (e) => {
            const expanded = isExpanded$.value;
            const index = focusedIndex$.value;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!expanded) {
                    isExpanded$.next(true);
                } else if (currentItems.length > 0) {
                    const nextIndex = (index + 1) % currentItems.length;
                    focusedIndex$.next(nextIndex);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (!expanded) {
                    isExpanded$.next(true);
                } else if (currentItems.length > 0) {
                    const nextIndex = (index - 1 + currentItems.length) % currentItems.length;
                    focusedIndex$.next(nextIndex);
                }
            } else if (e.key === 'Enter' || e.key === ' ') {
                if (expanded && index >= 0 && index < currentItems.length) {
                    e.preventDefault();
                    const selectedItem = currentItems[index];
                    this.value$?.next(selectedItem);
                    currentValue$.next(selectedItem);
                    isExpanded$.next(false);
                    const caption = this.itemCaptionProvider(selectedItem);
                    input.value = caption;
                    searchTerm$.next(caption);
                }
            } else if (e.key === 'Escape') {
                if (expanded) {
                    e.preventDefault();
                    isExpanded$.next(false);
                }
            }
        };

        const clickOutsideHandler = (e: MouseEvent) => {
            if (!container.contains(e.target as Node)) {
                isExpanded$.next(false);
            }
        };
        document.addEventListener('click', clickOutsideHandler);

        const scrollHandler = (e: Event) => {
            if (isExpanded$.value && !listbox.contains(e.target as Node)) {
                 isExpanded$.next(false);
            }
        };
        document.addEventListener('scroll', scrollHandler, true);

        registerDestroy(container, () => {
            subs.unsubscribe();
            if (typeof document !== 'undefined') {
                document.removeEventListener('click', clickOutsideHandler);
                document.removeEventListener('scroll', scrollHandler, true);
            }
        });

        return container;
    }
}
