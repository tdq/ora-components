# ChatTrigger

## Description

ChatTrigger is the pill button that opens the chat panel. It shares the panel's open `Subject`, toggling it on click and hiding itself while the panel is open, so the button and the panel never compete for the same corner of the screen.

- `withOpen(open: Subject<boolean>): this` - **required.** The open state shared with `ChatPanelBuilder.withOpen()`. Clicking emits the negation of the latest value; the trigger mirrors emissions rather than reading the subject, so a plain `Subject` works as well as a `BehaviorSubject`.
- `withCaption(caption: Observable<string>): this` - sets the button label, which also becomes its `aria-label`. Defaults to `'Ask assistant'`.
- `withClass(className$: Observable<string>): this` - apply custom class names to the host element via classList mutations. On each emission, previously added custom classes are removed and new ones are added; base classes and runtime state classes (such as the `--hidden` state) survive because only custom classes are removed.
- `withTestId(id: string): this` - sets `data-testid` on the rendered host element. See [Test ids](../builder-pattern.md#test-ids).
- `build(): HTMLElement` - builds the trigger element. Throws when `withOpen()` was not supplied.

## Relation to ChatPanel

The trigger is not a child of the panel and does not know about it. The only coupling is the `Subject<boolean>` both are given:

```typescript
const chatOpen$ = new BehaviorSubject<boolean>(false);

const panel = new ChatPanelBuilder()
    .withMessages(messages$)
    .withOnSend(text => sendMessage(text))
    .withOpen(chatOpen$)
    .asClosable()
    .asGlass();

const trigger = new ChatTriggerBuilder()
    .withOpen(chatOpen$)
    .withCaption(of('Ask about this ledger'));
```

While `chatOpen$` is `true` the trigger's wrapper gets `ora-chat-trigger-wrapper--hidden`, `aria-hidden="true"` and `inert`, and the button itself is `disabled` — it leaves the tab order entirely rather than sitting invisible behind the open panel. All four are removed on close. The panel's own close button (`ChatPanelBuilder.asClosable()`) emits `false` on the same subject, which brings the trigger back.

Because the coupling is one subject, any other control can drive it: a `Cmd/Ctrl+K` shortcut, a toolbar action or a deep link all just call `chatOpen$.next(...)`. See [app-shell.md](../app-shell.md) for the full composition and [ChatPanel](chatpanel.md) for the panel itself.

## Styling

The trigger declares the shared `--ora-chat-*` custom properties (see [ChatPanel](chatpanel.md#styling)); its icon is filled with `--ora-chat-accent` and its focus ring is `--md-sys-color-primary`. Under `prefers-reduced-motion: reduce` the sparkle animation is disabled.
