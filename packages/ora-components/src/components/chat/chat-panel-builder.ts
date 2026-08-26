import { Observable, Subject, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { ChatPanelViewport } from './chat-panel-viewport';
import { ChatMessage, ChatSuggestion } from './types';

const DEFAULTS = {
    caption: 'Assistant',
    placeholder: 'Message…',
    width: 420,
};

/**
 * A view-only chat panel: header, message list and composer.
 *
 * The component owns no transport and no message store — it renders whatever
 * `withMessages()` emits and reports typed text through `withOnSend()`. Streaming is
 * expressed by re-emitting the list with one message's `content` growing; the panel
 * patches that message's bubble in place instead of re-rendering the list.
 *
 * Message content is rendered as plain text; markdown/HTML rendering is a non-goal.
 */
export class ChatPanelBuilder implements ComponentBuilder {
    private messages$?: Observable<ChatMessage[]>;
    private onSend?: (text: string) => void;
    private open$?: Subject<boolean>;
    private closable = false;
    private caption$: Observable<string> = of(DEFAULTS.caption);
    private status$?: Observable<string>;
    private placeholder$: Observable<string> = of(DEFAULTS.placeholder);
    private emptyState?: ComponentBuilder;
    private suggestions$?: Observable<ChatSuggestion[]>;
    private width$: Observable<number> = of(DEFAULTS.width);
    private glass = false;

    /**
     * Required. The full message list on every emission; rows are diffed by `id`.
     *
     * Rows are **appended in emission order**: a message whose `id` is new is added at the end
     * of the list regardless of where it sits in the array. Reordering an existing list, or
     * prepending older history (infinite scroll-back), is not supported — the panel is built
     * for an append-only conversation.
     */
    withMessages(messages: Observable<ChatMessage[]>): this {
        this.messages$ = messages;
        return this;
    }

    /** Required. Called with the trimmed composer text when the user sends a message. */
    withOnSend(cb: (text: string) => void): this {
        this.onSend = cb;
        return this;
    }

    /**
     * Two-way open state. `true` slides the panel in and focuses the composer, `false`
     * collapses it — collapsed also means `aria-hidden` and `inert`, so the composer leaves
     * the tab order. Calling this makes the panel start **closed**: a `BehaviorSubject` is the
     * natural fit, and with a plain `Subject` (no current value) the panel stays closed until
     * the first emission. When this is never called the panel is permanently open and never
     * enters the closed state.
     */
    withOpen(open: Subject<boolean>): this {
        this.open$ = open;
        return this;
    }

    /**
     * Renders the header close button. Clicking it emits `false` on the `withOpen()`
     * subject; without `withOpen()` the button renders but has no observable effect.
     */
    asClosable(): this {
        this.closable = true;
        return this;
    }

    /** Header title. Defaults to 'Assistant'. */
    withCaption(caption: Observable<string>): this {
        this.caption$ = caption;
        return this;
    }

    /** Header subtitle next to a status dot, e.g. 'Online'. Omitted when not set. */
    withStatus(status: Observable<string>): this {
        this.status$ = status;
        return this;
    }

    /** Composer placeholder. Defaults to 'Message…'. */
    withPlaceholder(placeholder: Observable<string>): this {
        this.placeholder$ = placeholder;
        return this;
    }

    /**
     * Content shown in the message area while the list is empty and removed on the
     * first message. The consumer composes the heading and any suggestion chips itself
     * — chips call the consumer's own send handler. For chips that outlive the first message,
     * see {@link ChatPanelBuilder.withSuggestions}.
     */
    withEmptyState(emptyState: ComponentBuilder): this {
        this.emptyState = emptyState;
        return this;
    }

    /**
     * Optional quick-reply chips rendered between the message log and the composer while the
     * emitted suggestion list is non-empty — in the empty state and mid-conversation alike. Clicking a chip sends
     * `suggestion.text` through `withOnSend()` without touching the composer text. The panel
     * never hides the chips itself: emit `[]` to hide them.
     */
    withSuggestions(suggestions: Observable<ChatSuggestion[]>): this {
        this.suggestions$ = suggestions;
        return this;
    }

    /** Panel width in pixels. Defaults to 420. */
    withWidth(width: Observable<number>): this {
        this.width$ = width;
        return this;
    }

    asGlass(): this {
        this.glass = true;
        return this;
    }

    build(): HTMLElement {
        if (!this.messages$) {
            throw new Error('ChatPanelBuilder: withMessages() is required before build()');
        }
        if (!this.onSend) {
            throw new Error('ChatPanelBuilder: withOnSend() is required before build()');
        }

        return new ChatPanelViewport({
            messages$: this.messages$,
            onSend: this.onSend,
            open$: this.open$,
            closable: this.closable,
            caption$: this.caption$,
            status$: this.status$,
            placeholder$: this.placeholder$,
            emptyState: this.emptyState,
            suggestions$: this.suggestions$,
            width$: this.width$,
            glass: this.glass,
        }).build();
    }
}
