import { Observable, Subject, combineLatest, of, fromEvent, BehaviorSubject, Subscription } from 'rxjs';
import { map, distinctUntilChanged, startWith } from 'rxjs/operators';
import { ComponentBuilder } from '../../core/component-builder';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { registerDestroy } from '@/core/destroyable-element';
import { Validators, type Validator } from '../../utils/validators';

export enum TextFieldStyle {
    TONAL = 'tonal',
    OUTLINED = 'outlined'
}

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

let nextId = 0;
const generateId = () => `text-field-${nextId++}`;

const STYLE_MAP: Record<TextFieldStyle, string> = {
    [TextFieldStyle.TONAL]: 'bg-surface-variant rounded-t-small',
    [TextFieldStyle.OUTLINED]: 'bg-transparent rounded-small outline outline-1 -outline-offset-1 outline-outline focus-within:outline-2 focus-within:outline-primary',
};

const BASE_INPUT_CLASSES = 'flex-1 min-w-0 bg-transparent outline-none transition-all body-large placeholder:text-on-surface-variant text-on-surface disabled:opacity-38 disabled:cursor-not-allowed';

export class TextFieldBuilder implements ComponentBuilder {
    private value$?: Subject<string>;
    private placeholder$ = of('');
    private enabled$ = of(true);
    private style$ = of(TextFieldStyle.TONAL);
    private error$ = of('');
    private internalError$ = new BehaviorSubject<string>('');
    private validators: Validator[] = [];
    private label$ = of('');
    private helperText$ = of('');
    private className$ = of('');
    private isGlass: boolean = false;
    private type$ = new BehaviorSubject<string>('text');
    private name$ = of('');
    private required$ = of(false);
    private readOnly$ = of(false);
    private autocomplete$ = of('off');
    private maxLength$ = of<number | undefined>(undefined);
    private characterCounter$ = of(false);

    private leadingIcon$?: Observable<HTMLElement | string>;
    private trailingIcon$?: Observable<HTMLElement | string>;
    private prefix$ = of('');
    private suffix$ = of('');

    private focusSubject = new Subject<FocusEvent>();
    private blurSubject = new Subject<FocusEvent>();
    private changeSubject = new Subject<Event>();

    asGlass(isGlass: boolean = true): TextFieldBuilder {
        this.isGlass = isGlass;
        return this;
    }

    asPassword(): TextFieldBuilder {
        this.type$.next('password');
        return this;
    }

    asEmail(): TextFieldBuilder {
        this.type$.next('email');
        return this;
    }

    withValidator(validator: Validator): TextFieldBuilder {
        this.validators.push(validator);
        return this;
    }

    withEmailValidation(message: string = 'Invalid email address'): TextFieldBuilder {
        return this.withValidator(Validators.email(message));
    }

    withHelperText(text: Observable<string>): TextFieldBuilder {
        this.helperText$ = text;
        return this;
    }

    withLeadingIcon(icon: Observable<HTMLElement | string>): TextFieldBuilder {
        this.leadingIcon$ = icon;
        return this;
    }

    withTrailingIcon(icon: Observable<HTMLElement | string>): TextFieldBuilder {
        this.trailingIcon$ = icon;
        return this;
    }

    withPrefix(text: Observable<string>): TextFieldBuilder {
        this.prefix$ = text;
        return this;
    }

    withSuffix(text: Observable<string>): TextFieldBuilder {
        this.suffix$ = text;
        return this;
    }

    withMaxLength(max: number): TextFieldBuilder {
        this.maxLength$ = of(max);
        this.withValidator(Validators.maxLength(max));
        return this;
    }

    withCharacterCounter(enabled: boolean = true): TextFieldBuilder {
        this.characterCounter$ = of(enabled);
        return this;
    }

