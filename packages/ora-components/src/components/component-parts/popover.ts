import { Observable, isObservable, Subscription } from 'rxjs';
import { ComponentBuilder, PopupBuilder } from '../../core/component-builder';
import { registerDestroy } from '@/core/destroyable-element';

export type PopoverWidth = 'match-anchor' | 'auto' | string;

/**
 * Which side of the anchor the popover opens on.
 * BOTTOM (default) opens below the anchor and flips above when there is more room there.
 * RIGHT opens beside the anchor (side menus off a collapsed rail) and flips to the left
 * edge when it would overflow the viewport.
 */
export enum PopoverPlacement {
    BOTTOM = 'BOTTOM',
    RIGHT = 'RIGHT',
}

/** Viewport inset kept free on every side by the RIGHT placement. */
const RIGHT_VIEWPORT_INSET = 4;

let _activePopover: PopoverBuilder | null = null;

export class PopoverBuilder implements PopupBuilder {
    private _anchor?: HTMLElement;
    private _content?: ComponentBuilder;
    private _width: Observable<PopoverWidth> | PopoverWidth = 'match-anchor';
    private _widthSet: boolean = false;
    private _offset: number = 4;
    private _className?: string;
    private _onCloseCb?: () => void;
    private _glass: boolean = false;
    private _alignment: 'start' | 'end' = 'start';
    private _alignmentSet: boolean = false;
    private _placement: PopoverPlacement = PopoverPlacement.BOTTOM;
    private _maxWidth?: string;
    private _positionReference?: HTMLElement;
    private _maxHeight?: Observable<number> | number;
    private _scrollEl?: HTMLElement;

