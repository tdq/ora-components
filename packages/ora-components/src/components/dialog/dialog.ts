import { isObservable, Observable, of } from 'rxjs';
import { ComponentBuilder, PopupBuilder } from '../../core/component-builder';
import { LabelBuilder, LabelSize } from '../label/label';
import { ToolbarBuilder } from '../toolbar/toolbar-builder';
import { LayoutBuilder, LayoutGap } from '../layout/layout';
import { registerDestroy } from '@/core/destroyable-element';
import { setupFocusTrap } from '@/core/focus-trap';
import { cn } from '@/utils/cn';

export enum DialogSize {
    SMALL = 'SMALL',
    MEDIUM = 'MEDIUM',
    LARGE = 'LARGE',
    EXTRA_LARGE = 'EXTRA_LARGE'
}

const DIALOG_SIZE_MAP: Record<DialogSize, string> = {
    [DialogSize.SMALL]: 'w-[30vw] max-w-[480px]',
    [DialogSize.MEDIUM]: 'w-[50vw] max-w-[720px]',
    [DialogSize.LARGE]: 'w-[75vw] max-w-[1040px]',
    [DialogSize.EXTRA_LARGE]: 'w-[90vw] max-w-[1400px]',
};

export type DialogBeforeClose = () => boolean | Promise<boolean>;

