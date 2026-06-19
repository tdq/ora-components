import { registerDestroy } from './destroyable-element';

describe('registerDestroy', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('fires callback when element is removed from DOM', (done) => {
        const el = document.createElement('div');
        const cb = jest.fn(() => {
            expect(cb).toHaveBeenCalledTimes(1);
            done();
        });
        document.body.appendChild(el);
        registerDestroy(el, cb);

        el.remove();
        
        // MutationObserver is async, so we might need a small delay or use done()
        // If we switch to lifecycle-boundary, it's also tied to disconnect which is usually sync in jsdom
    });

    it('fires multiple callbacks for the same element', (done) => {
        const el = document.createElement('div');
        let calls = 0;
        const cb = () => {
            calls++;
            if (calls === 2) {
                done();
            }
        };
        document.body.appendChild(el);
        registerDestroy(el, cb);
        registerDestroy(el, cb);

        el.remove();
    });

    it('fires callback when ancestor is removed from DOM', (done) => {
        const parent = document.createElement('div');
        const child = document.createElement('div');
        parent.appendChild(child);
        document.body.appendChild(parent);

        const cb = jest.fn(() => {
            expect(cb).toHaveBeenCalledTimes(1);
            done();
        });
        registerDestroy(child, cb);

        parent.remove();
    });

    it('does not fire callback when element children are cleared but element is still connected', () => {
        const el = document.createElement('div');
        const cb = jest.fn();
        document.body.appendChild(el);
        registerDestroy(el, cb);

        // Clear children (removes the lifecycle boundary)
        el.innerHTML = '';

        // Callback should NOT be called because el is still connected
        expect(cb).not.toHaveBeenCalled();

        // Now remove el from the DOM
        el.remove();

        // Now callback should be called
        expect(cb).toHaveBeenCalledTimes(1);
    });

    describe('boundary placement invariants', () => {
        it('boundary is not the lastElementChild when host already has children', () => {
            const host = document.createElement('div');
            const realContent = document.createElement('span');
            realContent.id = 'real';
            host.appendChild(realContent);
            document.body.appendChild(host);

            registerDestroy(host, jest.fn());

            // The boundary must not be the last element child
            expect(host.lastElementChild).not.toBeNull();
            expect(host.lastElementChild!.tagName.toLowerCase()).toBe('span');
            expect(host.lastElementChild!.id).toBe('real');
        });

        it('lastElementChild resolves to real content, not the boundary, after registration', () => {
            const host = document.createElement('article');
            const first = document.createElement('section');
            const last = document.createElement('footer');
            host.appendChild(first);
            host.appendChild(last);
            document.body.appendChild(host);

            registerDestroy(host, jest.fn());

            // footer must still be the last element child
            expect(host.lastElementChild!.tagName.toLowerCase()).toBe('footer');
            // boundary should exist somewhere in the children
            const boundaryTag = 'ora-lifecycle-boundary';
            const boundary = host.querySelector(boundaryTag);
            expect(boundary).not.toBeNull();
            // boundary must not be last
            expect(host.lastElementChild).not.toBe(boundary);
        });

        it('boundary is the only child (first and last) when host is empty at registration time', () => {
            const host = document.createElement('div');
            document.body.appendChild(host);

            registerDestroy(host, jest.fn());

            // When host had no children, insertBefore(boundary, null) === appendChild
            // boundary becomes the sole child — this is the documented edge case
            expect(host.children.length).toBe(1);
            expect(host.firstElementChild!.tagName.toLowerCase()).toBe('ora-lifecycle-boundary');
        });

        it('fires callback exactly once (one-shot) even when removed and re-inserted', (done) => {
            const el = document.createElement('div');
            const content = document.createElement('span');
            el.appendChild(content);
            document.body.appendChild(el);
            let callCount = 0;
            const cb = () => { callCount++; };
            registerDestroy(el, cb);

            // Move el to a different parent — should NOT fire because el is re-inserted
            const container = document.createElement('div');
            document.body.appendChild(container);
            container.appendChild(el);

            // el is still connected, no fire yet
            expect(callCount).toBe(0);

            // Now permanently remove
            el.remove();
            // Give disconnectedCallback a tick to fire
            setTimeout(() => {
                expect(callCount).toBe(1);
                done();
            }, 0);
        });

        it('fires callback exactly once even if multiple boundaries are created (re-entrancy after innerHTML clear)', () => {
            const host = document.createElement('div');
            const content = document.createElement('span');
            host.appendChild(content);
            document.body.appendChild(host);
            const cb = jest.fn();
            registerDestroy(host, cb);

            // Clearing innerHTML removes the boundary — a new one should be re-inserted
            host.innerHTML = '<span></span>';

            // cb must still not have fired (host is still connected)
            expect(cb).not.toHaveBeenCalled();

            // Removal should fire cb exactly once
            host.remove();
            expect(cb).toHaveBeenCalledTimes(1);
        });

        it('multiple callbacks are all fired exactly once in registration order', () => {
            const host = document.createElement('div');
            host.appendChild(document.createElement('span'));
            document.body.appendChild(host);
            const order: number[] = [];
            registerDestroy(host, () => order.push(1));
            registerDestroy(host, () => order.push(2));
            registerDestroy(host, () => order.push(3));

            host.remove();

            expect(order).toEqual([1, 2, 3]);
        });
    });
});
