import { Observable, isObservable, Subscription } from 'rxjs';
import { ComponentBuilder, PopupBuilder } from '../../core/component-builder';
import { registerDestroy } from '@/core/destroyable-element';

export type PopoverWidth = 'match-anchor' | 'auto' | string;

let _activePopover: PopoverBuilder | null = null;

export class PopoverBuilder implements PopupBuilder {
    private _anchor?: HTMLElement;
    private _content?: ComponentBuilder;
    private _width: Observable<PopoverWidth> | PopoverWidth = 'match-anchor';
    private _offset: number = 4;
    private _className?: string;
    private _onCloseCb?: () => void;
    private _glass: boolean = false;
    private _alignment: 'start' | 'end' = 'start';
    private _maxWidth?: string;
    private _positionReference?: HTMLElement;

    private _popoverEl?: HTMLElement;
    private _isOpen: boolean = false;
    private _currentWidth: PopoverWidth = 'match-anchor';
    private _widthSub?: Subscription;

    // Bound references for cleanup
    private _clickOutsideHandler?: (e: MouseEvent) => void;
    private _scrollHandler?: (e: Event) => void;
    private _resizeHandler?: () => void;

    withAnchor(anchor: HTMLElement): this {
        this._anchor = anchor;
        return this;
    }

    withContent(content: ComponentBuilder): this {
        this._content = content;
        return this;
    }

    withWidth(width: Observable<PopoverWidth> | PopoverWidth): this {
        this._width = width;
        return this;
    }

    withOffset(offset: number): this {
        this._offset = offset;
        return this;
    }

    withClass(className: string): this {
        this._className = className;
        return this;
    }

    withOnClose(callback: () => void): this {
        this._onCloseCb = callback;
        return this;
    }

    asGlass(): this {
        this._glass = true;
        return this;
    }

    withAlignment(alignment: 'start' | 'end'): this {
        this._alignment = alignment;
        return this;
    }

    withMaxWidth(maxWidth: string): this {
        this._maxWidth = maxWidth;
        return this;
    }

    withPositionReference(el: HTMLElement): this {
        this._positionReference = el;
        return this;
    }

    build(): this {
        this._buildIfNeeded();
        return this;
    }

    show(): void {
        this._buildIfNeeded();
        this._position();
        if (!this._isOpen) {
            if (_activePopover !== null && _activePopover !== this) {
                _activePopover.close();
            }
            this._popoverEl!.style.display = '';
            (this._popoverEl as any).showPopover();
            this._isOpen = true;
            _activePopover = this;
            
            // Second pass: now we have accurate offsetHeight and offsetWidth because the 
            // element is visible. This ensures smart vertical positioning and 'end' alignment
            // work correctly based on actual rendered dimensions.
            this._position();
        }
    }

    close(): void {
        if (!this._popoverEl || !this._isOpen) return;
        this._onClose();
    }

    private _buildIfNeeded(): void {
        if (this._popoverEl) return;
        if (!this._anchor) throw new Error('PopoverBuilder: anchor is required before show()');
        if (!this._content) throw new Error('PopoverBuilder: content is required before show()');

        const el = document.createElement('div');
        el.setAttribute('popover', 'manual');

        const baseClasses = 'fixed m-0 rounded-small shadow-level-2 overflow-y-auto p-0';
        el.className = baseClasses;

        if (this._glass) {
            el.classList.add('glass-effect');
        }

        if (this._className) {
            this._className.split(' ').forEach(c => {
                if (c) el.classList.add(c);
            });
        }

        el.appendChild(this._content.build());

        // Ensure the element starts hidden. Real browsers apply a UA stylesheet rule
        // (`[popover] { display: none }`) but jsdom does not, so we set it explicitly.
        // show()/hidePopover() will clear/restore this as needed.
        el.style.display = 'none';

        // If the anchor is inside a dialog, we must append the popover to that dialog
        // (or a descendant) to prevent it from being made inert when the dialog is modal.
        const dialog = this._anchor.closest('dialog');
        if (dialog) {
            dialog.appendChild(el);
        } else {
            document.body.appendChild(el);
        }
        
        this._popoverEl = el;

        // Handle Observable vs plain width
        if (isObservable(this._width)) {
            this._widthSub = (this._width as Observable<PopoverWidth>).subscribe(w => {
                this._currentWidth = w;
                if (this._isOpen) this._position();  // re-apply width reactively
            });
        } else {
            this._currentWidth = this._width as PopoverWidth;
        }

        // Defensive fallback: catches browser-initiated dismissals (e.g. Escape key on
        // popover="auto") that bypass our own close paths. All programmatic closes go through
        // _onClose() which sets _isOpen=false first, so this guard fires only for native events.
        el.addEventListener('toggle', (event: any) => {
            const isNowOpen = event.newState === 'open';
            if (!isNowOpen && this._isOpen) {
                this._isOpen = false;
                this._onCloseCb?.();
            }
        });

        // Close on click outside (anchor and popover are allowed)
        this._clickOutsideHandler = (e: MouseEvent) => {
            if (!this._isOpen) return;
            const target = e.target as Node;
            if (
                !this._popoverEl!.contains(target) &&
                !this._anchor?.contains(target)
            ) {
                this._onClose();
            }
        };
        document.addEventListener('click', this._clickOutsideHandler);

        // Close on scroll unless scrolling inside the popover
        this._scrollHandler = (e: Event) => {
            if (!this._isOpen) return;
            if (this._popoverEl!.contains(e.target as Node)) return;
            this._onClose();
        };
        document.addEventListener('scroll', this._scrollHandler, true);

        // Close on window resize, but not when the mobile virtual keyboard fires a resize
        // (e.g. when focus is inside the popover and the keyboard appears/dismisses).
        this._resizeHandler = () => {
            if (!this._isOpen) return;
            if (this._popoverEl!.contains(document.activeElement)) return;
            this._onClose();
        };
        window.addEventListener('resize', this._resizeHandler);

        // Cleanup tied to anchor element lifetime
        if (this._anchor) {
            registerDestroy(this._anchor, () => this._cleanup());
        }
    }

