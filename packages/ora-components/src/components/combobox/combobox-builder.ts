import { Observable, Subject, BehaviorSubject, combineLatest, map, distinctUntilChanged, Subscription, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { registerDestroy } from '@/core/destroyable-element';
import { ComboBoxStyle } from './types';
import { cn, STYLE_MAP } from './styles';
import { renderComboBoxInput } from './combobox-input';
import { PopoverBuilder } from '../component-parts/popover';
import { ListBoxBuilder } from '../listbox/listbox';
import { ListBoxStyle } from '../listbox/types';

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
    private listWidth$?: Observable<string>;
    private isGlass: boolean = false;

    withItems(items: Observable<ITEM[]>): ComboBoxBuilder<ITEM> {
        this.items$ = items;
        return this;
    }

    withListWidth(width: Observable<string>): ComboBoxBuilder<ITEM> {
        this.listWidth$ = width;
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
        const listBoxValue$ = new Subject<ITEM | null>();
        let isSyncingExternalValue = false;

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
        const listWidth$ = this.listWidth$ || of('match-input');
        const isGlass = this.isGlass;

        // The popover provides the outer container; ListBox uses BORDERLESS to avoid double borders/backgrounds.
        const mappedListBoxStyle$ = of(ListBoxStyle.BORDERLESS);

        const mappedListWidth$ = listWidth$.pipe(
            map((w: string) => w === 'match-input' ? 'match-anchor' : w)
        );

        // Build ListBox
        const listBoxBuilder = new ListBoxBuilder<ITEM>()
            .withItems(filteredItems$)
            .withValue(listBoxValue$)
            .withFocusedIndex(focusedIndex$)
            .withItemCaptionProvider(this.itemCaptionProvider)
            .withItemIdProvider(this.itemIdProvider)
            .withStyle(mappedListBoxStyle$)
            .withClass(of('max-h-px-256 overflow-hidden'));

        if (isGlass) listBoxBuilder.asGlass();

        const listBoxEl = listBoxBuilder.build();
        const ulEl = listBoxEl.querySelector('ul[role="listbox"]') as HTMLUListElement;
        ulEl.id = listboxId;

        // "No results" message shown when filteredItems$ is empty
        const noResults = document.createElement('div');
        noResults.className = 'px-px-16 py-px-8 text-on-surface-variant body-medium';
        noResults.textContent = 'No results';
        noResults.style.display = 'none';

        const popoverContent = document.createElement('div');
        popoverContent.appendChild(listBoxEl);
        popoverContent.appendChild(noResults);

        let currentItems: ITEM[] = [];

        subs.add(filteredItems$.subscribe(items => {
            currentItems = items;
            // Keep the <ul role="listbox"> visible at all times (needed for aria-controls and
            // accessibility queries). Only toggle the "No results" message.
            noResults.style.display = items.length === 0 ? '' : 'none';

            // Assign IDs to <li> elements so aria-activedescendant and tests work.
            // ListBox re-renders synchronously via its own combineLatest subscription,
            // but that subscription fires in the same microtask. Use Promise.resolve()
            // to run after ListBox's itemsSub has completed.
            Promise.resolve().then(() => {
                Array.from(ulEl.children).forEach((li, index) => {
                    if (!li.id) {
                        const item = items[index];
                        if (item !== undefined) {
                            (li as HTMLElement).id = `${listboxId}-option-${this.itemIdProvider(item)}`;
                        }
                    }
                });
            });
        }));

        // When ListBox emits a selection (user clicked an item), handle it here
        subs.add(listBoxValue$.subscribe(item => {
            if (item !== null && !isSyncingExternalValue) {
                this.value$?.next(item);
                currentValue$.next(item);
                isExpanded$.next(false);
                const caption = this.itemCaptionProvider(item);
                input.value = caption;
                searchTerm$.next(caption);
            }
        }));

        // Authoritative ID assigner for the focused <li>: runs synchronously so aria-activedescendant
        // is correct at the same tick focusedIndex$ changes. The Promise.resolve() block in the
        // filteredItems$ subscription covers IDs for non-focused items (deferred until after ListBox renders).
        subs.add(focusedIndex$.subscribe(idx => {
            if (idx >= 0) {
                // Assign ID to the focused li if not already set
                const li = ulEl.children[idx] as HTMLElement | undefined;
                if (li) {
                    if (!li.id) {
                        const item = currentItems[idx];
                        if (item !== undefined) {
                            li.id = `${listboxId}-option-${this.itemIdProvider(item)}`;
                        }
                    }
                    if (li.id) {
                        input.setAttribute('aria-activedescendant', li.id);
                    }
                    li.scrollIntoView?.({ block: 'nearest' });
                }
            } else {
                input.removeAttribute('aria-activedescendant');
            }
        }));

        const popover = new PopoverBuilder()
            .withAnchor(inputContainer)
            .withContent({ build: () => popoverContent })
            .withWidth(mappedListWidth$)
            .withOnClose(() => isExpanded$.next(false))
            .withClass('max-w-[300px]');

        if (isGlass) popover.asGlass();

        subs.add(style$.subscribe(style => {
            // Update input container base style
            Object.values(STYLE_MAP).forEach(cls => {
                cls.split(' ').forEach(c => inputContainer.classList.remove(c));
            });
            STYLE_MAP[style].split(' ').forEach(c => inputContainer.classList.add(c));

            if (isGlass) {
                inputContainer.classList.add('glass-effect');
                inputContainer.classList.remove('bg-secondary-container');

                const glassLabelClasses = ['text-gray-900', 'dark:text-white'];
                const glassDescClasses = ['text-gray-600', 'dark:text-white/60'];

                const standardCaptionClasses = ['text-on-surface-variant'];
                const standardInputClasses = ['text-on-surface'];
                const standardIconClasses = ['text-on-surface-variant'];

                captionElement.classList.remove(...standardCaptionClasses);
                captionElement.classList.add(...glassLabelClasses);

                input.classList.remove(...standardInputClasses);
                input.classList.add(...glassLabelClasses);

                iconContainer.classList.remove(...standardIconClasses);
                iconContainer.classList.add(...glassDescClasses);
            } else {
                inputContainer.classList.remove('glass-effect');

                const glassLabelClasses = ['text-gray-900', 'dark:text-white'];
                const glassDescClasses = ['text-gray-600', 'dark:text-white/60'];

                captionElement.classList.add('text-on-surface-variant');
                captionElement.classList.remove(...glassLabelClasses);

                input.classList.add('text-on-surface');
                input.classList.remove(...glassLabelClasses);

                iconContainer.classList.add('text-on-surface-variant');
                iconContainer.classList.remove(...glassDescClasses);
            }
        }));

        if (this.error$) {
            subs.add(this.error$.subscribe(text => {
                error.textContent = text;
                error.classList.toggle('hidden', !text);
                const hasError = !!text;
                inputContainer.classList.toggle('outline', hasError);
                inputContainer.classList.toggle('outline-1', hasError);
                inputContainer.classList.toggle('-outline-offset-1', hasError);
                inputContainer.classList.toggle('outline-error', hasError);
                inputContainer.classList.toggle('focus-within:outline-error', hasError);
                inputContainer.classList.toggle('shadow-[inset_0_-1px_0_0_var(--md-sys-color-error)]', hasError);
                inputContainer.classList.toggle('focus-within:shadow-[inset_0_-1px_0_0_var(--md-sys-color-error)]', hasError);
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

        subs.add(isExpanded$.pipe(distinctUntilChanged()).subscribe(expanded => {
            input.setAttribute('aria-expanded', expanded.toString());
            if (expanded) {
                popover.show();
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
                popover.close();
                isFiltering$.next(false);
                focusedIndex$.next(-1);
            }
        }));

        if (this.value$) {
            subs.add(this.value$.pipe(distinctUntilChanged()).subscribe(val => {
                currentValue$.next(val || null);
                // Sync selection state to ListBox so the selected item renders highlighted
                isSyncingExternalValue = true;
                listBoxValue$.next(val || null);
                isSyncingExternalValue = false;
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
            } else if (e.key === 'Enter') {
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

        registerDestroy(container, () => {
            subs.unsubscribe();
        });

        return container;
    }
}
