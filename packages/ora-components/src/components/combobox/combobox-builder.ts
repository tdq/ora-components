import {
    Observable,
    Subject,
    BehaviorSubject,
    combineLatest,
    map,
    distinctUntilChanged,
    Subscription,
    of,
    merge,
    timer
} from 'rxjs';
import { shareReplay, switchMap, take, startWith } from 'rxjs/operators';
import { ComponentBuilder } from '../../core/component-builder';
import { registerDestroy } from '@/core/destroyable-element';
import { ComboBoxStyle } from './types';
import { cn, STYLE_MAP } from './styles';
import { renderComboBoxInput } from './combobox-input';
import { PopoverBuilder } from '../component-parts/popover';
import { ErrorPopoverBuilder } from '../component-parts/error-popover';
import { ListBoxBuilder } from '../listbox/listbox';
import { ListBoxStyle } from '../listbox/types';
import { createOptimizedPipeline, GatedObserver } from '../../utils/optimized-pipeline';

export { ComboBoxStyle };

/** Adaptive filter debounce applied when the item list is >= 100 items. Override via withFilterDebounce. */
const DEFAULT_FILTER_DEBOUNCE_MS = 150;
/** Item count threshold above which filtering is debounced instead of synchronous. */
const FILTER_DEBOUNCE_ITEM_THRESHOLD = 100;

/** Public API exposed on the element returned by ComboBoxBuilder.build(). */
export interface ComboBoxElement<ITEM> extends HTMLElement {
    /** Selects an item programmatically: updates text, highlight, emits value, closes the popover. */
    select(item: ITEM | null): void;
    /** Opens the dropdown. */
    open(): void;
    /** Closes the dropdown. */
    close(): void;
}

export class ComboBoxBuilder<ITEM> implements ComponentBuilder {
    private items$?: Observable<ITEM[]>;
    private value$?: Observable<ITEM | null>;
    private valueWriter?: Subject<ITEM | null>;
    private itemCaptionProvider: (item: ITEM) => string = (item) => String(item);
    private itemIdProvider: (item: ITEM) => string | number = (item) => String(item);
    private placeholder?: string;
    private caption$?: Observable<string>;
    private ariaLabel$?: Observable<string>;
    private error$?: Observable<string>;
    private enabled$?: Observable<boolean>;
    private style$?: Observable<ComboBoxStyle>;
    private className$?: Observable<string>;
    private visible$?: Observable<boolean>;
    private listWidth$?: Observable<string>;
    private maxHeight$: Observable<number> = of(256);
    private filterDebounceMs?: number;
    private isGlass: boolean = false;
    private isInlineError: boolean = false;

    withItems(items: Observable<ITEM[]>): ComboBoxBuilder<ITEM> {
        this.items$ = items;
        return this;
    }

    withListWidth(width: Observable<string>): ComboBoxBuilder<ITEM> {
        this.listWidth$ = width;
        return this;
    }

