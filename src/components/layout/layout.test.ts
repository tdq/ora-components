import { LayoutBuilder, LayoutGap, SlotSize } from './layout';
import { BehaviorSubject } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';

class MockBuilder implements ComponentBuilder {
    build(): HTMLElement {
        return document.createElement('div');
    }
}

describe('LayoutBuilder', () => {
    it('should create a flex container', () => {
        const layout = new LayoutBuilder().build();
        expect(layout.classList.contains('flex')).toBe(true);
        expect(layout.classList.contains('w-full')).toBe(true);
    });

    it('should handle vertical layout', () => {
        const layout = new LayoutBuilder().asVertical().build();
        expect(layout.classList.contains('flex-col')).toBe(true);
    });

    it('should handle horizontal layout', () => {
        const layout = new LayoutBuilder().asHorizontal().build();
        expect(layout.classList.contains('flex-row')).toBe(true);
    });

    it('should handle gaps', () => {
        const layout = new LayoutBuilder().withGap(LayoutGap.LARGE).build();
        expect(layout.classList.contains('gap-4')).toBe(true);
    });

    it('should add slots with content', () => {
        const builder = new LayoutBuilder();
        builder.addSlot().withContent(new MockBuilder());
        builder.addSlot().withContent(new MockBuilder());

        const layout = builder.build();
        expect(layout.children.length).toBe(2);
    });

    it('should apply slot sizes', () => {
        const builder = new LayoutBuilder();
        builder.addSlot().withSize(SlotSize.HALF);

        const layout = builder.build();
        const slot = layout.children[0] as HTMLElement;
        expect(slot.classList.contains('basis-1/2')).toBe(true);
    });

    it('should apply FIT slot size', () => {
        const builder = new LayoutBuilder();
        builder.addSlot().withSize(SlotSize.FIT);

        const layout = builder.build();
        const slot = layout.children[0] as HTMLElement;
        expect(slot.classList.contains('flex-none')).toBe(true);
    });

    it('should handle slot visibility', () => {
        const visible$ = new BehaviorSubject(true);
        const builder = new LayoutBuilder();
        builder.addSlot().withVisible(visible$);

        const layout = builder.build();
        const slot = layout.children[0] as HTMLElement;
        expect(slot.style.display).toBe('');

        visible$.next(false);
        expect(slot.style.display).toBe('none');
    });

    it('should apply custom class reactively', () => {
        const class$ = new BehaviorSubject('custom-layout');
        const builder = new LayoutBuilder().withClass(class$);

        const layout = builder.build();
        expect(layout.classList.contains('custom-layout')).toBe(true);

        class$.next('another-layout');
        expect(layout.classList.contains('custom-layout')).toBe(false);
        expect(layout.classList.contains('another-layout')).toBe(true);
    });
});