const DRAG_HEADER_CLASSES = ['cursor-move', 'select-none'];

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
    private maxWidth$?: Observable<string>;
    private beforeClose?: DialogBeforeClose;
    private draggable$: Observable<boolean> = of(true);
    private fixedHeight$?: Observable<number>;
    /** True once the built element has been torn down (disconnected); a dead element is never reused. */
    private destroyed: boolean = false;

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

    withMaxWidth(maxWidth: Observable<string>): this {
        this.maxWidth$ = maxWidth;
        return this;
    }

    /** Guard consulted by `close()` and by the native `cancel` event (Escape); `false` keeps the dialog open. */
    withBeforeClose(fn: DialogBeforeClose): this {
        this.beforeClose = fn;
        return this;
    }

    withDraggable(draggable: boolean | Observable<boolean>): this {
        this.draggable$ = isObservable(draggable) ? draggable : of(draggable);
        return this;
    }

    /** Fixed dialog height in px; content becomes scrollable, toolbar stays pinned. */
    withFixedHeight(height: Observable<number>): this {
        this.fixedHeight$ = height;
        return this;
    }

    withToolbar(): ToolbarBuilder {
        if (!this.toolbarBuilder) {
            this.toolbarBuilder = new ToolbarBuilder();
        }
        return this.toolbarBuilder;
    }

    /**
     * Opens the dialog modally. `close()`/`forceClose()` destroy the built element on
     * disconnect (listeners are torn down and the element is discarded) — a Dialog is
     * single-use. `show()` builds a fresh element whenever none is cached, so calling it
     * again after a close produces a new node. Do not re-parent a built dialog by hand.
     */
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

    /**
     * Closes the dialog unless `withBeforeClose` vetoes it. The guard is only consulted while
     * the dialog is open. A throwing or rejecting guard is reported via `console.error` and
     * keeps the dialog open (fail closed) — it never rejects the returned promise.
     */
    async close(): Promise<void> {
        if (this.element?.open && this.beforeClose) {
            let allowed: boolean;
            try {
                const result = this.beforeClose();
                allowed = typeof result === 'boolean' ? result : await result;
            } catch (err) {
                console.error(err);
                return;
            }
            if (!allowed) return;
        }
        this.forceClose();
    }

    /**
     * Closes the dialog immediately, bypassing `withBeforeClose` — use after the guarded
     * action already ran (e.g. "Save"). A safe no-op once the element has been destroyed.
     */
    forceClose(): void {
        if (this.destroyed || !this.element) return;
        // Capture a local reference: `.close()` dispatches a synchronous 'close' event whose
        // handler removes the element from the DOM, which synchronously fires the disconnect
        // teardown and clears `this.element` — so `this.element` cannot be re-read below.
        const dialog = this.element;
        if (dialog.open) {
            dialog.close();
        }
        if (dialog.parentElement) {
            dialog.parentElement.removeChild(dialog);
        }
    }

    /**
     * Builds the dialog element. A Dialog is single-use: once the built element is
     * destroyed (disconnected via `close()`/`forceClose()`/native close), this builder
     * never resurrects it — `show()` calls `build()` again to construct a brand new
     * element with a freshly armed `withBeforeClose` guard. Do not re-parent a built
     * dialog by hand; a detached-and-reattached node stays inert.
     */
    build(): HTMLElement {
        if (this.element) {
            return this.element;
        }

        this.destroyed = false;
        const dialog = document.createElement('dialog');

        const getBaseClasses = () => cn(
            'm-auto',
            this.isGlass
                ? 'glass-effect'
                : 'bg-surface border-none text-on-surface',
            'rounded-large elevation-5 flex flex-col overflow-hidden p-0 backdrop:bg-transparent',
            DIALOG_SIZE_MAP[this.size],
            this.fixedHeight$ && 'max-h-[90vh]'
        );

        dialog.className = getBaseClasses();

        // Header
        const headerBuilder = new LayoutBuilder()
            .asVertical()
            .withGap(LayoutGap.SMALL)
            .withClass(of('px-6 pt-6 pb-4 flex-none'));

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
            'flex-1 px-6 pb-6',
            this.fixedHeight$
                ? 'overflow-y-auto min-h-0'
                : this.isScrollable ? 'overflow-y-auto min-h-[200px]' : ''
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

        if (this.fixedHeight$) {
            const sub = this.fixedHeight$.subscribe(h => {
                dialog.style.height = `${h}px`;
            });
            registerDestroy(dialog, () => sub.unsubscribe());
        }

        if (this.maxWidth$) {
            const sub = this.maxWidth$.subscribe(w => {
                dialog.style.maxWidth = w;
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

        let dragAttached = false;
        const setDraggable = (enabled: boolean) => {
            if (enabled === dragAttached) return;
            dragAttached = enabled;
            if (enabled) {
                header.addEventListener('mousedown', onMouseDown);
                header.classList.add(...DRAG_HEADER_CLASSES);
            } else {
                header.removeEventListener('mousedown', onMouseDown);
                header.classList.remove(...DRAG_HEADER_CLASSES);
                if (isDragging) {
                    dialog.style.transform = '';
                    dialog.style.margin = '';
                    dialog.style.left = '';
                    dialog.style.top = '';
                }
                onMouseUp();
            }
        };
        const draggableSub = this.draggable$.subscribe(setDraggable);

        registerDestroy(dialog, () => {
            draggableSub.unsubscribe();
            header.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            // Clean up the cached element when it's destroyed — the builder is single-use
            // past this point; show() will build a fresh element next time.
            this.element = undefined;
            this.destroyed = true;
        });

        // Add close event listener to handle native close (ESC key, backdrop click)
        const handleClose = () => {
            // Only remove from parent if the dialog is still connected to the DOM
            // This prevents double removal if close() was called programmatically
            if (dialog.isConnected && dialog.parentElement) {
                dialog.parentElement.removeChild(dialog);
            }
        };

        dialog.addEventListener('close', handleClose);

        // Native cancel (Escape): preventDefault before invoking the guard so a synchronous
        // throw can never fall through to the browser's default close. A throwing or
        // rejecting guard is reported via console.error and keeps the dialog open (fail
        // closed), matching close()'s behaviour. On a destroyed element there is nothing
        // left to guard, so let the native close happen (do not preventDefault).
        const handleCancel = (e: Event) => {
            if (this.destroyed || !this.beforeClose) return;
            e.preventDefault();
            let result: boolean | Promise<boolean>;
            try {
                result = this.beforeClose();
            } catch (err) {
                console.error(err);
                return;
            }
            if (result === true) {
                this.forceClose();
                return;
            }
            if (result === false) return;
            result
                .then(ok => { if (ok) this.forceClose(); })
                .catch(err => { console.error(err); });
        };
        dialog.addEventListener('cancel', handleCancel);

        registerDestroy(dialog, () => {
            dialog.removeEventListener('close', handleClose);
            dialog.removeEventListener('cancel', handleCancel);
        });

        setupFocusTrap(dialog);

        this.element = dialog;
        return dialog;
    }
}
