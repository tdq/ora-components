import { BehaviorSubject } from 'rxjs';
import { PopoverBuilder, PopoverPlacement } from './popover';
import { ComponentBuilder } from '../../core/component-builder';

// Helper: minimal ComponentBuilder returning a simple div
function makeContent(text = 'content'): ComponentBuilder {
    return {
        build() {
            const el = document.createElement('div');
            el.textContent = text;
            return el;
        }
    };
}

// Helper: create anchor element appended to body (needed for getBoundingClientRect mocking)
function makeAnchor(rect: Partial<DOMRect> = {}): HTMLElement {
    const el = document.createElement('button');
    const defaults = { top: 100, bottom: 120, left: 50, right: 200, width: 150, height: 20, x: 50, y: 100, toJSON: () => {} };
    el.getBoundingClientRect = () => Object.assign({}, defaults, rect) as DOMRect;
    document.body.appendChild(el);
    return el;
}

// Spy on showPopover / hidePopover at prototype level for call tracking
function spyOnPopoverMethods() {
    const showSpy = jest.spyOn(HTMLElement.prototype, 'showPopover');
    const hideSpy = jest.spyOn(HTMLElement.prototype, 'hidePopover');
    return { showSpy, hideSpy };
}

describe('PopoverBuilder', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ────────────────────────────────────────────────
    // Configuration / builder API
    // ────────────────────────────────────────────────

    describe('builder API', () => {
        test('withAnchor returns this (fluent)', () => {
            const builder = new PopoverBuilder();
            const anchor = makeAnchor();
            expect(builder.withAnchor(anchor)).toBe(builder);
        });

        test('withContent returns this (fluent)', () => {
            const builder = new PopoverBuilder();
            expect(builder.withContent(makeContent())).toBe(builder);
        });

        test('withWidth returns this (fluent)', () => {
            const builder = new PopoverBuilder();
            expect(builder.withWidth('auto')).toBe(builder);
        });

        test('withOffset returns this (fluent)', () => {
            const builder = new PopoverBuilder();
            expect(builder.withOffset(10)).toBe(builder);
        });

        test('withClass returns this (fluent)', () => {
            const builder = new PopoverBuilder();
            expect(builder.withClass('my-class')).toBe(builder);
        });

        test('withOnClose returns this (fluent)', () => {
            const builder = new PopoverBuilder();
            expect(builder.withOnClose(() => {})).toBe(builder);
        });

        test('asGlass returns this (fluent)', () => {
            const builder = new PopoverBuilder();
            expect(builder.asGlass()).toBe(builder);
        });
    });

    // ────────────────────────────────────────────────
    // show() guard clauses
    // ────────────────────────────────────────────────

    describe('show() validation', () => {
        test('throws when no anchor is set', () => {
            const builder = new PopoverBuilder().withContent(makeContent());
            expect(() => builder.show()).toThrow('PopoverBuilder: anchor is required before show()');
        });

        test('throws when no content is set', () => {
            const anchor = makeAnchor();
            const builder = new PopoverBuilder().withAnchor(anchor);
            expect(() => builder.show()).toThrow('PopoverBuilder: content is required before show()');
        });
    });

    // ────────────────────────────────────────────────
    // show() happy path
    // ────────────────────────────────────────────────

    describe('show()', () => {
        test('appends popover element to document.body', () => {
            const anchor = makeAnchor();
            new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .show();

            const popover = document.body.querySelector('[popover]');
            expect(popover).not.toBeNull();
        });

        test('calls showPopover() on first show', () => {
            const { showSpy } = spyOnPopoverMethods();
            const anchor = makeAnchor();
            new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .show();

            expect(showSpy).toHaveBeenCalledTimes(1);
        });

        test('does NOT call showPopover() on second show (already open)', () => {
            const { showSpy } = spyOnPopoverMethods();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent());

            builder.show();
            builder.show();

            expect(showSpy).toHaveBeenCalledTimes(1);
        });

        test('repositions on second show (top/left updated)', () => {
            let callCount = 0;
            const anchor = document.createElement('button');
            anchor.getBoundingClientRect = () => {
                callCount++;
                return { top: 100, bottom: 120, left: 50, right: 200, width: 150, height: 20, x: 50, y: 100, toJSON: () => {} } as DOMRect;
            };
            document.body.appendChild(anchor);

            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent());

            builder.show();
            const before = callCount;
            builder.show(); // should call _position() again
            expect(callCount).toBeGreaterThan(before);
        });

        test('sets popover attribute to "manual"', () => {
            const anchor = makeAnchor();
            new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .show();

            const popover = document.body.querySelector('[popover]')!;
            expect(popover.getAttribute('popover')).toBe('manual');
        });

        test('appends content inside popover element', () => {
            const anchor = makeAnchor();
            new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent('hello'))
                .show();

            const popover = document.body.querySelector('[popover]')!;
            expect(popover.textContent).toBe('hello');
        });
    });

    // ────────────────────────────────────────────────
    // Positioning
    // ────────────────────────────────────────────────

    describe('positioning', () => {
        test('positions top = rect.bottom + offset (default 4)', () => {
            const anchor = makeAnchor({ bottom: 120, left: 50, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent());
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.top).toBe('124px'); // 120 + 4
        });

        test('positions left = rect.left', () => {
            const anchor = makeAnchor({ bottom: 120, left: 50, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent());
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.left).toBe('50px');
        });

        test('withOffset changes vertical gap', () => {
            const anchor = makeAnchor({ bottom: 120, left: 50, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withOffset(10);
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.top).toBe('130px'); // 120 + 10
        });

        // ── Smart direction: open upward when more space above than below ──

        test('opens upward (sets bottom, sets top:auto) when anchor is near viewport bottom and it does not fit below', () => {
            // jsdom default innerHeight = 768; anchor near bottom → spaceAbove(600) > spaceBelow(148)
            // Mock offsetHeight to 200 so it doesn't fit in 148px space below
            const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200);

            const anchor = makeAnchor({ top: 600, bottom: 620, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent());
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.top).toBe('auto');
            // bottom = innerHeight - anchorTop + offset = 768 - 600 + 4 = 172
            expect(popover.style.bottom).toBe('172px');

            offsetHeightSpy.mockRestore();
        });

        test('upward offset is applied correctly', () => {
            const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200);

            const anchor = makeAnchor({ top: 600, bottom: 620, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withOffset(10);
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            // bottom = 768 - 600 + 10 = 178
            expect(popover.style.bottom).toBe('178px');

            offsetHeightSpy.mockRestore();
        });

        test('opens downward (sets top, sets bottom:auto) even if spaceAbove > spaceBelow as long as it fits below', () => {
            // anchor at 400. spaceAbove = 400. spaceBelow = 768 - 420 = 348.
            // 400 > 348, but popover height 100 fits in 348.
            const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(100);

            const anchor = makeAnchor({ top: 400, bottom: 420, left: 50, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent());
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.bottom).toBe('auto');
            expect(popover.style.top).toBe('424px'); // 420 + 4

            offsetHeightSpy.mockRestore();
        });

        test('switches direction on re-position when anchor moves to bottom and popover no longer fits', () => {
            const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200);

            let currentRect = { top: 100, bottom: 120, left: 50, right: 200, width: 150, height: 20, x: 50, y: 100, toJSON: () => {} } as DOMRect;
            const anchor = document.createElement('button');
            anchor.getBoundingClientRect = () => currentRect;
            document.body.appendChild(anchor);

            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent());

            builder.show(); // opens downward
            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.top).toBe('124px');

            // Simulate anchor scrolling to near the bottom
            currentRect = { top: 650, bottom: 670, left: 50, right: 200, width: 150, height: 20, x: 50, y: 650, toJSON: () => {} } as DOMRect;
            builder.show(); // re-positions (already open, just calls _position again)
            expect(popover.style.bottom).toBe(`${768 - 650 + 4}px`); // 122
            expect(popover.style.top).toBe('auto');

            offsetHeightSpy.mockRestore();
        });
    });


    // ────────────────────────────────────────────────
    // Width modes
    // ────────────────────────────────────────────────

    describe('width modes', () => {
        test('match-anchor (default): sets width = anchorRect.width, clears minWidth', () => {
            const anchor = makeAnchor({ width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent());
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.width).toBe('150px');
            expect(popover.style.minWidth).toBe('');
        });

        test('auto: sets width = auto and minWidth = anchorRect.width', () => {
            const anchor = makeAnchor({ width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withWidth('auto');
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.width).toBe('auto');
            expect(popover.style.minWidth).toBe('150px');
        });

        test('custom string: sets width as CSS value, clears minWidth', () => {
            const anchor = makeAnchor({ width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withWidth('300px');
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.width).toBe('300px');
            expect(popover.style.minWidth).toBe('');
        });

        test('Observable<PopoverWidth>: subscribes and applies latest value', () => {
            const width$ = new BehaviorSubject<string>('auto');
            const anchor = makeAnchor({ width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withWidth(width$);
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.width).toBe('auto');
            expect(popover.style.minWidth).toBe('150px');
        });

        test('Observable width: reactive update repositions when open', () => {
            const width$ = new BehaviorSubject<string>('auto');
            const anchor = makeAnchor({ width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withWidth(width$);
            builder.show();

            // Push new value while open — should trigger _position()
            width$.next('300px');

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.width).toBe('300px');
            expect(popover.style.minWidth).toBe('');
        });
    });

    // ────────────────────────────────────────────────
    // CSS classes
    // ────────────────────────────────────────────────

    describe('CSS classes', () => {
        test('applies base classes on build', () => {
            const anchor = makeAnchor();
            new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .show();

            const popover = document.body.querySelector('[popover]')!;
            expect(popover.classList.contains('fixed')).toBe(true);
            expect(popover.classList.contains('rounded-small')).toBe(true);
        });

        test('asGlass adds glass-effect class', () => {
            const anchor = makeAnchor();
            new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .asGlass()
                .show();

            const popover = document.body.querySelector('[popover]')!;
            expect(popover.classList.contains('glass-effect')).toBe(true);
        });

        test('without asGlass does not add glass-effect', () => {
            const anchor = makeAnchor();
            new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .show();

            const popover = document.body.querySelector('[popover]')!;
            expect(popover.classList.contains('glass-effect')).toBe(false);
        });

        test('withClass adds extra CSS class', () => {
            const anchor = makeAnchor();
            new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withClass('my-custom-class')
                .show();

            const popover = document.body.querySelector('[popover]')!;
            expect(popover.classList.contains('my-custom-class')).toBe(true);
        });

        test('withClass supports space-separated classes', () => {
            const anchor = makeAnchor();
            new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withClass('class-a class-b')
                .show();

            const popover = document.body.querySelector('[popover]')!;
            expect(popover.classList.contains('class-a')).toBe(true);
            expect(popover.classList.contains('class-b')).toBe(true);
        });
    });

    // ────────────────────────────────────────────────
    // close()
    // ────────────────────────────────────────────────

    describe('close()', () => {
        test('calls hidePopover() when open', () => {
            const { hideSpy } = spyOnPopoverMethods();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent());
            builder.show();
            builder.close();

            expect(hideSpy).toHaveBeenCalledTimes(1);
        });

        test('sets _isOpen to false (second close is no-op — hidePopover not called again)', () => {
            const { hideSpy } = spyOnPopoverMethods();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent());
            builder.show();
            builder.close();
            builder.close(); // no-op

            expect(hideSpy).toHaveBeenCalledTimes(1);
        });

        test('fires _onCloseCb exactly once on close', () => {
            const cb = jest.fn();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withOnClose(cb);
            builder.show();
            builder.close();

            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('close() before show() is a no-op (no popover element)', () => {
            const cb = jest.fn();
            const builder = new PopoverBuilder().withOnClose(cb);
            expect(() => builder.close()).not.toThrow();
            expect(cb).not.toHaveBeenCalled();
        });

        test('does NOT call showPopover() again after close+show', () => {
            const { showSpy } = spyOnPopoverMethods();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent());
            builder.show();  // call 1
            builder.close();
            builder.show();  // call 2 — re-open

            expect(showSpy).toHaveBeenCalledTimes(2);
        });
    });

    // ────────────────────────────────────────────────
    // withOnClose callback
    // ────────────────────────────────────────────────

    describe('withOnClose callback', () => {
        test('fires exactly once per close, not on double-close', () => {
            const cb = jest.fn();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withOnClose(cb);
            builder.show();
            builder.close();
            builder.close(); // no-op

            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('fires again after re-open and re-close', () => {
            const cb = jest.fn();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withOnClose(cb);
            builder.show();
            builder.close();
            builder.show();
            builder.close();

            expect(cb).toHaveBeenCalledTimes(2);
        });
    });

    // ────────────────────────────────────────────────
    // Click outside → close
    // ────────────────────────────────────────────────

    describe('click outside', () => {
        test('click outside anchor and popover closes the popover', () => {
            const cb = jest.fn();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withOnClose(cb);
            builder.show();

            const outside = document.createElement('div');
            document.body.appendChild(outside);
            outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('click on anchor does NOT close the popover', () => {
            const cb = jest.fn();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withOnClose(cb);
            builder.show();

            anchor.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            expect(cb).not.toHaveBeenCalled();
        });

        test('click inside popover does NOT close the popover', () => {
            const cb = jest.fn();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withOnClose(cb);
            builder.show();

            const popover = document.body.querySelector('[popover]')!;
            const innerEl = popover.querySelector('div')!;
            innerEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            expect(cb).not.toHaveBeenCalled();
        });

        test('click outside when already closed is a no-op', () => {
            const cb = jest.fn();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withOnClose(cb);
            builder.show();
            builder.close();
            cb.mockClear();

            const outside = document.createElement('div');
            document.body.appendChild(outside);
            outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            expect(cb).not.toHaveBeenCalled();
        });
    });

    // ────────────────────────────────────────────────
    // Scroll outside → close
    // ────────────────────────────────────────────────

    describe('scroll outside', () => {
        test('scroll outside popover closes and fires callback', () => {
            const cb = jest.fn();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withOnClose(cb);
            builder.show();

            // Dispatch a scroll event on an element outside the popover
            document.dispatchEvent(new Event('scroll', { bubbles: true }));

            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('scroll inside popover does NOT close', () => {
            const cb = jest.fn();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withOnClose(cb);
            builder.show();

            const popover = document.body.querySelector('[popover]')!;
            popover.dispatchEvent(new Event('scroll', { bubbles: true }));

            expect(cb).not.toHaveBeenCalled();
        });
    });

    // ────────────────────────────────────────────────
    // Window resize → close
    // ────────────────────────────────────────────────

    describe('window resize', () => {
        test('window resize repositions the open popover instead of closing it', () => {
            const cb = jest.fn();
            let currentRect = { top: 100, bottom: 120, left: 50, right: 200, width: 150, height: 20, x: 50, y: 100, toJSON: () => {} } as DOMRect;
            const anchor = document.createElement('button');
            anchor.getBoundingClientRect = () => currentRect;
            document.body.appendChild(anchor);
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withOnClose(cb);
            builder.show();

            currentRect = { ...currentRect, top: 300, bottom: 320 } as DOMRect;
            window.dispatchEvent(new Event('resize'));

            expect(cb).not.toHaveBeenCalled();
            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.top).toBe('324px');
        });

        test('window resize when already closed is a no-op', () => {
            const cb = jest.fn();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withOnClose(cb);
            builder.show();
            builder.close();
            cb.mockClear();

            expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();
            expect(cb).not.toHaveBeenCalled();
        });
    });

    // ────────────────────────────────────────────────
    // Global listener lifecycle (#26)
    // ────────────────────────────────────────────────

    describe('global listener lifecycle', () => {
        function attachedCount(spyAdd: jest.SpyInstance, spyRemove: jest.SpyInstance, type: string): number {
            const adds = spyAdd.mock.calls.filter(c => c[0] === type).length;
            const removes = spyRemove.mock.calls.filter(c => c[0] === type).length;
            return adds - removes;
        }

        test('close() removes document click, capture scroll and window resize listeners', () => {
            const docAdd = jest.spyOn(document, 'addEventListener');
            const docRemove = jest.spyOn(document, 'removeEventListener');
            const winAdd = jest.spyOn(window, 'addEventListener');
            const winRemove = jest.spyOn(window, 'removeEventListener');

            const builder = new PopoverBuilder().withAnchor(makeAnchor()).withContent(makeContent());
            builder.show();
            expect(attachedCount(docAdd, docRemove, 'click')).toBe(1);
            expect(attachedCount(docAdd, docRemove, 'scroll')).toBe(1);
            expect(attachedCount(winAdd, winRemove, 'resize')).toBe(1);

            builder.close();
            expect(attachedCount(docAdd, docRemove, 'click')).toBe(0);
            expect(attachedCount(docAdd, docRemove, 'scroll')).toBe(0);
            expect(attachedCount(winAdd, winRemove, 'resize')).toBe(0);

            const scrollRemove = docRemove.mock.calls.find(c => c[0] === 'scroll')!;
            expect(scrollRemove[2]).toBe(true); // capture phase, matching the add
        });

        test('build() does not attach global listeners; show() attaches them', () => {
            const docAdd = jest.spyOn(document, 'addEventListener');
            const winAdd = jest.spyOn(window, 'addEventListener');

            const builder = new PopoverBuilder().withAnchor(makeAnchor()).withContent(makeContent());
            builder.build();
            expect(docAdd.mock.calls.filter(c => c[0] === 'click').length).toBe(0);
            expect(winAdd.mock.calls.filter(c => c[0] === 'resize').length).toBe(0);

            builder.show();
            expect(docAdd.mock.calls.filter(c => c[0] === 'click').length).toBe(1);
            expect(winAdd.mock.calls.filter(c => c[0] === 'resize').length).toBe(1);
        });

        test('show() twice does not double-register listeners', () => {
            const docAdd = jest.spyOn(document, 'addEventListener');
            const winAdd = jest.spyOn(window, 'addEventListener');

            const builder = new PopoverBuilder().withAnchor(makeAnchor()).withContent(makeContent());
            builder.show();
            builder.show();

            expect(docAdd.mock.calls.filter(c => c[0] === 'click').length).toBe(1);
            expect(docAdd.mock.calls.filter(c => c[0] === 'scroll').length).toBe(1);
            expect(winAdd.mock.calls.filter(c => c[0] === 'resize').length).toBe(1);
        });

        test('show → close → show re-attaches listeners exactly once', () => {
            const docAdd = jest.spyOn(document, 'addEventListener');
            const docRemove = jest.spyOn(document, 'removeEventListener');
            const cb = jest.fn();

            const builder = new PopoverBuilder().withAnchor(makeAnchor()).withContent(makeContent()).withOnClose(cb);
            builder.show();
            builder.close();
            builder.show();
            expect(attachedCount(docAdd, docRemove, 'click')).toBe(1);

            // listener is live again: outside click closes
            const outside = document.createElement('div');
            document.body.appendChild(outside);
            outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            expect(cb).toHaveBeenCalledTimes(2);
        });

        test('anchor destroy after close() does not remove listeners twice and still removes the element', () => {
            const builder = new PopoverBuilder().withAnchor(makeAnchor()).withContent(makeContent());
            builder.show();
            builder.close();
            const docRemove = jest.spyOn(document, 'removeEventListener');
            // cleanup after close must not try to remove again (already removed)
            const anchorEl = document.body.querySelector('button')!;
            anchorEl.remove();
            return new Promise<void>(resolve => setTimeout(resolve, 0)).then(() => {
                expect(docRemove.mock.calls.filter(c => c[0] === 'click').length).toBe(0);
                expect(document.body.querySelector('[popover]')).toBeNull();
            });
        });

        test('anchor destroy while open removes listeners and the body element', () => {
            const docAdd = jest.spyOn(document, 'addEventListener');
            const docRemove = jest.spyOn(document, 'removeEventListener');
            const winAdd = jest.spyOn(window, 'addEventListener');
            const winRemove = jest.spyOn(window, 'removeEventListener');
            const anchor = makeAnchor();
            new PopoverBuilder().withAnchor(anchor).withContent(makeContent()).show();

            anchor.remove();
            return new Promise<void>(resolve => setTimeout(resolve, 0)).then(() => {
                expect(attachedCount(docAdd, docRemove, 'click')).toBe(0);
                expect(attachedCount(docAdd, docRemove, 'scroll')).toBe(0);
                expect(attachedCount(winAdd, winRemove, 'resize')).toBe(0);
                expect(document.body.querySelector('[popover]')).toBeNull();
            });
        });
    });

    // ────────────────────────────────────────────────
    // Popover API fallback (#11)
    // ────────────────────────────────────────────────

    describe('Popover API fallback', () => {
        let savedShow: any;
        let savedHide: any;
        beforeEach(() => {
            savedShow = HTMLElement.prototype.showPopover;
            savedHide = HTMLElement.prototype.hidePopover;
            delete (HTMLElement.prototype as any).showPopover;
            delete (HTMLElement.prototype as any).hidePopover;
        });
        afterEach(() => {
            HTMLElement.prototype.showPopover = savedShow;
            HTMLElement.prototype.hidePopover = savedHide;
        });

        test('show() without showPopover toggles display and positions', () => {
            const cb = jest.fn();
            const builder = new PopoverBuilder().withAnchor(makeAnchor()).withContent(makeContent()).withOnClose(cb);
            expect(() => builder.show()).not.toThrow();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.display).toBe('block');
            expect(popover.style.top).toBe('124px');
            expect(popover.style.left).toBe('50px');

            builder.close();
            expect(popover.style.display).toBe('none');
            expect(cb).toHaveBeenCalledTimes(1);
        });
    });

    // ────────────────────────────────────────────────
    // Fit-to-viewport (maxHeight / data-placement)
    // ────────────────────────────────────────────────

    describe('fit to viewport', () => {
        const savedInnerHeight = window.innerHeight;
        afterEach(() => {
            Object.defineProperty(window, 'innerHeight', { value: savedInnerHeight, configurable: true });
        });

        test('withMaxHeight returns this (fluent)', () => {
            const builder = new PopoverBuilder();
            expect(builder.withMaxHeight(300)).toBe(builder);
        });

        test('default: no maxHeight clamp — content renders at natural height, no scrollbar (e.g. DatePicker calendar)', () => {
            Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
            new PopoverBuilder().withAnchor(makeAnchor({ top: 100, bottom: 120 })).withContent(makeContent()).show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.maxHeight).toBe('');
            expect(popover.className).toContain('overflow-hidden');
            expect(popover.className).not.toContain('overflow-y-auto');
            expect(popover.getAttribute('data-placement')).toBe('bottom');
        });

        test('withScrollElement receives the clamped max-height and a scroll nudge', () => {
            Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
            const scroller = document.createElement('ul');
            const scrollSpy = jest.fn();
            scroller.addEventListener('scroll', scrollSpy);
            new PopoverBuilder()
                .withAnchor(makeAnchor({ top: 100, bottom: 120 }))
                .withContent(makeContent())
                .withMaxHeight(256)
                .withScrollElement(scroller)
                .show();

            expect(scroller.style.maxHeight).toBe('256px');
            expect(scrollSpy).toHaveBeenCalled();
        });

        test('withMaxHeight(number) is used as the preferred max', () => {
            Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
            new PopoverBuilder().withAnchor(makeAnchor({ top: 100, bottom: 120 })).withContent(makeContent()).withMaxHeight(400).show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.maxHeight).toBe('400px');
        });

        test('withMaxHeight(Observable) updates maxHeight reactively while open', () => {
            Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
            const max$ = new BehaviorSubject<number>(200);
            new PopoverBuilder().withAnchor(makeAnchor({ top: 100, bottom: 120 })).withContent(makeContent()).withMaxHeight(max$).show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.maxHeight).toBe('200px');
            max$.next(320);
            expect(popover.style.maxHeight).toBe('320px');
        });

        test('clamps maxHeight to the space below (minus margin) when it does not fit below but there is even less above', () => {
            // innerHeight 600, anchor bottom 500: spaceBelow = 600 - 500 - 12 = 88; spaceAbove = 40 - 12 = 28
            Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
            jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200);
            new PopoverBuilder().withAnchor(makeAnchor({ top: 40, bottom: 500 })).withContent(makeContent()).withMaxHeight(256).show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.getAttribute('data-placement')).toBe('bottom');
            expect(popover.style.maxHeight).toBe('88px');
        });

        test('flips above and clamps maxHeight to the space above when near the viewport bottom', () => {
            // innerHeight 768, anchor top 600 / bottom 620: spaceBelow = 768 - 620 - 12 = 136 (< 200 measured)
            // spaceAbove = 600 - 12 = 588 → placement top, maxHeight = min(256, 588) = 256
            Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
            jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200);
            new PopoverBuilder().withAnchor(makeAnchor({ top: 600, bottom: 620 })).withContent(makeContent()).withMaxHeight(256).show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.getAttribute('data-placement')).toBe('top');
            expect(popover.style.top).toBe('auto');
            expect(popover.style.bottom).toBe('172px');
            expect(popover.style.maxHeight).toBe('256px');
        });

        test('does not get stuck at maxHeight 0 when spaceBelow <= 0 on the unmeasured first pass (A7)', () => {
            // Real browsers report offsetHeight 0 while display:none (pass 1, before showPopover)
            // and the actual rendered height once visible (pass 2). Mimic that alternation instead
            // of a constant mock so pass 1 hits the popoverHeight===0 branch.
            Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
            let calls = 0;
            jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: any) {
                calls++;
                return calls === 1 ? 0 : 200;
            });

            new PopoverBuilder().withAnchor(makeAnchor({ top: 580, bottom: 598 })).withContent(makeContent()).show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.getAttribute('data-placement')).toBe('top');
            expect(popover.style.maxHeight).not.toBe('0px');
        });

        test('flipped above with little room: maxHeight clamped to spaceAbove', () => {
            // innerHeight 400, anchor top 180 / bottom 380: spaceBelow = 400-380-12 = 8; spaceAbove = 180-12 = 168
            Object.defineProperty(window, 'innerHeight', { value: 400, configurable: true });
            jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200);
            new PopoverBuilder().withAnchor(makeAnchor({ top: 180, bottom: 380 })).withContent(makeContent()).withMaxHeight(256).show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.getAttribute('data-placement')).toBe('top');
            expect(popover.style.maxHeight).toBe('168px');
        });

        test('margin includes the configured offset', () => {
            // offset 10 → margin 18; innerHeight 600, bottom 500 → spaceBelow = 82.
            // Mock a measured height that fits within spaceBelow so the clamp (only applied
            // once the popover has a real, non-zero offsetHeight) is exercised.
            Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
            jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(50);
            new PopoverBuilder().withAnchor(makeAnchor({ top: 40, bottom: 500 })).withContent(makeContent()).withOffset(10).withMaxHeight(256).show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.maxHeight).toBe('82px');
        });

        test('Observable withMaxHeight emission while open is re-clamped to the available space', () => {
            // innerHeight 600, anchor bottom 500 → spaceBelow = 600 - 500 - 12 = 88, spaceAbove = 28
            // → stays below; maxHeight = min(preferred, 88).
            Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
            jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(60);
            const max$ = new BehaviorSubject<number>(40);
            new PopoverBuilder()
                .withAnchor(makeAnchor({ top: 40, bottom: 500 }))
                .withContent(makeContent())
                .withMaxHeight(max$)
                .show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.getAttribute('data-placement')).toBe('bottom');
            expect(popover.style.maxHeight).toBe('40px'); // preferred < available

            max$.next(400); // preferred now exceeds available → clamped to spaceBelow
            expect(popover.style.maxHeight).toBe('88px');

            max$.next(20); // back under the available space
            expect(popover.style.maxHeight).toBe('20px');
        });

        test('Observable withMaxHeight emission while CLOSED does not reposition', () => {
            Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
            const max$ = new BehaviorSubject<number>(200);
            const builder = new PopoverBuilder()
                .withAnchor(makeAnchor({ top: 100, bottom: 120 }))
                .withContent(makeContent())
                .withMaxHeight(max$);
            builder.show();
            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.maxHeight).toBe('200px');

            builder.close();
            max$.next(500);
            expect(popover.style.maxHeight).toBe('200px'); // untouched while closed

            builder.show(); // re-open picks up the latest value
            expect(popover.style.maxHeight).toBe('500px');
        });

        test('maxHeight subscription is released on anchor destroy', () => {
            Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
            const max$ = new BehaviorSubject<number>(200);
            const anchor = makeAnchor({ top: 100, bottom: 120 });
            new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withMaxHeight(max$)
                .show();

            expect(max$.observed).toBe(true);

            anchor.remove();
            return new Promise<void>(resolve => setTimeout(resolve, 0)).then(() => {
                expect(max$.observed).toBe(false);
                // Emitting after destroy must not throw (no dangling _position on a removed element)
                expect(() => max$.next(999)).not.toThrow();
                expect(document.body.querySelector('[popover]')).toBeNull();
            });
        });
    });

    // ────────────────────────────────────────────────
    // _cleanup via registerDestroy
    // ────────────────────────────────────────────────

    describe('_cleanup (registerDestroy on anchor)', () => {
        test('cleanup fires _onCloseCb if open', () => {
            const cb = jest.fn();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withOnClose(cb);
            builder.show();

            // Trigger cleanup by removing anchor from DOM (MutationObserver fires destroyMap callbacks)
            // Instead, call registerDestroy directly by removing anchor
            // Since the destroy is registered on the anchor, remove it from the DOM
            anchor.remove();

            // MutationObserver is async — give it a tick
            return new Promise<void>(resolve => setTimeout(resolve, 0)).then(() => {
                expect(cb).toHaveBeenCalledTimes(1);
            });
        });

        test('cleanup removes popover element from DOM', () => {
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent());
            builder.show();

            expect(document.body.querySelector('[popover]')).not.toBeNull();

            anchor.remove();

            return new Promise<void>(resolve => setTimeout(resolve, 0)).then(() => {
                expect(document.body.querySelector('[popover]')).toBeNull();
            });
        });

        test('cleanup does NOT fire _onCloseCb if already closed', () => {
            const cb = jest.fn();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withOnClose(cb);
            builder.show();
            builder.close(); // sets _isOpen = false
            cb.mockClear();

            anchor.remove();

            return new Promise<void>(resolve => setTimeout(resolve, 0)).then(() => {
                expect(cb).not.toHaveBeenCalled();
            });
        });
    });

    // ────────────────────────────────────────────────
    // build()
    // ────────────────────────────────────────────────

    describe('build()', () => {
        test('build() returns this (fluent)', () => {
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent());
            expect(builder.build()).toBe(builder);
        });

        test('build() creates popover element in document.body without calling showPopover()', () => {
            const { showSpy } = spyOnPopoverMethods();
            const anchor = makeAnchor();
            new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .build();

            expect(document.body.querySelector('[popover]')).not.toBeNull();
            expect(showSpy).not.toHaveBeenCalled();
        });

        test('build() makes the popover element queryable (it\'s in DOM) but not visible', () => {
            const { showSpy } = spyOnPopoverMethods();
            const anchor = makeAnchor();
            new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent('pre-built'))
                .build();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            // Element is in the DOM and its content is accessible
            expect(popover).not.toBeNull();
            expect(popover.textContent).toBe('pre-built');
            // showPopover() was never called — the element was not made visible
            expect(showSpy).not.toHaveBeenCalled();
        });

        test('subsequent show() works correctly after build() — calls showPopover() once', () => {
            const { showSpy } = spyOnPopoverMethods();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent());

            builder.build();
            builder.show();

            expect(showSpy).toHaveBeenCalledTimes(1);
            // Same element reused (not rebuilt)
            expect(document.body.querySelectorAll('[popover]').length).toBe(1);
        });
    });

    // ────────────────────────────────────────────────
    // Lazy build — popover element not created until show()
    // ────────────────────────────────────────────────

    describe('lazy build', () => {
        test('no popover element exists before show()', () => {
            makeAnchor(); // appended to body but not used in builder
            new PopoverBuilder()
                .withAnchor(makeAnchor())
                .withContent(makeContent());

            // No show() called — popover should not be in DOM
            expect(document.body.querySelector('[popover]')).toBeNull();
        });

        test('popover element is reused on second show() (not rebuilt)', () => {
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent());
            builder.show();
            const first = document.body.querySelector('[popover]');
            builder.close();
            builder.show();
            const second = document.body.querySelector('[popover]');

            expect(first).toBe(second);
        });
    });

    // ────────────────────────────────────────────────
    // Mutual exclusion
    // ────────────────────────────────────────────────

    describe('mutual exclusion', () => {
        test('opening a second popover automatically closes the first', () => {
            const cb1 = jest.fn();
            const anchor1 = makeAnchor();
            const builder1 = new PopoverBuilder()
                .withAnchor(anchor1)
                .withContent(makeContent('first'))
                .withOnClose(cb1);
            builder1.show();

            const anchor2 = makeAnchor();
            const builder2 = new PopoverBuilder()
                .withAnchor(anchor2)
                .withContent(makeContent('second'));
            builder2.show();

            expect(cb1).toHaveBeenCalledTimes(1);
            // builder2 should now be open (showPopover called for it)
            // Verify by closing it and confirming no error / it was open
            expect(() => builder2.close()).not.toThrow();
        });

        test('opening the same popover again does NOT close it (idempotent)', () => {
            const cb = jest.fn();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withOnClose(cb);
            builder.show();
            builder.show(); // calling show on already-open popover

            expect(cb).not.toHaveBeenCalled();
        });

        test('after first popover closes normally, opening a second still works', () => {
            const cb1 = jest.fn();
            const anchor1 = makeAnchor();
            const builder1 = new PopoverBuilder()
                .withAnchor(anchor1)
                .withContent(makeContent('first'))
                .withOnClose(cb1);
            builder1.show();
            builder1.close(); // normal close — clears _activePopover

            const cb2 = jest.fn();
            const anchor2 = makeAnchor();
            const builder2 = new PopoverBuilder()
                .withAnchor(anchor2)
                .withContent(makeContent('second'))
                .withOnClose(cb2);
            builder2.show();

            // first was already closed, cb1 should not be called again
            expect(cb1).toHaveBeenCalledTimes(1);
            // second opened cleanly
            builder2.close();
            expect(cb2).toHaveBeenCalledTimes(1);
        });
    });

    // ────────────────────────────────────────────────
    // withAlignment
    // ────────────────────────────────────────────────

    describe('withAlignment', () => {
        test('withAlignment returns this (fluent)', () => {
            const builder = new PopoverBuilder();
            expect(builder.withAlignment('end')).toBe(builder);
        });

        test('default alignment (start) sets left = rect.left and clears right', () => {
            const anchor = makeAnchor({ bottom: 120, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent());
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.left).toBe('50px');
            expect(popover.style.right).toBe('auto');
        });

        test('alignment "end" uses left (not right) after show()', () => {
            const anchor = makeAnchor({ bottom: 120, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withAlignment('end');
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            // New behaviour: always uses CSS left, never right
            expect(popover.style.right).toBe('auto');
            expect(popover.style.left).not.toBe('');
        });

        test('alignment "end" pre-render pass (offsetWidth=0): left = posRect.right', () => {
            // offsetWidth is 0 in jsdom before layout, so the pre-render branch fires on first
            // _position() call. After showPopover() the 'end' path calls _position() a second time,
            // but offsetWidth is still 0 in jsdom so left is posRect.right on both calls.
            const anchor = makeAnchor({ bottom: 120, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withAlignment('end');
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            // offsetWidth = 0 in jsdom => pre-render branch: left = posRect.right = 200
            expect(popover.style.left).toBe('200px');
            expect(popover.style.right).toBe('auto');
        });

        test('alignment "end" post-render pass (offsetWidth>0): left = posRect.right - offsetWidth', () => {
            const anchor = makeAnchor({ bottom: 120, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withAlignment('end');
            builder.build(); // build without show so we can set offsetWidth

            // Patch offsetWidth on the popover element before show()
            const popoverEl = document.body.querySelector('[popover]') as HTMLElement;
            Object.defineProperty(popoverEl, 'offsetWidth', { value: 80, configurable: true });

            builder.show();

            // post-render: left = Math.max(0, posRect.right - offsetWidth) = Math.max(0, 200 - 80) = 120
            expect(popoverEl.style.left).toBe('120px');
            expect(popoverEl.style.right).toBe('auto');
        });

        test('alignment "end" post-render pass clamps left to 0 when popover wider than posRect.right', () => {
            const anchor = makeAnchor({ bottom: 120, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withAlignment('end');
            builder.build();

            const popoverEl = document.body.querySelector('[popover]') as HTMLElement;
            // offsetWidth larger than posRect.right → would go negative → clamped to 0
            Object.defineProperty(popoverEl, 'offsetWidth', { value: 300, configurable: true });

            builder.show();

            expect(popoverEl.style.left).toBe('0px');
        });

        test('alignment "end" post-render pass clamps left to window.innerWidth - popoverWidth when anchor extends past viewport right', () => {
            // posRect.right (1100) > window.innerWidth (1024): naive left = 1100-80 = 1020 which
            // would place the right edge at 1020+80 = 1100 → off screen.
            // The upper clamp should cap left at window.innerWidth - popoverWidth = 1024-80 = 944.
            const savedInnerWidth = window.innerWidth;
            Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });

            const anchor = makeAnchor({ bottom: 120, left: 950, right: 1100, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withAlignment('end');
            builder.build();

            const popoverEl = document.body.querySelector('[popover]') as HTMLElement;
            Object.defineProperty(popoverEl, 'offsetWidth', { value: 80, configurable: true });

            builder.show();

            // Math.min(1024-80, Math.max(0, 1100-80)) = Math.min(944, 1020) = 944
            expect(popoverEl.style.left).toBe('944px');
            expect(popoverEl.style.right).toBe('auto');

            Object.defineProperty(window, 'innerWidth', { value: savedInnerWidth, configurable: true });
        });

        test('show() calls _position() twice for "end" alignment (pre-render + post-render)', () => {
            let rectCallCount = 0;
            const anchor = document.createElement('button');
            anchor.getBoundingClientRect = () => {
                rectCallCount++;
                return { top: 100, bottom: 120, left: 50, right: 200, width: 150, height: 20, x: 50, y: 100, toJSON: () => {} } as DOMRect;
            };
            document.body.appendChild(anchor);

            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withAlignment('end');
            builder.show();

            // _position() is called twice for 'end' alignment: once before showPopover(),
            // once after. Each call invokes getBoundingClientRect on the anchor.
            expect(rectCallCount).toBeGreaterThanOrEqual(2);
        });

        test('show() always calls _position() twice (pre-render + post-render)', () => {
            let rectCallCount = 0;
            const anchor = document.createElement('button');
            anchor.getBoundingClientRect = () => {
                rectCallCount++;
                return { top: 100, bottom: 120, left: 50, right: 200, width: 150, height: 20, x: 50, y: 100, toJSON: () => {} } as DOMRect;
            };
            document.body.appendChild(anchor);

            new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withAlignment('start')
                .show();

            // _position() calls getBoundingClientRect() 2 times (once for anchor, once for posRef).
            // show() calls _position() 2 times.
            // So total calls = 2 * 2 = 4.
            expect(rectCallCount).toBe(4);
        });

        test('alignment "start" sets left and clears right', () => {
            const anchor = makeAnchor({ bottom: 120, left: 75, right: 225, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withAlignment('start');
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.left).toBe('75px');
            expect(popover.style.right).toBe('auto');
        });
    });

    // ────────────────────────────────────────────────
    // withPositionReference
    // ────────────────────────────────────────────────

    describe('withPositionReference', () => {
        test('withPositionReference returns this (fluent)', () => {
            const builder = new PopoverBuilder();
            const ref = document.createElement('div');
            expect(builder.withPositionReference(ref)).toBe(builder);
        });

        test('when positionReference is set, "end" alignment left uses positionReference.getBoundingClientRect().right', () => {
            const anchor = makeAnchor({ bottom: 120, left: 50, right: 200, width: 150 });
            const ref = document.createElement('div');
            // positionReference has a different right than the anchor
            ref.getBoundingClientRect = () => ({
                top: 100, bottom: 120, left: 30, right: 350, width: 320, height: 20, x: 30, y: 100, toJSON: () => {}
            } as DOMRect);
            document.body.appendChild(ref);

            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withAlignment('end')
                .withPositionReference(ref);
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            // offsetWidth = 0 in jsdom => pre-render branch: left = posRef.right = 350
            expect(popover.style.left).toBe('350px');
            expect(popover.style.right).toBe('auto');
        });

        test('when positionReference is set, "end" alignment left does NOT use anchor.getBoundingClientRect().right', () => {
            const anchor = makeAnchor({ bottom: 120, left: 50, right: 200, width: 150 });
            const ref = document.createElement('div');
            ref.getBoundingClientRect = () => ({
                top: 100, bottom: 120, left: 30, right: 350, width: 320, height: 20, x: 30, y: 100, toJSON: () => {}
            } as DOMRect);
            document.body.appendChild(ref);

            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withAlignment('end')
                .withPositionReference(ref);
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            // anchor.right = 200 (left would be 200); posRef.right = 350 (left = 350)
            // They differ, so left must NOT equal the anchor-based value
            expect(popover.style.left).not.toBe('200px');
        });

        test('when positionReference is set, top still uses anchor.getBoundingClientRect().bottom (not positionReference)', () => {
            // anchor bottom = 120, offset = 4 => top = 124
            const anchor = makeAnchor({ bottom: 120, left: 50, right: 200, width: 150 });
            const ref = document.createElement('div');
            // positionReference has a very different bottom
            ref.getBoundingClientRect = () => ({
                top: 0, bottom: 999, left: 30, right: 350, width: 320, height: 999, x: 30, y: 0, toJSON: () => {}
            } as DOMRect);
            document.body.appendChild(ref);

            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPositionReference(ref);
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            // top must come from anchor (120 + 4 = 124), not positionReference (999 + 4 = 1003)
            expect(popover.style.top).toBe('124px');
        });

        test('when positionReference is set, "start" alignment left uses positionReference.getBoundingClientRect().left', () => {
            const anchor = makeAnchor({ bottom: 120, left: 50, right: 200, width: 150 });
            const ref = document.createElement('div');
            ref.getBoundingClientRect = () => ({
                top: 100, bottom: 120, left: 10, right: 330, width: 320, height: 20, x: 10, y: 100, toJSON: () => {}
            } as DOMRect);
            document.body.appendChild(ref);

            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withAlignment('start')
                .withPositionReference(ref);
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.left).toBe('10px');
        });

        test('when positionReference is set, "match-anchor" width uses positionReference width', () => {
            const anchor = makeAnchor({ bottom: 120, left: 50, right: 200, width: 150 });
            const ref = document.createElement('div');
            ref.getBoundingClientRect = () => ({
                top: 100, bottom: 120, left: 30, right: 350, width: 320, height: 20, x: 30, y: 100, toJSON: () => {}
            } as DOMRect);
            document.body.appendChild(ref);

            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withWidth('match-anchor')
                .withPositionReference(ref);
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.width).toBe('320px');
        });

        test('without positionReference, "end" alignment falls back to anchor.getBoundingClientRect().right for left', () => {
            const anchor = makeAnchor({ bottom: 120, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withAlignment('end');
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            // offsetWidth = 0 in jsdom => pre-render: left = anchor.right = 200
            expect(popover.style.left).toBe('200px');
            expect(popover.style.right).toBe('auto');
        });
    });

    // ────────────────────────────────────────────────
    // withMaxWidth
    // ────────────────────────────────────────────────

    describe('withMaxWidth', () => {
        test('withMaxWidth returns this (fluent)', () => {
            const builder = new PopoverBuilder();
            expect(builder.withMaxWidth('300px')).toBe(builder);
        });

        test('withMaxWidth sets maxWidth on the popover element', () => {
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withMaxWidth('300px');
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.maxWidth).toBe('300px');
        });

        test('withMaxWidth accepts arbitrary CSS values', () => {
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withMaxWidth('50vw');
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.maxWidth).toBe('50vw');
        });

        test('without withMaxWidth, maxWidth is not set on the popover element', () => {
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent());
            builder.show();

            const popover = document.body.querySelector('[popover]') as HTMLElement;
            expect(popover.style.maxWidth).toBe('');
        });
    });

    // ────────────────────────────────────────────────
    // toggle event (Escape / native dismissal guard)
    // ────────────────────────────────────────────────

    describe('toggle event guard (native dismissal)', () => {
        test('toggle event with newState=closed fires _onCloseCb when open', () => {
            const cb = jest.fn();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withOnClose(cb);
            builder.show();

            const popover = document.body.querySelector('[popover]')!;
            // Simulate native toggle event (e.g. Escape key on popover="auto")
            const event = new Event('toggle') as any;
            event.newState = 'closed';
            popover.dispatchEvent(event);

            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('toggle event does NOT double-fire if already closed via _onClose', () => {
            const cb = jest.fn();
            const anchor = makeAnchor();
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withOnClose(cb);
            builder.show();

            // Programmatic close sets _isOpen=false first, then hides popover
            builder.close(); // fires cb once, sets _isOpen=false

            // Now if toggle event fires (e.g. hidePopover triggered it), _isOpen is already false
            const popover = document.body.querySelector('[popover]')!;
            const event = new Event('toggle') as any;
            event.newState = 'closed';
            popover.dispatchEvent(event);

            expect(cb).toHaveBeenCalledTimes(1); // no double-fire
        });

        test('toggle dismissal detaches the document click listener (count back to 0)', () => {
            const docAdd = jest.spyOn(document, 'addEventListener');
            const docRemove = jest.spyOn(document, 'removeEventListener');

            const builder = new PopoverBuilder()
                .withAnchor(makeAnchor())
                .withContent(makeContent());
            builder.show();

            const live = (type: string) =>
                docAdd.mock.calls.filter(c => c[0] === type).length -
                docRemove.mock.calls.filter(c => c[0] === type).length;

            expect(live('click')).toBe(1);

            const popover = document.body.querySelector('[popover]')!;
            const event = new Event('toggle') as any;
            event.newState = 'closed';
            popover.dispatchEvent(event);

            expect(live('click')).toBe(0);
            expect(live('scroll')).toBe(0);
        });

        test('toggle dismissal releases the active-popover slot so a second builder can show()', () => {
            const firstClose = jest.fn();
            const first = new PopoverBuilder()
                .withAnchor(makeAnchor())
                .withContent(makeContent('first'))
                .withOnClose(firstClose);
            first.show();

            const popover = document.body.querySelector('[popover]')!;
            const event = new Event('toggle') as any;
            event.newState = 'closed';
            popover.dispatchEvent(event);
            expect(firstClose).toHaveBeenCalledTimes(1);

            // Second builder opens normally — the stale active popover must not be re-closed.
            const { showSpy } = spyOnPopoverMethods();
            const second = new PopoverBuilder()
                .withAnchor(makeAnchor())
                .withContent(makeContent('second'));
            second.show();

            expect(showSpy).toHaveBeenCalledTimes(1);
            const els = document.body.querySelectorAll('[popover]');
            expect(els.length).toBe(2);
            expect((els[1] as HTMLElement).style.display).not.toBe('none');
            // Closing the first again is a no-op: it is already closed.
            expect(firstClose).toHaveBeenCalledTimes(1);
        });
    });

    // ────────────────────────────────────────────────
    // Focus restoration on close
    // ────────────────────────────────────────────────

    describe('focus restoration on close', () => {
        // NOTE: the suite simulates focus by overriding document.activeElement via
        // Object.defineProperty (real .focus() does not reliably update activeElement
        // in jsdom and earlier tests leave it overridden), so we assert restoration by
        // spying on anchor.focus() rather than reading document.activeElement.
        afterEach(() => {
            Object.defineProperty(document, 'activeElement', { value: document.body, configurable: true });
        });

        test('restores focus to the anchor when focus was inside the popover', () => {
            const anchor = makeAnchor();
            const focusSpy = jest.spyOn(anchor, 'focus');
            const builder = new PopoverBuilder().withAnchor(anchor).withContent(makeContent());
            builder.show();

            // Simulate real DOM focus living inside the popover (the failing scenario
            // for manual popovers, which get no automatic browser focus restoration).
            const focusedEl = document.createElement('input');
            const popoverEl = document.body.querySelector('[popover]') as HTMLElement;
            popoverEl.appendChild(focusedEl);
            Object.defineProperty(document, 'activeElement', { value: focusedEl, configurable: true });

            builder.close();

            expect(focusSpy).toHaveBeenCalledTimes(1);
        });

        test('does NOT move focus to the anchor when focus was outside the popover', () => {
            const anchor = makeAnchor();
            const focusSpy = jest.spyOn(anchor, 'focus');
            const builder = new PopoverBuilder().withAnchor(anchor).withContent(makeContent());
            builder.show();

            // Focus is outside the popover (e.g. the user clicked elsewhere first).
            Object.defineProperty(document, 'activeElement', { value: document.body, configurable: true });

            builder.close();

            expect(focusSpy).not.toHaveBeenCalled();
        });
    });

    // ────────────────────────────────────────────────
    // withPlacement (BOTTOM | RIGHT)
    // ────────────────────────────────────────────────

    describe('withPlacement', () => {
        const savedInnerWidth = window.innerWidth;
        const savedInnerHeight = window.innerHeight;

        afterEach(() => {
            Object.defineProperty(window, 'innerWidth', { value: savedInnerWidth, configurable: true });
            Object.defineProperty(window, 'innerHeight', { value: savedInnerHeight, configurable: true });
        });

        // Builds without showing so the popover element can be given a measured size,
        // then shows it: both _position() passes then see the mocked dimensions.
        function showSized(
            builder: PopoverBuilder,
            size: { width?: number; height?: number } = {}
        ): HTMLElement {
            builder.build();
            const el = document.body.querySelector('[popover]') as HTMLElement;
            if (size.width !== undefined) {
                Object.defineProperty(el, 'offsetWidth', { value: size.width, configurable: true });
            }
            if (size.height !== undefined) {
                Object.defineProperty(el, 'offsetHeight', { value: size.height, configurable: true });
            }
            builder.show();
            return el;
        }

        test('withPlacement returns this (fluent)', () => {
            const builder = new PopoverBuilder();
            expect(builder.withPlacement(PopoverPlacement.RIGHT)).toBe(builder);
        });

        test('BOTTOM is the default and is unchanged by the placement switch', () => {
            const anchor = makeAnchor({ top: 100, bottom: 120, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder().withAnchor(anchor).withContent(makeContent());
            const el = showSized(builder, { width: 80, height: 60 });

            // below the anchor, left-aligned to it, width matching the anchor
            expect(el.style.top).toBe('124px');
            expect(el.style.bottom).toBe('auto');
            expect(el.style.left).toBe('50px');
            expect(el.style.width).toBe('150px');
            expect(el.getAttribute('data-placement')).toBe('bottom');
        });

        test('explicit BOTTOM behaves exactly like the default', () => {
            const anchor = makeAnchor({ top: 100, bottom: 120, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.BOTTOM);
            const el = showSized(builder, { width: 80, height: 60 });

            expect(el.style.top).toBe('124px');
            expect(el.style.left).toBe('50px');
            expect(el.style.width).toBe('150px');
            expect(el.getAttribute('data-placement')).toBe('bottom');
        });

        test('RIGHT sets left = anchor.right + offset', () => {
            const anchor = makeAnchor({ top: 100, bottom: 120, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.RIGHT);
            const el = showSized(builder, { width: 200, height: 60 });

            // default offset 4 → 200 + 4
            expect(el.style.left).toBe('204px');
            expect(el.style.right).toBe('auto');
            expect(el.getAttribute('data-placement')).toBe('right');
        });

        test('RIGHT honours withOffset', () => {
            const anchor = makeAnchor({ top: 100, bottom: 120, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.RIGHT)
                .withOffset(12);
            const el = showSized(builder, { width: 200, height: 60 });

            expect(el.style.left).toBe('212px');
        });

        test('RIGHT aligns the popover bottom edge with the anchor bottom edge by default', () => {
            const anchor = makeAnchor({ top: 100, bottom: 300, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.RIGHT);
            const el = showSized(builder, { width: 200, height: 120 });

            // top = anchor.bottom - popoverHeight = 300 - 120
            expect(el.style.top).toBe('180px');
            expect(el.style.bottom).toBe('auto');
        });

        test('RIGHT flips to the left of the anchor when it would overflow the viewport', () => {
            Object.defineProperty(window, 'innerWidth', { value: 600, configurable: true });
            const anchor = makeAnchor({ top: 100, bottom: 300, left: 350, right: 500, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.RIGHT);
            const el = showSized(builder, { width: 200, height: 120 });

            // 500 + 4 + 200 = 704 > 600 - 4 → flip: 350 - 4 - 200
            expect(el.style.left).toBe('146px');
            expect(el.getAttribute('data-placement')).toBe('left');
        });

        test('RIGHT flip clamps left to the 4px viewport inset when there is no room either side', () => {
            Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });
            const anchor = makeAnchor({ top: 100, bottom: 300, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.RIGHT);
            const el = showSized(builder, { width: 300, height: 120 });

            // 200 + 4 + 300 = 504 > 396 → flip: max(4, 50 - 4 - 300) = 4
            expect(el.style.left).toBe('4px');
            expect(el.getAttribute('data-placement')).toBe('left');
        });

        test('RIGHT clamps top to the 4px inset when the popover is taller than the space above', () => {
            const anchor = makeAnchor({ top: 0, bottom: 40, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.RIGHT);
            const el = showSized(builder, { width: 200, height: 200 });

            // desired top = 40 - 200 = -160 → clamped to 4
            expect(el.style.top).toBe('4px');
        });

        test('RIGHT clamps top so the popover bottom stays 4px inside the viewport', () => {
            Object.defineProperty(window, 'innerHeight', { value: 300, configurable: true });
            const anchor = makeAnchor({ top: 200, bottom: 299, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.RIGHT);
            const el = showSized(builder, { width: 200, height: 100 });

            // desired top = 199, maxTop = 300 - 100 - 4 = 196
            expect(el.style.top).toBe('196px');
        });

        test('RIGHT with alignment "start" top-aligns to the anchor', () => {
            const anchor = makeAnchor({ top: 100, bottom: 300, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.RIGHT)
                .withAlignment('start');
            const el = showSized(builder, { width: 200, height: 120 });

            expect(el.style.top).toBe('100px');
        });

        test('RIGHT with alignment "start" still clamps the top into the viewport', () => {
            Object.defineProperty(window, 'innerHeight', { value: 300, configurable: true });
            const anchor = makeAnchor({ top: 280, bottom: 299, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.RIGHT)
                .withAlignment('start');
            const el = showSized(builder, { width: 200, height: 100 });

            // desired top = 280, maxTop = 196
            expect(el.style.top).toBe('196px');
        });

        test('RIGHT with an explicit alignment "end" is bottom-aligned (the default)', () => {
            const anchor = makeAnchor({ top: 100, bottom: 300, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.RIGHT)
                .withAlignment('end');
            const el = showSized(builder, { width: 200, height: 120 });

            expect(el.style.top).toBe('180px');
        });

        test('RIGHT takes its natural width instead of matching the anchor', () => {
            const anchor = makeAnchor({ top: 100, bottom: 300, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.RIGHT);
            const el = showSized(builder, { width: 200, height: 120 });

            expect(el.style.width).toBe('auto');
            expect(el.style.minWidth).toBe('');
        });

        test('RIGHT still honours an explicitly requested width', () => {
            const anchor = makeAnchor({ top: 100, bottom: 300, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.RIGHT)
                .withWidth('match-anchor');
            const el = showSized(builder, { width: 200, height: 120 });

            expect(el.style.width).toBe('150px');
        });

        test('RIGHT honours an explicit fixed width', () => {
            const anchor = makeAnchor({ top: 100, bottom: 300, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.RIGHT)
                .withWidth('220px');
            const el = showSized(builder, { width: 220, height: 120 });

            expect(el.style.width).toBe('220px');
        });

        test('RIGHT repositions on window resize', () => {
            Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
            const anchor = makeAnchor({ top: 100, bottom: 300, left: 350, right: 500, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.RIGHT);
            const el = showSized(builder, { width: 200, height: 120 });

            expect(el.style.left).toBe('504px');

            // Viewport shrinks below the popover's right edge → next reposition flips it
            Object.defineProperty(window, 'innerWidth', { value: 600, configurable: true });
            window.dispatchEvent(new Event('resize'));

            expect(el.style.left).toBe('146px');
            expect(el.getAttribute('data-placement')).toBe('left');
        });

        test('RIGHT clamps a configured max-height to the viewport', () => {
            Object.defineProperty(window, 'innerHeight', { value: 300, configurable: true });
            const anchor = makeAnchor({ top: 100, bottom: 200, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.RIGHT)
                .withMaxHeight(400);
            const el = showSized(builder, { width: 200, height: 120 });

            // 400 preferred, viewport allows 300 - 4 - 4
            expect(el.style.maxHeight).toBe('292px');
        });

        test('RIGHT caps max-height to the viewport even when none is configured', () => {
            Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
            const anchor = makeAnchor({ top: 100, bottom: 200, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.RIGHT);
            const el = showSized(builder, { width: 200, height: 120 });

            expect(el.style.maxHeight).toBe('760px');
        });

        test('RIGHT taller than the viewport is capped and keeps a reachable top', () => {
            // Without the default cap the clamp would yield top = 600 - 700 - 4 = -104px, and
            // the overflow-hidden wrapper never flips vertically, so the first menu items
            // would be permanently off-screen.
            Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
            const anchor = makeAnchor({ top: 400, bottom: 500, left: 50, right: 200, width: 150 });
            const builder = new PopoverBuilder()
                .withAnchor(anchor)
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.RIGHT);
            const el = showSized(builder, { width: 200, height: 700 });

            expect(el.style.maxHeight).toBe('592px');
            expect(parseFloat(el.style.top)).toBeGreaterThanOrEqual(4);
        });

        test('RIGHT pre-render pass (offsetHeight 0) is corrected by the second pass', () => {
            // Real browsers report offsetHeight 0 while display:none (pass 1, before showPopover)
            // and the rendered height once visible (pass 2). Mimic that alternation so the
            // unmeasured branch of _positionRight is exercised.
            Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
            let calls = 0;
            jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: any) {
                calls++;
                return calls === 1 ? 0 : 120;
            });

            new PopoverBuilder()
                .withAnchor(makeAnchor({ top: 100, bottom: 300, left: 50, right: 200, width: 150 }))
                .withContent(makeContent())
                .withPlacement(PopoverPlacement.RIGHT)
                .show();

            const el = document.body.querySelector('[popover]') as HTMLElement;
            // Pass 1 (height 0) would put the bottom-aligned top at rect.bottom = 300px;
            // pass 2 measures 120 and corrects it to 300 - 120.
            expect(el.style.top).toBe('180px');
            expect(el.getAttribute('data-placement')).toBe('right');
        });
    });
});
