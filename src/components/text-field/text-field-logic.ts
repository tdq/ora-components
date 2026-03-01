import { Observable, Subject, BehaviorSubject, combineLatest, of, fromEvent, Subscription } from 'rxjs';
import { map, distinctUntilChanged, startWith } from 'rxjs/operators';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { registerDestroy } from '@/core/destroyable-element';

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

const BASE_INPUT_CLASSES = 'flex-1 min-w-0 bg-transparent outline-none transition-all body-large placeholder:text-on-surface-variant text-on-surface disabled:opacity-38 disabled:cursor-not-allowed h-full';

function getValidationClasses(error: string): string {
    if (!error) return '';
    return 'outline-error focus-within:outline-error text-error';
}

function createErrorIcon(errorText: string): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'flex items-center justify-center w-6 h-6 rounded-full hover:bg-black/5 transition-colors focus:outline-none';
    button.setAttribute('aria-label', `Error: ${errorText}`);
    button.innerHTML = `
        <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current text-error">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
    `;

    const popover = document.createElement('div');
    popover.setAttribute('popover', 'auto');
    popover.className = 'bg-error text-on-error md-label-small px-3 py-2 rounded-small shadow-elevation-2 max-w-xs';
    popover.textContent = errorText;
    document.body.appendChild(popover);

    button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = button.getBoundingClientRect();
        popover.style.position = 'absolute';
        popover.style.margin = '0';
        popover.style.left = `${rect.left + rect.width / 2}px`;
        popover.style.top = `${rect.top - 8}px`;
        popover.style.transform = 'translate(-50%, -100%)';

        if ((popover as any).showPopover) {
            (popover as any).showPopover();
        } else {
            popover.style.display = 'block';
        }
    };

    registerDestroy(button, () => popover.remove());

    return button;
}

interface TextFieldConfig {
    value$?: Subject<string>;
    placeholder$: Observable<string>;
    enabled$: Observable<boolean>;
    style$: Observable<TextFieldStyle>;
    error$: Observable<string>;
    label$: Observable<string>;
    className$: Observable<string>;
    isGlass: boolean;
    isPassword: boolean;
    isEmail: boolean;
    isInlineError: boolean;
    prefix$: Observable<HTMLElement | string>;
    suffix$: Observable<HTMLElement | string>;
    focusSubject: Subject<FocusEvent>;
    blurSubject: Subject<FocusEvent>;
    changeSubject: Subject<Event>;
}

