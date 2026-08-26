import { BehaviorSubject, Subject, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { ChatPanelBuilder } from './chat-panel-builder';
import { ChatMessage, ChatSuggestion } from './types';

class EmptyStateBuilder implements ComponentBuilder {
    build(): HTMLElement {
        const el = document.createElement('div');
        el.id = 'empty-state';
        el.textContent = 'How can I help?';
        return el;
    }
}

/** Counts how many elements it has produced, to prove each one is freshly built. */
class CountingEmptyStateBuilder implements ComponentBuilder {
    builds = 0;

    build(): HTMLElement {
        this.builds++;
        const el = document.createElement('div');
        el.id = 'empty-state';
        el.dataset.build = String(this.builds);
        return el;
    }
}

const USER: ChatMessage = { id: 'm1', role: 'user', content: 'Show unpaid invoices' };
const ASSISTANT: ChatMessage = { id: 'm2', role: 'assistant', content: 'Three invoices are overdue.' };

function messagesArea(panel: HTMLElement): HTMLElement {
    return panel.querySelector<HTMLElement>('.ora-chat-messages')!;
}

function rows(panel: HTMLElement): HTMLElement[] {
    return Array.from(panel.querySelectorAll<HTMLElement>('.ora-chat-row'));
}

function textarea(panel: HTMLElement): HTMLTextAreaElement {
    return panel.querySelector<HTMLTextAreaElement>('.ora-chat-textarea')!;
}

function suggestionRow(panel: HTMLElement): HTMLElement | null {
    return panel.querySelector<HTMLElement>('[data-slot="suggestions"]');
}

function chips(panel: HTMLElement): HTMLButtonElement[] {
    return Array.from(panel.querySelectorAll<HTMLButtonElement>('.ora-chat-suggestion'));
}

function pressKey(el: HTMLElement, key: string, shiftKey = false): void {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }));
}

