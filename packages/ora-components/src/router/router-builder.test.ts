import { RouterBuilder } from './router-builder';
import { ComponentBuilder } from '../core/component-builder';
import '@testing-library/jest-dom';

jest.mock('../core/destroyable-element', () => ({
    registerDestroy: jest.fn(),
}));

const mockBuilder = (el?: HTMLElement): ComponentBuilder => ({
    build: () => el ?? document.createElement('div'),
});

describe('RouterBuilder', () => {
    beforeEach(() => {
        // Reset URL to root before each test using jsdom-supported pushState
        window.history.pushState({}, '', '/');
    });

    it('build() returns an HTMLElement', () => {
        const router = new RouterBuilder();
        router.addRoute().withPattern('/').withContent(() => mockBuilder());
        expect(router.build()).toBeInstanceOf(HTMLElement);
    });

    it('mounts view for initial pathname on build()', async () => {
        const el = document.createElement('div');
        el.id = 'home';
        const router = new RouterBuilder();
        router.addRoute().withPattern('/').withContent(() => mockBuilder(el));
        const outlet = router.build();

        await Promise.resolve(); // let swapView settle
        expect(outlet.contains(el)).toBe(true);
    });

    it('navigate() calls pushState', async () => {
        const router = new RouterBuilder();
        router.addRoute().withPattern('/').withContent(() => mockBuilder());
        router.addRoute().withPattern('/about').withContent(() => mockBuilder());
        router.build();
        await Promise.resolve();

        const spy = jest.spyOn(window.history, 'pushState');
        router.navigate('/about');
        expect(spy).toHaveBeenCalledWith(null, '', '/about');
    });

    it('replace() calls replaceState', async () => {
        const router = new RouterBuilder();
        router.addRoute().withPattern('/').withContent(() => mockBuilder());
        router.build();
        await Promise.resolve();

        const spy = jest.spyOn(window.history, 'replaceState');
        router.replace('/login');
        expect(spy).toHaveBeenCalledWith(null, '', '/login');
    });

    it('currentRoute$ emits RouteMatch on initial navigation', async () => {
        const router = new RouterBuilder();
        router.addRoute().withPattern('/').withContent(() => mockBuilder());
        router.build();

        const emissions: any[] = [];
        router.currentRoute$.subscribe((r) => { if (r) emissions.push(r); });

        await Promise.resolve();
        expect(emissions.length).toBeGreaterThan(0);
        expect(emissions[0].path).toBe('/');
    });

    it('extracts path params and passes to factory', async () => {
        window.history.pushState({}, '', '/product/99');
        const receivedParams: any[] = [];
        const router = new RouterBuilder();
        router.addRoute()
            .withPattern('/product/{id}')
            .withContent((params) => {
                receivedParams.push(params);
                return mockBuilder();
            });
        router.build();

        await Promise.resolve();
        expect(receivedParams[0]).toEqual({ id: '99' });
    });

    it('navigate() swaps view and currentRoute$ reflects new path', async () => {
        const router = new RouterBuilder();
        router.addRoute().withPattern('/').withContent(() => mockBuilder());
        router.addRoute().withPattern('/about').withContent(() => mockBuilder());
        router.build();
        await Promise.resolve();

        router.navigate('/about');
        // pushState updates window.location in jsdom
        await Promise.resolve();

        const paths: string[] = [];
        router.currentRoute$.subscribe((r) => { if (r) paths.push(r.path); });
        expect(paths[paths.length - 1]).toBe('/about');
    });

    it('withFallback() replaces path when no route matches', async () => {
        window.history.pushState({}, '', '/unknown');
        const spy = jest.spyOn(window.history, 'replaceState');
        const router = new RouterBuilder().withFallback('/');
        router.addRoute().withPattern('/').withContent(() => mockBuilder());
        router.build();

        await Promise.resolve();
        expect(spy).toHaveBeenCalledWith(null, '', '/');
    });

    it('withBase() strips base prefix before matching', async () => {
        window.history.pushState({}, '', '/app/home');
        const paths: string[] = [];
        const router = new RouterBuilder().withBase('/app');
        router.addRoute().withPattern('/home').withContent(() => mockBuilder());
        router.currentRoute$.subscribe((r) => { if (r) paths.push(r.path); });
        router.build();

        await Promise.resolve();
        expect(paths[paths.length - 1]).toBe('/home');
    });

    it('calls onLeave before swap and onEnter after', async () => {
        const order: string[] = [];
        const router = new RouterBuilder();
        router.addRoute()
            .withPattern('/')
            .withOnLeave(() => order.push('leave-home'))
            .withContent(() => mockBuilder());
        router.addRoute()
            .withPattern('/about')
            .withOnEnter(() => order.push('enter-about'))
            .withContent(() => mockBuilder());
        router.build();
        await Promise.resolve();

        router.navigate('/about');
        await Promise.resolve();

        expect(order).toEqual(['leave-home', 'enter-about']);
    });

    it('resolves async (lazy) factory and mounts element', async () => {
        const el = document.createElement('section');
        const router = new RouterBuilder();
        router.addRoute()
            .withPattern('/')
            .withContent(async () => {
                await Promise.resolve(); // simulate async import
                return mockBuilder(el);
            });
        const outlet = router.build();

        await Promise.resolve();
        await Promise.resolve();

        expect(outlet.contains(el)).toBe(true);
    });

    it('back() and forward() delegate to history', () => {
        const backSpy = jest.spyOn(window.history, 'back').mockImplementation(() => {});
        const forwardSpy = jest.spyOn(window.history, 'forward').mockImplementation(() => {});

        const router = new RouterBuilder();
        router.addRoute().withPattern('/').withContent(() => mockBuilder());
        router.build();

        router.back();
        router.forward();

        expect(backSpy).toHaveBeenCalled();
        expect(forwardSpy).toHaveBeenCalled();
    });

    it('addRoute() with multiple params extracts all correctly', async () => {
        window.history.pushState({}, '', '/users/5/posts/12');
        const captured: any[] = [];
        const router = new RouterBuilder();
        router.addRoute()
            .withPattern('/users/{userId}/posts/{postId}')
            .withContent((params) => {
                captured.push(params);
                return mockBuilder();
            });
        router.build();

        await Promise.resolve();
        expect(captured[0]).toEqual({ userId: '5', postId: '12' });
    });

    it('handles race condition with rapid navigation and async factories', async () => {
        // This test verifies that rapid navigation doesn't cause stale promises
        // to overwrite the current view
        
        const router = new RouterBuilder();
        const mountedElements: string[] = [];
        
        // Route A: slow async factory (resolves after 50ms)
        router.addRoute()
            .withPattern('/a')
            .withContent(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                const el = document.createElement('div');
                el.id = 'route-a';
                mountedElements.push('a');
                return mockBuilder(el);
            });
        
        // Route B: fast async factory (resolves immediately)
        router.addRoute()
            .withPattern('/b')
            .withContent(async () => {
                await Promise.resolve(); // microtask delay
                const el = document.createElement('div');
                el.id = 'route-b';
                mountedElements.push('b');
                return mockBuilder(el);
            });
        
        const outlet = router.build();
        await Promise.resolve(); // Let initial navigation settle
        
        // Navigate to A (slow)
        router.navigate('/a');
        // Immediately navigate to B (fast) before A resolves
        router.navigate('/b');
        
        // Wait for both promises to resolve
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Should have mounted B (the later navigation), not A
        expect(mountedElements).toEqual(['b']);
        expect(outlet.querySelector('#route-b')).toBeTruthy();
        expect(outlet.querySelector('#route-a')).toBeNull();
    });

    it('handles synchronous navigation from within onLeave', async () => {
        // This test verifies that navigation triggered from within onLeave
        // doesn't cause issues with double onLeave calls
        
        const router = new RouterBuilder();
        const events: string[] = [];
        
        router.addRoute()
            .withPattern('/a')
            .withOnLeave(() => {
                events.push('leave-a');
                // Navigate to C synchronously from within onLeave
                router.navigate('/c');
            })
            .withContent(() => {
                events.push('enter-a');
                return mockBuilder();
            });
            
        router.addRoute()
            .withPattern('/b')
            .withContent(() => {
                events.push('enter-b');
                return mockBuilder();
            });
            
        router.addRoute()
            .withPattern('/c')
            .withContent(() => {
                events.push('enter-c');
                return mockBuilder();
            });
        
        router.build();
        await Promise.resolve(); // Let initial navigation settle
        
        // Start at A
        router.navigate('/a');
        await Promise.resolve();
        
        // Navigate to B - this should trigger onLeave for A, which navigates to C
        router.navigate('/b');
        await Promise.resolve();
        await Promise.resolve(); // Need extra microtask for nested navigation
        
        // Should have: enter-a, leave-a, enter-c
        // Should NOT have: enter-b (redirected to C)
        // Should NOT have: leave-a called twice
        expect(events).toEqual(['enter-a', 'leave-a', 'enter-c']);
    });

    it('catches synchronous exceptions from factory function', async () => {
        // This test verifies that synchronous exceptions thrown by factory functions
        // are caught and don't crash the router
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        const router = new RouterBuilder();
        
        router.addRoute()
            .withPattern('/error')
            .withContent(() => {
                throw new Error('Synchronous factory error!');
            });
        
        // Add a normal route for initial navigation
        router.addRoute()
            .withPattern('/')
            .withContent(() => mockBuilder());
        
        router.build();
        await Promise.resolve(); // Let initial navigation settle
        
        // Navigate to error route - this should not throw
        router.navigate('/error');
        
        // Wait for promise chain to settle
        await Promise.resolve();
        await Promise.resolve();
        
        // Should have logged an error
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Failed to load route component:',
            expect.any(Error)
        );
        
        consoleErrorSpy.mockRestore();
    });

    it('catches synchronous exceptions from onLeave hook', async () => {
        // This test verifies that synchronous exceptions thrown by onLeave hooks
        // are caught and don't crash the router
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        const router = new RouterBuilder();
        
        router.addRoute()
            .withPattern('/a')
            .withOnLeave(() => {
                throw new Error('Synchronous onLeave error!');
            })
            .withContent(() => mockBuilder());
        
        router.addRoute()
            .withPattern('/b')
            .withContent(() => mockBuilder());
        
        router.build();
        await Promise.resolve(); // Let initial navigation settle
        
        // Start at route A
        router.navigate('/a');
        await Promise.resolve();
        
        // Navigate to B - onLeave for A should throw but not crash
        router.navigate('/b');
        
        // Wait for navigation to complete
        await Promise.resolve();
        await Promise.resolve();
        
        // Should have logged an error for onLeave
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Route onLeave hook failed:',
            expect.any(Error)
        );
        
        // Should still have navigated to B
        const paths: string[] = [];
        router.currentRoute$.subscribe((r) => { if (r) paths.push(r.path); });
        expect(paths[paths.length - 1]).toBe('/b');
        
        consoleErrorSpy.mockRestore();
    });
});
