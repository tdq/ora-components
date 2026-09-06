import {
    ButtonBuilder,
    ButtonStyle,
    ChatPanelBuilder,
    ChatTriggerBuilder,
    LabelBuilder,
    LabelSize,
    LayoutBuilder,
    LayoutGap,
    registerDestroy,
    type ChatMessage,
    type ChatSuggestion,
} from '@tdq/ora-components';
import { BehaviorSubject, Subscription, of, timer } from 'rxjs';
import {
    createAppShell,
    createGlassBackdrop,
    createShell,
    GLASS_GRADIENTS,
    SHELL_HEIGHT_PX,
} from './story-helpers';

/**
 * NOTE: no `'autodocs'` tag — `chat.docs.mdx` is the docs page for this
 * component, and having both makes Storybook's indexer throw.
 */
export default {
    title: 'Components/ChatPanel',
    tags: ['stable', 'glass', 'reactive'],
};

/** A finished, deterministic conversation about a real close problem. */
const CONVERSATION: ChatMessage[] = [
    {
        id: 'c1',
        role: 'user',
        content: 'The March bank rec is out by £2,410. Where should I look?',
    },
    {
        id: 'c2',
        role: 'assistant',
        content:
            'Three candidates, in order of likelihood: an unpresented cheque (#4471, £2,410 to Halden Paper on 27 March), a duplicated supplier payment, or a mis-keyed transposition. The cheque matches the variance exactly.',
    },
    {
        id: 'c3',
        role: 'user',
        content: 'Confirm the cheque is still unpresented.',
    },
    {
        id: 'c4',
        role: 'assistant',
        content:
            'Cheque #4471 has no matching bank line in the 1–31 March statement. Post it to unpresented items and the reconciliation clears to zero.',
    },
];

/**
 * The panel never appends to the list itself — `withOnSend` is the consumer's
 * hook, and every story wires it the same way: push a user message and let the
 * `withMessages()` stream re-render.
 */
function userAppender(messages$: BehaviorSubject<ChatMessage[]>, prefix: string) {
    let seq = 0;
    return (content: string): void => {
        messages$.next([
            ...messages$.getValue(),
            { id: `${prefix}${++seq}`, role: 'user', content },
        ]);
    };
}

/** The panel is `height: 100%` — every story needs a height-constrained row. */
function panelStage(panel: HTMLElement, note?: string): HTMLElement {
    const filler = document.createElement('div');
    filler.className = 'flex h-full min-w-0 flex-1 flex-col gap-2 p-6';
    if (note) {
        filler.appendChild(
            new LabelBuilder().withCaption(of(note)).withSize(LabelSize.SMALL).build(),
        );
    }
    return createShell(filler, panel);
}

// ---------------------------------------------------------------------------
// 1. Default — a static conversation, permanently open
// ---------------------------------------------------------------------------

/**
 * With no `withOpen()` the panel is permanently open: no slide-in, no `inert`
 * state. `withMessages()` and `withOnSend()` are the only required calls — the
 * component renders the list it is given and hands typed text back.
 */
export const Default = () => {
    const messages$ = new BehaviorSubject<ChatMessage[]>(CONVERSATION);

    const panel = new ChatPanelBuilder()
        .withMessages(messages$)
        .withOnSend(userAppender(messages$, 'c'))
        .withCaption(of('Aura Assistant'))
        .withStatus(of('Online'))
        .withPlaceholder(of('Ask about the March close…'))
        .build();

    const stage = panelStage(panel, 'The app owns the message list; the panel only renders it.');
    registerDestroy(stage, () => messages$.complete());
    return stage;
};

// ---------------------------------------------------------------------------
// 2. EmptyState — a builder shown while the list is empty
// ---------------------------------------------------------------------------

/**
 * `withEmptyState()` takes a `ComponentBuilder`, not an element, because the
 * panel calls `build()` again on every transition back into the empty state —
 * the previous element's lifecycle boundary has already fired by then.
 *
 * The suggestion chips call the consumer's own send path, exactly as the
 * composer does; the component has no opinion about them.
 */
