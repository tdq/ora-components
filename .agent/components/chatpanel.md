# ChatPanel

## Description

ChatPanel is a view-only docked chat surface: a header, a scrolling message list and a composer. It owns no transport and no message store — it renders whatever `withMessages()` emits and reports typed text back through `withOnSend()`, so the application keeps the conversation in its own `BehaviorSubject<ChatMessage[]>` and decides how messages are fetched, streamed and persisted.

- `withMessages(messages: Observable<ChatMessage[]>): this` - **required.** Supplies the full message list on every emission. Rows are reconciled by `msg.id`, so re-emitting the list with one message's `content` grown patches that bubble in place instead of re-rendering the list.
- `withOnSend(cb: (text: string) => void): this` - **required.** Called with the trimmed composer text when the user sends a message. The panel clears and refocuses the composer; appending the message to the list is the application's job.
- `withOpen(open: Subject<boolean>): this` - binds two-way open state. `true` slides the panel in and focuses the composer (only on a change — a re-emitted `true` does not steal focus), `false` collapses it. Calling this makes the panel start **closed**, and the closed panel is `aria-hidden` and `inert`. Omit it and the panel is permanently open.
- `asClosable(): this` - renders a close button in the header. It emits `false` on the `withOpen()` subject; without `withOpen()` the button renders but has no observable effect.
- `withCaption(caption: Observable<string>): this` - sets the header title, which also names the panel's `role="region"`. Defaults to `'Assistant'`.
- `withStatus(status: Observable<string>): this` - sets a header subtitle next to a status dot, for example `'Online'`. Omitted entirely when not set.
- `withPlaceholder(placeholder: Observable<string>): this` - sets the composer placeholder. Defaults to `'Message…'`.
- `withEmptyState(emptyState: ComponentBuilder): this` - supplies the content shown in the message area while the list is empty. The builder is rebuilt on every transition into the empty state.
- `withSuggestions(suggestions: Observable<ChatSuggestion[]>): this` - renders app-driven quick-reply chips between the message log and the composer, in the empty state and mid-conversation alike. Clicking a chip sends that item's `text` through `withOnSend()` without touching the composer. The panel never clears the chips itself — emit `[]` to hide the row.
- `withWidth(width: Observable<number>): this` - sets the panel width in pixels, written to the `--ora-chat-width` custom property. Defaults to `420`.
- `asGlass(): this` - renders the panel body with the shared `glass-effect` translucent, blurred surface.
- `build(): HTMLElement` - builds the panel element. Throws when `withMessages()` or `withOnSend()` was not supplied.

`ChatMessage` is the transport-free message shape:

```typescript
type ChatRole = 'user' | 'assistant';

interface ChatMessage {
    id: string;          // reconciliation key
    role: ChatRole;
    content: string;     // '' on an assistant message renders the typing indicator
    timestamp?: number;
}
```

`ChatSuggestion` is the quick-reply chip shape used by `withSuggestions()`:

```typescript
interface ChatSuggestion {
    caption: string;     // visible chip label
    text: string;        // what is sent through withOnSend() on click
}
```

## Architecture

`chat-panel-builder.ts` collects configuration, validates the two required options and delegates to `ChatPanelViewport` (`chat-panel-viewport.ts`), which **builds the whole DOM once** and then keeps only the message list in sync. Nothing outside the list is ever rebuilt: header, composer and container are wired to their observables at build time.

```
div.ora-chat-panel-wrapper[data-slot=chat-panel]
└─ div.ora-chat-panel-container(.ora-chat-panel--open | .ora-chat-panel--closed)   ← carries --ora-chat-width
   └─ div.ora-chat-panel-inner[role=region][aria-label][aria-hidden][inert?](.glass-effect)
      ├─ div.ora-chat-header
      │  ├─ div.ora-chat-header-title-wrap > span.ora-chat-header-badge + div.ora-chat-header-title-col
      │  │     └─ div.ora-chat-header-title + div.ora-chat-header-subtitle > span.ora-chat-status-dot + text
      │  └─ button.ora-chat-icon-btn                                  ← only with asClosable()
      ├─ div.ora-chat-messages[data-slot=messages][role=log][aria-live=polite][tabindex=0]
      │  └─ div.ora-chat-row--{role}[data-message-id] > div.ora-chat-avatar? + div.ora-chat-bubble--{role}
      ├─ div.ora-chat-suggestions[data-slot=suggestions][role=group][aria-label=Suggestions][hidden?]
      │  └─ button.ora-chat-suggestion[title?]                        ← only with withSuggestions()
      └─ div.ora-chat-composer-wrap > form.ora-chat-composer > textarea.ora-chat-textarea + button.ora-chat-send-btn
                                    + div.ora-chat-composer-hint
└─ ora-lifecycle-boundary
```