    /**
     * Sets the value driving the dropdown selection/highlight.
     * Accepts a plain Observable (read-only: displayed text and ListBox highlight follow
     * the stream, but user selections are NOT written back to it) or a Subject (write-back
     * on user selection, as before).
     */
    withValue(value: Observable<ITEM | null> | Subject<ITEM | null>): ComboBoxBuilder<ITEM> {
        this.value$ = value;
        this.valueWriter = value instanceof Subject ? value : undefined;
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

    /** Sets the accessible name used when no caption is set. Priority: caption > ariaLabel > placeholder. */
    withAriaLabel(label: string | Observable<string>): ComboBoxBuilder<ITEM> {
        this.ariaLabel$ = typeof label === 'string' ? of(label) : label;
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

    /**
     * Displays errors inline — as a red outline on the input plus an error icon whose
     * popover shows the message — instead of as support text below the field.
     * Same behaviour as `TextFieldBuilder.asInlineError()`.
     */
    asInlineError(): ComboBoxBuilder<ITEM> {
        this.isInlineError = true;
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

    /** Preferred popup list height in px (or reactive); clamped to viewport space. Default 256. */
    withMaxHeight(maxHeight: number | Observable<number>): ComboBoxBuilder<ITEM> {
        this.maxHeight$ = typeof maxHeight === 'number' ? of(maxHeight) : maxHeight;
        return this;
    }

    /** Overrides the default 150ms debounce applied when the item list is >= 100 items. 0 disables debouncing. */
    withFilterDebounce(ms: number): ComboBoxBuilder<ITEM> {
        this.filterDebounceMs = ms;
        return this;
    }

    build(): ComboBoxElement<ITEM> {
        const instanceId = `cb-${Math.random().toString(36).substring(2, 9)}`;
        const listboxId = `${instanceId}-listbox`;

        const container = document.createElement('div');
        container.className = 'flex flex-col gap-px-4 w-full relative';

        const captionElement = document.createElement('span');
        captionElement.id = `${instanceId}-caption`;
        captionElement.className = 'md-label-small text-on-surface-variant px-px-16 hidden';
        container.appendChild(captionElement);

        const { container: inputContainer, input, iconContainer } = renderComboBoxInput({
            placeholder: this.placeholder,
            ariaControls: listboxId
        });
        container.appendChild(inputContainer);

        // Inline-error slot: sits between the text input and the chevron; holds the
        // ErrorPopover trigger while an error is present (asInlineError only).
        const errorIconContainer = document.createElement('div');
        errorIconContainer.className = 'flex items-center justify-center pr-px-4 z-10 hidden';
        inputContainer.insertBefore(errorIconContainer, iconContainer);

        const error = document.createElement('span');
        error.className = 'md-label-small text-error px-px-16 hidden';
        container.appendChild(error);

        // Internal State
        const searchTerm$ = new BehaviorSubject<string>('');
        const isFiltering$ = new BehaviorSubject<boolean>(false);
        const isExpanded$ = new BehaviorSubject<boolean>(false);
        const focusedIndex$ = new BehaviorSubject<number>(-1);
        const items$ = this.items$ || new BehaviorSubject<ITEM[]>([]);

        // Gate the raw items source on the always-visible combobox container.
        // This is the single gating point — the inner ListBox will detect the
        // GatedObserver brand and skip re-gating the filtered stream.
        const gatedItems$ = createOptimizedPipeline(container, items$).pipe(
            shareReplay({ bufferSize: 1, refCount: true })
        );

        const currentValue$ = new BehaviorSubject<ITEM | null>(null);
        const listBoxValue$ = new Subject<ITEM | null>();
        let isSyncingExternalValue = false;

        // Track the latest item count (without a second subscription cost — gatedItems$ is
        // shareReplay'd) to drive the adaptive filter debounce below.
        let latestItemsLength = 0;

        // Manual "flush" trigger: Enter/ArrowUp/ArrowDown resolve any pending debounce
        // immediately with the current raw term, so a fast "type + Enter" never acts on a
        // stale filtered list.
        const flushNow$ = new Subject<void>();

        const debouncedSearchTerm$: Observable<string> = searchTerm$.pipe(
            distinctUntilChanged(),
            switchMap(term => {
                const ms = term === ''
                    ? 0
                    : (latestItemsLength >= FILTER_DEBOUNCE_ITEM_THRESHOLD
                        ? (this.filterDebounceMs ?? DEFAULT_FILTER_DEBOUNCE_MS)
                        : 0);
                if (ms <= 0) return of(term);
                // Whichever resolves first — the debounce timer or an explicit flush — wins.
                return merge(timer(ms), flushNow$).pipe(take(1), map(() => term));
            })
        );

        // Captions are lower-cased once per items emission (cached), not once per keystroke.
        let cachedItemsRef: ITEM[] | null = null;
        let cachedLowerCaptions: string[] = [];

        const filteredItems$ = combineLatest([gatedItems$, debouncedSearchTerm$, isFiltering$]).pipe(
            map(([items, term, isFiltering]) => {
                if (items !== cachedItemsRef) {
                    cachedItemsRef = items;
                    cachedLowerCaptions = items.map(item => this.itemCaptionProvider(item).toLowerCase());
                }
                if (!isFiltering || !term) return items;
                const lowerTerm = term.toLowerCase();
                return items.filter((_item, i) => cachedLowerCaptions[i].includes(lowerTerm));
            }),
            shareReplay({ bufferSize: 1, refCount: true })
        );

        // Subscriptions
        const subs = new Subscription();

        subs.add(gatedItems$.subscribe(items => {
            latestItemsLength = items.length;
        }));

        // Accessible name priority: caption (aria-labelledby) > ariaLabel > placeholder (aria-label).
        // Warn once (dev mode only) when none of the three was CONFIGURED on the builder —
        // this is a config-time check, not a runtime one: an async caption$/ariaLabel$ that
        // simply hasn't emitted yet is still "configured" and must not trigger the warning
        // (it will supply a name once it emits).
        if (!this.caption$ && !this.ariaLabel$ && !this.placeholder
            && (typeof process === 'undefined' || process.env?.NODE_ENV !== 'production')) {
            console.warn('[ComboBoxBuilder] No accessible name provided — use withCaption, withAriaLabel, or withPlaceholder.');
        }
        // Seed both with startWith('') — a caption/ariaLabel Subject that hasn't emitted yet
        // (e.g. withCaption(new Subject())) would otherwise stall combineLatest forever,
        // leaving the input with no aria-label/aria-labelledby.
        const captionText$ = (this.caption$ ?? of('')).pipe(startWith(''));
        const ariaLabelText$ = (this.ariaLabel$ ?? of('')).pipe(startWith(''));
        subs.add(combineLatest([captionText$, ariaLabelText$]).subscribe(([captionText, ariaLabelText]) => {
            captionElement.textContent = captionText;
            captionElement.classList.toggle('hidden', !captionText);
            if (captionText) {
                input.setAttribute('aria-labelledby', captionElement.id);
                input.removeAttribute('aria-label');
            } else {
                input.removeAttribute('aria-labelledby');
                if (ariaLabelText) {
                    input.setAttribute('aria-label', ariaLabelText);
                } else if (this.placeholder) {
                    input.setAttribute('aria-label', this.placeholder);
                } else {
                    input.removeAttribute('aria-label');
                }
            }
        }));

        const style$ = this.style$ || new BehaviorSubject<ComboBoxStyle>(ComboBoxStyle.TONAL);
        const listWidth$ = this.listWidth$ || of('match-input');
        const isGlass = this.isGlass;

        // The popover provides the outer container; ListBox uses BORDERLESS to avoid double borders/backgrounds.
        const mappedListBoxStyle$ = of(ListBoxStyle.BORDERLESS);

        const mappedListWidth$ = listWidth$.pipe(
            map((w: string) => w === 'match-input' ? 'match-anchor' : w)
        );

        // Build ListBox — brand filteredItems$ as GatedObserver so the inner
        // ListBox's instanceof check skips re-gating the already-gated stream.
        // No static max-height class here: the ListBox's scroll element (<ul>) gets its
        // max-height synced reactively from the popover's clamped height below, so the
        // popover never scrolls — only the list does.
        const listBoxBuilder = new ListBoxBuilder<ITEM>()
            .withItems(new GatedObserver(filteredItems$))
            .withValue(listBoxValue$)
            .withFocusedIndex(focusedIndex$)
            .withItemCaptionProvider(this.itemCaptionProvider)
            .withItemIdProvider(this.itemIdProvider)
            .withOptionIdProvider((item) => `${listboxId}-option-${this.itemIdProvider(item)}`)
            .withStyle(mappedListBoxStyle$);

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

        // Point aria-activedescendant at the focused option. The id is computed from the item
        // (matching the ListBox's withOptionIdProvider formula) rather than read off the DOM, so
        // this works even though the ListBox virtualizes and the focused row may only just have
        // been rendered. The ListBox subscribes to the branded filteredItems$ inside its own
        // build() — called above, before any of the subscriptions in this file — so by the time
        // either caller below runs, B11's setItems()/scrollToIndex() has already rendered (and
        // scrolled to) the row and the referenced element is present in the DOM.
        const applyActiveDescendant = (idx: number) => {
            const item = idx >= 0 ? currentItems[idx] : undefined;
            if (item !== undefined) {
                input.setAttribute('aria-activedescendant', `${listboxId}-option-${this.itemIdProvider(item)}`);
            } else {
                input.removeAttribute('aria-activedescendant');
            }
        };

        subs.add(filteredItems$.subscribe(items => {
            currentItems = items;
            // Keep the <ul role="listbox"> visible at all times (needed for aria-controls and
            // accessibility queries). Only toggle the "No results" message.
            // Option <li> ids are assigned by the ListBox itself (see withOptionIdProvider),
            // so the combobox no longer needs to reach into ulEl.children — which is required
            // now that the ListBox virtualizes and only a window of rows is in the DOM.
            noResults.style.display = items.length === 0 ? '' : 'none';

            // Filtering can shrink the list out from under a previously-valid focusedIndex —
            // clamp it so aria-activedescendant never names an item outside the new list
            // (or an unrendered one) and Enter never selects the wrong row.
            const idx = focusedIndex$.value;
            if (idx >= items.length) {
                focusedIndex$.next(items.length > 0 ? items.length - 1 : -1);
            }

            // Filtering can also change WHICH item sits at an in-range index without
            // focusedIndex$'s VALUE changing at all (e.g. focus at 0 naming "Apple", typing
            // narrows the list to ["Banana"] — index 0 is still in range, but now names a
            // different item). The focusedIndex$ subscriber below only fires on an actual
            // index change, so re-derive aria-activedescendant here unconditionally too.
            applyActiveDescendant(focusedIndex$.value);
        }));

        // Emits on the bound value when it is writable (a Subject). Read-only Observables
        // never get written back to. All user-driven selection sites funnel through
        // selectItem() -> emitValue(), so there is exactly one write-back call site.
        const emitValue = (item: ITEM | null) => {
            this.valueWriter?.next(item);
        };

        // Syncs the input's displayed text to an item's caption (or clears it for null),
        // skipping redundant writes. Shared by user-driven selection and external value sync.
        const setDisplayText = (item: ITEM | null) => {
            if (item !== null && item !== undefined) {
                const caption = this.itemCaptionProvider(item);
                if (input.value !== caption) {
                    input.value = caption;
                    searchTerm$.next(caption);
                }
            } else {
                input.value = '';
                searchTerm$.next('');
            }
        };

        // Applies a user-driven selection: updates the ListBox highlight, the input text,
        // writes the value back (if writable), and closes the popover. Used by item clicks
        // (via listBoxValue$), Enter, and the public select() API.
        const selectItem = (item: ITEM | null) => {
            emitValue(item);
            currentValue$.next(item);
            isSyncingExternalValue = true;
            listBoxValue$.next(item);
            isSyncingExternalValue = false;
            setDisplayText(item);
            isExpanded$.next(false);
        };

        // When ListBox emits a selection (user clicked an item), handle it here
        subs.add(listBoxValue$.subscribe(item => {
            if (item !== null && !isSyncingExternalValue) {
                selectItem(item);
            }
        }));

        // Reacts to keyboard-driven focus changes (ArrowUp/Down/Home/End/PageUp/PageDown).
        // The filteredItems$ subscriber above additionally calls applyActiveDescendant
        // directly, since a filter change can alter which item sits at an unchanged index.
        subs.add(focusedIndex$.subscribe(applyActiveDescendant));

        const popover = new PopoverBuilder()
            .withAnchor(inputContainer)
            .withContent({ build: () => popoverContent })
            .withWidth(mappedListWidth$)
            .withMaxHeight(this.maxHeight$)
            // The popover wrapper itself never scrolls (overflow-hidden in popover.ts);
            // it writes its clamped max-height onto the <ul> and nudges the virtualized
            // viewport, so the list is the only scroller.
            .withScrollElement(ulEl)
            .withOnClose(() => isExpanded$.next(false))
            .withClass('max-w-[300px]');

        if (isGlass) popover.asGlass();

        // Popover is built lazily — PopoverBuilder.show() builds on first call if build()
        // wasn't called eagerly. Deferring avoids appending a wrapper to document.body (and
        // registering global listeners) for comboboxes that are built but never opened.
        // The <ul>'s max-height is kept in sync by the popover itself via withScrollElement.

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
                const hasError = !!text;
                error.textContent = this.isInlineError ? '' : text;
                error.classList.toggle('hidden', this.isInlineError || !hasError);
                input.setAttribute('aria-invalid', hasError ? 'true' : 'false');
                if (this.isInlineError) {
                    // Replacing the trigger removes its popover via registerDestroy.
                    errorIconContainer.replaceChildren();
                    errorIconContainer.classList.toggle('hidden', !hasError);
                    if (hasError) {
                        errorIconContainer.appendChild(
                            new ErrorPopoverBuilder().withError(text).build()
                        );
                    }
                }
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
                iconContainer.classList.toggle('pointer-events-none', !enabled);
                iconContainer.setAttribute('aria-disabled', String(!enabled));
                // A list that is open when the field becomes disabled must not stay selectable.
                if (!enabled && isExpanded$.value) {
                    isExpanded$.next(false);
                }
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
            // No distinctUntilChanged: in read-only Observable mode, a local select()/click
            // updates the displayed text without touching the source. If the source later
            // re-emits the SAME value it already held (e.g. to restore the display after a
            // local-only change), distinctUntilChanged would filter that emission out — since
            // it compares against the last value that passed *through this stream*, not
            // against what's currently displayed — and the display would never resync.
            //
            // withValue emissions are authoritative over SELECTION state (currentValue$,
            // ListBox highlight via listBoxValue$, and the aria-activedescendant bookkeeping
            // that reads currentItems/focusedIndex$ elsewhere) and are NEVER suppressed — for
            // both null and non-null values. They are authoritative over the DISPLAYED INPUT
            // TEXT only when the user is not mid-search: while isFiltering$ is true, an
            // external re-emission (even a genuinely new selection made elsewhere) must not
            // wipe out text the user is actively typing. isFiltering$ resets to false when the
            // popup closes, so the two halves re-converge on the next emission after that.
            subs.add(this.value$.subscribe(val => {
                const newVal = val ?? null;

                currentValue$.next(newVal);
                isSyncingExternalValue = true;
                listBoxValue$.next(newVal);
                isSyncingExternalValue = false;

                if (!isFiltering$.value) {
                    setDisplayText(newVal);
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
            if (input.disabled) return;
            isExpanded$.next(!isExpanded$.value);
            input.focus();
        };

        input.onkeydown = (e) => {
            const key = e.key;

            // Flush any pending filter debounce so every navigation/selection key acts on
            // the current typed term, never a stale filtered list.
            if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter'
                || key === 'Home' || key === 'End' || key === 'PageUp' || key === 'PageDown') {
                flushNow$.next();
            }

            const expanded = isExpanded$.value;
            const index = focusedIndex$.value;

            // Shared guard for the jump keys (Home/End/PageUp/PageDown): only act while
            // expanded and non-empty, always preventDefault, then move focus to nextIndex().
            const jumpFocus = (nextIndex: () => number) => {
                if (expanded && currentItems.length > 0) {
                    e.preventDefault();
                    focusedIndex$.next(nextIndex());
                }
            };

            if (key === 'ArrowDown') {
                e.preventDefault();
                if (!expanded) {
                    isExpanded$.next(true);
                } else if (currentItems.length > 0) {
                    const nextIndex = (index + 1) % currentItems.length;
                    focusedIndex$.next(nextIndex);
                }
            } else if (key === 'ArrowUp') {
                e.preventDefault();
                if (!expanded) {
                    isExpanded$.next(true);
                } else if (currentItems.length > 0) {
                    const nextIndex = (index - 1 + currentItems.length) % currentItems.length;
                    focusedIndex$.next(nextIndex);
                }
            } else if (key === 'Home') {
                jumpFocus(() => 0);
            } else if (key === 'End') {
                jumpFocus(() => currentItems.length - 1);
            } else if (key === 'PageUp') {
                jumpFocus(() => Math.max(0, index - 10));
            } else if (key === 'PageDown') {
                // -1 means "before the first row" — land on the first row, not row 9.
                jumpFocus(() => index < 0 ? 0 : Math.min(currentItems.length - 1, index + 10));
            } else if (key === 'Enter') {
                if (expanded && index >= 0 && index < currentItems.length) {
                    e.preventDefault();
                    selectItem(currentItems[index]);
                }
            } else if (key === 'Escape') {
                if (expanded) {
                    e.preventDefault();
                    isExpanded$.next(false);
                }
            }
        };

        registerDestroy(container, () => {
            subs.unsubscribe();
            searchTerm$.complete();
            isFiltering$.complete();
            isExpanded$.complete();
            focusedIndex$.complete();
            currentValue$.complete();
            listBoxValue$.complete();
            flushNow$.complete();
        });

        const element = container as unknown as ComboBoxElement<ITEM>;
        element.select = (item: ITEM | null) => selectItem(item);
        element.open = () => { if (!input.disabled) isExpanded$.next(true); };
        element.close = () => isExpanded$.next(false);

        return element;
    }
}
