import {
    ChatPanelBuilder,
    ChatTriggerBuilder,
    ChatMessage,
    ChatSuggestion,
    ComponentBuilder,
    registerDestroy,
} from '@tdq/ora-components';
import { BehaviorSubject, Subscription, of, timer } from 'rxjs';
import { take } from 'rxjs/operators';

// ─── shared data ─────────────────────────────────────────────────────────────

/** A fixed, deterministic reply — streamed in via three growing prefixes so the
 *  example never depends on wall-clock content or `Math.random()`. */
const FAKE_REPLY =
    'June revenue was $128,400 against $76,220 in expenses — a $52,180 margin, 6% ahead of budget.';
const REPLY_DELTAS = [
    FAKE_REPLY.slice(0, 18),
    FAKE_REPLY.slice(0, 58),
    FAKE_REPLY,
];
const STREAM_INTERVAL_MS = 400;

let messageSeq = 0;
const nextMessageId = () => `msg-${++messageSeq}`;

/**
 * Wires a `BehaviorSubject<ChatMessage[]>` and an `onSend` handler the same way
 * both chat examples need: appends the user's message, appends an assistant
 * placeholder with `content: ''` (renders as the typing indicator), then re-emits
 * the list with that message's `content` growing through `REPLY_DELTAS` — the
 * panel diffs rows by `id` and patches the bubble in place rather than
 * re-rendering, which is why streaming is "re-emit the whole list" rather than
 * "append a delta".
 */
function wireFakeConversation(messages$: BehaviorSubject<ChatMessage[]>, subscription: Subscription) {
    return (text: string): void => {
        const userMessage: ChatMessage = { id: nextMessageId(), role: 'user', content: text };
        const replyId = nextMessageId();
        const typingMessage: ChatMessage = { id: replyId, role: 'assistant', content: '' };
        messages$.next([...messages$.value, userMessage, typingMessage]);

        subscription.add(
            timer(STREAM_INTERVAL_MS, STREAM_INTERVAL_MS).pipe(take(REPLY_DELTAS.length)).subscribe(tick => {
                messages$.next(
                    messages$.value.map(m => (m.id === replyId ? { ...m, content: REPLY_DELTAS[tick] } : m))
                );
            })
        );
    };
}

/** Fixed-height wrapper — `.ora-chat-panel-wrapper` is `height: 100%` in CSS, so
 *  it needs a sized ancestor to render at all. */
function heightBox(height: number, content: ComponentBuilder): ComponentBuilder {
    return {
        build(): HTMLElement {
            const box = document.createElement('div');
            box.style.height = `${height}px`;
            box.appendChild(content.build());
            return box;
        },
    };
}

/**
 * View-only chat panel with a locally-owned message store
 *
 * `.withMessages(Observable<ChatMessage[]>)` and `.withOnSend(cb)` are the only
 * required calls — the panel renders whatever the observable emits and reports
 * typed text back through the callback; it has no transport and no store of its
 * own. Here the app plays both roles with a `BehaviorSubject<ChatMessage[]>`.
 *
 * `.withStatus()` renders a subtitle next to a status dot in the header,
 * `.withEmptyState()` swaps in custom content while the list is empty (omitted
 * here since the panel opens with a greeting already in it), and `.withWidth()`
 * sets the panel's pixel width reactively.
 */
export function createChatPanelExample(): ComponentBuilder {
    return {
        build(): HTMLElement {
            const messages$ = new BehaviorSubject<ChatMessage[]>([
                { id: nextMessageId(), role: 'assistant', content: 'Hi! Ask me about invoices or this month\'s budget.' },
            ]);
            const subscription = new Subscription();
            const onSend = wireFakeConversation(messages$, subscription);

            const panel = new ChatPanelBuilder()
                .withMessages(messages$)
                .withOnSend(onSend)
                .withCaption(of('Finance Assistant'))
                .withStatus(of('Online'))
                .withPlaceholder(of('Ask about invoices, budgets…'))
                .withWidth(of(360));

            const box = heightBox(520, panel).build();
            registerDestroy(box, () => {
                subscription.unsubscribe();
                messages$.complete();
            });
            return box;
        },
    };
}

/**
 * Trigger + closable panel sharing a two-way open subject
 *
 * `ChatTriggerBuilder.withOpen(Subject<boolean>)` is required — clicking the pill
 * negates the subject's latest value and the trigger hides (goes `inert`) while
 * it's `true`. Pass that same subject to `ChatPanelBuilder.withOpen()` and add
 * `.asClosable()` so the panel's own header close button writes `false` back to
 * it — the two components never need to know about each other beyond the shared
 * subject. `open$` starts `false` (`BehaviorSubject`, so the panel starts closed
 * per `withOpen`'s contract) — the trigger is visible, the panel is collapsed.
 */
