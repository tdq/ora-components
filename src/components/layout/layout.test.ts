import { LayoutBuilder, LayoutGap, SlotSize, Alignment } from './layout';
import { BehaviorSubject, of } from 'rxjs';
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

    it('should apply custom class with of()', () => {
        const builder = new LayoutBuilder().withClass(of('glass-effect'));
        const layout = builder.build();
        expect(layout.classList.contains('glass-effect')).toBe(true);
    });

    it('should handle layout alignment and apply to slots', () => {
        const alignment$ = new BehaviorSubject(Alignment.CENTER);
        const builder = new LayoutBuilder().withAlignment(alignment$);
        builder.addSlot().withContent(new MockBuilder());

        const layout = builder.build();
        const slot = layout.children[0] as HTMLElement;
        expect(slot.classList.contains('justify-center')).toBe(true);
        expect(slot.classList.contains('items-center')).toBe(true);

        alignment$.next(Alignment.RIGHT);
        expect(slot.classList.contains('justify-center')).toBe(false);
        expect(slot.classList.contains('justify-end')).toBe(true);
        expect(slot.classList.contains('items-center')).toBe(true);
    });

    it('should allow slot alignment to override layout alignment', () => {
        const layoutAlignment$ = new BehaviorSubject(Alignment.CENTER);
        const slotAlignment$ = new BehaviorSubject(Alignment.RIGHT);
        
        const builder = new LayoutBuilder().withAlignment(layoutAlignment$);
        builder.addSlot()
            .withAlignment(slotAlignment$)
            .withContent(new MockBuilder());

        const layout = builder.build();
        const slot = layout.children[0] as HTMLElement;
        
        expect(slot.classList.contains('justify-end')).toBe(true);
        
        slotAlignment$.next(Alignment.LEFT);
        expect(slot.classList.contains('justify-end')).toBe(false);
        expect(slot.classList.contains('justify-start')).toBe(true);
    });

    it('should handle layout alignment on horizontal container', () => {
        const alignment$ = new BehaviorSubject(Alignment.CENTER);
        const builder = new LayoutBuilder().asHorizontal().withAlignment(alignment$);

        const layout = builder.build();
        expect(layout.classList.contains('justify-center')).toBe(true);

        alignment$.next(Alignment.RIGHT);
        expect(layout.classList.contains('justify-center')).toBe(false);
        expect(layout.classList.contains('justify-end')).toBe(true);
    });
});
