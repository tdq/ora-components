import { Observable } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { registerDestroy } from '@/core/destroyable-element';

export enum LabelSize {
    SMALL = 'small',
    MEDIUM = 'medium',
    LARGE = 'large'
}

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const SIZE_MAP: Record<LabelSize, string> = {
    [LabelSize.SMALL]: 'md-label-small',
    [LabelSize.MEDIUM]: 'md-label-medium',
    [LabelSize.LARGE]: 'md-label-large',
};

export class LabelBuilder implements ComponentBuilder {
    private caption$?: Observable<string>;
    private size: LabelSize = LabelSize.MEDIUM;
    private className$?: Observable<string>;
    private isGlass = false;

    withCaption(caption: Observable<string>): LabelBuilder {
        this.caption$ = caption;
        return this;
    }

    withSize(size: LabelSize): LabelBuilder {
        this.size = size;
        return this;
    }

    withClass(className: Observable<string>): LabelBuilder {
        this.className$ = className;
        return this;
    }

    withGlass(): LabelBuilder {
        this.isGlass = true;
        return this;
    }

    build(): HTMLElement {
        const label = document.createElement('span');
        label.className = cn(
            'transition-all',
            SIZE_MAP[this.size],
            this.isGlass && 'glass-effect px-2 rounded-md'
        );

        if (this.caption$) {
            const sub = this.caption$.subscribe(caption => {
                label.textContent = caption;
            });

            registerDestroy(label, () => {
                sub.unsubscribe();
            });
        }

        if (this.className$) {
            const sub = this.className$.subscribe(cls => {
                label.className = cn(
                    'transition-all',
                    SIZE_MAP[this.size],
                    this.isGlass && 'glass-effect px-2 rounded-md',
                    cls
                );
            });

            registerDestroy(label, () => {
                sub.unsubscribe();
            });
        }

        return label;
    }
}

