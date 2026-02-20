import { Observable, Subject, BehaviorSubject, combineLatest, map, distinctUntilChanged } from 'rxjs';
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
    private value$?: Subject<ITEM | null>;
    private itemCaptionProvider: (item: ITEM) => string = (item) => String(item);
    private itemIdProvider: (item: ITEM) => string | number = (item) => String(item);
    private placeholder?: string;
    private caption$?: Observable<string>;
    private error$?: Observable<string>;
    private enabled$?: Observable<boolean>;
    private style$?: Observable<ComboBoxStyle>;
    private className$?: Observable<string>;
    private visible$?: Observable<boolean>;
    private isGlass$ = new BehaviorSubject<boolean>(false);

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

    asGlass(): ComboBoxBuilder<ITEM> {
        this.isGlass$.next(true);
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
        const subs: any[] = [];

        subs.push(this.caption$?.subscribe(text => {
            captionElement.textContent = text;
            captionElement.classList.toggle('hidden', !text);
        }));

        const style$ = this.style$ || new BehaviorSubject<ComboBoxStyle>(ComboBoxStyle.TONAL);
        subs.push(combineLatest([this.isGlass$, style$, isExpanded$]).subscribe(([isGlass, style, expanded]) => {
            // Update input container base style
            Object.values(STYLE_MAP).forEach(cls => {
                cls.split(' ').forEach(c => inputContainer.classList.remove(c));
            });
            STYLE_MAP[style].split(' ').forEach(c => inputContainer.classList.add(c));

            // Update input container glass effect
            if (isGlass) {
                inputContainer.classList.add('bg-white/10', 'backdrop-blur-md', 'border', 'border-white/20');
                inputContainer.classList.remove('bg-secondary-container');
            } else {
                inputContainer.classList.remove('bg-white/10', 'backdrop-blur-md', 'border', 'border-white/20');
            }

            // Update listbox visibility
            listbox.classList.toggle('hidden', !expanded);

            // Use a clean slate for listbox classes that change based on style/glass mode
            const dynamicClasses = [
                'bg-white/10', 'bg-white/20', 'backdrop-blur-xl', 'border-white/20', 'border-white/30',
                'bg-secondary-container', 'bg-surface', 'border-outline', 'border', 'border-transparent'
            ];
            listbox.classList.remove(...dynamicClasses);

            if (isGlass) {
                // Glass effect: higher contrast for the popup background and border
                listbox.classList.add('bg-white/20', 'backdrop-blur-xl', 'border', 'border-white/30');
            } else if (style === ComboBoxStyle.TONAL) {
                // Tonal style: popup background matches input container, border is transparent to maintain layout
                listbox.classList.add('bg-secondary-container', 'border', 'border-transparent');
            } else {
                // Outlined style: popup needs a solid surface background for readability and an outline color border
                listbox.classList.add('bg-surface', 'border', 'border-outline');
            }
        }));

        subs.push(this.error$?.subscribe(text => {
            error.textContent = text;
            error.classList.toggle('hidden', !text);
            const hasError = !!text;
            inputContainer.classList.toggle('ring-error', hasError);
            inputContainer.classList.toggle('focus-within:ring-error', hasError);
            inputContainer.classList.toggle('shadow-[inset_0_-1px_0_0_var(--md-sys-color-error)]', hasError);
            inputContainer.classList.toggle('focus-within:shadow-[inset_0_-2px_0_0_var(--md-sys-color-error)]', hasError);
        }));

        subs.push(this.enabled$?.subscribe(enabled => {
            input.disabled = !enabled;
            inputContainer.classList.toggle('opacity-38', !enabled);
            inputContainer.classList.toggle('cursor-not-allowed', !enabled);
        }));

        subs.push(this.className$?.subscribe(cls => {
            // We apply extra classes to the container
            container.className = cn('flex flex-col gap-px-4 w-full relative', cls);
        }));

        subs.push(this.visible$?.subscribe(visible => {
            container.classList.toggle('hidden', !visible);
        }));

        let currentItems: ITEM[] = [];
        subs.push(combineLatest([filteredItems$, style$, this.isGlass$, currentValue$, focusedIndex$, isExpanded$]).subscribe(([items, style, isGlass, selectedValue, focusedIndex, expanded]) => {
            currentItems = items;
            
            // Validate focusedIndex
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
                        option.scrollIntoView({ block: 'nearest' });
                    }
                });
            }
            listbox.replaceChildren(fragment);

            if (effectiveFocus === -1) {
                input.removeAttribute('aria-activedescendant');
            }

            // Sync focusedIndex$ if it changed effectively
            if (effectiveFocus !== focusedIndex) {
                Promise.resolve().then(() => {
                    if (focusedIndex$.value === focusedIndex) {
                        focusedIndex$.next(effectiveFocus);
                    }
                });
            }
        }));

        subs.push(isExpanded$.subscribe(expanded => {
            input.setAttribute('aria-expanded', expanded.toString());
            if (expanded) {
                input.focus();

                // When opening, highlight the currently selected item or the first item
                const currentVal = currentValue$.value;
                const items = currentItems;
                if (currentVal !== null) {
                    const index = items.findIndex(it =>
                        this.itemIdProvider(it) === this.itemIdProvider(currentVal));
                    focusedIndex$.next(index !== -1 ? index : (items.length > 0 ? 0 : -1));
                } else if (items.length > 0) {
                    focusedIndex$.next(0);
                }
            } else {
                isFiltering$.next(false);
                focusedIndex$.next(-1);
            }
        }));

        subs.push(this.value$?.pipe(distinctUntilChanged()).subscribe(val => {
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

        // Event Handlers
        input.oninput = (e) => {
            const val = (e.target as HTMLInputElement).value;
            searchTerm$.next(val);
            isFiltering$.next(true);
            if (!isExpanded$.value) {
                isExpanded$.next(true);
            }
        };

        input.onfocus = () => {
            // Optional: open on focus? MD3 usually opens on focus or click
            // isExpanded$.next(true);
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

        // Click outside
        const clickOutsideHandler = (e: MouseEvent) => {
            if (!container.contains(e.target as Node)) {
                isExpanded$.next(false);
            }
        };
        document.addEventListener('click', clickOutsideHandler);

        registerDestroy(container, () => {
            subs.forEach(s => s?.unsubscribe());
            if (typeof document !== 'undefined') {
                document.removeEventListener('click', clickOutsideHandler);
            }
        });

        return container;
    }
}
