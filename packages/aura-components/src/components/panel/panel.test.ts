import { BehaviorSubject } from 'rxjs';
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
});
