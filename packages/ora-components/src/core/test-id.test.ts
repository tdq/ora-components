import { applyTestId } from './test-id';

describe('applyTestId', () => {
    it('sets the data-testid attribute', () => {
        const el = document.createElement('div');
        applyTestId(el, 'save-button');
        expect(el.getAttribute('data-testid')).toBe('save-button');
    });

    it('is a no-op for undefined', () => {
        const el = document.createElement('div');
        applyTestId(el, undefined);
        expect(el.hasAttribute('data-testid')).toBe(false);
    });

    it('is a no-op for an empty string', () => {
        const el = document.createElement('div');
        applyTestId(el, '');
        expect(el.hasAttribute('data-testid')).toBe(false);
    });

    it('is a no-op for null', () => {
        const el = document.createElement('div');
        applyTestId(el, null);
        expect(el.hasAttribute('data-testid')).toBe(false);
    });

    it('leaves an existing data-testid untouched when passed an empty id', () => {
        const el = document.createElement('div');
        el.setAttribute('data-testid', 'kept');
        applyTestId(el, '');
        applyTestId(el, undefined);
        expect(el.getAttribute('data-testid')).toBe('kept');
    });

    it('keeps the last value when called twice on the same element', () => {
        const el = document.createElement('div');
        applyTestId(el, 'first');
        applyTestId(el, 'second');
        expect(el.getAttribute('data-testid')).toBe('second');
    });
});
