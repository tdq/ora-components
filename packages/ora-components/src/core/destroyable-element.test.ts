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
});