export function createChatTriggerExample(): ComponentBuilder {
    return {
        build(): HTMLElement {
            const open$ = new BehaviorSubject<boolean>(false);
            const messages$ = new BehaviorSubject<ChatMessage[]>([
                { id: nextMessageId(), role: 'assistant', content: 'Open me from the trigger — try asking about June\'s numbers.' },
            ]);
            const subscription = new Subscription();
            const onSend = wireFakeConversation(messages$, subscription);

            const trigger = new ChatTriggerBuilder()
                .withOpen(open$)
                .withCaption(of('Ask assistant'));

            const panel = new ChatPanelBuilder()
                .withMessages(messages$)
                .withOnSend(onSend)
                .withOpen(open$)
                .asClosable()
                .withCaption(of('Finance Assistant'))
                .withWidth(of(360));

            const row = document.createElement('div');
            row.style.cssText = 'height:480px;display:flex;align-items:flex-start;gap:16px;';
            row.appendChild(trigger.build());
            row.appendChild(panel.build());

            registerDestroy(row, () => {
                subscription.unsubscribe();
                messages$.complete();
                open$.complete();
            });
            return row;
        },
    };
}

// ─── suggestions ─────────────────────────────────────────────────────────────

/** Openers offered on an empty thread — `caption` is the chip, `text` is what is sent. */
const OPENING_SUGGESTIONS: ChatSuggestion[] = [
    { caption: 'Plan for today', text: "What's the plan for today?" },
    { caption: 'June margin', text: 'How did June margin compare to budget?' },
    { caption: 'Overdue invoices', text: 'List invoices overdue by 30+ days' },
];

/** Offered once the scripted reply ends in a question. */
const FOLLOW_UP_SUGGESTIONS: ChatSuggestion[] = [
    { caption: 'Yes, please', text: 'Yes, please' },
    { caption: 'No', text: 'No, thanks' },
];

/** Ends in a question, which is what makes the yes/no chips worth offering. */
const SUGGESTED_REPLY =
    'June closed at a $52,180 margin, 6% ahead of budget. Shall I break that down by cost centre?';

const REPLY_DELAY_MS = 700;

/**
 * App-driven quick-reply chips above the composer
 *
 * `.withSuggestions(Observable<ChatSuggestion[]>)` renders each item as a chip
 * between the message log and the composer — in the empty state and
 * mid-conversation alike, unlike `.withEmptyState()`'s chips, which disappear
 * with the first message. Clicking a chip sends its `text` through the same
 * `.withOnSend()` callback the composer uses and never touches the typed text.
 *
 * The row is entirely app-driven: the panel never clears it. Here the app emits
 * `[]` on send (hiding the row) and re-emits a yes/no pair once the scripted
 * reply lands with a question in it.
 */
export function createChatSuggestionsExample(): ComponentBuilder {
    return {
        build(): HTMLElement {
            const messages$ = new BehaviorSubject<ChatMessage[]>([]);
            const suggestions$ = new BehaviorSubject<ChatSuggestion[]>(OPENING_SUGGESTIONS);
            const subscription = new Subscription();

            const onSend = (text: string): void => {
                // The app's decision, not the panel's: the clicked chip is spent.
                suggestions$.next([]);
                const replyId = nextMessageId();
                messages$.next([
                    ...messages$.value,
                    { id: nextMessageId(), role: 'user', content: text },
                    // '' renders the typing indicator until the reply is patched in.
                    { id: replyId, role: 'assistant', content: '' },
                ]);

                subscription.add(
                    timer(REPLY_DELAY_MS).subscribe(() => {
                        messages$.next(
                            messages$.value.map(m =>
                                m.id === replyId ? { ...m, content: SUGGESTED_REPLY } : m
                            )
                        );
                        suggestions$.next(FOLLOW_UP_SUGGESTIONS);
                    })
                );
            };

            const panel = new ChatPanelBuilder()
                .withMessages(messages$)
                .withOnSend(onSend)
                .withSuggestions(suggestions$)
                .withCaption(of('Finance Assistant'))
                .withStatus(of('Online'))
                .withPlaceholder(of('Ask about June, or pick a suggestion…'))
                .withWidth(of(360));

            const box = heightBox(520, panel).build();
            registerDestroy(box, () => {
                subscription.unsubscribe();
                messages$.complete();
                suggestions$.complete();
            });
            return box;
        },
    };
}
