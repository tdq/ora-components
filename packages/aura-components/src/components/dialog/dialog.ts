import { Observable, of } from 'rxjs';
import { ComponentBuilder, PopupBuilder } from '../../core/component-builder';
import { LabelBuilder, LabelSize } from '../label/label';
import { ToolbarBuilder } from '../toolbar/toolbar-builder';
import { LayoutBuilder, LayoutGap } from '../layout/layout';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { registerDestroy } from '@/core/destroyable-element';

export enum DialogSize {
    SMALL = 'SMALL',
    MEDIUM = 'MEDIUM',
    LARGE = 'LARGE',
    EXTRA_LARGE = 'EXTRA_LARGE'
}

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const DIALOG_SIZE_MAP: Record<DialogSize, string> = {
    [DialogSize.SMALL]: 'w-[30vw]',
    [DialogSize.MEDIUM]: 'w-[50vw]',
    [DialogSize.LARGE]: 'w-[75vw]',
    [DialogSize.EXTRA_LARGE]: 'w-[90vw]',
};

export class DialogBuilder implements ComponentBuilder, PopupBuilder {
    private caption$?: Observable<string>;
    private description$?: Observable<string>;
    private className$?: Observable<string>;
    private content?: ComponentBuilder;
    private size: DialogSize = DialogSize.MEDIUM;
    private isScrollable: boolean = false;
    private height$?: Observable<number>;
    private toolbarBuilder?: ToolbarBuilder;
    private element?: HTMLDialogElement;
    private isGlass: boolean = false;

    withCaption(caption: Observable<string>): this {
        this.caption$ = caption;
        return this;
    }

    withDescription(description: Observable<string>): this {
        this.description$ = description;
        return this;
    }

    withClass(className: Observable<string>): this {
        this.className$ = className;
        return this;
    }

    withContent(content: ComponentBuilder): this {
        this.content = content;
        return this;
    }

    withSize(size: DialogSize): this {
        this.size = size;
        return this;
    }

    asScrollable(): this {
        this.isScrollable = true;
        return this;
    }

    asGlass(): this {
        this.isGlass = true;
        return this;
    }

    withHeight(height: Observable<number>): this {
        this.height$ = height;
        return this;
    }

    withToolbar(): ToolbarBuilder {
        if (!this.toolbarBuilder) {
            this.toolbarBuilder = new ToolbarBuilder();
        }
        return this.toolbarBuilder;
    }

    show(): void {
        if (!this.element) {
            this.element = this.build() as HTMLDialogElement;
        }
        if (!this.element.parentElement) {
            document.body.appendChild(this.element);
        }
        if (!this.element.open) {
            this.element.showModal();
        }
    }

    close(): void {
        if (this.element && this.element.open) {
            this.element.close();
        }
        if (this.element && this.element.parentElement) {
            this.element.parentElement.removeChild(this.element);
        }
    }

    build(): HTMLElement {
        if (this.element) {
            return this.element;
        }

        const dialog = document.createElement('dialog');
        
        const getBaseClasses = () => cn(
            this.isGlass
                ? 'glass-effect'
                : 'bg-surface border-none text-on-surface',
            'rounded-large elevation-5 flex flex-col overflow-hidden p-0 backdrop:bg-transparent',
            DIALOG_SIZE_MAP[this.size]
        );

        dialog.className = getBaseClasses();

        // Header
        const headerBuilder = new LayoutBuilder()
            .asVertical()
            .withGap(LayoutGap.SMALL)
            .withClass(of('px-6 pt-6 pb-4 cursor-move select-none flex-none'));

        if (this.caption$) {
            headerBuilder.addSlot()
                .withContent(new LabelBuilder()
                    .withCaption(this.caption$)
                    .withSize(LabelSize.LARGE)
                    .withClass(of('font-bold text-headline-small')));
        }

        if (this.description$) {
            headerBuilder.addSlot()
                .withContent(new LabelBuilder()
                    .withCaption(this.description$)
                    .withSize(LabelSize.SMALL)
                    .withClass(of(cn(
                        'text-body-medium',
                        this.isGlass ? 'text-gray-600 dark:text-white/60' : 'text-on-surface-variant'
                    ))));
        }

        const header = headerBuilder.build();
        dialog.appendChild(header);

        // Content
        const contentContainer = document.createElement('div');
        contentContainer.className = cn(
            'flex-1 min-h-0 px-6 pb-6',
            this.isScrollable ? 'overflow-y-auto' : 'overflow-hidden'
        );

        if (this.content) {
            contentContainer.appendChild(this.content.build());
        }
        dialog.appendChild(contentContainer);

        // Toolbar
        if (this.toolbarBuilder) {
            if (this.isGlass) {
                this.toolbarBuilder.asGlass();
            }
            const toolbar = this.toolbarBuilder.build();
            const toolbarWrapper = document.createElement('div');
            toolbarWrapper.className = cn(
                'flex-none px-6 py-4',
                this.isGlass && 'bg-white/5 border-t border-white/10'
            );
            toolbarWrapper.appendChild(toolbar);
            dialog.appendChild(toolbarWrapper);
        }

        // Height handling
        if (this.height$) {
            const sub = this.height$.subscribe(h => {
                dialog.style.maxHeight = `${h}px`;
            });
            registerDestroy(dialog, () => sub.unsubscribe());
        }

        // Custom class handling
        if (this.className$) {
            const sub = this.className$.subscribe(cls => {
                dialog.className = cn(
                    getBaseClasses(),
                    cls
                );
            });
            registerDestroy(dialog, () => sub.unsubscribe());
        }

        // Drag functionality
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        const onMouseDown = (e: MouseEvent) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = dialog.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            // Remove transform and margin to use absolute positioning during drag
            dialog.style.transform = 'none';
            dialog.style.margin = '0';
            dialog.style.left = `${startLeft}px`;
            dialog.style.top = `${startTop}px`;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            dialog.style.left = `${startLeft + dx}px`;
            dialog.style.top = `${startTop + dy}px`;
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        header.addEventListener('mousedown', onMouseDown);

        registerDestroy(dialog, () => {
            header.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            // Clean up the cached element when it's destroyed
            this.element = undefined;
        });

        this.element = dialog;
        return dialog;
    }
}