    private _popoverEl?: HTMLElement;
    private _isOpen: boolean = false;
    private _currentWidth: PopoverWidth = 'match-anchor';
    private _currentMaxHeight?: number;
    private _widthSub?: Subscription;
    private _maxHeightSub?: Subscription;
    private _listenersAttached: boolean = false;

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
        this._widthSet = true;
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
        this._alignmentSet = true;
        return this;
    }

    /**
     * Side of the anchor to open on. Defaults to {@link PopoverPlacement.BOTTOM}.
     *
     * With RIGHT the popover sits beside the anchor, its bottom edge aligned with the
     * anchor's bottom edge; `withAlignment('start')` top-aligns it instead. A RIGHT popover
     * takes its content's natural width unless `withWidth` asks for something else.
     */
    withPlacement(placement: PopoverPlacement): this {
        this._placement = placement;
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

    /**
     * Preferred max height in px; clamped to the viewport space on the chosen side.
     * Opt-in: when unset, the popover takes its content's natural height (the flip
     * logic still keeps it on the roomier side of the anchor). The popover itself
     * never scrolls (overflow-hidden) — pair with withScrollElement so the inner
     * scroller receives the clamped height.
     */
    withMaxHeight(maxHeight: Observable<number> | number): this {
        this._maxHeight = maxHeight;
        return this;
    }

    /**
     * Element inside the popover content that owns scrolling (e.g. a ListBox <ul>).
     * On every reposition the popover writes its clamped max-height to this element's
     * style.maxHeight and dispatches a 'scroll' event on it so virtualized viewports
     * re-measure. The popover wrapper stays overflow-hidden and never scrolls itself.
     */
    withScrollElement(el: HTMLElement): this {
        this._scrollEl = el;
        return this;
    }

    build(): this {
        this._buildIfNeeded();
        return this;
    }

    show(): void {
        this._buildIfNeeded();

        // Re-check parent: if anchor is now in a dialog but popover is not, move it.
        // This handles cases where popover was built before anchor was in a dialog.
        const dialog = this._anchor!.closest('dialog');
        if (dialog && this._popoverEl!.parentElement !== dialog) {
            dialog.appendChild(this._popoverEl!);
        }

        this._position();
        if (!this._isOpen) {
            if (_activePopover !== null && _activePopover !== this) {
                _activePopover.close();
            }
            this._setVisible(true);
            this._isOpen = true;
            _activePopover = this;
            this._attachGlobalListeners();
            
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

        // overflow-hidden: the popover wrapper never scrolls; scrollable content inside
        // it (see withScrollElement) owns the scrollbar. A calendar or menu without a
        // maxHeight renders at natural height with no scrollbar.
        const baseClasses = 'fixed m-0 rounded-small shadow-level-2 overflow-hidden p-0';
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

        if (isObservable(this._maxHeight)) {
            this._maxHeightSub = this._maxHeight.subscribe(h => {
                this._currentMaxHeight = h;
                if (this._isOpen) this._position();
            });
        } else if (this._maxHeight !== undefined) {
            this._currentMaxHeight = this._maxHeight;
        }

        // Defensive fallback: catches browser-initiated dismissals (e.g. Escape key on
        // popover="auto") that bypass our own close paths. All programmatic closes go through
        // _onClose() which sets _isOpen=false first, so this guard fires only for native events.
        el.addEventListener('toggle', (event: any) => {
            const isNowOpen = event.newState === 'open';
            if (!isNowOpen && this._isOpen) {
                this._isOpen = false;
                this._detachGlobalListeners();
                if (_activePopover === this) _activePopover = null;
                this._onCloseCb?.();
            }
        });

        // Global listeners are created once here and attached only while open
        // (see _attachGlobalListeners / _detachGlobalListeners).
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

        // Close on scroll unless scrolling inside the popover
        this._scrollHandler = (e: Event) => {
            if (!this._isOpen) return;
            if (this._popoverEl!.contains(e.target as Node)) return;
            this._onClose();
        };

        // Reposition (and re-fit to the viewport) on window resize while open.
        this._resizeHandler = () => {
            if (!this._isOpen) return;
            this._position();
        };

        // Cleanup tied to anchor element lifetime
        registerDestroy(this._anchor, () => this._cleanup());
    }

    private _attachGlobalListeners(): void {
        if (this._listenersAttached) return;
        this._listenersAttached = true;
        document.addEventListener('click', this._clickOutsideHandler!);
        document.addEventListener('scroll', this._scrollHandler!, true);
        window.addEventListener('resize', this._resizeHandler!);
    }

    private _detachGlobalListeners(): void {
        if (!this._listenersAttached) return;
        this._listenersAttached = false;
        document.removeEventListener('click', this._clickOutsideHandler!);
        document.removeEventListener('scroll', this._scrollHandler!, true);
        window.removeEventListener('resize', this._resizeHandler!);
    }

    /** Uses the native Popover API when available, otherwise falls back to toggling display. */
    private _setVisible(visible: boolean): void {
        const el = this._popoverEl as any;
        const hasPopoverApi = typeof el.showPopover === 'function' && typeof el.hidePopover === 'function';
        if (visible) {
            el.style.display = hasPopoverApi ? '' : 'block';
            if (hasPopoverApi) el.showPopover();
        } else {
            if (hasPopoverApi) el.hidePopover();
            el.style.display = 'none';
        }
    }

    /** Push the clamped max-height to the consumer's scroll element (see withScrollElement). */
    private _applyScrollElHeight(px: string): void {
        if (!this._scrollEl) return;
        if (this._scrollEl.style.maxHeight !== px) {
            this._scrollEl.style.maxHeight = px;
            // Nudge virtualized viewports (VirtualRowsViewport listens for 'scroll')
            // to re-measure their window against the new visible height.
            this._scrollEl.dispatchEvent(new Event('scroll'));
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

        if (this._placement === PopoverPlacement.RIGHT) {
            this._positionRight(this._popoverEl, posRect);
        } else {
            this._positionBottom(this._popoverEl, anchorRect, posRect);
        }

        this._applyWidth(this._popoverEl, posRect);
    }

    /** Default placement: below the anchor, flipping above when that side is roomier. */
    private _positionBottom(el: HTMLElement, anchorRect: DOMRect, posRect: DOMRect): void {
        // Smart vertical positioning: default to opening below. Only open above if there
        // isn't enough space below AND there is more space above than below.
        // `margin` keeps the popover clear of the anchor gap plus an 8px viewport inset.
        const margin = this._offset + 8;
        const spaceBelow = window.innerHeight - anchorRect.bottom - margin;
        const spaceAbove = anchorRect.top - margin;

        let openAbove = false;
        const popoverHeight = el.offsetHeight;

        if (popoverHeight > 0) {
            // If it doesn't fit below and fits better above, open above.
            // Measured height may already be clamped by a previous maxHeight, so compare
            // against the content's desired height (bounded by the preferred max, if set).
            const naturalHeight = Math.max(popoverHeight, el.scrollHeight);
            const desiredHeight = this._currentMaxHeight !== undefined
                ? Math.min(this._currentMaxHeight, naturalHeight)
                : naturalHeight;
            if (spaceBelow < desiredHeight && spaceAbove > spaceBelow) {
                openAbove = true;
            }
        } else {
            // First pass (measured height is 0 because display:none).
            // Default to opening below to allow measurement in the second pass.
            openAbove = false;
        }

        // First pass (popoverHeight === 0, still display:none): don't clamp to the
        // (possibly negative) available space yet — that would pin maxHeight at 0px and
        // the second pass would then measure offsetHeight 0, falling into the "unmeasured"
        // branch above and never flipping. Write the preferred height instead so pass 2
        // measures the popover's real (unclamped) height and the flip decision above can see it.
        if (this._currentMaxHeight === undefined) {
            // No maxHeight configured: natural content height, no clamp, no scrollbar
            // (e.g. the DatePicker calendar). The flip above still picks the roomier side.
            el.style.removeProperty('max-height');
        } else if (popoverHeight > 0) {
            const available = openAbove ? spaceAbove : spaceBelow;
            const clamped = Math.max(0, Math.min(this._currentMaxHeight, available));
            el.style.maxHeight = `${clamped}px`;
            this._applyScrollElHeight(`${clamped}px`);
        } else {
            el.style.maxHeight = `${this._currentMaxHeight}px`;
            this._applyScrollElHeight(`${this._currentMaxHeight}px`);
        }
        el.setAttribute('data-placement', openAbove ? 'top' : 'bottom');

        if (openAbove) {
            // Pin the popover's bottom edge just above the anchor.
            // Must set top:'auto' explicitly — the [popover] UA stylesheet applies inset:0
            // (top:0) which, combined with UA height:fit-content, would cause the CSS spec
            // over-constraint rule to drop our `bottom` value, landing the popover at y=0.
            // Explicit top:auto as an inline override lets `bottom` actually anchor the element.
            el.style.top = 'auto';
            el.style.bottom = `${window.innerHeight - anchorRect.top + this._offset}px`;
        } else {
            el.style.top = `${anchorRect.bottom + this._offset}px`;
            el.style.bottom = 'auto';
        }


        // Same trap as `top` above: the [popover] UA stylesheet's inset:0 leaves right:0 in
        // effect unless overridden, and a fixed box with both left and right resolved
        // stretches to the viewport edge whenever its width is `auto`.
        el.style.right = 'auto';   // always use left-based positioning
        if (this._alignment === 'end') {
            const popoverWidth = el.offsetWidth;
            if (popoverWidth > 0) {
                // Accurate: element is rendered, use measured width
                const clampedLeft = Math.min(
                    window.innerWidth - popoverWidth,
                    Math.max(0, posRect.right - popoverWidth)
                );
                el.style.left = `${clampedLeft}px`;
            } else {
                // Pre-render pass: approximate using posRect.right (will be re-positioned in show())
                el.style.left = `${posRect.right}px`;
            }
        } else {
            el.style.left = `${posRect.left}px`;
        }

    }

    /**
     * RIGHT placement: beside the anchor, bottom edges aligned (or top edges with
     * alignment 'start'), flipping to the anchor's left when it would overflow the
     * viewport. Unlike BOTTOM this never flips vertically — it slides into view instead.
     */
    private _positionRight(el: HTMLElement, rect: DOMRect): void {
        const inset = RIGHT_VIEWPORT_INSET;

        // No vertical flip here, so the preferred max-height is simply clamped to the
        // viewport rather than to the space on one side of the anchor. The viewport cap also
        // applies when no max-height was configured: a RIGHT popover never flips and its
        // wrapper is overflow-hidden, so a menu taller than the viewport would otherwise be
        // clamped to a negative top with its first items permanently out of reach.
        const heightCap = Math.max(0, window.innerHeight - inset * 2);
        const clamped = this._currentMaxHeight === undefined
            ? heightCap
            : Math.max(0, Math.min(this._currentMaxHeight, heightCap));
        el.style.maxHeight = `${clamped}px`;
        this._applyScrollElHeight(`${clamped}px`);

        const popoverWidth = el.offsetWidth;
        const popoverHeight = el.offsetHeight;

        let left = rect.right + this._offset;
        const flipped = left + popoverWidth > window.innerWidth - inset;
        if (flipped) {
            left = Math.max(inset, rect.left - this._offset - popoverWidth);
        }

        // 'end' (the default for RIGHT) aligns the popover's bottom edge with the anchor's;
        // an explicit 'start' aligns the top edges instead. Either way it is slid back into
        // the viewport. Pre-render (popoverHeight 0) this lands on rect.bottom / rect.top and
        // the second pass in show() corrects it.
        const topAligned = this._alignmentSet && this._alignment === 'start';
        const desiredTop = topAligned ? rect.top : rect.bottom - popoverHeight;
        // The `inset` floor on maxTop is belt-and-braces: with the height cap above the popover
        // always fits, but a stale/unclamped measurement must never push the top off-screen.
        const maxTop = Math.max(inset, window.innerHeight - popoverHeight - inset);
        const top = Math.min(Math.max(desiredTop, inset), maxTop);

        el.style.top = `${top}px`;
        el.style.bottom = 'auto';
        el.style.left = `${left}px`;
        // Explicit `auto`, not '': the [popover] UA stylesheet applies inset:0, and with
        // right:0 still in effect a width:auto menu stretches to the viewport edge.
        el.style.right = 'auto';   // always use left-based positioning
        el.setAttribute('data-placement', flipped ? 'left' : 'right');
    }

    private _applyWidth(el: HTMLElement, posRect: DOMRect): void {
        const w = this._currentWidth;

        // A RIGHT popover is a menu beside its anchor, not a dropdown under it: the anchor
        // (often a narrow rail button) is no guide to its width, so it sizes to its content
        // unless withWidth() explicitly asked for something.
        if (this._placement === PopoverPlacement.RIGHT && !this._widthSet) {
            el.style.width = 'auto';
            el.style.minWidth = '';
        } else if (w === 'match-anchor') {
            el.style.width = `${posRect.width}px`;
            el.style.minWidth = '';
        } else if (w === 'auto') {
            el.style.width = 'auto';
            el.style.minWidth = `${posRect.width}px`;
        } else {
            el.style.width = w;
            el.style.minWidth = '';
        }

        if (this._maxWidth) {
            el.style.maxWidth = this._maxWidth;
        } else {
            el.style.maxWidth = '';
        }
    }

    private _onClose(): void {
        if (!this._popoverEl || !this._isOpen) return;
        this._isOpen = false;           // set BEFORE hidePopover so toggle sees false

        // Restore focus to the anchor if focus is currently inside the popover.
        // popover="manual" gets no automatic browser focus restoration, so hiding it
        // while it holds focus would drop document.activeElement onto <body> — which,
        // inside a modal dialog, silently breaks the dialog's focus trap.
        const shouldRestoreFocus = this._popoverEl.contains(document.activeElement);

        this._setVisible(false);
        this._detachGlobalListeners();
        if (_activePopover === this) _activePopover = null;

        if (shouldRestoreFocus) {
            this._anchor?.focus();
        }

        this._onCloseCb?.();
    }

    private _cleanup(): void {
        if (this._isOpen) {
            this._isOpen = false;
            this._onCloseCb?.();
        }
        // Unconditional: _activePopover must never keep pointing at an instance whose DOM is
        // about to be torn down, regardless of whether _isOpen was already false when cleanup
        // ran (e.g. a stale flag from a path that closed the popover without going through
        // close()'s own nulling).
        if (_activePopover === this) _activePopover = null;
        this._widthSub?.unsubscribe();
        this._widthSub = undefined;
        this._maxHeightSub?.unsubscribe();
        this._maxHeightSub = undefined;

        this._detachGlobalListeners();
        this._clickOutsideHandler = undefined;
        this._scrollHandler = undefined;
        this._resizeHandler = undefined;

        this._popoverEl?.remove();
        this._popoverEl = undefined;
    }
}