describe('ChatPanelBuilder', () => {
    describe('required options', () => {
        it('throws when withMessages() is missing', () => {
            expect(() => new ChatPanelBuilder().withOnSend(() => undefined).build())
                .toThrow('ChatPanelBuilder: withMessages() is required before build()');
        });

        it('throws when withOnSend() is missing', () => {
            expect(() => new ChatPanelBuilder().withMessages(of([])).build())
                .toThrow('ChatPanelBuilder: withOnSend() is required before build()');
        });
    });

    describe('empty state', () => {
        it('renders the empty-state builder while the list is empty and removes it on the first message', () => {
            const messages$ = new BehaviorSubject<ChatMessage[]>([]);
            const panel = new ChatPanelBuilder()
                .withMessages(messages$)
                .withOnSend(() => undefined)
                .withEmptyState(new EmptyStateBuilder())
                .build();

            expect(messagesArea(panel).querySelector('#empty-state')).not.toBeNull();

            messages$.next([USER]);

            expect(messagesArea(panel).querySelector('#empty-state')).toBeNull();
            expect(rows(panel)).toHaveLength(1);
        });

        it('builds a fresh element on every empty emission', () => {
            // The previous element was detached, which fires its one-shot lifecycle boundary
            // and kills any subscription inside it — so it must never be re-attached.
            const messages$ = new BehaviorSubject<ChatMessage[]>([]);
            const emptyState = new CountingEmptyStateBuilder();
            const panel = new ChatPanelBuilder()
                .withMessages(messages$)
                .withOnSend(() => undefined)
                .withEmptyState(emptyState)
                .build();

            const first = messagesArea(panel).querySelector('#empty-state')!;
            expect(emptyState.builds).toBe(1);

            messages$.next([USER]);
            messages$.next([]);

            const second = messagesArea(panel).querySelector('#empty-state')!;
            expect(emptyState.builds).toBe(2);
            expect(second).not.toBe(first);
            expect(second.getAttribute('data-build')).toBe('2');
        });

        it('leaves the message area empty when no empty state was configured', () => {
            const panel = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(() => undefined)
                .build();

            expect(messagesArea(panel).children).toHaveLength(0);
        });
    });

    describe('header', () => {
        it('renders the close button only after asClosable()', () => {
            const base = () => new ChatPanelBuilder().withMessages(of<ChatMessage[]>([])).withOnSend(() => undefined);

            expect(base().build().querySelector('.ora-chat-icon-btn')).toBeNull();
            expect(base().asClosable().build().querySelector('.ora-chat-icon-btn')).not.toBeNull();
        });

        it('emits false on the open subject when the close button is clicked', () => {
            const open$ = new BehaviorSubject(true);
            const panel = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(() => undefined)
                .withOpen(open$)
                .asClosable()
                .build();

            panel.querySelector<HTMLButtonElement>('.ora-chat-icon-btn')!.click();

            expect(open$.getValue()).toBe(false);
        });

        it('renders the caption and the status dot', () => {
            const panel = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(() => undefined)
                .withCaption(of('Ledger assistant'))
                .withStatus(of('Online'))
                .build();

            expect(panel.querySelector('.ora-chat-header-title')!.textContent).toBe('Ledger assistant');
            expect(panel.querySelector('.ora-chat-header-subtitle')!.textContent).toBe('Online');
            expect(panel.querySelector('.ora-chat-status-dot')).not.toBeNull();
        });

        it('defaults the caption to Assistant', () => {
            const panel = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(() => undefined)
                .build();

            expect(panel.querySelector('.ora-chat-header-title')!.textContent).toBe('Assistant');
        });
    });

    describe('message list', () => {
        it('renders one row per message with a role class', () => {
            const panel = new ChatPanelBuilder()
                .withMessages(of([USER, ASSISTANT]))
                .withOnSend(() => undefined)
                .build();

            const [first, second] = rows(panel);
            expect(first.classList.contains('ora-chat-row--user')).toBe(true);
            expect(second.classList.contains('ora-chat-row--assistant')).toBe(true);
            expect(first.querySelector('.ora-chat-bubble')!.textContent).toBe(USER.content);
        });

        it('patches the same bubble node when a message content grows', () => {
            const messages$ = new BehaviorSubject<ChatMessage[]>([{ id: 'm2', role: 'assistant', content: 'Three' }]);
            const panel = new ChatPanelBuilder()
                .withMessages(messages$)
                .withOnSend(() => undefined)
                .build();

            const bubbleBefore = panel.querySelector('.ora-chat-bubble')!;

            messages$.next([{ id: 'm2', role: 'assistant', content: 'Three invoices are overdue.' }]);

            const bubbleAfter = panel.querySelector('.ora-chat-bubble')!;
            expect(bubbleAfter).toBe(bubbleBefore);
            expect(bubbleAfter.textContent).toBe('Three invoices are overdue.');
            expect(rows(panel)).toHaveLength(1);
        });

        it('shows a typing bubble for an empty assistant message and replaces it in place on the first delta', () => {
            const messages$ = new BehaviorSubject<ChatMessage[]>([{ id: 'm2', role: 'assistant', content: '' }]);
            const panel = new ChatPanelBuilder()
                .withMessages(messages$)
                .withOnSend(() => undefined)
                .build();

            const bubble = panel.querySelector('.ora-chat-bubble')!;
            expect(bubble.classList.contains('ora-chat-bubble--typing')).toBe(true);
            expect(bubble.querySelector('.ora-chat-typing')).not.toBeNull();

            messages$.next([{ id: 'm2', role: 'assistant', content: 'Working on it' }]);

            expect(panel.querySelector('.ora-chat-bubble')).toBe(bubble);
            expect(bubble.classList.contains('ora-chat-bubble--typing')).toBe(false);
            expect(bubble.querySelector('.ora-chat-typing')).toBeNull();
            expect(bubble.textContent).toBe('Working on it');
        });

        it('restores the typing bubble when assistant content is reset to empty', () => {
            const messages$ = new BehaviorSubject<ChatMessage[]>([{ id: 'm2', role: 'assistant', content: 'Draft' }]);
            const panel = new ChatPanelBuilder()
                .withMessages(messages$)
                .withOnSend(() => undefined)
                .build();

            const bubble = panel.querySelector('.ora-chat-bubble')!;
            expect(bubble.classList.contains('ora-chat-bubble--typing')).toBe(false);

            messages$.next([{ id: 'm2', role: 'assistant', content: '' }]);

            expect(panel.querySelector('.ora-chat-bubble')).toBe(bubble);
            expect(bubble.classList.contains('ora-chat-bubble--typing')).toBe(true);
            expect(bubble.querySelector('.ora-chat-typing')).not.toBeNull();

            messages$.next([{ id: 'm2', role: 'assistant', content: 'Retrying' }]);

            expect(bubble.classList.contains('ora-chat-bubble--typing')).toBe(false);
            expect(bubble.querySelector('.ora-chat-typing')).toBeNull();
            expect(bubble.textContent).toBe('Retrying');
        });

        it('removes a row whose id is no longer in the list', () => {
            const messages$ = new BehaviorSubject<ChatMessage[]>([USER, ASSISTANT]);
            const panel = new ChatPanelBuilder()
                .withMessages(messages$)
                .withOnSend(() => undefined)
                .build();

            expect(rows(panel)).toHaveLength(2);

            messages$.next([ASSISTANT]);

            const remaining = rows(panel);
            expect(remaining).toHaveLength(1);
            expect(remaining[0].getAttribute('data-message-id')).toBe(ASSISTANT.id);
        });
    });

    describe('composer', () => {
        it('sends and clears on Enter', () => {
            const sent: string[] = [];
            const panel = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(text => sent.push(text))
                .build();

            const input = textarea(panel);
            input.value = '  Show Q1 sales  ';
            pressKey(input, 'Enter');

            expect(sent).toEqual(['Show Q1 sales']);
            expect(input.value).toBe('');
        });

        it('does not send on Shift+Enter', () => {
            const sent: string[] = [];
            const panel = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(text => sent.push(text))
                .build();

            const input = textarea(panel);
            input.value = 'first line';
            pressKey(input, 'Enter', true);

            expect(sent).toEqual([]);
            expect(input.value).toBe('first line');
        });

        it('does not send while an IME composition is active', () => {
            const sent: string[] = [];
            const panel = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(text => sent.push(text))
                .build();

            const input = textarea(panel);
            input.value = 'ありがとう';
            input.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                isComposing: true,
                bubbles: true,
                cancelable: true,
            }));

            expect(sent).toEqual([]);
            expect(input.value).toBe('ありがとう');
        });

        it('does not send on an IME commit that only reports keyCode 229', () => {
            // Safari and some Windows IMEs leave isComposing false on the committing Enter.
            const sent: string[] = [];
            const panel = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(text => sent.push(text))
                .build();

            const input = textarea(panel);
            input.value = '\u3042\u308a\u304c\u3068\u3046';
            input.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                keyCode: 229,
                bubbles: true,
                cancelable: true,
            }));

            expect(sent).toEqual([]);
            expect(input.value).toBe('\u3042\u308a\u304c\u3068\u3046');
        });

        it('keeps the send button disabled until the text has non-whitespace', () => {
            const panel = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(() => undefined)
                .build();

            const sendBtn = panel.querySelector<HTMLButtonElement>('.ora-chat-send-btn')!;
            const input = textarea(panel);
            expect(sendBtn.disabled).toBe(true);

            input.value = '   ';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            expect(sendBtn.disabled).toBe(true);

            input.value = 'hello';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            expect(sendBtn.disabled).toBe(false);
        });

        it('applies the placeholder', () => {
            const panel = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(() => undefined)
                .withPlaceholder(of('Ask about invoices'))
                .build();

            expect(textarea(panel).placeholder).toBe('Ask about invoices');
        });
    });

    describe('suggestions', () => {
        const YES: ChatSuggestion = { caption: 'Yes, please', text: 'Yes, please' };
        const PLAN: ChatSuggestion = { caption: "Today's plan", text: "What's the plan for today?" };

        function panelWith(
            suggestions$: BehaviorSubject<ChatSuggestion[]>,
            onSend: (text: string) => void = () => undefined,
        ): HTMLElement {
            return new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(onSend)
                .withSuggestions(suggestions$)
                .build();
        }

        it('renders no suggestion row at all without withSuggestions()', () => {
            const panel = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(() => undefined)
                .build();

            expect(suggestionRow(panel)).toBeNull();
        });

        it('renders one chip per item and titles a chip whose text differs from its caption', () => {
            const panel = panelWith(new BehaviorSubject([YES, PLAN]));

            const rendered = chips(panel);
            expect(rendered.map(chip => chip.textContent)).toEqual(['Yes, please', "Today's plan"]);
            // Same caption and text: nothing extra to reveal on hover.
            expect(rendered[0].title).toBe('');
            expect(rendered[1].title).toBe("What's the plan for today?");
            expect(suggestionRow(panel)!.hidden).toBe(false);
        });

        it('sends the text, not the caption, and leaves the composer untouched', () => {
            const sent: string[] = [];
            const panel = panelWith(new BehaviorSubject([PLAN]), text => sent.push(text));
            document.body.appendChild(panel);

            const input = textarea(panel);
            input.value = 'half-typed draft';
            chips(panel)[0].click();

            expect(sent).toEqual(["What's the plan for today?"]);
            expect(input.value).toBe('half-typed draft');
            expect(document.activeElement).toBe(input);

            panel.remove();
        });

        it('hides the row on an empty emission and repopulates it on the next one', () => {
            const suggestions$ = new BehaviorSubject<ChatSuggestion[]>([YES, PLAN]);
            const panel = panelWith(suggestions$);

            suggestions$.next([]);
            expect(suggestionRow(panel)!.hidden).toBe(true);
            expect(chips(panel)).toHaveLength(0);

            suggestions$.next([{ caption: 'No, thanks', text: 'No, thanks' }]);
            const row = suggestionRow(panel)!;
            expect(row.hidden).toBe(false);
            expect(chips(panel).map(chip => chip.textContent)).toEqual(['No, thanks']);
        });

        it('skips an item whose text is blank', () => {
            const panel = panelWith(new BehaviorSubject([YES, { caption: 'Dead chip', text: '   ' }]));

            expect(chips(panel).map(chip => chip.textContent)).toEqual(['Yes, please']);
        });

        it('renders the label as text, never as markup', () => {
            const panel = panelWith(new BehaviorSubject([{ caption: '<b>bold</b>', text: 'show me' }]));

            const chip = chips(panel)[0];
            expect(chip.textContent).toBe('<b>bold</b>');
            expect(chip.querySelector('b')).toBeNull();
        });

        it('unsubscribes from the suggestion stream when detached', () => {
            const suggestions$ = new BehaviorSubject<ChatSuggestion[]>([YES]);
            const panel = panelWith(suggestions$);

            document.body.appendChild(panel);
            expect(suggestions$.observed).toBe(true);

            panel.remove();
            expect(suggestions$.observed).toBe(false);
        });
    });

    describe('open state', () => {
        it('toggles the open/closed classes from the subject', () => {
            const open$ = new BehaviorSubject(false);
            const panel = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(() => undefined)
                .withOpen(open$)
                .build();

            const container = panel.querySelector('.ora-chat-panel-container')!;
            expect(container.classList.contains('ora-chat-panel--closed')).toBe(true);
            expect(container.classList.contains('ora-chat-panel--open')).toBe(false);

            open$.next(true);

            expect(container.classList.contains('ora-chat-panel--open')).toBe(true);
            expect(container.classList.contains('ora-chat-panel--closed')).toBe(false);
        });

        it('starts closed when the open subject has no current value', () => {
            const panel = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(() => undefined)
                .withOpen(new Subject<boolean>())
                .build();

            const container = panel.querySelector('.ora-chat-panel-container')!;
            const inner = panel.querySelector('.ora-chat-panel-inner')!;
            expect(container.classList.contains('ora-chat-panel--closed')).toBe(true);
            expect(container.classList.contains('ora-chat-panel--open')).toBe(false);
            expect(inner.getAttribute('aria-hidden')).toBe('true');
            expect(inner.getAttribute('inert')).toBe('');
        });

        it('takes the panel out of the tab order while closed', () => {
            const open$ = new BehaviorSubject(true);
            const panel = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(() => undefined)
                .withOpen(open$)
                .build();

            const inner = panel.querySelector('.ora-chat-panel-inner')!;
            expect(inner.hasAttribute('inert')).toBe(false);
            expect(inner.getAttribute('aria-hidden')).toBe('false');

            open$.next(false);

            expect(inner.getAttribute('inert')).toBe('');
            expect(inner.getAttribute('aria-hidden')).toBe('true');

            open$.next(true);

            expect(inner.hasAttribute('inert')).toBe(false);
            expect(inner.getAttribute('aria-hidden')).toBe('false');
        });

        it('is permanently open with no closed state when withOpen() is not used', () => {
            const panel = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(() => undefined)
                .build();

            const container = panel.querySelector('.ora-chat-panel-container')!;
            expect(container.classList.contains('ora-chat-panel--open')).toBe(true);
            expect(container.classList.contains('ora-chat-panel--closed')).toBe(false);
            expect(panel.querySelector('.ora-chat-panel-inner')!.hasAttribute('inert')).toBe(false);
        });
    });

    describe('presentation', () => {
        it('writes the width as a custom property and defaults to 420px', () => {
            const container = (panel: HTMLElement) => panel.querySelector<HTMLElement>('.ora-chat-panel-container')!;

            const defaulted = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(() => undefined)
                .build();
            expect(container(defaulted).style.getPropertyValue('--ora-chat-width')).toBe('420px');

            const custom = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(() => undefined)
                .withWidth(of(360))
                .build();
            expect(container(custom).style.getPropertyValue('--ora-chat-width')).toBe('360px');
        });

        it('adds the glass class only with asGlass()', () => {
            const base = () => new ChatPanelBuilder().withMessages(of<ChatMessage[]>([])).withOnSend(() => undefined);

            expect(base().build().querySelector('.ora-chat-panel-inner')!.classList.contains('glass-effect')).toBe(false);
            expect(base().asGlass().build().querySelector('.ora-chat-panel-inner')!.classList.contains('glass-effect')).toBe(true);
        });
    });

    describe('accessibility', () => {
        it('makes the scrollable log reachable by keyboard without losing its role', () => {
            const panel = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(() => undefined)
                .build();

            const area = messagesArea(panel);
            expect(area.getAttribute('tabindex')).toBe('0');
            expect(area.getAttribute('role')).toBe('log');
            expect(area.getAttribute('aria-live')).toBe('polite');
        });

        it('gives the typing indicator role="status" so its label reaches AT', () => {
            const panel = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([{ id: 'm2', role: 'assistant', content: '' }]))
                .withOnSend(() => undefined)
                .build();

            const typing = panel.querySelector('.ora-chat-typing')!;
            expect(typing.getAttribute('role')).toBe('status');
            expect(typing.getAttribute('aria-label')).toBe('Assistant is typing');
        });
    });

    describe('focus on open', () => {
        beforeEach(() => jest.useFakeTimers());
        afterEach(() => jest.useRealTimers());

        it('focuses the composer after the slide-in, but not on a re-emitted true', () => {
            const open$ = new BehaviorSubject(false);
            const panel = new ChatPanelBuilder()
                .withMessages(of<ChatMessage[]>([]))
                .withOnSend(() => undefined)
                .withOpen(open$)
                .build();
            document.body.appendChild(panel);

            const outside = document.createElement('button');
            document.body.appendChild(outside);

            open$.next(true);
            jest.advanceTimersByTime(300);
            expect(document.activeElement).toBe(textarea(panel));

            // The consumer replays its state: focus must stay where the operator put it.
            outside.focus();
            open$.next(true);
            jest.advanceTimersByTime(300);
            expect(document.activeElement).toBe(outside);

            panel.remove();
            outside.remove();
        });

        it('focuses immediately under prefers-reduced-motion', () => {
            const original = window.matchMedia;
            window.matchMedia = jest.fn().mockImplementation((query: string) => ({
                matches: query.includes('prefers-reduced-motion'),
                media: query,
                onchange: null,
                addListener: jest.fn(),
                removeListener: jest.fn(),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn(),
            })) as unknown as typeof window.matchMedia;

            try {
                const open$ = new BehaviorSubject(false);
                const panel = new ChatPanelBuilder()
                    .withMessages(of<ChatMessage[]>([]))
                    .withOnSend(() => undefined)
                    .withOpen(open$)
                    .build();
                document.body.appendChild(panel);

                open$.next(true);
                expect(document.activeElement).toBe(textarea(panel));

                panel.remove();
            } finally {
                window.matchMedia = original;
            }
        });
    });

    describe('autoscroll', () => {
        beforeEach(() => jest.useFakeTimers());
        afterEach(() => jest.useRealTimers());

        /** jsdom has no layout: fake the scroll geometry so the pinning rule can be exercised. */
        function stubScroll(el: HTMLElement, scrollTop: number): { get: () => number; set: (v: number) => void } {
            let top = scrollTop;
            Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => 1000 });
            Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => 200 });
            Object.defineProperty(el, 'scrollTop', {
                configurable: true,
                get: () => top,
                set: (value: number) => { top = value; },
            });
            return { get: () => top, set: (value: number) => { top = value; } };
        }

        it('leaves a scrolled-up reader alone when an assistant row arrives', () => {
            const messages$ = new BehaviorSubject<ChatMessage[]>([USER]);
            const panel = new ChatPanelBuilder()
                .withMessages(messages$)
                .withOnSend(() => undefined)
                .build();

            // Flush the pin scheduled by the first render before faking the geometry.
            jest.advanceTimersByTime(50);
            const scroll = stubScroll(messagesArea(panel), 120);

            messages$.next([USER, ASSISTANT]);
            jest.advanceTimersByTime(50);

            expect(scroll.get()).toBe(120);
        });

        it('pins to the bottom when the reader sends a message', () => {
            const messages$ = new BehaviorSubject<ChatMessage[]>([ASSISTANT]);
            const panel = new ChatPanelBuilder()
                .withMessages(messages$)
                .withOnSend(() => undefined)
                .build();

            // Flush the pin scheduled by the first render before faking the geometry.
            jest.advanceTimersByTime(50);
            const scroll = stubScroll(messagesArea(panel), 120);

            messages$.next([ASSISTANT, USER]);
            jest.advanceTimersByTime(50);

            expect(scroll.get()).toBe(1000);
        });

        it('keeps a reader who is already at the bottom pinned', () => {
            const messages$ = new BehaviorSubject<ChatMessage[]>([USER]);
            const panel = new ChatPanelBuilder()
                .withMessages(messages$)
                .withOnSend(() => undefined)
                .build();

            // Flush the pin scheduled by the first render before faking the geometry.
            jest.advanceTimersByTime(50);
            const scroll = stubScroll(messagesArea(panel), 790);

            messages$.next([USER, ASSISTANT]);
            jest.advanceTimersByTime(50);

            expect(scroll.get()).toBe(1000);
        });

        it('stays pinned across two consecutive emissions', () => {
            // Regression: with an animated (smooth) pin the second emission re-measures a
            // half-finished scrollTop as "not at bottom" and the log stops following.
            const messages$ = new BehaviorSubject<ChatMessage[]>([USER]);
            const panel = new ChatPanelBuilder()
                .withMessages(messages$)
                .withOnSend(() => undefined)
                .build();

            jest.advanceTimersByTime(50);
            const scroll = stubScroll(messagesArea(panel), 790);

            messages$.next([USER, ASSISTANT]);
            jest.advanceTimersByTime(50);
            expect(scroll.get()).toBe(1000);

            messages$.next([USER, ASSISTANT, { id: 'm3', role: 'assistant', content: 'And one more.' }]);
            jest.advanceTimersByTime(50);
            expect(scroll.get()).toBe(1000);
        });

        it('pins with an instant scrollTo where the platform provides one', () => {
            // jsdom has no Element.scrollTo, so the real browser path needs an explicit stub:
            // behavior must be 'instant' to override the log's CSS scroll-behavior: smooth.
            const messages$ = new BehaviorSubject<ChatMessage[]>([ASSISTANT]);
            const panel = new ChatPanelBuilder()
                .withMessages(messages$)
                .withOnSend(() => undefined)
                .build();

            jest.advanceTimersByTime(50);
            const area = messagesArea(panel);
            const scroll = stubScroll(area, 790);
            const scrollTo = jest.fn();
            (area as unknown as { scrollTo: unknown }).scrollTo = scrollTo;

            messages$.next([ASSISTANT, USER]);
            jest.advanceTimersByTime(50);

            expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: 'instant' });
            // The native call is what moves the viewport; the fallback must not also fire.
            expect(scroll.get()).toBe(790);
        });

        it('keeps the log pinned when the suggestion row appears and disappears', () => {
            const suggestions$ = new BehaviorSubject<ChatSuggestion[]>([]);
            const panel = new ChatPanelBuilder()
                .withMessages(of([USER]))
                .withOnSend(() => undefined)
                .withSuggestions(suggestions$)
                .build();

            jest.advanceTimersByTime(50);
            const scroll = stubScroll(messagesArea(panel), 790);

            suggestions$.next([{ caption: 'Yes', text: 'Yes' }]);
            jest.advanceTimersByTime(50);
            expect(scroll.get()).toBe(1000);

            scroll.set(790);
            suggestions$.next([]);
            jest.advanceTimersByTime(50);
            expect(scroll.get()).toBe(1000);
        });
    });

    describe('teardown', () => {
        it('unsubscribes from the message stream when detached', () => {
            const messages$ = new BehaviorSubject<ChatMessage[]>([]);
            const panel = new ChatPanelBuilder()
                .withMessages(messages$)
                .withOnSend(() => undefined)
                .build();

            document.body.appendChild(panel);
            expect(messages$.observed).toBe(true);

            panel.remove();
            expect(messages$.observed).toBe(false);
        });
    });
});
