import { Observable, Subject, Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { ComponentBuilder } from '../../core/component-builder';
import { createLifecycleBoundary } from '../../core/lifecycle-boundary';
import { Icons } from '../../core/icons';
import { cn } from '../../utils/cn';
import { ChatMessage, ChatSuggestion } from './types';

export interface ChatPanelViewportConfig {
    messages$: Observable<ChatMessage[]>;
    onSend: (text: string) => void;
    open$?: Subject<boolean>;
    closable: boolean;
    caption$: Observable<string>;
    status$?: Observable<string>;
    placeholder$: Observable<string>;
    emptyState?: ComponentBuilder;
    suggestions$?: Observable<ChatSuggestion[]>;
    width$: Observable<number>;
    glass: boolean;
}

/** Delay before the composer receives focus, matched to the slide-in transition. */
const FOCUS_DELAY_MS = 280;

/** Auto-grow ceiling for the composer textarea. */
const TEXTAREA_MAX_HEIGHT_PX = 160;

/** Distance from the bottom within which the list counts as "scrolled to bottom". */
const AT_BOTTOM_THRESHOLD_PX = 40;

const COMPOSER_HINT = 'Enter to send · Shift+Enter for newline';

interface RenderedRow {
    row: HTMLElement;
    bubble: HTMLElement;
    lastContent: string;
}

/**
 * Builds the chat panel DOM once and keeps only the message list in sync.
 *
 * Message content is rendered with `textContent` — markdown and HTML in a message are
 * shown verbatim. Rich rendering is an explicit non-goal of this component.
 */
export class ChatPanelViewport {
    private readonly config: ChatPanelViewportConfig;

    private readonly rows = new Map<string, RenderedRow>();
    private messagesEl!: HTMLElement;
    private textareaEl!: HTMLTextAreaElement;
    private sendBtnEl!: HTMLButtonElement;
    private emptyShown = false;

    constructor(config: ChatPanelViewportConfig) {
        this.config = config;
    }

    build(): HTMLElement {
        const { messages$, open$, width$, glass } = this.config;
        const sub = new Subscription();

        const wrapper = document.createElement('div');
        wrapper.className = 'ora-chat-panel-wrapper';
        wrapper.setAttribute('data-slot', 'chat-panel');

        const container = document.createElement('div');
        container.className = 'ora-chat-panel-container';

        const inner = document.createElement('div');
        inner.className = cn('ora-chat-panel-inner', glass && 'glass-effect');
        inner.setAttribute('role', 'region');

        inner.appendChild(this.buildHeader(sub, inner));
        inner.appendChild(this.buildMessages());
        const suggestions = this.buildSuggestions(sub);
        if (suggestions) inner.appendChild(suggestions);
        inner.appendChild(this.buildComposer(sub));
        container.appendChild(inner);
        wrapper.appendChild(container);

        sub.add(width$.subscribe(width => {
            container.style.setProperty('--ora-chat-width', `${width}px`);
        }));

        let focusTimer: ReturnType<typeof setTimeout> | undefined;
        if (open$) {
            // Start closed. A plain Subject has no current value, so without this the panel
            // would paint fully open — and tabbable — until the first emission arrives.
            applyOpenState(container, inner, false);
            // distinctUntilChanged: a re-emitted `true` (e.g. a parent replaying its state) must
            // not steal focus back into the composer.
            sub.add(open$.pipe(distinctUntilChanged()).subscribe(isOpen => {
                applyOpenState(container, inner, isOpen);
                clearTimeout(focusTimer);
                if (!isOpen) return;
                if (prefersReducedMotion()) {
                    // No slide-in to wait for.
                    this.textareaEl.focus();
                } else {
                    focusTimer = setTimeout(() => this.textareaEl.focus(), FOCUS_DELAY_MS);
                }
            }));
        } else {
            // No open stream: the panel is permanently open and never gets a --closed state.
            container.classList.add('ora-chat-panel--open');
        }

        sub.add(messages$.subscribe(messages => this.renderMessages(messages)));

        const boundary = createLifecycleBoundary();
        boundary.onDisconnect = () => {
            clearTimeout(focusTimer);
            sub.unsubscribe();
            this.rows.clear();
        };
        wrapper.appendChild(boundary);

        return wrapper;
    }

    // ---- Header ----------------------------------------------------------------

    /** `regionEl` is named from the same caption emission, so `caption$` is subscribed once. */
    private buildHeader(sub: Subscription, regionEl: HTMLElement): HTMLElement {
        const { caption$, status$, closable, open$ } = this.config;

        const header = document.createElement('div');
        header.className = 'ora-chat-header';

        const titleWrap = document.createElement('div');
        titleWrap.className = 'ora-chat-header-title-wrap';

        const badge = document.createElement('span');
        badge.className = 'ora-chat-header-badge';
        badge.setAttribute('aria-hidden', 'true');
        badge.innerHTML = Icons.SPARKLE;

        const titleCol = document.createElement('div');
        titleCol.className = 'ora-chat-header-title-col';

        const title = document.createElement('div');
        title.className = 'ora-chat-header-title';
        sub.add(caption$.subscribe(caption => {
            title.textContent = caption;
            regionEl.setAttribute('aria-label', caption);
        }));
        titleCol.appendChild(title);

        if (status$) {
            const subtitle = document.createElement('div');
            subtitle.className = 'ora-chat-header-subtitle';

            const dot = document.createElement('span');
            dot.className = 'ora-chat-status-dot';
            dot.setAttribute('aria-hidden', 'true');

            const statusText = document.createElement('span');
            sub.add(status$.subscribe(status => {
                statusText.textContent = status;
            }));

            subtitle.appendChild(dot);
            subtitle.appendChild(statusText);
            titleCol.appendChild(subtitle);
        }

        titleWrap.appendChild(badge);
        titleWrap.appendChild(titleCol);
        header.appendChild(titleWrap);

        if (closable) {
            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'ora-chat-icon-btn';
            closeBtn.setAttribute('aria-label', 'Close chat');
            closeBtn.innerHTML = Icons.CLOSE;
            // Without withOpen() there is no open state to write to: the button renders
            // but closing is the consumer's own concern.
            closeBtn.addEventListener('click', () => open$?.next(false));
            header.appendChild(closeBtn);
        }

        return header;
    }

    // ---- Messages --------------------------------------------------------------

    private buildMessages(): HTMLElement {
        const list = document.createElement('div');
        list.className = 'ora-chat-messages';
        list.setAttribute('data-slot', 'messages');
        list.setAttribute('role', 'log');
        list.setAttribute('aria-live', 'polite');
        // A scrollable region must be reachable by keyboard so it can be scrolled without a mouse.
        list.setAttribute('tabindex', '0');
        this.messagesEl = list;
        return list;
    }

    private renderMessages(messages: ChatMessage[]): void {
        const container = this.messagesEl;

        if (messages.length === 0) {
            if (this.emptyShown) return;
            // Built fresh every time: replaceChildren() below detaches the previous element,
            // firing its one-shot lifecycle boundary, so that instance can never be reused.
            const emptyState = this.config.emptyState;
            container.replaceChildren(...(emptyState ? [emptyState.build()] : []));
            this.rows.clear();
            this.emptyShown = true;
            return;
        }

        if (this.emptyShown) {
            container.replaceChildren();
            this.emptyShown = false;
        }

        const wasAtBottom =
            container.scrollHeight - container.scrollTop - container.clientHeight < AT_BOTTOM_THRESHOLD_PX;

        let appendedUserRow = false;
        const incomingIds = new Set<string>();

        for (const msg of messages) {
            incomingIds.add(msg.id);
            const existing = this.rows.get(msg.id);
            if (existing) {
                if (msg.content !== existing.lastContent) {
                    patchBubble(existing.bubble, msg);
                    existing.lastContent = msg.content;
                }
            } else {
                const { row, bubble } = this.buildMessageRow(msg);
                container.appendChild(row);
                this.rows.set(msg.id, { row, bubble, lastContent: msg.content });
                if (msg.role === 'user') appendedUserRow = true;
            }
        }

        for (const [id, { row }] of this.rows) {
            if (!incomingIds.has(id)) {
                row.remove();
                this.rows.delete(id);
            }
        }

        // Pin to the bottom when the reader was already there, or when the row that just arrived
        // is the reader's own message — they pressed send, so they expect to follow it. An
        // assistant row (or a streaming delta) never yanks a reader who scrolled up to re-read.
        if (wasAtBottom || appendedUserRow) {
            requestAnimationFrame(() => pinToBottom(container));
        }
    }

    private buildMessageRow(msg: ChatMessage): { row: HTMLElement; bubble: HTMLElement } {
        const row = document.createElement('div');
        row.className = cn('ora-chat-row', `ora-chat-row--${msg.role}`);
        row.setAttribute('data-message-id', msg.id);

        if (msg.role === 'assistant') {
            const avatar = document.createElement('div');
            avatar.className = 'ora-chat-avatar';
            avatar.setAttribute('aria-hidden', 'true');
            avatar.innerHTML = Icons.SPARKLE;
            row.appendChild(avatar);
        }

        const bubble = document.createElement('div');
        bubble.className = cn('ora-chat-bubble', `ora-chat-bubble--${msg.role}`);

        patchBubble(bubble, msg);

        row.appendChild(bubble);
        return { row, bubble };
    }

    // ---- Suggestions -----------------------------------------------------------

    /**
     * The quick-reply row. Returns `null` when the consumer never called `withSuggestions()`,
     * so a panel without suggestions carries no extra node at all.
     */
    private buildSuggestions(sub: Subscription): HTMLElement | null {
        const { suggestions$ } = this.config;
        if (!suggestions$) return null;

        const row = document.createElement('div');
        row.className = 'ora-chat-suggestions';
        row.setAttribute('data-slot', 'suggestions');
        row.setAttribute('role', 'group');
        row.setAttribute('aria-label', 'Suggestions');
        // Hidden until the first non-empty emission: a stream with no current value must not
        // reserve the row's height above the composer.
        row.hidden = true;

        sub.add(suggestions$.subscribe(list => this.renderSuggestions(row, list)));
        return row;
    }

    private renderSuggestions(row: HTMLElement, list: ChatSuggestion[]): void {
        const messages = this.messagesEl;
        // Showing or hiding the row resizes the message area; measure before the swap so a
        // reader who was at the bottom is not left mid-log by the reflow.
        const wasAtBottom =
            messages.scrollHeight - messages.scrollTop - messages.clientHeight < AT_BOTTOM_THRESHOLD_PX;

        // A chip with no sendable text would be a dead button.
        const usable = list.filter(item => item.text.trim().length > 0);
        row.replaceChildren(...usable.map(item => this.buildSuggestionChip(item)));
        row.hidden = usable.length === 0;

        if (wasAtBottom) {
            requestAnimationFrame(() => pinToBottom(messages));
        }
    }

    private buildSuggestionChip(item: ChatSuggestion): HTMLButtonElement {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'ora-chat-suggestion';
        chip.textContent = item.caption;
        // The label may be elided; the full prompt stays reachable on hover.
        if (item.text !== item.caption) chip.title = item.text;
        chip.addEventListener('click', () => {
            this.send(item.text);
            // The composer is where the conversation continues — keep the caret there rather
            // than on a chip that the next emission may remove.
            this.textareaEl.focus();
        });
        return chip;
    }

    // ---- Composer --------------------------------------------------------------

    private buildComposer(sub: Subscription): HTMLElement {
        const { placeholder$ } = this.config;

        const wrap = document.createElement('div');
        wrap.className = 'ora-chat-composer-wrap';

        const form = document.createElement('form');
        form.className = 'ora-chat-composer';
        form.addEventListener('submit', event => {
            event.preventDefault();
            this.submit();
        });

        const textarea = document.createElement('textarea');
        textarea.className = 'ora-chat-textarea';
        textarea.rows = 1;
        this.textareaEl = textarea;
        sub.add(placeholder$.subscribe(placeholder => {
            textarea.placeholder = placeholder;
        }));

        textarea.addEventListener('input', () => {
            this.autoSize();
            this.updateSendState();
        });

        textarea.addEventListener('keydown', event => {
            // Mid-IME-composition Enter commits the candidate, it does not send. `isComposing`
            // is the modern signal; Safari and some Windows IMEs only report keyCode 229.
            const composing = event.isComposing || event.keyCode === 229;
            if (event.key === 'Enter' && !event.shiftKey && !composing) {
                event.preventDefault();
                this.submit();
            }
        });

        const sendBtn = document.createElement('button');
        sendBtn.type = 'submit';
        sendBtn.className = 'ora-chat-send-btn';
        sendBtn.setAttribute('aria-label', 'Send message');
        sendBtn.innerHTML = Icons.SEND;
        sendBtn.disabled = true;
        this.sendBtnEl = sendBtn;

        form.appendChild(textarea);
        form.appendChild(sendBtn);

        const hint = document.createElement('div');
        hint.className = 'ora-chat-composer-hint';
        hint.textContent = COMPOSER_HINT;

        wrap.appendChild(form);
        wrap.appendChild(hint);
        return wrap;
    }

    private autoSize(): void {
        const textarea = this.textareaEl;
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`;
    }

    private updateSendState(): void {
        this.sendBtnEl.disabled = this.textareaEl.value.trim().length === 0;
    }

    /** The one send path. Reports whether anything was sent; blank text is a no-op. */
    private send(text: string): boolean {
        const trimmed = text.trim();
        if (!trimmed) return false;
        this.config.onSend(trimmed);
        return true;
    }

    private submit(): void {
        if (!this.send(this.textareaEl.value)) return;
        this.textareaEl.value = '';
        this.textareaEl.style.height = 'auto';
        this.updateSendState();
        this.textareaEl.focus();
    }
}

/**
 * Jumps the log to the bottom, never animating.
 *
 * `.ora-chat-messages` sets `scroll-behavior: smooth`, which applies to programmatic scrolls
 * too: a pin would then animate, and a second emission arriving mid-animation would measure
 * the half-finished `scrollTop` as "not at bottom" and stop following the conversation.
 * `behavior: 'instant'` opts this scroll out of the CSS setting while leaving user scrolling
 * smooth. jsdom implements no `Element.scrollTo`, hence the assignment fallback.
 */
function pinToBottom(el: HTMLElement): void {
    if (typeof el.scrollTo === 'function') {
        el.scrollTo({ top: el.scrollHeight, behavior: 'instant' });
        return;
    }
    el.scrollTop = el.scrollHeight;
}

/**
 * Applies the open/closed state to the panel. `inert` travels with `aria-hidden`: the closed
 * container is only visually collapsed (width 0 / opacity 0), so without it the composer stays
 * in the tab order.
 */
function applyOpenState(container: HTMLElement, inner: HTMLElement, isOpen: boolean): void {
    container.classList.toggle('ora-chat-panel--open', isOpen);
    container.classList.toggle('ora-chat-panel--closed', !isOpen);
    inner.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    if (isOpen) {
        inner.removeAttribute('inert');
    } else {
        inner.setAttribute('inert', '');
    }
}

/**
 * Updates a bubble in place. An assistant message whose content is empty always reads as the
 * typing indicator — including when a stream is reset back to '' after a delta — so the
 * indicator is swapped in and out rather than only dropped once.
 */
function patchBubble(bubble: HTMLElement, msg: ChatMessage): void {
    const typing = bubble.classList.contains('ora-chat-bubble--typing');

    if (msg.role === 'assistant' && msg.content === '') {
        if (!typing) {
            bubble.classList.add('ora-chat-bubble--typing');
            bubble.replaceChildren(buildTypingIndicator());
        }
        return;
    }

    if (typing) {
        bubble.classList.remove('ora-chat-bubble--typing');
        bubble.replaceChildren();
    }
    bubble.textContent = msg.content;
}

/**
 * True when the operator asked the OS to minimise animation. The slide-in is then instant, so
 * waiting `FOCUS_DELAY_MS` before focusing the composer would only be dead time.
 */
function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function buildTypingIndicator(): HTMLElement {
    const typing = document.createElement('span');
    typing.className = 'ora-chat-typing';
    // A roleless generic cannot carry an accessible name — role="status" makes the label reach AT.
    typing.setAttribute('role', 'status');
    typing.setAttribute('aria-label', 'Assistant is typing');
    for (let i = 0; i < 3; i++) {
        typing.appendChild(document.createElement('span'));
    }
    return typing;
}
