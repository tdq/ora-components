import { Observable, Subject, Subscription, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { createLifecycleBoundary } from '../../core/lifecycle-boundary';
import { Icons } from '../../core/icons';

const DEFAULTS = {
    caption: 'Ask assistant',
};

/**
 * Pill button that opens the chat panel. It shares the panel's open subject and hides
 * itself (and goes `inert`) while the panel is open, so the two never compete for the
 * same corner of the screen.
 */
export class ChatTriggerBuilder implements ComponentBuilder {
    private open$?: Subject<boolean>;
    private caption$: Observable<string> = of(DEFAULTS.caption);

    /** Required. Clicking emits the negation of the latest value. */
    withOpen(open: Subject<boolean>): this {
        this.open$ = open;
        return this;
    }

    /** Button label. Defaults to 'Ask assistant'. */
    withCaption(caption: Observable<string>): this {
        this.caption$ = caption;
        return this;
    }

    build(): HTMLElement {
        const open$ = this.open$;
        if (!open$) {
            throw new Error('ChatTriggerBuilder: withOpen() is required before build()');
        }

        const sub = new Subscription();

        const wrapper = document.createElement('div');
        wrapper.className = 'ora-chat-trigger-wrapper';
        wrapper.setAttribute('data-slot', 'chat-trigger');

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ora-chat-trigger-btn';

        const icon = document.createElement('span');
        icon.className = 'ora-chat-trigger-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = Icons.SPARKLE;

        const label = document.createElement('span');
        label.className = 'ora-chat-trigger-label';
        sub.add(this.caption$.subscribe(caption => {
            label.textContent = caption;
            button.setAttribute('aria-label', caption);
        }));

        button.appendChild(icon);
        button.appendChild(label);
        wrapper.appendChild(button);

        // Mirrors the latest open value so the click can toggle it without a getValue()
        // that only BehaviorSubject would provide.
        let isOpen = false;
        button.addEventListener('click', () => open$.next(!isOpen));

        sub.add(open$.subscribe(open => {
            isOpen = open;
            // toggle(), not a className rewrite: classes the consumer's wrapper picked up
            // elsewhere must survive every emission.
            wrapper.classList.toggle('ora-chat-trigger-wrapper--hidden', open);
            button.disabled = open;
            if (open) {
                wrapper.setAttribute('aria-hidden', 'true');
                wrapper.setAttribute('inert', '');
            } else {
                wrapper.removeAttribute('aria-hidden');
                wrapper.removeAttribute('inert');
            }
        }));

        const boundary = createLifecycleBoundary();
        boundary.onDisconnect = () => sub.unsubscribe();
        wrapper.appendChild(boundary);

        return wrapper;
    }
}
