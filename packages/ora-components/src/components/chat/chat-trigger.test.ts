import { BehaviorSubject, of } from 'rxjs';
import { ChatTriggerBuilder } from './chat-trigger-builder';

function button(trigger: HTMLElement): HTMLButtonElement {
    return trigger.querySelector<HTMLButtonElement>('.ora-chat-trigger-btn')!;
}

describe('ChatTriggerBuilder', () => {
    it('throws when withOpen() is missing', () => {
        expect(() => new ChatTriggerBuilder().build())
            .toThrow('ChatTriggerBuilder: withOpen() is required before build()');
    });

    it('defaults the caption to Ask assistant', () => {
        const trigger = new ChatTriggerBuilder().withOpen(new BehaviorSubject(false)).build();

        expect(trigger.querySelector('.ora-chat-trigger-label')!.textContent).toBe('Ask assistant');
    });

    it('applies a custom caption to the label and the aria-label', () => {
        const trigger = new ChatTriggerBuilder()
            .withOpen(new BehaviorSubject(false))
            .withCaption(of('Ask about the ledger'))
            .build();

        expect(trigger.querySelector('.ora-chat-trigger-label')!.textContent).toBe('Ask about the ledger');
        expect(button(trigger).getAttribute('aria-label')).toBe('Ask about the ledger');
    });

    it('toggles the open subject on click', () => {
        const open$ = new BehaviorSubject(false);
        const trigger = new ChatTriggerBuilder().withOpen(open$).build();

        button(trigger).click();
        expect(open$.getValue()).toBe(true);

        // The button is disabled while open, so drive the second toggle from the subject.
        open$.next(false);
        button(trigger).click();
        expect(open$.getValue()).toBe(true);
    });

    it('hides itself and goes inert while open', () => {
        const open$ = new BehaviorSubject(false);
        const trigger = new ChatTriggerBuilder().withOpen(open$).build();

        expect(trigger.classList.contains('ora-chat-trigger-wrapper--hidden')).toBe(false);
        expect(trigger.hasAttribute('inert')).toBe(false);
        expect(trigger.hasAttribute('aria-hidden')).toBe(false);
        expect(button(trigger).disabled).toBe(false);

        open$.next(true);

        expect(trigger.classList.contains('ora-chat-trigger-wrapper--hidden')).toBe(true);
        expect(trigger.getAttribute('inert')).toBe('');
        expect(trigger.getAttribute('aria-hidden')).toBe('true');
        expect(button(trigger).disabled).toBe(true);

        open$.next(false);

        expect(trigger.classList.contains('ora-chat-trigger-wrapper--hidden')).toBe(false);
        expect(trigger.hasAttribute('inert')).toBe(false);
        expect(trigger.hasAttribute('aria-hidden')).toBe(false);
    });

    it('keeps classes added by the consumer across open emissions', () => {
        const open$ = new BehaviorSubject(false);
        const trigger = new ChatTriggerBuilder().withOpen(open$).build();
        trigger.classList.add('app-grid-area');

        open$.next(true);
        open$.next(false);

        expect(trigger.classList.contains('app-grid-area')).toBe(true);
        expect(trigger.classList.contains('ora-chat-trigger-wrapper')).toBe(true);
    });

    it('unsubscribes from the open stream when detached', () => {
        const open$ = new BehaviorSubject(false);
        const trigger = new ChatTriggerBuilder().withOpen(open$).build();

        document.body.appendChild(trigger);
        expect(open$.observed).toBe(true);

        trigger.remove();
        expect(open$.observed).toBe(false);
    });
});