**Diff-only reconciliation.** Each emission is walked once against a `Map<string, RenderedRow>`:

- an `id` already rendered whose `content` changed patches the existing bubble node in place (node identity is preserved, which is what makes streaming cheap);
- an `id` not yet rendered is **appended to the end of the list**;
- an `id` present in the map but absent from the emission has its row removed.

Rows are appended **in emission order**, so a new `id` lands at the end regardless of where it sits in the array. Reordering an existing list and prepending older history (infinite scroll-back) are not supported — the panel is built for an append-only conversation.

Teardown is one `createLifecycleBoundary()` on the wrapper: it unsubscribes every stream, clears the pending focus timer and drops the row map. `registerDestroy` is not used.

## Messages

- **Rows.** `ora-chat-row--user` is right-aligned with no avatar; `ora-chat-row--assistant` is left-aligned and carries a sparkle avatar. Content is written with `textContent` only.
- **Typing indicator.** An **assistant** message whose `content` is `''` renders as `ora-chat-bubble--typing` containing three bouncing dots labelled `"Assistant is typing"`. The swap is two-way: the indicator is dropped on the first delta and restored if a stream is reset back to `''`, so the state is always derived from the current content rather than dropped once.
- **Autoscroll.** Before reconciling, the list records whether it was within 40px of the bottom. It scrolls to the bottom afterwards — inside a `requestAnimationFrame`, so the new content is laid out first — when it was already at the bottom **or** when the row that was just appended is a **user** message (the operator pressed send, so they expect to follow it). A reader who scrolled up to read history is never yanked back down: not by a content patch, and not by an arriving assistant row or streaming delta.
- **Announcements.** The list is `role="log"` with `aria-live="polite"`, and `tabindex="0"` so the scrollable region can be scrolled by keyboard. The typing indicator carries `role="status"` — a roleless generic cannot carry an accessible name, so without it the `"Assistant is typing"` label never reaches a screen reader.

## Composer

An auto-growing `<textarea>` inside a `<form>`, plus a send button and the static hint `Enter to send · Shift+Enter for newline`.

- **Enter sends**, `Shift+Enter` inserts a newline. Enter is ignored while `event.isComposing` is true, so committing an IME candidate does not send the message.
- **Submit** trims the value, returns early when it is empty, calls `withOnSend`, then clears, re-collapses and refocuses the textarea.
- **Send button** is `disabled` whenever the trimmed value is empty.
- **Auto-size** recomputes `height` from `scrollHeight` on every input, capped at 160px, after which the textarea scrolls.
- **Focus on open** is deferred 280ms to match the slide-in transition; under `prefers-reduced-motion: reduce` there is no transition to wait for, so the composer is focused immediately. A close arriving inside that window cancels the pending focus, so focus is never stolen after the panel has collapsed. The open stream is piped through `distinctUntilChanged()`, so a re-emitted `true` (a parent replaying its state) does not pull focus back into the composer.

## Streaming contract (view-only)

The component renders a stream; it never produces one. The application drives it:

1. Append the user message to its `BehaviorSubject<ChatMessage[]>` from the `withOnSend` callback.
2. Append an assistant message with `content: ''` — the panel shows the typing indicator.
3. For each delta from `fetch`/SSE/WebSocket, re-emit the **whole list** with that assistant message keeping its `id` and growing its `content`. The panel patches that one bubble.

There is no markdown or HTML rendering: message content is written verbatim with `textContent`. Syntax highlighting, link detection and rich embeds are explicit non-goals — an application that needs them renders its own message area.

## Empty state

