import { Observable, combineLatest, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { clsx, type ClassValue } from 'clsx';
import { registerDestroy } from '@/core/destroyable-element';
import { twMerge } from 'tailwind-merge';

export enum LayoutGap {
    NONE = 'NONE',
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
    FIT = 'FIT',
    FULL = 'FULL',
    GROW = 'GROW'
}

export enum Alignment {
    LEFT = 'LEFT',
    RIGHT = 'RIGHT',
    CENTER = 'CENTER'
}

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const GAP_MAP: Record<LayoutGap, string> = {
    [LayoutGap.NONE]: 'gap-0',
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
    [SlotSize.GROW]: 'flex-1', // direction-specific min-size classes are added in SlotBuilderImpl.build
};

const JUSTIFY_MAP: Record<Alignment, string> = {
    [Alignment.LEFT]: 'justify-start',
    [Alignment.RIGHT]: 'justify-end',
    [Alignment.CENTER]: 'justify-center',
};

const ITEMS_CENTER = 'items-center'; // every Alignment centers the cross axis; only justify-* varies

const ALIGNMENT_MAP: Record<Alignment, string> = {
    [Alignment.LEFT]: `${JUSTIFY_MAP[Alignment.LEFT]} ${ITEMS_CENTER}`,
    [Alignment.RIGHT]: `${JUSTIFY_MAP[Alignment.RIGHT]} ${ITEMS_CENTER}`,
    [Alignment.CENTER]: `${JUSTIFY_MAP[Alignment.CENTER]} ${ITEMS_CENTER}`,
};

export interface SlotBuilder {
    withContent(content: ComponentBuilder): SlotBuilder;
    withSize(size: SlotSize): SlotBuilder;
    withName(name: string): SlotBuilder;
    withVisible(visible: Observable<boolean>): SlotBuilder;
    withAlignment(alignment: Observable<Alignment>): SlotBuilder;
}

class SlotBuilderImpl implements SlotBuilder {
    private content?: ComponentBuilder;
    private size?: SlotSize;
    private name?: string;
    private visible$?: Observable<boolean>;
    private alignment$?: Observable<Alignment>;

    withContent(content: ComponentBuilder): SlotBuilder {
        this.content = content;
        return this;
    }

    withSize(size: SlotSize): SlotBuilder {
        this.size = size;
        return this;
    }

    withName(name: string): SlotBuilder {
        this.name = name;
        return this;
    }

    isGrow(): boolean {
        return this.size === SlotSize.GROW;
    }

    effectiveSlotName(index: number): string {
        return this.name || String(index);
    }

    withVisible(visible: Observable<boolean>): SlotBuilder {
        this.visible$ = visible;
        return this;
    }

    withAlignment(alignment: Observable<Alignment>): SlotBuilder {
        this.alignment$ = alignment;
        return this;
    }

    build(index: number, isVertical: boolean, layoutAlignment$?: Observable<Alignment>): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.dataset.slot = this.effectiveSlotName(index);
        const isGrow = this.isGrow();

        const updateClasses = (alignment?: Alignment) => {
            wrapper.className = cn(
                'flex',
                this.size && SIZE_MAP[this.size],
                !this.size && !isVertical && 'flex-1', // Auto size for horizontal if not specified; min-w-0 lets the slot shrink below content intrinsic width instead of overflowing
                isVertical && 'w-full', // Full width for slots in vertical layout
                isGrow && (isVertical ? 'min-h-0' : 'min-w-0'), // GROW fills the main axis and may shrink below content size
                alignment && (isGrow ? JUSTIFY_MAP[alignment] : ALIGNMENT_MAP[alignment]) // GROW keeps items-stretch so its child can fill the cross axis instead of sitting at intrinsic size
            );
        };

        updateClasses();

        if (this.visible$) {
            const sub = this.visible$.subscribe(visible => {
                wrapper.style.display = visible ? '' : 'none';
            });
            registerDestroy(wrapper, () => sub.unsubscribe());
        }

        const effectiveAlignment$ = this.alignment$ || layoutAlignment$;

        if (effectiveAlignment$) {
            const sub = effectiveAlignment$.subscribe(alignment => {
                updateClasses(alignment);
            });
            registerDestroy(wrapper, () => sub.unsubscribe());
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
    private alignment$?: Observable<Alignment>;
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

    withAlignment(alignment: Observable<Alignment>): LayoutBuilder {
        this.alignment$ = alignment;
        return this;
    }

    private static isDevEnvironment(): boolean {
        return typeof process === 'undefined' || process.env?.NODE_ENV !== 'production';
    }

    private warnOnDuplicateSlotNames(): void {
        if (!LayoutBuilder.isDevEnvironment()) return;

        const seen = new Set<string>();
        const duplicates = new Set<string>();
        this.slots.forEach((slot, index) => {
            const name = slot.effectiveSlotName(index);
            if (seen.has(name)) {
                duplicates.add(name);
            }
            seen.add(name);
        });

        duplicates.forEach(name => {
            console.warn(`LayoutBuilder: duplicate data-slot value "${name}" — data-slot attributes should be unique within a layout.`);
        });
    }

    build(): HTMLElement {
        const container = document.createElement('div');
        this.warnOnDuplicateSlotNames();
        // Ignores withVisible() — a hidden GROW slot still reserves the container's grow sizing, which is fine since it takes no space when display:none.
        const hasGrow = this.slots.some(slot => slot.isGrow());

        const alignment$ = this.alignment$ || of(undefined);
        const className$ = this.className$ || of(undefined);

        const sub = combineLatest([alignment$, className$]).subscribe(([alignment, cls]) => {
            container.className = cn(
                'flex w-full',
                this.isVertical ? 'flex-col' : 'flex-row',
                hasGrow && (this.isVertical ? 'h-full min-h-0' : 'min-w-0'),
                GAP_MAP[this.gap],
                alignment && !this.isVertical && ALIGNMENT_MAP[alignment as Alignment],
                cls
            );
        });
        registerDestroy(container, () => sub.unsubscribe());

        this.slots.forEach((slot, index) => {
            container.appendChild(slot.build(index, this.isVertical, this.alignment$));
        });

        return container;
    }
}
