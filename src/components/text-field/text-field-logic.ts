import { Observable, Subject, BehaviorSubject, combineLatest, of, fromEvent, Subscription } from 'rxjs';
import { map, distinctUntilChanged, startWith } from 'rxjs/operators';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { registerDestroy } from '@/core/destroyable-element';
import { updateIconContent, createPasswordToggle } from './text-field-icon';
import { createTextFieldError } from './text-field-error';

export enum TextFieldStyle {
    TONAL = 'tonal',
    OUTLINED = 'outlined'
}

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const STYLE_MAP: Record<TextFieldStyle, string> = {
    [TextFieldStyle.TONAL]: 'bg-surface-variant rounded-t-small',
    [TextFieldStyle.OUTLINED]: 'bg-transparent rounded-small outline outline-1 -outline-offset-1 outline-outline focus-within:outline-2 focus-within:outline-primary',
};

const BASE_INPUT_CLASSES = 'flex-1 min-w-0 bg-transparent outline-none transition-all body-large placeholder:text-on-surface-variant text-on-surface disabled:opacity-38 disabled:cursor-not-allowed h-full';

function getValidationClasses(error: string): string {
    if (!error) return '';
    return 'outline outline-2 -outline-offset-2 outline-error focus-within:outline-error text-error';
}

export interface TextFieldConfig {
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

export interface TextFieldElements {
    container: HTMLElement;
    label: HTMLLabelElement;
    input: HTMLInputElement;
    inputWrapper: HTMLElement;
    prefix: HTMLElement;
    suffix: HTMLElement;
    leadingIconContainer: HTMLElement;
    trailingIconContainer: HTMLElement;
    activeIndicator: HTMLElement;
    footer: HTMLElement;
    supportText: HTMLElement;
}

export function buildTextField(config: TextFieldConfig, elements: TextFieldElements): HTMLElement {
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

    const {
        container,
        label,
        input,
        inputWrapper,
        prefix,
        suffix,
        trailingIconContainer,
        activeIndicator,
        footer,
        supportText
    } = elements;

    const errorId = supportText.id;
    const subs = new Subscription();

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

        updateIconContent(prefix, state.prefix);
        updateIconContent(suffix, state.suffix);

        if (isInlineError && showErrorMessage) {
            updateIconContent(trailingIconContainer, createTextFieldError(state.errorText));
        } else if (isPassword) {
            const toggle = createPasswordToggle((visible) => {
                isPasswordVisible = visible;
                passwordType$.next(visible ? 'text' : 'password');
            }, isPasswordVisible);
            updateIconContent(trailingIconContainer, toggle);
        } else {
            updateIconContent(trailingIconContainer, null);
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
        }));
    }

    subs.add(fromEvent<FocusEvent>(input, 'focus').subscribe(e => focusSubject.next(e)));
    subs.add(fromEvent<FocusEvent>(input, 'blur').subscribe(e => blurSubject.next(e)));
    subs.add(fromEvent<Event>(input, 'change').subscribe(e => changeSubject.next(e)));

    registerDestroy(container, () => subs.unsubscribe());

    return container;
}