import { Observable, combineLatest, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { registerDestroy } from '@/core/destroyable-element';

export enum ButtonStyle {
    FILLED = 'filled',
    ELEVATED = 'elevated',
    TONAL = 'tonal',
    OUTLINED = 'outlined',
    TEXT = 'text'
}

export type ClickListener<TYPE> = (value: TYPE) => void

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const STYLE_MAP: Record<ButtonStyle, string> = {
    [ButtonStyle.FILLED]: 'bg-primary text-on-primary hover:elevation-1 focus:ring-primary shadow-sm',
    [ButtonStyle.ELEVATED]: 'bg-surface text-primary elevation-1 hover:elevation-2 focus:ring-primary',
    [ButtonStyle.TONAL]: 'bg-secondary-container text-on-secondary-container hover:elevation-1 focus:ring-secondary',
    [ButtonStyle.OUTLINED]: 'bg-transparent border border-outline text-primary hover:bg-primary/5 focus:ring-primary',
    [ButtonStyle.TEXT]: 'bg-transparent text-primary hover:bg-primary/5 focus:ring-primary',
};

export class ButtonBuilder implements ComponentBuilder {
    private caption$?: Observable<string>;
    private icon$?: Observable<string>;
    private enabled$?: Observable<boolean>;
    private clickListener?: ClickListener<void>;
    private style$?: Observable<ButtonStyle>;
    private className$?: Observable<string>;
    private ariaLabel$?: Observable<string>;
    private isGlass: boolean = false;

    asGlass(isGlass: boolean = true): ButtonBuilder {
        this.isGlass = isGlass;
        return this;
    }

    /**
     * Set the button's visible text caption.
     *
     * This caption is also used as the default aria-label for accessibility.
     * To override the aria-label (e.g., for icon-only buttons), use withAriaLabel().
     */
    withCaption(caption: Observable<string>): ButtonBuilder {
        this.caption$ = caption;
        return this;
    }

    withIcon(icon: Observable<string> | string): ButtonBuilder {
        this.icon$ = typeof icon === 'string' ? of(icon) : icon;
        return this;
    }

    withEnabled(enabled: Observable<boolean>): ButtonBuilder {
        this.enabled$ = enabled;
        return this;
    }

    withClick(click: ClickListener<void>): ButtonBuilder {
        this.clickListener = click;
        return this;
    }

    withStyle(style: Observable<ButtonStyle>): ButtonBuilder {
        this.style$ = style;
        return this;
    }

    withClass(className: Observable<string>): ButtonBuilder {
        this.className$ = className;
        return this;
    }

    /**
     * Set an explicit aria-label, overriding the default (which is derived from caption).
     *
     * Use this to provide a custom accessible label different from the button's visible text.
     * For icon-only buttons (no caption), an explicit aria-label is required for accessibility.
     *
     * @param label The aria-label observable. Takes precedence over caption.
     */
    withAriaLabel(label: Observable<string>): ButtonBuilder {
        this.ariaLabel$ = label;
        return this;
    }

    /**
     * By default, aria-label is derived from caption. Set explicitly with withAriaLabel()
     * to override. When icon-only (no caption), an explicit aria-label is required.
     */
    getAriaLabel$(): Observable<string> | undefined {
        return this.ariaLabel$ ?? this.caption$;
    }

    build(): HTMLButtonElement {
        const button = document.createElement('button');
        const BASE_CLASSES = 'h-[46px] px-px-24 rounded-small font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-label-large inline-flex items-center justify-center gap-2';

        button.className = cn(BASE_CLASSES);

        // Safari skips native <button> elements in Tab navigation unless the user
        // enables "Press Tab to highlight each item on a webpage". An explicit
        // tabindex forces the button into the sequential focus order regardless;
        // the `disabled` attribute still removes it from the tab order when set.
        button.tabIndex = 0;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'w-5 h-5 flex items-center justify-center';
        
        const captionSpan = document.createElement('span');
        captionSpan.className = 'select-none';

        const captionSub = this.caption$ ? this.caption$.subscribe(caption => {
            captionSpan.textContent = caption;
            if (!caption) {
                captionSpan.classList.add('hidden');
                button.classList.add('aspect-square');
                button.classList.remove('px-px-24');
            } else {
                captionSpan.classList.remove('hidden');
                button.classList.remove('aspect-square');
                button.classList.add('px-px-24');
            }
        }) : null;

        if (this.caption$) {
            button.appendChild(captionSpan);
        }

        const iconSub = this.icon$ ? this.icon$.subscribe(iconHtml => {
            if (iconHtml) {
                iconSpan.innerHTML = iconHtml.includes('<svg')
                    ? iconHtml.replace('<svg', '<svg class="w-full h-full"')
                    : `<i class="${iconHtml}"></i>`;
                if (!iconSpan.parentElement) {
                    button.prepend(iconSpan);
                }
            } else {
                iconSpan.remove();
            }
        }) : null;

        // Derive aria-label: use explicit ariaLabel$ if provided, otherwise fall back to caption$
        const ariaLabel$ = this.ariaLabel$ ?? this.caption$;
        const ariaLabelSub = ariaLabel$ ? ariaLabel$.subscribe(label => {
            button.setAttribute('aria-label', label);
        }) : null;

        const enabledSub = this.enabled$ ? this.enabled$.subscribe(enabled => {
            button.disabled = !enabled;
        }) : null;

        const style$ = this.style$ || of(ButtonStyle.FILLED);
        const className$ = this.className$ || of('');

        const styleSub = combineLatest([style$, className$]).subscribe(([style, extraClass]) => {
            button.className = cn(BASE_CLASSES, extraClass);
            
            // Re-apply classes if it's an icon-only button
            if (this.caption$) {
                // Subscription will handle it
            } else {
                button.classList.add('aspect-square');
                button.classList.remove('px-px-24');
            }

            if (this.isGlass) {
                // Apply glass effect
                button.classList.add('glass-effect', 'hover:bg-white/20', 'dark:hover:bg-white/20');

                // Specific overrides based on button style
                if (style === ButtonStyle.TEXT) {
                    button.classList.add('bg-transparent', 'ring-0', 'text-on-primary-container', 'dark:text-white');
                } else if (style === ButtonStyle.OUTLINED) {
                    button.classList.add('bg-transparent');
                } else if (style === ButtonStyle.TONAL) {
                    button.classList.add('ring-0');
                } else if (style === ButtonStyle.ELEVATED) {
                    button.classList.add('elevation-1', 'hover:elevation-2');
                }

                // Keep focus ring from the original style if possible
                const originalClasses = STYLE_MAP[style].split(' ');
                originalClasses.forEach(c => {
                    if (c.startsWith('focus:ring-')) {
                        button.classList.add(c);
                    }
                });
            } else {
                STYLE_MAP[style].split(' ').forEach(c => button.classList.add(c));
            }
        });

        if (this.clickListener) {
            button.onclick = () => {
                this.clickListener?.(undefined);
            };
        }

        registerDestroy(button, () => {
            captionSub?.unsubscribe();
            iconSub?.unsubscribe();
            ariaLabelSub?.unsubscribe();
            enabledSub?.unsubscribe();
            styleSub?.unsubscribe();
        });

        return button;
    }
}
