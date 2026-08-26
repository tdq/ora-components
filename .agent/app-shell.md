# App Shell

How to compose a full application screen from `SideBarBuilder`, a content area and the chat pair (`ChatPanelBuilder` + `ChatTriggerBuilder`) with `LayoutBuilder`.

The shell is a single horizontal `LayoutBuilder` with three slots. Two of them are `SlotSize.FIT` — the sidebar and the chat panel size themselves from their own CSS (`--ora-sidebar-width` / `--ora-chat-width`) and animate their own width — and the content slot is `SlotSize.FULL`, so it absorbs whatever those two give back.

```typescript
import { BehaviorSubject, of } from 'rxjs';
import {
    LayoutBuilder, LayoutGap, SlotSize,
    SideBarBuilder, ChatPanelBuilder, ChatTriggerBuilder,
    Icons, type ChatMessage,
} from '@tdq/ora-components';

// The one piece of state the chat pair shares. See "One subject for the whole chat" below.
const chatOpen$ = new BehaviorSubject<boolean>(false);
const messages$ = new BehaviorSubject<ChatMessage[]>([]);

// 1. Sidebar — owns its own expanded state and persists it.
const sidebar = new SideBarBuilder()
    .withRouter(router)
    .withCaption(of('Northwind'))
    .asGlass();
sidebar.addItem().withIcon(Icons.MENU).withCaption(of('Ledger')).withHref('/ledger');
sidebar.addItem().withIcon(Icons.CALENDAR).withCaption(of('Payables')).withHref('/payables');
sidebar.withFooter().withCaption(of('Northwind Ltd')).withDescription(of('Owner'));

// 2. Content — a vertical layout the router (or the page) fills.
const contentArea = new LayoutBuilder()
    .asVertical()
    .withGap(LayoutGap.LARGE)
    .withClass(of('h-full overflow-auto p-4'));
contentArea.addSlot().withSize(SlotSize.FULL).withContent(routerOutlet);

// 3. Chat panel — view-only; the app owns messages$ and the transport.
const chatPanel = new ChatPanelBuilder()
    .withMessages(messages$)
    .withOnSend(text => send(text))
    .withOpen(chatOpen$)
    .asClosable()
    .asGlass();

// 4. Trigger — a floating pill, not a shell slot.
const chatTrigger = new ChatTriggerBuilder()
    .withOpen(chatOpen$)
    .withCaption(of('Ask about this ledger'));
contentArea.addSlot().withSize(SlotSize.FIT).withContent(chatTrigger);

// 5. The shell itself.
const shell = new LayoutBuilder()
    .asHorizontal()
    .withGap(LayoutGap.NONE)
    .withClass(of('h-screen w-full overflow-hidden'));

// FIT: the sidebar owns its collapsed/expanded width and transitions it itself.
shell.addSlot().withSize(SlotSize.FIT).withContent(sidebar);
// FULL: takes every remaining pixel and shrinks as the panels open.
shell.addSlot().withSize(SlotSize.FULL).withContent(contentArea);
// FIT: 0px wide while closed, --ora-chat-width while open.
shell.addSlot().withSize(SlotSize.FIT).withContent(chatPanel);

document.body.appendChild(shell.build());
```

`LayoutGap.NONE` is deliberate: the sidebar reserves its own gutter through `--ora-sidebar-gutter`, and the chat container carries its own padding, so a layout gap on top of them would double the spacing and desynchronise the two width animations.

The trigger is **not** a shell slot. It is a floating pill positioned by its own CSS, so it is added inside the content area (as above) or appended straight to `document.body` — either way it must not take a column in the shell row.

## One subject for the whole chat

`ChatPanelBuilder.withOpen()` and `ChatTriggerBuilder.withOpen()` take the **same** `Subject<boolean>`. That single stream is the only coupling between them, and it is what makes any third control able to drive the chat. Spelled out, with the options the shell snippet above left at their defaults:

```typescript
const chatPanel = new ChatPanelBuilder()
    .withMessages(messages$)
    .withOnSend(text => send(text))
    .withOpen(chatOpen$)        // starts closed; closed means aria-hidden + inert
    .asClosable()               // header close button emits false on chatOpen$
    .withSuggestions(suggestions$)  // app-driven quick-reply chips; emit [] to hide them
    .withCaption(of('Aura Assistant'))
    .withStatus(of('Online'))
    .withWidth(of(420))
    .asGlass();

const chatTrigger = new ChatTriggerBuilder()
    .withOpen(chatOpen$)        // hides itself + goes inert while open
    .withCaption(of('Ask about this ledger'));
```