export function buildTextField(config: TextFieldConfig): HTMLElement {
    const {
        value$,
        placeholder$,
        enabled$,
        style$,
        error$,
        label$,
        className$,
        isGlass,
        isPassword,
        isEmail,
        isInlineError,
        prefix$,
        suffix$,
        focusSubject,
        blurSubject,
        changeSubject
    } = config;

    const id = generateId();
    const errorId = `${id}-error`;
    const subs = new Subscription();

    const container = document.createElement('div');
    container.className = 'flex flex-col w-full group';

    const label = document.createElement('label');
    label.htmlFor = id;
    label.className = 'md-label-small text-on-surface-variant px-4 mb-1 transition-all duration-200';
    container.appendChild(label);

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'relative flex items-center gap-2 px-4 transition-all duration-200 h-[48px]';
    container.appendChild(inputWrapper);

    const leadingIconContainer = document.createElement('div');
    leadingIconContainer.className = 'flex items-center justify-center text-on-surface-variant hidden';
    inputWrapper.appendChild(leadingIconContainer);

    const prefix = document.createElement('span');
    prefix.className = 'body-large text-on-surface-variant select-none';
    inputWrapper.appendChild(prefix);

    const input = document.createElement('input');
    input.id = id;
    inputWrapper.appendChild(input);

    const suffix = document.createElement('span');
    suffix.className = 'body-large text-on-surface-variant select-none';
    inputWrapper.appendChild(suffix);

    const trailingIconContainer = document.createElement('div');
    trailingIconContainer.className = 'flex items-center justify-center text-on-surface-variant';
    inputWrapper.appendChild(trailingIconContainer);

    const activeIndicator = document.createElement('div');
    activeIndicator.className = 'absolute bottom-0 left-0 right-0 h-[1px] bg-outline-variant transition-all duration-200 origin-center scale-x-100 group-focus-within:h-[2px] group-focus-within:bg-primary';
    inputWrapper.appendChild(activeIndicator);

    const footer = document.createElement('div');
    footer.className = 'flex justify-between px-4 min-h-[20px] mt-1';
    container.appendChild(footer);

    const supportText = document.createElement('span');
    supportText.className = 'md-label-small transition-all duration-200';
    supportText.setAttribute('aria-live', 'polite');
    footer.appendChild(supportText);

    const passwordType$ = new BehaviorSubject<string>('password');
    let isPasswordVisible = false;

    const visualState$ = combineLatest({
        style: style$,
        extraClass: className$,
        errorText: error$.pipe(startWith('')),
        enabled: enabled$,
        placeholder: placeholder$,
        label: label$,
        prefix: prefix$.pipe(startWith('')),
        suffix: suffix$.pipe(startWith('')),
        currentValue: (value$ || of('')).pipe(startWith('')),
        passwordType: passwordType$
    });

    subs.add(visualState$.subscribe(state => {
        label.textContent = state.label;
        label.classList.toggle('hidden', !state.label);
        label.classList.toggle('text-error', !!state.errorText);
        label.classList.toggle('text-primary', !state.errorText && input === document.activeElement);

        const showErrorMessage = !!state.errorText;

        supportText.textContent = isInlineError ? '' : state.errorText;
        supportText.id = errorId;
        supportText.classList.toggle('text-error', true);
        supportText.classList.toggle('hidden', isInlineError || !showErrorMessage);

        footer.classList.toggle('hidden', isInlineError && !showErrorMessage);
        if (isInlineError) {
            footer.style.minHeight = '0px';
            footer.style.height = '0px';
            footer.style.marginTop = '0px';
        } else {
            footer.style.minHeight = '20px';
            footer.style.height = 'auto';
            footer.style.marginTop = '4px';
        }

        input.setAttribute('aria-invalid', showErrorMessage ? 'true' : 'false');
        if (showErrorMessage) input.setAttribute('aria-describedby', errorId);
        else input.removeAttribute('aria-describedby');

        input.disabled = !state.enabled;
        input.placeholder = state.placeholder;
        input.type = isPassword ? state.passwordType : (isEmail ? 'email' : 'text');

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
        };

        updateIcon(prefix, state.prefix);
        updateIcon(suffix, state.suffix);

        if (isInlineError && showErrorMessage) {
            updateIcon(trailingIconContainer, createErrorIcon(state.errorText));
        } else if (isPassword) {
            const toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'flex items-center justify-center w-6 h-6 rounded-full hover:bg-black/5 transition-colors focus:outline-none text-on-surface-variant';
            toggleBtn.innerHTML = isPasswordVisible
                ? '<svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.82l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.74-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.03 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.34-1.2l3.33 3.33.03-.4c0-1.66-1.34-3-3-3l-.4.07z"/></svg>'
                : '<svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
            toggleBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                isPasswordVisible = !isPasswordVisible;
                passwordType$.next(isPasswordVisible ? 'text' : 'password');
            };
            updateIcon(trailingIconContainer, toggleBtn);
        } else {
            updateIcon(trailingIconContainer, null);
        }

        const validationClasses = getValidationClasses(state.errorText);
        input.className = BASE_INPUT_CLASSES;

        inputWrapper.className = cn(
            'relative flex items-center gap-2 px-4 transition-all duration-200 h-[48px]',
            state.extraClass,
            validationClasses
        );

        if (isGlass) {
            inputWrapper.classList.add('glass-effect', 'focus-within:bg-white/20');
            inputWrapper.classList.add(state.style === TextFieldStyle.OUTLINED ? 'rounded-small' : 'rounded-t-small');
            activeIndicator.classList.add('hidden');
            label.className = cn(label.className, 'text-gray-900 dark:text-white');
            input.className = cn(input.className, 'text-gray-900 dark:text-white');
        } else {
            STYLE_MAP[state.style].split(' ').forEach(c => inputWrapper.classList.add(c));
            if (state.style === TextFieldStyle.TONAL) {
                activeIndicator.classList.remove('hidden');
                activeIndicator.classList.toggle('bg-error', !!state.errorText);
                activeIndicator.classList.toggle('bg-outline-variant', !state.errorText);
            } else {
                activeIndicator.classList.add('hidden');
            }
        }
    }));

    if (value$) {
        subs.add(value$.pipe(distinctUntilChanged()).subscribe(val => {
            if (input.value !== val) input.value = val;
        }));

        subs.add(fromEvent(input, 'input').pipe(
            map(e => (e.target as HTMLInputElement).value),
            distinctUntilChanged()
        ).subscribe(val => {
            value$.next(val);
            if (isEmail) {
                // We don't auto-set error observable as per requirements, but we can do native check
                // Actually requirements say "sets input type="email" and enables native validation but does not auto-set error observable"
            }
        }));
    }

    subs.add(fromEvent<FocusEvent>(input, 'focus').subscribe(e => focusSubject.next(e)));
    subs.add(fromEvent<FocusEvent>(input, 'blur').subscribe(e => blurSubject.next(e)));
    subs.add(fromEvent<Event>(input, 'change').subscribe(e => changeSubject.next(e)));

    registerDestroy(container, () => subs.unsubscribe());

    return container;
}