export const EmptyState = () => {
    const messages$ = new BehaviorSubject<ChatMessage[]>([]);
    const send = userAppender(messages$, 'e');

    const SUGGESTIONS = [
        'Summarise the March variance',
        'List invoices overdue by 30+ days',
        'Explain the VAT box 6 figure',
    ];

    // A builder, not an element: rebuilt on every empty transition.
    const emptyState: { build: () => HTMLElement } = {
        build: () => {
            const layout = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);
            layout.addSlot().withContent(
                new LabelBuilder()
                    .withCaption(of('Ask about this period'))
                    .withSize(LabelSize.LARGE),
            );
            for (const suggestion of SUGGESTIONS) {
                layout.addSlot().withContent(
                    new ButtonBuilder()
                        .withCaption(of(suggestion))
                        .withStyle(of(ButtonStyle.OUTLINED))
                        .withClick(() => send(suggestion)),
                );
            }
            const el = layout.build();
            el.classList.add('p-4');
            return el;
        },
    };

    const panel = new ChatPanelBuilder()
        .withMessages(messages$)
        .withOnSend(send)
        .withEmptyState(emptyState)
        .withCaption(of('Aura Assistant'))
        .withStatus(of('Online'))
        .build();

    const stage = panelStage(panel, 'Pick a suggestion — the empty state is removed on the first message.');
    registerDestroy(stage, () => messages$.complete());
    return stage;
};

// ---------------------------------------------------------------------------
// 3. Suggestions — app-driven quick-reply chips above the composer
// ---------------------------------------------------------------------------

/** Openers offered on an empty thread; `caption` is the chip, `text` is what is sent. */
const OPENING_SUGGESTIONS: ChatSuggestion[] = [
    { caption: 'Plan for today', text: "What's the plan for today?" },
    { caption: 'March variance', text: 'Summarise the March variance' },
    { caption: 'Overdue invoices', text: 'List invoices overdue by 30+ days' },
];

/** Offered once the assistant's reply ends in a question. */
const FOLLOW_UP_SUGGESTIONS: ChatSuggestion[] = [
    { caption: 'Yes, please', text: 'Yes, please' },
    { caption: 'No', text: 'No, thanks' },
];

const SUGGESTED_REPLY =
    'Cheque #4471 for £2,410 to Halden Paper is still unpresented, and it is the whole of the March variance. Shall I post it to unpresented items?';

/** Fixed delay before the scripted reply lands — no `Math.random()`, no transport. */
const REPLY_DELAY_MS = 700;

/**
 * `withSuggestions()` takes an `Observable<ChatSuggestion[]>` and renders each
 * item as a chip between the message log and the composer, in the empty state
 * and mid-conversation alike. Clicking a chip sends `suggestion.text` straight
 * through `withOnSend()` — the composer text is never touched.
 *
 * The chips are **app-driven**: the panel never clears the row by itself. This
 * story empties the list on send and re-emits a yes/no pair once the scripted
 * reply ends in a question; emitting `[]` is what hides the row.
 */
export const Suggestions = () => {
    const messages$ = new BehaviorSubject<ChatMessage[]>([]);
    const suggestions$ = new BehaviorSubject<ChatSuggestion[]>(OPENING_SUGGESTIONS);
    const sub = new Subscription();
    let seq = 0;

    const send = (text: string): void => {
        // App-side: the chip that was clicked is no longer a useful reply.
        suggestions$.next([]);
        const replyId = `qa${++seq}`;
        messages$.next([
            ...messages$.getValue(),
            { id: `q${seq}`, role: 'user', content: text },
            // '' renders the typing indicator until the reply is patched in.
            { id: replyId, role: 'assistant', content: '' },
        ]);
        sub.add(
            timer(REPLY_DELAY_MS).subscribe(() => {
                messages$.next(
                    messages$
                        .getValue()
                        .map(m => (m.id === replyId ? { ...m, content: SUGGESTED_REPLY } : m)),
                );
                suggestions$.next(FOLLOW_UP_SUGGESTIONS);
            }),
        );
    };

    // A builder, not an element — rebuilt on every transition into the empty state.
    const emptyState: { build: () => HTMLElement } = {
        build: () => {
            const el = new LabelBuilder()
                .withCaption(of('Ask about the March close, or pick a suggestion below.'))
                .withSize(LabelSize.SMALL)
                .build();
            el.classList.add('p-4');
            return el;
        },
    };

    const panel = new ChatPanelBuilder()
        .withMessages(messages$)
        .withOnSend(send)
        .withEmptyState(emptyState)
        .withSuggestions(suggestions$)
        .withCaption(of('Aura Assistant'))
        .withStatus(of('Online'))
        .withPlaceholder(of('Ask about the March close…'))
        .build();

    const stage = panelStage(panel, 'Chips live above the composer; the app decides when they appear.');
    registerDestroy(stage, () => {
        sub.unsubscribe();
        messages$.complete();
        suggestions$.complete();
    });
    return stage;
};

// ---------------------------------------------------------------------------
// 4. Streaming — typing indicator, then deterministic deltas
// ---------------------------------------------------------------------------

/**
 * Streaming is a view convention, not a feature: re-emit the whole list with one
 * message's `content` growing and the panel patches that bubble in place
 * (matched by `id`). An assistant message whose `content` is `''` renders as the
 * typing indicator, replaced by the first delta in the same node.
 *
 * `timer` drives fixed 45ms steps over a fixed script, so the story is
 * reproducible — no `Math.random()`, no transport.
 */