    withPasswordToggle(): TextFieldBuilder {
        this.asPassword();
        const toggleIcon$ = this.type$.pipe(
            map(type => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'flex items-center justify-center w-6 h-6 rounded-full hover:bg-black/5 transition-colors focus:outline-none';
                button.setAttribute('aria-label', type === 'password' ? 'Show password' : 'Hide password');
                
                // Simplified icon representation
                button.innerHTML = type === 'password'
                    ? '<svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>'
                    : '<svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.82l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.74-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.03 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.34-1.2l3.33 3.33.03-.4c0-1.66-1.34-3-3-3l-.4.07z"/></svg>';
                
                button.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.type$.next(this.type$.value === 'password' ? 'text' : 'password');
                };
                return button;
            })
        );
        this.withTrailingIcon(toggleIcon$);
        return this;
    }

    withName(name: string): TextFieldBuilder {
        this.name$ = of(name);
        return this;
    }

    withRequired(required: Observable<boolean> = of(true)): TextFieldBuilder {
        this.required$ = required;
        return this;
    }

    withReadOnly(readOnly: Observable<boolean> = of(true)): TextFieldBuilder {
        this.readOnly$ = readOnly;
        return this;
    }

    withAutocomplete(autocomplete: string): TextFieldBuilder {
        this.autocomplete$ = of(autocomplete);
        return this;
    }

    withValue(value: Subject<string>): TextFieldBuilder {
        this.value$ = value;
        return this;
    }

    withPlaceholder(placeholder: Observable<string>): TextFieldBuilder {
        this.placeholder$ = placeholder;
        return this;
    }

    withEnabled(enabled: Observable<boolean>): TextFieldBuilder {
        this.enabled$ = enabled;
        return this;
    }

    withStyle(style: Observable<TextFieldStyle>): TextFieldBuilder {
        this.style$ = style;
        return this;
    }

    withError(error: Observable<string>): TextFieldBuilder {
        this.error$ = error;
        return this;
    }

    withLabel(label: Observable<string>): TextFieldBuilder {
        this.label$ = label;
        return this;
    }

    withClass(className: Observable<string>): TextFieldBuilder {
        this.className$ = className;
        return this;
    }

    onFocus(): Observable<FocusEvent> {
        return this.focusSubject.asObservable();
    }

    onBlur(): Observable<FocusEvent> {
        return this.blurSubject.asObservable();
    }

    onChange(): Observable<Event> {
        return this.changeSubject.asObservable();
    }

    private getValidationClasses(error: string): string {
        if (!error) return '';
        return 'outline-error focus-within:outline-error text-error';
    }

    build(): HTMLElement {
        const id = generateId();
        const helperId = `${id}-helper`;
        const errorId = `${id}-error`;
        const subs = new Subscription();

        const container = document.createElement('div');
        container.className = 'flex flex-col gap-1 w-full group';

        const label = document.createElement('label');
        label.htmlFor = id;
        label.className = 'md-label-small text-on-surface-variant px-4 transition-all duration-200';
        container.appendChild(label);

        // Input Wrapper (for icons and MD3 states)
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'relative flex items-center gap-2 px-4 transition-all duration-200 min-h-px-48';
        container.appendChild(inputWrapper);

        // Leading Icon Slot
        const leadingIconContainer = document.createElement('div');
        leadingIconContainer.className = 'flex items-center justify-center text-on-surface-variant';
        inputWrapper.appendChild(leadingIconContainer);

        // Prefix
        const prefix = document.createElement('span');
        prefix.className = 'body-large text-on-surface-variant select-none';
        inputWrapper.appendChild(prefix);

        const input = document.createElement('input');
        input.id = id;
        inputWrapper.appendChild(input);

        // Suffix
        const suffix = document.createElement('span');
        suffix.className = 'body-large text-on-surface-variant select-none';
        inputWrapper.appendChild(suffix);

        // Trailing Icon Slot
        const trailingIconContainer = document.createElement('div');
        trailingIconContainer.className = 'flex items-center justify-center text-on-surface-variant';
        inputWrapper.appendChild(trailingIconContainer);

        // MD3 Active Indicator (Bottom Border)
        const activeIndicator = document.createElement('div');
        activeIndicator.className = 'absolute bottom-0 left-0 right-0 h-[1px] bg-outline-variant transition-all duration-200 origin-center scale-x-100 group-focus-within:h-[2px] group-focus-within:bg-primary';
        inputWrapper.appendChild(activeIndicator);

        // Footer (Helper text, Error text, Character counter)
        const footer = document.createElement('div');
        footer.className = 'flex justify-between px-4 min-h-[16px]';
        container.appendChild(footer);

        const supportText = document.createElement('span');
        supportText.className = 'md-label-small transition-all duration-200';
        supportText.setAttribute('aria-live', 'polite');
        footer.appendChild(supportText);

        const charCounter = document.createElement('span');
        charCounter.className = 'md-label-small text-on-surface-variant ml-auto';
        footer.appendChild(charCounter);

        // Visual state stream
        const visualState$ = combineLatest({
            style: this.style$,
            extraClass: this.className$,
            errorText: combineLatest([this.error$, this.internalError$]).pipe(
                map(([err, internalErr]) => err || internalErr),
                startWith('')
            ),
            helperText: this.helperText$.pipe(startWith('')),
            enabled: this.enabled$,
            type: this.type$,
            placeholder: this.placeholder$,
            label: this.label$,
            name: this.name$,
            required: this.required$,
            readOnly: this.readOnly$,
            autocomplete: this.autocomplete$,
            maxLength: this.maxLength$,
            showCounter: this.characterCounter$,
            prefix: this.prefix$.pipe(startWith('')),
            suffix: this.suffix$.pipe(startWith('')),
            leadingIcon: (this.leadingIcon$ || of<HTMLElement | string | null>(null)).pipe(startWith<HTMLElement | string | null>(null)),
            trailingIcon: (this.trailingIcon$ || of<HTMLElement | string | null>(null)).pipe(startWith<HTMLElement | string | null>(null)),
            currentValue: (this.value$ || of('')).pipe(startWith(''))
        });

        subs.add(visualState$.subscribe(state => {
            // Update label
            label.textContent = state.label;
            label.classList.toggle('hidden', !state.label);
            label.classList.toggle('text-error', !!state.errorText);
            label.classList.toggle('text-primary', !state.errorText && input === document.activeElement);

            // Update Support Text (Helper/Error)
            const showErrorMessage = !!state.errorText;
            supportText.textContent = showErrorMessage ? state.errorText : state.helperText;
            supportText.id = showErrorMessage ? errorId : helperId;
            supportText.classList.toggle('text-error', showErrorMessage);
            supportText.classList.toggle('text-on-surface-variant', !showErrorMessage);
            supportText.classList.toggle('hidden', !state.errorText && !state.helperText);

            // Character Counter
            const currentLength = state.currentValue.length;
            if (state.showCounter && state.maxLength !== undefined) {
                charCounter.textContent = `${currentLength} / ${state.maxLength}`;
                charCounter.classList.remove('hidden');
            } else {
                charCounter.classList.add('hidden');
            }

            // A11y
            const describedBy = [
                showErrorMessage ? errorId : '',
                state.helperText ? helperId : ''
            ].filter(Boolean).join(' ');
            
            input.setAttribute('aria-invalid', showErrorMessage ? 'true' : 'false');
            input.setAttribute('aria-describedby', describedBy);
            input.disabled = !state.enabled;
            input.required = state.required;
            input.readOnly = state.readOnly;
            input.name = state.name;
            input.setAttribute('autocomplete', state.autocomplete);
            input.placeholder = state.placeholder;
            if (state.maxLength !== undefined) input.maxLength = state.maxLength;

            // Prefix/Suffix
            prefix.textContent = state.prefix;
            prefix.classList.toggle('hidden', !state.prefix);
            suffix.textContent = state.suffix;
            suffix.classList.toggle('hidden', !state.suffix);

            // Icons
            const updateIcon = (container: HTMLElement, content: HTMLElement | string | null) => {
                container.innerHTML = '';
                if (!content) {
                    container.classList.add('hidden');
                    return;
                }
                container.classList.remove('hidden');
                if (typeof content === 'string') {
                    container.innerHTML = content;
                } else {
                    container.appendChild(content);
                }
                // Ensure decorative icons are hidden from screen readers
                if (container.firstChild instanceof Element && !container.firstChild.hasAttribute('aria-label')) {
                    container.setAttribute('aria-hidden', 'true');
                }
            };
            updateIcon(leadingIconContainer, state.leadingIcon);
            updateIcon(trailingIconContainer, state.trailingIcon);

            // Type handling
            input.type = state.type;

            // Styling
            const validationClasses = this.getValidationClasses(state.errorText);
            
            input.className = cn(
                BASE_INPUT_CLASSES,
                'py-3'
            );

            inputWrapper.className = cn(
                'relative flex items-center gap-2 px-4 transition-all duration-200',
                'min-h-px-48',
                state.extraClass,
                validationClasses
            );

            if (this.isGlass) {
                inputWrapper.classList.add('glass-effect', 'focus-within:bg-white/20');
                if (state.style === TextFieldStyle.OUTLINED) {
                    inputWrapper.classList.add('rounded-small');
                } else {
                    inputWrapper.classList.add('rounded-t-small');
                }
                activeIndicator.classList.add('hidden');

                // Apply glass text colors
                const glassTextClasses = ['text-on-primary-container', 'dark:text-white'];
                const standardTextClasses = ['text-on-surface', 'text-on-surface-variant'];

                [label, input, prefix, suffix, leadingIconContainer, trailingIconContainer, supportText, charCounter].forEach(el => {
                    el.classList.remove(...standardTextClasses);
                    el.classList.add(...glassTextClasses);
                });

                // Ensure label uses glass color even when focused/error unless specifically needed otherwise
                if (!state.errorText) {
                    label.classList.remove('text-primary'); // Remove focus color
                }

            } else {
                STYLE_MAP[state.style].split(' ').forEach(c => inputWrapper.classList.add(c));
                
                // Revert text colors
                const glassTextClasses = ['text-on-primary-container', 'dark:text-white'];
                
                // Reset specific elements to their defaults
                label.classList.remove(...glassTextClasses);
                label.classList.add('text-on-surface-variant');

                input.classList.remove(...glassTextClasses);
                input.classList.add('text-on-surface');

                [prefix, suffix, leadingIconContainer, trailingIconContainer, charCounter].forEach(el => {
                    el.classList.remove(...glassTextClasses);
                    el.classList.add('text-on-surface-variant');
                });

                supportText.classList.remove(...glassTextClasses);
                if (!state.errorText) {
                    supportText.classList.add('text-on-surface-variant');
                }

                if (state.style === TextFieldStyle.TONAL) {
                    activeIndicator.classList.remove('hidden');
                    activeIndicator.classList.toggle('bg-error', !!state.errorText);
                    activeIndicator.classList.toggle('bg-outline-variant', !state.errorText);
                } else {
                    activeIndicator.classList.add('hidden');
                }
            }
        }));

        // Value handling
        if (this.value$) {
            subs.add(this.value$.pipe(
                distinctUntilChanged()
            ).subscribe(val => {
                if (input.value !== val) {
                    input.value = val;
                    // Trigger character counter update
                    this.changeSubject.next(new Event('input'));
                }
            }));

            subs.add(fromEvent(input, 'input').pipe(
                map(e => (e.target as HTMLInputElement).value),
                distinctUntilChanged()
            ).subscribe(val => {
                this.value$?.next(val);
                
                // Real-time validation
                let errorMsg = '';
                if (this.validators.length > 0) {
                    for (const validator of this.validators) {
                        const result = validator(val);
                        if (result) {
                            errorMsg = result;
                            break;
                        }
                    }
                }
                this.internalError$.next(errorMsg);
            }));
        }

        // Event handling
        subs.add(fromEvent<FocusEvent>(input, 'focus').subscribe(e => {
            this.focusSubject.next(e);
            // Force re-evaluation of label color
            this.internalError$.next(this.internalError$.value);
        }));
        subs.add(fromEvent<FocusEvent>(input, 'blur').subscribe(e => {
            this.blurSubject.next(e);
            this.internalError$.next(this.internalError$.value);
        }));
        subs.add(fromEvent<Event>(input, 'change').subscribe(e => this.changeSubject.next(e)));

        registerDestroy(container, () => subs.unsubscribe());

        return container;
    }
}
