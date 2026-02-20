import { Observable } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export enum LayoutGap {
    SMALL = 'SMALL',
    MEDIUM = 'MEDIUM',
    LARGE = 'LARGE',
    EXTRA_LARGE = 'EXTRA_LARGE'
}

export enum SlotSize {
    QUARTER = 'QUARTER',
    THIRD = 'THIRD',
    HALF = 'HALF',
    TWO_THIRDS = 'TWO_THIRDS',
    THREE_QUARTERS = 'THREE_QUARTERS',
    FULL = 'FULL',
    FIT = 'FIT'
}

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const GAP_MAP: Record<LayoutGap, string> = {
    [LayoutGap.SMALL]: 'gap-1', // 4px
    [LayoutGap.MEDIUM]: 'gap-2', // 8px
    [LayoutGap.LARGE]: 'gap-4', // 16px
    [LayoutGap.EXTRA_LARGE]: 'gap-8', // 32px
};

const SIZE_MAP: Record<SlotSize, string> = {
    [SlotSize.QUARTER]: 'basis-1/4',
    [SlotSize.THIRD]: 'basis-1/3',
    [SlotSize.HALF]: 'basis-1/2',
    [SlotSize.TWO_THIRDS]: 'basis-2/3',
    [SlotSize.THREE_QUARTERS]: 'basis-3/4',
    [SlotSize.FULL]: 'basis-full',
    [SlotSize.FIT]: 'flex-none',
};

export interface SlotBuilder {
    withContent(content: ComponentBuilder): SlotBuilder;
    withSize(size: SlotSize): SlotBuilder;
    withVisible(visible: Observable<boolean>): SlotBuilder;
}

class SlotBuilderImpl implements SlotBuilder {
    private content?: ComponentBuilder;
    private size?: SlotSize;
    private visible$?: Observable<boolean>;

    withContent(content: ComponentBuilder): SlotBuilder {
        this.content = content;
        return this;
    }

    withSize(size: SlotSize): SlotBuilder {
        this.size = size;
        return this;
    }

    withVisible(visible: Observable<boolean>): SlotBuilder {
        this.visible$ = visible;
        return this;
    }

    build(isVertical: boolean): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = cn(
            this.size && SIZE_MAP[this.size],
            !this.size && !isVertical && 'flex-1', // Auto size for horizontal if not specified
            isVertical && 'w-full' // Full width for slots in vertical layout
        );

        if (this.visible$) {
            this.visible$.subscribe(visible => {
                wrapper.style.display = visible ? '' : 'none';
            });
        }

        if (this.content) {
            wrapper.appendChild(this.content.build());
        }

        return wrapper;
    }
}

export class LayoutBuilder implements ComponentBuilder {
    private slots: SlotBuilderImpl[] = [];
    private isVertical = false;
    private gap: LayoutGap = LayoutGap.MEDIUM;
    private className$?: Observable<string>;

    addSlot(): SlotBuilder {
        const slot = new SlotBuilderImpl();
        this.slots.push(slot);
        return slot;
    }

    asVertical(): LayoutBuilder {
        this.isVertical = true;
        return this;
    }

    asHorizontal(): LayoutBuilder {
        this.isVertical = false;
        return this;
    }

    withGap(gap: LayoutGap): LayoutBuilder {
        this.gap = gap;
        return this;
    }

    withClass(className: Observable<string>): LayoutBuilder {
        this.className$ = className;
        return this;
    }

    build(): HTMLElement {
        const container = document.createElement('div');
        container.className = cn(
            'flex w-full',
            this.isVertical ? 'flex-col' : 'flex-row',
            GAP_MAP[this.gap]
        );

        if (this.className$) {
            this.className$.subscribe(cls => {
                container.className = cn(
                    'flex w-full',
                    this.isVertical ? 'flex-col' : 'flex-row',
                    GAP_MAP[this.gap],
                    cls
                );
            });
        }

        this.slots.forEach(slot => {
            container.appendChild(slot.build(this.isVertical));
        });

        return container;
    }
}