export const Streaming = () => {
    const ANSWER =
        'Cheque #4471 for £2,410 was raised on 27 March and has not cleared. It is the whole of the reconciliation difference — post it to unpresented items and March closes flat.';

    const DELTAS = ANSWER.match(/\S+\s*/g) ?? [];

    const question: ChatMessage = {
        id: 's1',
        role: 'user',
        content: 'The March bank rec is out by £2,410. Where should I look?',
    };
    // Empty assistant content === typing indicator.
    const answer: ChatMessage = { id: 's2', role: 'assistant', content: '' };

    const messages$ = new BehaviorSubject<ChatMessage[]>([question, answer]);

    const stage = panelStage(
        new ChatPanelBuilder()
            .withMessages(messages$)
            .withOnSend(() => { /* view-only story: the script owns the list */ })
            .withCaption(of('Aura Assistant'))
            .withStatus(of('Thinking…'))
            .withPlaceholder(of('Streaming demo — replay to watch again'))
            .build(),
        'The typing bubble is an assistant message with empty content.',
    );

    // 600ms of "thinking", then one token every 45ms, accumulated rather than
    // re-joined from the start on every tick.
    let grown = '';
    const sub = timer(600, 45).subscribe(index => {
        if (index >= DELTAS.length) {
            sub.unsubscribe();
            return;
        }
        grown += DELTAS[index];
        messages$.next([question, { ...answer, content: grown }]);
    });
    registerDestroy(stage, () => {
        sub.unsubscribe();
        messages$.complete();
    });

    return stage;
};

// ---------------------------------------------------------------------------
// 5. WithTrigger — one subject, two components
// ---------------------------------------------------------------------------

/**
 * `ChatTriggerBuilder.withOpen()` and `ChatPanelBuilder.withOpen()` take the same
 * `Subject<boolean>`. The trigger emits the negation of the latest value and
 * hides itself (and goes `inert`) while the panel is open; `asClosable()` renders
 * the header close button that emits `false`.
 *
 * Note that calling `withOpen()` at all makes the panel start **closed**.
 */
export const WithTrigger = () => {
    const open$ = new BehaviorSubject<boolean>(false);
    const messages$ = new BehaviorSubject<ChatMessage[]>(CONVERSATION);

    const body = document.createElement('div');
    body.className = 'flex h-full min-w-0 flex-1 flex-col items-start gap-3 p-6';
    body.appendChild(
        new LabelBuilder()
            .withCaption(of('Open the assistant from the page, close it from its header.'))
            .withSize(LabelSize.SMALL)
            .build(),
    );
    body.appendChild(
        new ChatTriggerBuilder().withOpen(open$).withCaption(of('Ask assistant')).build(),
    );

    const panel = new ChatPanelBuilder()
        .withMessages(messages$)
        .withOnSend(userAppender(messages$, 't'))
        .withOpen(open$)
        .asClosable()
        .withCaption(of('Aura Assistant'))
        .withStatus(of('Online'))
        .build();

    const shell = createShell(body, panel);
    registerDestroy(shell, () => {
        open$.complete();
        messages$.complete();
    });
    return shell;
};

// ---------------------------------------------------------------------------
// 6. Glass
// ---------------------------------------------------------------------------

/**
 * `asGlass()` drops the panel's own background and border and lets
 * `.glass-effect` supply a frosted surface — for a panel docked over a coloured
 * or image background.
 */
export const Glass = () => {
    const messages$ = new BehaviorSubject<ChatMessage[]>(CONVERSATION);

    const panel = new ChatPanelBuilder()
        .withMessages(messages$)
        .withOnSend(userAppender(messages$, 'g'))
        .withCaption(of('Aura Assistant'))
        .withStatus(of('Online'))
        .asGlass()
        .build();

    const stage = document.createElement('div');
    stage.className = 'relative w-full overflow-hidden rounded-large';
    stage.style.height = `${SHELL_HEIGHT_PX}px`;
    stage.appendChild(createGlassBackdrop(GLASS_GRADIENTS.INDIGO_PINK, 6, 'opacity-70'));

    const row = document.createElement('div');
    row.className = 'relative flex h-full w-full justify-end';
    row.appendChild(panel);
    stage.appendChild(row);

    registerDestroy(stage, () => messages$.complete());
    return stage;
};

// ---------------------------------------------------------------------------
// 7. AppShell — the same composition the SideBar stories use
// ---------------------------------------------------------------------------

/**
 * Rail + page + docked assistant in one horizontal `LayoutBuilder`. Shared with
 * `Components/SideBar → AppShell`; both call `createAppShell()` from
 * `story-helpers/app-shell.ts`.
 */
export const AppShell = () => createAppShell();
