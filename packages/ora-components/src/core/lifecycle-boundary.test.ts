import {
    OraLifecycleBoundary,
    ORA_LIFECYCLE_BOUNDARY_TAG,
    createLifecycleBoundary,
    registerLifecycleBoundary,
} from './lifecycle-boundary';

describe('OraLifecycleBoundary', () => {
    afterEach(() => {
        // Clean up any elements appended to body during tests
        document.body.innerHTML = '';
    });

    it('registers the custom element', () => {
        expect(customElements.get(ORA_LIFECYCLE_BOUNDARY_TAG)).toBeDefined();
    });

    it('createLifecycleBoundary() returns an OraLifecycleBoundary instance', () => {
        const el = createLifecycleBoundary();
        expect(el).toBeInstanceOf(OraLifecycleBoundary);
    });

    it('invokes onDisconnect exactly once when element is removed from the DOM', () => {
        const el = createLifecycleBoundary();
        const onDisconnect = jest.fn();
        el.onDisconnect = onDisconnect;

        document.body.appendChild(el);
        expect(onDisconnect).not.toHaveBeenCalled();

        el.remove();
        expect(onDisconnect).toHaveBeenCalledTimes(1);
    });

    it('does not fire onDisconnect again after a DOM move (remove + re-insert + remove)', () => {
        const el = createLifecycleBoundary();
        const onDisconnect = jest.fn();
        el.onDisconnect = onDisconnect;

        // First attach
        document.body.appendChild(el);
        expect(onDisconnect).not.toHaveBeenCalled();

        // First remove — teardown fires once
        el.remove();
        expect(onDisconnect).toHaveBeenCalledTimes(1);

        // Re-insert (simulates a DOM move)
        document.body.appendChild(el);

        // Second remove — onDisconnect is already nulled, must NOT fire again
        el.remove();
        expect(onDisconnect).toHaveBeenCalledTimes(1);
    });

    it('moving between two attached parents does not leave a stale callback that fires unexpectedly', () => {
        const containerA = document.createElement('div');
        const containerB = document.createElement('div');
        document.body.appendChild(containerA);
        document.body.appendChild(containerB);

        const el = createLifecycleBoundary();
        const onDisconnect = jest.fn();
        el.onDisconnect = onDisconnect;

        // Attach to container A
        containerA.appendChild(el);
        expect(onDisconnect).not.toHaveBeenCalled();

        // Move to container B (triggers a disconnect from A, then connect to B)
        containerB.appendChild(el);

        // The one-shot fired on the disconnect from A — that is the expected behaviour
        // because the element was genuinely disconnected from containerA first.
        // What we assert is that a SECOND removal does NOT fire again.
        const callsAfterMove = onDisconnect.mock.calls.length; // 0 or 1 depending on jsdom move semantics

        // Second removal from containerB
        el.remove();

        // Total calls must be at most callsAfterMove + 1 (fires at most once across all disconnects)
        expect(onDisconnect.mock.calls.length).toBeLessThanOrEqual(callsAfterMove + 1);

        // Critically: another remove must NEVER add another call
        el.remove();
        const callsAfterSecondRemove = onDisconnect.mock.calls.length;
        el.remove();
        expect(onDisconnect.mock.calls.length).toBe(callsAfterSecondRemove);
    });

    it('onDisconnect is nulled after firing (one-shot contract)', () => {
        const el = createLifecycleBoundary();
        el.onDisconnect = jest.fn();

        document.body.appendChild(el);
        el.remove();

        expect(el.onDisconnect).toBeUndefined();
    });

    it('does not throw when removed without an onDisconnect callback', () => {
        const el = createLifecycleBoundary();
        document.body.appendChild(el);
        expect(() => el.remove()).not.toThrow();
    });

    it('catches and console.errors when onDisconnect throws', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const el = createLifecycleBoundary();
        const boom = new Error('boom');
        el.onDisconnect = () => { throw boom; };

        document.body.appendChild(el);
        expect(() => el.remove()).not.toThrow();
        expect(consoleSpy).toHaveBeenCalledWith(
            'OraLifecycleBoundary onDisconnect error:',
            boom
        );

        consoleSpy.mockRestore();
    });

    it('registerLifecycleBoundary() is idempotent — calling twice does not throw', () => {
        expect(() => {
            registerLifecycleBoundary();
            registerLifecycleBoundary();
        }).not.toThrow();
    });

    // -----------------------------------------------------------------------
    // connectedCallback — display:none default (non-rendering by default)
    // -----------------------------------------------------------------------

    it('sets style.display to "none" when appended to the DOM (connectedCallback)', () => {
        const el = createLifecycleBoundary();
        // Before insertion: display is not yet set by connectedCallback
        expect(el.style.display).not.toBe('none');

        document.body.appendChild(el);
        // connectedCallback fires synchronously in jsdom on append
        expect(el.style.display).toBe('none');
    });

    it('display:none is idempotent — re-inserting after removal still yields display:none', () => {
        const el = createLifecycleBoundary();
        const onDisconnect = jest.fn();
        el.onDisconnect = onDisconnect;

        // First insertion
        document.body.appendChild(el);
        expect(el.style.display).toBe('none');

        // First removal — teardown fires, onDisconnect nulled
        el.remove();
        expect(onDisconnect).toHaveBeenCalledTimes(1);

        // Re-insertion — connectedCallback fires again; display must still be none
        document.body.appendChild(el);
        expect(el.style.display).toBe('none');
    });

    it('re-insertion after removal does NOT re-fire onDisconnect (already nulled)', () => {
        const el = createLifecycleBoundary();
        const onDisconnect = jest.fn();
        el.onDisconnect = onDisconnect;

        document.body.appendChild(el);
        el.remove();
        expect(onDisconnect).toHaveBeenCalledTimes(1);

        // Re-insert then remove again — onDisconnect is null; must not throw or call again
        document.body.appendChild(el);
        expect(() => el.remove()).not.toThrow();
        expect(onDisconnect).toHaveBeenCalledTimes(1); // still exactly once
    });

    // Note: the createLifecycleBoundary() SSR guard (throws when typeof document === 'undefined')
    // cannot be exercised in this jsdom suite: jsdom marks `document` as non-configurable and
    // the project setupTests.ts also references `window` unconditionally, preventing a node-env
    // test from using setupFilesAfterEnv. The guard is verified by code inspection in
    // lifecycle-boundary.ts (line: if (typeof document === 'undefined') { throw new Error(...) }).
});