    private _position(): void {
        if (!this._popoverEl || !this._anchor) return;

        // The popover element is appended to document.body (see _buildIfNeeded),
        // so position:fixed is always relative to the viewport. getBoundingClientRect()
        // also returns viewport-relative coordinates, so no coordinate transform is needed.
        // Assumption: no CSS transform/filter/perspective on <body> or <html>.
        const anchorRect = this._anchor.getBoundingClientRect();
        const posRect = (this._positionReference ?? this._anchor).getBoundingClientRect();

        // Smart vertical positioning: default to opening below. Only open above if there
        // isn't enough space below AND there is more space above than below.
        const spaceBelow = window.innerHeight - anchorRect.bottom;
        const spaceAbove = anchorRect.top;
        
        let openAbove = false;
        const popoverHeight = this._popoverEl.offsetHeight;

        if (popoverHeight > 0) {
            // If it doesn't fit below and fits better above, open above.
            if (spaceBelow < popoverHeight + this._offset && spaceAbove > spaceBelow) {
                openAbove = true;
            }
        } else {
            // First pass (measured height is 0 because display:none). 
            // Default to opening below to allow measurement in the second pass.
            openAbove = false;
        }

        if (openAbove) {
            // Pin the popover's bottom edge just above the anchor.
            // Must set top:'auto' explicitly — the [popover] UA stylesheet applies inset:0
            // (top:0) which, combined with UA height:fit-content, would cause the CSS spec
            // over-constraint rule to drop our `bottom` value, landing the popover at y=0.
            // Explicit top:auto as an inline override lets `bottom` actually anchor the element.
            this._popoverEl.style.top = 'auto';
            this._popoverEl.style.bottom = `${window.innerHeight - anchorRect.top + this._offset}px`;
        } else {
            this._popoverEl.style.top = `${anchorRect.bottom + this._offset}px`;
            this._popoverEl.style.bottom = 'auto';
        }


        this._popoverEl.style.right = '';   // always use left-based positioning
        if (this._alignment === 'end') {
            const popoverWidth = this._popoverEl.offsetWidth;
            if (popoverWidth > 0) {
                // Accurate: element is rendered, use measured width
                const clampedLeft = Math.min(
                    window.innerWidth - popoverWidth,
                    Math.max(0, posRect.right - popoverWidth)
                );
                this._popoverEl.style.left = `${clampedLeft}px`;
            } else {
                // Pre-render pass: approximate using posRect.right (will be re-positioned in show())
                this._popoverEl.style.left = `${posRect.right}px`;
            }
        } else {
            this._popoverEl.style.left = `${posRect.left}px`;
        }

        const w = this._currentWidth;
        if (w === 'match-anchor') {
            this._popoverEl.style.width = `${posRect.width}px`;
            this._popoverEl.style.minWidth = '';
        } else if (w === 'auto') {
            this._popoverEl.style.width = 'auto';
            this._popoverEl.style.minWidth = `${posRect.width}px`;
        } else {
            this._popoverEl.style.width = w;
            this._popoverEl.style.minWidth = '';
        }

        if (this._maxWidth) {
            this._popoverEl.style.maxWidth = this._maxWidth;
        } else {
            this._popoverEl.style.maxWidth = '';
        }
    }

    private _onClose(): void {
        if (!this._popoverEl || !this._isOpen) return;
        this._isOpen = false;           // set BEFORE hidePopover so toggle sees false
        (this._popoverEl as any).hidePopover();
        this._popoverEl.style.display = 'none';
        if (_activePopover === this) _activePopover = null;
        this._onCloseCb?.();
    }

    private _cleanup(): void {
        if (this._isOpen) {
            this._isOpen = false;
            if (_activePopover === this) _activePopover = null;
            this._onCloseCb?.();
        }
        this._widthSub?.unsubscribe();
        this._widthSub = undefined;

        if (this._clickOutsideHandler) {
            document.removeEventListener('click', this._clickOutsideHandler);
            this._clickOutsideHandler = undefined;
        }

        if (this._scrollHandler) {
            document.removeEventListener('scroll', this._scrollHandler, true);
            this._scrollHandler = undefined;
        }

        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = undefined;
        }

        this._popoverEl?.remove();
        this._popoverEl = undefined;
    }
}
