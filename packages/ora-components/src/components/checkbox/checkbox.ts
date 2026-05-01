import { Observable, Subject, Subscription } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { registerDestroy } from '@/core/destroyable-element';
import { Icons } from '@/core/icons';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export class CheckboxBuilder implements ComponentBuilder {
    private caption$?: Observable<string>;
    private enabled$?: Observable<boolean>;
    private className$?: Observable<string>;
    private value$?: Subject<boolean>;
    private isGlass: boolean = false;

    withCaption(caption: Observable<string>): this {
        this.caption$ = caption;
        return this;
    }

    withEnabled(enabled: Observable<boolean>): this {
        this.enabled$ = enabled;
        return this;
    }

    withClass(className: Observable<string>): this {
        this.className$ = className;
        return this;
    }

    withValue(value: Subject<boolean>): this {
        this.value$ = value;
        return this;
    }

    asGlass(isGlass: boolean = true): this {
        this.isGlass = isGlass;
        return this;
    }

    build(): HTMLElement {
        const root = document.createElement('label');
        const BASE_ROOT_CLASSES = 'inline-flex items-center gap-px-8 cursor-pointer group select-none';
        root.className = cn(BASE_ROOT_CLASSES);

        const container = document.createElement('div');
        container.className = 'relative flex items-center justify-center w-[18px] h-[18px]';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'sr-only peer';

        const box = document.createElement('div');
        const updateBoxClasses = (isGlass: boolean) => {
            box.className = cn(
                'w-full h-full rounded-small transition-all relative',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2',
                'peer-checked:bg-primary peer-checked:border-primary',
                'peer-disabled:opacity-38 peer-disabled:cursor-not-allowed',
                isGlass
                    ? 'glass-effect'
                    : 'border-2 border-outline'
            );
        };

        const iconContainer = document.createElement('div');
        iconContainer.className = 'absolute inset-0 w-full h-full text-on-primary scale-0 transition-transform peer-checked:scale-100 flex items-center justify-center';
        iconContainer.innerHTML = Icons.CHECKMARK;

        const stateLayer = document.createElement('div');
        stateLayer.className = cn(
            'absolute -inset-px-8 rounded-full bg-primary opacity-0',
            'group-hover:opacity-[var(--md-sys-state-hover-opacity,0.08)]',
            'peer-active:opacity-[var(--md-sys-state-pressed-opacity,0.12)]'
        );

        container.appendChild(input);
        container.appendChild(box);
        container.appendChild(iconContainer);
        container.appendChild(stateLayer);

        const captionSpan = document.createElement('span');
        // md-label-large defaults
        captionSpan.className = cn(
            'md-label-large peer-disabled:opacity-38',
            this.isGlass ? '' : 'text-on-surface'
        );

        root.appendChild(container);
        root.appendChild(captionSpan);

        const subscriptions = new Subscription();

        if (this.caption$) {
            subscriptions.add(this.caption$.subscribe(caption => {
                captionSpan.textContent = caption;
            }));
        }

        updateBoxClasses(this.isGlass);

        if (this.enabled$) {
            subscriptions.add(this.enabled$.subscribe(enabled => {
                input.disabled = !enabled;
                if (enabled) {
                    root.classList.remove('opacity-38', 'cursor-not-allowed');
                    root.classList.add('cursor-pointer');
                } else {
                    root.classList.add('opacity-38', 'cursor-not-allowed');
                    root.classList.remove('cursor-pointer');
                }
            }));
        }

        if (this.className$) {
            subscriptions.add(this.className$.subscribe(className => {
                root.className = cn(
                    BASE_ROOT_CLASSES,
                    className
                );
            }));
        }

        if (this.value$) {
            subscriptions.add(this.value$.subscribe(value => {
                input.checked = value;
            }));

            input.addEventListener('change', () => {
                this.value$?.next(input.checked);
            });
        }

        registerDestroy(root, () => {
            subscriptions.unsubscribe();
        });

        return root;
    }
}