While `messages` is empty, the message area is replaced with `withEmptyState()`'s element; without one it is simply empty. The builder is **rebuilt on every transition into the empty state**, not cached: `replaceChildren()` detaches the previous element and fires its one-shot lifecycle boundary, so that instance can never be reused. A repeat empty emission does not rebuild (the panel tracks whether the empty state is already shown). This is why `withEmptyState` accepts a `ComponentBuilder` rather than an element — the builder contract is that `build()` returns a fresh element each call. Suggestion chips inside the empty state call the application's own send handler. For chips that outlive the first message, use [`withSuggestions()`](#suggestions) instead — the two compose freely.

## Suggestions

`withSuggestions(Observable<ChatSuggestion[]>)` adds a wrap-flex row of quick-reply chips between the message log and the composer. It is the mid-conversation counterpart to the empty state's chips: it survives the first message, so an assistant reply that ends in a question can be answered with "Yes, please" / "No, thanks".

- **App-driven.** Every emission replaces the row wholesale; the panel never adds, removes or clears a chip on its own. Emit `[]` to hide the row — including after a click, which is the application's decision.
- **Send on click.** A click calls `withOnSend()` with the chip's `text` (trimmed, blank no-ops) and then focuses the composer — the next emission may remove the chip the caret sits on. The composer's own value is never read or written, so a half-typed message survives a chip click.
- **No call, no node.** Without `withSuggestions()` nothing is appended, so an existing panel's DOM is unchanged. With it, the row is built `hidden` and stays hidden until the first non-empty emission, so a valueless `Subject` reserves no height.
- **Blank `text` items are filtered** before render, so `hidden` reflects the usable count rather than the raw array length.
- **`title`** is set only when `text !== caption`, keeping a long prompt reachable behind a short label.
- **Autoscroll.** Showing or hiding the row resizes the message area, so `renderSuggestions()` measures "was at bottom" before the swap and re-pins in a `requestAnimationFrame`.
- **Accessibility.** The row is `role="group"` with `aria-label="Suggestions"`; chips are ordinary `<button type="button">` elements in the tab order between the log and the composer. Captions are written with `textContent`.
- **Styling.** `.ora-chat-suggestions` / `.ora-chat-suggestion` — pills on `--md-sys-color-surface-container-low` with an `--ora-chat-outline-variant` border, a primary-tinted hover and focus ring, and a glass variant that swaps in a translucent veil. The 150ms fade-in is disabled under `prefers-reduced-motion`.

## Requirements

- `withMessages()` and `withOnSend()` are required; `build()` throws without either.
- The application owns the message list, message ids, ordering and any transport. Ids must be stable and unique — they are the reconciliation key.
- A `Subject` passed to `withOpen()` belongs to the caller and is never completed by the panel. Use a `BehaviorSubject`: with a valueless `Subject` the panel stays closed until the first emission.
- The panel is a docked side panel, not a modal: it does **not** focus-trap. The closed panel is `inert`, so it is out of the tab order, but an open panel does not capture focus.
- Share one `Subject<boolean>` between `ChatPanelBuilder.withOpen()` and [ChatTrigger](chattrigger.md) so the trigger hides itself while the panel is open. See [app-shell.md](../app-shell.md).

## Styling

Custom properties are declared on the wrapper and can be overridden by the consuming application:

| Property | Default | Purpose |
| --- | --- | --- |
| `--ora-chat-width` | `420px` | Panel width; `withWidth()` writes it. The open container is `calc(var(--ora-chat-width) + var(--md-sys-spacing-4) + var(--md-sys-spacing-1))` to cover container padding. |
| `--ora-chat-status-color` | `var(--md-sys-color-tertiary)` | Header status dot, whose halo is a `color-mix()` of it. |
| `--ora-chat-accent` | `linear-gradient(135deg, primary, tertiary)` | Shared by the header badge, assistant avatar, user bubble and send button. |
| `--ora-chat-surface-high` | `var(--md-sys-color-surface-container-high, …)` | Assistant bubble and composer background, with a fallback onto `surface-container-low`. |
| `--ora-chat-outline-variant` | `var(--md-sys-color-outline-variant, …)` | Assistant bubble and composer border, with a `color-mix()` fallback on `outline`. |
| `--ora-chat-hairline` | `color-mix(… outline 20% …)` | Header, composer and panel separators. |

Text on the accent gradient is `--md-sys-color-on-primary`. Focus rings on the icon, send and close buttons are `--md-sys-color-primary`.

**Open/closed** is a class pair on the container: `.ora-chat-panel--open` animates `width`, `padding`, `opacity` and `transform` in; `.ora-chat-panel--closed` collapses them. `inert` travels with `aria-hidden` because the collapsed container is only *visually* collapsed — without it the composer would stay in the tab order.

**Glass.** `asGlass()` adds `.glass-effect` to `.ora-chat-panel-inner`. See [glass-effects.md](../glass-effects.md).

**Reduced motion.** Under `prefers-reduced-motion: reduce` the sparkle, message-in and typing-dot animations, the panel slide transition, the send/trigger button `transform` transitions and the message list's smooth `scroll-behavior` are all switched off.

## Non-goals

- **Markdown / HTML rendering.** Content is plain text via `textContent`.
- **Transport.** No `fetch`, no SSE, no WebSocket, no retry or error surface. The header status line is the only affordance for connection state, and the application supplies its text.
- **A message store.** No local history, no persistence, no optimistic queueing.
- **Reordering or history prepend.** New ids append; see [Architecture](#architecture).
- **Focus trapping**, and **file attachments / voice input**.