Use a `BehaviorSubject`, not a plain `Subject`: both components mirror emissions rather than reading a current value, so with a valueless subject the panel simply stays closed until something emits.

## Cmd/Ctrl+K

The library ships no global shortcut — a key binding is application policy. Wire it in the app and tear it down with the app:

```typescript
const onKeyDown = (event: KeyboardEvent): void => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        chatOpen$.next(!chatOpen$.getValue());
    }
};
document.addEventListener('keydown', onKeyDown);

// On shell teardown:
document.removeEventListener('keydown', onKeyDown);
chatOpen$.complete();
```

`Escape` is intentionally left alone: the chat panel is a docked panel, not a modal, and stealing `Escape` would fight the dialogs, popovers and menus that legitimately own it.

## Mobile overlay

Below roughly 960px the shell stops being a three-column layout.

- **Sidebar.** `SidebarLogic` already watches `matchMedia('(max-width: 959px)')` and force-collapses an expanded rail, giving the width back to the content. That collapse is transient and is never persisted, so the operator's wide-screen preference returns intact. Nothing is needed in the app for the default path. When the app supplies its own `withExpanded(subject)`, persistence **and** the auto-collapse are both disabled and the app must implement the narrow-viewport behaviour itself.
- **Chat panel.** A 420px docked panel beside a 375px viewport is not viable, so the app switches it to a full-width overlay: keep the same `chatOpen$`, and drive the width from the viewport.

```typescript
const narrow$ = fromEvent(window.matchMedia('(max-width: 959px)'), 'change').pipe(
    map(e => (e as MediaQueryListEvent).matches),
    startWith(window.matchMedia('(max-width: 959px)').matches),
    shareReplay(1),
);

const chatPanel = new ChatPanelBuilder()
    .withMessages(messages$)
    .withOnSend(send)
    .withOpen(chatOpen$)
    .asClosable()
    .withWidth(narrow$.pipe(map(narrow => (narrow ? window.innerWidth : 420))));
```

Add the app's own scrim and `position: fixed` overlay CSS on the narrow breakpoint. `asClosable()` is not optional on mobile — the header close button is the only way out of a full-width overlay.

## The app owns chat state and transport

The chat components are view-only. The application holds the conversation and every side effect:

```typescript
const messages$ = new BehaviorSubject<ChatMessage[]>([]);

function append(message: ChatMessage): void {
    messages$.next([...messages$.getValue(), message]);
}

/** Re-emit the whole list with one message's content replaced — the panel patches that bubble. */
function patch(id: string, content: string): void {
    messages$.next(messages$.getValue().map(m => (m.id === id ? { ...m, content } : m)));
}

async function send(text: string): Promise<void> {
    append({ id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() });

    const replyId = crypto.randomUUID();
    append({ id: replyId, role: 'assistant', content: '' });   // '' renders the typing indicator

    const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let content = '';
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        patch(replyId, content);                                // streaming = repeated re-emission
    }
}
```

Rules this leans on:

- **Ids are stable and unique.** They are the panel's reconciliation key; reusing one merges two messages, changing one rebuilds the row.
- **Append only.** A new id is added at the end of the list in emission order. Reordering and prepending history are not supported.
- **An assistant message with `content: ''`** is the typing indicator, and it comes back if a stream is reset to `''`.
- **Content is plain text.** Markdown and HTML render verbatim; rich rendering is a non-goal of the panel.
- **Quick replies are app state too.** `withSuggestions(suggestions$)` renders whatever the app emits as chips above the composer, and a click just calls `send(text)`; clearing them after a click, or offering a "Yes / No" pair once the assistant asks a question, is the app's own `suggestions$.next(...)`.
- **Complete what you create.** `messages$`, `chatOpen$` and any `suggestions$` are the app's subjects; the components never complete them. Complete them when the shell is torn down.

## See also

- [SideBar](components/sidebar.md), [ChatPanel](components/chatpanel.md), [ChatTrigger](components/chattrigger.md)
- [Layout](layout.md) for `SlotSize`, `LayoutGap` and nesting rules
- [Reactive](reactive.md) for subscription ownership and teardown
