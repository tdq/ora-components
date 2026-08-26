import { BehaviorSubject, of } from 'rxjs';
import { PanelBuilder, PanelGap } from './panel';
import { ComponentBuilder } from '../../core/component-builder';

class MockContentBuilder implements ComponentBuilder {
    build(): HTMLElement {
        const el = document.createElement('div');
        el.id = 'mock-content';
        el.textContent = 'Mock Content';
        return el;
    }
}

describe('PanelBuilder', () => {
    it('should create a div element', () => {
        const builder = new PanelBuilder();
        const element = builder.build();
        expect(element.tagName).toBe('DIV');
    });

    it('should apply initial gap class', () => {
        const element = new PanelBuilder()
            .withGap(PanelGap.SMALL)
            .build();
        expect(element.classList.contains('p-px-4')).toBe(true);
    });

    it('should apply extra large gap class', () => {
        const element = new PanelBuilder()
            .withGap(PanelGap.EXTRA_LARGE)
            .build();
        expect(element.classList.contains('p-px-32')).toBe(true);
    });

    it('should set content', () => {
        const content = new MockContentBuilder();
        const element = new PanelBuilder()
            .withContent(content)
            .build();
        
        const child = element.querySelector('#mock-content');
        expect(child).not.toBeNull();
        expect(child?.textContent).toBe('Mock Content');
    });

    it('should apply glass classes when asGlass is called', () => {
        const element = new PanelBuilder()
            .asGlass()
            .build();
        
        expect(element.classList.contains('glass-effect')).toBe(true);
        expect(element.classList.contains('bg-surface')).toBe(false);
    });

    it('should apply custom class reactively', () => {
        const class$ = new BehaviorSubject('custom-class');
        const element = new PanelBuilder()
            .withClass(class$)
            .build();

        expect(element.classList.contains('custom-class')).toBe(true);

        class$.next('another-class');
        expect(element.classList.contains('custom-class')).toBe(false);
        expect(element.classList.contains('another-class')).toBe(true);
    });

    it('should have basic panel classes', () => {
        const element = new PanelBuilder().build();
        expect(element.classList.contains('rounded-large')).toBe(true);
        expect(element.classList.contains('border')).toBe(true);
        expect(element.classList.contains('shadow-level-1')).toBe(false);
    });

    it('ST-4: should use [overflow:clip] instead of overflow-hidden so backdrop-filter children are not clipped', () => {
        const element = new PanelBuilder().build();
        // Tailwind classes are not processed in JSDOM; test className string directly
        expect(element.className).toContain('[overflow:clip]');
        expect(element.className).not.toContain('overflow-hidden');
    });

    it('ST-4: glass panel should use [overflow:clip] instead of overflow-hidden', () => {
        const element = new PanelBuilder().asGlass().build();
        expect(element.className).toContain('[overflow:clip]');
        expect(element.className).not.toContain('overflow-hidden');
    });

    it('#28: withClass(p-0) should override the default p-px-* padding class', () => {
        const element = new PanelBuilder().withClass(of('p-0')).build();
        expect(element.classList.contains('p-0')).toBe(true);
        expect(element.classList.contains('p-px-8')).toBe(false);
    });

    it('#28: withClass(p-px-16) should override the gap padding class', () => {
        const element = new PanelBuilder().withGap(PanelGap.SMALL).withClass(of('p-px-16')).build();
        expect(element.classList.contains('p-px-16')).toBe(true);
        expect(element.classList.contains('p-px-4')).toBe(false);
    });

    it('#31: content element is marked with data-slot="body"', () => {
        const element = new PanelBuilder().withContent(new MockContentBuilder()).build();
        const body = element.querySelector('[data-slot="body"]');
        expect(body).not.toBeNull();
        expect(body?.id).toBe('mock-content');
    });

    it('A5b: data-slot="body" is applied on top of the merged gap padding', () => {
        const element = new PanelBuilder()
            .withGap(PanelGap.LARGE)
            .withClass(of('p-0'))
            .withContent(new MockContentBuilder())
            .build();

        expect(element.classList.contains('p-0')).toBe(true);
        expect(element.classList.contains('p-px-16')).toBe(false);
        expect(element.querySelector('[data-slot="body"]')?.id).toBe('mock-content');
    });

    it('A5b lifecycle: connect → update → disconnect stops applying class updates', async () => {
        const class$ = new BehaviorSubject('custom-a');
        const element = new PanelBuilder().withClass(class$).build();

        document.body.appendChild(element);
        expect(element.classList.contains('custom-a')).toBe(true);

        // update while connected
        class$.next('custom-b');
        expect(element.classList.contains('custom-b')).toBe(true);

        // disconnect → registerDestroy unsubscribes
        element.remove();
        await Promise.resolve();

        class$.next('custom-c');
        expect(element.classList.contains('custom-c')).toBe(false);
        expect(element.classList.contains('custom-b')).toBe(true);

        class$.complete();
    });

    it('A5b nit: does not clobber a data-slot the content builder already set', () => {
        class TaggedContentBuilder implements ComponentBuilder {
            build(): HTMLElement {
                const el = document.createElement('div');
                el.dataset.slot = 'custom-slot';
                return el;
            }
        }
        const element = new PanelBuilder().withContent(new TaggedContentBuilder()).build();
        const body = element.querySelector('[data-slot="custom-slot"]');
        expect(body).not.toBeNull();
        expect(element.querySelector('[data-slot="body"]')).toBeNull();
    });
});
