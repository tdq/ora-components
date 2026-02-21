import { Observable, Subject, combineLatest, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { registerDestroy } from '@/core/destroyable-element';

export enum TextFieldStyle {
    FILLED = 'filled',
    OUTLINED = 'outlined'
}

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const STYLE_MAP: Record<TextFieldStyle, string> = {
    [TextFieldStyle.FILLED]: 'bg-surface-variant rounded-t-small shadow-[inset_0_-1px_0_0_var(--md-sys-color-outline-variant)] focus:shadow-[inset_0_-2px_0_0_var(--md-sys-color-primary)]',
    [TextFieldStyle.OUTLINED]: 'bg-transparent rounded-small ring-1 ring-inset ring-outline focus:ring-2 focus:ring-inset focus:ring-primary',
};

export class TextFieldBuilder implements ComponentBuilder {
    private value$?: Subject<string>;
    private placeholder$?: Observable<string>;
    private enabled$?: Observable<boolean>;
    private style$?: Observable<TextFieldStyle>;
    private error$?: Observable<string>;
    private label$?: Observable<string>;
    private className$?: Observable<string>;
    private isGlass: boolean = false;

    asGlass(isGlass: boolean = true): TextFieldBuilder {
        this.isGlass = isGlass;
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

    build(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'flex flex-col gap-px-4 w-full';

        const label = document.createElement('span');
        label.className = 'md-label-small text-on-surface-variant px-px-16 hidden';
        container.appendChild(label);

        const input = document.createElement('input');
        input.type = 'text';
        input.className = cn(
            'px-px-16 py-px-12 w-full outline-none transition-all body-large placeholder:text-on-surface-variant text-on-surface',
            'disabled:opacity-38 disabled:cursor-not-allowed'
        );
        container.appendChild(input);

        const error = document.createElement('span');
        error.className = 'md-label-small text-error px-px-16 hidden';
        container.appendChild(error);

        const placeholderSub = this.placeholder$?.subscribe(placeholder => {
            input.placeholder = placeholder;
        });

        const enabledSub = this.enabled$?.subscribe(enabled => {
            input.disabled = !enabled;
        });

        const style$ = this.style$ || of(TextFieldStyle.FILLED);
        const className$ = this.className$ || of('');
        const error$ = this.error$ || of('');

        const combinedSub = combineLatest([style$, className$, error$]).subscribe(([style, extraClass, errorText]) => {
            const BASE_INPUT_CLASSES = 'px-px-16 py-px-12 w-full outline-none transition-all body-large placeholder:text-on-surface-variant text-on-surface disabled:opacity-38 disabled:cursor-not-allowed';
            
            input.className = cn(
                BASE_INPUT_CLASSES,
                extraClass,
                !!errorText && 'ring-error focus:ring-error shadow-[inset_0_-1px_0_0_var(--md-sys-color-error)] focus:shadow-[inset_0_-2px_0_0_var(--md-sys-color-error)]'
            );

            error.textContent = errorText;
            error.classList.toggle('hidden', !errorText);

            if (this.isGlass) {
                input.classList.add('bg-white/10', 'backdrop-blur-md', 'border', 'border-white/20', 'focus:bg-white/20');
                if (style === TextFieldStyle.OUTLINED) {
                    input.classList.add('rounded-small');
                } else {
                    input.classList.add('rounded-t-small');
                }
            } else {
                STYLE_MAP[style].split(' ').forEach(c => input.classList.add(c));
            }
        });

        const valueSub = this.value$?.subscribe(val => {
            if (input.value !== val) {
                input.value = val;
            }
        });

        const labelSub = this.label$?.subscribe(text => {
            label.textContent = text;
            label.classList.toggle('hidden', !text);
        });

        if (this.value$) {
            input.oninput = (e) => {
                const target = e.target as HTMLInputElement;
                this.value$?.next(target.value);
            };
        }

        registerDestroy(container, () => {
            placeholderSub?.unsubscribe();
            enabledSub?.unsubscribe();
            combinedSub.unsubscribe();
            valueSub?.unsubscribe();
            labelSub?.unsubscribe();
        });

        return container;
    }
}
