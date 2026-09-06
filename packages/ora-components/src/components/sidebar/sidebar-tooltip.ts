import { Observable, Subscription } from 'rxjs';

/** Class of the singleton tooltip element portalled onto `document.body`. */
export const SIDEBAR_TOOLTIP_CLASS = 'ora-sidebar-tooltip';

/**
 * Stable id for the singleton, so the anchor showing it can point `aria-describedby`
 * at it — a custom `withTooltip()` text is otherwise invisible to a screen reader.
 */
export const SIDEBAR_TOOLTIP_ID = 'ora-sidebar-tooltip';

/** Gap between the anchor's right edge and the tooltip. */
const ANCHOR_GAP = 12;

/** Grace period before hiding, so travelling between adjacent rows does not flicker. */
const HIDE_DELAY_MS = 80;

let _singleton: HTMLElement | null = null;
let _hideTimeout: ReturnType<typeof setTimeout> | null = null;

/** Anchor the tooltip is currently showing for, so teardown only hides its own. */
let _shownAnchor: HTMLElement | null = null;

/** Live attachments; the singleton node leaves the body when this hits zero. */
let _attachedCount = 0;

/**
 * The one tooltip element every sidebar row shares. It lives on `document.body`
 * rather than inside the row so the scrolling nav's `overflow` cannot clip it.
 *
 * Port of aura-accounting `components/tooltip-builder.ts`.
 */
export function sidebarTooltipElement(): HTMLElement {
    if (!_singleton || !_singleton.isConnected) {
        _singleton = document.createElement('div');
        _singleton.className = SIDEBAR_TOOLTIP_CLASS;
        _singleton.id = SIDEBAR_TOOLTIP_ID;
        _singleton.setAttribute('role', 'tooltip');
        document.body.appendChild(_singleton);
    }
    return _singleton;
}

/**
 * While the tooltip is up, any scroll in the page moves the anchor out from
 * under it. Capture phase catches scrolls on the nav (or any other ancestor),
 * which do not bubble to document in the bubble phase.
 */
let _scrollListener: (() => void) | null = null;

function detachScrollListener(): void {
    if (!_scrollListener) return;
    document.removeEventListener('scroll', _scrollListener, true);
    _scrollListener = null;
}

function clearHideTimeout(): void {
    if (_hideTimeout === null) return;
    clearTimeout(_hideTimeout);
    _hideTimeout = null;
}

function hideNow(): void {
    _singleton?.classList.remove('visible');
    _shownAnchor?.removeAttribute('aria-describedby');
    _shownAnchor = null;
    detachScrollListener();
}

/**
 * Hides the shared tooltip immediately. Used by rows that open a menu — the
 * tooltip and the menu describe the same row, and stacking them is noise.
 */
export function hideSidebarTooltip(): void {
    clearHideTimeout();
    hideNow();
}

/**
 * Shows `text$` beside `anchor` on hover, unless `disabled$` says otherwise
 * (the sidebar passes its `expanded$` — labels are already visible when expanded).
 *
 * Returns the `Subscription` owning both the stream and the DOM listeners; the
 * caller owning the anchor's lifetime must unsubscribe it (see `.agent/reactive.md` rule 5).
 */
export function attachSidebarTooltip(
    anchor: HTMLElement,
    text$: Observable<string>,
    disabled$: Observable<boolean>
): Subscription {
    const subscription = new Subscription();

    let text = '';
    let disabled = false;

    subscription.add(text$.subscribe(value => {
        text = value;
    }));

    _attachedCount++;

    subscription.add(disabled$.subscribe(value => {
        disabled = value;
        if (disabled && _shownAnchor === anchor) {
            clearHideTimeout();
            hideNow();
        }
    }));

    const onEnter = (): void => {
        if (disabled || !text) return;
        clearHideTimeout();
        const tip = sidebarTooltipElement();
        _shownAnchor?.removeAttribute('aria-describedby');
        _shownAnchor = anchor;
        anchor.setAttribute('aria-describedby', SIDEBAR_TOOLTIP_ID);

        if (!_scrollListener) {
            _scrollListener = () => hideSidebarTooltip();
            document.addEventListener('scroll', _scrollListener, true);
        }
        tip.textContent = text;
        tip.classList.add('visible');

        const rect = anchor.getBoundingClientRect();
        tip.style.top = `${rect.top + rect.height / 2}px`;
        tip.style.left = `${rect.right + ANCHOR_GAP}px`;
    };

    const onLeave = (): void => {
        clearHideTimeout();
        _hideTimeout = setTimeout(() => {
            _hideTimeout = null;
            hideNow();
        }, HIDE_DELAY_MS);
    };

    anchor.addEventListener('mouseenter', onEnter);
    anchor.addEventListener('mouseleave', onLeave);

    subscription.add(() => {
        anchor.removeEventListener('mouseenter', onEnter);
        anchor.removeEventListener('mouseleave', onLeave);

        // Only this anchor's tooltip is ours to hide — a sibling row may be
        // showing right now, and a pending hide timer belongs to whoever armed it.
        if (_shownAnchor === anchor) {
            clearHideTimeout();
            hideNow();
        }

        anchor.removeAttribute('aria-describedby');

        _attachedCount = Math.max(0, _attachedCount - 1);
        if (_attachedCount === 0) {
            // Same teardown as hideNow(): with no attachments left the capture-phase
            // scroll listener would outlive every anchor it could hide for.
            clearHideTimeout();
            detachScrollListener();
            _singleton?.remove();
            _singleton = null;
            _shownAnchor = null;
        }
    });

    return subscription;
}

/** Test-only: drop the singleton so each test starts from a clean body. */
export function __resetSidebarTooltipForTests__(): void {
    clearHideTimeout();
    detachScrollListener();
    _singleton?.remove();
    _singleton = null;
    _shownAnchor = null;
    _attachedCount = 0;
}
